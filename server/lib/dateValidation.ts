/**
 * Date Validation Utilities
 *
 * Provides sanity checks for injury dates to prevent obviously incorrect dates
 * from being stored in the database.
 */

export interface DateValidationResult {
  isValid: boolean;
  reason?: string;
  confidence: "high" | "medium" | "low";
  source: "verified" | "extracted" | "fallback" | "unknown";
}

/**
 * Validate an injury date against sanity checks
 *
 * @param date - The date to validate
 * @param ticketCreatedDate - The date the ticket was created
 * @returns Validation result with reason if invalid
 */
export function validateInjuryDate(
  date: Date | null | undefined,
  ticketCreatedDate: Date
): DateValidationResult {
  if (!date) {
    return {
      isValid: false,
      reason: "Date is null or undefined",
      confidence: "low",
      source: "unknown",
    };
  }

  const now = new Date();
  const yearsSinceInjury = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);

  // Check 1: Date must not be more than 1 day in the future
  const oneDayInMs = 86400000;
  if (date > now && (date.getTime() - now.getTime()) > oneDayInMs) {
    return {
      isValid: false,
      reason: `Date is more than 1 day in the future (${date.toISOString().split('T')[0]})`,
      confidence: "low",
      source: "unknown",
    };
  }

  // Check 2: Date must not be more than 5 years ago
  if (yearsSinceInjury > 5) {
    return {
      isValid: false,
      reason: `Date is more than 5 years ago (${Math.floor(yearsSinceInjury)} years)`,
      confidence: "low",
      source: "unknown",
    };
  }

  // Check 3: Date must not be before 2020 (system wasn't in use)
  if (date.getFullYear() < 2020) {
    return {
      isValid: false,
      reason: `Date is before 2020 (${date.getFullYear()})`,
      confidence: "low",
      source: "unknown",
    };
  }

  // Check 4: Date must not be before ticket creation by more than 1 year
  // (injuries can be reported after they occur, but not by too much)
  if (date < ticketCreatedDate) {
    const daysBetween = (ticketCreatedDate.getTime() - date.getTime()) / 86400000;
    if (daysBetween > 365) {
      return {
        isValid: false,
        reason: `Date is more than 1 year before ticket creation (${Math.floor(daysBetween)} days)`,
        confidence: "low",
        source: "unknown",
      };
    }
  }

  // Check 5: Malformed year (like "0202" instead of "2025")
  if (date.getFullYear() < 1000) {
    return {
      isValid: false,
      reason: `Malformed year (${date.getFullYear()})`,
      confidence: "low",
      source: "unknown",
    };
  }

  // Date passed all checks
  return {
    isValid: true,
    confidence: "medium",
    source: "extracted",
  };
}

/**
 * Determine data quality for an injury date
 *
 * @param date - The injury date
 * @param ticketCreatedDate - The ticket creation date
 * @param extractedFromText - Whether the date was extracted from case text
 * @returns Data quality assessment
 */
export function assessDateQuality(
  date: Date,
  ticketCreatedDate: Date,
  extractedFromText: boolean
): { confidence: "high" | "medium" | "low"; source: "verified" | "extracted" | "fallback" | "unknown" } {
  const validation = validateInjuryDate(date, ticketCreatedDate);

  if (!validation.isValid) {
    return { confidence: "low", source: "unknown" };
  }

  // If extracted from text and passes validation, medium confidence
  if (extractedFromText) {
    return { confidence: "medium", source: "extracted" };
  }

  // If same as ticket creation date, it's likely a fallback
  const sameDay = Math.abs(date.getTime() - ticketCreatedDate.getTime()) < 86400000;
  if (sameDay) {
    return { confidence: "low", source: "fallback" };
  }

  // Otherwise, medium confidence extracted
  return { confidence: "medium", source: "extracted" };
}

/**
 * Format a date with quality indicator
 *
 * @param date - The date to format
 * @param source - The data source
 * @param confidence - The confidence level
 * @returns Formatted string with emoji indicator
 */
export function formatDateWithQuality(
  date: Date | null,
  source: "verified" | "extracted" | "fallback" | "unknown",
  confidence: "high" | "medium" | "low"
): string {
  if (!date) return "Unknown ❓";

  const dateStr = date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const indicators = {
    verified: "✅",
    extracted: "⚠️",
    fallback: "❌",
    unknown: "❓",
  };

  return `${dateStr} ${indicators[source]}`;
}
