import cron from 'node-cron';
import { FreshdeskService } from './freshdesk';
import { storage } from '../storage';
import { logger } from '../lib/logger';
import { logAuditEvent, AuditEventTypes } from './auditLogger';

interface SyncResult {
  success: boolean;
  synced: number;
  certificates: number;
  discussionNotes: number;
  error?: string;
  duration?: number;
}

export class SyncScheduler {
  private task: ReturnType<typeof cron.schedule> | null = null;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private lastResult: SyncResult | null = null;

  /**
   * Start the scheduled sync job
   * @param cronExpression - Cron expression (default: '0 18 * * *' for 6 PM daily)
   * @param enabled - Whether scheduling is enabled
   */
  start(cronExpression: string = '0 18 * * *', enabled: boolean = true): void {
    if (!enabled) {
      logger.sync.info('Sync scheduler disabled via configuration');
      return;
    }

    if (this.task) {
      logger.sync.warn('Sync scheduler already running');
      return;
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      logger.sync.error('Invalid cron expression', { cronExpression });
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    logger.sync.info('Starting sync scheduler', { cronExpression });

    this.task = cron.schedule(cronExpression, async () => {
      await this.executeSyncWithRetry();
    });

    logger.sync.info('Sync scheduler started successfully');
  }

  /**
   * Stop the scheduled sync job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.sync.info('Sync scheduler stopped');
    }
  }

  /**
   * Execute sync with retry logic
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @param retryDelay - Delay between retries in milliseconds (default: 60000 = 1 minute)
   */
  async executeSyncWithRetry(maxRetries: number = 3, retryDelay: number = 60000): Promise<SyncResult> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        const result = await this.executeSync();

        if (result.success) {
          return result;
        }

        // If sync completed but with errors, don't retry
        lastError = new Error(result.error || 'Sync completed with errors');
        break;
      } catch (error) {
        attempt++;
        lastError = error as Error;

        logger.sync.error(`Sync attempt ${attempt} failed`, {
          error: lastError.message,
          attempt,
          maxRetries
        });

        if (attempt < maxRetries) {
          logger.sync.info(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All retries failed
    const failureResult: SyncResult = {
      success: false,
      synced: 0,
      certificates: 0,
      discussionNotes: 0,
      error: lastError?.message || 'Unknown error'
    };

    this.lastResult = failureResult;

    await logAuditEvent({
      userId: 'system',
      organizationId: null,
      eventType: 'webhook.failed' as any, // Using closest available event type
      resourceType: 'freshdesk_sync',
      metadata: {
        error: lastError?.message,
        attempts: attempt,
        timestamp: new Date().toISOString()
      }
    });

    return failureResult;
  }

  /**
   * Execute a single sync operation
   */
  private async executeSync(): Promise<SyncResult> {
    if (this.isRunning) {
      logger.sync.warn('Sync already in progress, skipping...');
      return {
        success: false,
        synced: 0,
        certificates: 0,
        discussionNotes: 0,
        error: 'Sync already in progress'
      };
    }

    // Check if Freshdesk is configured
    if (!process.env.FRESHDESK_DOMAIN || !process.env.FRESHDESK_API_KEY) {
      logger.sync.info('Freshdesk not configured, skipping sync');
      return {
        success: true,
        synced: 0,
        certificates: 0,
        discussionNotes: 0
      };
    }

    this.isRunning = true;
    this.lastRun = new Date();
    const startTime = Date.now();

    try {
      logger.sync.info('Starting scheduled Freshdesk sync');

      const freshdesk = new FreshdeskService();
      const tickets = await freshdesk.fetchTickets();

      logger.sync.info(`Fetched ${tickets.length} tickets from Freshdesk`);

      const workerCases = await freshdesk.transformTicketsToWorkerCases(tickets);

      logger.sync.info(`Transformed into ${workerCases.length} worker cases`);

      // Sync worker cases
      let syncedCount = 0;
      for (const workerCase of workerCases) {
        await storage.syncWorkerCaseFromFreshdesk(workerCase);
        syncedCount++;
      }

      // Fetch and sync discussion notes
      let discussionNotesProcessed = 0;
      for (const workerCase of workerCases) {
        if (!workerCase.ticketIds || workerCase.ticketIds.length === 0) {
          continue;
        }

        // Fetch conversations for all tickets in this case
        for (const ticketId of workerCase.ticketIds) {
          try {
            const numericId = parseInt(ticketId.replace('FD-', ''));
            if (isNaN(numericId)) continue;

            const conversations = await freshdesk.fetchTicketConversations(numericId);
            if (conversations.length === 0) continue;

            const discussionNotes = freshdesk.convertConversationsToDiscussionNotes(
              conversations,
              workerCase.id!,
              workerCase.organizationId || 'default',
              workerCase.workerName!
            );

            if (discussionNotes.length > 0) {
              await storage.upsertCaseDiscussionNotes(discussionNotes);
              discussionNotesProcessed += discussionNotes.length;
            }
          } catch (err) {
            logger.sync.error('Failed to fetch conversations', {
              ticketId,
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      const result: SyncResult = {
        success: true,
        synced: syncedCount,
        certificates: 0, // Certificate sync is handled separately
        discussionNotes: discussionNotesProcessed,
        duration
      };

      this.lastResult = result;

      logger.sync.info('Scheduled sync completed successfully', {
        synced: syncedCount,
        discussionNotes: discussionNotesProcessed,
        duration: `${(duration / 1000).toFixed(2)}s`
      });

      await logAuditEvent({
        userId: 'system',
        organizationId: null,
        eventType: 'webhook.processed' as any, // Using closest available event type
        resourceType: 'freshdesk_sync',
        metadata: {
          synced: syncedCount,
          discussionNotes: discussionNotesProcessed,
          duration,
          timestamp: new Date().toISOString()
        }
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.sync.error('Scheduled sync failed', {
        error: errorMessage,
        duration: `${(duration / 1000).toFixed(2)}s`
      });

      const result: SyncResult = {
        success: false,
        synced: 0,
        certificates: 0,
        discussionNotes: 0,
        error: errorMessage,
        duration
      };

      this.lastResult = result;

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger a sync (for testing or on-demand execution)
   */
  async triggerManualSync(): Promise<SyncResult> {
    logger.sync.info('Manual sync triggered');
    return await this.executeSyncWithRetry();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isScheduled: boolean;
    isRunning: boolean;
    lastRun: Date | null;
    lastResult: SyncResult | null;
  } {
    return {
      isScheduled: this.task !== null,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      lastResult: this.lastResult
    };
  }
}

// Singleton instance
export const syncScheduler = new SyncScheduler();
