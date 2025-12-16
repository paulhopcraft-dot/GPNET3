import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";
import type { WorkerCase, CaseDiscussionNote, TranscriptInsight } from "@shared/schema";

export class SummaryService {
  private anthropic: Anthropic | null = null;
  public model = "claude-sonnet-4-20250514";

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

  async generateCaseSummary(workerCase: WorkerCase): Promise<{
    summary: string;
    workStatusClassification: string;
  }> {
    this.ensureConfigured();
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(workerCase);
    
    const response = await this.anthropic!.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in AI response");
    }

    // Extract work status classification from the response
    const fullText = textContent.text;
    const workStatusMatch = fullText.match(/Work Status Classification:\s*(.+?)(?:\n|$)/);
    const workStatusClassification = workStatusMatch ? workStatusMatch[1].trim() : "N/A";
    
    // Remove the classification line from summary (handles both \n and end-of-string)
    const summary = fullText.replace(/Work Status Classification:.*?(?:\n|$)/, '').trim();

    return {
      summary,
      workStatusClassification,
    };
  }

  async getCachedOrGenerateSummary(caseId: string): Promise<{
    summary: string;
    cached: boolean;
    generatedAt?: string;
    model?: string;
    workStatusClassification?: string;
  }> {
    // Use admin method as summary service operates across organizations
    const workerCase = await storage.getGPNet2CaseByIdAdmin(caseId);
    
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
        workStatusClassification: workerCase.aiWorkStatusClassification,
      };
    }

    // Generate new summary
    const result = await this.generateCaseSummary(workerCase);
    
    // Store in database
    await storage.updateAISummary(caseId, result.summary, this.model, result.workStatusClassification);

    return {
      summary: result.summary,
      cached: false,
      generatedAt: new Date().toISOString(),
      model: this.model,
      workStatusClassification: result.workStatusClassification,
    };
  }

  private buildSystemPrompt(): string {
    return `You are a compliance assistant for Worksafe Victoria worker's compensation cases. Generate detailed, structured case summaries following this exact format:

**REQUIRED OUTPUT FORMAT:**

Work Status Classification: [ONE OF: "At work full hours full duties" | "At work full hours modified duties" | "At work partial hours, full duties" | "At work partial hours, modified duties" | "Off Work" | "N/A"]

Case Summary – [Worker Name]
Worker: [Name]
Employer: [Company]
Injury Type: [Type/description]
Status: [Active/Closed - brief description]

**Where We Are Now**

**Claim Stage:**
- [Bullet point describing claim status]
- [Investigation details if applicable]
- [Investigator/case manager information]

**Medical:**
- [Current medical status]
- [Treatments/restrictions]
- [Medical clearance requirements]

**Employment / Placement:**
- [Return-to-work planning]
- [Placement status]
- [Draft RTW plan status]

**Documentation:**
- [Required documents status]
- [Missing items being followed up]

**Next Steps / Recommended Actions**

**For Worker (GPNet to coordinate):**
- [Action item]
- [Action item]

**For [Employer Name]:**
- [Action item]
- [Action item]

**For GPNet:**
- [Action item]
- [Action item]

**For [Claims Manager/System]:**
- [Action item]

**Overall Outlook**
[1-2 sentence summary of expected resolution path]

**CRITICAL RULES:**
1. Start with "Work Status Classification: [classification]" on the first line
2. Use exact section headers as shown
3. Write "Insufficient data provided" for any section where information is unavailable
4. Keep tone professional and action-oriented
5. Focus on compliance, risk factors, and actionable next steps`;
  }

  private buildUserPrompt(workerCase: WorkerCase): string {
    const notesSummary = this.formatDiscussionNotes(workerCase.latestDiscussionNotes);
    const insightSummary = this.formatDiscussionInsights(workerCase.discussionInsights);
    return `Analyze this worker's compensation case and generate a structured summary:

**Case Data:**
- Worker: ${workerCase.workerName}
- Company: ${workerCase.company}
- Date of Injury: ${workerCase.dateOfInjury}
- Risk Level: ${workerCase.riskLevel}
- Work Status: ${workerCase.workStatus}
- Compliance Indicator: ${workerCase.complianceIndicator}
- Current Status: ${workerCase.currentStatus}
- Next Step: ${workerCase.nextStep}
- Due Date: ${workerCase.dueDate}
- Has Certificate: ${workerCase.hasCertificate ? "Yes" : "No"}
- Ticket Count: ${workerCase.ticketCount} merged ticket(s)

**Case Description:**
${workerCase.summary}

**Latest Transcript Highlights:**
${notesSummary}

**Transcript Risk Insights:**
${insightSummary}

Generate the structured case summary following the required format.`;
  }

  private formatDiscussionNotes(notes?: CaseDiscussionNote[]): string {
    if (!notes || notes.length === 0) {
      return "No transcript discussions have been ingested yet.";
    }

    return notes
      .slice(0, 5)
      .map((note) => {
        const localized = new Date(note.timestamp).toLocaleString("en-AU", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const nextSteps = note.nextSteps?.length
          ? ` | Next: ${note.nextSteps.join("; ")}`
          : "";
        const risks = note.riskFlags?.length
          ? ` | Risks: ${note.riskFlags.join(", ")}`
          : "";
        return `- [${localized}] ${note.summary}${nextSteps}${risks}`;
      })
      .join("\n");
  }

  private formatDiscussionInsights(insights?: TranscriptInsight[]): string {
    if (!insights || insights.length === 0) {
      return "No transcript-derived risk insights yet.";
    }

    return insights
      .slice(0, 5)
      .map(
        (insight) =>
          `- [${insight.area.toUpperCase()} - ${insight.severity.toUpperCase()}] ${insight.summary}`,
      )
      .join("\n");
  }
}

export const summaryService = new SummaryService();
