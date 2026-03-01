/**
 * Enhanced Injury Date Extraction Service
 *
 * 4-Layer extraction strategy:
 * 1. Custom Fields → High confidence, instant
 * 2. Enhanced Regex → Medium confidence, fast
 * 3. AI Text Analysis → Variable confidence, comprehensive
 * 4. Human Review Queue → Manual verification for uncertain cases
 */

import dayjs from 'dayjs';
import { validateInjuryDate, type DateValidationResult } from "../lib/dateValidation";
import { logger } from "../lib/logger";

export interface InjuryDateExtractionResult {
  date: Date | null;
  confidence: "high" | "medium" | "low";
  source: "verified" | "extracted" | "ai_extracted" | "fallback" | "unknown";
  extractionMethod: "custom_field" | "regex" | "ai_nlp" | "fallback";
  sourceText?: string; // Fragment where date was found
  aiReasoning?: string; // AI explanation when used
  requiresReview: boolean;
  validationResult?: DateValidationResult;
}

interface TicketContext {
  id: number;
  subject?: string;
  description_text?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  workerName?: string;
  company?: string;
}

export class InjuryDateExtractionService {

  /**
   * Main extraction orchestrator - tries all layers in sequence
   */
  async extractInjuryDate(
    ticket: TicketContext,
    conversationTexts: string[] = [],
    attachmentTexts: string[] = []
  ): Promise<InjuryDateExtractionResult> {
    const ticketCreatedDate = new Date(ticket.created_at);

    logger.freshdesk.debug('Starting injury date extraction', {
      ticketId: `FD-${ticket.id}`,
      worker: ticket.workerName,
      hasConversations: conversationTexts.length > 0,
      hasAttachments: attachmentTexts.length > 0
    });

    // Layer 1: Custom field extraction (highest confidence)
    const customFieldResult = this.extractFromCustomFields(ticket, ticketCreatedDate);
    if (customFieldResult.confidence === "high") {
      logger.freshdesk.debug('Custom field extraction successful', {
        ticketId: `FD-${ticket.id}`,
        date: customFieldResult.date?.toISOString().split('T')[0],
        confidence: customFieldResult.confidence
      });
      return customFieldResult;
    }

    // Layer 2: Enhanced regex extraction
    const allText = [
      ticket.subject || '',
      ticket.description_text || '',
      ...conversationTexts,
      ...attachmentTexts
    ].join(' ').trim();

    const regexResult = this.extractWithEnhancedRegex(allText, ticketCreatedDate);

    // If regex found high confidence result, use it
    if (regexResult.confidence === "high") {
      logger.freshdesk.debug('Regex extraction successful', {
        ticketId: `FD-${ticket.id}`,
        date: regexResult.date?.toISOString().split('T')[0],
        confidence: regexResult.confidence,
        sourceText: regexResult.sourceText?.substring(0, 100)
      });
      return regexResult;
    }

    // Layer 3: AI extraction for complex cases (if needed and enabled)
    if (this.shouldUseAI(allText, regexResult)) {
      try {
        const aiService = await import('./aiInjuryDateService');
        const aiInjuryDateService = new aiService.AIInjuryDateService();

        const aiResult = await aiInjuryDateService.extractDateFromComplexText(
          allText,
          ticketCreatedDate,
          ticket.workerName,
          ticket.company
        );

        if (aiResult.date) {
          const validation = validateInjuryDate(aiResult.date, ticketCreatedDate);
          const result: InjuryDateExtractionResult = {
            date: validation.isValid ? aiResult.date : null,
            confidence: validation.isValid ? aiResult.confidence : "low",
            source: "ai_extracted",
            extractionMethod: "ai_nlp",
            sourceText: aiResult.sourceText,
            aiReasoning: aiResult.reasoning,
            requiresReview: !validation.isValid || aiResult.confidence === "low",
            validationResult: validation
          };

          logger.freshdesk.info('AI extraction completed', {
            ticketId: `FD-${ticket.id}`,
            date: result.date?.toISOString().split('T')[0],
            confidence: result.confidence,
            requiresReview: result.requiresReview,
            reasoning: aiResult.reasoning?.substring(0, 200)
          });

          return result;
        }
      } catch (error) {
        logger.freshdesk.warn('AI extraction failed, falling back to regex result', {
          ticketId: `FD-${ticket.id}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Return best regex result or fallback
    if (regexResult.date) {
      logger.freshdesk.debug('Using regex extraction result', {
        ticketId: `FD-${ticket.id}`,
        confidence: regexResult.confidence
      });
      return regexResult;
    }

    // Layer 4: Fallback to ticket creation date
    const fallbackResult: InjuryDateExtractionResult = {
      date: ticketCreatedDate,
      confidence: "low",
      source: "fallback",
      extractionMethod: "fallback",
      sourceText: "Ticket creation date used as fallback",
      requiresReview: true,
      validationResult: validateInjuryDate(ticketCreatedDate, ticketCreatedDate)
    };

    logger.freshdesk.warn('No valid injury date found, using fallback', {
      ticketId: `FD-${ticket.id}`,
      fallbackDate: ticketCreatedDate.toISOString().split('T')[0]
    });

    return fallbackResult;
  }

  /**
   * Layer 1: Extract from custom fields (existing logic)
   */
  private extractFromCustomFields(ticket: TicketContext, ticketCreatedDate: Date): InjuryDateExtractionResult {
    if (ticket.custom_fields?.cf_injury_date) {
      const parsedDate = new Date(ticket.custom_fields.cf_injury_date);

      if (!isNaN(parsedDate.getTime())) {
        const validation = validateInjuryDate(parsedDate, ticketCreatedDate);

        if (validation.isValid) {
          return {
            date: parsedDate,
            confidence: "high",
            source: "verified",
            extractionMethod: "custom_field",
            sourceText: `Custom field: ${ticket.custom_fields.cf_injury_date}`,
            requiresReview: false,
            validationResult: validation
          };
        }
      }
    }

    return {
      date: null,
      confidence: "low",
      source: "unknown",
      extractionMethod: "custom_field",
      requiresReview: true
    };
  }

  /**
   * Layer 2: Enhanced regex extraction with better confidence scoring
   */
  private extractWithEnhancedRegex(text: string, ticketCreatedDate: Date): InjuryDateExtractionResult {
    if (!text.trim()) {
      return {
        date: null,
        confidence: "low",
        source: "unknown",
        extractionMethod: "regex",
        requiresReview: true
      };
    }

    const lowerText = text.toLowerCase();

    // High confidence patterns - explicit injury date phrases
    const highConfidencePatterns = [
      /(?:injured|accident|incident|occurred|happened)\s+(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:date\s+of\s+injury|injury\s+date|accident\s+date)[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(?:on|dated?)[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})[\s,].*(?:injur|accident|incident)/i
    ];

    for (const pattern of highConfidencePatterns) {
      const match = text.match(pattern);
      if (match) {
        const date = this.parseDate(match[1]);
        if (date) {
          const validation = validateInjuryDate(date, ticketCreatedDate);
          if (validation.isValid) {
            return {
              date,
              confidence: "high",
              source: "extracted",
              extractionMethod: "regex",
              sourceText: match[0],
              requiresReview: false,
              validationResult: validation
            };
          }
        }
      }
    }

    // Medium confidence patterns - relative dates and general patterns
    const mediumConfidencePatterns = [
      // Relative dates
      { pattern: /(\d+)\s*(?:or\s*\d+\s*)?months?\s*ago/i, type: 'months' },
      { pattern: /(\d+)\s*weeks?\s*ago/i, type: 'weeks' },
      { pattern: /(\d+)\s*days?\s*ago/i, type: 'days' },
      { pattern: /last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, type: 'last_weekday' },
      { pattern: /last\s+week/i, type: 'last_week' },
      { pattern: /last\s+month/i, type: 'last_month' }
    ];

    for (const { pattern, type } of mediumConfidencePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const date = this.parseRelativeDate(match, type);
        if (date) {
          const validation = validateInjuryDate(date, ticketCreatedDate);
          if (validation.isValid) {
            return {
              date,
              confidence: "medium",
              source: "extracted",
              extractionMethod: "regex",
              sourceText: match[0],
              requiresReview: validation.confidence === "low",
              validationResult: validation
            };
          }
        }
      }
    }

    // Standard date formats (existing logic enhanced)
    const dateFormats = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // DD/MM/YYYY, DD-MM-YYYY
      /(\d{4})-(\d{2})-(\d{2})/,                   // YYYY-MM-DD
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i // 15 Jan 2025
    ];

    for (const format of dateFormats) {
      const match = text.match(format);
      if (match) {
        const date = this.parseDate(match[0]);
        if (date) {
          const validation = validateInjuryDate(date, ticketCreatedDate);
          if (validation.isValid) {
            return {
              date,
              confidence: "medium",
              source: "extracted",
              extractionMethod: "regex",
              sourceText: match[0],
              requiresReview: validation.confidence === "low",
              validationResult: validation
            };
          }
        }
      }
    }

    return {
      date: null,
      confidence: "low",
      source: "unknown",
      extractionMethod: "regex",
      requiresReview: true
    };
  }

  /**
   * Smart decision tree for when to use AI
   */
  private shouldUseAI(text: string, regexResult: InjuryDateExtractionResult): boolean {
    // Check if AI extraction is enabled
    const AI_EXTRACTION_ENABLED = process.env.AI_EXTRACTION_ENABLED === 'true';
    if (!AI_EXTRACTION_ENABLED) {
      return false;
    }

    // Skip AI if regex found high confidence result
    if (regexResult.confidence === "high") {
      return false;
    }

    // Use AI for complex text (emails, long descriptions)
    if (text.includes("@") || text.length > 500) {
      return true;
    }

    // Use AI if regex found low confidence result and text has content
    if (regexResult.confidence === "low" && text.length > 100) {
      return true;
    }

    // Use AI for temporal language indicators
    const temporalKeywords = [
      "ago", "last", "previous", "since", "before", "after", "during", "while",
      "when", "at the time", "around", "approximately", "about", "earlier",
      "later", "yesterday", "today", "recently", "shortly"
    ];

    const lowerText = text.toLowerCase();
    if (temporalKeywords.some(keyword => lowerText.includes(keyword))) {
      return true;
    }

    // Use AI for medical/legal terminology that might contain dates
    const medicalLegalKeywords = [
      "medical certificate", "gp report", "doctor", "hospital", "emergency",
      "workcover", "claim", "incident report", "witness", "statement"
    ];

    if (medicalLegalKeywords.some(keyword => lowerText.includes(keyword))) {
      return true;
    }

    return false;
  }

  /**
   * Parse standard date formats
   */
  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    // Try DD/MM/YYYY or DD-MM-YYYY (Australian format)
    const ddmmMatch = dateString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (ddmmMatch) {
      const day = parseInt(ddmmMatch[1]);
      const month = parseInt(ddmmMatch[2]) - 1; // JS months are 0-indexed
      let year = parseInt(ddmmMatch[3]);
      if (year < 100) year += 2000; // Handle 2-digit years

      // Validate ranges
      if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) {
        return null;
      }

      // Additional validation for days per month
      const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day > daysInMonth[month]) {
        return null;
      }

      // Create date in UTC to avoid timezone issues
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime()) && date.getUTCDate() === day && date.getUTCMonth() === month) {
        return date;
      }
    }

    // Try ISO format (YYYY-MM-DD)
    const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1;
      const day = parseInt(isoMatch[3]);

      // Create date in UTC to avoid timezone issues
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try month name format (15 Jan 2025)
    const monthMatch = dateString.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i);
    if (monthMatch) {
      const day = parseInt(monthMatch[1]);
      const monthStr = monthMatch[2].toLowerCase();
      const year = parseInt(monthMatch[3]);

      // Validate day/month/year ranges
      if (day < 1 || day > 31 || year < 1900 || year > 2100) {
        return null;
      }

      const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };

      const month = monthMap[monthStr];
      if (month !== undefined) {
        // Additional validation for days per month
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day > daysInMonth[month]) {
          return null;
        }

        // Create date in UTC to avoid timezone issues
        const date = new Date(Date.UTC(year, month, day));
        if (!isNaN(date.getTime()) && date.getUTCDate() === day) {
          return date;
        }
      }
    }

    // Try month name format (January 15th, 2025)
    const monthNameMatch = dateString.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?/i);
    if (monthNameMatch) {
      const monthStr = monthNameMatch[1].toLowerCase();
      const day = parseInt(monthNameMatch[2]);
      let year = monthNameMatch[3] ? parseInt(monthNameMatch[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;

      // Validate day/year ranges
      if (day < 1 || day > 31 || year < 1900 || year > 2100) {
        return null;
      }

      const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };

      const month = monthMap[monthStr];
      if (month !== undefined) {
        // Additional validation for days per month
        const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (day > daysInMonth[month]) {
          return null;
        }

        // Create date in UTC to avoid timezone issues
        const date = new Date(Date.UTC(year, month, day));
        if (!isNaN(date.getTime()) && date.getUTCDate() === day) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Parse relative dates like "2 weeks ago", "last Friday"
   */
  private parseRelativeDate(match: RegExpMatchArray, type: string): Date | null {
    const now = dayjs();

    switch (type) {
      case 'months':
        const months = parseInt(match[1]);
        return now.subtract(months, 'month').toDate();

      case 'weeks':
        const weeks = parseInt(match[1]);
        return now.subtract(weeks, 'week').toDate();

      case 'days':
        const days = parseInt(match[1]);
        return now.subtract(days, 'day').toDate();

      case 'last_week':
        return now.subtract(1, 'week').toDate();

      case 'last_month':
        return now.subtract(1, 'month').toDate();

      case 'last_weekday':
        const weekday = match[1].toLowerCase();
        const weekdayMap: Record<string, number> = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };

        const targetDay = weekdayMap[weekday];
        if (targetDay !== undefined) {
          const daysBack = (7 + now.day() - targetDay) % 7 || 7;
          return now.subtract(daysBack, 'day').toDate();
        }
        break;
    }

    return null;
  }
}