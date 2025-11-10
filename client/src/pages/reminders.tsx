import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Bell, Clock, CheckCircle2, AlertCircle, CalendarIcon, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import type { Reminder, Admin } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { exportData, type ExportColumn } from "@/lib/export-utils";

export default function RemindersPage() {
  const { toast } = useToast();
  const { settings, formatDate, formatDateTime } = useSettings();
  const queryClient = useQueryClient();
  const { admin: currentAdmin } = useAuth();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDescription, setReminderDescription] = useState("");
  const [reminderPriority, setReminderPriority] = useState("Medium");
  const [reminderAssignedTo, setReminderAssignedTo] = useState<string[]>([]);
  const [reminderDueDate, setReminderDueDate] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);

  const { data: reminders, isLoading } = useQuery<Reminder[]>({
    queryKey: ['/api/reminders'],
  });

  const { data: allAdmins } = useQuery<Admin[]>({
    queryKey: ['/api/admins'],
  });

  // Mark reminders as read when page is viewed
  useEffect(() => {
    if (reminders && currentAdmin) {
      reminders.forEach((reminder) => {
        const isAssignedToMe = reminder.assignedTo.includes(currentAdmin._id);
        const isCreator = reminder.assignedBy === currentAdmin._id;
        const isUnreadByAssignee = !(reminder.isReadByAssignees || []).includes(currentAdmin._id);
        const hasUnseenUpdate = reminder.hasUnreadUpdate === true;
        
        if (isAssignedToMe && isUnreadByAssignee) {
          markAsReadByAssigneeMutation.mutate(reminder._id);
        }
        
        if (isCreator && hasUnseenUpdate) {
          markUpdateAsSeenMutation.mutate(reminder._id);
        }
      });
    }
  }, [reminders?.length, currentAdmin?._id]);

  const createReminderMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/unread-count'] });
      toast({ title: "Success", description: "Reminder created successfully!" });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => 
      apiRequest("PATCH", `/api/reminders/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/unread-count'] });
      toast({ title: "Success", description: "Reminder updated!" });
    },
  });

  const markAsReadByAssigneeMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/reminders/${id}`, { markAsReadByAssignee: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/unread-count'] });
    },
  });

  const markUpdateAsSeenMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/reminders/${id}`, { markUpdateAsSeen: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/unread-count'] });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/unread-count'] });
      toast({ title: "Success", description: "Reminder deleted!" });
    },
  });

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setReminderTitle("");
    setReminderDescription("");
    setReminderPriority("Medium");
    setReminderAssignedTo([]);
    setReminderDueDate("");
  };

  const handleCreateReminder = () => {
    if (!reminderTitle.trim() || reminderTitle.length < 3) {
      toast({ title: "Error", description: "Title must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (!reminderDescription.trim() || reminderDescription.length < 5) {
      toast({ title: "Error", description: "Description must be at least 5 characters", variant: "destructive" });
      return;
    }
    if (reminderAssignedTo.length === 0) {
      toast({ title: "Error", description: "Please select at least one team member", variant: "destructive" });
      return;
    }

    createReminderMutation.mutate({
      title: reminderTitle,
      description: reminderDescription,
      priority: reminderPriority,
      assignedTo: reminderAssignedTo,
      dueDate: reminderDueDate || undefined,
    });
  };

  const handleUpdateStatus = (id: string, status: string) => {
    updateReminderMutation.mutate({ id, updates: { status } });
  };

  const handleDeleteReminder = (reminder: Reminder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentAdmin || currentAdmin._id !== reminder.assignedBy) {
      toast({ title: "Error", description: "Only the creator can delete this reminder", variant: "destructive" });
      return;
    }
    setReminderToDelete(reminder);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (reminderToDelete) {
      deleteReminderMutation.mutate(reminderToDelete._id);
      setDeleteConfirmOpen(false);
      setReminderToDelete(null);
    }
  };

  // Export function for reminders
  const handleExportReminders = (format: "excel" | "pdf") => {
    if (!reminders || reminders.length === 0) {
      toast({
        title: "No Data",
        description: "No reminders to export",
        variant: "destructive",
      });
      return;
    }

    const columns: ExportColumn[] = [
      { key: "title", label: "Title" },
      { key: "description", label: "Description" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "assignedByName", label: "Created By" },
      { 
        key: "assignedToNames", 
        label: "Assigned To", 
        format: (names) => {
          if (!Array.isArray(names) || names.length === 0) return "None";
          return names.join(", ");
        }
      },
      { 
        key: "dueDate", 
        label: "Due Date", 
        format: (date) => date ? formatDate(date) : "No due date"
      },
      { 
        key: "createdAt", 
        label: "Created", 
        format: (date) => formatDateTime(date)
      },
    ];

    exportData(format, {
      filename: `reminders-export-${new Date().toISOString().split('T')[0]}`,
      sheetName: "Reminders",
      columns,
      data: reminders,
      title: "Case Management - Reminders Export",
    });

    toast({
      title: "Success",
      description: `Exported ${reminders.length} reminders to ${format.toUpperCase()}`,
    });
  };

  const handleToggleAssignee = (adminId: string) => {
    setReminderAssignedTo(prev => 
      prev.includes(adminId) ? prev.filter(id => id !== adminId) : [...prev, adminId]
    );
  };

  const handleSelectAllMembers = () => {
    if (!allAdmins) return;
    const subAdminIds = allAdmins.filter(admin => admin.role === "subadmin").map(admin => admin._id);
    setReminderAssignedTo(subAdminIds);
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "Urgent": return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
      case "High": return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
      case "Medium": return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "Low": return "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
      case "In Progress": return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "Cancelled": return "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300";
      case "Pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return CheckCircle2;
      case "In Progress": return Clock;
      case "Cancelled": return AlertCircle;
      default: return Bell;
    }
  };

  const isReminderOverdue = (reminder: Reminder) => {
    if (!reminder.dueDate || reminder.status === "Completed" || reminder.status === "Cancelled") {
      return false;
    }
    return new Date(reminder.dueDate) < new Date();
  };

  const availableSubAdmins = allAdmins?.filter(admin => admin.role === "subadmin") || [];

  return (
    <DashboardLayout
      title="Team Reminders"
      actions={
        currentAdmin?.role === "superadmin" ? (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Reminder</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Team Reminder</DialogTitle>
                <DialogDescription>Assign a task or reminder to team members</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminderTitle">Title *</Label>
                  <Input
                    id="reminderTitle"
                    placeholder="e.g., Follow up with customer"
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminderDescription">Description *</Label>
                  <Textarea
                    id="reminderDescription"
                    placeholder="Provide details..."
                    value={reminderDescription}
                    onChange={(e) => setReminderDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminderPriority">Priority</Label>
                    <Select value={reminderPriority} onValueChange={setReminderPriority}>
                      <SelectTrigger id="reminderPriority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminderDueDate">
                      <CalendarIcon className="h-4 w-4 inline mr-1" />
                      Due Date (Optional)
                    </Label>
                    <Input
                      id="reminderDueDate"
                      type="date"
                      value={reminderDueDate}
                      onChange={(e) => setReminderDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Assign To (Sub Admins) *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllMembers}
                      disabled={availableSubAdmins.length === 0}
                    >
                      All Members
                    </Button>
                  </div>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {availableSubAdmins.length > 0 ? (
                      availableSubAdmins.map((admin) => (
                        <label
                          key={admin._id}
                          className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={reminderAssignedTo.includes(admin._id)}
                            onChange={() => handleToggleAssignee(admin._id)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{admin.name}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {admin.role}
                            </Badge>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No subadmins available
                      </p>
                    )}
                  </div>
                  {reminderAssignedTo.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {reminderAssignedTo.length} member{reminderAssignedTo.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button
                    onClick={handleCreateReminder}
                    disabled={createReminderMutation.isPending}
                    className="w-full sm:flex-1"
                  >
                    {createReminderMutation.isPending ? "Creating..." : "Create Reminder"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseDialog}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Export Buttons */}
        {reminders && reminders.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReminders(settings?.exportSettings.defaultFormat || "excel")}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export ({settings?.exportSettings.defaultFormat?.toUpperCase() || "Excel"})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReminders(
                settings?.exportSettings.defaultFormat === "excel" ? "pdf" : "excel"
              )}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {settings?.exportSettings.defaultFormat === "excel" ? "PDF" : "Excel"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-32 bg-muted animate-pulse" />
            ))}
          </div>
        ) : reminders && reminders.length > 0 ? (
          <div className="space-y-4">
            {reminders.map((reminder) => {
              const isOverdue = isReminderOverdue(reminder);
              const StatusIcon = getStatusIcon(reminder.status);
              const isAssignedToMe = currentAdmin && reminder.assignedTo.includes(currentAdmin._id);
              const isCreator = currentAdmin && reminder.assignedBy === currentAdmin._id;
              const hasUpdate = reminder.hasUnreadUpdate === true;

              return (
                <Card
                  key={reminder._id}
                  className={`${
                    isOverdue ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                    reminder.status === "Completed" ? 'opacity-70 bg-gray-50 dark:bg-gray-900/20' : ''
                  } transition-all`}
                >
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            reminder.status === "Completed" ? "text-green-600" :
                            reminder.status === "In Progress" ? "text-blue-600" :
                            reminder.status === "Cancelled" ? "text-gray-400" :
                            "text-yellow-600"
                          }`} />
                          <h3 className={`font-semibold text-lg break-words ${
                            reminder.status === "Completed" ? "line-through text-muted-foreground" : ""
                          }`}>
                            {reminder.title}
                          </h3>
                        </div>
                        <p className={`text-sm text-muted-foreground break-words ${
                          reminder.status === "Completed" ? "line-through" : ""
                        }`}>
                          {reminder.description}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-start gap-2 flex-shrink-0">
                        <Badge className={`${getPriorityStyle(reminder.priority)} text-xs whitespace-nowrap`}>
                          {reminder.priority}
                        </Badge>
                        <Badge className={`${getStatusStyle(reminder.status)} text-xs whitespace-nowrap`}>
                          {reminder.status}
                        </Badge>
                        {isCreator && hasUpdate && (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 text-xs whitespace-nowrap animate-pulse">
                            🔔 UPDATE
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                      <span><strong>From:</strong> {reminder.assignedByName}</span>
                      <span><strong>To:</strong> {reminder.assignedToNames.join(", ")}</span>
                      {reminder.dueDate && (
                        <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                          <CalendarIcon className="h-3 w-3 inline" />
                          <strong> Due:</strong> {new Date(reminder.dueDate).toLocaleDateString()}
                          {isOverdue && " (OVERDUE)"}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                      {isAssignedToMe && reminder.status !== "Completed" && reminder.status !== "Cancelled" && (
                        <Select
                          value={reminder.status}
                          onValueChange={(value) => handleUpdateStatus(reminder._id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Mark as Pending</SelectItem>
                            <SelectItem value="In Progress">Mark In Progress</SelectItem>
                            <SelectItem value="Completed">Mark Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancel</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      {currentAdmin && currentAdmin.role === "superadmin" && reminder.assignedBy === currentAdmin._id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full sm:w-auto sm:ml-auto"
                          onClick={(e) => handleDeleteReminder(reminder, e)}
                        >
                          <Trash2 className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reminders Found</h3>
              <p className="text-muted-foreground">
                {currentAdmin?.role === "superadmin"
                  ? "Create a reminder to get started"
                  : "You have no reminders assigned"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
              {reminderToDelete && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="font-semibold text-foreground">{reminderToDelete.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{reminderToDelete.description}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReminderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
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
