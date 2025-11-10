import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSettings } from "@/lib/settings-context";
import { exportData, type ExportColumn } from "@/lib/export-utils";
import { insertCustomerSchema, type InsertCustomer, type Customer } from "@shared/schema";
import { UserPlus, Search, Mail, Phone, MapPin, FileText, AlertCircle, Download } from "lucide-react";

export default function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneError, setPhoneError] = useState<string>("");
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const { toast } = useToast();
  const { settings, formatDate } = useSettings();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
  });

  // Debounced phone number check
  useEffect(() => {
    const checkPhone = async () => {
      if (phoneValue.length < 10) {
        setPhoneError("");
        return;
      }

      setIsCheckingPhone(true);
      try {
        const response = await fetch(`/api/customers/check-phone/${encodeURIComponent(phoneValue)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        
        if (data.exists) {
          setPhoneError(`Phone number already exists for ${data.customer.name} (${data.customer.customerId})`);
        } else {
          setPhoneError("");
        }
      } catch (error) {
        console.error('Error checking phone:', error);
      } finally {
        setIsCheckingPhone(false);
      }
    };

    const timer = setTimeout(checkPhone, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [phoneValue]);

  // Reset phone validation when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setPhoneValue("");
      setPhoneError("");
      reset();
    }
  }, [isDialogOpen, reset]);

  const createCustomerMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      return await apiRequest("POST", "/api/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      setIsDialogOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCustomer) => {
    // Prevent submission if phone number is duplicate
    if (phoneError) {
      toast({
        title: "Error",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate(data);
  };

  // Export function for customers
  const handleExportCustomers = (format: "excel" | "pdf") => {
    if (!filteredCustomers || filteredCustomers.length === 0) {
      toast({
        title: "No Data",
        description: "No customers to export",
        variant: "destructive",
      });
      return;
    }

    const columns: ExportColumn[] = [
      { key: "customerId", label: "Customer ID" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { 
        key: "createdAt", 
        label: "Registered", 
        format: (date) => formatDate(date)
      },
    ];

    exportData(format, {
      filename: `customers-export-${new Date().toISOString().split('T')[0]}`,
      sheetName: "Customers",
      columns,
      data: filteredCustomers,
      title: "Case Management - Customers Export",
    });

    toast({
      title: "Success",
      description: `Exported ${filteredCustomers.length} customers to ${format.toUpperCase()}`,
    });
  };

  const filteredCustomers = customers?.filter(customer => {
    const search = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email.toLowerCase().includes(search) ||
      customer.phone.includes(search) ||
      customer.customerId.toLowerCase().includes(search)
    );
  }) || [];

  return (
    <DashboardLayout
      title="Customers"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-customer">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer profile
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  data-testid="input-customer-name"
                  placeholder="John Doe"
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  data-testid="input-customer-phone"
                  placeholder="+1 234 567 8900"
                  value={phoneValue}
                  onChange={(e) => {
                    setPhoneValue(e.target.value);
                    setValue("phone", e.target.value);
                  }}
                  className={errors.phone || phoneError ? "border-destructive" : ""}
                />
                {isCheckingPhone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Checking phone number...
                  </p>
                )}
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
                {!errors.phone && phoneError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {phoneError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-customer-email"
                  placeholder="john@example.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  data-testid="input-customer-address"
                  placeholder="123 Main St, City, State 12345"
                  rows={3}
                  {...register("address")}
                  className={errors.address ? "border-destructive" : ""}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
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
                  disabled={createCustomerMutation.isPending || !!phoneError || isCheckingPhone}
                  data-testid="button-submit-customer"
                >
                  {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Breadcrumb items={[{ label: "Customers" }]} />
        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or Customer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-customers"
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Export Buttons */}
        {filteredCustomers.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCustomers(settings?.exportSettings.defaultFormat || "excel")}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export ({settings?.exportSettings.defaultFormat?.toUpperCase() || "Excel"})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCustomers(
                settings?.exportSettings.defaultFormat === "excel" ? "pdf" : "excel"
              )}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {settings?.exportSettings.defaultFormat === "excel" ? "PDF" : "Excel"}
            </Button>
          </div>
        )}

        {/* Customer List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((customer) => (
              <Link key={customer._id} href={`/customers/${customer._id}`}>
                <Card className="hover-elevate h-full cursor-pointer" data-testid={`customer-card-${customer._id}`}>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      <p className="text-sm font-mono text-muted-foreground">{customer.customerId}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                {searchTerm ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No customers found matching "{searchTerm}"</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No customers yet</p>
                    <p className="text-sm text-muted-foreground">Create one to get started</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
