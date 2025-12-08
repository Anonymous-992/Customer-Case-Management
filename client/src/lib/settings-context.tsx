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
        // Navigation & Main Menu
        dashboard: "Dashboard",
        customers: "Customers",
        reminders: "Reminders",
        reports: "Reports & Analytics",
        admins: "Admin Management",
        settings: "Settings",
        profile: "Profile",
        logout: "Logout",
        welcome: "Welcome",
        menu: "Menu",

        // Dashboard Stats
        "open_cases": "Open Cases",
        "pending_cases": "Pending Cases",
        "closed_cases": "Closed Cases",
        "total_customers": "Total Customers",

        // Case Related
        "case_id": "Case ID",
        "case_details": "Case Details",
        "case_status": "Case Status",
        "create_case": "Create Case",
        "create_new_case": "Create New Case",
        "quick_case": "Quick Case",
        "all_cases": "All Cases",
        "by_store": "by Store",
        "new_case": "New Case",
        "quick_cases": "Quick Cases",
        "store_wise_cases": "Store-wise Cases",

        // Customer Related
        "customer_info": "Customer Information",
        "customer_name": "Customer Name",
        "add_customer": "Add Customer",
        "add_new_customer": "Add New Customer",
        "create_customer_profile": "Create a new customer profile",
        "select_customer": "Select Customer",
        "no_customers": "No customers yet",
        "create_one_start": "Create one to get started",
        "customer_id": "Customer ID",

        // Product & Case Details
        "serial_number": "Serial Number",
        "model_number": "Model Number",
        "purchase_place": "Purchase Place",
        "receipt_number": "Receipt Number",
        "date_of_purchase": "Date of Purchase",
        "repair_needed": "Repair Needed",
        "initial_summary": "Initial Summary",

        // Status & Payment
        status: "Status",
        "payment_status": "Payment Status",
        "shipping_cost": "Shipping Cost",
        "new": "New",
        "pending": "Pending",
        "completed": "Completed",
        "in_progress": "In Progress",
        "cancelled": "Cancelled",
        "closed": "Closed",

        // Priority
        priority: "Priority",
        "high": "High",
        "medium": "Medium",
        "low": "Low",
        "urgent": "Urgent",

        // Contact Info
        "phone_number": "Phone Number",
        "email_address": "Email Address",
        "address": "Address",

        // Common Actions
        "save": "Save",
        "save_changes": "Save Changes",
        "cancel": "Cancel",
        "create": "Create",
        "edit": "Edit",
        "delete": "Delete",
        "search": "Search",
        "export": "Export",
        "import": "Import",
        "filter": "Filter",
        "view": "View",
        "close": "Close",
        "submit": "Submit",
        "confirm": "Confirm",
        "back": "Back",
        "next": "Next",
        "finish": "Finish",

        // View Controls
        "expand": "Expand",
        "collapse": "Collapse",
        "show_more": "Show More",
        "show_less": "Show Less",
        "click_to": "Click to",
        "view_all": "View All",

        // Export
        "export_excel": "Export to Excel",
        "export_pdf": "Export to PDF",
        "export_settings": "Export Settings",
        "configure_export": "Configure data export preferences",
        "default_export_format": "Default Export Format",
        "include_filters": "Include Current Filters",
        "apply_active_filters": "Apply active filters when exporting",
        "export_available": "Export Available For:",

        // Lists
        "cases_list": "Cases List",
        "customers_list": "Customers List",
        "reminders_list": "Reminders List",
        "reports_analytics": "Reports & Analytics",

        // Data & Messages
        "no_data": "No data available",
        "no_results": "No results found",
        "loading": "Loading...",
        "creating": "Creating...",
        "saving": "Saving...",
        "updating": "Updating...",
        "deleting": "Deleting...",
        "processing": "Processing...",

        // Search & Filter
        "search_placeholder": "Search...",
        "search_by_name_email": "Search by name, email, phone, or Customer ID...",
        "filter_by": "Filter by",
        "all": "All",

        // Dates & Time
        "created": "Created",
        "updated": "Updated",
        "created_at": "Created",
        "due_date": "Due Date",
        "due": "Due",
        "overdue": "OVERDUE",
        "date_format": "Date Format",
        "date_display": "How dates are displayed throughout the system",

        // Form Fields
        "title": "Title",
        "description": "Description",
        "optional": "Optional",
        "required": "Required",

        // Assignment
        "assigned_by": "Assigned By",
        "assigned_to": "Assigned To",
        "assign_to": "Assign To",

        // Authentication
        "sign_in": "Sign In",
        "signing_in": "Signing in...",
        "username": "Username",
        "password": "Password",
        "enter_username": "Enter your username",
        "enter_password": "Enter your password",
        "customer_case_management": "Customer Case Management",
        "sign_in_access": "Sign in to access the admin dashboard",

        // Profile
        "profile_info": "Profile Information",
        "update_personal_info": "Update your personal information and credentials",
        "full_name": "Full Name",
        "avatar_url": "Avatar URL (optional)",
        "new_password": "New Password (optional)",
        "confirm_password": "Confirm New Password",
        "leave_blank": "Leave blank to keep current",
        "min_6_chars": "Min 6 characters",
        "must_match": "Must match new password",
        "password_change_note": "Leave password fields blank if you don't want to change your password. Only fill them if you want to set a new password.",

        // Errors & Notifications
        "page_not_found": "Page Not Found",
        "page_not_exist": "The page you're looking for doesn't exist or has been moved.",
        "go_back": "Go Back",
        "go_home": "Go Home",
        "error": "Error",
        "success": "Success",
        "warning": "Warning",
        "info": "Info",

        // Settings
        "language": "Language",
        "system_language": "System language (requires page reload)",
        "reset_defaults": "Reset to Defaults",
        "unsaved_changes": "Unsaved changes",
        "preferences": "Preferences",

        // Reminders
        "team_reminders": "Team Reminders",
        "new_reminder": "New Reminder",
        "create_reminder": "Create Reminder",
        "create_team_reminder": "Create Team Reminder",
        "assign_task": "Assign a task or reminder to team members",
        "provide_details": "Provide details...",
        "all_members": "All Members",
        "no_subadmins": "No subadmins available",
        "members_selected": "members selected",
        "no_reminders": "No Reminders Found",
        "create_reminder_start": "Create a reminder to get started",
        "no_reminders_assigned": "You have no reminders assigned",
        "delete_reminder": "Delete Reminder",
        "delete_confirmation": "Are you sure you want to delete this reminder? This action cannot be undone.",
        "update_status": "Update Status",
        "mark_pending": "Mark as Pending",
        "mark_progress": "Mark In Progress",
        "mark_completed": "Mark Completed",
        "mark_cancelled": "Cancel",
        "from": "From",
        "to": "To",

        // Additional UI Elements
        store: "Store",
        actions: "Actions",
        "missing_info": "Missing Information",
        "checking_phone": "Checking phone number...",
        "checking_serial": "Checking serial number...",
        "phone_exists": "Phone number already exists",
        "serial_exists": "Serial number already exists",
        "create_customer": "Create Customer",
        "no_data_export": "No data to export",
        "exported_successfully": "Exported successfully",
        "send_notification": "Send Notification",
        "notification_question": "Would you like to send an email notification?",
        "yes_send": "Yes, Send",
        "no_dont_send": "No, Don't Send",
      },
      "en-US": {
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
        status: "Status",
        "created_at": "Created",
        store: "Store",
        actions: "Actions",
        "export_excel": "Export to Excel",
        "export_pdf": "Export to PDF",
        "no_data": "No data available",
        loading: "Loading...",
      },
      "en-GB": {
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
        status: "Status",
        "created_at": "Created",
        store: "Store",
        actions: "Actions",
        "export_excel": "Export to Excel",
        "export_pdf": "Export to PDF",
        "no_data": "No data available",
        loading: "Loading...",
      },
      ar: {
        // القائمة الرئيسية
        dashboard: "لوحة القيادة",
        customers: "العملاء",
        reminders: "التذكيرات",
        reports: "التقارير والتحليلات",
        admins: "إدارة المسؤولين",
        settings: "الإعدادات",
        profile: "الملف الشخصي",
        logout: "تسجيل الخروج",
        welcome: "مرحباً",
        menu: "القائمة",

        // إحصائيات لوحة القيادة
        "open_cases": "الحالات المفتوحة",
        "pending_cases": "الحالات المعلقة",
        "closed_cases": "الحالات المغلقة",
        "total_customers": "إجمالي العملاء",

        // الحالات
        "case_id": "رقم الحالة",
        "case_details": "تفاصيل الحالة",
        "case_status": "حالة القضية",
        "create_case": "إنشاء حالة",
        "create_new_case": "إنشاء حالة جديدة",
        "quick_case": "حالة سريعة",
        "all_cases": "جميع الحالات",
        "by_store": "حسب المتجر",
        "new_case": "حالة جديدة",
        "quick_cases": "حالات سريعة",
        "store_wise_cases": "حالات حسب المتجر",

        // العملاء
        "customer_info": "معلومات العميل",
        "customer_name": "اسم العميل",
        "add_customer": "إضافة عميل",
        "add_new_customer": "إضافة عميل جديد",
        "create_customer_profile": "إنشاء ملف تعريف عميل جديد",
        "select_customer": "اختر العميل",
        "no_customers": "لا يوجد عملاء بعد",
        "create_one_start": "قم بإنشاء واحد للبدء",
        "customer_id": "رقم العميل",

        // تفاصيل المنتج والحالة
        "serial_number": "الرقم التسلسلي",
        "model_number": "رقم الموديل",
        "purchase_place": "مكان الشراء",
        "receipt_number": "رقم الإيصال",
        "date_of_purchase": "تاريخ الشراء",
        "repair_needed": "الإصلاح المطلوب",
        "initial_summary": "الملخص الأولي",

        // الحالة والدفع
        status: "الحالة",
        "payment_status": "حالة الدفع",
        "shipping_cost": "تكلفة الشحن",
        "new": "جديد",
        "pending": "معلق",
        "completed": "مكتمل",
        "in_progress": "قيد التنفيذ",
        "cancelled": "ملغى",
        "closed": "مغلق",

        // الأولوية
        priority: "الأولوية",
        "high": "عالية",
        "medium": "متوسطة",
        "low": "منخفضة",
        "urgent": "عاجلة",

        // معلومات الاتصال
        "phone_number": "رقم الهاتف",
        "email_address": "عنوان البريد الإلكتروني",
        "address": "العنوان",

        // الإجراءات العامة
        "save": "حفظ",
        "save_changes": "حفظ التغييرات",
        "cancel": "إلغاء",
        "create": "إنشاء",
        "edit": "تعديل",
        "delete": "حذف",
        "search": "بحث",
        "export": "تصدير",
        "import": "استيراد",
        "filter": "تصفية",
        "view": "عرض",
        "close": "إغلاق",
        "submit": "إرسال",
        "confirm": "تأكيد",
        "back": "رجوع",
        "next": "التالي",
        "finish": "إنهاء",

        // عناصر التحكم
        "expand": "توسيع",
        "collapse": "طي",
        "show_more": "عرض المزيد",
        "show_less": "عرض أقل",
        "click_to": "انقر على",
        "view_all": "عرض الكل",

        // التصدير
        "export_excel": "تصدير إلى Excel",
        "export_pdf": "تصدير إلى PDF",
        "export_settings": "إعدادات التصدير",
        "configure_export": "تكوين تفضيلات تصدير البيانات",
        "default_export_format": "تنسيق التصدير الافتراضي",
        "include_filters": "تضمين الفلاتر الحالية",
        "apply_active_filters": "تطبيق الفلاتر النشطة عند التصدير",
        "export_available": "التصدير متاح لـ:",

        // القوائم
        "cases_list": "قائمة الحالات",
        "customers_list": "قائمة العملاء",
        "reminders_list": "قائمة التذكيرات",
        "reports_analytics": "التقارير والتحليلات",

        // البيانات والرسائل
        "no_data": "لا توجد بيانات",
        "no_results": "لا توجد نتائج",
        "loading": "جار التحميل...",
        "creating": "جار الإنشاء...",
        "saving": "جار الحفظ...",
        "updating": "جار التحديث...",
        "deleting": "جار الحذف...",
        "processing": "جار المعالجة...",

        // البحث والتصفية
        "search_placeholder": "بحث...",
        "search_by_name_email": "البحث حسب الاسم أو البريد الإلكتروني أو الهاتف أو رقم العميل...",
        "filter_by": "تصفية حسب",
        "all": "الكل",

        // التواريخ والوقت
        "created": "تم الإنشاء",
        "updated": "تم التحديث",
        "created_at": "تاريخ الإنشاء",
        "due_date": "تاريخ الاستحقاق",
        "due": "مستحق",
        "overdue": "متأخر",
        "date_format": "تنسيق التاريخ",
        "date_display": "كيفية عرض التواريخ في النظام",

        // حقول النموذج
        "title": "العنوان",
        "description": "الوصف",
        "optional": "اختياري",
        "required": "مطلوب",

        // التعيين
        "assigned_by": "تم التعيين بواسطة",
        "assigned_to": "مُعيَّن إلى",
        "assign_to": "تعيين إلى",

        // المصادقة
        "sign_in": "تسجيل الدخول",
        "signing_in": "جار تسجيل الدخول...",
        "username": "اسم المستخدم",
        "password": "كلمة المرور",
        "enter_username": "أدخل اسم المستخدم",
        "enter_password": "أدخل كلمة المرور",
        "customer_case_management": "نظام إدارة حالات العملاء",
        "sign_in_access": "سجل الدخول للوصول إلى لوحة التحكم",

        // الملف الشخصي
        "profile_info": "معلومات الملف الشخصي",
        "update_personal_info": "تحديث معلوماتك الشخصية وبيانات الاعتماد",
        "full_name": "الاسم الكامل",
        "avatar_url": "رابط الصورة الشخصية (اختياري)",
        "new_password": "كلمة المرور الجديدة (اختياري)",
        "confirm_password": "تأكيد كلمة المرور الجديدة",
        "leave_blank": "اتركه فارغاً للإبقاء على الحالي",
        "min_6_chars": "6 أحرف على الأقل",
        "must_match": "يجب أن تتطابق مع كلمة المرور الجديدة",
        "password_change_note": "اترك حقول كلمة المرور فارغة إذا كنت لا تريد تغيير كلمة المرور الخاصة بك.",

        // الأخطاء والإشعارات
        "page_not_found": "الصفحة غير موجودة",
        "page_not_exist": "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
        "go_back": "العودة",
        "go_home": "الذهاب للرئيسية",
        "error": "خطأ",
        "success": "نجح",
        "warning": "تحذير",
        "info": "معلومات",

        // الإعدادات
        "language": "اللغة",
        "system_language": "لغة النظام (يتطلب إعادة تحميل الصفحة)",
        "reset_defaults": "إعادة تعيين إلى الافتراضي",
        "unsaved_changes": "تغييرات غير محفوظة",
        "preferences": "التفضيلات",

        // التذكيرات
        "team_reminders": "تذكيرات الفريق",
        "new_reminder": "تذكير جديد",
        "create_reminder": "إنشاء تذكير",
        "create_team_reminder": "إنشاء تذكير للفريق",
        "assign_task": "تعيين مهمة أو تذكير لأعضاء الفريق",
        "provide_details": "قدم التفاصيل...",
        "all_members": "جميع الأعضاء",
        "no_subadmins": "لا يوجد مسؤولون فرعيون متاحون",
        "members_selected": "الأعضاء المحددون",
        "no_reminders": "لا توجد تذكيرات",
        "create_reminder_start": "قم بإنشاء تذكير للبدء",
        "no_reminders_assigned": "ليس لديك تذكيرات معينة",
        "delete_reminder": "حذف التذكير",
        "delete_confirmation": "هل أنت متأكد أنك تريد حذف هذا التذكير؟ لا يمكن التراجع عن هذا الإجراء.",
        "update_status": "تحديث الحالة",
        "mark_pending": "وضع علامة كمعلق",
        "mark_progress": "وضع علامة قيد التنفيذ",
        "mark_completed": "وضع علامة مكتمل",
        "mark_cancelled": "إلغاء",
        "from": "من",
        "to": "إلى",

        // عناصر واجهة المستخدم الإضافية
        store: "المتجر",
        actions: "الإجراءات",
        "missing_info": "معلومات مفقودة",
        "checking_phone": "جار التحقق من رقم الهاتف...",
        "checking_serial": "جار التحقق من الرقم التسلسلي...",
        "phone_exists": "رقم الهاتف موجود بالفعل",
        "serial_exists": "الرقم التسلسلي موجود بالفعل",
        "create_customer": "إنشاء عميل",
        "no_data_export": "لا توجد بيانات للتصدير",
        "exported_successfully": "تم التصدير بنجاح",
        "send_notification": "إرسال إشعار",
        "notification_question": "هل ترغب في إرسال إشعار عبر البريد الإلكتروني؟",
        "yes_send": "نعم، أرسل",
        "no_dont_send": "لا، لا ترسل",
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
      he: {
        dashboard: "לוח בקרה",
        customers: "לקוחות",
        reminders: "תזכורות",
        reports: "דוחות וניתוחים",
        admins: "ניהול מנהלים",
        settings: "הגדרות",
        profile: "פרופיל",
        logout: "התנתק",
        welcome: "ברוך הבא",
        "open_cases": "תיקים פתוחים",
        "pending_cases": "תיקים ממתינים",
        "closed_cases": "תיקים סגורים",
        "total_customers": "סך הלקוחות",
        "case_id": "מזהה תיק",
        "customer_name": "שם הלקוח",
        status: "סטטוס",
        "assigned_to": "מוקצה ל",
        "created_at": "נוצר",
        priority: "עדיפות",
        store: "חנות",
        actions: "פעולות",
        "export_excel": "ייצא ל-Excel",
        "export_pdf": "ייצא ל-PDF",
        "no_data": "אין נתונים זמינים",
        loading: "טוען...",
      },
      es: {
        dashboard: "Panel de control",
        customers: "Clientes",
        reminders: "Recordatorios",
        reports: "Informes y análisis",
        admins: "Gestión de administradores",
        settings: "Configuración",
        profile: "Perfil",
        logout: "Cerrar sesión",
        welcome: "Bienvenido",
        "open_cases": "Casos abiertos",
        "pending_cases": "Casos pendientes",
        "closed_cases": "Casos cerrados",
        "total_customers": "Total de clientes",
        "case_id": "ID del caso",
        "customer_name": "Nombre del cliente",
        status: "Estado",
        "assigned_to": "Asignado a",
        "created_at": "Creado",
        priority: "Prioridad",
        store: "Tienda",
        actions: "Acciones",
        "export_excel": "Exportar a Excel",
        "export_pdf": "Exportar a PDF",
        "no_data": "No hay datos disponibles",
        loading: "Cargando...",
      },
      de: {
        dashboard: "Dashboard",
        customers: "Kunden",
        reminders: "Erinnerungen",
        reports: "Berichte & Analysen",
        admins: "Admin-Verwaltung",
        settings: "Einstellungen",
        profile: "Profil",
        logout: "Abmelden",
        welcome: "Willkommen",
        "open_cases": "Offene Fälle",
        "pending_cases": "Ausstehende Fälle",
        "closed_cases": "Geschlossene Fälle",
        "total_customers": "Gesamtkunden",
        "case_id": "Fall-ID",
        "customer_name": "Kundenname",
        status: "Status",
        "assigned_to": "Zugewiesen an",
        "created_at": "Erstellt",
        priority: "Priorität",
        store: "Geschäft",
        actions: "Aktionen",
        "export_excel": "Nach Excel exportieren",
        "export_pdf": "Nach PDF exportieren",
        "no_data": "Keine Daten verfügbar",
        loading: "Laden...",
      },
      it: {
        dashboard: "Dashboard",
        customers: "Clienti",
        reminders: "Promemoria",
        reports: "Report e analisi",
        admins: "Gestione amministratori",
        settings: "Impostazioni",
        profile: "Profilo",
        logout: "Disconnetti",
        welcome: "Benvenuto",
        "open_cases": "Casi aperti",
        "pending_cases": "Casi in sospeso",
        "closed_cases": "Casi chiusi",
        "total_customers": "Clienti totali",
        "case_id": "ID caso",
        "customer_name": "Nome cliente",
        status: "Stato",
        "assigned_to": "Assegnato a",
        "created_at": "Creato",
        priority: "Priorità",
        store: "Negozio",
        actions: "Azioni",
        "export_excel": "Esporta in Excel",
        "export_pdf": "Esporta in PDF",
        "no_data": "Nessun dato disponibile",
        loading: "Caricamento...",
      },
      pt: {
        dashboard: "Painel",
        customers: "Clientes",
        reminders: "Lembretes",
        reports: "Relatórios e análises",
        admins: "Gestão de administradores",
        settings: "Configurações",
        profile: "Perfil",
        logout: "Sair",
        welcome: "Bem-vindo",
        "open_cases": "Casos abertos",
        "pending_cases": "Casos pendentes",
        "closed_cases": "Casos fechados",
        "total_customers": "Total de clientes",
        "case_id": "ID do caso",
        "customer_name": "Nome do cliente",
        status: "Status",
        "assigned_to": "Atribuído a",
        "created_at": "Criado",
        priority: "Prioridade",
        store: "Loja",
        actions: "Ações",
        "export_excel": "Exportar para Excel",
        "export_pdf": "Exportar para PDF",
        "no_data": "Nenhum dado disponível",
        loading: "Carregando...",
      },
      zh: {
        dashboard: "仪表板",
        customers: "客户",
        reminders: "提醒",
        reports: "报告与分析",
        admins: "管理员管理",
        settings: "设置",
        profile: "个人资料",
        logout: "登出",
        welcome: "欢迎",
        "open_cases": "开放案例",
        "pending_cases": "待处理案例",
        "closed_cases": "已关闭案例",
        "total_customers": "客户总数",
        "case_id": "案例ID",
        "customer_name": "客户姓名",
        status: "状态",
        "assigned_to": "分配给",
        "created_at": "创建时间",
        priority: "优先级",
        store: "商店",
        actions: "操作",
        "export_excel": "导出到Excel",
        "export_pdf": "导出到PDF",
        "no_data": "无可用数据",
        loading: "加载中...",
      },
      ja: {
        dashboard: "ダッシュボード",
        customers: "顧客",
        reminders: "リマインダー",
        reports: "レポートと分析",
        admins: "管理者管理",
        settings: "設定",
        profile: "プロフィール",
        logout: "ログアウト",
        welcome: "ようこそ",
        "open_cases": "オープンケース",
        "pending_cases": "保留中のケース",
        "closed_cases": "クローズドケース",
        "total_customers": "総顧客数",
        "case_id": "ケースID",
        "customer_name": "顧客名",
        status: "ステータス",
        "assigned_to": "担当者",
        "created_at": "作成日",
        priority: "優先度",
        store: "店舗",
        actions: "アクション",
        "export_excel": "Excelにエクスポート",
        "export_pdf": "PDFにエクスポート",
        "no_data": "利用可能なデータがありません",
        loading: "読み込み中...",
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
