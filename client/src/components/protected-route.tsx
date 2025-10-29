import { useAuth } from "@/lib/auth-context";
import { Redirect } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { admin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!admin) {
    return <Redirect to="/login" />;
  }

  if (requireSuperAdmin && admin.role !== 'superadmin') {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
