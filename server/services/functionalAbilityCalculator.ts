/**
 * Functional Ability Calculator Service
 * FAM-01 to FAM-06: Core suitability calculation algorithm
 *
 * Compares worker functional restrictions against duty physical/cognitive demands
 * to determine suitability for return-to-work planning.
 *
 * U.S. Department of Labor frequency definitions:
 * - Never: Activity does not exist (0% of time)
 * - Occasionally: Up to 1/3 of time (0-33%)
 * - Frequently: 1/3 to 2/3 of time (33-67%)
 * - Constantly: 2/3 or more of time (67-100%)
 *
 * Source: https://www.dol.gov/sites/dolgov/files/owcp/dfec/regs/compliance/owcp-5c.pdf
 */

import type {
  DemandFrequency,
  RestrictionCapability,
  FunctionalRestrictions,
  RTWDutyDemandsDB,
} from "@shared/schema";
import { CAPABILITY_PRIORITY } from "./restrictionMapper";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Three-tier suitability output (FAM-02)
 * CRITICAL: This is the ONLY valid output type. Never undefined, null, or other values.
 */
export type SuitabilityLevel = "suitable" | "suitable_with_modification" | "not_suitable";

/**
 * Result of comparing a single demand against worker capability
 */
export interface DemandComparison {
  demand: string;
  frequency: DemandFrequency;
  capability: RestrictionCapability;
  match: SuitabilityLevel;
  reason: string;
}

/**
 * Full suitability calculation result
 */
export interface SuitabilityResult {
  overallSuitability: SuitabilityLevel;
  demandComparisons: DemandComparison[];
  modificationSuggestions: string[];
  reasons: string[];
  confidence: number; // 0-1 based on data completeness
  warnings: string[]; // Missing data warnings
}

// ============================================================================
// Single Demand Comparison
// ============================================================================

/**
 * Compare a single demand frequency against worker capability
 *
 * Logic:
 * - frequency "never" = always suitable (demand not required)
 * - capability "cannot" + frequency > "never" = not_suitable
 * - capability "can" = suitable
 * - capability "with_modifications" + frequency "occasionally" = suitable_with_modification
 * - capability "with_modifications" + frequency "frequently"/"constantly" = not_suitable
 * - capability "not_assessed" = suitable_with_modification (flag for review)
 */
export function compareDemandToCapability(
  demandName: string,
  frequency: DemandFrequency,
  capability: RestrictionCapability
): DemandComparison {
  // No demand = always suitable
  if (frequency === "never") {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable",
      reason: "Demand not required",
    };
  }

  // Worker cannot perform = not suitable (when demand exists)
  if (capability === "cannot") {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "not_suitable",
      reason: `Worker cannot perform ${demandName}, duty requires it ${frequency}`,
    };
  }

  // Worker can perform = always suitable
  if (capability === "can") {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable",
      reason: "Worker can perform without restriction",
    };
  }

  // Worker can perform with modifications
  if (capability === "with_modifications") {
    // Low frequency demands (occasionally) can be modified
    if (frequency === "occasionally") {
      return {
        demand: demandName,
        frequency,
        capability,
        match: "suitable_with_modification",
        reason: `${demandName} required occasionally - can be modified or assisted`,
      };
    }

    // High frequency demands (frequently/constantly) are too hard to modify
    return {
      demand: demandName,
      frequency,
      capability,
      match: "not_suitable",
      reason: `${demandName} required ${frequency} - too frequent to modify effectively`,
    };
  }

  // Not assessed = unknown risk, flag for modification review
  return {
    demand: demandName,
    frequency,
    capability,
    match: "suitable_with_modification",
    reason: `${demandName} capability not assessed - requires evaluation`,
  };
}

// ============================================================================
// Weight Limit Comparison
// ============================================================================

/**
 * Compare weight limits for lifting/carrying demands
 *
 * Logic:
 * - No duty weight or frequency "never" = use capability only
 * - restrictionMaxKg >= dutyMaxKg = suitable
 * - Difference <= 5kg + frequency "occasionally" = suitable_with_modification
 * - Otherwise = not_suitable
 */
export function compareWeightLimit(
  demandName: string,
  dutyMaxKg: number | null | undefined,
  restrictionMaxKg: number | null | undefined,
  frequency: DemandFrequency,
  capability: RestrictionCapability
): DemandComparison {
  // If demand has no weight or frequency is never, weight limit doesn't matter
  if (!dutyMaxKg || frequency === "never") {
    return compareDemandToCapability(demandName, frequency, capability);
  }

  // If worker has no weight restriction, use capability only
  if (restrictionMaxKg === null || restrictionMaxKg === undefined) {
    return compareDemandToCapability(demandName, frequency, capability);
  }

  // Compare weight limits
  if (restrictionMaxKg >= dutyMaxKg) {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable",
      reason: `Worker can ${demandName.toLowerCase()} up to ${restrictionMaxKg}kg (duty requires ${dutyMaxKg}kg)`,
    };
  }

  // Worker's limit is below duty requirement
  const difference = dutyMaxKg - restrictionMaxKg;
  if (difference <= 5 && frequency === "occasionally") {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable_with_modification",
      reason: `${demandName} ${dutyMaxKg}kg exceeds worker limit ${restrictionMaxKg}kg by ${difference}kg - can use mechanical aids`,
    };
  }

  return {
    demand: demandName,
    frequency,
    capability,
    match: "not_suitable",
    reason: `${demandName} ${dutyMaxKg}kg exceeds worker limit ${restrictionMaxKg}kg - difference too large to modify safely`,
  };
}

