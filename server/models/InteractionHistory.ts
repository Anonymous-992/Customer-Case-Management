import mongoose, { Schema, Document } from 'mongoose';

export interface IInteractionHistory extends Document {
  caseId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  type: 'case_created' | 'case_updated' | 'status_changed' | 'note_added' | 'case_deleted' | 'customer_created' | 'customer_updated' | 'customer_deleted';
  message: string;
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  adminAvatar?: string;
  adminRole: 'superadmin' | 'subadmin';
  metadata?: Record<string, any>;
  createdAt: Date;
}

const InteractionHistorySchema = new Schema<IInteractionHistory>({
  caseId: {
    type: Schema.Types.ObjectId,
    ref: 'ProductCase',
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
  },
  type: {
    type: String,
    enum: ['case_created', 'case_updated', 'status_changed', 'note_added', 'case_deleted', 'customer_created', 'customer_updated', 'customer_deleted'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  adminName: {
    type: String,
    required: true,
  },
  adminAvatar: {
    type: String,
  },
  adminRole: {
    type: String,
    enum: ['superadmin', 'subadmin'],
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Index for efficient querying
InteractionHistorySchema.index({ caseId: 1, createdAt: -1 });
InteractionHistorySchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.model<IInteractionHistory>('InteractionHistory', InteractionHistorySchema);
