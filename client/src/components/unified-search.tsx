import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, User, FileText, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer, ProductCase } from "@shared/schema";

type SearchField = 
  | "all"
  | "customer_name"
  | "customer_phone"
  | "customer_email"
  | "customer_id"
  | "customer_region"
  | "case_model"
  | "case_serial"
  | "case_store"
  | "case_receipt"
  | "case_status"
  | "case_payment";

export function UnifiedSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("all");
  const [isOpen, setIsOpen] = useState(false);

  // Determine which endpoints to query based on selected field
  const shouldQueryCustomers = searchField === "all" || searchField.startsWith("customer_");
  const shouldQueryCases = searchField === "all" || searchField.startsWith("case_");

  const { data: allCustomers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers', { q: searchQuery }],
    enabled: searchQuery.length > 1 && shouldQueryCustomers,
    staleTime: 0,
  });

  const { data: allCases, isLoading: casesLoading } = useQuery<ProductCase[]>({
    queryKey: ['/api/cases', { q: searchQuery }],
    enabled: searchQuery.length > 1 && shouldQueryCases,
    staleTime: 0,
  });

  // Filter results based on selected field
  const customers = allCustomers?.filter(customer => {
    if (searchField === "all") return true;
    const query = searchQuery.toLowerCase();
    
    switch (searchField) {
      case "customer_name":
        return customer.name?.toLowerCase().includes(query);
      case "customer_phone":
        return customer.phone?.toLowerCase().includes(query);
      case "customer_email":
        return customer.email?.toLowerCase().includes(query);
      case "customer_id":
        return customer.customerId?.toLowerCase().includes(query);
      case "customer_region":
        return customer.address?.toLowerCase().includes(query);
      default:
        return true;
    }
  });

  const cases = allCases?.filter(case_ => {
    if (searchField === "all") return true;
    const query = searchQuery.toLowerCase();
    
    switch (searchField) {
      case "case_model":
        return case_.modelNumber?.toLowerCase().includes(query);
      case "case_serial":
        return case_.serialNumber?.toLowerCase().includes(query);
      case "case_store":
        return case_.purchasePlace?.toLowerCase().includes(query);
      case "case_receipt":
        return case_.receiptNumber?.toLowerCase().includes(query);
      case "case_status":
        return case_.status?.toLowerCase().includes(query);
      case "case_payment":
        return case_.paymentStatus?.toLowerCase().includes(query);
      default:
        return true;
    }
  });

  const isLoading = customersLoading || casesLoading;
  const hasResults = (customers && customers.length > 0) || (cases && cases.length > 0);

  const handleClear = () => {
    setSearchQuery("");
    setIsOpen(false);
  };

  const getPlaceholder = () => {
    switch (searchField) {
      case "customer_name": return "Search by customer name...";
      case "customer_phone": return "Search by phone number...";
      case "customer_email": return "Search by email...";
      case "customer_id": return "Search by customer ID...";
      case "customer_region": return "Search by region/address...";
      case "case_model": return "Search by product/model...";
      case "case_serial": return "Search by serial number...";
      case "case_store": return "Search by store...";
      case "case_receipt": return "Search by receipt number...";
      case "case_status": return "Search by status...";
      case "case_payment": return "Search by payment status...";
      default: return "Search customers, cases, serial numbers, products, stores...";
    }
  };

  return (
    <div className="relative w-full max-w-3xl">
      <div className="flex gap-2">
        {/* Field Selector */}
        <Select value={searchField} onValueChange={(value) => setSearchField(value as SearchField)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fields</SelectItem>
            <SelectItem value="customer_name">Customer Name</SelectItem>
            <SelectItem value="customer_phone">Phone Number</SelectItem>
            <SelectItem value="customer_email">Email</SelectItem>
            <SelectItem value="customer_id">Customer ID</SelectItem>
            <SelectItem value="customer_region">Region/Address</SelectItem>
            <SelectItem value="case_model">Product/Model</SelectItem>
            <SelectItem value="case_serial">Serial Number</SelectItem>
            <SelectItem value="case_store">Store</SelectItem>
            <SelectItem value="case_receipt">Receipt Number</SelectItem>
            <SelectItem value="case_status">Case Status</SelectItem>
            <SelectItem value="case_payment">Payment Status</SelectItem>
          </SelectContent>
        </Select>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={getPlaceholder()}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(e.target.value.length > 0);
            }}
            onFocus={() => setIsOpen(searchQuery.length > 0)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchQuery && (
        <Card className="absolute top-full mt-2 w-full max-h-[500px] overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-4">
            {searchQuery.length < 2 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Type at least 2 characters to search
                </p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : hasResults ? (
              <div className="space-y-4">
                {/* Customer Results */}
                {customers && customers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Customers ({customers.length})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {customers.map((customer) => (
                        <Link
                          key={customer._id}
                          href={`/customers/${customer._id}`}
                          onClick={handleClear}
                        >
                          <div className="p-3 rounded-lg border border-border hover-elevate cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{customer.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {customer.phone} • {customer.email}
                                </p>
                                {customer.address && (
                                  <p className="text-xs text-muted-foreground truncate mt-1">
                                    📍 {customer.address}
                                  </p>
                                )}
                              </div>
                              <div className="ml-2">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {customer.customerId}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Case Results */}
                {cases && cases.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Cases ({cases.length})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {cases.map((case_) => (
                        <Link
                          key={case_._id}
                          href={`/cases/${case_._id}`}
                          onClick={handleClear}
                        >
                          <div className="p-3 rounded-lg border border-border hover-elevate cursor-pointer">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium font-mono text-sm truncate">
                                  {case_.modelNumber}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  S/N: {case_.serialNumber}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  🏪 {case_.purchasePlace}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                  case_.status === 'New Case' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                  case_.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' :
                                  case_.status === 'Awaiting Parts' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                                  case_.status === 'Repair Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                                  case_.status === 'Shipped to Customer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300'
                                }`}>
                                  {case_.status}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  case_.paymentStatus === 'Paid by Customer' ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' :
                                  case_.paymentStatus === 'Under Warranty' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                                  case_.paymentStatus === 'Company Covered' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400' :
                                  'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                                }`}>
                                  {case_.paymentStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No results found for "{searchQuery}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
