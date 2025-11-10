import cron from "node-cron";
import ProductCase from "../models/ProductCase";
import Settings from "../models/Settings";
import { memoryStorage } from "../storage/memory-storage";
import { isMongoDBAvailable } from "../db";

/**
 * Auto-status rules scheduler
 * Runs daily at midnight to check for inactive cases
 */
export function startAutoStatusScheduler() {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("[Scheduler] Running auto-status rules check...");
    
    try {
      // Get global settings (admin without userId)
      let settings;
      if (isMongoDBAvailable) {
        settings = await Settings.findOne({ userId: { $exists: false } });
      } else {
        settings = await memoryStorage.findSettings(undefined);
      }

      // Check if auto-status rules are enabled
      if (!settings || !settings.autoStatusRules.enabled) {
        console.log("[Scheduler] Auto-status rules are disabled, skipping...");
        return;
      }

      const { inactivityDays, targetStatus } = settings.autoStatusRules;
      console.log(`[Scheduler] Checking for cases inactive for ${inactivityDays} days...`);

      // Calculate the threshold date
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - inactivityDays);

      let updatedCount = 0;

      if (isMongoDBAvailable) {
        // MongoDB implementation
        const result = await ProductCase.updateMany(
          {
            updatedAt: { $lt: thresholdDate },
            status: { 
              $nin: ["Closed", "Shipped to Customer", targetStatus] 
            }
          },
          {
            $set: { 
              status: targetStatus,
              updatedAt: new Date()
            }
          }
        );
        updatedCount = result.modifiedCount;
      } else {
        // Memory storage implementation
        // This is a simplified version - in production, you'd want proper implementation
        console.log("[Scheduler] Memory storage auto-status not fully implemented");
      }

      console.log(`[Scheduler] Updated ${updatedCount} cases to status: ${targetStatus}`);
    } catch (error) {
      console.error("[Scheduler] Error running auto-status rules:", error);
    }
  });

  console.log("[Scheduler] Auto-status rules scheduler started (runs daily at midnight)");
}

/**
 * Inactivity alerts scheduler
 * Runs every 6 hours to check for cases needing attention
 */
export function startInactivityAlertsScheduler() {
  // Run every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log("[Scheduler] Running inactivity alerts check...");
    
    try {
      // Get global settings
      let settings;
      if (isMongoDBAvailable) {
        settings = await Settings.findOne({ userId: { $exists: false } });
      } else {
        settings = await memoryStorage.findSettings(undefined);
      }

      // Check if inactivity alerts are enabled
      if (!settings || !settings.notifications.inactivityAlertsEnabled) {
        console.log("[Scheduler] Inactivity alerts are disabled, skipping...");
        return;
      }

      const { inactivityThresholdDays } = settings.notifications;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - inactivityThresholdDays);

      let inactiveCases;
      if (isMongoDBAvailable) {
        inactiveCases = await ProductCase.find({
          updatedAt: { $lt: thresholdDate },
          status: { $nin: ["Closed", "Shipped to Customer"] }
        })
        .populate("customerId")
        .limit(50);
      } else {
        // Memory storage - simplified
        console.log("[Scheduler] Memory storage inactivity alerts not fully implemented");
        inactiveCases = [];
      }

      if (inactiveCases.length > 0) {
        console.log(`[Scheduler] Found ${inactiveCases.length} inactive cases`);
        // Here you would integrate with your notification service
        // For now, just log the count
        // In production: send emails, SMS, push notifications, etc.
      }
    } catch (error) {
      console.error("[Scheduler] Error running inactivity alerts:", error);
    }
  });

  console.log("[Scheduler] Inactivity alerts scheduler started (runs every 6 hours)");
}

/**
 * Start all schedulers
 */
export function startAllSchedulers() {
  startAutoStatusScheduler();
  startInactivityAlertsScheduler();
  console.log("[Scheduler] All schedulers initialized");
}
