import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckCircle2, Clock } from "lucide-react";
import type { Customer, ProductCase } from "@shared/schema";

export default function DashboardPage() {
  const { data: customers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: cases, isLoading: casesLoading } = useQuery<ProductCase[]>({
    queryKey: ['/api/cases'],
  });

  const stats = [
    {
      title: "Total Customers",
      value: customers?.length || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      testId: "stat-customers"
    },
    {
      title: "Active Cases",
      value: cases?.filter(c => !['Closed', 'Shipped to Customer'].includes(c.status)).length || 0,
      icon: FileText,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      testId: "stat-active-cases"
    },
    {
      title: "Completed Cases",
      value: cases?.filter(c => c.status === 'Repair Completed').length || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/20",
      testId: "stat-completed"
    },
    {
      title: "Pending Cases",
      value: cases?.filter(c => c.status === 'New Case').length || 0,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      testId: "stat-pending"
    },
  ];

  const recentCases = cases?.slice().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const isLoading = customersLoading || casesLoading;

  return (
    <DashboardLayout title="Dashboard">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover-elevate">
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

        {/* Recent Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Cases</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : recentCases && recentCases.length > 0 ? (
              <div className="space-y-3">
                {recentCases.map((case_) => (
                  <div
                    key={case_._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate"
                    data-testid={`case-${case_._id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium font-mono text-sm">{case_.modelNumber}</p>
                      <p className="text-sm text-muted-foreground">S/N: {case_.serialNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        case_.status === 'New Case' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        case_.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' :
                        case_.status === 'Awaiting Parts' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                        case_.status === 'Repair Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' :
                        case_.status === 'Shipped to Customer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300'
                      }`}>
                        {case_.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No cases yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