// ============================================================================
// Missing Data Handling
// ============================================================================

/**
 * Handle missing or null restriction data
 *
 * Best practices from occupational health:
 * - Use explicit "not_assessed" state rather than guessing
 * - Flag partial data for manual review
 * - Calculate confidence based on data completeness
 */
export function handleMissingRestrictions(
  restrictions: FunctionalRestrictions | null | undefined
): { restrictions: FunctionalRestrictions; confidence: number; warnings: string[] } {
  const warnings: string[] = [];

  // No restrictions at all = not assessed
  if (!restrictions) {
    warnings.push("No medical restrictions on file - all demands marked as not assessed");
    return {
      restrictions: createDefaultRestrictions(),
      confidence: 0,
      warnings,
    };
  }

  // Check for missing critical fields
  const criticalFields: (keyof FunctionalRestrictions)[] = [
    "lifting",
    "carrying",
    "bending",
    "standingWalking",
  ];
  const missingCritical = criticalFields.filter(
    (field) => restrictions[field] === "not_assessed"
  );

  if (missingCritical.length > 0) {
    warnings.push(`Critical restrictions not assessed: ${missingCritical.join(", ")}`);
  }

  // Calculate confidence based on completeness
  const capabilityFields: (keyof FunctionalRestrictions)[] = [
    "sitting",
    "standingWalking",
    "bending",
    "squatting",
    "kneelingClimbing",
    "twisting",
    "reachingOverhead",
    "reachingForward",
    "neckMovement",
    "lifting",
    "carrying",
    "pushing",
    "pulling",
    "repetitiveMovements",
    "useOfInjuredLimb",
  ];

  const assessedFields = capabilityFields.filter((field) => {
    const value = restrictions[field];
    return value !== "not_assessed" && value !== null && value !== undefined;
  });

  const confidence = assessedFields.length / capabilityFields.length;

  if (confidence < 0.5) {
    warnings.push("Less than 50% of restrictions assessed - results may be incomplete");
  }

  return {
    restrictions,
    confidence,
    warnings,
  };
}

/**
 * Handle missing demand data
 */
export function handleMissingDemands(
  demands: RTWDutyDemandsDB | null | undefined
): { demands: RTWDutyDemandsDB; warnings: string[] } {
  const warnings: string[] = [];

  // No demands = assume all "never" (safe default)
  if (!demands) {
    warnings.push("No demands specified for this duty - assuming no physical/cognitive requirements");
    return {
      demands: createDefaultDemands(),
      warnings,
    };
  }

  return { demands, warnings };
}

/**
 * Create default FunctionalRestrictions with all capabilities set to "not_assessed"
 */
function createDefaultRestrictions(): FunctionalRestrictions {
  return {
    sitting: "not_assessed",
    standingWalking: "not_assessed",
    bending: "not_assessed",
    squatting: "not_assessed",
    kneelingClimbing: "not_assessed",
    twisting: "not_assessed",
    reachingOverhead: "not_assessed",
    reachingForward: "not_assessed",
    neckMovement: "not_assessed",
    lifting: "not_assessed",
    liftingMaxKg: undefined,
    carrying: "not_assessed",
    carryingMaxKg: undefined,
    pushing: "not_assessed",
    pulling: "not_assessed",
    repetitiveMovements: "not_assessed",
    useOfInjuredLimb: "not_assessed",
    exerciseMinutesPerHour: undefined,
    restMinutesPerHour: undefined,
    constraintDurationWeeks: undefined,
    nextExaminationDate: undefined,
  };
}

/**
 * Create default demands with all frequencies set to "never"
 */
