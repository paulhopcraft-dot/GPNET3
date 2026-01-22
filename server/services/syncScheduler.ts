import cron from 'node-cron';
import Anthropic from '@anthropic-ai/sdk';
import { FreshdeskService } from './freshdesk';
import { storage } from '../storage';
import { logger } from '../lib/logger';
import { logAuditEvent, AuditEventTypes } from './auditLogger';
import { db } from '../db';
import { medicalCertificates } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

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

      // Fetch and sync discussion notes + certificate attachments
      let discussionNotesProcessed = 0;
      let certificatesExtracted = 0;
      const freshdeskAuthHeader = 'Basic ' + Buffer.from(`${process.env.FRESHDESK_API_KEY}:X`).toString('base64');

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

            // Process discussion notes
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

            // Process certificate attachments via OCR
            const certsFromTicket = await processCertificateAttachments(
              workerCase.id!,
              numericId,
              conversations as any,
              freshdeskAuthHeader
            );
            certificatesExtracted += certsFromTicket;

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
        certificates: certificatesExtracted,
        discussionNotes: discussionNotesProcessed,
        duration
      };

      this.lastResult = result;

      logger.sync.info('Scheduled sync completed successfully', {
        synced: syncedCount,
        certificates: certificatesExtracted,
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

/**
 * Process certificate attachments from conversations using Claude Vision OCR
 */
async function processCertificateAttachments(
  caseId: string,
  ticketId: number,
  conversations: Array<{ attachments?: Array<{ id: number; name: string; content_type: string; size: number; attachment_url: string }>; created_at: string }>,
  freshdeskAuthHeader: string
): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.sync.warn('ANTHROPIC_API_KEY not set, skipping OCR');
    return 0;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let certsCreated = 0;

  // Collect all PDF/image attachments
  const attachments: Array<{ id: number; name: string; content_type: string; attachment_url: string; convDate: string }> = [];
  for (const conv of conversations) {
    if (conv.attachments?.length) {
      for (const att of conv.attachments) {
        if (att.content_type?.includes('pdf') || att.content_type?.includes('image')) {
          attachments.push({ ...att, convDate: conv.created_at });
        }
      }
    }
  }

  if (attachments.length === 0) return 0;

  logger.sync.debug(`Processing ${attachments.length} attachments for ticket ${ticketId}`);

  for (const att of attachments) {
    try {
      // Check if already processed
      const existing = await db.select().from(medicalCertificates)
        .where(eq(medicalCertificates.sourceReference, `ticket:${ticketId}:attachment:${att.id}`))
        .limit(1);

      if (existing.length > 0) {
        logger.sync.debug(`Attachment ${att.id} already processed, skipping`);
        continue;
      }

      // Download attachment
      const res = await fetch(att.attachment_url, { headers: { Authorization: freshdeskAuthHeader } });
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = res.headers.get('content-type') || att.content_type;

      // Determine media type
      let mediaType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
      if (contentType.includes('pdf')) mediaType = 'application/pdf';
      else if (contentType.includes('png')) mediaType = 'image/png';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) mediaType = 'image/jpeg';
      else if (contentType.includes('gif')) mediaType = 'image/gif';
      else if (contentType.includes('webp')) mediaType = 'image/webp';
      else continue; // Skip unsupported types

      // Build content blocks
      const contentBlocks: Anthropic.MessageCreateParams['messages'][0]['content'] = [];
      if (mediaType === 'application/pdf') {
        contentBlocks.push({
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: mediaType, data: base64 }
        } as Anthropic.DocumentBlockParam);
      } else {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType as any, data: base64 }
        });
      }

      contentBlocks.push({
        type: 'text',
        text: `Analyze this document. Determine if it's a medical certificate (Certificate of Capacity, fitness for work certificate, doctor's certificate).

If it IS a medical certificate, extract dates, practitioner, and capacity. Respond ONLY with JSON:
{
  "isMedicalCertificate": true/false,
  "issueDate": "YYYY-MM-DD" or null,
  "startDate": "YYYY-MM-DD" or null,
  "endDate": "YYYY-MM-DD" or null,
  "practitionerName": "Dr Name" or null,
  "practitionerType": "gp|specialist|physiotherapist|psychologist|other" or null,
  "capacity": "fit|partial|unfit|unknown",
  "restrictions": [],
  "notes": "any notes",
  "rawText": "key text",
  "confidence": 0.0-1.0
}`
      });

      // Run OCR
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [{ role: 'user', content: contentBlocks }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') continue;

      let jsonStr = textContent.text.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);

      const extracted = JSON.parse(jsonStr.trim());

      if (extracted.isMedicalCertificate && extracted.confidence >= 0.5) {
        const issueDate = extracted.issueDate ? new Date(extracted.issueDate) : new Date(att.convDate);
        const startDate = extracted.startDate ? new Date(extracted.startDate) : issueDate;
        const endDate = extracted.endDate ? new Date(extracted.endDate) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

        await db.insert(medicalCertificates).values({
          caseId,
          issueDate,
          startDate,
          endDate,
          capacity: extracted.capacity || 'unknown',
          treatingPractitioner: extracted.practitionerName,
          practitionerType: extracted.practitionerType as any,
          restrictions: extracted.restrictions || [],
          notes: extracted.notes,
          source: 'freshdesk_ocr',
          sourceReference: `ticket:${ticketId}:attachment:${att.id}`,
          documentUrl: att.attachment_url,
          fileName: att.name,
          fileUrl: att.attachment_url,
          rawExtractedData: extracted as any,
          extractionConfidence: String(extracted.confidence),
          requiresReview: extracted.confidence < 0.8,
        });

        certsCreated++;
        logger.sync.info(`Certificate extracted from ${att.name}`, { caseId, ticketId, confidence: extracted.confidence });
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      logger.sync.error(`Failed to process attachment ${att.name}`, { error: (err as Error).message });
    }
  }

  return certsCreated;
}

// Singleton instance
export const syncScheduler = new SyncScheduler();
