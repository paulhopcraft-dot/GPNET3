/**
 * Schedule Calculator Service
 * GEN-02: Generate week-by-week schedule for graduated plans
 * GEN-03: Default graduation 4hrs -> 6hrs -> 8hrs over 3 weeks
 * GEN-04: Allow custom graduation schedule with validation
 * GEN-07: Calculate total hours per week
 * GEN-08: Respect restriction review dates
 *
 * Based on WorkSafe Victoria return-to-work guidance for graduated return schedules.
 */

import { addWeeks, differenceInWeeks, isAfter, isBefore, startOfDay } from "date-fns";
import type { FunctionalRestrictions, FunctionalRestrictionsExtracted } from "@shared/schema";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Week schedule in a graduated return plan
 */
export interface WeekSchedule {
  weekNumber: number;
  hoursPerDay: number;
  daysPerWeek: number;
  totalHoursPerWeek: number;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

/**
 * Configuration for schedule generation
 */
export interface ScheduleConfig {
  startDate: Date;
  restrictionReviewDate: Date | null;
  maxHoursPerDay: number | null;
  maxDaysPerWeek: number | null;
  targetHours?: number; // Goal hours per day (default 8)
  targetDays?: number;  // Goal days per week (default 5)
}

/**
 * Schedule validation result
 */
export interface ScheduleValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum schedule duration in weeks
 */
const MAX_SCHEDULE_WEEKS = 12;

/**
 * Default graduated schedule (WorkSafe Victoria guidance)
 * Week 1: 4 hrs/day, 3 days/week (12 hrs/week)
 * Week 2: 4 hrs/day, 5 days/week (20 hrs/week)
 * Week 3: 6 hrs/day, 5 days/week (30 hrs/week)
 * Week 4+: 8 hrs/day, 5 days/week (40 hrs/week)
 */
const DEFAULT_PROGRESSION = [
  { hoursPerDay: 4, daysPerWeek: 3, notes: "Initial assessment week - monitor tolerance" },
  { hoursPerDay: 4, daysPerWeek: 5, notes: "Increased days per week" },
  { hoursPerDay: 6, daysPerWeek: 5, notes: "Increased hours per day" },
  { hoursPerDay: 8, daysPerWeek: 5, notes: "Target hours reached" },
];

// ============================================================================
// Schedule Generation (GEN-02, GEN-03)
// ============================================================================

/**
 * GEN-02, GEN-03: Generate default graduated schedule
 *
 * Standard WorkSafe Victoria progression:
 * - Week 1: 4 hours/day, 3 days/week (12 hours/week)
 * - Week 2: 4 hours/day, 5 days/week (20 hours/week)
 * - Week 3: 6 hours/day, 5 days/week (30 hours/week)
 * - Week 4+: 8 hours/day, 5 days/week (40 hours/week - full time)
 *
 * GEN-08: Schedule truncates if restrictionReviewDate is near
 *
 * @param config - Schedule configuration with dates and restrictions
 * @returns Array of week schedules
 */
export function generateDefaultSchedule(config: ScheduleConfig): WeekSchedule[] {
  const {
    startDate,
    restrictionReviewDate,
    maxHoursPerDay,
    maxDaysPerWeek,
    targetHours = 8,
    targetDays = 5,
  } = config;

  // Calculate maximum plan duration based on restriction review date
  let maxWeeks = MAX_SCHEDULE_WEEKS;
  if (restrictionReviewDate) {
    const weeksUntilReview = differenceInWeeks(restrictionReviewDate, startDate);
    maxWeeks = Math.max(1, Math.min(weeksUntilReview, MAX_SCHEDULE_WEEKS));
  }

  // Respect worker restrictions
  const hourCap = maxHoursPerDay !== null ? maxHoursPerDay : targetHours;
  const dayCap = maxDaysPerWeek !== null ? maxDaysPerWeek : targetDays;

  const schedule: WeekSchedule[] = [];

  // Generate graduated weeks up to 4 weeks
  for (let i = 0; i < Math.min(DEFAULT_PROGRESSION.length, maxWeeks); i++) {
    const weekNum = i + 1;
    const progression = DEFAULT_PROGRESSION[i];

    // Apply restriction caps
    const hoursPerDay = Math.min(progression.hoursPerDay, hourCap);
    const daysPerWeek = Math.min(progression.daysPerWeek, dayCap);

    schedule.push({
      weekNumber: weekNum,
      hoursPerDay,
      daysPerWeek,
      totalHoursPerWeek: calculateWeeklyHours(hoursPerDay, daysPerWeek),
      startDate: addWeeks(startDate, weekNum - 1),
      endDate: addWeeks(startDate, weekNum),
      notes: progression.notes,
    });
  }

  // If more weeks available and haven't reached max capacity, add full capacity weeks
  if (maxWeeks > 4) {
    const finalHours = Math.min(targetHours, hourCap);
    const finalDays = Math.min(targetDays, dayCap);
    const remainingWeeks = maxWeeks - 4;

    for (let i = 0; i < remainingWeeks; i++) {
      const weekNum = 5 + i;
      schedule.push({
        weekNumber: weekNum,
        hoursPerDay: finalHours,
        daysPerWeek: finalDays,
        totalHoursPerWeek: calculateWeeklyHours(finalHours, finalDays),
        startDate: addWeeks(startDate, weekNum - 1),
        endDate: addWeeks(startDate, weekNum),
        notes: i === 0 && weekNum === 5 ? "Continuing at target hours" : undefined,
      });
    }
  }

  return schedule;
}

/**
 * Generate partial hours schedule (single week at reduced capacity)
 * Used when worker can do all duties but at reduced hours
 *
 * @param config - Schedule configuration
 * @returns Array containing single week schedule
 */
export function generatePartialHoursSchedule(config: ScheduleConfig): WeekSchedule[] {
  const {
    startDate,
    restrictionReviewDate,
    maxHoursPerDay,
    maxDaysPerWeek,
    targetHours = 8,
    targetDays = 5,
  } = config;

  // Calculate duration
  let maxWeeks = MAX_SCHEDULE_WEEKS;
  if (restrictionReviewDate) {
    const weeksUntilReview = differenceInWeeks(restrictionReviewDate, startDate);
    maxWeeks = Math.max(1, Math.min(weeksUntilReview, MAX_SCHEDULE_WEEKS));
  }

  const hoursPerDay = maxHoursPerDay !== null ? maxHoursPerDay : targetHours;
  const daysPerWeek = maxDaysPerWeek !== null ? maxDaysPerWeek : targetDays;

  const schedule: WeekSchedule[] = [];

  for (let i = 0; i < maxWeeks; i++) {
    const weekNum = i + 1;
    schedule.push({
      weekNumber: weekNum,
      hoursPerDay,
      daysPerWeek,
      totalHoursPerWeek: calculateWeeklyHours(hoursPerDay, daysPerWeek),
      startDate: addWeeks(startDate, weekNum - 1),
      endDate: addWeeks(startDate, weekNum),
      notes: weekNum === 1 ? "Partial hours schedule" : undefined,
    });
  }

  return schedule;
}

/**
 * Generate normal hours schedule (full capacity from start)
 * Used when worker can do all duties at full capacity
 *
 * @param config - Schedule configuration
 * @returns Array of week schedules at full capacity
 */
export function generateNormalHoursSchedule(config: ScheduleConfig): WeekSchedule[] {
  const {
    startDate,
    restrictionReviewDate,
    targetHours = 8,
    targetDays = 5,
  } = config;

  // Calculate duration
  let maxWeeks = MAX_SCHEDULE_WEEKS;
  if (restrictionReviewDate) {
    const weeksUntilReview = differenceInWeeks(restrictionReviewDate, startDate);
    maxWeeks = Math.max(1, Math.min(weeksUntilReview, MAX_SCHEDULE_WEEKS));
  }

  const schedule: WeekSchedule[] = [];

  for (let i = 0; i < maxWeeks; i++) {
    const weekNum = i + 1;
    schedule.push({
      weekNumber: weekNum,
      hoursPerDay: targetHours,
      daysPerWeek: targetDays,
      totalHoursPerWeek: calculateWeeklyHours(targetHours, targetDays),
      startDate: addWeeks(startDate, weekNum - 1),
      endDate: addWeeks(startDate, weekNum),
      notes: weekNum === 1 ? "Full hours from start" : undefined,
    });
  }

  return schedule;
}

// ============================================================================
// Schedule Validation (GEN-04)
// ============================================================================

/**
 * GEN-04: Validate custom schedule against restrictions
 *
 * Validation rules:
 * - Hours per day cannot exceed maxWorkHoursPerDay
 * - Days per week cannot exceed maxWorkDaysPerWeek
 * - Schedule cannot extend past restrictionReviewDate (GEN-08)
 * - Max 2 hour/day increase per week (safe progression warning)
 * - Max 2 day/week increase per week (safe progression warning)
 *
 * @param schedule - Custom schedule to validate
 * @param restrictions - Worker's functional restrictions
 * @param restrictionReviewDate - Date when restrictions need to be reviewed
 * @returns Validation result with errors and warnings
 */
export function validateCustomSchedule(
  schedule: WeekSchedule[],
  restrictions: FunctionalRestrictions | FunctionalRestrictionsExtracted | null,
  restrictionReviewDate: Date | null
): ScheduleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle empty schedule
  if (schedule.length === 0) {
    errors.push("Schedule must have at least one week");
    return { valid: false, errors, warnings };
  }

