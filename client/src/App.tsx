import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import CustomerProfilePage from "@/pages/customer-profile";
import CaseDetailPage from "@/pages/case-detail";
import AdminManagementPage from "@/pages/admin-management";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  const { admin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {admin ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>

      <Route path="/customers">
        <ProtectedRoute>
          <CustomersPage />
        </ProtectedRoute>
      </Route>

      <Route path="/customers/:id">
        <ProtectedRoute>
          <CustomerProfilePage />
        </ProtectedRoute>
      </Route>

      <Route path="/cases/:id">
        <ProtectedRoute>
          <CaseDetailPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admins">
        <ProtectedRoute requireSuperAdmin>
          <AdminManagementPage />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
