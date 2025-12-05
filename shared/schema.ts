import { z } from "zod";

// Admin Schema
export const adminSchema = z.object({
  _id: z.string(),
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
  role: z.enum(["superadmin", "subadmin"]),
  avatar: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertAdminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["superadmin", "subadmin"]),
  avatar: z.string().optional(),
});

export const updateAdminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  avatar: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  // If newPassword is provided, confirmPassword must match
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type Admin = z.infer<typeof adminSchema>;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type UpdateAdmin = z.infer<typeof updateAdminSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Customer Schema
export const customerSchema = z.object({
  _id: z.string(),
  customerId: z.string(), // CUST-1001 format
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  email: z.string().email(),
  notificationPreferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(), // Admin ID
});

export const insertCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Invalid email address"),
});

export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Product Case Schema
export const caseStatusEnum = z.enum([
  "New Case",
  "In Progress",
  "Awaiting Parts",
  "Repair Completed",
  "Shipped to Customer",
  "Closed"
]);

export const paymentStatusEnum = z.enum([
  "Pending",
  "Paid by Customer",
  "Under Warranty",
  "Company Covered"
]);

export const productCaseSchema = z.object({
  _id: z.string(),
  customerId: z.string(), // Reference to Customer
  modelNumber: z.string(),
  serialNumber: z.string(),
  purchasePlace: z.string(),
  dateOfPurchase: z.date(),
  receiptNumber: z.string(),
  status: caseStatusEnum,
  repairNeeded: z.string(),
  paymentStatus: paymentStatusEnum,
  shippingCost: z.number(),
  shippedDate: z.date().optional(),
  receivedDate: z.date().optional(),
  initialSummary: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(), // Admin ID
});

export const insertProductCaseSchema = z.object({
  customerId: z.string(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  purchasePlace: z.string().optional(),
  dateOfPurchase: z.string().optional(), // Will be converted to Date
  receiptNumber: z.string().optional(),
  status: caseStatusEnum.default("New Case"),

  // ✅ allow any length (even empty)
  repairNeeded: z.string().optional(),
  initialSummary: z.string().optional(),

  paymentStatus: paymentStatusEnum.default("Pending"),
  shippingCost: z.number().optional().default(0),
  shippedDate: z.string().optional(),
  receivedDate: z.string().optional(),
  isQuickCase: z.boolean().optional(), // Flag for quick cases with minimal info
});

// Quick Case Schema - Separate storage for incomplete cases
export const quickCaseStatusEnum = z.enum([
  "incomplete",
  "completed"
]);

export const quickCaseSchema = z.object({
  _id: z.string(),
  phone: z.string(), // Customer phone number
  notes: z.string().optional(), // Optional brief notes
  status: quickCaseStatusEnum, // "incomplete" or "completed"
  createdBy: z.string(), // Admin ID who created it
  createdByName: z.string(), // Admin name for display
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertQuickCaseSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
  notes: z.string().optional(),
});

export const updateProductCaseSchema = insertProductCaseSchema.partial();

export type ProductCase = z.infer<typeof productCaseSchema>;
export type InsertProductCase = z.infer<typeof insertProductCaseSchema>;
export type UpdateProductCase = z.infer<typeof updateProductCaseSchema>;
export type QuickCase = z.infer<typeof quickCaseSchema>;
export type InsertQuickCase = z.infer<typeof insertQuickCaseSchema>;
export type QuickCaseStatus = z.infer<typeof quickCaseStatusEnum>;
export type CaseStatus = z.infer<typeof caseStatusEnum>;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

// Interaction History Schema
export const interactionTypeEnum = z.enum([
  "case_created",
  "case_updated",
  "status_changed",
  "note_added",
  "case_deleted",
  "customer_created",
  "customer_updated",
  "customer_deleted",
]);

export const interactionHistorySchema = z.object({
  _id: z.string(),
  caseId: z.string().optional(), // Reference to ProductCase
  customerId: z.string().optional(), // Reference to Customer
  type: interactionTypeEnum,
  message: z.string(),
  adminId: z.string(), // Who made this interaction
  adminName: z.string(),
  adminAvatar: z.string().optional(),
  adminRole: z.enum(["superadmin", "subadmin"]),
  metadata: z.record(z.any()).optional(), // Additional data (old status, new status, etc.)
  createdAt: z.date(),
});

export const insertInteractionHistorySchema = z.object({
  caseId: z.string().optional(),
  customerId: z.string().optional(),
  type: interactionTypeEnum,
  message: z.string().min(1, "Message is required"),
  metadata: z.record(z.any()).optional(),
});

export type InteractionHistory = z.infer<typeof interactionHistorySchema>;
export type InsertInteractionHistory = z.infer<typeof insertInteractionHistorySchema>;
export type InteractionType = z.infer<typeof interactionTypeEnum>;

// Reminder Schema (Internal Team Reminders)
export const reminderPriorityEnum = z.enum([
  "Low",
  "Medium",
  "High",
  "Urgent"
]);

export const reminderStatusEnum = z.enum([
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled"
]);

export const reminderSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: reminderPriorityEnum,
  status: reminderStatusEnum,
  assignedTo: z.array(z.string()), // Array of Admin IDs (Sub Admins only)
  assignedToNames: z.array(z.string()), // For quick display
  assignedBy: z.string(), // Admin ID who created it (Super Admin)
  assignedByName: z.string(), // For quick display
  dueDate: z.date().optional(),
  relatedCaseId: z.string().optional(), // Optional link to a case
  isReadByAssignees: z.array(z.string()).optional(), // Assigned users who have viewed
  hasUnreadUpdate: z.boolean().optional(), // Super Admin has unread status update
  lastUpdatedBy: z.string().optional(), // Who last updated the status
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertReminderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  priority: reminderPriorityEnum.default("Medium"),
  assignedTo: z.array(z.string()).min(1, "Please select at least one team member"),
  dueDate: z.string().optional(), // Will be converted to Date
  relatedCaseId: z.string().optional(),
});

