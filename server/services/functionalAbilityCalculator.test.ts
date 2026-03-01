/**
 * Unit Tests for Functional Ability Calculator
 * Covers FAM-01 to FAM-07 requirements with emphasis on FAM-02 verification
 *
 * FAM-02 CRITICAL: calculateDutySuitability MUST only return valid SuitabilityLevel values
 * Tests explicitly verify the function never returns undefined, null, or invalid states.
 */

import { describe, it, expect } from "vitest";
import {
  calculateDutySuitability,
  compareDemandToCapability,
  compareWeightLimit,
  handleMissingRestrictions,
  handleMissingDemands,
  SuitabilityLevel,
  DemandComparison,
  SuitabilityResult,
} from "./functionalAbilityCalculator";
import { generateModificationSuggestions } from "./modificationSuggester";
import type {
  FunctionalRestrictions,
  RTWDutyDemandsDB,
  RestrictionCapability,
  DemandFrequency,
} from "@shared/schema";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockDemands(overrides: Partial<RTWDutyDemandsDB> = {}): RTWDutyDemandsDB {
  return {
    id: "test-demands-1",
    dutyId: "test-duty-1",
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
    ...overrides,
  };
}

function createMockRestrictions(
  overrides: Partial<FunctionalRestrictions> = {}
): FunctionalRestrictions {
  return {
    sitting: "can",
    standingWalking: "can",
    bending: "can",
    squatting: "can",
    kneelingClimbing: "can",
    twisting: "can",
    reachingOverhead: "can",
    reachingForward: "can",
    neckMovement: "can",
    lifting: "can",
    liftingMaxKg: undefined,
    carrying: "can",
    carryingMaxKg: undefined,
    pushing: "can",
    pulling: "can",
    repetitiveMovements: "can",
    useOfInjuredLimb: "can",
    exerciseMinutesPerHour: undefined,
    restMinutesPerHour: undefined,
    constraintDurationWeeks: undefined,
    nextExaminationDate: undefined,
    ...overrides,
  };
}

// ============================================================================
// FAM-02: Suitability Output Type Verification (CRITICAL)
// ============================================================================

describe("FAM-02: Suitability Output Type Verification", () => {
  const validSuitabilityValues: SuitabilityLevel[] = [
    "suitable",
    "suitable_with_modification",
    "not_suitable",
  ];

  it("should only return valid SuitabilityLevel values", () => {
    const result = calculateDutySuitability(
      createMockDemands(),
      createMockRestrictions(),
      true
    );

    expect(validSuitabilityValues).toContain(result.overallSuitability);
    expect(result.overallSuitability).not.toBeUndefined();
    expect(result.overallSuitability).not.toBeNull();
  });

  it("should not return undefined or null for overallSuitability", () => {
    const result = calculateDutySuitability(
      createMockDemands(),
      createMockRestrictions(),
      false
    );

    expect(result.overallSuitability).toBeDefined();
    expect(result.overallSuitability).not.toBe(undefined);
    expect(result.overallSuitability).not.toBe(null);
    expect(typeof result.overallSuitability).toBe("string");
  });

  it("should return valid suitability with empty demands", () => {
    const result = calculateDutySuitability(null, createMockRestrictions(), true);

    expect(validSuitabilityValues).toContain(result.overallSuitability);
    expect(result.overallSuitability).not.toBeUndefined();
  });

  it("should return valid suitability with null restrictions", () => {
    const result = calculateDutySuitability(createMockDemands(), null, true);

    expect(validSuitabilityValues).toContain(result.overallSuitability);
    expect(result.overallSuitability).not.toBeUndefined();
  });

  it("should return valid suitability with both null inputs", () => {
    const result = calculateDutySuitability(null, null, true);

    expect(validSuitabilityValues).toContain(result.overallSuitability);
    expect(result.overallSuitability).not.toBeUndefined();
  });

  it("should return valid suitability with undefined inputs", () => {
    const result = calculateDutySuitability(undefined, undefined, false);

    expect(validSuitabilityValues).toContain(result.overallSuitability);
    expect(result.overallSuitability).not.toBeUndefined();
  });

  it("should have valid SuitabilityLevel for all demandComparisons", () => {
    const demands = createMockDemands({
      sitting: "frequently",
      standing: "constantly",
      lifting: "occasionally",
    });
    const restrictions = createMockRestrictions({
      sitting: "with_modifications",
      standingWalking: "cannot",
      lifting: "can",
    });

    const result = calculateDutySuitability(demands, restrictions, true);

    for (const comparison of result.demandComparisons) {
      expect(validSuitabilityValues).toContain(comparison.match);
      expect(comparison.match).not.toBeUndefined();
      expect(comparison.match).not.toBeNull();
    }
  });

  it("should return a complete SuitabilityResult object", () => {
    const result = calculateDutySuitability(
      createMockDemands(),
      createMockRestrictions(),
      true
    );

    // Verify all required properties exist
    expect(result).toHaveProperty("overallSuitability");
    expect(result).toHaveProperty("demandComparisons");
    expect(result).toHaveProperty("modificationSuggestions");
    expect(result).toHaveProperty("reasons");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("warnings");

    // Verify types
    expect(Array.isArray(result.demandComparisons)).toBe(true);
    expect(Array.isArray(result.modificationSuggestions)).toBe(true);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(typeof result.confidence).toBe("number");
  });
});

