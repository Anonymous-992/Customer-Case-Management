import mongoose, { Schema, Document } from 'mongoose';

export interface IProductCase extends Document {
  customerId: mongoose.Types.ObjectId;
  modelNumber?: string;
  serialNumber?: string;
  purchasePlace?: string;
  dateOfPurchase?: Date;
  receiptNumber?: string;
  status: 'New Case' | 'In Progress' | 'Awaiting Parts' | 'Repair Completed' | 'Shipped to Customer' | 'Closed';
  repairNeeded?: string;
  paymentStatus: 'Pending' | 'Paid by Customer' | 'Under Warranty' | 'Company Covered';
  payment?: string;
  shippingCost: number;
  shippedDate?: Date;
  receivedDate?: Date;
  carrierCompany?: string;
  trackingNumber?: string;
  initialSummary?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductCaseSchema = new Schema<IProductCase>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  modelNumber: {
    type: String,
    required: false,
    trim: true,
    default: '',
  },
  serialNumber: {
    type: String,
    required: false,
    trim: true,
    default: '',
  },
  purchasePlace: {
    type: String,
    required: false,
    trim: true,
    default: '',
  },
  dateOfPurchase: {
    type: Date,
    required: false,
  },
  receiptNumber: {
    type: String,
    required: false,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['New Case', 'In Progress', 'Awaiting Parts', 'Repair Completed', 'Shipped to Customer', 'Closed'],
    default: 'New Case',
    required: true,
  },
  repairNeeded: {
    type: String,
    required: false,
    default: '',
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid by Customer', 'Under Warranty', 'Company Covered'],
    default: 'Pending',
    required: true,
  },
  payment: {
    type: String,
    required: false,
    trim: true,
    default: '',
  },
  shippingCost: {
    type: Number,
    required: true,
    default: 0,
  },
  shippedDate: {
    type: Date,
    required: false,
  },
  receivedDate: {
    type: Date,
    required: false,
  },
  carrierCompany: {
    type: String,
    required: false,
    default: '',
  },
  trackingNumber: {
    type: String,
    required: false,
    default: '',
  },
  initialSummary: {
    type: String,
    required: false,
    default: '',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model<IProductCase>('ProductCase', ProductCaseSchema);
