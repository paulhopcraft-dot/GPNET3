/**
 * Plan Generator Service
 * GEN-01: Auto-select plan type based on restrictions and duty suitability
 * GEN-05: Include only suitable and suitable_with_modification duties
 * GEN-06: Exclude not_suitable duties with documented reason
 *
 * Determines RTW plan type based on worker restrictions and generates
 * duty assignments with appropriate suitability classifications.
 */

import type {
  FunctionalRestrictions,
  FunctionalRestrictionsExtracted,
  RTWDutyDB,
  InsertRTWPlanDuty,
} from "@shared/schema";
import type { SuitabilityLevel } from "./functionalAbilityCalculator";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * RTW Plan types based on WorkSafe Victoria guidance
 * - normal_hours: Full capacity work (8 hrs/day, 5 days/week)
 * - partial_hours: Fixed reduced hours with no duty restrictions
 * - graduated_return: Progressive increase in hours and/or duties
 */
export type PlanType = "normal_hours" | "partial_hours" | "graduated_return";

/**
 * Recommendation result from plan type analysis
 */
export interface PlanTypeRecommendation {
  planType: PlanType;
  reason: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

/**
 * Input for duty suitability analysis
 */
export interface DutySuitabilityInput {
  duty: RTWDutyDB;
  suitability: SuitabilityLevel;
  modificationSuggestions?: string[];
}

/**
 * Duty processing result for plan inclusion
 */
export interface DutyForPlan {
  dutyId: string;
  dutyName: string;
  suitability: SuitabilityLevel;
  modificationNotes: string | null;
  excludedReason: string | null;
  isIncluded: boolean;
}

// ============================================================================
// Plan Type Recommendation (GEN-01)
// ============================================================================

/**
 * GEN-01: Auto-select RTW plan type based on worker restrictions and duty suitability
 *
 * Decision logic:
 * - normal_hours: No hour restrictions AND >= 80% duties suitable
 * - partial_hours: Hour restrictions but >= 80% duties suitable
 * - graduated_return: Hour restrictions AND/OR < 80% duties suitable
 *
 * Source: WorkSafe Victoria return to work guidance
 *
 * @param restrictions - Worker's functional restrictions from medical certificate
 * @param dutySuitability - Array of duties with suitability assessments
 * @returns Plan type recommendation with reason and confidence
 */
export function recommendPlanType(
  restrictions: FunctionalRestrictions | FunctionalRestrictionsExtracted | null | undefined,
  dutySuitability: DutySuitabilityInput[]
): PlanTypeRecommendation {
  const warnings: string[] = [];

  // Handle missing restrictions - low confidence, default to graduated
  if (!restrictions) {
    warnings.push("No medical restrictions on file - using conservative graduated return approach");
    return {
      planType: "graduated_return",
      reason: "No restrictions available - defaulting to safest option",
      confidence: "low",
      warnings,
    };
  }

  // Handle empty duty list
  if (dutySuitability.length === 0) {
    warnings.push("No duties provided for analysis - plan type based on hour restrictions only");
    const hasHourRestrictions = checkHourRestrictions(restrictions);

    if (!hasHourRestrictions) {
      return {
        planType: "normal_hours",
        reason: "No hour restrictions found, but no duties to assess",
        confidence: "low",
        warnings,
      };
    }

    return {
      planType: "graduated_return",
      reason: "Hour restrictions present, no duties to assess - using conservative approach",
      confidence: "low",
      warnings,
    };
  }

  // Check hour restrictions from restrictions object
  const hasHourRestrictions = checkHourRestrictions(restrictions);

  // Calculate duty suitability percentages
  const totalDuties = dutySuitability.length;
  const suitableDuties = dutySuitability.filter(d => d.suitability === "suitable");
  const modificationDuties = dutySuitability.filter(d => d.suitability === "suitable_with_modification");
  const notSuitableDuties = dutySuitability.filter(d => d.suitability === "not_suitable");

  // Calculate suitable percentage (suitable + suitable_with_modification)
  const okDuties = suitableDuties.length + modificationDuties.length;
  const suitablePercentage = (okDuties / totalDuties) * 100;
  const fullySuitablePercentage = (suitableDuties.length / totalDuties) * 100;

  // Duty restrictions threshold: less than 80% OK = has duty restrictions
  const hasDutyRestrictions = suitablePercentage < 80;

  // Add warnings for edge cases
  if (modificationDuties.length > 0) {
    warnings.push(`${modificationDuties.length} duty/duties require workplace modifications`);
  }
  if (notSuitableDuties.length > 0) {
    warnings.push(`${notSuitableDuties.length} duty/duties not suitable and will be excluded`);
  }

  // Case 1: No significant restrictions - Normal hours
  if (!hasHourRestrictions && !hasDutyRestrictions) {
    if (fullySuitablePercentage === 100) {
      return {
        planType: "normal_hours",
        reason: "Worker can perform all duties at full hours (8 hours/day, 5 days/week)",
        confidence: "high",
        warnings,
      };
    }
    return {
      planType: "normal_hours",
      reason: `Worker can perform ${suitablePercentage.toFixed(0)}% of duties at full hours with minor modifications`,
      confidence: "medium",
      warnings,
    };
  }

  // Case 2: Hour restrictions only, duties OK - Partial hours
  if (hasHourRestrictions && !hasDutyRestrictions) {
    const extRestrictions = restrictions as FunctionalRestrictionsExtracted;
    const hoursInfo = extRestrictions.maxWorkHoursPerDay
      ? `${extRestrictions.maxWorkHoursPerDay} hours/day`
      : "reduced hours";
    const daysInfo = extRestrictions.maxWorkDaysPerWeek
      ? `${extRestrictions.maxWorkDaysPerWeek} days/week`
      : "";

    return {
      planType: "partial_hours",
      reason: `Worker can perform duties but hours restricted to ${hoursInfo}${daysInfo ? ", " + daysInfo : ""}`,
      confidence: "high",
      warnings,
    };
  }

  // Case 3: Duty restrictions OR significant combined restrictions - Graduated return
  if (hasDutyRestrictions || (hasHourRestrictions && suitablePercentage < 60)) {
    const reasons: string[] = [];

    if (hasHourRestrictions) {
      const extRestrictions = restrictions as FunctionalRestrictionsExtracted;
      const maxHours = extRestrictions.maxWorkHoursPerDay || "reduced";
      reasons.push(`Hours restricted to max ${maxHours}hrs/day`);
    }

    if (hasDutyRestrictions) {
      reasons.push(`Only ${suitablePercentage.toFixed(0)}% of duties fully suitable`);
    }

    return {
      planType: "graduated_return",
      reason: `Gradual increase recommended: ${reasons.join(", ")}`,
      confidence: "high",
      warnings,
    };
  }

  // Case 4: Mixed restrictions - Graduated return (safest default)
  return {
    planType: "graduated_return",
    reason: "Mixed restrictions present - gradual return recommended for safety",
    confidence: "medium",
    warnings: [...warnings, "Consider consulting treating practitioner for specific progression plan"],
  };
}

/**
 * Check if restrictions include hour limitations
 */
function checkHourRestrictions(
  restrictions: FunctionalRestrictions | FunctionalRestrictionsExtracted
): boolean {
  // Check extended restrictions for time limits
  const extRestrictions = restrictions as FunctionalRestrictionsExtracted;

  const maxHoursPerDay = extRestrictions.maxWorkHoursPerDay;
  const maxDaysPerWeek = extRestrictions.maxWorkDaysPerWeek;

  const hasHourRestriction = maxHoursPerDay !== null && maxHoursPerDay !== undefined && maxHoursPerDay < 8;
  const hasDayRestriction = maxDaysPerWeek !== null && maxDaysPerWeek !== undefined && maxDaysPerWeek < 5;

  return hasHourRestriction || hasDayRestriction;
}

// ============================================================================
// Duty Filtering (GEN-05, GEN-06)
// ============================================================================

/**
 * GEN-05, GEN-06: Filter duties for plan inclusion
 *
 * Rules:
 * - suitable: include without modification notes
 * - suitable_with_modification: include with modification notes
 * - not_suitable: exclude with documented reason
 *
 * @param dutySuitability - Array of duties with suitability assessments
 * @param includeModifications - Whether to include duties requiring modifications (default true)
 * @returns Array of duties with inclusion status and notes
 */
export function filterDutiesForPlan(
  dutySuitability: DutySuitabilityInput[],
  includeModifications: boolean = true
): DutyForPlan[] {
  return dutySuitability.map(({ duty, suitability, modificationSuggestions }) => {
    // GEN-05: Suitable - include without modification notes
    if (suitability === "suitable") {
      return {
        dutyId: duty.id,
        dutyName: duty.name,
        suitability,
        modificationNotes: null,
        excludedReason: null,
        isIncluded: true,
      };
    }

    // GEN-05: Suitable with modifications - include with notes if flag enabled
    if (suitability === "suitable_with_modification") {
      if (includeModifications) {
        // Build modification notes from suggestions
        const notes = modificationSuggestions && modificationSuggestions.length > 0
          ? modificationSuggestions.slice(0, 3).join("; ")
          : "Requires workplace modifications - see suitability assessment";

        return {
          dutyId: duty.id,
          dutyName: duty.name,
          suitability,
          modificationNotes: notes,
          excludedReason: null,
          isIncluded: true,
        };
      }

      // Modifications not allowed - exclude
      return {
        dutyId: duty.id,
        dutyName: duty.name,
        suitability,
        modificationNotes: null,
        excludedReason: "Modifications not available at this time",
        isIncluded: false,
      };
    }

    // GEN-06: Not suitable - exclude with documented reason
    return {
      dutyId: duty.id,
      dutyName: duty.name,
      suitability,
      modificationNotes: null,
      excludedReason: "Duty demands exceed worker functional restrictions - see suitability assessment for details",
      isIncluded: false,
    };
  });
}

// ============================================================================
// Plan Duty Generation
// ============================================================================

/**
 * Generate plan duty records for database insertion
 *
 * @param planVersionId - ID of the RTW plan version
 * @param filteredDuties - Array of filtered duties with inclusion status
 * @returns Array of InsertRTWPlanDuty objects for database
 */
export function generatePlanDuties(
  planVersionId: string,
  filteredDuties: DutyForPlan[]
): InsertRTWPlanDuty[] {
  return filteredDuties.map((duty) => ({
    planVersionId,
    dutyId: duty.dutyId,
    suitability: duty.suitability,
    modificationNotes: duty.modificationNotes,
    excludedReason: duty.excludedReason,
    manuallyOverridden: false,
    overrideReason: null,
    overriddenBy: null,
  }));
}
