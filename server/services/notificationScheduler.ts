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
import { db } from "../db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

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

  /**
   * Get all active organizations from the database
   */
  private async getActiveOrganizations(): Promise<Array<{ id: string; name: string }>> {
    try {
      const orgs = await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.isActive, true));
      return orgs;
    } catch (error) {
      logger.notification.error("Error fetching active organizations", {}, error);
      return [];
    }
  }

  /**
   * Run notification generation for all active organizations
   */
  private async runGeneration(): Promise<void> {
    logger.notification.debug("Running notification generation...");
    const orgs = await this.getActiveOrganizations();

    if (orgs.length === 0) {
      logger.notification.warn("No active organizations found for notification generation");
      return;
    }

    let totalCount = 0;
    for (const org of orgs) {
      try {
        const count = await generatePendingNotifications(this.storage, org.id);
        totalCount += count;
        logger.notification.debug("Generated notifications for organization", {
          organizationId: org.id,
          organizationName: org.name,
          count
        });
      } catch (error) {
        logger.notification.error("Error generating notifications for organization", {
          organizationId: org.id,
          organizationName: org.name
        }, error);
      }
    }

    logger.notification.info("Generation complete", {
      totalCount,
      organizationsProcessed: orgs.length
    });
  }

  /**
   * Run notification sending for all active organizations
   */
  private async runSending(): Promise<void> {
    logger.notification.debug("Running notification sending...");
    const orgs = await this.getActiveOrganizations();

    if (orgs.length === 0) {
      logger.notification.warn("No active organizations found for notification sending");
      return;
    }

    let totalSent = 0;
    let totalFailed = 0;
    for (const org of orgs) {
      try {
        const result = await processPendingNotifications(this.storage, org.id);
        totalSent += result.sent;
        totalFailed += result.failed;
        logger.notification.debug("Sent notifications for organization", {
          organizationId: org.id,
          organizationName: org.name,
          sent: result.sent,
          failed: result.failed
        });
      } catch (error) {
        logger.notification.error("Error sending notifications for organization", {
          organizationId: org.id,
          organizationName: org.name
        }, error);
      }
    }

    logger.notification.info("Sending complete", {
      sent: totalSent,
      failed: totalFailed,
      organizationsProcessed: orgs.length
    });
  }

  /**
   * Manually trigger generation (for testing/admin)
   * @param organizationId - Optional organization ID. If not provided, runs for all active organizations.
   */
  async triggerGeneration(organizationId?: string): Promise<number> {
    logger.notification.info("Manual generation triggered", { organizationId });

    if (organizationId) {
      // Run for specific organization
      return await generatePendingNotifications(this.storage, organizationId);
    }

    // Run for all active organizations
    await this.runGeneration();
    return 0; // Return value not meaningful for multi-org
  }

  /**
   * Manually trigger sending (for testing/admin)
   * @param organizationId - Optional organization ID. If not provided, runs for all active organizations.
   */
  async triggerSending(organizationId?: string): Promise<{ sent: number; failed: number }> {
    logger.notification.info("Manual sending triggered", { organizationId });

    if (organizationId) {
      // Run for specific organization
      return await processPendingNotifications(this.storage, organizationId);
    }

    // Run for all active organizations
    await this.runSending();
    return { sent: 0, failed: 0 }; // Return value not meaningful for multi-org
  }

  /**
   * Check if scheduler is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}
