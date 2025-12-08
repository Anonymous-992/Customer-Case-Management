import { Users, UserCircle, LogOut, LayoutDashboard, Settings, Settings2, BarChart3, Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/lib/settings-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const { admin, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useSettings();

  // Get unread reminder count
  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ['/api/reminders/unread-count'],
    enabled: !!admin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const menuItems = [
    {
      titleKey: "dashboard",
      url: "/",
      icon: LayoutDashboard,
      testId: "link-dashboard",
    },
    {
      titleKey: "customers",
      url: "/customers",
      icon: Users,
      testId: "link-customers",
    },
    {
      titleKey: "reminders",
      url: "/reminders",
      icon: Bell,
      testId: "link-reminders",
      badge: unreadCount?.count,
    },
    ...(admin?.role === 'superadmin' ? [{
      titleKey: "reports",
      url: "/reports",
      icon: BarChart3,
      testId: "link-reports",
    }] : []),
    ...(admin?.role === 'superadmin' ? [{
      titleKey: "admins",
      url: "/admins",
      icon: Settings,
      testId: "link-admins",
    }] : []),
    {
      titleKey: "settings",
      url: "/settings",
      icon: Settings2,
      testId: "link-settings",
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Company Logo"
                className="h-6 sm:h-8 w-auto max-w-[100px] sm:max-w-[120px] object-contain"
                onError={(e) => {
                  // Fallback to text if logo fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden">
                <h2 className="text-lg font-semibold text-sidebar-foreground">CMS</h2>
                <p className="text-xs text-muted-foreground">Case Management</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("customer_case_management")}</p>
          </div>
          <SidebarGroupLabel>{t("menu")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={item.testId} className="relative">
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                      {'badge' in item && item.badge && item.badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-semibold rounded-full animate-pulse"
                        >
                          {item.badge > 9 ? '9+' : item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={admin?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {admin ? getInitials(admin.name) : 'AD'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {admin?.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {admin?.role}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
            data-testid="link-profile"
          >
            <Link href="/profile">
              <UserCircle className="h-4 w-4 mr-1" />
              {t("profile")}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            data-testid="button-logout"
            title={t("logout")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
