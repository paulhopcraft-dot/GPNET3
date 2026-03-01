/**
 * Historical Injury Date Processing Script
 *
 * This script processes existing worker cases with low-confidence injury dates,
 * applying the enhanced extraction system to improve data quality.
 *
 * Usage: npm run process:historical-dates
 * or: node scripts/process-historical-injury-dates.ts
 */

import { storage } from "../server/storage";
import { FreshdeskService } from "../server/services/freshdesk";
import { InjuryDateExtractionService, type InjuryDateExtractionResult } from "../server/services/injuryDateExtraction";
import { logger } from "../server/lib/logger";

interface HistoricalCase {
  id: string;
  workerName: string;
  company: string;
  dateOfInjury: Date;
  dateOfInjurySource: string;
  dateOfInjuryConfidence: string;
  ticketIds: string[];
  organizationId: string;
  createdAt: Date;
}

interface ProcessingResult {
  totalProcessed: number;
  improved: number;
  flaggedForReview: number;
  errors: number;
  aiExtractions: number;
  processingTime: number;
}

class HistoricalInjuryDateProcessor {
  private freshdeskService: FreshdeskService;
  private extractionService: InjuryDateExtractionService;
  private batchSize: number = 50;
  private rateLimitDelay: number = 1000; // 1 second between API calls

  constructor() {
    this.freshdeskService = new FreshdeskService();
    this.extractionService = new InjuryDateExtractionService();
  }

