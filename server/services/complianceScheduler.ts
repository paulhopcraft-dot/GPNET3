/**
 * Compliance Scheduler Service
 *
 * Automatically checks certificate compliance for all active cases
 * and creates/updates actions in the action queue.
 *
 * Runs daily at a configured time (default: 06:00)
 */

import cron from "node-cron";
import { storage } from "../storage";
import { db } from "../db";
import { organizations, workerCases } from "@shared/schema";
import { logger } from "../lib/logger";
import { processComplianceForCase } from "./certificateCompliance";

interface ComplianceCheckResult {
  success: boolean;
  casesProcessed: number;
  actionsCreated: number;
  actionsUpdated: number;
  errors: number;
  error?: string;
  timestamp: Date;
}

export class ComplianceScheduler {
  private task: ReturnType<typeof cron.schedule> | null = null;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private lastResult: ComplianceCheckResult | null = null;

  /**
   * Start the compliance scheduler
   * @param cronExpression - Cron expression (default: "0 6 * * *" = 6:00 AM daily)
   * @param enabled - Whether the scheduler is enabled
   */
  start(cronExpression: string = "0 6 * * *", enabled: boolean = true): void {
    if (!enabled) {
      logger.compliance.info("Compliance scheduler disabled via configuration");
      return;
    }

    if (this.task) {
      logger.compliance.warn("Compliance scheduler already running");
      return;
    }

    logger.compliance.info("Starting compliance scheduler", { cronExpression });

    this.task = cron.schedule(cronExpression, async () => {
      await this.executeComplianceCheckWithRetry();
    });

    logger.compliance.info("Compliance scheduler started successfully");
  }

  /**
   * Stop the compliance scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.compliance.info("Compliance scheduler stopped");
    }
  }

  /**
   * Execute compliance check with retry logic
   */
  async executeComplianceCheckWithRetry(maxRetries: number = 3, retryDelay: number = 60000): Promise<ComplianceCheckResult> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        const result = await this.executeComplianceCheck();
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error || "Compliance check completed with errors");
        break;
      } catch (error) {
        attempt++;
        lastError = error as Error;
        logger.compliance.error(`Compliance check attempt ${attempt} failed`, {
          error: lastError.message,
          attempt,
          maxRetries,
        });

        if (attempt < maxRetries) {
          logger.compliance.info(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All retries failed
    const failureResult: ComplianceCheckResult = {
      success: false,
      casesProcessed: 0,
      actionsCreated: 0,
      actionsUpdated: 0,
      errors: attempt,
      error: lastError?.message || "Unknown error",
      timestamp: new Date(),
    };

    this.lastRun = new Date();
    this.lastResult = failureResult;

    logger.compliance.error("Compliance check failed after retries", {
      error: lastError?.message,
      attempts: attempt,
    });

    return failureResult;
  }

  /**
   * Execute the compliance check for all active cases
   */
  async executeComplianceCheck(): Promise<ComplianceCheckResult> {
    if (this.isRunning) {
      logger.compliance.warn("Compliance check already running, skipping this execution");
      return {
        success: false,
        casesProcessed: 0,
        actionsCreated: 0,
        actionsUpdated: 0,
        errors: 0,
        error: "Already running",
        timestamp: new Date(),
      };
    }

    this.isRunning = true;
    logger.compliance.info("Starting compliance check for all active cases");

    let casesProcessed = 0;
    let actionsCreated = 0;
    let actionsUpdated = 0;
    let errors = 0;

    try {
      // Get all organizations
      const orgs = await db.select().from(organizations);

      for (const org of orgs) {
        logger.compliance.info("Processing compliance for organization", {
          organizationId: org.id,
          organizationName: org.name
        });

        try {
          // Get all active cases for this organization (excluding closed/archived)
          const activeCases = await storage.getGPNet2Cases(org.id);

          logger.compliance.info("Found active cases", {
            organizationId: org.id,
            activeCases: activeCases.length,
          });

          for (const workerCase of activeCases) {
            try {
              // Get current action count
              const actionsBefore = await storage.getActionsByCase(workerCase.id, org.id);
              const pendingBefore = actionsBefore.filter(a => a.status === "pending").length;

              // Process compliance and sync actions
              await processComplianceForCase(storage, workerCase.id, org.id);

              // Get updated action count
              const actionsAfter = await storage.getActionsByCase(workerCase.id, org.id);
              const pendingAfter = actionsAfter.filter(a => a.status === "pending").length;

              casesProcessed++;

              // Track if actions were created or updated
              if (pendingAfter > pendingBefore) {
                actionsCreated += (pendingAfter - pendingBefore);
                logger.compliance.debug("Created compliance actions", {
                  caseId: workerCase.id,
                  workerName: workerCase.workerName,
                  actionsCreated: pendingAfter - pendingBefore,
                });
              } else if (pendingAfter < pendingBefore) {
                actionsUpdated += (pendingBefore - pendingAfter);
                logger.compliance.debug("Marked compliance actions as done", {
                  caseId: workerCase.id,
                  workerName: workerCase.workerName,
                  actionsClosed: pendingBefore - pendingAfter,
                });
              }

            } catch (caseError) {
              errors++;
              logger.compliance.error("Error processing compliance for case", {
                caseId: workerCase.id,
                workerName: workerCase.workerName,
              }, caseError);
            }
          }

          logger.compliance.info("Completed compliance check for organization", {
            organizationId: org.id,
            organizationName: org.name,
            casesProcessed: activeCases.length,
          });

        } catch (orgError) {
          errors++;
          logger.compliance.error("Error processing organization", {
            organizationId: org.id,
            organizationName: org.name,
          }, orgError);
        }
      }

      const result: ComplianceCheckResult = {
        success: true,
        casesProcessed,
        actionsCreated,
        actionsUpdated,
        errors,
        timestamp: new Date(),
      };

      this.lastRun = new Date();
      this.lastResult = result;

      logger.compliance.info("Compliance check complete", {
        casesProcessed,
        actionsCreated,
        actionsUpdated,
        errors,
        organizationsProcessed: orgs.length,
      });

      return result;

    } catch (error) {
      const err = error as Error;
      logger.compliance.error("Compliance check failed", { error: err.message }, error);

      const result: ComplianceCheckResult = {
        success: false,
        casesProcessed,
        actionsCreated,
        actionsUpdated,
        errors: errors + 1,
        error: err.message,
        timestamp: new Date(),
      };

      this.lastRun = new Date();
      this.lastResult = result;

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger a compliance check
   */
  async triggerManualCheck(): Promise<ComplianceCheckResult> {
    logger.compliance.info("Manual compliance check triggered");
    return await this.executeComplianceCheckWithRetry();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    lastRun: Date | null;
    lastResult: ComplianceCheckResult | null;
  } {
    return {
      running: this.isRunning,
      lastRun: this.lastRun,
      lastResult: this.lastResult,
    };
  }
}

// Export singleton instance
export const complianceScheduler = new ComplianceScheduler();
