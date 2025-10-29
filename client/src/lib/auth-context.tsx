import { createContext, useContext, useState, useEffect } from "react";
import type { Admin } from "@shared/schema";

interface AuthContextType {
  admin: Omit<Admin, 'password'> | null;
  token: string | null;
  login: (admin: Omit<Admin, 'password'>, token: string) => void;
  logout: () => void;
  updateAdmin: (admin: Omit<Admin, 'password'>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Omit<Admin, 'password'> | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedAdmin = localStorage.getItem('admin');
    
    if (storedToken && storedAdmin) {
      setToken(storedToken);
      setAdmin(JSON.parse(storedAdmin));
    }
    setIsLoading(false);
  }, []);

  const login = (adminData: Omit<Admin, 'password'>, tokenData: string) => {
    setAdmin(adminData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('admin', JSON.stringify(adminData));
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  };

  const updateAdmin = (adminData: Omit<Admin, 'password'>) => {
    setAdmin(adminData);
    localStorage.setItem('admin', JSON.stringify(adminData));
  };

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, updateAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
