import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProductCaseSchema, type InsertProductCase, type CustomerWithCases, caseStatusEnum, paymentStatusEnum } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { Plus, Mail, Phone, MapPin, Trash2, Calendar, DollarSign, AlertCircle, Bell, BellOff, Edit2, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import confetti from "canvas-confetti";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

export default function CustomerProfilePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { admin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [serialValue, setSerialValue] = useState("");
  const [serialError, setSerialError] = useState<string>("");
  const [isCheckingSerial, setIsCheckingSerial] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerData, setEditCustomerData] = useState({ name: "", email: "", address: "", phone: "", secondPhone: "" });
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [editPhoneError, setEditPhoneError] = useState<string>("");
  const [isCheckingEditPhone, setIsCheckingEditPhone] = useState(false);
  const [editSecondPhoneValue, setEditSecondPhoneValue] = useState("");
  const [editSecondPhoneError, setEditSecondPhoneError] = useState<string>("");
  const [isCheckingEditSecondPhone, setIsCheckingEditSecondPhone] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // Email confirmation state
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [pendingCaseData, setPendingCaseData] = useState<InsertProductCase | null>(null);

  const { toast } = useToast();

  const { data: customer, isLoading } = useQuery<CustomerWithCases>({
    queryKey: ['/api/customers', id],
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InsertProductCase>({
    resolver: zodResolver(insertProductCaseSchema),
    defaultValues: {
      customerId: id,
      status: "New Case",
      paymentStatus: "Pending",
      shippingCost: 0,
    },
  });

  // Debounced serial number check
  useEffect(() => {
    const checkSerial = async () => {
      if (serialValue.length < 3) {
        setSerialError("");
        return;
      }

      setIsCheckingSerial(true);
      try {
        const response = await fetch(`/api/cases/check-serial/${encodeURIComponent(serialValue)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();

        if (data.exists) {
          setSerialError(`Serial number already exists for product: ${data.case.modelNumber}`);
        } else {
          setSerialError("");
        }
      } catch (error) {
        console.error('Error checking serial:', error);
      } finally {
        setIsCheckingSerial(false);
      }
    };

    const timer = setTimeout(checkSerial, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [serialValue]);

  // Phone validation for customer edit
  useEffect(() => {
    const checkPhone = async () => {
      if (!isEditingCustomer || editPhoneValue === customer?.phone) {
        setEditPhoneError("");
        return;
      }

      if (editPhoneValue.length < 10) {
        setEditPhoneError("");
        return;
      }

      setIsCheckingEditPhone(true);
      try {
        const response = await fetch(`/api/customers/check-phone/${encodeURIComponent(editPhoneValue)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();

        if (data.exists) {
          setEditPhoneError(`Phone already exists for customer: ${data.customer.name} (${data.customer.customerId})`);
        } else {
          setEditPhoneError("");
        }
      } catch (error) {
        console.error('Error checking phone:', error);
      } finally {
        setIsCheckingEditPhone(false);
      }
    };

    const timer = setTimeout(checkPhone, 500);
    return () => clearTimeout(timer);
  }, [editPhoneValue, isEditingCustomer, customer?.phone]);

  // Second phone validation for customer edit
  useEffect(() => {
    const checkSecondPhone = async () => {
      if (!isEditingCustomer || editSecondPhoneValue === (customer?.secondPhone || "")) {
        setEditSecondPhoneError("");
        return;
      }

      if (editSecondPhoneValue.length > 0 && editSecondPhoneValue.length < 10) {
        setEditSecondPhoneError("");
        return;
      }

      // Skip check if field is empty
      if (!editSecondPhoneValue || editSecondPhoneValue.trim() === "") {
        setEditSecondPhoneError("");
        return;
      }

      setIsCheckingEditSecondPhone(true);
      try {
        const response = await fetch(`/api/customers/check-second-phone/${encodeURIComponent(editSecondPhoneValue)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();

        if (data.exists) {
          setEditSecondPhoneError(`Second phone already exists for customer: ${data.customer.name} (${data.customer.customerId})`);
        } else {
          setEditSecondPhoneError("");
        }
      } catch (error) {
        console.error('Error checking second phone:', error);
      } finally {
        setIsCheckingEditSecondPhone(false);
      }
    };

    const timer = setTimeout(checkSecondPhone, 500);
    return () => clearTimeout(timer);
  }, [editSecondPhoneValue, isEditingCustomer, customer?.secondPhone]);

  // Sync notification preferences with customer data
  useEffect(() => {
    if (customer?.notificationPreferences) {
      setEmailNotifications(customer.notificationPreferences.email ?? true);
      setSmsNotifications(customer.notificationPreferences.sms ?? false);
    }
  }, [customer]);

  // Reset serial validation when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setSerialValue("");
      setSerialError("");
      reset({
        customerId: id,
        status: "New Case",
        paymentStatus: "Pending",
        shippingCost: 0,
      });
    }
  }, [isDialogOpen, reset, id]);

  const createCaseMutation = useMutation({
    mutationFn: async (data: InsertProductCase) => {
      return await apiRequest("POST", "/api/cases", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });

      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

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
        description: "Product case created successfully!",
        className: "bg-green-50 border-green-200"
      });

      setIsDialogOpen(false);
      reset({
        customerId: id,
        status: "New Case",
        paymentStatus: "Pending",
        shippingCost: 0,
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

  const updateNotificationsMutation = useMutation({
    mutationFn: async (preferences: { email: boolean; sms: boolean }) => {
      return await apiRequest("PATCH", `/api/customers/${id}/notifications`, {
        notificationPreferences: preferences,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', id] });
      toast({
        title: "Success",
        description: "Notification preferences updated",
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

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      return await apiRequest("DELETE", `/api/customers/${customerId}`);
    },
    onSuccess: () => {
      // Refresh customer list when redirected back
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });

      // Redirect to main customer page
      setLocation("/customers");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string; address?: string }) => {
      return await apiRequest("PATCH", `/api/customers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers', id] });
      // Also invalidate the customers list so it updates in real-time
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Success",
        description: "Customer information updated successfully",
      });
      setIsEditingCustomer(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const onSubmit = (data: InsertProductCase) => {
    // Prevent submission if serial number is duplicate
    if (serialError) {
      toast({
        title: "Error",
        description: serialError,
        variant: "destructive",
      });
      return;
    }

    setPendingCaseData(data);
    setShowEmailConfirm(true);
  };

  const handleConfirm = (sendEmail: boolean) => {
    if (pendingCaseData) {
      createCaseMutation.mutate({ ...pendingCaseData, sendNotification: sendEmail } as any);
      setShowEmailConfirm(false);
      setPendingCaseData(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Customer Profile">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout title="Customer Not Found">
        <div className="p-6 max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Customer not found</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={customer.name}
      actions={
        <div className="flex flex-col sm:flex-row gap-2 w-full">

          {activeTab === "info" && (
            <Button
              variant="outline"
              onClick={() => {
                if (isEditingCustomer) {
                  // Check for phone error before saving
                  if (editPhoneError) {
                    toast({
                      title: "Error",
                      description: editPhoneError,
                      variant: "destructive",
                    });
                    return;
                  }
                  // Check for second phone error before saving
                  if (editSecondPhoneError) {
                    toast({
                      title: "Error",
                      description: editSecondPhoneError,
                      variant: "destructive",
                    });
                    return;
                  }
                  // Save changes
                  updateCustomerMutation.mutate(editCustomerData);
                } else {
                  // Enter edit mode
                  setIsEditingCustomer(true);
                  setEditCustomerData({
                    name: customer.name,
                    email: customer.email || "",
                    address: customer.address,
                    phone: customer.phone,
                    secondPhone: customer.secondPhone || "",
                  });
                  setEditPhoneValue(customer.phone);
                  setEditSecondPhoneValue(customer.secondPhone || "");
                  setEditPhoneError("");
                  setEditSecondPhoneError("");
                }
              }}
              className="w-full sm:w-auto"
              disabled={updateCustomerMutation.isPending || !!editPhoneError || isCheckingEditPhone || !!editSecondPhoneError || isCheckingEditSecondPhone}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditingCustomer ? (updateCustomerMutation.isPending ? "Saving..." : "Save Changes") : "Edit Info"}
            </Button>
          )}

          {isEditingCustomer && (
            <Button
              variant="outline"
              onClick={() => setIsEditingCustomer(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setDeleteCustomerId(customer._id)}
            data-testid="button-delete-customer"
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Customer
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-case" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Product Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Product Case</DialogTitle>
                <DialogDescription>
                  Add a new product case for {customer.name}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modelNumber">Model Number</Label>
                    <Input
                      id="modelNumber"
                      data-testid="input-model-number"
                      {...register("modelNumber")}
                      className={errors.modelNumber ? "border-destructive" : ""}
                    />
                    {errors.modelNumber && (
                      <p className="text-sm text-destructive">
                        {errors.modelNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      data-testid="input-serial-number"
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
                    {errors.serialNumber && (
                      <p className="text-sm text-destructive">
                        {errors.serialNumber.message}
                      </p>
                    )}
                    {!errors.serialNumber && serialError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {serialError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchasePlace">Purchase Place</Label>
                    <Input
                      id="purchasePlace"
                      data-testid="input-purchase-place"
                      {...register("purchasePlace")}
                      className={errors.purchasePlace ? "border-destructive" : ""}
                    />
                    {errors.purchasePlace && (
                      <p className="text-sm text-destructive">
                        {errors.purchasePlace.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfPurchase">Date of Purchase</Label>
                    <Input
                      id="dateOfPurchase"
                      type="date"
                      data-testid="input-date-of-purchase"
                      {...register("dateOfPurchase")}
                      className={errors.dateOfPurchase ? "border-destructive" : ""}
                    />
                    {errors.dateOfPurchase && (
                      <p className="text-sm text-destructive">
                        {errors.dateOfPurchase.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receiptNumber">Receipt Number</Label>
                  <Input
                    id="receiptNumber"
                    data-testid="input-receipt-number"
                    {...register("receiptNumber")}
                    className={errors.receiptNumber ? "border-destructive" : ""}
                  />
                  {errors.receiptNumber && (
                    <p className="text-sm text-destructive">
                      {errors.receiptNumber.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={watch("status")}
                      onValueChange={(value) => setValue("status", value as any)}
                    >
                      <SelectTrigger data-testid="select-status">
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

                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <Select
                      value={watch("paymentStatus")}
                      onValueChange={(value) =>
                        setValue("paymentStatus", value as any)
                      }
                    >
                      <SelectTrigger data-testid="select-payment-status">
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

                <div className="space-y-2">
                  <Label htmlFor="payment">Payment</Label>
                  <Input
                    id="payment"
                    {...register("payment")}
                    className={errors.payment ? "border-destructive" : ""}
                  />
                  {errors.payment && (
                    <p className="text-sm text-destructive">
                      {errors.payment.message as any}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repairNeeded">Repair Needed</Label>
                  <Textarea
                    id="repairNeeded"
                    data-testid="input-repair-needed"
                    rows={3}
                    {...register("repairNeeded")}
                    className={errors.repairNeeded ? "border-destructive" : ""}
                  />
                  {errors.repairNeeded && (
                    <p className="text-sm text-destructive">
                      {errors.repairNeeded.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingCost">Shipping Cost ($)</Label>
                    <Input
                      id="shippingCost"
                      type="number"
                      step="0.01"
                      data-testid="input-shipping-cost"
                      {...register("shippingCost", { valueAsNumber: true })}
                      className={errors.shippingCost ? "border-destructive" : ""}
                    />
                    {errors.shippingCost && (
                      <p className="text-sm text-destructive">
                        {errors.shippingCost.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receivedDate">Received Date</Label>
                    <Input
                      id="receivedDate"
                      type="date"
                      data-testid="input-received-date"
                      {...register("receivedDate")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippedDate">Shipped Date</Label>
                    <Input
                      id="shippedDate"
                      type="date"
                      data-testid="input-shipped-date"
                      {...register("shippedDate")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialSummary">Initial Summary</Label>
                  <Textarea
                    id="initialSummary"
                    data-testid="input-initial-summary"
                    rows={4}
                    placeholder="Why are we opening this case?"
                    {...register("initialSummary")}
                    className={errors.initialSummary ? "border-destructive" : ""}
                  />
                  {errors.initialSummary && (
                    <p className="text-sm text-destructive">
                      {errors.initialSummary.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createCaseMutation.isPending || !!serialError || isCheckingSerial}
                    data-testid="button-submit-case"
                  >
                    {createCaseMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating Case...</span>
                      </div>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Case
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

      }
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Breadcrumb
          items={[
            { label: "Customers", href: "/customers" },
            { label: customer.name }
          ]}
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-mono text-muted-foreground">{customer.customerId}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="info" data-testid="tab-customer-info">Customer Info</TabsTrigger>
            <TabsTrigger value="cases" data-testid="tab-product-cases">
              Product Cases ({customer.cases?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditingCustomer ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-name">Customer Name</Label>
                      <Input
                        id="edit-customer-name"
                        value={editCustomerData.name}
                        onChange={(e) => setEditCustomerData({ ...editCustomerData, name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-email">Email Address (Optional)</Label>
                      <Input
                        id="edit-customer-email"
                        type="email"
                        value={editCustomerData.email}
                        onChange={(e) => setEditCustomerData({ ...editCustomerData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>


                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-phone">Phone Number</Label>
                      <Input
                        id="edit-customer-phone"
                        value={editPhoneValue}
                        onChange={(e) => {
                          setEditPhoneValue(e.target.value);
                          setEditCustomerData({ ...editCustomerData, phone: e.target.value });
                        }}
                        placeholder="+1 234 567 8900"
                        className={editPhoneError ? "border-destructive" : ""}
                      />
                      {isCheckingEditPhone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 animate-spin" />
                          Checking phone number...
                        </p>
                      )}
                      {editPhoneError && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {editPhoneError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-second-phone">Second Phone (Optional)</Label>
                      <Input
                        id="edit-customer-second-phone"
                        value={editSecondPhoneValue}
                        onChange={(e) => {
                          setEditSecondPhoneValue(e.target.value);
                          setEditCustomerData({ ...editCustomerData, secondPhone: e.target.value });
                        }}
                        placeholder="+1 234 567 8901"
                        className={editSecondPhoneError ? "border-destructive" : ""}
                      />
                      {isCheckingEditSecondPhone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 animate-spin" />
                          Checking second phone...
                        </p>
                      )}
                      {editSecondPhoneError && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {editSecondPhoneError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-customer-address">Address</Label>
                      <Textarea
                        id="edit-customer-address"
                        value={editCustomerData.address}
                        onChange={(e) => setEditCustomerData({ ...editCustomerData, address: e.target.value })}
                        placeholder="Full address"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{customer.email || "Not provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                    </div>
                    {customer.secondPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Second Phone</p>
                          <p className="font-medium">{customer.secondPhone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{customer.address}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="email-notifications" className="text-base font-medium cursor-pointer">
                        Email Notifications
                      </Label>
                      {admin?.role !== 'superadmin' && (
                        <span className="text-xs text-muted-foreground">(Admin only)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates when case status changes
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    disabled={admin?.role !== 'superadmin'}
                    onCheckedChange={(checked) => {
                      if (admin?.role === 'superadmin') {
                        setEmailNotifications(checked);
                        updateNotificationsMutation.mutate({
                          email: checked,
                          sms: smsNotifications,
                        });
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="sms-notifications" className="text-base font-medium cursor-pointer">
                        SMS Notifications
                      </Label>
                      {admin?.role !== 'superadmin' && (
                        <span className="text-xs text-muted-foreground">(Superadmin only)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive SMS text messages when case status changes {admin?.role !== 'superadmin' && '(Restricted to superadmin)'}
                    </p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={smsNotifications}
                    disabled={admin?.role !== 'superadmin'}
                    onCheckedChange={(checked) => {
                      if (admin?.role === 'superadmin') {
                        setSmsNotifications(checked);
                        updateNotificationsMutation.mutate({
                          email: emailNotifications,
                          sms: checked,
                        });
                      }
                    }}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Bell className="h-4 w-4 mt-0.5" />
                    <p>
                      Automatic notifications will be sent to <strong>{customer.email}</strong> and <strong>{customer.phone}</strong> when case status changes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cases" className="mt-6">
            {customer.cases && customer.cases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.cases.map((case_) => (
                  <Link key={case_._id} href={`/cases/${case_._id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`case-card-${case_._id}`}>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold font-mono truncate">{case_.modelNumber}</p>
                            <p className="text-sm text-muted-foreground font-mono">S/N: {case_.serialNumber}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${case_.status === 'New Case' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            case_.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' :
                              case_.status === 'Awaiting Parts' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                                case_.status === 'Repair Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                                  case_.status === 'Shipped to Customer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                                    'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300'
                            }`}>
                            {case_.status}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">{case_.repairNeeded}</p>
                        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(case_.createdAt), 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {case_.shippingCost.toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No product cases yet</p>
                  <p className="text-sm text-muted-foreground">Create one to get started</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteCustomerId} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer and all their product cases? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCustomerId && deleteCustomerMutation.mutate(deleteCustomerId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to send a "Case Created" email to the customer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirm(false)}>No, Don't Send</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirm(true)}>Yes, Send Email</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
