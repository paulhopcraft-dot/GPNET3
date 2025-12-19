/**
 * Notification Scheduler v1
 *
 * Background scheduler for generating and sending email notifications.
 * Follows the TranscriptIngestionModule pattern with start/stop lifecycle.
 */

import type { IStorage } from "../storage";
import {
  generatePendingNotifications,
  processPendingNotifications,
} from "./notificationService";

// Configuration
const GENERATION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SENDING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class NotificationScheduler {
  private storage: IStorage;
  private generateTimer?: NodeJS.Timeout;
  private sendTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start the notification scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[NotificationScheduler] Already running");
      return;
    }

    console.log("[NotificationScheduler] Starting...");
    this.isRunning = true;

    // Run immediately on startup
    try {
      await this.runGeneration();
      await this.runSending();
    } catch (error) {
      console.error("[NotificationScheduler] Error during initial run:", error);
    }

    // Schedule periodic generation (every hour)
    this.generateTimer = setInterval(async () => {
      try {
        await this.runGeneration();
      } catch (error) {
        console.error("[NotificationScheduler] Generation error:", error);
      }
    }, GENERATION_INTERVAL_MS);

    // Schedule periodic sending (every 5 minutes)
    this.sendTimer = setInterval(async () => {
      try {
        await this.runSending();
      } catch (error) {
        console.error("[NotificationScheduler] Sending error:", error);
      }
    }, SENDING_INTERVAL_MS);

    console.log("[NotificationScheduler] Started successfully");
    console.log(`  - Generation interval: ${GENERATION_INTERVAL_MS / 1000 / 60} minutes`);
    console.log(`  - Sending interval: ${SENDING_INTERVAL_MS / 1000 / 60} minutes`);
  }

  /**
   * Stop the notification scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("[NotificationScheduler] Not running");
      return;
    }

    console.log("[NotificationScheduler] Stopping...");

    if (this.generateTimer) {
      clearInterval(this.generateTimer);
      this.generateTimer = undefined;
    }

    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = undefined;
    }

    this.isRunning = false;
    console.log("[NotificationScheduler] Stopped");
  }

  // TODO: In future, iterate over all organizations instead of using a default
  // For now, use default organization for system-wide notifications
  private readonly defaultOrganizationId = process.env.DEFAULT_ORGANIZATION_ID || "default-org";

  /**
   * Run notification generation
   */
  private async runGeneration(): Promise<void> {
    console.log("[NotificationScheduler] Running notification generation...");
    const count = await generatePendingNotifications(this.storage, this.defaultOrganizationId);
    console.log(`[NotificationScheduler] Generated ${count} notifications`);
  }

  /**
   * Run notification sending
   */
  private async runSending(): Promise<void> {
    console.log("[NotificationScheduler] Running notification sending...");
    const result = await processPendingNotifications(this.storage, this.defaultOrganizationId);
    console.log(`[NotificationScheduler] Sent: ${result.sent}, Failed: ${result.failed}`);
  }

  /**
   * Manually trigger generation (for testing/admin)
   */
  async triggerGeneration(organizationId?: string): Promise<number> {
    console.log("[NotificationScheduler] Manual generation triggered");
    return await generatePendingNotifications(this.storage, organizationId || this.defaultOrganizationId);
  }

  /**
   * Manually trigger sending (for testing/admin)
   */
  async triggerSending(organizationId?: string): Promise<{ sent: number; failed: number }> {
    console.log("[NotificationScheduler] Manual sending triggered");
    return await processPendingNotifications(this.storage, organizationId || this.defaultOrganizationId);
  }

  /**
   * Check if scheduler is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}
