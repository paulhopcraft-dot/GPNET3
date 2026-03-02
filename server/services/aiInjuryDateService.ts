/**
 * AI Injury Date Service - Claude API integration for complex text analysis
 *
 * Uses Claude 3 Haiku for fast, cost-effective extraction of injury dates
 * from unstructured text (emails, conversations, attachments).
 */

import { callClaude } from "../lib/claude-cli";
import { logger } from "../lib/logger";

export interface AIExtractionResult {
  date: Date | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  sourceText: string;
}

interface ClaudeResponse {
  date: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  sourceText: string;
}

export class AIInjuryDateService {
  public model = "claude-cli"; // Uses Max plan OAuth via CLI

  /**
   * Extract injury date from complex text using Claude AI
   */
  async extractDateFromComplexText(
    text: string,
    ticketCreatedDate: Date,
    workerName?: string,
    company?: string
  ): Promise<AIExtractionResult> {
    try {
      const prompt = this.buildExtractionPrompt(text, ticketCreatedDate, workerName, company);

      const responseText = await callClaude(prompt, 30_000);
      const parsedResult = this.parseAIResponse(responseText);

      logger.ai.info('AI injury date extraction completed', {
        model: this.model,
        hasDate: parsedResult.date !== null,
        confidence: parsedResult.confidence,
        reasoning: parsedResult.reasoning?.substring(0, 100),
        textLength: text.length,
        worker: workerName
      });

      return parsedResult;

    } catch (error) {
      logger.ai.error('AI extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: this.model,
        textLength: text.length,
        worker: workerName
      });

      // Return fallback result on error
      return {
        date: null,
        confidence: "low",
        reasoning: `AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sourceText: "Error occurred during AI processing"
      };
    }
  }

  /**
   * Build context-aware prompt for Claude
   */
  private buildExtractionPrompt(
    text: string,
    ticketCreatedDate: Date,
    workerName?: string,
    company?: string
  ): string {
    const ticketDateStr = ticketCreatedDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    return `Extract the injury date from this WorkCover claim text.

Context:
- Worker: ${workerName || 'Unknown'}
- Company: ${company || 'Unknown'}
- Ticket created: ${ticketDateStr}
- Today: ${todayStr}

Text to analyze:
"""
${text.substring(0, 2000)} ${text.length > 2000 ? '...[truncated]' : ''}
"""

Instructions:
1. Look for explicit injury dates ("accident on March 15", "injured 23/01/2025", "incident occurred on...")
2. Look for relative dates ("2 weeks ago", "last Friday", "yesterday") and calculate actual dates
3. Consider context clues (first aid dates, medical appointments, when symptoms started)
4. If multiple dates exist, prioritize the actual injury occurrence over reporting dates
5. The injury date should be logically before or on the ticket creation date
6. Be conservative - if uncertain, return low confidence

Confidence levels:
- HIGH: Explicit injury date with clear context ("injured on 15/03/2025")
- MEDIUM: Reasonable inference from context or relative dates
- LOW: Uncertain, multiple possibilities, or no clear date found

Response format (JSON only, no markdown):
{
  "date": "YYYY-MM-DD" or null,
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why this date was selected or why uncertain",
  "sourceText": "The specific text fragment containing the date or closest reference"
}`;
  }

  /**
   * Parse and validate Claude's JSON response
   */
  private parseAIResponse(responseText: string): AIExtractionResult {
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed: ClaudeResponse = JSON.parse(cleanedResponse);

      // Validate and convert date
      let date: Date | null = null;
      if (parsed.date) {
        const parsedDate = new Date(parsed.date);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        } else {
          logger.ai.warn('AI returned invalid date format', {
            rawDate: parsed.date,
            reasoning: parsed.reasoning
          });
        }
      }

      // Validate confidence level
      const validConfidenceLevels = ['high', 'medium', 'low'];
      const confidence = validConfidenceLevels.includes(parsed.confidence)
        ? parsed.confidence
        : 'low';

      return {
        date,
        confidence,
        reasoning: parsed.reasoning || 'No reasoning provided',
        sourceText: parsed.sourceText || 'No source text identified'
      };

    } catch (error) {
      logger.ai.error('Failed to parse AI response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseText: responseText.substring(0, 500)
      });

      return {
        date: null,
        confidence: "low",
        reasoning: "Failed to parse AI response",
        sourceText: "Response parsing error"
      };
    }
  }

  /**
   * Validate extracted date against business rules
   */
  private validateExtractedDate(
    date: Date,
    ticketCreatedDate: Date
  ): { isValid: boolean; adjustedConfidence: "high" | "medium" | "low"; reason?: string } {
    const now = new Date();
    const daysSinceCreation = (now.getTime() - ticketCreatedDate.getTime()) / (1000 * 60 * 60 * 24);

    // Date cannot be in the future (with 1 day tolerance)
    if (date > new Date(now.getTime() + 86400000)) {
      return {
        isValid: false,
        adjustedConfidence: "low",
        reason: "Date is in the future"
      };
    }

    // Date cannot be more than 5 years ago
    const yearsSinceInjury = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsSinceInjury > 5) {
      return {
        isValid: false,
        adjustedConfidence: "low",
        reason: "Date is more than 5 years ago"
      };
    }

    // Date should not be significantly before ticket creation (max 1 year)
    if (date < ticketCreatedDate) {
      const daysBetween = (ticketCreatedDate.getTime() - date.getTime()) / 86400000;
      if (daysBetween > 365) {
        return {
          isValid: false,
          adjustedConfidence: "low",
          reason: "Date is more than 1 year before ticket creation"
        };
      }
    }

    // If date is very close to ticket creation, it might be fallback behavior
    const daysBetweenCreation = Math.abs(date.getTime() - ticketCreatedDate.getTime()) / 86400000;
    if (daysBetweenCreation < 1) {
      return {
        isValid: true,
        adjustedConfidence: "medium", // Reduce confidence for dates very close to ticket creation
        reason: "Date is very close to ticket creation date"
      };
    }

    return {
      isValid: true,
      adjustedConfidence: "high"
    };
  }

  /**
   * Test the AI service with a sample text (for debugging)
   */
  async testExtraction(text: string): Promise<AIExtractionResult> {
    const testTicketDate = new Date('2025-01-21');
    return await this.extractDateFromComplexText(
      text,
      testTicketDate,
      'Test Worker',
      'Test Company'
    );
  }
}