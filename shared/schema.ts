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
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  avatar: z.string().optional(),
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
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(), // Admin ID
});

export const insertCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
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
  modelNumber: z.string().min(1, "Model number is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  purchasePlace: z.string().min(1, "Purchase place is required"),
  dateOfPurchase: z.string(), // Will be converted to Date
  receiptNumber: z.string().min(1, "Receipt number is required"),
  status: caseStatusEnum,

  // ✅ allow any length (even empty)
  repairNeeded: z.string().optional(),
  initialSummary: z.string().optional(),

  paymentStatus: paymentStatusEnum,
  shippingCost: z.number().min(0, "Shipping cost must be positive"),
  shippedDate: z.string().optional(),
  receivedDate: z.string().optional(),
});


export const updateProductCaseSchema = insertProductCaseSchema.partial();

export type ProductCase = z.infer<typeof productCaseSchema>;
export type InsertProductCase = z.infer<typeof insertProductCaseSchema>;
export type UpdateProductCase = z.infer<typeof updateProductCaseSchema>;
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
