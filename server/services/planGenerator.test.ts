/**
 * Unit Tests for Plan Generator and Schedule Calculator Services
 * Covers GEN-01 to GEN-08 requirements
 *
 * GEN-01: Auto-select plan type based on restrictions and duty suitability
 * GEN-02: Generate week-by-week schedule for graduated plans
 * GEN-03: Default graduation 4hrs -> 6hrs -> 8hrs over 3 weeks
 * GEN-04: Allow custom graduation schedule with validation
 * GEN-05: Include only suitable and suitable_with_modification duties
 * GEN-06: Exclude not_suitable duties with documented reason
 * GEN-07: Calculate total hours per week
 * GEN-08: Respect restriction review dates
 */

import { describe, it, expect } from "vitest";
import {
  recommendPlanType,
  filterDutiesForPlan,
  generatePlanDuties,
  PlanType,
  PlanTypeRecommendation,
  DutySuitabilityInput,
  DutyForPlan,
} from "./planGenerator";
import {
  generateDefaultSchedule,
  generatePartialHoursSchedule,
  generateNormalHoursSchedule,
  validateCustomSchedule,
  calculateWeeklyHours,
  truncateScheduleToReviewDate,
  getScheduleSummary,
  WeekSchedule,
  ScheduleConfig,
  ScheduleValidation,
} from "./scheduleCalculator";
import { addWeeks, addDays } from "date-fns";
import type {
  FunctionalRestrictions,
  FunctionalRestrictionsExtracted,
  RTWDutyDB,
} from "@shared/schema";
import type { SuitabilityLevel } from "./functionalAbilityCalculator";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockDuty(overrides: Partial<RTWDutyDB> = {}): RTWDutyDB {
  return {
    id: "duty-1",
    roleId: "role-1",
    organizationId: "org-1",
    name: "Test Duty",
    description: null,
    isModifiable: true,
    riskFlags: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRestrictions(
  overrides: Partial<FunctionalRestrictionsExtracted> = {}
): FunctionalRestrictionsExtracted {
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
    maxWorkHoursPerDay: undefined,
    maxWorkDaysPerWeek: undefined,
    ...overrides,
  };
}

function createDutySuitabilityInputs(
  suitabilities: Array<{ name: string; suitability: SuitabilityLevel; modifications?: string[] }>
): DutySuitabilityInput[] {
  return suitabilities.map((s, i) => ({
    duty: createMockDuty({ id: `duty-${i}`, name: s.name }),
    suitability: s.suitability,
    modificationSuggestions: s.modifications,
  }));
}

function createScheduleConfig(overrides: Partial<ScheduleConfig> = {}): ScheduleConfig {
  return {
    startDate: new Date("2026-02-01"),
    restrictionReviewDate: null,
    maxHoursPerDay: null,
    maxDaysPerWeek: null,
    targetHours: 8,
    targetDays: 5,
    ...overrides,
  };
}

// ============================================================================
// Plan Generator Service Tests
// ============================================================================

describe("Plan Generator Service", () => {
  // --------------------------------------------------------------------------
  // recommendPlanType Tests (GEN-01)
  // --------------------------------------------------------------------------
  describe("recommendPlanType (GEN-01)", () => {
    it("returns normal_hours when no restrictions and all duties suitable", () => {
      const restrictions = createMockRestrictions();
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
        { name: "Duty 2", suitability: "suitable" },
        { name: "Duty 3", suitability: "suitable" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.planType).toBe("normal_hours");
      expect(result.confidence).toBe("high");
      expect(result.reason).toContain("all duties");
    });

    it("returns normal_hours when no restrictions and >= 80% suitable", () => {
      const restrictions = createMockRestrictions();
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
        { name: "Duty 2", suitability: "suitable" },
        { name: "Duty 3", suitability: "suitable" },
        { name: "Duty 4", suitability: "suitable" },
        { name: "Duty 5", suitability: "suitable_with_modification" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.planType).toBe("normal_hours");
      expect(result.confidence).toBe("medium"); // Not all fully suitable
    });

    it("returns partial_hours when hour restrictions but duties OK", () => {
      const restrictions = createMockRestrictions({
        maxWorkHoursPerDay: 6,
      });
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
        { name: "Duty 2", suitability: "suitable" },
        { name: "Duty 3", suitability: "suitable_with_modification" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.planType).toBe("partial_hours");
      expect(result.reason).toContain("6 hours/day");
    });

    it("returns partial_hours when day restrictions but duties OK", () => {
      const restrictions = createMockRestrictions({
        maxWorkDaysPerWeek: 3,
      });
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
        { name: "Duty 2", suitability: "suitable" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.planType).toBe("partial_hours");
      expect(result.reason).toContain("3 days/week");
    });

    it("returns graduated_return when duty restrictions present", () => {
      const restrictions = createMockRestrictions();
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
        { name: "Duty 2", suitability: "not_suitable" },
        { name: "Duty 3", suitability: "not_suitable" },
        { name: "Duty 4", suitability: "not_suitable" },
        { name: "Duty 5", suitability: "not_suitable" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.planType).toBe("graduated_return");
      expect(result.reason).toContain("suitable");
    });

    it("returns graduated_return when < 80% duties suitable", () => {
      const restrictions = createMockRestrictions();
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
        { name: "Duty 2", suitability: "suitable" },
        { name: "Duty 3", suitability: "not_suitable" },
        { name: "Duty 4", suitability: "not_suitable" },
        { name: "Duty 5", suitability: "not_suitable" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.planType).toBe("graduated_return");
    });

    it("returns graduated_return as safe default when uncertain", () => {
      const restrictions = createMockRestrictions({
        maxWorkHoursPerDay: 6,
      });
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable_with_modification" },
        { name: "Duty 2", suitability: "suitable_with_modification" },
        { name: "Duty 3", suitability: "not_suitable" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.planType).toBe("graduated_return");
    });

    it("includes warnings when some duties require modifications", () => {
      const restrictions = createMockRestrictions();
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
        { name: "Duty 2", suitability: "suitable" },
        { name: "Duty 3", suitability: "suitable_with_modification" },
        { name: "Duty 4", suitability: "suitable_with_modification" },
        { name: "Duty 5", suitability: "suitable" },
      ]);

      const result = recommendPlanType(restrictions, duties);

      expect(result.warnings).toContainEqual(expect.stringContaining("modifications"));
    });

    it("handles empty duty list with warning", () => {
      const restrictions = createMockRestrictions();
      const duties: DutySuitabilityInput[] = [];

      const result = recommendPlanType(restrictions, duties);

      expect(result.warnings).toContainEqual(expect.stringContaining("No duties"));
      expect(result.confidence).toBe("low");
    });

    it("handles null restrictions with low confidence", () => {
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
      ]);

      const result = recommendPlanType(null, duties);

      expect(result.planType).toBe("graduated_return");
      expect(result.confidence).toBe("low");
      expect(result.warnings).toContainEqual(expect.stringContaining("No medical restrictions"));
    });

    it("handles undefined restrictions with low confidence", () => {
      const duties = createDutySuitabilityInputs([
        { name: "Duty 1", suitability: "suitable" },
      ]);

      const result = recommendPlanType(undefined, duties);

      expect(result.planType).toBe("graduated_return");
      expect(result.confidence).toBe("low");
    });
  });

  // --------------------------------------------------------------------------
  // filterDutiesForPlan Tests (GEN-05, GEN-06)
  // --------------------------------------------------------------------------
  describe("filterDutiesForPlan (GEN-05, GEN-06)", () => {
    it("includes suitable duties without modification notes", () => {
      const duties = createDutySuitabilityInputs([
        { name: "Suitable Duty", suitability: "suitable" },
      ]);

      const result = filterDutiesForPlan(duties);

      expect(result).toHaveLength(1);
      expect(result[0].isIncluded).toBe(true);
      expect(result[0].modificationNotes).toBeNull();
      expect(result[0].excludedReason).toBeNull();
    });

    it("includes suitable_with_modification duties with notes", () => {
      const duties = createDutySuitabilityInputs([
        {
          name: "Modified Duty",
          suitability: "suitable_with_modification",
          modifications: ["Use mechanical aids", "Reduce duration"],
        },
      ]);

      const result = filterDutiesForPlan(duties, true);

      expect(result).toHaveLength(1);
      expect(result[0].isIncluded).toBe(true);
      expect(result[0].modificationNotes).toContain("mechanical aids");
      expect(result[0].excludedReason).toBeNull();
    });

    it("excludes not_suitable duties with reason (GEN-06)", () => {
      const duties = createDutySuitabilityInputs([
        { name: "Not Suitable Duty", suitability: "not_suitable" },
      ]);

      const result = filterDutiesForPlan(duties);

      expect(result).toHaveLength(1);
      expect(result[0].isIncluded).toBe(false);
      expect(result[0].excludedReason).toContain("exceed");
      expect(result[0].modificationNotes).toBeNull();
    });

    it("respects includeModifications flag when false", () => {
      const duties = createDutySuitabilityInputs([
        { name: "Modified Duty", suitability: "suitable_with_modification" },
      ]);

      const result = filterDutiesForPlan(duties, false);

      expect(result[0].isIncluded).toBe(false);
      expect(result[0].excludedReason).toContain("not available");
    });

    it("handles mixed suitability levels correctly", () => {
      const duties = createDutySuitabilityInputs([
        { name: "Suitable Duty", suitability: "suitable" },
        { name: "Modified Duty", suitability: "suitable_with_modification" },
        { name: "Not Suitable Duty", suitability: "not_suitable" },
      ]);

      const result = filterDutiesForPlan(duties, true);

      expect(result).toHaveLength(3);

      const suitable = result.find((d) => d.dutyName === "Suitable Duty");
      expect(suitable?.isIncluded).toBe(true);
      expect(suitable?.modificationNotes).toBeNull();

      const modified = result.find((d) => d.dutyName === "Modified Duty");
      expect(modified?.isIncluded).toBe(true);
      expect(modified?.modificationNotes).not.toBeNull();

      const notSuitable = result.find((d) => d.dutyName === "Not Suitable Duty");
      expect(notSuitable?.isIncluded).toBe(false);
      expect(notSuitable?.excludedReason).not.toBeNull();
    });

    it("uses default modification notes when none provided", () => {
      const duties = createDutySuitabilityInputs([
        { name: "Modified Duty", suitability: "suitable_with_modification" },
      ]);

      const result = filterDutiesForPlan(duties, true);

      expect(result[0].modificationNotes).toContain("suitability assessment");
    });

    it("limits modification notes to first 3 suggestions", () => {
      const duties = createDutySuitabilityInputs([
        {
          name: "Modified Duty",
          suitability: "suitable_with_modification",
          modifications: ["Mod 1", "Mod 2", "Mod 3", "Mod 4", "Mod 5"],
        },
      ]);

      const result = filterDutiesForPlan(duties, true);

      const notes = result[0].modificationNotes!;
      expect(notes).toContain("Mod 1");
      expect(notes).toContain("Mod 2");
      expect(notes).toContain("Mod 3");
      expect(notes).not.toContain("Mod 4");
    });
  });

  // --------------------------------------------------------------------------
  // generatePlanDuties Tests
  // --------------------------------------------------------------------------
  describe("generatePlanDuties", () => {
    it("generates correct InsertRTWPlanDuty records", () => {
      const filteredDuties: DutyForPlan[] = [
        {
          dutyId: "duty-1",
          dutyName: "Test Duty",
          suitability: "suitable",
          modificationNotes: null,
          excludedReason: null,
          isIncluded: true,
        },
      ];

      const result = generatePlanDuties("plan-version-1", filteredDuties);

      expect(result).toHaveLength(1);
      expect(result[0].planVersionId).toBe("plan-version-1");
      expect(result[0].dutyId).toBe("duty-1");
      expect(result[0].suitability).toBe("suitable");
      expect(result[0].manuallyOverridden).toBe(false);
    });

    it("maps filtered duties to plan version", () => {
      const filteredDuties: DutyForPlan[] = [
        {
          dutyId: "duty-1",
          dutyName: "Suitable Duty",
          suitability: "suitable",
          modificationNotes: null,
          excludedReason: null,
          isIncluded: true,
        },
        {
          dutyId: "duty-2",
          dutyName: "Modified Duty",
          suitability: "suitable_with_modification",
          modificationNotes: "Use aids",
          excludedReason: null,
          isIncluded: true,
        },
        {
          dutyId: "duty-3",
          dutyName: "Excluded Duty",
          suitability: "not_suitable",
          modificationNotes: null,
          excludedReason: "Exceeds restrictions",
          isIncluded: false,
        },
      ];

      const result = generatePlanDuties("plan-version-1", filteredDuties);

      expect(result).toHaveLength(3);
      expect(result.every((r) => r.planVersionId === "plan-version-1")).toBe(true);
      expect(result[1].modificationNotes).toBe("Use aids");
      expect(result[2].excludedReason).toBe("Exceeds restrictions");
    });
  });
});

