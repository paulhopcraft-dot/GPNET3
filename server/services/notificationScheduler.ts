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
import { logger } from "../lib/logger";

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
      logger.notification.info("Scheduler already running");
      return;
    }

    logger.notification.info("Scheduler starting...");
    this.isRunning = true;

    // Run immediately on startup
    try {
      await this.runGeneration();
      await this.runSending();
    } catch (error) {
      logger.notification.error("Error during initial run", {}, error);
    }

    // Schedule periodic generation (every hour)
    this.generateTimer = setInterval(async () => {
      try {
        await this.runGeneration();
      } catch (error) {
        logger.notification.error("Generation error", {}, error);
      }
    }, GENERATION_INTERVAL_MS);

    // Schedule periodic sending (every 5 minutes)
    this.sendTimer = setInterval(async () => {
      try {
        await this.runSending();
      } catch (error) {
        logger.notification.error("Sending error", {}, error);
      }
    }, SENDING_INTERVAL_MS);

    logger.notification.info("Scheduler started successfully", {
      generationIntervalMinutes: GENERATION_INTERVAL_MS / 1000 / 60,
      sendingIntervalMinutes: SENDING_INTERVAL_MS / 1000 / 60,
    });
  }

  /**
   * Stop the notification scheduler
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.notification.info("Scheduler not running");
      return;
    }

    logger.notification.info("Scheduler stopping...");

    if (this.generateTimer) {
      clearInterval(this.generateTimer);
      this.generateTimer = undefined;
    }

    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = undefined;
    }

    this.isRunning = false;
    logger.notification.info("Scheduler stopped");
  }

  // TODO: In future, iterate over all organizations instead of using a default
  // For now, use default organization for system-wide notifications
  private readonly defaultOrganizationId = process.env.DEFAULT_ORGANIZATION_ID || "default-org";

  /**
   * Run notification generation
   */
  private async runGeneration(): Promise<void> {
    logger.notification.debug("Running notification generation...");
    const count = await generatePendingNotifications(this.storage, this.defaultOrganizationId);
    logger.notification.info("Generation complete", { count });
  }

  /**
   * Run notification sending
   */
  private async runSending(): Promise<void> {
    logger.notification.debug("Running notification sending...");
    const result = await processPendingNotifications(this.storage, this.defaultOrganizationId);
    logger.notification.info("Sending complete", { sent: result.sent, failed: result.failed });
  }

  /**
   * Manually trigger generation (for testing/admin)
   */
  async triggerGeneration(organizationId?: string): Promise<number> {
    logger.notification.info("Manual generation triggered");
    return await generatePendingNotifications(this.storage, organizationId || this.defaultOrganizationId);
  }

  /**
   * Manually trigger sending (for testing/admin)
   */
  async triggerSending(organizationId?: string): Promise<{ sent: number; failed: number }> {
    logger.notification.info("Manual sending triggered");
    return await processPendingNotifications(this.storage, organizationId || this.defaultOrganizationId);
  }

  /**
   * Check if scheduler is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}
