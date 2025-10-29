import mongoose, { Schema, Document } from 'mongoose';

export interface IProductCase extends Document {
  customerId: mongoose.Types.ObjectId;
  modelNumber: string;
  serialNumber: string;
  purchasePlace: string;
  dateOfPurchase: Date;
  receiptNumber: string;
  status: 'New Case' | 'In Progress' | 'Awaiting Parts' | 'Repair Completed' | 'Shipped to Customer' | 'Closed';
  repairNeeded: string;
  paymentStatus: 'Pending' | 'Paid by Customer' | 'Under Warranty' | 'Company Covered';
  shippingCost: number;
  shippedDate?: Date;
  receivedDate?: Date;
  initialSummary: string;
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
    required: true,
    trim: true,
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true,
  },
  purchasePlace: {
    type: String,
    required: true,
    trim: true,
  },
  dateOfPurchase: {
    type: Date,
    required: true,
  },
  receiptNumber: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['New Case', 'In Progress', 'Awaiting Parts', 'Repair Completed', 'Shipped to Customer', 'Closed'],
    default: 'New Case',
  },
  repairNeeded: {
    type: String,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid by Customer', 'Under Warranty', 'Company Covered'],
    default: 'Pending',
  },
  shippingCost: {
    type: Number,
    required: true,
    default: 0,
  },
  shippedDate: {
    type: Date,
  },
  receivedDate: {
    type: Date,
  },
  initialSummary: {
    type: String,
    required: true,
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
