import type { WorkerCase } from "@shared/schema";
import { storage } from "../storage";
import { SummaryService } from "./summary";
import { LlamaSummaryService } from "./llamaSummary";
import { TemplateSummaryService } from "./templateSummary";
import { logger } from "../lib/logger";

export class HybridSummaryService {
  private anthropicService: SummaryService;
  private llamaService: LlamaSummaryService;
  private templateService: TemplateSummaryService;

  constructor() {
    this.anthropicService = new SummaryService();
    this.llamaService = new LlamaSummaryService();
    this.templateService = new TemplateSummaryService();
  }

  /**
   * Generate summary using the best available service
   * Priority: Anthropic (Sonnet 4) → Local Llama → Template fallback
   * PRD Story 1: Support force parameter to bypass cache
   */
  async getCachedOrGenerateSummary(caseId: string, force: boolean = false): Promise<{
    summary: string;
    cached: boolean;
    generatedAt?: string;
    model?: string;
    workStatusClassification?: string;
  }> {
    const workerCase = await storage.getGPNet2CaseByIdAdmin(caseId);

    if (!workerCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    // PRD Story 4: Check if cached summary needs refresh based on model or force parameter
    const currentModel = "claude-sonnet-4-20250514"; // Current enhanced model
    const needsRefresh = force || await storage.needsSummaryRefresh(caseId, workerCase.organizationId, currentModel);

    if (!needsRefresh && workerCase.aiSummary) {
      console.log(`Using cached summary for ${caseId} (model: ${workerCase.aiSummaryModel})`);
      return {
        summary: workerCase.aiSummary,
        cached: true,
        generatedAt: workerCase.aiSummaryGeneratedAt,
        model: workerCase.aiSummaryModel,
        workStatusClassification: workerCase.aiWorkStatusClassification,
      };
    }

    console.log(`Generating new summary for ${caseId} (force=${force}, needsRefresh=${needsRefresh})`);



    // Try services in priority order
    const services = [
      { name: "Anthropic (Sonnet 4)", service: this.anthropicService },
      { name: "Local Llama", service: this.llamaService },
      { name: "Template", service: this.templateService },
    ];

    for (const { name, service } of services) {
      try {
        logger.api.info(`Attempting summary generation with ${name}...`);

        // Special check for Llama availability
        if (name === "Local Llama") {
          const isLlamaAvailable = await this.llamaService.isAvailable();
          if (!isLlamaAvailable) {
            logger.api.info("Local Llama not available, skipping...");
            continue;
          }
        }

        const result = await service.getCachedOrGenerateSummary(caseId);

        logger.api.info(`Summary generated successfully with ${name}`);

        // PRD Story 1 & 4: Save new summary to database when not cached
        if (!result.cached) {
          console.log(`💾 Saving new ${name} summary to database for case ${caseId}`);
          await storage.updateAISummary(
            caseId,
            workerCase.organizationId,
            result.summary,
            result.model || currentModel,
            result.workStatusClassification
          );
        }

        // Add metadata about which service was used
        const enhancedSummary = {
          ...result,
          summary: result.summary + `\n\n---\n*Generated using ${name}*`,
        };

        console.log(`✅ Returning ${result.cached ? 'cached' : 'new'} summary from ${name}`);
        return enhancedSummary;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.api.warn(`${name} failed: ${errorMessage}`);

        // For Anthropic errors, log the specific error type
        if (name === "Anthropic (Sonnet 4)" && errorMessage.includes("credit balance")) {
          logger.api.warn("Anthropic credits exhausted, trying fallback services...");
        }

        // Continue to next service
        continue;
      }
    }

    // If all services failed, return error
    throw new Error("All summary services failed. Please check your configuration.");
  }

  /**
   * Get service health status
   */
  async getServiceStatus(): Promise<{
    anthropic: boolean;
    llama: boolean;
    template: boolean;
    recommended: string;
  }> {
    const status = {
      anthropic: false,
      llama: false,
      template: true, // Template is always available
      recommended: "template" as string,
    };

    // Check Anthropic
    try {
      // Quick test call (won't actually generate)
      const anthropic = (this.anthropicService as any).getAnthropic();
      status.anthropic = !!anthropic;
    } catch {
      status.anthropic = false;
    }

    // Check Llama
    try {
      status.llama = await this.llamaService.isAvailable();
    } catch {
      status.llama = false;
    }

    // Determine recommendation
    if (status.anthropic) {
      status.recommended = "anthropic";
    } else if (status.llama) {
      status.recommended = "llama";
    } else {
      status.recommended = "template";
    }

    return status;
  }

  /**
   * Setup local Llama if not available
   */
  async setupLlama(): Promise<boolean> {
    try {
      return await this.llamaService.setupModel();
    } catch (error) {
      logger.api.error("Failed to setup Llama:", {}, error);
      return false;
    }
  }
}