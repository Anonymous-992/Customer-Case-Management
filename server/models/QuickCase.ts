import mongoose, { Schema, Document } from 'mongoose';

export interface IQuickCase extends Document {
  phone: string;
  notes?: string;
  status: 'incomplete' | 'completed';
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuickCaseSchema = new Schema<IQuickCase>({
  phone: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 15,
  },
  notes: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['incomplete', 'completed'],
    default: 'incomplete',
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  createdByName: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Index for faster queries
QuickCaseSchema.index({ status: 1, createdAt: -1 });
QuickCaseSchema.index({ phone: 1 });

export default mongoose.model<IQuickCase>('QuickCase', QuickCaseSchema);
