import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { 
  insertInteractionHistorySchema, 
  type InsertInteractionHistory, 
  type ProductCaseWithHistory,
  caseStatusEnum,
  paymentStatusEnum,
  type UpdateProductCase,
  insertProductCaseSchema
} from "@shared/schema";
import { Trash2, Calendar, DollarSign, Package, Wrench, Link as LinkIcon, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSettings } from "@/lib/settings-context";
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
import { z } from "zod";

export default function CaseDetailPage() {
  const { id } = useParams();
  const { formatDate, formatDateTime } = useSettings();
  const [, setLocation] = useLocation();
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { admin } = useAuth();
  const { toast } = useToast();

  const { data: caseData, isLoading } = useQuery<ProductCaseWithHistory>({
    queryKey: ['/api/cases', id],
    enabled: !!id,
  });

  const noteSchema = z.object({
    message: z.string().min(1, "Note cannot be empty"),
  });

  const {
    register: registerNote,
    handleSubmit: handleSubmitNote,
    reset: resetNote,
    formState: { errors: noteErrors },
  } = useForm<{ message: string }>({
    resolver: zodResolver(noteSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setEditValue,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm<any>({
    resolver: zodResolver(insertProductCaseSchema.partial()),
  });

  const addNoteMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest("POST", "/api/interactions", {
        caseId: id,
        type: "note_added",
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases', id] });
      toast({
        title: "Note added",
        description: "Your note has been added to the timeline",
      });
      resetNote();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/cases/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases', id] });
      toast({
        title: "Success",
        description: "Case updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      return await apiRequest("DELETE", `/api/cases/${caseId}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Case deleted successfully",
      });
      setLocation(`/customers/${caseData?.customer._id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitNote = (data: { message: string }) => {
    addNoteMutation.mutate(data.message);
  };

  const onSubmitEdit = (data: any) => {
    updateCaseMutation.mutate(data);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Export case details to PDF
  const handleExportCaseDetailPDF = () => {
    if (!caseData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Case Details Report", pageWidth / 2, 20, { align: "center" });
    
    // Case ID
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Case ID: ${caseData._id}`, 14, 35);
    
    // Customer Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Information", 14, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const customerInfo = [
      ["Name", caseData.customer.name],
      ["Phone", caseData.customer.phone],
      ["Email", caseData.customer.email || "N/A"],
      ["Address", caseData.customer.address || "N/A"],
    ];
    autoTable(doc, {
      startY: 55,
      head: [],
      body: customerInfo,
      theme: "plain",
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
    });

    // Case Information
    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Case Information", 14, currentY);
    currentY += 5;
    
    const caseInfo = [
      ["Model Number", caseData.modelNumber],
      ["Serial Number", caseData.serialNumber],
      ["Status", caseData.status],
      ["Payment Status", caseData.paymentStatus],
      ["Store", caseData.purchasePlace || "N/A"],
      ["Date of Purchase", formatDate(caseData.dateOfPurchase)],
      ["Receipt Number", caseData.receiptNumber || "N/A"],
      ["Repair Needed", caseData.repairNeeded || "N/A"],
      ["Shipping Cost", `$${caseData.shippingCost || 0}`],
      ["Created", formatDateTime(caseData.createdAt)],
      ["Last Updated", formatDateTime(caseData.updatedAt)],
    ];
    autoTable(doc, {
      startY: currentY,
      head: [],
      body: caseInfo,
      theme: "striped",
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    });

    // Initial Summary
    if (caseData.initialSummary) {
      currentY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Initial Summary", 14, currentY);
      currentY += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const splitSummary = doc.splitTextToSize(caseData.initialSummary, pageWidth - 28);
      doc.text(splitSummary, 14, currentY);
    }

    // Interaction History removed from PDF export to prevent text overlapping
    // The full interaction history can be viewed on the case detail page

    // Save PDF
    doc.save(`case-${caseData._id}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "Success",
      description: "Case details exported to PDF",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Case Details">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout title="Case Not Found">
        <div className="p-6 max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Case not found</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Case Details"
      actions={
        <div className="flex flex-col sm:flex-row gap-2 ">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(true);
                  setEditValue("status", caseData.status);
                  setEditValue("paymentStatus", caseData.paymentStatus);
                }}
                data-testid="button-edit-case"
              >
                Edit Case
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCaseDetailPDF}
                data-testid="button-export-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteCaseId(caseData._id)}
                data-testid="button-delete-case"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Case
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitEdit(onSubmitEdit)}
                disabled={updateCaseMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateCaseMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Breadcrumb 
          items={[
            { label: "Customers", href: "/customers" },
            { label: caseData.customer.name, href: `/customers/${caseData.customer._id}` },
            { label: `Case: ${caseData.modelNumber}` }
          ]} 
        />
        {/* Case Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-semibold font-mono mb-1">{caseData.modelNumber}</h2>
                <p className="text-muted-foreground font-mono">Serial Number: {caseData.serialNumber}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Customer: {caseData.customer.name} ({caseData.customer.customerId})
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                caseData.status === 'New Case' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                caseData.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' :
                caseData.status === 'Awaiting Parts' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                caseData.status === 'Repair Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                caseData.status === 'Shipped to Customer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300'
              }`} data-testid="text-case-status">
                {caseData.status}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={watchEdit("status")}
                      onValueChange={(value) => setEditValue("status", value)}
                    >
                      <SelectTrigger data-testid="select-edit-status">
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
                    <Label>Payment Status</Label>
                    <Select
                      value={watchEdit("paymentStatus")}
                      onValueChange={(value) => setEditValue("paymentStatus", value)}
                    >
                      <SelectTrigger data-testid="select-edit-payment">
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
                </form>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Place</p>
                    <p className="font-medium">{caseData.purchasePlace}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Purchase</p>
                      <p className="font-medium">{format(new Date(caseData.dateOfPurchase), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Receipt Number</p>
                      <p className="font-medium font-mono">{caseData.receiptNumber}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                      caseData.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' :
                      caseData.paymentStatus === 'Paid by Customer' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                      caseData.paymentStatus === 'Under Warranty' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    }`}>
                      {caseData.paymentStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Repair Needed</p>
                    <p className="font-medium mt-1">{caseData.repairNeeded}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping Cost</p>
                      <p className="font-medium">${caseData.shippingCost.toFixed(2)}</p>
                    </div>
                    {caseData.receivedDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Received</p>
                        <p className="font-medium text-sm">{format(new Date(caseData.receivedDate), 'MMM dd')}</p>
                      </div>
                    )}
                    {caseData.shippedDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Shipped</p>
                        <p className="font-medium text-sm">{format(new Date(caseData.shippedDate), 'MMM dd')}</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Initial Summary</p>
                    <p className="text-sm">{caseData.initialSummary}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader>
              <CardTitle>Add Update / Note</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitNote(onSubmitNote)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="note">Phone Call Summary / Update</Label>
                  <Textarea
                    id="note"
                    data-testid="input-note"
                    rows={5}
                    placeholder="Enter your note or update here..."
                    {...registerNote("message")}
                    className={noteErrors.message ? "border-destructive" : ""}
                  />
                  {noteErrors.message && (
                    <p className="text-sm text-destructive">{noteErrors.message.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={addNoteMutation.isPending}
                  data-testid="button-save-note"
                >
                  {addNoteMutation.isPending ? "Saving..." : "Save Update"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Interaction History Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Interaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.history && caseData.history.length > 0 ? (
              <div className="relative border-l-2 border-border pl-8 space-y-6">
                {caseData.history.map((interaction, index) => (
                  <div key={interaction._id} className="relative" data-testid={`interaction-${interaction._id}`}>
                    {/* Timeline dot and avatar */}
                    <div className="absolute -left-12 flex items-center justify-center">
                      <Avatar className="h-10 w-10 border-2 border-background">
                        <AvatarImage src={interaction.adminAvatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getInitials(interaction.adminName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(interaction.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs font-medium">
                          Update by {interaction.adminName}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          interaction.adminRole === 'superadmin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {interaction.adminRole === 'superadmin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm whitespace-pre-wrap">{interaction.message}</p>
                        {interaction.metadata && (
                          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                            {interaction.metadata.oldStatus && interaction.metadata.newStatus && (
                              <p>Status changed: {interaction.metadata.oldStatus} → {interaction.metadata.newStatus}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No interaction history yet</p>
                <p className="text-sm text-muted-foreground">Add a note to start tracking interactions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteCaseId} onOpenChange={() => setDeleteCaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product case? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCaseId && deleteCaseMutation.mutate(deleteCaseId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