function createDefaultDemands(): RTWDutyDemandsDB {
  return {
    id: "",
    dutyId: "",
    bending: "never",
    squatting: "never",
    kneeling: "never",
    twisting: "never",
    reachingOverhead: "never",
    reachingForward: "never",
    lifting: "never",
    liftingMaxKg: null,
    carrying: "never",
    carryingMaxKg: null,
    standing: "never",
    sitting: "never",
    walking: "never",
    repetitiveMovements: "never",
    concentration: "never",
    stressTolerance: "never",
    workPace: "never",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Calculate suitability for a duty given worker restrictions
 *
 * FAM-02 CRITICAL: This function MUST return a valid SuitabilityResult
 * with overallSuitability being one of: "suitable", "suitable_with_modification", "not_suitable"
 * It must NEVER return undefined, null, or invalid states.
 *
 * @param dutyDemands - Physical and cognitive demands for the duty
 * @param restrictions - Worker's functional restrictions from medical certificate
 * @param isModifiable - Whether the duty can be modified
 * @returns SuitabilityResult with overallSuitability and detailed comparisons
 */
export function calculateDutySuitability(
  dutyDemands: RTWDutyDemandsDB | null | undefined,
  restrictions: FunctionalRestrictions | null | undefined,
  isModifiable: boolean
): SuitabilityResult {
  // Handle missing data
  const { demands, warnings: demandWarnings } = handleMissingDemands(dutyDemands);
  const { restrictions: safeRestrictions, confidence, warnings: restrictionWarnings } =
    handleMissingRestrictions(restrictions);

  const allWarnings = [...demandWarnings, ...restrictionWarnings];
  const comparisons: DemandComparison[] = [];

  // Physical demands - direct mappings
  comparisons.push(
    compareDemandToCapability(
      "Sitting",
      demands.sitting as DemandFrequency,
      safeRestrictions.sitting
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Standing",
      demands.standing as DemandFrequency,
      safeRestrictions.standingWalking
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Walking",
      demands.walking as DemandFrequency,
      safeRestrictions.standingWalking
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Bending",
      demands.bending as DemandFrequency,
      safeRestrictions.bending
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Squatting",
      demands.squatting as DemandFrequency,
      safeRestrictions.squatting
    )
  );
  // Note: demand "kneeling" maps to restriction "kneelingClimbing"
  comparisons.push(
    compareDemandToCapability(
      "Kneeling",
      demands.kneeling as DemandFrequency,
      safeRestrictions.kneelingClimbing
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Twisting",
      demands.twisting as DemandFrequency,
      safeRestrictions.twisting
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Reaching Overhead",
      demands.reachingOverhead as DemandFrequency,
      safeRestrictions.reachingOverhead
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Reaching Forward",
      demands.reachingForward as DemandFrequency,
      safeRestrictions.reachingForward
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Repetitive Movements",
      demands.repetitiveMovements as DemandFrequency,
      safeRestrictions.repetitiveMovements
    )
  );

  // Weight-dependent demands
  comparisons.push(
    compareWeightLimit(
      "Lifting",
      demands.liftingMaxKg,
      safeRestrictions.liftingMaxKg,
      demands.lifting as DemandFrequency,
      safeRestrictions.lifting
    )
  );
  comparisons.push(
    compareWeightLimit(
      "Carrying",
      demands.carryingMaxKg,
      safeRestrictions.carryingMaxKg,
      demands.carrying as DemandFrequency,
      safeRestrictions.carrying
    )
  );

  // Cognitive demands - default to "not_assessed" if missing from restrictions
  // Note: Cognitive fields aren't in FunctionalRestrictions, so we use not_assessed
  comparisons.push(
    compareDemandToCapability(
      "Concentration",
      demands.concentration as DemandFrequency,
      "not_assessed"
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Stress Tolerance",
      demands.stressTolerance as DemandFrequency,
      "not_assessed"
    )
  );
  comparisons.push(
    compareDemandToCapability(
      "Work Pace",
      demands.workPace as DemandFrequency,
      "not_assessed"
    )
  );

  // Count suitability levels
  const notSuitableCount = comparisons.filter((c) => c.match === "not_suitable").length;
  const withModificationCount = comparisons.filter(
    (c) => c.match === "suitable_with_modification"
  ).length;

  // Determine overall suitability
  // CRITICAL: This MUST always result in a valid SuitabilityLevel
  let overallSuitability: SuitabilityLevel;
  const reasons: string[] = [];

  if (notSuitableCount > 0) {
    if (!isModifiable) {
      // Duty cannot be modified - any not_suitable = overall not_suitable
      overallSuitability = "not_suitable";
      reasons.push(
        `${notSuitableCount} demand(s) exceed restrictions and duty is not modifiable`
      );
    } else if (notSuitableCount > 3) {
      // Too many mismatches to modify effectively
      overallSuitability = "not_suitable";
      reasons.push(
        `${notSuitableCount} demand(s) exceed restrictions - too many to modify effectively`
      );
    } else {
      // Duty is modifiable and has limited mismatches
      overallSuitability = "suitable_with_modification";
      reasons.push(`${notSuitableCount} demand(s) require modification`);
    }
  } else if (withModificationCount > 0) {
    overallSuitability = "suitable_with_modification";
    reasons.push(`${withModificationCount} demand(s) require minor accommodations`);
  } else {
    overallSuitability = "suitable";
    reasons.push("All demands within worker capabilities");
  }

  // Add specific reasons from not_suitable comparisons (limit to 3)
  const notSuitableReasons = comparisons
    .filter((c) => c.match === "not_suitable")
    .map((c) => c.reason);
  reasons.push(...notSuitableReasons.slice(0, 3));

  // GUARANTEE: Always return a valid result with valid SuitabilityLevel
  return {
    overallSuitability,
    demandComparisons: comparisons,
    modificationSuggestions: [], // Generated by modificationSuggester.ts
    reasons,
    confidence,
    warnings: allWarnings,
  };
}