  // Get restriction limits
  const extRestrictions = restrictions as FunctionalRestrictionsExtracted | null;
  const maxHours = extRestrictions?.maxWorkHoursPerDay ?? null;
  const maxDays = extRestrictions?.maxWorkDaysPerWeek ?? null;

  // Validate each week
  for (const week of schedule) {
    // Check hour restrictions
    if (maxHours !== null && week.hoursPerDay > maxHours) {
      errors.push(
        `Week ${week.weekNumber}: ${week.hoursPerDay} hours/day exceeds restriction of ${maxHours} hours/day`
      );
    }

    // Check day restrictions
    if (maxDays !== null && week.daysPerWeek > maxDays) {
      errors.push(
        `Week ${week.weekNumber}: ${week.daysPerWeek} days/week exceeds restriction of ${maxDays} days/week`
      );
    }

    // GEN-08: Check restriction review date
    if (restrictionReviewDate && isAfter(week.endDate, restrictionReviewDate)) {
      errors.push(
        `Week ${week.weekNumber}: Schedule extends past restriction review date (${formatDate(restrictionReviewDate)})`
      );
    }

    // Check reasonable bounds
    if (week.hoursPerDay < 1 || week.hoursPerDay > 12) {
      errors.push(`Week ${week.weekNumber}: Hours per day must be between 1 and 12`);
    }
    if (week.daysPerWeek < 1 || week.daysPerWeek > 7) {
      errors.push(`Week ${week.weekNumber}: Days per week must be between 1 and 7`);
    }
  }

