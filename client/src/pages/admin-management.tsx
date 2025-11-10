import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Breadcrumb } from "@/components/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertAdminSchema, type InsertAdmin, type Admin } from "@shared/schema";
import { UserPlus, Trash2 } from "lucide-react";
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

export default function AdminManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: admins, isLoading } = useQuery<Omit<Admin, 'password'>[]>({
    queryKey: ['/api/admins'],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InsertAdmin>({
    resolver: zodResolver(insertAdminSchema),
    defaultValues: { role: 'subadmin' },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: InsertAdmin) => {
      return await apiRequest("POST", "/api/admins", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admins'] });
      toast({ title: "Success", description: "Sub-admin created successfully" });
      setIsDialogOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admins/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admins'] });
      toast({ title: "Success", description: "Sub-admin deleted successfully" });
      setDeleteAdminId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertAdmin) => createAdminMutation.mutate(data);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const subAdmins = admins?.filter(a => a.role === 'subadmin') || [];

  return (
    <DashboardLayout
      title="Admin Management"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-admin">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Sub-Admin
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Sub-Admin</DialogTitle>
                <DialogDescription>Add a new sub-admin to the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" {...register("username")} className={errors.username ? "border-destructive" : ""} />
                  {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} className={errors.email ? "border-destructive" : ""} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...register("password")} className={errors.password ? "border-destructive" : ""} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createAdminMutation.isPending}>
                    {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
                  </Button>
                </div>
              </form>
            </DialogContent>
        </Dialog>
      }
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Breadcrumb items={[{ label: "Admin Management" }]} />
        <Card>
          <CardHeader>
            <CardTitle>Sub-Administrators ({subAdmins.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : subAdmins.length > 0 ? (
              <div className="space-y-3">
                {subAdmins.map((admin) => (
                  <div
                    key={admin._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-border hover-elevate"
                    data-testid={`admin-${admin._id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={admin.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(admin.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 flex-wrap">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-medium whitespace-nowrap">
                        Sub-Admin
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteAdminId(admin._id)}
                        data-testid={`button-delete-admin-${admin._id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No sub-admins yet</p>
                <p className="text-sm text-muted-foreground">Create one to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteAdminId} onOpenChange={() => setDeleteAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sub-admin? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAdminId && deleteAdminMutation.mutate(deleteAdminId)}
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