export const updateReminderSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  priority: reminderPriorityEnum.optional(),
  status: reminderStatusEnum.optional(),
  assignedTo: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
});

export type Reminder = z.infer<typeof reminderSchema>;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type UpdateReminder = z.infer<typeof updateReminderSchema>;
export type ReminderPriority = z.infer<typeof reminderPriorityEnum>;
export type ReminderStatus = z.infer<typeof reminderStatusEnum>;

// Settings Schema (System Configuration)
export const settingsSchema = z.object({
  _id: z.string(),
  // Notifications Settings
  notifications: z.object({
    emailEnabled: z.boolean().default(true),
    smsEnabled: z.boolean().default(false),
    inactivityAlertsEnabled: z.boolean().default(true),
    inactivityThresholdDays: z.number().min(1).max(30).default(7),
  }),

  // Reminders Configuration
  remindersConfig: z.object({
    autoRemindersEnabled: z.boolean().default(true),
    defaultReminderInterval: z.enum(["daily", "weekly", "custom"]).default("weekly"),
    customReminderDays: z.number().optional(),
  }),

  // Export Settings
  exportSettings: z.object({
    defaultFormat: z.enum(["excel", "pdf"]).default("excel"),
    includeFilters: z.boolean().default(true),
  }),

  // Default Filters & Views
  defaultViews: z.object({
    dashboardFilter: z.enum(["all", "open", "pending", "closed"]).default("open"),
    defaultColumns: z.array(z.string()).default(["customerName", "status", "assignedTo", "createdAt"]),
  }),

  // Auto-Status Rules
  autoStatusRules: z.object({
    enabled: z.boolean().default(false),
    inactivityDays: z.number().min(1).max(90).default(14),
    targetStatus: z.string().default("Pending Follow-Up"),
  }),

  // Preferences
  preferences: z.object({
    timezone: z.string().default("UTC"),
    language: z.enum(["en", "en-US", "en-GB", "ar", "fr", "he", "es", "de", "it", "pt", "zh", "ja", "hi"]).default("en"),
    dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  }),

  // User who owns these settings (null for global settings)
  userId: z.string().optional(),

  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const updateSettingsSchema = z.object({
  notifications: z.object({
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    inactivityAlertsEnabled: z.boolean().optional(),
    inactivityThresholdDays: z.number().min(1).max(30).optional(),
  }).optional(),

  remindersConfig: z.object({
    autoRemindersEnabled: z.boolean().optional(),
    defaultReminderInterval: z.enum(["daily", "weekly", "custom"]).optional(),
    customReminderDays: z.number().optional(),
  }).optional(),

  exportSettings: z.object({
    defaultFormat: z.enum(["excel", "pdf"]).optional(),
    includeFilters: z.boolean().optional(),
  }).optional(),

  defaultViews: z.object({
    dashboardFilter: z.enum(["all", "open", "pending", "closed"]).optional(),
    defaultColumns: z.array(z.string()).optional(),
  }).optional(),

  autoStatusRules: z.object({
    enabled: z.boolean().optional(),
    inactivityDays: z.number().min(1).max(90).optional(),
    targetStatus: z.string().optional(),
  }).optional(),

  preferences: z.object({
    timezone: z.string().optional(),
    language: z.enum(["en", "en-US", "en-GB", "ar", "fr", "he", "es", "de", "it", "pt", "zh", "ja", "hi"]).optional(),
    dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
  }).optional(),
});

export type Settings = z.infer<typeof settingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

// API Response Types
export type AuthResponse = {
  success: boolean;
  admin?: Omit<Admin, 'password'>;
  token?: string;
  message?: string;
};

export type CustomerWithCases = Customer & {
  cases: ProductCase[];
};

export type ProductCaseWithHistory = ProductCase & {
  customer: Customer;
  history: InteractionHistory[];
};
