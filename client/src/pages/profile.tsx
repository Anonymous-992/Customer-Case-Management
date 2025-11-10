import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { updateAdminSchema, type UpdateAdmin } from "@shared/schema";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { admin, updateAdmin } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateAdmin>({
    resolver: zodResolver(updateAdminSchema),
    defaultValues: {
      name: admin?.name || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateAdmin) => {
      return await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: (data) => {
      updateAdmin(data.admin);
      toast({
        title: "Success",
        description: "Profile updated successfully",
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

  const onSubmit = (data: UpdateAdmin) => {
    const updateData: any = {};
    
    if (data.name && data.name !== admin?.name) {
      updateData.name = data.name;
    }
    
    if (data.avatar !== undefined && data.avatar !== admin?.avatar) {
      updateData.avatar = data.avatar;
    }
    
    // Only include password if newPassword is provided and not empty
    if (data.newPassword && data.newPassword.length > 0) {
      updateData.password = data.newPassword;
    }

    if (Object.keys(updateData).length > 0) {
      updateProfileMutation.mutate(updateData);
    } else {
      toast({
        title: "No changes",
        description: "Please make changes before saving",
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <DashboardLayout title="Profile">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Breadcrumb items={[{ label: "Profile" }]} />
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information and credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6 pb-6 border-b">
              <Avatar className="h-20 w-20">
                <AvatarImage src={admin?.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                  {admin ? getInitials(admin.name) : 'AD'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{admin?.name}</h3>
                <p className="text-sm text-muted-foreground">{admin?.email}</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-2 ${
                  admin?.role === 'superadmin'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {admin?.role === 'superadmin' ? 'Super Admin' : 'Sub Admin'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  data-testid="input-profile-name"
                  {...register("name")}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL (optional)</Label>
                <Input
                  id="avatar"
                  data-testid="input-profile-avatar"
                  placeholder="https://example.com/avatar.jpg"
                  {...register("avatar")}
                  className={errors.avatar ? "border-destructive" : ""}
                />
                {errors.avatar && (
                  <p className="text-sm text-destructive">{errors.avatar.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password (optional)</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    data-testid="input-profile-new-password"
                    placeholder="Leave blank to keep current"
                    {...register("newPassword")}
                    className={errors.newPassword ? "border-destructive" : ""}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Min 6 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    data-testid="input-profile-confirm-password"
                    placeholder="Confirm your new password"
                    {...register("confirmPassword")}
                    className={errors.confirmPassword ? "border-destructive" : ""}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must match new password
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Password Change:</strong> Leave password fields blank if you don't want to change your password. Only fill them if you want to set a new password.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