// ============================================================================
// compareDemandToCapability Tests
// ============================================================================

describe("compareDemandToCapability", () => {
  it("should return suitable when frequency is never (demand not required)", () => {
    const result = compareDemandToCapability("Lifting", "never", "cannot");
    expect(result.match).toBe("suitable");
    expect(result.reason).toContain("not required");
  });

  it("should return not_suitable when capability is cannot and frequency > never", () => {
    const result = compareDemandToCapability("Lifting", "frequently", "cannot");
    expect(result.match).toBe("not_suitable");
    expect(result.reason).toContain("cannot perform");
  });

  it("should return not_suitable for cannot + occasionally", () => {
    const result = compareDemandToCapability("Bending", "occasionally", "cannot");
    expect(result.match).toBe("not_suitable");
  });

  it("should return suitable when capability is can", () => {
    const result = compareDemandToCapability("Standing", "constantly", "can");
    expect(result.match).toBe("suitable");
    expect(result.reason).toContain("without restriction");
  });

  it("should return suitable_with_modification for with_modifications + occasionally", () => {
    const result = compareDemandToCapability("Bending", "occasionally", "with_modifications");
    expect(result.match).toBe("suitable_with_modification");
    expect(result.reason).toContain("can be modified");
  });

  it("should return not_suitable for with_modifications + frequently", () => {
    const result = compareDemandToCapability("Lifting", "frequently", "with_modifications");
    expect(result.match).toBe("not_suitable");
    expect(result.reason).toContain("too frequent to modify");
  });

  it("should return not_suitable for with_modifications + constantly", () => {
    const result = compareDemandToCapability("Standing", "constantly", "with_modifications");
    expect(result.match).toBe("not_suitable");
    expect(result.reason).toContain("too frequent to modify");
  });

  it("should return suitable_with_modification for not_assessed (unknown risk)", () => {
    const result = compareDemandToCapability("Twisting", "frequently", "not_assessed");
    expect(result.match).toBe("suitable_with_modification");
    expect(result.reason).toContain("not assessed");
  });
});

// ============================================================================
// compareWeightLimit Tests
// ============================================================================