  // Check progression is gradual (safety warnings)
  for (let i = 1; i < schedule.length; i++) {
    const prev = schedule[i - 1];
    const curr = schedule[i];

    const hourIncrease = curr.hoursPerDay - prev.hoursPerDay;
    const dayIncrease = curr.daysPerWeek - prev.daysPerWeek;

    // Allow decreases (flexibility) but warn on large increases
    if (hourIncrease > 2) {
      warnings.push(
        `Week ${curr.weekNumber}: Hours increased by ${hourIncrease} from previous week - max 2 hours/week increase recommended`
      );
    }

    if (dayIncrease > 2) {
      warnings.push(
        `Week ${curr.weekNumber}: Days increased by ${dayIncrease} from previous week - max 2 days/week increase recommended`
      );
    }
  }

  // Check schedule doesn't exceed max duration
  if (schedule.length > MAX_SCHEDULE_WEEKS) {
    warnings.push(`Schedule exceeds ${MAX_SCHEDULE_WEEKS} weeks - consider breaking into phases`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Weekly Hours Calculation (GEN-07)
// ============================================================================

/**
 * GEN-07: Calculate total weekly hours
 *
 * @param hoursPerDay - Hours worked per day
 * @param daysPerWeek - Days worked per week
 * @returns Total hours per week
 */
export function calculateWeeklyHours(hoursPerDay: number, daysPerWeek: number): number {
  return hoursPerDay * daysPerWeek;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Adjust schedule to fit within restriction review date
 * Truncates or shortens final weeks as needed
 *
 * @param schedule - Original schedule
 * @param restrictionReviewDate - Date restrictions expire
 * @returns Adjusted schedule
 */
export function truncateScheduleToReviewDate(
  schedule: WeekSchedule[],
  restrictionReviewDate: Date
): WeekSchedule[] {
  return schedule.filter((week) => {
    // Include only weeks that start before review date
    return isBefore(week.startDate, restrictionReviewDate);
  });
}

/**
 * Get schedule summary for display
 *
 * @param schedule - Week schedules
 * @returns Summary object with key metrics
 */
export function getScheduleSummary(schedule: WeekSchedule[]): {
  totalWeeks: number;
  minHoursPerDay: number;
  maxHoursPerDay: number;
  totalHoursOverSchedule: number;
  startDate: Date | null;
  endDate: Date | null;
} {
  if (schedule.length === 0) {
    return {
      totalWeeks: 0,
      minHoursPerDay: 0,
      maxHoursPerDay: 0,
      totalHoursOverSchedule: 0,
      startDate: null,
      endDate: null,
    };
  }

  const hours = schedule.map((w) => w.hoursPerDay);
  const totalHours = schedule.reduce((sum, w) => sum + w.totalHoursPerWeek, 0);

  return {
    totalWeeks: schedule.length,
    minHoursPerDay: Math.min(...hours),
    maxHoursPerDay: Math.max(...hours),
    totalHoursOverSchedule: totalHours,
    startDate: schedule[0].startDate,
    endDate: schedule[schedule.length - 1].endDate,
  };
}
