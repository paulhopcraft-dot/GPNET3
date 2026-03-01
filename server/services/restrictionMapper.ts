/**
 * Restriction Mapper Service
 * Implements MED-10: Multi-certificate aggregation with "most restrictive wins" logic
 *
 * Priority order: cannot (3) > with_modifications (2) > can (1) > not_assessed (0)
 * Weight limits: minimum value (lower = more restrictive)
 * Time limits: maximum value (more rest = more restrictive)
 * Review dates: earliest date (soonest review = most restrictive)
 */

import type { FunctionalRestrictions, RestrictionCapability } from "@shared/schema";

/**
 * Priority mapping for restriction capabilities
 * Higher number = more restrictive
 */
export const CAPABILITY_PRIORITY: Record<RestrictionCapability, number> = {
  cannot: 3,
  with_modifications: 2,
  can: 1,
  not_assessed: 0,
};

/**
 * Reverse mapping from priority to capability
 */
const PRIORITY_TO_CAPABILITY: Record<number, RestrictionCapability> = {
  3: "cannot",
  2: "with_modifications",
  1: "can",
  0: "not_assessed",
};

/**
 * Get the most restrictive capability from an array of capabilities
 *
 * @param capabilities - Array of RestrictionCapability values
 * @returns The most restrictive capability (highest priority)
 */
export function getMostRestrictive(capabilities: (RestrictionCapability | undefined | null)[]): RestrictionCapability {
  // Filter out null/undefined values
  const validCapabilities = capabilities.filter(
    (cap): cap is RestrictionCapability => cap !== null && cap !== undefined
  );

  // Handle empty array case
  if (validCapabilities.length === 0) {
    return "not_assessed";
  }

  // Find the highest priority (most restrictive)
  let highestPriority = 0;
  for (const cap of validCapabilities) {
    const priority = CAPABILITY_PRIORITY[cap];
    if (priority > highestPriority) {
      highestPriority = priority;
    }
  }

  return PRIORITY_TO_CAPABILITY[highestPriority];
}

/**
 * Get the minimum non-null value from an array of numbers
 * Used for weight limits where lower = more restrictive
 *
 * @param values - Array of number values (may include null/undefined)
 * @returns The minimum value, or null if no valid values
 */
function getMinimumNonNull(values: (number | undefined | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null && v !== undefined);

  if (validValues.length === 0) {
    return null;
  }

  return Math.min(...validValues);
}

/**
 * Get the maximum non-null value from an array of numbers
 * Used for rest requirements where more rest = more restrictive
 *
 * @param values - Array of number values (may include null/undefined)
 * @returns The maximum value, or null if no valid values
 */
function getMaximumNonNull(values: (number | undefined | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null && v !== undefined);

  if (validValues.length === 0) {
    return null;
  }

  return Math.max(...validValues);
}

/**
 * Get the earliest date from an array of date strings
 * Used for next examination date where sooner = more restrictive
 *
 * @param dates - Array of ISO date strings (may include null/undefined)
 * @returns The earliest date as ISO string, or undefined if no valid dates
 */
function getEarliestDate(dates: (string | undefined | null)[]): string | undefined {
  const validDates = dates
    .filter((d): d is string => d !== null && d !== undefined && d.trim() !== "")
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()));

  if (validDates.length === 0) {
    return undefined;
  }

  // Find earliest date
  let earliest = validDates[0];
  for (const date of validDates) {
    if (date < earliest) {
      earliest = date;
    }
  }

  return earliest.toISOString();
}

/**
 * Combine multiple FunctionalRestrictions objects using "most restrictive wins" logic
 *
 * MED-10: When multiple certificates have overlapping validity periods,
 * combine their restrictions using the most restrictive value for each field.
 *
 * @param restrictionsList - Array of FunctionalRestrictions objects to combine
 * @returns Single FunctionalRestrictions with the most restrictive values
 */
export function combineRestrictions(restrictionsList: FunctionalRestrictions[]): FunctionalRestrictions {
  // Handle empty array case
  if (restrictionsList.length === 0) {
    return createDefaultRestrictions();
  }

  // Handle single restriction case - return as-is
  if (restrictionsList.length === 1) {
    return restrictionsList[0];
  }

  // Combine using most restrictive logic
  return {
    // Physical capabilities - use most restrictive capability
    sitting: getMostRestrictive(restrictionsList.map((r) => r.sitting)),
    standingWalking: getMostRestrictive(restrictionsList.map((r) => r.standingWalking)),
    bending: getMostRestrictive(restrictionsList.map((r) => r.bending)),
    squatting: getMostRestrictive(restrictionsList.map((r) => r.squatting)),
    kneelingClimbing: getMostRestrictive(restrictionsList.map((r) => r.kneelingClimbing)),
    twisting: getMostRestrictive(restrictionsList.map((r) => r.twisting)),
    reachingOverhead: getMostRestrictive(restrictionsList.map((r) => r.reachingOverhead)),
    reachingForward: getMostRestrictive(restrictionsList.map((r) => r.reachingForward)),
    neckMovement: getMostRestrictive(restrictionsList.map((r) => r.neckMovement)),

    // Lifting - most restrictive capability + minimum weight
    lifting: getMostRestrictive(restrictionsList.map((r) => r.lifting)),
    liftingMaxKg: getMinimumNonNull(restrictionsList.map((r) => r.liftingMaxKg)) ?? undefined,

    // Carrying - most restrictive capability + minimum weight
    carrying: getMostRestrictive(restrictionsList.map((r) => r.carrying)),
    carryingMaxKg: getMinimumNonNull(restrictionsList.map((r) => r.carryingMaxKg)) ?? undefined,

    // Other physical capabilities
    pushing: getMostRestrictive(restrictionsList.map((r) => r.pushing)),
    pulling: getMostRestrictive(restrictionsList.map((r) => r.pulling)),
    repetitiveMovements: getMostRestrictive(restrictionsList.map((r) => r.repetitiveMovements)),
    useOfInjuredLimb: getMostRestrictive(restrictionsList.map((r) => r.useOfInjuredLimb)),

    // Time requirements - use maximum (more rest = more restrictive)
    exerciseMinutesPerHour: getMaximumNonNull(restrictionsList.map((r) => r.exerciseMinutesPerHour)) ?? undefined,
    restMinutesPerHour: getMaximumNonNull(restrictionsList.map((r) => r.restMinutesPerHour)) ?? undefined,

    // Duration and review - use minimum weeks (shorter duration = more cautious)
    constraintDurationWeeks: getMinimumNonNull(restrictionsList.map((r) => r.constraintDurationWeeks)) ?? undefined,

    // Next examination - use earliest date (sooner review = more restrictive)
    nextExaminationDate: getEarliestDate(restrictionsList.map((r) => r.nextExaminationDate)),
  };
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
