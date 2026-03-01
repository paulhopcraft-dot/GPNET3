import type { WorkerCase } from "@shared/schema";
import { storage } from "../storage";

export class LlamaSummaryService {
  private ollamaUrl = "http://localhost:11434"; // Default Ollama endpoint
  private model = "llama3.1:8b"; // Can be upgraded to :70b for better quality

  /**
   * Generate case summary using local Llama with domain-specific prompting
   */
  async getCachedOrGenerateSummary(caseId: string): Promise<{
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

    // Check if we need to refresh the summary
    const needsRefresh = await storage.needsSummaryRefresh(caseId, workerCase.organizationId);

    // If summary exists and doesn't need refresh, return cached version
    if (!needsRefresh && workerCase.aiSummary) {
      return {
        summary: workerCase.aiSummary,
        cached: true,
        generatedAt: workerCase.aiSummaryGeneratedAt,
        model: workerCase.aiSummaryModel || this.model,
        workStatusClassification: workerCase.aiWorkStatusClassification,
      };
    }

    try {
      // Generate new summary with Llama
      const result = await this.generateCaseSummary(workerCase);

      // Store in database
      await storage.updateAISummary(
        caseId,
        workerCase.organizationId,
        result.summary,
        this.model,
        result.workStatusClassification
      );

      return {
        summary: result.summary,
        cached: false,
        generatedAt: new Date().toISOString(),
        model: this.model,
        workStatusClassification: result.workStatusClassification,
      };
    } catch (error) {
      // Fallback to existing summary if available
      if (workerCase.aiSummary) {
        return {
          summary: workerCase.aiSummary + "\n\n⚠️ Summary may be outdated (AI service temporarily unavailable)",
          cached: true,
          generatedAt: workerCase.aiSummaryGeneratedAt,
          model: workerCase.aiSummaryModel || "unknown",
          workStatusClassification: workerCase.aiWorkStatusClassification,
        };
      }
      throw error;
    }
  }

  /**
   * Generate summary using Llama with few-shot prompting
   */
  private async generateCaseSummary(workerCase: WorkerCase): Promise<{
    summary: string;
    workStatusClassification: string;
  }> {
    const prompt = this.buildCaseSummaryPrompt(workerCase);

    const response = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower for more consistent output
          top_p: 0.9,
          max_tokens: 2000,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      summary: (data as any).response.trim(),
      workStatusClassification: workerCase.workStatus
    };
  }

  /**
   * Build domain-specific prompt with examples
   */
  private buildCaseSummaryPrompt(workerCase: WorkerCase): string {
    const caseData = this.formatCaseDataForPrompt(workerCase);

    return `You are an expert clinical case manager specializing in workers' compensation cases. Generate comprehensive, professional case summaries that help clinicians make informed decisions.

## SUMMARY STYLE GUIDE:
- Start with worker name and company
- Include injury timeline and current status
- Assess medical certificate status and validity
- Identify compliance risks and required actions
- Provide clear next steps
- Use professional medical terminology
- Include risk assessment
- Highlight urgent items with ⚠️ or ❌
- Mark positive items with ✅

## EXAMPLE SUMMARY:
**Worker:** Sarah Johnson | **Company:** TechCorp Industries
**Injury Date:** 15 Mar 2024 (6 weeks ago) | **Risk Level:** Medium

### Current Status
**Work Status:** Modified duties
**Medical Certificate:** ✅ Valid until 30 Apr 2024
**Compliance:** ⚠️ Follow-up overdue

### Medical Summary
Lower back strain with ongoing physiotherapy. Worker responding well to treatment with improved mobility noted in recent assessment. Work capacity assessment shows suitable for modified duties with restrictions: no lifting >10kg, seated work preferred.

### Actions Required
⚠️ **Schedule follow-up** - Due 3 days ago
• Review fitness for full duties in 2 weeks
• Workplace assessment for ergonomic improvements
• Monitor pain levels and functional capacity

### Risk Assessment
**Low-Medium Risk:** Good treatment compliance and positive response. Early RTW has reduced risk of prolonged absence. Workplace modifications appear effective.

**Estimated RTW:** Full duties expected within 3-4 weeks pending medical clearance.

## YOUR TASK:
Generate a summary for this case using the same professional style and format:

${caseData}

IMPORTANT: Focus on clinical insights, compliance risks, and actionable next steps. Be concise but comprehensive.`;
  }

  /**
   * Format case data for the prompt
   */
  private formatCaseDataForPrompt(workerCase: WorkerCase): string {
    const sections = [];

    // Basic case info
    sections.push(`**Worker:** ${workerCase.workerName}`);
    sections.push(`**Company:** ${workerCase.company}`);
    sections.push(`**Injury Date:** ${workerCase.dateOfInjury}`);
    sections.push(`**Risk Level:** ${workerCase.riskLevel}`);
    sections.push(`**Work Status:** ${workerCase.workStatus}`);

    // Medical certificate
    if (workerCase.hasCertificate && workerCase.latestCertificate) {
      const cert = workerCase.latestCertificate;
      sections.push(`**Certificate:** Valid from ${cert.startDate} to ${cert.endDate}`);
      if (cert.capacity) {
        sections.push(`**Work Capacity:** ${cert.capacity}`);
      }
      if (cert.restrictions) {
        sections.push(`**Restrictions:** ${cert.restrictions.join(', ')}`);
      }
    } else {
      sections.push(`**Certificate:** No certificate on file`);
    }

    // Current status and next steps
    if (workerCase.currentStatus) {
      sections.push(`**Current Status:** ${workerCase.currentStatus}`);
    }
    if (workerCase.nextStep) {
      sections.push(`**Next Step:** ${workerCase.nextStep}`);
    }

    // Case summary/notes
    if (workerCase.summary) {
      sections.push(`**Case Notes:** ${workerCase.summary}`);
    }

    // Recent discussions
    if (workerCase.latestDiscussionNotes && workerCase.latestDiscussionNotes.length > 0) {
      sections.push(`**Recent Discussion:**`);
      workerCase.latestDiscussionNotes.slice(0, 3).forEach((note, idx) => {
        sections.push(`${idx + 1}. ${note.timestamp}: ${note.rawText}`);
      });
    }

    // Compliance status
    sections.push(`**Compliance:** ${workerCase.complianceIndicator}`);

    return sections.join('\n');
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Install and setup Llama model if needed
   */
  async setupModel(): Promise<boolean> {
    try {
      // Check if model exists
      const tagsResponse = await fetch(`${this.ollamaUrl}/api/tags`);
      const tags = await tagsResponse.json();
      const hasModel = tags && typeof tags === 'object' && 'models' in tags && Array.isArray(tags.models) && tags.models.some((m: any) => m.name.includes('llama3.1'));

      if (!hasModel) {
        // Pull the model (this will take a while on first run)
        console.log('Downloading Llama 3.1 model (this may take 10-15 minutes)...');
        const pullResponse = await fetch(`${this.ollamaUrl}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.model })
        });

        if (!pullResponse.ok) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}