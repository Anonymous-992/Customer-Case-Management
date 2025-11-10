import mongoose, { Schema, Document } from "mongoose";

export interface IReminder extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  assignedTo: mongoose.Types.ObjectId[]; // Sub Admins only
  assignedToNames: string[];
  assignedBy: mongoose.Types.ObjectId; // Super Admin who created
  assignedByName: string;
  dueDate?: Date;
  relatedCaseId?: string;
  isReadByAssignees: mongoose.Types.ObjectId[]; // Tracks who has viewed
  hasUnreadUpdate: boolean; // Super Admin notification flag
  lastUpdatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }],
    assignedToNames: [{
      type: String,
    }],
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    assignedByName: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
    },
    relatedCaseId: {
      type: String,
    },
    isReadByAssignees: [{
      type: Schema.Types.ObjectId,
      ref: "Admin",
    }],
    hasUnreadUpdate: {
      type: Boolean,
      default: false,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
reminderSchema.index({ assignedTo: 1 });
reminderSchema.index({ assignedBy: 1 });
reminderSchema.index({ dueDate: 1 });
reminderSchema.index({ status: 1 });
reminderSchema.index({ createdAt: -1 });

const Reminder = mongoose.model<IReminder>("Reminder", reminderSchema);

export default Reminder;