describe("compareWeightLimit", () => {
  it("should return suitable when worker limit >= duty requirement", () => {
    const result = compareWeightLimit("Lifting", 15, 20, "occasionally", "can");
    expect(result.match).toBe("suitable");
    expect(result.reason).toContain("20kg");
    expect(result.reason).toContain("15kg");
  });

  it("should return not_suitable when worker limit < duty requirement, frequently", () => {
    const result = compareWeightLimit("Lifting", 20, 10, "frequently", "can");
    expect(result.match).toBe("not_suitable");
    expect(result.reason).toContain("exceeds worker limit");
  });

  it("should return suitable_with_modification for small difference (5kg) + occasionally", () => {
    const result = compareWeightLimit("Carrying", 20, 15, "occasionally", "can");
    expect(result.match).toBe("suitable_with_modification");
    expect(result.reason).toContain("mechanical aids");
  });

  it("should return not_suitable for large difference even if occasionally", () => {
    const result = compareWeightLimit("Lifting", 30, 10, "occasionally", "can");
    expect(result.match).toBe("not_suitable");
    expect(result.reason).toContain("too large to modify");
  });

  it("should use capability only when duty has no weight", () => {
    const result = compareWeightLimit("Lifting", null, 20, "frequently", "can");
    expect(result.match).toBe("suitable"); // can = suitable
  });

  it("should use capability only when worker has no weight restriction", () => {
    const result = compareWeightLimit("Lifting", 15, null, "frequently", "cannot");
    expect(result.match).toBe("not_suitable"); // cannot = not_suitable
  });

  it("should return suitable when frequency is never (ignore weight)", () => {
    const result = compareWeightLimit("Lifting", 50, 10, "never", "cannot");
    expect(result.match).toBe("suitable"); // demand not required
  });
});

// ============================================================================
// calculateDutySuitability Tests
// ============================================================================

describe("calculateDutySuitability", () => {
  it("should return suitable when all capabilities are can and frequencies are low", () => {
    const demands = createMockDemands({ sitting: "occasionally" });
    const restrictions = createMockRestrictions();

    const result = calculateDutySuitability(demands, restrictions, true);
    expect(result.overallSuitability).toBe("suitable");
  });

  it("should return not_suitable when cannot on frequently required demand + not modifiable", () => {
    const demands = createMockDemands({ standing: "frequently" });
    const restrictions = createMockRestrictions({ standingWalking: "cannot" });

    const result = calculateDutySuitability(demands, restrictions, false);
    expect(result.overallSuitability).toBe("not_suitable");
    expect(result.reasons[0]).toContain("not modifiable");
  });

  it("should return suitable_with_modification when cannot on frequently + duty is modifiable", () => {
    const demands = createMockDemands({ standing: "frequently" });
    const restrictions = createMockRestrictions({ standingWalking: "cannot" });

    const result = calculateDutySuitability(demands, restrictions, true);
    expect(result.overallSuitability).toBe("suitable_with_modification");
  });

  it("should return not_suitable when more than 3 demands are not_suitable (too many to modify)", () => {
    const demands = createMockDemands({
      sitting: "frequently",
      standing: "frequently",
      bending: "frequently",
      squatting: "frequently",
      kneeling: "frequently",
    });
    const restrictions = createMockRestrictions({
      sitting: "cannot",
      standingWalking: "cannot",
      bending: "cannot",
      squatting: "cannot",
      kneelingClimbing: "cannot",
    });

    const result = calculateDutySuitability(demands, restrictions, true);
    expect(result.overallSuitability).toBe("not_suitable");
    expect(result.reasons[0]).toContain("too many");
  });

  it("should return suitable_with_modification for cognitive demands (default not_assessed)", () => {
    const demands = createMockDemands({
      concentration: "frequently",
      stressTolerance: "occasionally",
    });
    const restrictions = createMockRestrictions();

    const result = calculateDutySuitability(demands, restrictions, true);
    expect(result.overallSuitability).toBe("suitable_with_modification");
  });

  it("should map kneeling demand to kneelingClimbing restriction", () => {
    const demands = createMockDemands({ kneeling: "frequently" });
    const restrictions = createMockRestrictions({ kneelingClimbing: "cannot" });

    const result = calculateDutySuitability(demands, restrictions, false);
    expect(result.overallSuitability).toBe("not_suitable");

    const kneelingComparison = result.demandComparisons.find((c) => c.demand === "Kneeling");
    expect(kneelingComparison).toBeDefined();
    expect(kneelingComparison?.capability).toBe("cannot");
  });

  it("should map both standing and walking to standingWalking restriction", () => {
    const demands = createMockDemands({
      standing: "frequently",
      walking: "occasionally",
    });
    const restrictions = createMockRestrictions({ standingWalking: "with_modifications" });

    const result = calculateDutySuitability(demands, restrictions, true);

    const standingComparison = result.demandComparisons.find((c) => c.demand === "Standing");
    const walkingComparison = result.demandComparisons.find((c) => c.demand === "Walking");

    expect(standingComparison?.capability).toBe("with_modifications");
    expect(walkingComparison?.capability).toBe("with_modifications");
  });

  it("should include weight limit comparison for lifting", () => {
    const demands = createMockDemands({
      lifting: "occasionally",
      liftingMaxKg: 25,
    });
    const restrictions = createMockRestrictions({
      lifting: "can",
      liftingMaxKg: 10,
    });

    const result = calculateDutySuitability(demands, restrictions, true);

    const liftingComparison = result.demandComparisons.find((c) => c.demand === "Lifting");
    expect(liftingComparison).toBeDefined();
    expect(liftingComparison?.match).toBe("not_suitable"); // 25kg > 10kg + >5kg diff
  });
});

