import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Bell, Clock, FileText, Filter, Shield, Zap, Globe, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import type { Settings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { admin: currentAdmin } = useAuth();
  
  const [hasChanges, setHasChanges] = useState(false);
  
  // Fetch settings
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => apiRequest("PATCH", "/api/settings", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: "Success", description: "Settings saved successfully!" });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetSettingsMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/settings/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: "Success", description: "Settings reset to defaults!" });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveSettings = (updates: any) => {
    updateSettingsMutation.mutate(updates);
  };

  const handleResetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to defaults? This cannot be undone.")) {
      resetSettingsMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Settings">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout title="Settings">
        <div className="p-4 sm:p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Failed to load settings</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">

      <div className="p-4 sm:p-6">
        <Tabs defaultValue="preferences" className="space-y-6">
          <TabsList className="w-full overflow-x-auto flex justify-start sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-1">
            <TabsTrigger value="preferences" className="gap-1.5 flex-shrink-0 px-3 sm:px-4">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="views" className="gap-1.5 flex-shrink-0 px-3 sm:px-4">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Views</span>
            </TabsTrigger>
            {currentAdmin?.role === "superadmin" && (
              <>
                <TabsTrigger value="notifications" className="gap-1.5 flex-shrink-0 px-3 sm:px-4">
                  <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Notify</span>
                </TabsTrigger>
                <TabsTrigger value="reminders" className="gap-1.5 flex-shrink-0 px-3 sm:px-4">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Remind</span>
                </TabsTrigger>
                <TabsTrigger value="export" className="gap-1.5 flex-shrink-0 px-3 sm:px-4">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Export</span>
                </TabsTrigger>
                <TabsTrigger value="permissions" className="gap-1.5 flex-shrink-0 px-3 sm:px-4">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Perms</span>
                </TabsTrigger>
                <TabsTrigger value="autorules" className="gap-1.5 flex-shrink-0 px-3 sm:px-4">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Auto</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive case status updates via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.notifications.emailEnabled}
                    onCheckedChange={(checked) => {
                      handleSaveSettings({
                        notifications: { ...settings.notifications, emailEnabled: checked }
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive urgent updates via SMS
                    </p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={settings.notifications.smsEnabled}
                    onCheckedChange={(checked) => {
                      handleSaveSettings({
                        notifications: { ...settings.notifications, smsEnabled: checked }
                      });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inactivity-alerts">Inactivity Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when cases haven't been updated
                    </p>
                  </div>
                  <Switch
                    id="inactivity-alerts"
                    checked={settings.notifications.inactivityAlertsEnabled}
                    onCheckedChange={(checked) => {
                      handleSaveSettings({
                        notifications: { ...settings.notifications, inactivityAlertsEnabled: checked }
                      });
                    }}
                  />
                </div>

                {settings.notifications.inactivityAlertsEnabled && (
                  <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                    <Label htmlFor="inactivity-days">Inactivity Threshold (Days)</Label>
                    <Select
                      value={settings.notifications.inactivityThresholdDays.toString()}
                      onValueChange={(value) => {
                        handleSaveSettings({
                          notifications: { ...settings.notifications, inactivityThresholdDays: parseInt(value) }
                        });
                      }}
                    >
                      <SelectTrigger id="inactivity-days" className="w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="5">5 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      You'll be notified if a case hasn't been updated for this many days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REMINDERS TAB */}
          <TabsContent value="reminders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Reminders Configuration
                </CardTitle>
                <CardDescription>
                  Configure automatic reminders and default settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-reminders">Automatic Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automatic reminder notifications
                    </p>
                  </div>
                  <Switch
                    id="auto-reminders"
                    checked={settings.remindersConfig.autoRemindersEnabled}
                    onCheckedChange={(checked) => {
                      handleSaveSettings({
                        remindersConfig: { ...settings.remindersConfig, autoRemindersEnabled: checked }
                      });
                    }}
                  />
                </div>

                {settings.remindersConfig.autoRemindersEnabled && (
                  <>
                    <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                      <Label htmlFor="reminder-interval">Default Reminder Interval</Label>
                      <Select
                        value={settings.remindersConfig.defaultReminderInterval}
                        onValueChange={(value) => {
                          handleSaveSettings({
                            remindersConfig: { ...settings.remindersConfig, defaultReminderInterval: value }
                          });
                        }}
                      >
                        <SelectTrigger id="reminder-interval" className="w-full sm:w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {settings.remindersConfig.defaultReminderInterval === "custom" && (
                      <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                        <Label htmlFor="custom-days">Custom Days</Label>
                        <Input
                          id="custom-days"
                          type="number"
                          min="1"
                          max="90"
                          className="w-full sm:w-[200px]"
                          value={settings.remindersConfig.customReminderDays || ""}
                          onChange={(e) => {
                            handleSaveSettings({
                              remindersConfig: { ...settings.remindersConfig, customReminderDays: parseInt(e.target.value) || undefined }
                            });
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Reminder interval in days (1-90)
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Settings
                </CardTitle>
                <CardDescription>
                  Configure data export preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="export-format">Default Export Format</Label>
                  <Select
                    value={settings.exportSettings.defaultFormat}
                    onValueChange={(value) => {
                      handleSaveSettings({
                        exportSettings: { ...settings.exportSettings, defaultFormat: value }
                      });
                    }}
                  >
                    <SelectTrigger id="export-format" className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Default format when exporting data from tables
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-filters">Include Current Filters</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply active filters when exporting
                    </p>
                  </div>
                  <Switch
                    id="include-filters"
                    checked={settings.exportSettings.includeFilters}
                    onCheckedChange={(checked) => {
                      handleSaveSettings({
                        exportSettings: { ...settings.exportSettings, includeFilters: checked }
                      });
                    }}
                  />
                </div>

                <div className="p-4 border rounded-md bg-muted/50">
                  <h4 className="text-sm font-medium mb-2">Export Available For:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Cases List</li>
                    <li>✓ Customers List</li>
                    <li>✓ Reminders List</li>
                    <li>✓ Reports & Analytics</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DEFAULT VIEWS TAB */}
          <TabsContent value="views" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Default Filters & Views
                </CardTitle>
                <CardDescription>
                  Customize your default dashboard view
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="dashboard-filter">Default Dashboard Filter</Label>
                  <Select
                    value={settings.defaultViews.dashboardFilter}
                    onValueChange={(value) => {
                      handleSaveSettings({
                        defaultViews: { ...settings.defaultViews, dashboardFilter: value }
                      });
                    }}
                  >
                    <SelectTrigger id="dashboard-filter" className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cases</SelectItem>
                      <SelectItem value="open">Open Cases</SelectItem>
                      <SelectItem value="pending">Pending Cases</SelectItem>
                      <SelectItem value="closed">Closed Cases</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Cases shown when you first load the dashboard
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Visible Columns</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select which columns to display by default in case lists
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: "customerName", label: "Customer Name" },
                      { id: "status", label: "Status" },
                      { id: "assignedTo", label: "Assigned To" },
                      { id: "createdAt", label: "Created Date" },
                      { id: "priority", label: "Priority" },
                      { id: "store", label: "Store Location" },
                    ].map((column) => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={column.id}
                          checked={settings.defaultViews.defaultColumns.includes(column.id)}
                          onChange={(e) => {
                            const newColumns = e.target.checked
                              ? [...settings.defaultViews.defaultColumns, column.id]
                              : settings.defaultViews.defaultColumns.filter(c => c !== column.id);
                            handleSaveSettings({
                              defaultViews: { ...settings.defaultViews, defaultColumns: newColumns }
                            });
                          }}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={column.id} className="font-normal cursor-pointer">
                          {column.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Badge variant="outline" className="text-xs">
                  {settings.defaultViews.defaultColumns.length} columns selected
                </Badge>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USER PERMISSIONS TAB (Super Admin Only) */}
          {currentAdmin?.role === "superadmin" && (
            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    User Permissions Management
                  </CardTitle>
                  <CardDescription>
                    Control access and permissions for sub-admins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 border rounded-md bg-muted/50 text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-2">Advanced Permissions</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Role-based permissions are configured at the admin level.
                      Edit individual admin accounts to change their permissions.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/admins"}>
                      Manage Admin Accounts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* AUTO-STATUS RULES TAB */}
          <TabsContent value="autorules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automatic Status Rules
                </CardTitle>
                <CardDescription>
                  Automatically update case status based on inactivity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-status">Enable Auto-Status Rules</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically change status for inactive cases
                    </p>
                  </div>
                  <Switch
                    id="auto-status"
                    checked={settings.autoStatusRules.enabled}
                    onCheckedChange={(checked) => {
                      handleSaveSettings({
                        autoStatusRules: { ...settings.autoStatusRules, enabled: checked }
                      });
                    }}
                  />
                </div>

                {settings.autoStatusRules.enabled && (
                  <>
                    <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                      <Label htmlFor="inactivity-threshold">Inactivity Threshold (Days)</Label>
                      <Input
                        id="inactivity-threshold"
                        type="number"
                        min="1"
                        max="90"
                        className="w-full sm:w-[200px]"
                        value={settings.autoStatusRules.inactivityDays}
                        onChange={(e) => {
                          handleSaveSettings({
                            autoStatusRules: { ...settings.autoStatusRules, inactivityDays: parseInt(e.target.value) }
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Change status if case hasn't been updated for this many days
                      </p>
                    </div>

                    <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                      <Label htmlFor="target-status">Target Status</Label>
                      <Input
                        id="target-status"
                        className="w-full sm:w-[250px]"
                        value={settings.autoStatusRules.targetStatus}
                        onChange={(e) => {
                          handleSaveSettings({
                            autoStatusRules: { ...settings.autoStatusRules, targetStatus: e.target.value }
                          });
                        }}
                        placeholder="e.g., Pending Follow-Up"
                      />
                      <p className="text-xs text-muted-foreground">
                        The status to apply to inactive cases
                      </p>
                    </div>

                    <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950/20">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Note:</strong> Auto-status rules run daily at midnight.
                        Only open cases are affected.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREFERENCES TAB */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  System Preferences
                </CardTitle>
                <CardDescription>
                  Customize your regional and display settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Time Zone</Label>
                  <Select
                    value={settings.preferences.timezone}
                    onValueChange={(value) => {
                      handleSaveSettings({
                        preferences: { ...settings.preferences, timezone: value }
                      });
                    }}
                  >
                    <SelectTrigger id="timezone" className="w-full sm:w-[300px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="Asia/Karachi">Pakistan Standard Time (PKT)</SelectItem>
                      <SelectItem value="Asia/Dubai">Gulf Standard Time (GST)</SelectItem>
                      <SelectItem value="Europe/London">British Summer Time (BST)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All timestamps will be displayed in this timezone
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.preferences.language}
                    onValueChange={(value) => {
                      handleSaveSettings({
                        preferences: { ...settings.preferences, language: value }
                      });
                    }}
                  >
                    <SelectTrigger id="language" className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                      <SelectItem value="fr">Français (French)</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    System language (requires page reload)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select
                    value={settings.preferences.dateFormat}
                    onValueChange={(value) => {
                      handleSaveSettings({
                        preferences: { ...settings.preferences, dateFormat: value }
                      });
                    }}
                  >
                    <SelectTrigger id="date-format" className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How dates are displayed throughout the system
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
          <Button
            onClick={handleResetSettings}
            variant="outline"
            className="gap-2"
            disabled={resetSettingsMutation.isPending}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          
          <div className="sm:ml-auto flex gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="self-center">
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
