import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginCredentials, type AuthResponse } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings-context";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useSettings();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return await apiRequest<AuthResponse>("POST", "/api/auth/login", credentials);
    },
    onSuccess: (data) => {
      if (data.success && data.admin && data.token) {
        login(data.admin, data.token);
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.admin.name}`,
        });
        setLocation("/");
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img 
                src="/logo.png" 
                alt="Company Logo" 
                className="h-12 sm:h-16 w-auto max-w-[150px] sm:max-w-[200px] object-contain"
                onError={(e) => {
                  // Fallback to lock icon if logo fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">{t("customer_case_management")}</CardTitle>
          <CardDescription>
            {t("sign_in_access")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                data-testid="input-username"
                placeholder={t("enter_username")}
                {...register("username")}
                className={errors.username ? "border-destructive" : ""}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                placeholder={t("enter_password")}
                {...register("password")}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              data-testid="button-login"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? t("signing_in") : t("sign_in")}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-center text-muted-foreground">
              developed by @Fawad
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