// ============================================================================
// handleMissingRestrictions Tests
// ============================================================================

describe("handleMissingRestrictions", () => {
  it("should return all not_assessed with confidence 0 when restrictions is null", () => {
    const { restrictions, confidence, warnings } = handleMissingRestrictions(null);

    expect(confidence).toBe(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("No medical restrictions");
    expect(restrictions.sitting).toBe("not_assessed");
    expect(restrictions.lifting).toBe("not_assessed");
  });

  it("should calculate low confidence for partial restrictions", () => {
    const partialRestrictions: FunctionalRestrictions = {
      sitting: "can",
      standingWalking: "not_assessed",
      bending: "not_assessed",
      squatting: "not_assessed",
      kneelingClimbing: "not_assessed",
      twisting: "not_assessed",
      reachingOverhead: "not_assessed",
      reachingForward: "not_assessed",
      neckMovement: "not_assessed",
      lifting: "not_assessed",
      carrying: "not_assessed",
      pushing: "not_assessed",
      pulling: "not_assessed",
      repetitiveMovements: "not_assessed",
      useOfInjuredLimb: "not_assessed",
    };

    const { confidence, warnings } = handleMissingRestrictions(partialRestrictions);

    expect(confidence).toBeLessThan(0.5);
    expect(warnings.some((w) => w.includes("Less than 50%"))).toBe(true);
  });

  it("should calculate high confidence for complete restrictions", () => {
    const completeRestrictions = createMockRestrictions();
    const { confidence, warnings } = handleMissingRestrictions(completeRestrictions);

    expect(confidence).toBe(1);
    // No critical field warnings when all are assessed
    expect(warnings.some((w) => w.includes("Less than 50%"))).toBe(false);
  });

  it("should warn about missing critical fields", () => {
    const restrictionsWithMissingCritical = createMockRestrictions({
      lifting: "not_assessed",
      bending: "not_assessed",
    });

    const { warnings } = handleMissingRestrictions(restrictionsWithMissingCritical);

    expect(warnings.some((w) => w.includes("Critical restrictions not assessed"))).toBe(true);
    expect(warnings.some((w) => w.includes("lifting"))).toBe(true);
  });
});

// ============================================================================
// handleMissingDemands Tests
// ============================================================================

describe("handleMissingDemands", () => {
  it("should return default demands with warning when demands is null", () => {
    const { demands, warnings } = handleMissingDemands(null);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("No demands specified");
    expect(demands.sitting).toBe("never");
    expect(demands.lifting).toBe("never");
  });

  it("should return provided demands when not null", () => {
    const mockDemands = createMockDemands({ sitting: "frequently" });
    const { demands, warnings } = handleMissingDemands(mockDemands);

    expect(warnings.length).toBe(0);
    expect(demands.sitting).toBe("frequently");
  });
});

// ============================================================================
// generateModificationSuggestions Tests
// ============================================================================

describe("generateModificationSuggestions", () => {
  it("should generate mechanical aids suggestion for lifting demand", () => {
    const comparisons: DemandComparison[] = [
      {
        demand: "Lifting",
        frequency: "frequently",
        capability: "cannot",
        match: "not_suitable",
        reason: "Worker cannot perform Lifting",
      },
    ];

    const suggestions = generateModificationSuggestions({
      dutyName: "Test Duty",
      dutyDescription: "",
      demandComparisons: comparisons,
      isModifiable: true,
    });

    expect(suggestions.some((s) => s.toLowerCase().includes("mechanical aids"))).toBe(true);
  });

  it("should generate multiple suggestions for multiple problematic demands", () => {
    const comparisons: DemandComparison[] = [
      {
        demand: "Lifting",
        frequency: "frequently",
        capability: "cannot",
        match: "not_suitable",
        reason: "test",
      },
      {
        demand: "Standing",
        frequency: "constantly",
        capability: "with_modifications",
        match: "suitable_with_modification",
        reason: "test",
      },
    ];

    const suggestions = generateModificationSuggestions({
      dutyName: "Test Duty",
      dutyDescription: "",
      demandComparisons: comparisons,
      isModifiable: true,
    });

    expect(suggestions.length).toBeGreaterThan(2);
  });

  it("should deduplicate suggestions", () => {
    const comparisons: DemandComparison[] = [
      {
        demand: "Lifting",
        frequency: "frequently",
        capability: "cannot",
        match: "not_suitable",
        reason: "test",
      },
      {
        demand: "Carrying",
        frequency: "frequently",
        capability: "cannot",
        match: "not_suitable",
        reason: "test",
      },
    ];

    const suggestions = generateModificationSuggestions({
      dutyName: "Test Duty",
      dutyDescription: "",
      demandComparisons: comparisons,
      isModifiable: true,
    });

    // Lifting and Carrying share "mechanical aids" suggestion - should appear only once
    const mechanicalAidsCount = suggestions.filter((s) =>
      s.toLowerCase().includes("mechanical aids")
    ).length;
    expect(mechanicalAidsCount).toBe(1);
  });

  it("should always add general suggestions when issues exist", () => {
    const comparisons: DemandComparison[] = [
      {
        demand: "Bending",
        frequency: "occasionally",
        capability: "with_modifications",
        match: "suitable_with_modification",
        reason: "test",
      },
    ];

    const suggestions = generateModificationSuggestions({
      dutyName: "Test Duty",
      dutyDescription: "",
      demandComparisons: comparisons,
      isModifiable: true,
    });

    expect(suggestions.some((s) => s.includes("Gradual increase"))).toBe(true);
    expect(suggestions.some((s) => s.includes("check-ins"))).toBe(true);
  });

  it("should return empty array when no problematic demands", () => {
    const comparisons: DemandComparison[] = [
      {
        demand: "Sitting",
        frequency: "occasionally",
        capability: "can",
        match: "suitable",
        reason: "test",
      },
    ];

    const suggestions = generateModificationSuggestions({
      dutyName: "Test Duty",
      dutyDescription: "",
      demandComparisons: comparisons,
      isModifiable: true,
    });

    expect(suggestions.length).toBe(0);
  });

  it("should note when duty is not modifiable", () => {
    const comparisons: DemandComparison[] = [
      {
        demand: "Lifting",
        frequency: "frequently",
        capability: "cannot",
        match: "not_suitable",
        reason: "test",
      },
    ];

    const suggestions = generateModificationSuggestions({
      dutyName: "Test Duty",
      dutyDescription: "",
      demandComparisons: comparisons,
      isModifiable: false,
    });

    expect(suggestions.some((s) => s.includes("not modifiable"))).toBe(true);
  });
});
