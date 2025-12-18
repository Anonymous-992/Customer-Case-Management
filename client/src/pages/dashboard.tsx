import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, FileText, CheckCircle2, Clock, Package, Store, Edit2, ChevronDown, ChevronUp, Filter, Plus, Zap, AlertCircle, CalendarIcon, Download, Eye, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, useLocation } from "wouter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UnifiedSearch } from "@/components/unified-search";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSettings } from "@/lib/settings-context";
import { exportData, type ExportColumn } from "@/lib/export-utils";
import type { Customer, ProductCase, InsertCustomer } from "@shared/schema";
import confetti from "canvas-confetti";
import { caseStatusEnum, paymentStatusEnum, insertCustomerSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductCaseSchema } from "@shared/schema";
import type { z } from "zod";

type FormData = z.infer<typeof insertProductCaseSchema>;

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [visibleCases, setVisibleCases] = useState(10);
  const [editingCase, setEditingCase] = useState<ProductCase | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ProductCase>>({});
  const [editCustomerData, setEditCustomerData] = useState<Partial<Customer>>({});
  const [isOpenCasesExpanded, setIsOpenCasesExpanded] = useState(false);
  const [isAllCasesExpanded, setIsAllCasesExpanded] = useState(false);
  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");

  // Serial check state for editing
  const [editSerialError, setEditSerialError] = useState("");
  const [isCheckingEditSerial, setIsCheckingEditSerial] = useState(false);

  // Email confirmation state
  const [showCreateCaseEmailConfirm, setShowCreateCaseEmailConfirm] = useState(false);
  const [pendingCreateCaseData, setPendingCreateCaseData] = useState<any>(null);

  // Quick Case completion email confirmation
  const [showQuickCaseEmailConfirm, setShowQuickCaseEmailConfirm] = useState(false);
  const [pendingQuickCaseCompletionData, setPendingQuickCaseCompletionData] = useState<any>(null);

  // Store-wise case pagination
  const [storeCasesLimit, setStoreCasesLimit] = useState<Record<string, number>>({});

  // Column visibility controls
  const [visibleColumns, setVisibleColumns] = useState({
    customerName: true,
    serialNumber: true,
    status: true,
    store: true,
    paymentStatus: true,
  });

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Create Case Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1: Select customer, 2: Create case form
  const [customerSearch, setCustomerSearch] = useState("");
  const [serialValue, setSerialValue] = useState("");
  const [serialError, setSerialError] = useState<string>("");
  const [isCheckingSerial, setIsCheckingSerial] = useState(false);

  // Quick Case Dialog States (NEW - Phone + Notes only)
  const [isQuickCaseOpen, setIsQuickCaseOpen] = useState(false);
  const [quickPhone, setQuickPhone] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [quickPhoneError, setQuickPhoneError] = useState<string>("");
  const [isCheckingQuickPhone, setIsCheckingQuickPhone] = useState(false);

  // Quick Case Completion Dialog States
  const [isCompleteQuickCaseOpen, setIsCompleteQuickCaseOpen] = useState(false);
  const [selectedQuickCase, setSelectedQuickCase] = useState<any | null>(null);
  const [completionStep, setCompletionStep] = useState<1 | 2>(1); // 1: Customer info, 2: Case info
  const [completionCustomerData, setCompletionCustomerData] = useState<any>({});
  const [completionCaseData, setCompletionCaseData] = useState<any>({});
  const [completionSerialError, setCompletionSerialError] = useState<string>("");
  const [isCheckingCompletionSerial, setIsCheckingCompletionSerial] = useState(false);

  // Create Customer Dialog states
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [customerPhoneValue, setCustomerPhoneValue] = useState("");
  const [customerPhoneError, setCustomerPhoneError] = useState<string>("");
  const [isCheckingCustomerPhone, setIsCheckingCustomerPhone] = useState(false);
  const [showStatusUpdateDialog, setShowStatusUpdateDialog] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState<any>(null);

  // Shipment Dialog States
  const [showShipmentDialog, setShowShipmentDialog] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    carrierCompany: "",
    shippedDate: new Date().toISOString().split('T')[0],
    trackingNumber: "",
    shippingCost: ""
  });

  // Section collapse states - ALL COLLAPSED BY DEFAULT
  const [isQuickCasesExpanded, setIsQuickCasesExpanded] = useState(false);

  const { toast } = useToast();
  const { settings, formatDate, formatDateTime, t } = useSettings();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(insertProductCaseSchema),
    defaultValues: {
      status: "New Case",
      paymentStatus: "Pending",
      shippingCost: 0,
    },
  });

  // Customer form handler
  const {
    register: registerCustomer,
    handleSubmit: handleSubmitCustomer,
    formState: { errors: customerErrors },
    reset: resetCustomer,
    setValue: setCustomerValue,
  } = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
  });


  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: cases, isLoading: casesLoading } = useQuery<ProductCase[]>({
    queryKey: ['/api/cases'],
  });

  const { data: quickCases, isLoading: quickCasesLoading } = useQuery<any[]>({
    queryKey: ['/api/quick-cases'],
  });

  // Serial number validation
  useEffect(() => {
    const checkSerial = async () => {
      if (serialValue.length >= 3) {
        setIsCheckingSerial(true);
        try {
          const response = await apiRequest("GET", `/api/cases/check-serial/${serialValue}`);
          if (response.exists) {
            setSerialError(`Serial number already exists for product: ${response.case.modelNumber}`);
          } else {
            setSerialError("");
          }
        } catch (error) {
          console.error("Error checking serial:", error);
        } finally {
          setIsCheckingSerial(false);
        }
      } else {
        setSerialError("");
      }
    };

    const timer = setTimeout(checkSerial, 500);
    return () => clearTimeout(timer);
  }, [serialValue]);

  // Quick Case phone validation
  useEffect(() => {
    const checkPhone = async () => {
      if (quickPhone.length >= 10) {
        setIsCheckingQuickPhone(true);
        try {
          const response = await apiRequest("GET", `/api/customers/check-phone/${quickPhone}`);
          if (response.exists) {
            setQuickPhoneError(`Phone already exists for customer: ${response.customer.name} (${response.customer.customerId})`);
          } else {
            setQuickPhoneError("");
          }
        } catch (error) {
          console.error("Error checking phone:", error);
        } finally {
          setIsCheckingQuickPhone(false);
        }
      } else {
        setQuickPhoneError("");
      }
    };

    const timer = setTimeout(checkPhone, 500);
    return () => clearTimeout(timer);
  }, [quickPhone]);

  // Completion serial validation
  useEffect(() => {
    const checkSerial = async () => {
      const serial = completionCaseData.serialNumber;
      if (serial && serial.length >= 3) {
        setIsCheckingCompletionSerial(true);
        try {
          const response = await apiRequest("GET", `/api/cases/check-serial/${serial}`);
          if (response.exists) {
            setCompletionSerialError(`Serial number already exists for product: ${response.case.modelNumber}`);
          } else {
            setCompletionSerialError("");
          }
        } catch (error) {
          console.error("Error checking serial:", error);
        } finally {
          setIsCheckingCompletionSerial(false);
        }
      } else {
        setCompletionSerialError("");
      }
    };

    const timer = setTimeout(checkSerial, 500);
    return () => clearTimeout(timer);
  }, [completionCaseData.serialNumber]);

  // Customer phone validation for Create Customer modal
  useEffect(() => {
    const checkPhone = async () => {
      if (customerPhoneValue.length >= 10) {
        setIsCheckingCustomerPhone(true);
        try {
          const response = await apiRequest("GET", `/api/customers/check-phone/${customerPhoneValue}`);
          if (response.exists) {
            setCustomerPhoneError(`Phone already exists for customer: ${response.customer.name} (${response.customer.customerId})`);
          } else {
            setCustomerPhoneError("");
          }
        } catch (error) {
          console.error("Error checking phone:", error);
        } finally {
          setIsCheckingCustomerPhone(false);
        }
      } else {
        setCustomerPhoneError("");
      }
    };

    const timer = setTimeout(checkPhone, 500);
    return () => clearTimeout(timer);
  }, [customerPhoneValue]);

  // Reset customer form when dialog closes
  useEffect(() => {
    if (!isCreateCustomerOpen) {
      setCustomerPhoneValue("");
      setCustomerPhoneError("");
      resetCustomer();
    }
  }, [isCreateCustomerOpen, resetCustomer]);

  // Note: Default filter setting removed - all cases show by default
  // Users can manually apply filters using the filter controls

  // Helper function to check if case is inactive (no update for more than 7 days)
  const isCaseInactive = (case_: ProductCase) => {
    const lastUpdate = new Date(case_.updatedAt || case_.createdAt);
    const now = new Date();
    const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    const isOpen = !['Closed', 'Shipped to Customer'].includes(case_.status);
    return isOpen && daysSinceUpdate > 7;
  };

  // Create a map of customer IDs to customer data for quick lookup
  const customerMap = new Map(customers?.map(c => [c._id, c]) || []);

  const updateCaseMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ProductCase> }) => {
      return await apiRequest("PATCH", `/api/cases/${data.id}`, data.updates);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cases', variables.id] });
      toast({
        title: "Success",
        description: "Case updated successfully",
      });
      setEditingCase(null);
    },
    onError: (error: Error) => {
      let message = error.message || "Failed to update case";

      // Try to unwrap API error messages of the form "400: {\"message\":...}"
      try {
        const match = message.match(/^\d+:\s*(.*)$/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (parsed && typeof parsed.message === "string") {
            message = parsed.message;
          }
        }
      } catch {
        // Ignore JSON parse errors and fall back to the original message
      }

      // If this is a serial number duplicate error, surface it inline on the input only
      if (message.includes("Serial number already exists")) {
        setEditSerialError(message);
        return;
      }

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      return await apiRequest("POST", "/api/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "🎉 Success!",
        description: "Customer created successfully!",
        className: "bg-green-50 border-green-200"
      });

      setIsCreateCustomerOpen(false);
      resetCustomer();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!selectedCustomer?._id) {
        throw new Error("Please select a customer first");
      }

      const payload = {
        ...data,
        customerId: selectedCustomer._id,
        status: data.status || "New Case",
        paymentStatus: data.paymentStatus || "Pending",
        shippingCost: data.shippingCost || 0,
      };

      console.log("Creating case with payload:", payload);
      return await apiRequest("POST", "/api/cases", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Trigger a second burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
      }, 250);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);

      toast({
        title: "🎉 Success!",
        description: "Case created successfully! Email notification sent to customer.",
        className: "bg-green-50 border-green-200"
      });

      handleCloseCreateDialog();
    },
    onError: (error: Error) => {
      console.error("Create case error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const quickCaseMutation = useMutation({
    mutationFn: async (data: { phone: string; notes?: string }) => {
      return await apiRequest("POST", "/api/quick-cases", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quick-cases'] });
      toast({
        title: "✅ Quick Case Created",
        description: "Case saved. Complete it later with full details.",
        className: "bg-amber-50 border-amber-200"
      });
      setQuickPhone("");
      setQuickNotes("");
      setQuickPhoneError("");
      setIsQuickCaseOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeQuickCaseMutation = useMutation({
    mutationFn: async ({ id, customerInfo, caseInfo }: { id: string; customerInfo: any; caseInfo: any }) => {
      return await apiRequest("POST", `/api/quick-cases/${id}/complete`, { customerInfo, caseInfo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quick-cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
      }, 250);

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);

      toast({
        title: "🎉 Case Completed!",
        description: "Customer profile created and case added successfully!",
        className: "bg-green-50 border-green-200"
      });

      // Clear all completion states
      setIsCompleteQuickCaseOpen(false);
      setSelectedQuickCase(null);
      setCompletionStep(1);
      setCompletionCustomerData({});
      setCompletionCaseData({});
      setCompletionSerialError("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuickCaseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/quick-cases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quick-cases'] });
      toast({
        title: "Deleted",
        description: "Quick Case deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditCase = async (case_: ProductCase, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Reset any previous serial validation state when opening the dialog
    setEditSerialError("");
    setIsCheckingEditSerial(false);
    setEditingCase(case_);
    setEditFormData({
      status: case_.status,
      paymentStatus: case_.paymentStatus,
      payment: case_.payment,
      repairNeeded: case_.repairNeeded,
      initialSummary: case_.initialSummary,
      serialNumber: case_.serialNumber,
      purchasePlace: case_.purchasePlace,
      receiptNumber: case_.receiptNumber,
      dateOfPurchase: case_.dateOfPurchase,
      carrierCompany: case_.carrierCompany,
      trackingNumber: case_.trackingNumber,
      shippingCost: case_.shippingCost,
      shippedDate: case_.shippedDate,
    });

    // Fetch customer data
    try {
      const customer = customers?.find(c => c._id === case_.customerId);
      if (customer) {
        setEditCustomerData({
          name: customer.name,
          email: customer.email,
          address: customer.address,
          phone: customer.phone,
        });
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const handleUpdateCase = async () => {
    if (!editingCase) return;

    // Prevent update if serial validation has failed (inline error already shown)
    if (editSerialError) {
      return;
    }

    // Build change log and minimal payload so we only update & log fields that actually changed
    const changes: string[] = [];
    const fieldLabels: Record<string, string> = {
      serialNumber: "Serial Number",
      purchasePlace: "Purchase Place",
      dateOfPurchase: "Date of Purchase",
      receiptNumber: "Receipt Number",
      payment: "Payment",
      repairNeeded: "Repair Needed",
      initialSummary: "Initial Summary",
      carrierCompany: "Carrier",
      trackingNumber: "Tracking Number",
      shippingCost: "Shipping Cost",
      shippedDate: "Shipped Date",
    };

    const dateFieldsForDiff = ["dateOfPurchase", "shippedDate"];
    const changedData: Partial<ProductCase> = {};

    const normalizeDateValue = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return trimmed;
        }
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
      }
      try {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
      } catch {
        return null;
      }
    };

    Object.keys(fieldLabels).forEach((field) => {
      const oldValue = (editingCase as any)[field];
      const newValue = (editFormData as any)[field];

      // Date fields: normalise and compare by YYYY-MM-DD
      if (dateFieldsForDiff.includes(field)) {
        const oldDate = normalizeDateValue(oldValue);
        const newDate = normalizeDateValue(newValue);

        // Skip if dates are the same (including both being null/undefined)
        if (oldDate === newDate) return;

        const oldDisplay = oldDate ? new Date(oldDate + "T00:00:00").toLocaleDateString() : "(empty)";
        const newDisplay = newDate ? new Date(newDate + "T00:00:00").toLocaleDateString() : "(empty)";
        changes.push(`${fieldLabels[field]} changed from "${oldDisplay}" to "${newDisplay}"`);

        // For PATCH payload, send canonical date string or empty string to clear the date
        if (newDate === null) {
          (changedData as any)[field] = "";
        } else {
          (changedData as any)[field] = newDate;
        }

        return;
      }

      // Non-date fields: treat null/undefined/"" as equivalent
      const normalizedOld = (oldValue === null || oldValue === undefined || oldValue === "") ? null : String(oldValue);
      const normalizedNew = (newValue === null || newValue === undefined || newValue === "") ? null : String(newValue);

      // Skip if values are the same
      if (normalizedOld === normalizedNew) return;

      const oldDisplay = normalizedOld || "(empty)";
      const newDisplay = normalizedNew || "(empty)";
      changes.push(`${fieldLabels[field]} changed from "${oldDisplay}" to "${newDisplay}"`);

      (changedData as any)[field] = newValue;
    });

    // Status and Payment Status changes
    // If status is changing, we need to ask user about notification
    if (editFormData.status && editFormData.status !== editingCase.status) {
      changedData.status = editFormData.status;
      setStatusUpdateData({
        caseId: editingCase._id,
        updates: changedData,
        changes,
        newStatus: editFormData.status
      });

      // Special handling for 'Shipped to Customer' status
      if (editFormData.status === 'Shipped to Customer') {
        // Pre-fill form with existing data if available
        setShipmentForm({
          carrierCompany: editingCase.carrierCompany || "",
          shippedDate: new Date().toISOString().split('T')[0],
          trackingNumber: editingCase.trackingNumber || "",
          shippingCost: editFormData.shippingCost ? String(editFormData.shippingCost) : (editingCase.shippingCost ? String(editingCase.shippingCost) : "0")
        });
        setShowShipmentDialog(true);
        return;
      }

      setShowStatusUpdateDialog(true);
      return;
    }

    if (editFormData.paymentStatus && editFormData.paymentStatus !== editingCase.paymentStatus) {
      changedData.paymentStatus = editFormData.paymentStatus;
    }

    // If no status change, proceed with update
    performUpdate(editingCase._id, changedData, changes);
  };

  const performUpdate = async (caseId: string, updates: any, changes: string[]) => {
    try {
      await updateCaseMutation.mutateAsync({
        id: caseId,
        updates: updates,
      });

      // Only log interaction history if we actually changed non-status fields (status interactions handled by backend/above logic)
      if (changes.length > 0) {
        const changeMessage = changes.join("; ");

        apiRequest("POST", "/api/interactions", {
          caseId: caseId,
          type: "case_updated",
          message: changeMessage,
        }).catch((error) => {
          console.error("Error logging dashboard quick edit changes:", error);
        });
      }
    } catch (error) {
      console.error("Error updating case from dashboard quick edit:", error);
    }
  };

  const handleStatusUpdateConfirm = (shouldNotify: boolean) => {
    if (!statusUpdateData) return;

    const { caseId, updates, changes } = statusUpdateData;

    // Add notification flag to payload
    const finalData = {
      ...updates,
      sendNotification: shouldNotify
    };

    performUpdate(caseId, finalData, changes);
    setShowStatusUpdateDialog(false);
    setStatusUpdateData(null);
  };

  const handleShipmentConfirm = (shouldNotify: boolean) => {
    if (!statusUpdateData) return;

    const { caseId, updates, changes } = statusUpdateData;

    // Add shipment info to payload
    const finalData = {
      ...updates,
      carrierCompany: shipmentForm.carrierCompany,
      trackingNumber: shipmentForm.trackingNumber,
      shippedDate: shipmentForm.shippedDate,
      shippingCost: parseFloat(shipmentForm.shippingCost) || 0,
      sendNotification: shouldNotify
    };

    // Note: We intentionally DO NOT add shipment details to 'changes' array 
    // to prevent cluttering the interaction history, as requested.
    // The history will only show the status change.

    performUpdate(caseId, finalData, changes);
    setShowShipmentDialog(false);
    setStatusUpdateData(null);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setSelectedCustomer(null);
    setStep(1);
    setCustomerSearch("");
    setSerialValue("");
    setSerialError("");
    reset();
  };

  const handleQuickCaseSubmit = () => {
    if (!quickPhone || quickPhone.length < 10 || quickPhone.length > 15) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number (10-15 digits)",
        variant: "destructive",
      });
      return;
    }
    if (quickPhoneError) {
      toast({
        title: "Duplicate Phone Number",
        description: quickPhoneError,
        variant: "destructive",
      });
      return;
    }
    quickCaseMutation.mutate({
      phone: quickPhone,
      notes: quickNotes || undefined,
    });
  };

  const handleCompleteQuickCase = (quickCase: any) => {
    setSelectedQuickCase(quickCase);
    setCompletionStep(1);
    setCompletionCustomerData({});
    setCompletionCaseData({
      status: 'New Case',
      paymentStatus: 'Pending',
      shippingCost: 0,
    });
    setCompletionSerialError("");
    setIsCompleteQuickCaseOpen(true);
  };

  const handleDeleteQuickCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this Quick Case?")) {
      deleteQuickCaseMutation.mutate(id);
    }
  };

  // Helper to check if case has missing information
  const isMissingInfo = (case_: ProductCase) => {
    return (
      case_.purchasePlace === "To be provided" ||
      case_.receiptNumber === "Pending" ||
      case_.serialNumber?.startsWith("PENDING-") ||
      case_.repairNeeded === "To be determined"
    );
  };

  // Helper to check if customer is a pending/incomplete profile
  const isPendingCustomer = (customer: Customer | undefined) => {
    if (!customer) return false;
    return (
      customer.name?.startsWith("PENDING -") ||
      customer.customerId?.startsWith("PENDING-") ||
      customer.address === "PENDING" ||
      customer.email?.includes("pending+")
    );
  };

  // Export function for cases - All Cases section
  const handleExportCases = (format: "excel" | "pdf") => {
    const dataToExport = settings?.exportSettings.includeFilters
      ? filteredCases
      : cases || [];

    if (!dataToExport || dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: "No cases to export",
        variant: "destructive",
      });
      return;
    }

    const columns: ExportColumn[] = [
      { key: "_id", label: "Case ID" },
      {
        key: "customerId",
        label: "Customer",
        format: (id) => customerMap.get(id)?.name || "Unknown"
      },
      { key: "modelNumber", label: "Model" },
      { key: "serialNumber", label: "Serial Number" },
      { key: "status", label: "Status" },
      { key: "paymentStatus", label: "Payment Status" },
      { key: "purchasePlace", label: "Store" },
      {
        key: "createdAt",
        label: "Created",
        format: (date) => formatDate(date)
      },
    ];

    exportData(format, {
      filename: `all-cases-export-${new Date().toISOString().split('T')[0]}`,
      sheetName: "Cases",
      columns,
      data: dataToExport,
      title: "All Cases Data",
    });

    toast({
      title: "Success",
      description: `Exported ${dataToExport.length} cases to ${format.toUpperCase()}`,
    });
  };

  // Export function for Open by Store cases
  const handleExportOpenCases = (format: "excel" | "pdf", storeName?: string) => {
    const casesToExport = storeName
      ? openCasesByStore?.[storeName] || []
      : Object.values(openCasesByStore || {}).flat();

    if (casesToExport.length === 0) {
      toast({
        title: "No Data",
        description: "No open cases to export",
        variant: "destructive",
      });
      return;
    }

    const columns: ExportColumn[] = [
      { key: "_id", label: "Case ID" },
      {
        key: "customerId",
        label: "Customer",
        format: (id) => customerMap.get(id)?.name || "Unknown"
      },
      { key: "modelNumber", label: "Model" },
      { key: "serialNumber", label: "Serial Number" },
      { key: "status", label: "Status" },
      { key: "paymentStatus", label: "Payment Status" },
      { key: "purchasePlace", label: "Store" },
      {
        key: "createdAt",
        label: "Created",
        format: (date) => formatDate(date)
      },
    ];

    const filename = storeName
      ? `${storeName.replace(/\s+/g, '-')}-cases-${new Date().toISOString().split('T')[0]}`
      : `open-cases-by-store-${new Date().toISOString().split('T')[0]}`;

    exportData(format, {
      filename,
      sheetName: storeName || "Open Cases",
      columns,
      data: casesToExport,
      title: `${storeName || 'Open Cases by Store'}`,
    });

    toast({
      title: "Success",
      description: `Exported ${casesToExport.length} cases to ${format.toUpperCase()}`,
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    // Reset form with default values when customer is selected
    reset({
      customerId: customer._id, // Add customerId to form data
      status: "New Case",
      paymentStatus: "Pending",
      shippingCost: 0,
    });
    // Explicitly set customerId value
    setValue("customerId", customer._id, { shouldValidate: true });
    setSerialValue("");
    setSerialError("");
    setStep(2);
  };

  const onSubmit = (data: FormData) => {
    console.log("=== CREATE CASE SUBMIT TRIGGERED ===");
    console.log("Form data:", data);
    console.log("Form errors:", errors);
    console.log("Selected customer:", selectedCustomer);
    console.log("Serial error:", serialError);

    if (serialError) {
      console.log("Blocked by serial error");
      toast({
        title: "Error",
        description: serialError,
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer) {
      console.log("Blocked by missing customer");
      toast({
        title: "Error",
        description: "Please select a customer first",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...data,
      status: data.status || "New Case",
      paymentStatus: data.paymentStatus || "Pending",
      shippingCost: data.shippingCost || 0,
    };

    setPendingCreateCaseData(submitData);
    setShowCreateCaseEmailConfirm(true);
  };

  const handleCreateCaseConfirm = (sendEmail: boolean) => {
    if (pendingCreateCaseData) {
      createCaseMutation.mutate({ ...pendingCreateCaseData, sendNotification: sendEmail });
      setShowCreateCaseEmailConfirm(false);
      setPendingCreateCaseData(null);
    }
  };

  const onSubmitCustomer = (data: InsertCustomer) => {
    // Prevent submission if phone number is duplicate
    if (customerPhoneError) {
      toast({
        title: "Error",
        description: customerPhoneError,
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate(data);
  };

  // Filter customers based on search
  const filteredCustomers = customers?.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customerId.toLowerCase().includes(customerSearch.toLowerCase())
  ) || [];

  // Group open cases by store (only exclude if store location itself is missing)
  const openCasesByStore = cases?.reduce((acc, case_) => {
    const isOpen = !['Closed', 'Shipped to Customer'].includes(case_.status);
    const hasValidStore = case_.purchasePlace && case_.purchasePlace !== "To be provided";

    // Show cases that are open AND have a valid store location (even if other fields are incomplete)
    if (isOpen && hasValidStore) {
      const store = case_.purchasePlace;
      if (!acc[store]) {
        acc[store] = [];
      }
      acc[store].push(case_);
    }

    return acc;
  }, {} as Record<string, ProductCase[]>);

  const totalCases = cases?.length || 0;
  const completedCases = cases?.filter(c => c.status === 'Closed').length || 0;
  const readyToShipCases = cases?.filter(c => c.status === 'Repair Completed').length || 0;

  // Handler to filter cases based on stat card clicks
  const handleStatClick = (statTitle: string) => {
    // Scroll to All Cases section
    setIsAllCasesExpanded(true);

    // Clear existing filters first
    setFilterStore("all");
    setFilterPayment("all");

    // Apply filter based on which stat was clicked
    switch (statTitle) {
      case "Total Customers":
        // Navigate to customers page
        setLocation("/customers");
        break;
      case "Active Cases":
        // Show only active cases (not closed, not shipped)
        setFilterStore("all");
        setFilterPayment("all");
        // Use special 'open' value to mean all non-closed, non-shipped cases
        setFilterStatus("open");
        break;
      case "Ready to Ship":
        // Show only "Repair Completed" status
        setFilterStatus("Repair Completed");
        break;
      case "Completed / Total":
        // Show only closed cases
        setFilterStatus("Closed");
        break;
    }

    // Scroll to All Cases section after a brief delay
    setTimeout(() => {
      document.querySelector('[data-section="all-cases"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  const stats = [
    {
      title: t("total_customers"),
      value: customers?.length || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      testId: "stat-customers",
      onClick: () => handleStatClick("Total Customers")
    },
    {
      title: t("open_cases"),
      value: cases?.filter(c => !['Closed', 'Shipped to Customer'].includes(c.status)).length || 0,
      icon: FileText,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      testId: "stat-active-cases",
      onClick: () => handleStatClick("Active Cases")
    },
    {
      title: t("pending_cases"),
      value: readyToShipCases,
      icon: Package,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/20",
      testId: "stat-ready-to-ship",
      onClick: () => handleStatClick("Ready to Ship")
    },
    {
      title: t("closed_cases"),
      value: `${completedCases}/${totalCases}`,
      icon: CheckCircle2,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      testId: "stat-completed-total",
      onClick: () => handleStatClick("Completed / Total")
    },
  ];

  // Get unique stores for filter
  const uniqueStores = Array.from(new Set(cases?.map(c => c.purchasePlace).filter(Boolean) || []));

  // Apply filters and sort
  const filteredCases = cases?.filter(case_ => {
    if (filterStore !== "all" && case_.purchasePlace !== filterStore) return false;
    if (filterStatus !== "all") {
      if (filterStatus === "open") {
        // Open = any case that is not Closed or Shipped to Customer
        if (["Closed", "Shipped to Customer"].includes(case_.status)) return false;
      } else if (case_.status !== filterStatus) {
        return false;
      }
    }
    if (filterPayment !== "all" && case_.paymentStatus !== filterPayment) return false;
    return true;
  }) || [];

  const sortedCases = filteredCases.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const displayedCases = sortedCases.slice(0, visibleCases);
  const hasMoreCases = sortedCases.length > visibleCases;

  const loadMoreCases = () => {
    setVisibleCases(prev => prev + 10);
  };

  const isLoading = customersLoading || casesLoading;

  // Effect to check serial number on edit
  useEffect(() => {
    const currentSerial = editFormData.serialNumber;

    // If no case is currently being edited, reset validation state
    if (!editingCase) {
      setIsCheckingEditSerial(false);
      setEditSerialError("");
      return;
    }

    // Skip validation if empty or same as original
    if (!currentSerial || !currentSerial.trim() || currentSerial === editingCase.serialNumber) {
      setEditSerialError("");
      setIsCheckingEditSerial(false);
      return;
    }

    setIsCheckingEditSerial(true);

    const timeoutId = setTimeout(async () => {
      try {
        const data: any = await apiRequest("GET", `/api/cases/check-serial?serialNumber=${encodeURIComponent(currentSerial)}&excludeId=${editingCase._id}`);
        if (data.exists) {
          setEditSerialError(data.message || "Serial number already exists");
        } else {
          setEditSerialError("");
        }
      } catch (error) {
        console.error("Failed to check serial:", error);
      } finally {
        setIsCheckingEditSerial(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [editFormData.serialNumber, editingCase]);

  const handleQuickCaseCompletionConfirm = (sendEmail: boolean) => {
    if (selectedQuickCase && pendingQuickCaseCompletionData) {
      completeQuickCaseMutation.mutate({
        id: selectedQuickCase._id,
        customerInfo: pendingQuickCaseCompletionData.customerInfo,
        caseInfo: pendingQuickCaseCompletionData.caseInfo,
        sendNotification: sendEmail
      } as any);
      setShowQuickCaseEmailConfirm(false);
      setPendingQuickCaseCompletionData(null);
    }
  };

  return (
    <DashboardLayout
      title="Dashboard"
      actions={
        <div className="flex flex-wrap gap-2">
          {/* Quick Case Button - NEW Simplified Version */}
          <Dialog open={isQuickCaseOpen} onOpenChange={setIsQuickCaseOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50 text-sm sm:text-base">
                <Zap className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="whitespace-nowrap">{t("quick_case")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Case</DialogTitle>
                <DialogDescription>
                  Save a phone number. Complete the full customer and case details later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quickPhone">Phone Number *</Label>
                  <Input
                    id="quickPhone"
                    placeholder="10-15 digits"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    className={quickPhone && ((quickPhone.length < 10 || quickPhone.length > 15) || quickPhoneError) ? "border-destructive" : ""}
                  />
                  {isCheckingQuickPhone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-spin" />
                      Checking phone number...
                    </p>
                  )}
                  {!isCheckingQuickPhone && quickPhoneError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {quickPhoneError}
                    </p>
                  )}
                  {!isCheckingQuickPhone && !quickPhoneError && quickPhone && (quickPhone.length < 10 || quickPhone.length > 15) && (
                    <p className="text-xs text-destructive">Phone must be 10-15 digits</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quickNotes">Notes (Optional)</Label>
                  <Textarea
                    id="quickNotes"
                    placeholder="Brief notes about this case..."
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Incomplete Case
                  </p>
                  <p className="text-amber-700 mt-1">
                    This will be stored separately. Complete it later with customer and case details.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsQuickCaseOpen(false);
                      setQuickPhone("");
                      setQuickNotes("");
                      setQuickPhoneError("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleQuickCaseSubmit}
                    disabled={
                      quickCaseMutation.isPending ||
                      !quickPhone ||
                      quickPhone.length < 10 ||
                      quickPhone.length > 15 ||
                      !!quickPhoneError ||
                      isCheckingQuickPhone
                    }
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    {quickCaseMutation.isPending ? "Saving..." : "Save Quick Case"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>


          {/* Create Case / Customer Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="text-sm sm:text-base">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="whitespace-nowrap">{t("create_case")}</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Case
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCreateCustomerOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Case Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              {step === 1 ? (
                // Step 1: Select Customer
                <>
                  <DialogHeader>
                    <DialogTitle>Create New Case - Select Customer</DialogTitle>
                    <DialogDescription>
                      Search and select a customer to create a case for
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerSearch">Search Customer</Label>
                      <Input
                        id="customerSearch"
                        placeholder="Search by name, phone, email, or customer ID..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          {customerSearch ? "No customers found" : "Start typing to search customers"}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer._id}
                              onClick={() => handleCustomerSelect(customer)}
                              className="w-full p-4 hover:bg-muted/50 text-left transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{customer.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
                                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {customer.customerId}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                // Step 2: Create Case Form
                <>
                  <DialogHeader>
                    <DialogTitle>Create New Case for {selectedCustomer?.name}</DialogTitle>
                    <DialogDescription>
                      Fill in the product case details
                    </DialogDescription>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      className="w-fit"
                    >
                      ← Change Customer
                    </Button>
                  </DialogHeader>
                  <form
                    onSubmit={handleSubmit(onSubmit, (errors) => {
                      console.log("=== FORM VALIDATION FAILED ===");
                      console.log("Validation errors:", errors);
                      toast({
                        title: "Validation Error",
                        description: "Please fill all required fields correctly",
                        variant: "destructive"
                      });
                    })}
                    className="space-y-4"
                  >
                    {/* Error Display Panel */}
                    {Object.keys(errors).length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 mb-2">Please fix the following errors:</h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                          {Object.entries(errors).map(([field, error]: [string, any]) => (
                            <li key={field}>
                              <strong>{field}:</strong> {error?.message || 'This field has an error'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Hidden field for customerId */}
                    <input type="hidden" {...register("customerId")} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="modelNumber">Model Number *</Label>
                        <Input
                          id="modelNumber"
                          {...register("modelNumber")}
                          className={errors.modelNumber ? "border-destructive" : ""}
                        />
                        {errors.modelNumber && (
                          <p className="text-sm text-destructive">{errors.modelNumber.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="serialNumber">Serial Number *</Label>
                        <Input
                          id="serialNumber"
                          value={serialValue}
                          onChange={(e) => {
                            setSerialValue(e.target.value);
                            setValue("serialNumber", e.target.value);
                          }}
                          className={errors.serialNumber || serialError ? "border-destructive" : ""}
                        />
                        {isCheckingSerial && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <span className="animate-spin">⏳</span> Checking serial number...
                          </p>
                        )}
                        {serialError && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            ❌ {serialError}
                          </p>
                        )}
                        {errors.serialNumber && (
                          <p className="text-sm text-destructive">{errors.serialNumber.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="purchasePlace">
                          Store/Purchase Place <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="purchasePlace"
                          {...register("purchasePlace")}
                          placeholder="e.g., Delhi Store, Mumbai Branch, etc."
                          className={errors.purchasePlace ? "border-red-500 border-2" : ""}
                        />
                        {errors.purchasePlace && (
                          <p className="text-sm text-red-600 font-medium">⚠️ {errors.purchasePlace.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="receiptNumber">Receipt Number</Label>
                        <Input id="receiptNumber" {...register("receiptNumber")} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateOfPurchase" className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Date of Purchase
                        </Label>
                        <div className="relative">
                          <Input
                            id="dateOfPurchase"
                            type="date"
                            {...register("dateOfPurchase")}
                            className={`pl-10 ${errors.dateOfPurchase ? "border-destructive" : ""}`}
                            style={{
                              colorScheme: 'light'
                            }}
                          />
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {errors.dateOfPurchase && (
                          <p className="text-sm text-destructive">{errors.dateOfPurchase.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select
                          value={watch("status") || "New Case"}
                          onValueChange={(value) => setValue("status", value as any, { shouldValidate: true })}
                        >
                          <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {caseStatusEnum.options.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.status && (
                          <p className="text-sm text-destructive">{errors.status.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentStatus">Payment Status *</Label>
                        <Select
                          value={watch("paymentStatus") || "Pending"}
                          onValueChange={(value) => setValue("paymentStatus", value as any, { shouldValidate: true })}
                        >
                          <SelectTrigger className={errors.paymentStatus ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select payment status" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentStatusEnum.options.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.paymentStatus && (
                          <p className="text-sm text-destructive">{errors.paymentStatus.message}</p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="payment">Payment</Label>
                        <Input
                          id="payment"
                          {...register("payment")}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="repairNeeded">Repair Needed *</Label>
                        <Input
                          id="repairNeeded"
                          {...register("repairNeeded")}
                          className={errors.repairNeeded ? "border-destructive" : ""}
                        />
                        {errors.repairNeeded && (
                          <p className="text-sm text-destructive">{errors.repairNeeded.message}</p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="initialSummary">Initial Summary</Label>
                        <Textarea
                          id="initialSummary"
                          {...register("initialSummary")}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="shippingCost">Shipping Cost ($)</Label>
                        <Input
                          id="shippingCost"
                          type="number"
                          step="0.01"
                          {...register("shippingCost", { valueAsNumber: true })}
                          className={errors.shippingCost ? "border-destructive" : ""}
                        />
                        {errors.shippingCost && (
                          <p className="text-sm text-destructive">{errors.shippingCost.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="receivedDate">Received Date</Label>
                        <Input
                          id="receivedDate"
                          type="date"
                          {...register("receivedDate")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="shippedDate">Shipped Date</Label>
                        <Input
                          id="shippedDate"
                          type="date"
                          {...register("shippedDate")}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseCreateDialog}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCaseMutation.isPending || !!serialError || isCheckingSerial}
                        className={`${Object.keys(errors).length > 0 ? "bg-red-600 hover:bg-red-700" : ""} ${createCaseMutation.isPending ? "relative" : ""}`}
                      >
                        {createCaseMutation.isPending ? (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Creating Case...</span>
                            </div>
                          </>
                        ) : Object.keys(errors).length > 0 ? (
                          `Fix ${Object.keys(errors).length} Error(s)`
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Case
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="flex justify-center">
          <UnifiedSearch />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="hover-elevate cursor-pointer transition-transform hover:scale-105"
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-8 w-8 rounded-md ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold" data-testid={stat.testId}>
                  {isLoading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Cases Panel - Incomplete Cases - COLLAPSIBLE */}
        {quickCases && quickCases.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader
              className="bg-amber-100/50 border-b border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => setIsQuickCasesExpanded(!isQuickCasesExpanded)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600 rounded-lg shadow-md">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-amber-900 flex items-center gap-2">
                      {t("pending_cases")} / {t("no_data")}
                      <span className="text-sm font-normal text-amber-700">
                        ({quickCases.length} {t("pending_cases").toLowerCase()})
                      </span>
                    </CardTitle>
                    <p className="text-sm text-amber-700 mt-1">
                      Click to {isQuickCasesExpanded ? 'collapse' : 'expand'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="hover:bg-amber-200">
                  {isQuickCasesExpanded ? (
                    <ChevronUp className="h-5 w-5 text-amber-900" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-amber-900" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {isQuickCasesExpanded && (
              <CardContent className="pt-6">
                {quickCasesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quickCases.map((qc: any) => (
                      <div
                        key={qc._id}
                        className="bg-white border-2 border-amber-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-2 bg-amber-100 rounded">
                                <FileText className="h-4 w-4 text-amber-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-lg text-amber-900">📞 {qc.phone}</span>
                                  <span className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded-full font-medium">
                                    INCOMPLETE
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Created by {qc.createdByName} • {formatDateTime(new Date(qc.createdAt))}
                                </p>
                              </div>
                            </div>
                            {qc.notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 border border-gray-200">
                                <strong>Notes:</strong> {qc.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 sm:flex-col sm:items-end">
                            <Button
                              size="sm"
                              onClick={() => handleCompleteQuickCase(qc)}
                              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Complete Case
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleDeleteQuickCase(qc._id, e)}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Store Statistics - Open Cases by Store */}
        <Card>
          <CardHeader
            className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors group"
            onClick={() => setIsOpenCasesExpanded(!isOpenCasesExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shadow-sm group-hover:bg-blue-200 transition-colors">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t("open_cases")} {t("by_store")}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({Object.keys(openCasesByStore || {}).length} {t("store").toLowerCase()}s)
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Click to {isOpenCasesExpanded ? 'collapse' : 'expand'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="group-hover:bg-muted">
              {isOpenCasesExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </CardHeader>
          {isOpenCasesExpanded && (
            <>
              {/* Export Buttons for Open Cases */}
              {openCasesByStore && Object.keys(openCasesByStore).length > 0 && (
                <div className="px-6 pt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportOpenCases(settings?.exportSettings.defaultFormat || "excel")}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export All Open ({settings?.exportSettings.defaultFormat?.toUpperCase() || "Excel"})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportOpenCases(
                      settings?.exportSettings.defaultFormat === "excel" ? "pdf" : "excel"
                    )}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {settings?.exportSettings.defaultFormat === "excel" ? "PDF" : "Excel"}
                  </Button>
                </div>
              )}
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-16 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : openCasesByStore && Object.keys(openCasesByStore).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(openCasesByStore)
                      .sort(([, a], [, b]) => b.length - a.length)
                      .map(([store, storeCases]) => {
                        const currentLimit = storeCasesLimit[store] || 10;
                        const displayedCases = storeCases.slice(0, currentLimit);
                        const hasMore = storeCases.length > currentLimit;

                        return (
                          <div key={store} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm text-muted-foreground">{store}</h4>
                              <span className="text-xs font-medium text-muted-foreground">
                                {currentLimit < storeCases.length ? `Showing ${currentLimit} of ${storeCases.length}` : `${storeCases.length} open case${storeCases.length !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {displayedCases.map((case_) => {
                                const customer = customerMap.get(case_.customerId);
                                const isInactive = isCaseInactive(case_);

                                return (
                                  <div key={case_._id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <Link href={`/cases/${case_._id}`} className="flex-1 min-w-0">
                                      <div className={`p-3 rounded-lg border hover-elevate cursor-pointer ${isInactive
                                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                        : 'border-border'
                                        }`}>
                                        {/* Mobile: Stack layout */}
                                        <div className="space-y-2">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-medium font-mono text-xs">{case_.modelNumber}</p>
                                                {isInactive && (
                                                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded font-medium whitespace-nowrap">
                                                    INACTIVE
                                                  </span>
                                                )}
                                                {isMissingInfo(case_) && (
                                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded font-medium whitespace-nowrap flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    MISSING INFO
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-xs text-muted-foreground truncate">S/N: {case_.serialNumber}</p>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${case_.status === 'New Case' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                              case_.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' :
                                                case_.status === 'Awaiting Parts' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                                                  case_.status === 'Repair Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300'
                                              }`}>
                                              {case_.status}
                                            </span>
                                          </div>
                                          {customer && (
                                            <p className="text-xs text-muted-foreground truncate">
                                              👤 {customer.name} • 📞 {customer.phone}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </Link>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={(e) => handleEditCase(case_, e)}
                                      className="flex-shrink-0 self-stretch sm:self-auto"
                                      title="Quick Edit"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Load More Button for this store */}
                            {hasMore && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStoreCasesLimit(prev => ({
                                  ...prev,
                                  [store]: currentLimit + 10
                                }))}
                                className="w-full mt-2"
                              >
                                Load 10 More ({storeCases.length - currentLimit} remaining)
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No open cases</p>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>

        {/* All Cases with Pagination and Filters */}
        <Card data-section="all-cases">
          <CardHeader
            className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors group"
            onClick={() => setIsAllCasesExpanded(!isAllCasesExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg shadow-sm group-hover:bg-purple-200 transition-colors">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t("all_cases")}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({sortedCases.length} total)
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Click to {isAllCasesExpanded ? 'collapse' : 'expand'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="group-hover:bg-muted">
              {isAllCasesExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </CardHeader>
          {isAllCasesExpanded && (
            <>
              {/* Filters */}
              <div className="px-6 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>

                  {/* View Controls */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Show/Hide Columns</h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="col-customer"
                              checked={visibleColumns.customerName}
                              onCheckedChange={() => toggleColumn('customerName')}
                            />
                            <label htmlFor="col-customer" className="text-sm cursor-pointer">
                              Customer Name
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="col-serial"
                              checked={visibleColumns.serialNumber}
                              onCheckedChange={() => toggleColumn('serialNumber')}
                            />
                            <label htmlFor="col-serial" className="text-sm cursor-pointer">
                              Serial Number
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="col-status"
                              checked={visibleColumns.status}
                              onCheckedChange={() => toggleColumn('status')}
                            />
                            <label htmlFor="col-status" className="text-sm cursor-pointer">
                              Status Badge
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="col-store"
                              checked={visibleColumns.store}
                              onCheckedChange={() => toggleColumn('store')}
                            />
                            <label htmlFor="col-store" className="text-sm cursor-pointer">
                              Store Location
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="col-payment"
                              checked={visibleColumns.paymentStatus}
                              onCheckedChange={() => toggleColumn('paymentStatus')}
                            />
                            <label htmlFor="col-payment" className="text-sm cursor-pointer">
                              Payment Status
                            </label>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Select value={filterStore} onValueChange={setFilterStore}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Store" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {uniqueStores.map(store => (
                        <SelectItem key={store} value={store}>{store}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open (Active)</SelectItem>
                      {caseStatusEnum.options.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterPayment} onValueChange={setFilterPayment}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payment Status</SelectItem>
                      {paymentStatusEnum.options.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(filterStore !== "all" || filterStatus !== "all" || filterPayment !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterStore("all");
                        setFilterStatus("all");
                        setFilterPayment("all");
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Export Buttons */}
                {filteredCases.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCases(settings?.exportSettings.defaultFormat || "excel")}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export ({settings?.exportSettings.defaultFormat?.toUpperCase() || "Excel"})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportCases(
                        settings?.exportSettings.defaultFormat === "excel" ? "pdf" : "excel"
                      )}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {settings?.exportSettings.defaultFormat === "excel" ? "PDF" : "Excel"}
                    </Button>
                  </div>
                )}
              </div>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : displayedCases.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {displayedCases.map((case_: ProductCase) => {
                        const customer = customerMap.get(case_.customerId);
                        const isInactive = isCaseInactive(case_);

                        return (
                          <div key={case_._id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Link href={`/cases/${case_._id}`} className="flex-1 min-w-0">
                              <div
                                className={`p-3 rounded-lg border hover-elevate cursor-pointer ${isInactive
                                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                  : 'border-border'
                                  }`}
                                data-testid={`case-${case_._id}`}
                              >
                                {/* Mobile: Stack layout */}
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-medium font-mono text-sm">{case_.modelNumber}</p>
                                        {isInactive && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded font-medium whitespace-nowrap">
                                            INACTIVE
                                          </span>
                                        )}
                                        {isMissingInfo(case_) && (
                                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded font-medium whitespace-nowrap flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            MISSING INFO
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate font-mono">ID: {case_._id}</p>
                                      {visibleColumns.serialNumber && (
                                        <p className="text-sm text-muted-foreground truncate">S/N: {case_.serialNumber}</p>
                                      )}
                                    </div>
                                    {visibleColumns.status && (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${case_.status === 'New Case' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                        case_.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' :
                                          case_.status === 'Awaiting Parts' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                                            case_.status === 'Repair Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                                              case_.status === 'Shipped to Customer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300'
                                        }`}>
                                        {case_.status}
                                      </span>
                                    )}
                                  </div>
                                  {customer && (
                                    <p className="text-sm text-muted-foreground truncate">
                                      {visibleColumns.customerName && <span>👤 {customer.name}</span>}
                                      {visibleColumns.customerName && <span> • </span>}
                                      <span>📞 {customer.phone}</span>
                                    </p>
                                  )}
                                  {visibleColumns.store && case_.purchasePlace && case_.purchasePlace !== "To be provided" && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      🏪 {case_.purchasePlace}
                                    </p>
                                  )}
                                  {visibleColumns.paymentStatus && (
                                    <p className="text-xs text-muted-foreground">
                                      💳 {case_.paymentStatus}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </Link>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => handleEditCase(case_, e)}
                              className="flex-shrink-0 self-stretch sm:self-auto"
                              title="Quick Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Button */}
                    {hasMoreCases && (
                      <div className="mt-4 text-center">
                        <Button
                          onClick={loadMoreCases}
                          variant="outline"
                          className="w-full"
                        >
                          Load More ({sortedCases.length - visibleCases} remaining)
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No cases yet</p>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div >

      {/* Quick Edit Dialog */}
      < Dialog open={!!editingCase
      } onOpenChange={() => setEditingCase(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCase && isPendingCustomer(customers?.find(c => c._id === editingCase.customerId)) ? (
                <span>Complete Quick Case <span className="text-amber-600">(Add Customer & Case Info)</span></span>
              ) : (
                <span>Edit Case {editingCase && isMissingInfo(editingCase) && <span className="text-amber-600">(Complete Missing Info)</span>}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingCase && (
                <span className="font-mono text-sm">
                  {editingCase.modelNumber} - S/N: {editingCase.serialNumber}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {editingCase && (
            <div className="space-y-6">
              {/* Customer Information Section - Only show for pending customers */}
              {isPendingCustomer(customers?.find(c => c._id === editingCase.customerId)) && (
                <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
                  <h3 className="text-lg font-semibold mb-3 text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Information (Required)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-name">Customer Name *</Label>
                      <Input
                        id="edit-customer-name"
                        value={editCustomerData.name?.replace(/^PENDING - /, '') || ''}
                        onChange={(e) => setEditCustomerData({ ...editCustomerData, name: e.target.value })}
                        placeholder="Full name"
                        className="border-amber-300 focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-email">Email Address *</Label>
                      <Input
                        id="edit-customer-email"
                        type="email"
                        value={editCustomerData.email?.includes('pending+') ? '' : editCustomerData.email || ''}
                        onChange={(e) => setEditCustomerData({ ...editCustomerData, email: e.target.value })}
                        placeholder="customer@example.com"
                        className="border-amber-300 focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="edit-customer-address">Address *</Label>
                      <Input
                        id="edit-customer-address"
                        value={editCustomerData.address === 'PENDING' ? '' : editCustomerData.address || ''}
                        onChange={(e) => setEditCustomerData({ ...editCustomerData, address: e.target.value })}
                        placeholder="Full address"
                        className="border-amber-300 focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-phone">Phone Number (Read-only)</Label>
                      <Input
                        id="edit-customer-phone"
                        value={editCustomerData.phone || ''}
                        disabled
                        className="bg-gray-100 dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Case Information Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Case Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-serial">Serial Number</Label>
                    <Input
                      id="edit-serial"
                      value={editFormData.serialNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, serialNumber: e.target.value })}
                      placeholder="Enter serial number"
                      className={editSerialError ? "border-destructive" : ""}
                    />
                    {isCheckingEditSerial && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-spin" />
                        Checking serial...
                      </p>
                    )}
                    {!isCheckingEditSerial && editSerialError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {editSerialError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-purchase-place">Store/Purchase Place</Label>
                    <Input
                      id="edit-purchase-place"
                      value={editFormData.purchasePlace || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, purchasePlace: e.target.value })}
                      placeholder="e.g., Delhi, Mumbai"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-receipt">Receipt Number</Label>
                    <Input
                      id="edit-receipt"
                      value={editFormData.receiptNumber || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, receiptNumber: e.target.value })}
                      placeholder="Receipt number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-date-purchase" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Date of Purchase
                    </Label>
                    <div className="relative">
                      <Input
                        id="edit-date-purchase"
                        type="date"
                        value={editFormData.dateOfPurchase ? new Date(editFormData.dateOfPurchase).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditFormData({ ...editFormData, dateOfPurchase: e.target.value ? new Date(e.target.value) : undefined })}
                        className="pl-10"
                        style={{
                          colorScheme: 'light'
                        }}
                      />
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Case Status</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value as any })}
                    >
                      <SelectTrigger id="edit-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {caseStatusEnum.options.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-payment-text">Payment</Label>
                    <Input
                      id="edit-payment-text"
                      value={editFormData.payment || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, payment: e.target.value })}
                      placeholder="Enter payment details (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-payment">Payment Status</Label>
                    <Select
                      value={editFormData.paymentStatus}
                      onValueChange={(value) => setEditFormData({ ...editFormData, paymentStatus: value as any })}
                    >
                      <SelectTrigger id="edit-payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStatusEnum.options.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>



                {editFormData.status === 'Shipped to Customer' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-2 border-purple-100 rounded-lg p-4 bg-purple-50/30">
                    <div className="md:col-span-2 text-sm font-semibold text-purple-900 mb-1">Shipment Information</div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-carrier">Carrier</Label>
                      <Input
                        id="edit-carrier"
                        value={editFormData.carrierCompany || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, carrierCompany: e.target.value })}
                        placeholder="e.g. UPS, FedEx"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-tracking">Tracking #</Label>
                      <Input
                        id="edit-tracking"
                        value={editFormData.trackingNumber || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, trackingNumber: e.target.value })}
                        placeholder="Tracking Number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-ship-cost">Shipping Cost ($)</Label>
                      <Input
                        id="edit-ship-cost"
                        type="number"
                        value={editFormData.shippingCost || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, shippingCost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-ship-date" className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Shipped Date
                      </Label>
                      <div className="relative">
                        <Input
                          id="edit-ship-date"
                          type="date"
                          value={editFormData.shippedDate ? new Date(editFormData.shippedDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setEditFormData({ ...editFormData, shippedDate: e.target.value ? new Date(e.target.value) : undefined })}
                          className="pl-10"
                          style={{
                            colorScheme: 'light'
                          }}
                        />
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-repair">Repair Needed</Label>
                  <Input
                    id="edit-repair"
                    value={editFormData.repairNeeded || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, repairNeeded: e.target.value })}
                    placeholder="e.g., Screen replacement"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-summary">Initial Summary</Label>
                  <Textarea
                    id="edit-summary"
                    value={editFormData.initialSummary || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, initialSummary: e.target.value })}
                    placeholder="Case description..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCase(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateCase}
                  disabled={updateCaseMutation.isPending || isCheckingEditSerial || !!editSerialError}
                  className="flex-1"
                >
                  {updateCaseMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog >

      {/* Quick Case Completion Dialog - Full Form with Validation */}
      < Dialog open={isCompleteQuickCaseOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCompleteQuickCaseOpen(false);
          setSelectedQuickCase(null);
          setCompletionStep(1);
          setCompletionCustomerData({});
          setCompletionCaseData({});
          setCompletionSerialError("");
        }
      }
      }>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Complete Quick Case - Step {completionStep} of 2
            </DialogTitle>
            <DialogDescription>
              {completionStep === 1
                ? `Add customer details for phone: ${selectedQuickCase?.phone}`
                : "Add complete case details with all required information"
              }
            </DialogDescription>
          </DialogHeader>

          {selectedQuickCase && completionStep === 1 && (
            <div className="space-y-4">
              {/* Quick Case Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Quick Case Information</p>
                    <p className="text-sm text-amber-700 mt-1">📞 Phone: {selectedQuickCase.phone}</p>
                    {selectedQuickCase.notes && (
                      <p className="text-sm text-amber-700 mt-1">📝 Notes: {selectedQuickCase.notes}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Form - Step 1 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cust-name">Customer Name *</Label>
                    <Input
                      id="cust-name"
                      placeholder="Full name"
                      value={completionCustomerData.name || ''}
                      onChange={(e) => setCompletionCustomerData({ ...completionCustomerData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cust-phone">Phone Number *</Label>
                    <Input
                      id="cust-phone"
                      placeholder="10-15 digits"
                      value={selectedQuickCase.phone}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Phone from Quick Case (cannot edit)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cust-email">Email Address *</Label>
                    <Input
                      id="cust-email"
                      type="email"
                      placeholder="customer@example.com"
                      value={completionCustomerData.email || ''}
                      onChange={(e) => setCompletionCustomerData({ ...completionCustomerData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cust-address">Full Address *</Label>
                    <Input
                      id="cust-address"
                      placeholder="Complete address with city and postal code"
                      value={completionCustomerData.address || ''}
                      onChange={(e) => setCompletionCustomerData({ ...completionCustomerData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCompleteQuickCaseOpen(false);
                    setSelectedQuickCase(null);
                    setCompletionCustomerData({});
                    setCompletionCaseData({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!completionCustomerData.name || !completionCustomerData.email || !completionCustomerData.address) {
                      toast({
                        title: "Missing Information",
                        description: "Please fill all required customer fields",
                        variant: "destructive",
                      });
                      return;
                    }
                    setCompletionStep(2);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Next: Case Details →
                </Button>
              </div>
            </div>
          )}

          {selectedQuickCase && completionStep === 2 && (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">✓ Customer Info Completed</p>
                    <p className="text-sm text-green-700">{completionCustomerData.name} • {selectedQuickCase.phone}</p>
                  </div>
                </div>
              </div>

              {/* Case Form - Step 2 - All Fields Like Normal Case Creation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Case Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Model Number */}
                  <div className="space-y-2">
                    <Label htmlFor="case-model">Model Number</Label>
                    <Input
                      id="case-model"
                      placeholder="e.g., iPhone 13 Pro, Samsung Galaxy S21"
                      value={completionCaseData.modelNumber || ''}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, modelNumber: e.target.value })}
                    />
                  </div>

                  {/* Serial Number with Validation */}
                  <div className="space-y-2">
                    <Label htmlFor="case-serial">Serial Number</Label>
                    <Input
                      id="case-serial"
                      placeholder="Unique serial number"
                      value={completionCaseData.serialNumber || ''}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, serialNumber: e.target.value })}
                      className={completionSerialError ? "border-destructive" : ""}
                    />
                    {isCheckingCompletionSerial && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-spin" />
                        Checking serial number...
                      </p>
                    )}
                    {!isCheckingCompletionSerial && completionSerialError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {completionSerialError}
                      </p>
                    )}
                  </div>

                  {/* Store/Purchase Place */}
                  <div className="space-y-2">
                    <Label htmlFor="case-store">Store / Purchase Place</Label>
                    <Input
                      id="case-store"
                      placeholder="e.g., Delhi, Mumbai, Bangalore"
                      value={completionCaseData.purchasePlace || ''}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, purchasePlace: e.target.value })}
                    />
                  </div>

                  {/* Receipt Number */}
                  <div className="space-y-2">
                    <Label htmlFor="case-receipt">Receipt Number</Label>
                    <Input
                      id="case-receipt"
                      placeholder="Optional"
                      value={completionCaseData.receiptNumber || ''}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, receiptNumber: e.target.value })}
                    />
                  </div>

                  {/* Date of Purchase */}
                  <div className="space-y-2">
                    <Label htmlFor="case-date" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Date of Purchase
                    </Label>
                    <div className="relative">
                      <Input
                        id="case-date"
                        type="date"
                        value={completionCaseData.dateOfPurchase || ''}
                        onChange={(e) => setCompletionCaseData({ ...completionCaseData, dateOfPurchase: e.target.value })}
                      />
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Case Status */}
                  <div className="space-y-2">
                    <Label htmlFor="case-status">Case Status</Label>
                    <Select
                      value={completionCaseData.status || "New Case"}
                      onValueChange={(value) => setCompletionCaseData({ ...completionCaseData, status: value })}
                    >
                      <SelectTrigger id="case-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {caseStatusEnum.options.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Status */}
                  <div className="space-y-2">
                    <Label htmlFor="case-payment">Payment Status</Label>
                    <Select
                      value={completionCaseData.paymentStatus || "Pending"}
                      onValueChange={(value) => setCompletionCaseData({ ...completionCaseData, paymentStatus: value })}
                    >
                      <SelectTrigger id="case-payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStatusEnum.options.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="case-payment-text">Payment</Label>
                    <Input
                      id="case-payment-text"
                      placeholder="Enter payment details (optional)"
                      value={completionCaseData.payment || ''}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, payment: e.target.value })}
                    />
                  </div>

                  {/* Shipping Cost */}
                  <div className="space-y-2">
                    <Label htmlFor="case-shipping">Shipping Cost (₹)</Label>
                    <Input
                      id="case-shipping"
                      type="number"
                      placeholder="0"
                      value={completionCaseData.shippingCost || 0}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, shippingCost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Repair Needed */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="case-repair">Repair Needed</Label>
                    <Input
                      id="case-repair"
                      placeholder="e.g., Screen replacement, Battery issue"
                      value={completionCaseData.repairNeeded || selectedQuickCase.notes || ''}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, repairNeeded: e.target.value })}
                    />
                  </div>

                  {/* Initial Summary */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="case-summary">Initial Summary</Label>
                    <Textarea
                      id="case-summary"
                      placeholder="Detailed description of the issue..."
                      rows={3}
                      value={completionCaseData.initialSummary || selectedQuickCase.notes || ''}
                      onChange={(e) => setCompletionCaseData({ ...completionCaseData, initialSummary: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCompletionStep(1)}
                  className="flex-1"
                >
                  ← Back to Customer Info
                </Button>
                <Button
                  onClick={() => {
                    if (completionSerialError) {
                      toast({
                        title: "Duplicate Serial Number",
                        description: completionSerialError,
                        variant: "destructive",
                      });
                      return;
                    }

                    const completionData = {
                      customerInfo: {
                        name: completionCustomerData.name,
                        email: completionCustomerData.email,
                        address: completionCustomerData.address,
                      },
                      caseInfo: {
                        modelNumber: completionCaseData.modelNumber,
                        serialNumber: completionCaseData.serialNumber,
                        purchasePlace: completionCaseData.purchasePlace,
                        receiptNumber: completionCaseData.receiptNumber || 'N/A',
                        dateOfPurchase: completionCaseData.dateOfPurchase || undefined,
                        status: completionCaseData.status || 'New Case',
                        paymentStatus: completionCaseData.paymentStatus || 'Pending',
                        payment: completionCaseData.payment,
                        shippingCost: completionCaseData.shippingCost || 0,
                        repairNeeded: completionCaseData.repairNeeded,
                        initialSummary: completionCaseData.initialSummary || 'Completed from Quick Case',
                      },
                    };
                    setPendingQuickCaseCompletionData(completionData);
                    setShowQuickCaseEmailConfirm(true);
                  }}
                  disabled={completeQuickCaseMutation.isPending || isCheckingCompletionSerial || !!completionSerialError}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {completeQuickCaseMutation.isPending ? "Completing..." : "🎉 Complete Case"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog >

      {/* Email Confirmation Dialog for Create Case */}
      <AlertDialog open={showCreateCaseEmailConfirm} onOpenChange={setShowCreateCaseEmailConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to send a "Case Created" email to the customer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleCreateCaseConfirm(false)}>No, Don't Send</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleCreateCaseConfirm(true)}>Yes, Send Email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Confirmation Dialog for Quick Case Completion */}
      <AlertDialog open={showQuickCaseEmailConfirm} onOpenChange={setShowQuickCaseEmailConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to send a "Case Created" email to the customer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleQuickCaseCompletionConfirm(false)}>No, Don't Send</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleQuickCaseCompletionConfirm(true)}>Yes, Send Email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Customer Dialog */}
      < Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen} >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer profile to the system
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCustomer(onSubmitCustomer)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                placeholder="John Doe"
                {...registerCustomer("name")}
                className={customerErrors.name ? "border-destructive" : ""}
              />
              {customerErrors.name && (
                <p className="text-sm text-destructive">{customerErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone Number</Label>
              <Input
                id="customer-phone"
                placeholder="+1 234 567 8900"
                value={customerPhoneValue}
                onChange={(e) => {
                  setCustomerPhoneValue(e.target.value);
                  setCustomerValue("phone", e.target.value);
                }}
                className={customerErrors.phone || customerPhoneError ? "border-destructive" : ""}
              />
              {isCheckingCustomerPhone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-spin" />
                  Checking phone number...
                </p>
              )}
              {customerErrors.phone && (
                <p className="text-sm text-destructive">{customerErrors.phone.message}</p>
              )}
              {!customerErrors.phone && customerPhoneError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {customerPhoneError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Email Address *</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder="john@example.com"
                {...registerCustomer("email")}
                className={customerErrors.email ? "border-destructive" : ""}
              />
              {customerErrors.email && (
                <p className="text-sm text-destructive">{customerErrors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-address">Address</Label>
              <Textarea
                id="customer-address"
                placeholder="123 Main St, City, State 12345"
                rows={3}
                {...registerCustomer("address")}
                className={customerErrors.address ? "border-destructive" : ""}
              />
              {customerErrors.address && (
                <p className="text-sm text-destructive">{customerErrors.address.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateCustomerOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createCustomerMutation.isPending || !!customerPhoneError || isCheckingCustomerPhone}
              >
                {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog >

      <AlertDialog open={showStatusUpdateDialog} onOpenChange={setShowStatusUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Case Status</AlertDialogTitle>
            <AlertDialogDescription>
              The case status has been updated to <strong>{statusUpdateData?.newStatus}</strong>.
              <br /><br />
              Do you want to send a status update email to the customer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusUpdateConfirm(false)}>Update System Only</AlertDialogAction>
            <AlertDialogAction onClick={() => handleStatusUpdateConfirm(true)}>Send Email & Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shipment Details Dialog */}
      <AlertDialog open={showShipmentDialog} onOpenChange={setShowShipmentDialog}>
        <AlertDialogContent className="max-w-md sm:max-w-lg">
          <AlertDialogHeader className="px-4 sm:px-10">
            <AlertDialogTitle>Shipment Information</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the shipment details below. These will be included in the customer notification.
            </AlertDialogDescription>
            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="dash-carrier">Carrier Company</Label>
                <Input
                  id="dash-carrier"
                  value={shipmentForm.carrierCompany}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, carrierCompany: e.target.value }))}
                  placeholder="e.g. FedEx, UPS"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dash-shipDate">Date of Shipping</Label>
                <Input
                  id="dash-shipDate"
                  type="date"
                  value={shipmentForm.shippedDate}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, shippedDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dash-tracking">Tracking Number</Label>
                <Input
                  id="dash-tracking"
                  value={shipmentForm.trackingNumber}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="Tracking #"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dash-amount">Shipping Amount ($)</Label>
                <Input
                  id="dash-amount"
                  type="number"
                  step="0.01"
                  value={shipmentForm.shippingCost}
                  onChange={(e) => setShipmentForm(prev => ({ ...prev, shippingCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleShipmentConfirm(false)}>Update System</AlertDialogAction>
            <AlertDialogAction onClick={() => handleShipmentConfirm(true)}>Send Email & Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout >
  );
}