  /**
   * Main processing function
   */
  async processHistoricalCases(): Promise<ProcessingResult> {
    const startTime = Date.now();

    logger.sync.info("Starting historical injury date processing");

    const result: ProcessingResult = {
      totalProcessed: 0,
      improved: 0,
      flaggedForReview: 0,
      errors: 0,
      aiExtractions: 0,
      processingTime: 0
    };

    try {
      // Step 1: Find cases that need processing
      const candidateCases = await this.getCandidateCases();

      logger.sync.info(`Found ${candidateCases.length} cases for processing`);

      if (candidateCases.length === 0) {
        logger.sync.info("No cases require historical processing");
        return result;
      }

      // Step 2: Process in batches
      const batches = this.chunkArray(candidateCases, this.batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.sync.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} cases)`);

        for (const case_ of batch) {
          try {
            const caseResult = await this.processCase(case_);

            result.totalProcessed++;
            if (caseResult.improved) result.improved++;
            if (caseResult.flaggedForReview) result.flaggedForReview++;
            if (caseResult.usedAI) result.aiExtractions++;

          } catch (error) {
            result.errors++;
            logger.sync.error(`Error processing case ${case_.id}`, {
              caseId: case_.id,
              workerName: case_.workerName,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }

          // Rate limiting delay
          await this.delay(this.rateLimitDelay);
        }

        // Longer delay between batches to be respectful to APIs
        if (i < batches.length - 1) {
          logger.sync.info(`Batch ${i + 1} complete, waiting 5 seconds before next batch...`);
          await this.delay(5000);
        }
      }

      result.processingTime = Date.now() - startTime;

      logger.sync.info("Historical processing complete", {
        totalProcessed: result.totalProcessed,
        improved: result.improved,
        flaggedForReview: result.flaggedForReview,
        errors: result.errors,
        aiExtractions: result.aiExtractions,
        processingTimeMs: result.processingTime
      });

      return result;

    } catch (error) {
      logger.sync.error("Historical processing failed", {}, error);
      throw error;
    }
  }

  /**
   * Get cases that are candidates for reprocessing
   */
  private async getCandidateCases(): Promise<HistoricalCase[]> {
    const query = `
      SELECT
        id,
        worker_name,
        company,
        date_of_injury,
        date_of_injury_source,
        date_of_injury_confidence,
        ticket_ids,
        organization_id,
        created_at
      FROM worker_cases
      WHERE (
        date_of_injury_confidence = 'low'
        OR date_of_injury_source = 'fallback'
        OR date_of_injury_extraction_method IS NULL
        OR date_of_injury_extraction_method = 'fallback'
      )
      AND ticket_ids IS NOT NULL
      AND array_length(ticket_ids, 1) > 0
      ORDER BY created_at DESC
    `;

    const rows = await storage.query(query, []);

    return rows.map(row => ({
      id: row.id,
      workerName: row.worker_name,
      company: row.company,
      dateOfInjury: row.date_of_injury,
      dateOfInjurySource: row.date_of_injury_source || 'unknown',
      dateOfInjuryConfidence: row.date_of_injury_confidence || 'low',
      ticketIds: row.ticket_ids || [],
      organizationId: row.organization_id,
      createdAt: row.created_at
    }));
  }

  /**
   * Process a single case
   */
  private async processCase(case_: HistoricalCase): Promise<{
    improved: boolean;
    flaggedForReview: boolean;
    usedAI: boolean;
  }> {
    logger.sync.debug(`Processing case ${case_.id}`, {
      caseId: case_.id,
      workerName: case_.workerName,
      currentConfidence: case_.dateOfInjuryConfidence
    });

    // Fetch conversations for enhanced context
    let conversationTexts: string[] = [];

    for (const ticketId of case_.ticketIds) {
      try {
        const numericId = parseInt(ticketId.replace('FD-', ''));
        if (isNaN(numericId)) continue;

        const conversations = await this.freshdeskService.fetchTicketConversations(numericId);
        const texts = conversations
          .map(conv => conv.body_text || '')
          .filter(text => text.length > 10);

        conversationTexts.push(...texts);

        // Rate limiting for Freshdesk API
        await this.delay(500);

      } catch (error) {
        logger.sync.warn(`Failed to fetch conversations for ticket ${ticketId}`, {
          caseId: case_.id,
          ticketId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Create ticket context for extraction (reconstruct from stored data)
    const ticketContext = {
      id: parseInt(case_.ticketIds[0]?.replace('FD-', '') || '0'),
      subject: `${case_.company} - ${case_.workerName}`, // Reconstructed subject
      description_text: '', // Don't have original description
      custom_fields: {}, // Don't have original custom fields
      created_at: case_.createdAt.toISOString(),
      workerName: case_.workerName,
      company: case_.company
    };

    // TODO: Add attachment text extraction in future enhancement
    const attachmentTexts: string[] = [];

    // Run enhanced extraction
    const extractionResult: InjuryDateExtractionResult = await this.extractionService.extractInjuryDate(
      ticketContext,
      conversationTexts,
      attachmentTexts
    );

    // Determine if this is an improvement
    const isImprovement = this.isImprovement(
      case_.dateOfInjuryConfidence,
      case_.dateOfInjurySource,
      extractionResult
    );

    const usedAI = extractionResult.extractionMethod === 'ai_nlp';

    // Update database if there's an improvement
    if (isImprovement || extractionResult.requiresReview !== (case_.dateOfInjuryConfidence === 'low')) {
      await this.updateCase(case_, extractionResult);

      logger.sync.info(`Case ${case_.id} updated`, {
        caseId: case_.id,
        workerName: case_.workerName,
        oldConfidence: case_.dateOfInjuryConfidence,
        newConfidence: extractionResult.confidence,
        oldSource: case_.dateOfInjurySource,
        newSource: extractionResult.source,
        extractionMethod: extractionResult.extractionMethod,
        requiresReview: extractionResult.requiresReview,
        usedAI
      });
    }

    return {
      improved: isImprovement,
      flaggedForReview: extractionResult.requiresReview,
      usedAI
    };
  }

  /**
   * Determine if the new extraction result is an improvement
   */
  private isImprovement(
    oldConfidence: string,
    oldSource: string,
    newResult: InjuryDateExtractionResult
  ): boolean {
    // If we went from low to medium/high confidence, it's an improvement
    if (oldConfidence === 'low' && (newResult.confidence === 'medium' || newResult.confidence === 'high')) {
      return true;
    }

    // If we went from medium to high confidence, it's an improvement
    if (oldConfidence === 'medium' && newResult.confidence === 'high') {
      return true;
    }

    // If we went from fallback to any other source, it's an improvement
    if (oldSource === 'fallback' && newResult.source !== 'fallback') {
      return true;
    }

    // If we added AI reasoning where there was none, it's informative
    if (newResult.aiReasoning && newResult.extractionMethod === 'ai_nlp') {
      return true;
    }

    return false;
  }

  /**
   * Update case in database with new extraction results
   */
  private async updateCase(case_: HistoricalCase, extractionResult: InjuryDateExtractionResult): Promise<void> {
    const query = `
      UPDATE worker_cases
      SET
        date_of_injury = COALESCE($1, date_of_injury),
        date_of_injury_source = $2,
        date_of_injury_confidence = $3,
        date_of_injury_requires_review = $4,
        date_of_injury_extraction_method = $5,
        date_of_injury_source_text = $6,
        date_of_injury_ai_reasoning = $7,
        updated_at = NOW()
      WHERE id = $8
    `;

    await storage.query(query, [
      extractionResult.date,
      extractionResult.source,
      extractionResult.confidence,
      extractionResult.requiresReview,
      extractionResult.extractionMethod,
      extractionResult.sourceText,
      extractionResult.aiReasoning,
      case_.id
    ]);
  }

  /**
   * Utility function to chunk arrays into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🔍 Historical Injury Date Processing Script");
  console.log("===========================================");

  try {
    const processor = new HistoricalInjuryDateProcessor();
    const result = await processor.processHistoricalCases();

    console.log("\n✅ Processing Complete!");
    console.log("========================");
    console.log(`📊 Total processed: ${result.totalProcessed}`);
    console.log(`📈 Improved: ${result.improved}`);
    console.log(`🔍 Flagged for review: ${result.flaggedForReview}`);
    console.log(`🤖 AI extractions: ${result.aiExtractions}`);
    console.log(`❌ Errors: ${result.errors}`);
    console.log(`⏱️ Processing time: ${Math.round(result.processingTime / 1000)}s`);

    if (result.flaggedForReview > 0) {
      console.log(`\n⚠️ ${result.flaggedForReview} cases flagged for manual review`);
      console.log("   Navigate to /injury-dates/review in the admin interface");
    }

    if (result.errors > 0) {
      console.log(`\n⚠️ ${result.errors} cases had processing errors (check logs)`);
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Processing failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { HistoricalInjuryDateProcessor };