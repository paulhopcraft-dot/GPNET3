import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";
import type { WorkerCase } from "@shared/schema";

export class SummaryService {
  private anthropic: Anthropic | null = null;
  private model = "claude-sonnet-4-20250514";

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  private ensureConfigured(): void {
    if (!this.anthropic) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not configured");
    }
  }

  async generateCaseSummary(workerCase: WorkerCase): Promise<string> {
    this.ensureConfigured();
    const prompt = this.buildSummaryPrompt(workerCase);
    
    const response = await this.anthropic!.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in AI response");
    }

    return textContent.text;
  }

  async getCachedOrGenerateSummary(caseId: string): Promise<{
    summary: string;
    cached: boolean;
    generatedAt?: string;
    model?: string;
  }> {
    const workerCase = await storage.getGPNet2CaseById(caseId);
    
    if (!workerCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    // Check if we need to refresh the summary
    const needsRefresh = await storage.needsSummaryRefresh(caseId);

    // If summary exists and doesn't need refresh, return cached version
    if (!needsRefresh && workerCase.aiSummary) {
      return {
        summary: workerCase.aiSummary,
        cached: true,
        generatedAt: workerCase.aiSummaryGeneratedAt,
        model: workerCase.aiSummaryModel,
      };
    }

    // Generate new summary
    const summary = await this.generateCaseSummary(workerCase);
    
    // Store in database
    await storage.updateAISummary(caseId, summary, this.model);

    return {
      summary,
      cached: false,
      generatedAt: new Date().toISOString(),
      model: this.model,
    };
  }

  private buildSummaryPrompt(workerCase: WorkerCase): string {
    return `You are a compliance assistant for Worksafe Victoria worker's compensation cases. Analyze the following case and provide a concise, professional summary focusing on compliance status, risk factors, and recommended actions.

**Case Details:**
- Worker: ${workerCase.workerName}
- Company: ${workerCase.company}
- Date of Injury: ${workerCase.dateOfInjury}
- Risk Level: ${workerCase.riskLevel}
- Work Status: ${workerCase.workStatus}
- Compliance Indicator: ${workerCase.complianceIndicator}
- Current Status: ${workerCase.currentStatus}
- Next Step: ${workerCase.nextStep}
- Owner: ${workerCase.owner}
- Due Date: ${workerCase.dueDate}
- Has Certificate: ${workerCase.hasCertificate ? "Yes" : "No"}
- Ticket Count: ${workerCase.ticketCount} merged ticket(s)
${workerCase.clcLastFollowUp ? `- CLC Last Follow-up: ${workerCase.clcLastFollowUp}` : ""}
${workerCase.clcNextFollowUp ? `- CLC Next Follow-up: ${workerCase.clcNextFollowUp}` : ""}

**Case Summary:**
${workerCase.summary}

Provide a 2-3 paragraph summary that:
1. Highlights key compliance concerns and risk factors
2. Identifies any missing documentation or action items
3. Recommends next steps to maintain compliance

Keep the tone professional and action-oriented.`;
  }
}

export const summaryService = new SummaryService();