// ============================================================================
// Schedule Calculator Service Tests
// ============================================================================

describe("Schedule Calculator Service", () => {
  // --------------------------------------------------------------------------
  // generateDefaultSchedule Tests (GEN-02, GEN-03)
  // --------------------------------------------------------------------------
  describe("generateDefaultSchedule (GEN-02, GEN-03)", () => {
    it("generates 4->6->8 hour progression (GEN-03)", () => {
      const config = createScheduleConfig();

      const schedule = generateDefaultSchedule(config);

      expect(schedule.length).toBeGreaterThanOrEqual(4);
      expect(schedule[0].hoursPerDay).toBe(4);
      expect(schedule[2].hoursPerDay).toBe(6);
      expect(schedule[3].hoursPerDay).toBe(8);
    });

    it("starts with 4 hrs/day, 3 days/week", () => {
      const config = createScheduleConfig();

      const schedule = generateDefaultSchedule(config);

      expect(schedule[0].hoursPerDay).toBe(4);
      expect(schedule[0].daysPerWeek).toBe(3);
      expect(schedule[0].totalHoursPerWeek).toBe(12);
    });

    it("increases days before hours (week 2: 4hrs, 5 days)", () => {
      const config = createScheduleConfig();

      const schedule = generateDefaultSchedule(config);

      expect(schedule[1].hoursPerDay).toBe(4);
      expect(schedule[1].daysPerWeek).toBe(5);
      expect(schedule[1].totalHoursPerWeek).toBe(20);
    });

    it("respects maxHoursPerDay restriction", () => {
      const config = createScheduleConfig({
        maxHoursPerDay: 6,
      });

      const schedule = generateDefaultSchedule(config);

      for (const week of schedule) {
        expect(week.hoursPerDay).toBeLessThanOrEqual(6);
      }
    });

    it("respects maxDaysPerWeek restriction", () => {
      const config = createScheduleConfig({
        maxDaysPerWeek: 3,
      });

      const schedule = generateDefaultSchedule(config);

      for (const week of schedule) {
        expect(week.daysPerWeek).toBeLessThanOrEqual(3);
      }
    });

    it("truncates at restrictionReviewDate (GEN-08)", () => {
      const startDate = new Date("2026-02-01");
      const config = createScheduleConfig({
        startDate,
        restrictionReviewDate: addWeeks(startDate, 2), // Review in 2 weeks
      });

      const schedule = generateDefaultSchedule(config);

      expect(schedule.length).toBe(2);
    });

    it("returns single week if review date is 1 week away", () => {
      const startDate = new Date("2026-02-01");
      const config = createScheduleConfig({
        startDate,
        restrictionReviewDate: addDays(startDate, 6), // Review in 6 days
      });

      const schedule = generateDefaultSchedule(config);

      expect(schedule.length).toBe(1);
    });

    it("caps at 12 weeks maximum", () => {
      const config = createScheduleConfig({
        restrictionReviewDate: null, // No review date
      });

      const schedule = generateDefaultSchedule(config);

      expect(schedule.length).toBeLessThanOrEqual(12);
    });

    it("includes helpful notes per week", () => {
      const config = createScheduleConfig();

      const schedule = generateDefaultSchedule(config);

      expect(schedule[0].notes).toContain("Initial assessment");
      expect(schedule[1].notes).toContain("days per week");
      expect(schedule[2].notes).toContain("hours per day");
    });

    it("sets correct start and end dates for each week", () => {
      const startDate = new Date("2026-02-01");
      const config = createScheduleConfig({ startDate });

      const schedule = generateDefaultSchedule(config);

      expect(schedule[0].startDate).toEqual(startDate);
      expect(schedule[0].endDate).toEqual(addWeeks(startDate, 1));
      expect(schedule[1].startDate).toEqual(addWeeks(startDate, 1));
    });
  });

  // --------------------------------------------------------------------------
  // generatePartialHoursSchedule Tests
  // --------------------------------------------------------------------------
  describe("generatePartialHoursSchedule", () => {
    it("generates consistent hours across all weeks", () => {
      const config = createScheduleConfig({
        maxHoursPerDay: 6,
        maxDaysPerWeek: 4,
      });

      const schedule = generatePartialHoursSchedule(config);

      for (const week of schedule) {
        expect(week.hoursPerDay).toBe(6);
        expect(week.daysPerWeek).toBe(4);
      }
    });

    it("respects restriction review date", () => {
      const startDate = new Date("2026-02-01");
      const config = createScheduleConfig({
        startDate,
        maxHoursPerDay: 6,
        restrictionReviewDate: addWeeks(startDate, 3),
      });

      const schedule = generatePartialHoursSchedule(config);

      expect(schedule.length).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // generateNormalHoursSchedule Tests
  // --------------------------------------------------------------------------
  describe("generateNormalHoursSchedule", () => {
    it("generates full capacity (8 hrs, 5 days) from start", () => {
      const config = createScheduleConfig();

      const schedule = generateNormalHoursSchedule(config);

      for (const week of schedule) {
        expect(week.hoursPerDay).toBe(8);
        expect(week.daysPerWeek).toBe(5);
        expect(week.totalHoursPerWeek).toBe(40);
      }
    });

    it("respects restriction review date", () => {
      const startDate = new Date("2026-02-01");
      const config = createScheduleConfig({
        startDate,
        restrictionReviewDate: addWeeks(startDate, 4),
      });

      const schedule = generateNormalHoursSchedule(config);

      expect(schedule.length).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // validateCustomSchedule Tests (GEN-04)
  // --------------------------------------------------------------------------
  describe("validateCustomSchedule (GEN-04)", () => {
    it("passes valid schedule", () => {
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 3,
          totalHoursPerWeek: 12,
          startDate: new Date("2026-02-01"),
          endDate: new Date("2026-02-08"),
        },
        {
          weekNumber: 2,
          hoursPerDay: 6,
          daysPerWeek: 4,
          totalHoursPerWeek: 24,
          startDate: new Date("2026-02-08"),
          endDate: new Date("2026-02-15"),
        },
      ];
      const restrictions = createMockRestrictions({
        maxWorkHoursPerDay: 8,
        maxWorkDaysPerWeek: 5,
      });

      const result = validateCustomSchedule(schedule, restrictions, null);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails when hours exceed maxWorkHoursPerDay", () => {
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 8,
          daysPerWeek: 5,
          totalHoursPerWeek: 40,
          startDate: new Date("2026-02-01"),
          endDate: new Date("2026-02-08"),
        },
      ];
      const restrictions = createMockRestrictions({
        maxWorkHoursPerDay: 6,
      });

      const result = validateCustomSchedule(schedule, restrictions, null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("8 hours/day exceeds"));
    });

    it("fails when days exceed maxWorkDaysPerWeek", () => {
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 5,
          totalHoursPerWeek: 20,
          startDate: new Date("2026-02-01"),
          endDate: new Date("2026-02-08"),
        },
      ];
      const restrictions = createMockRestrictions({
        maxWorkDaysPerWeek: 3,
      });

      const result = validateCustomSchedule(schedule, restrictions, null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("5 days/week exceeds"));
    });

    it("fails when schedule extends past review date (GEN-08)", () => {
      const startDate = new Date("2026-02-01");
      const reviewDate = new Date("2026-02-08");
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 3,
          totalHoursPerWeek: 12,
          startDate,
          endDate: addWeeks(startDate, 1),
        },
        {
          weekNumber: 2,
          hoursPerDay: 6,
          daysPerWeek: 4,
          totalHoursPerWeek: 24,
          startDate: addWeeks(startDate, 1),
          endDate: addWeeks(startDate, 2), // This extends past review date
        },
      ];

      const result = validateCustomSchedule(schedule, null, reviewDate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("review date"));
    });

    it("warns when hour increase > 2 per week", () => {
      const startDate = new Date("2026-02-01");
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 5,
          totalHoursPerWeek: 20,
          startDate,
          endDate: addWeeks(startDate, 1),
        },
        {
          weekNumber: 2,
          hoursPerDay: 8, // +4 hours (too much)
          daysPerWeek: 5,
          totalHoursPerWeek: 40,
          startDate: addWeeks(startDate, 1),
          endDate: addWeeks(startDate, 2),
        },
      ];

      const result = validateCustomSchedule(schedule, null, null);

      expect(result.valid).toBe(true); // Warnings don't fail validation
      expect(result.warnings).toContainEqual(expect.stringContaining("Hours increased by 4"));
    });

    it("warns when day increase > 2 per week", () => {
      const startDate = new Date("2026-02-01");
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 2,
          totalHoursPerWeek: 8,
          startDate,
          endDate: addWeeks(startDate, 1),
        },
        {
          weekNumber: 2,
          hoursPerDay: 4,
          daysPerWeek: 5, // +3 days (too much)
          totalHoursPerWeek: 20,
          startDate: addWeeks(startDate, 1),
          endDate: addWeeks(startDate, 2),
        },
      ];

      const result = validateCustomSchedule(schedule, null, null);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(expect.stringContaining("Days increased by 3"));
    });

    it("allows decreasing hours (flexibility)", () => {
      const startDate = new Date("2026-02-01");
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 6,
          daysPerWeek: 5,
          totalHoursPerWeek: 30,
          startDate,
          endDate: addWeeks(startDate, 1),
        },
        {
          weekNumber: 2,
          hoursPerDay: 4, // Decrease is allowed
          daysPerWeek: 5,
          totalHoursPerWeek: 20,
          startDate: addWeeks(startDate, 1),
          endDate: addWeeks(startDate, 2),
        },
      ];

      const result = validateCustomSchedule(schedule, null, null);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("fails for empty schedule", () => {
      const result = validateCustomSchedule([], null, null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("at least one week"));
    });

    it("validates hours per day bounds (1-12)", () => {
      const startDate = new Date("2026-02-01");
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 14, // Too high
          daysPerWeek: 3,
          totalHoursPerWeek: 42,
          startDate,
          endDate: addWeeks(startDate, 1),
        },
      ];

      const result = validateCustomSchedule(schedule, null, null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("between 1 and 12"));
    });

    it("validates days per week bounds (1-7)", () => {
      const startDate = new Date("2026-02-01");
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 0, // Too low
          totalHoursPerWeek: 0,
          startDate,
          endDate: addWeeks(startDate, 1),
        },
      ];

      const result = validateCustomSchedule(schedule, null, null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining("between 1 and 7"));
    });
  });

  // --------------------------------------------------------------------------
  // calculateWeeklyHours Tests (GEN-07)
  // --------------------------------------------------------------------------
  describe("calculateWeeklyHours (GEN-07)", () => {
    it("calculates 4 hrs * 3 days = 12 hrs", () => {
      expect(calculateWeeklyHours(4, 3)).toBe(12);
    });

    it("calculates 8 hrs * 5 days = 40 hrs", () => {
      expect(calculateWeeklyHours(8, 5)).toBe(40);
    });

    it("handles decimal hours", () => {
      expect(calculateWeeklyHours(6.5, 4)).toBe(26);
    });

    it("calculates 4 hrs * 5 days = 20 hrs", () => {
      expect(calculateWeeklyHours(4, 5)).toBe(20);
    });

    it("calculates 6 hrs * 5 days = 30 hrs", () => {
      expect(calculateWeeklyHours(6, 5)).toBe(30);
    });
  });

  // --------------------------------------------------------------------------
  // truncateScheduleToReviewDate Tests
  // --------------------------------------------------------------------------
  describe("truncateScheduleToReviewDate", () => {
    it("removes weeks that start after review date", () => {
      const startDate = new Date("2026-02-01");
      const reviewDate = addWeeks(startDate, 2);
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 3,
          totalHoursPerWeek: 12,
          startDate,
          endDate: addWeeks(startDate, 1),
        },
        {
          weekNumber: 2,
          hoursPerDay: 4,
          daysPerWeek: 5,
          totalHoursPerWeek: 20,
          startDate: addWeeks(startDate, 1),
          endDate: addWeeks(startDate, 2),
        },
        {
          weekNumber: 3,
          hoursPerDay: 6,
          daysPerWeek: 5,
          totalHoursPerWeek: 30,
          startDate: addWeeks(startDate, 2),
          endDate: addWeeks(startDate, 3),
        },
      ];

      const result = truncateScheduleToReviewDate(schedule, reviewDate);

      expect(result).toHaveLength(2);
      expect(result.every((w) => w.weekNumber <= 2)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // getScheduleSummary Tests
  // --------------------------------------------------------------------------
  describe("getScheduleSummary", () => {
    it("returns correct summary for graduated schedule", () => {
      const config = createScheduleConfig();
      const schedule = generateDefaultSchedule(config);

      const summary = getScheduleSummary(schedule);

      expect(summary.totalWeeks).toBeGreaterThanOrEqual(4);
      expect(summary.minHoursPerDay).toBe(4);
      expect(summary.maxHoursPerDay).toBe(8);
      expect(summary.startDate).toEqual(config.startDate);
    });

    it("handles empty schedule", () => {
      const summary = getScheduleSummary([]);

      expect(summary.totalWeeks).toBe(0);
      expect(summary.minHoursPerDay).toBe(0);
      expect(summary.maxHoursPerDay).toBe(0);
      expect(summary.startDate).toBeNull();
      expect(summary.endDate).toBeNull();
    });

    it("calculates total hours over schedule", () => {
      const schedule: WeekSchedule[] = [
        {
          weekNumber: 1,
          hoursPerDay: 4,
          daysPerWeek: 3,
          totalHoursPerWeek: 12,
          startDate: new Date(),
          endDate: new Date(),
        },
        {
          weekNumber: 2,
          hoursPerDay: 8,
          daysPerWeek: 5,
          totalHoursPerWeek: 40,
          startDate: new Date(),
          endDate: new Date(),
        },
      ];

      const summary = getScheduleSummary(schedule);

      expect(summary.totalHoursOverSchedule).toBe(52);
    });
  });
});
