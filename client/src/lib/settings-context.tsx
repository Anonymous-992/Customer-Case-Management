import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Settings } from "@shared/schema";
import { format as formatDateFns, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface SettingsContextType {
  settings: Settings | null;
  isLoading: boolean;
  formatDate: (date: Date | string, formatStr?: string) => string;
  formatDateTime: (date: Date | string) => string;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['/api/settings'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Format date according to user's preference
  const formatDate = (date: Date | string, customFormat?: string) => {
    if (!date) return "";
    
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    const timezone = settings?.preferences.timezone || "UTC";
    const dateFormat = customFormat || settings?.preferences.dateFormat || "DD/MM/YYYY";
    
    // Convert to user's timezone
    const zonedDate = toZonedTime(dateObj, timezone);
    
    // Map our format strings to date-fns format strings
    const formatMap: Record<string, string> = {
      "DD/MM/YYYY": "dd/MM/yyyy",
      "MM/DD/YYYY": "MM/dd/yyyy",
      "YYYY-MM-DD": "yyyy-MM-dd",
    };
    
    const fnsFormat = formatMap[dateFormat] || "dd/MM/yyyy";
    return formatDateFns(zonedDate, fnsFormat);
  };

  // Format date and time according to user's preference
  const formatDateTime = (date: Date | string) => {
    if (!date) return "";
    
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    const timezone = settings?.preferences.timezone || "UTC";
    const dateFormat = settings?.preferences.dateFormat || "DD/MM/YYYY";
    
    const zonedDate = toZonedTime(dateObj, timezone);
    
    const formatMap: Record<string, string> = {
      "DD/MM/YYYY": "dd/MM/yyyy HH:mm",
      "MM/DD/YYYY": "MM/dd/yyyy hh:mm a",
      "YYYY-MM-DD": "yyyy-MM-dd HH:mm",
    };
    
    const fnsFormat = formatMap[dateFormat] || "dd/MM/yyyy HH:mm";
    return formatDateFns(zonedDate, fnsFormat);
  };

  // Basic translation function (can be expanded with actual i18n library)
  const t = (key: string): string => {
    const language = settings?.preferences.language || "en";
    
    // Translation dictionary
    const translations: Record<string, Record<string, string>> = {
      en: {
        dashboard: "Dashboard",
        customers: "Customers",
        reminders: "Reminders",
        reports: "Reports & Analytics",
        admins: "Admin Management",
        settings: "Settings",
        profile: "Profile",
        logout: "Logout",
        welcome: "Welcome",
        "open_cases": "Open Cases",
        "pending_cases": "Pending Cases",
        "closed_cases": "Closed Cases",
        "total_customers": "Total Customers",
        "case_id": "Case ID",
        "customer_name": "Customer Name",
        status: "Status",
        "assigned_to": "Assigned To",
        "created_at": "Created",
        priority: "Priority",
        store: "Store",
        actions: "Actions",
        "export_excel": "Export to Excel",
        "export_pdf": "Export to PDF",
        "no_data": "No data available",
        loading: "Loading...",
      },
      ar: {
        dashboard: "لوحة القيادة",
        customers: "العملاء",
        reminders: "التذكيرات",
        reports: "التقارير والتحليلات",
        admins: "إدارة المسؤولين",
        settings: "الإعدادات",
        profile: "الملف الشخصي",
        logout: "تسجيل الخروج",
        welcome: "مرحبا",
        "open_cases": "الحالات المفتوحة",
        "pending_cases": "الحالات المعلقة",
        "closed_cases": "الحالات المغلقة",
        "total_customers": "إجمالي العملاء",
        "case_id": "رقم الحالة",
        "customer_name": "اسم العميل",
        status: "الحالة",
        "assigned_to": "مسند إلى",
        "created_at": "تاريخ الإنشاء",
        priority: "الأولوية",
        store: "المتجر",
        actions: "الإجراءات",
        "export_excel": "تصدير إلى Excel",
        "export_pdf": "تصدير إلى PDF",
        "no_data": "لا توجد بيانات",
        loading: "جار التحميل...",
      },
      fr: {
        dashboard: "Tableau de bord",
        customers: "Clients",
        reminders: "Rappels",
        reports: "Rapports et analyses",
        admins: "Gestion des administrateurs",
        settings: "Paramètres",
        profile: "Profil",
        logout: "Déconnexion",
        welcome: "Bienvenue",
        "open_cases": "Cas ouverts",
        "pending_cases": "Cas en attente",
        "closed_cases": "Cas fermés",
        "total_customers": "Total des clients",
        "case_id": "ID du cas",
        "customer_name": "Nom du client",
        status: "Statut",
        "assigned_to": "Assigné à",
        "created_at": "Créé le",
        priority: "Priorité",
        store: "Magasin",
        actions: "Actions",
        "export_excel": "Exporter vers Excel",
        "export_pdf": "Exporter vers PDF",
        "no_data": "Aucune donnée disponible",
        loading: "Chargement...",
      },
      hi: {
        dashboard: "डैशबोर्ड",
        customers: "ग्राहक",
        reminders: "अनुस्मारक",
        reports: "रिपोर्ट और विश्लेषण",
        admins: "व्यवस्थापक प्रबंधन",
        settings: "सेटिंग्स",
        profile: "प्रोफ़ाइल",
        logout: "लॉग आउट",
        welcome: "स्वागत है",
        "open_cases": "खुले मामले",
        "pending_cases": "लंबित मामले",
        "closed_cases": "बंद मामले",
        "total_customers": "कुल ग्राहक",
        "case_id": "केस आईडी",
        "customer_name": "ग्राहक का नाम",
        status: "स्थिति",
        "assigned_to": "को सौंपा गया",
        "created_at": "बनाया गया",
        priority: "प्राथमिकता",
        store: "स्टोर",
        actions: "क्रियाएँ",
        "export_excel": "Excel में निर्यात करें",
        "export_pdf": "PDF में निर्यात करें",
        "no_data": "कोई डेटा उपलब्ध नहीं",
        loading: "लोड हो रहा है...",
      },
    };
    
    return translations[language]?.[key] || key;
  };

  const value: SettingsContextType = {
    settings: settings || null,
    isLoading,
    formatDate,
    formatDateTime,
    t,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
