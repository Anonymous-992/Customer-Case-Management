import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    inactivityAlertsEnabled: boolean;
    inactivityThresholdDays: number;
  };
  remindersConfig: {
    autoRemindersEnabled: boolean;
    defaultReminderInterval: "daily" | "weekly" | "custom";
    customReminderDays?: number;
  };
  exportSettings: {
    defaultFormat: "excel" | "pdf";
    includeFilters: boolean;
  };
  defaultViews: {
    dashboardFilter: "all" | "open" | "pending" | "closed";
    defaultColumns: string[];
  };
  autoStatusRules: {
    enabled: boolean;
    inactivityDays: number;
    targetStatus: string;
  };
  preferences: {
    timezone: string;
    language: "en" | "ar" | "fr" | "hi";
    dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  };
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    notifications: {
      emailEnabled: {
        type: Boolean,
        default: true,
      },
      smsEnabled: {
        type: Boolean,
        default: false,
      },
      inactivityAlertsEnabled: {
        type: Boolean,
        default: true,
      },
      inactivityThresholdDays: {
        type: Number,
        default: 7,
        min: 1,
        max: 30,
      },
    },
    remindersConfig: {
      autoRemindersEnabled: {
        type: Boolean,
        default: true,
      },
      defaultReminderInterval: {
        type: String,
        enum: ["daily", "weekly", "custom"],
        default: "weekly",
      },
      customReminderDays: {
        type: Number,
      },
    },
    exportSettings: {
      defaultFormat: {
        type: String,
        enum: ["excel", "pdf"],
        default: "excel",
      },
      includeFilters: {
        type: Boolean,
        default: true,
      },
    },
    defaultViews: {
      dashboardFilter: {
        type: String,
        enum: ["all", "open", "pending", "closed"],
        default: "open",
      },
      defaultColumns: {
        type: [String],
        default: ["customerName", "status", "assignedTo", "createdAt"],
      },
    },
    autoStatusRules: {
      enabled: {
        type: Boolean,
        default: false,
      },
      inactivityDays: {
        type: Number,
        default: 14,
        min: 1,
        max: 90,
      },
      targetStatus: {
        type: String,
        default: "Pending Follow-Up",
      },
    },
    preferences: {
      timezone: {
        type: String,
        default: "UTC",
      },
      language: {
        type: String,
        enum: ["en", "ar", "fr", "hi"],
        default: "en",
      },
      dateFormat: {
        type: String,
        enum: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
        default: "DD/MM/YYYY",
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      unique: true,
      sparse: true, // Allows null for global settings
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
settingsSchema.index({ userId: 1 });

const Settings = mongoose.model<ISettings>("Settings", settingsSchema);

export default Settings;
