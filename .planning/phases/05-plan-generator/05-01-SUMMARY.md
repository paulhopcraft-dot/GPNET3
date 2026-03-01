---
phase: 05-plan-generator
plan: 01
subsystem: api
tags: [rtw-plan, schedule-calculator, suitability, date-fns, vitest]

# Dependency graph
requires:
  - phase: 04-functional-ability-matrix
    provides: SuitabilityLevel type, calculateDutySuitability function
provides:
  - recommendPlanType function for auto-selecting RTW plan type
  - filterDutiesForPlan function for duty inclusion/exclusion
  - generateDefaultSchedule for graduated 4->6->8 hour progression
  - validateCustomSchedule for restriction compliance
  - calculateWeeklyHours for total hour calculation
affects: [05-02-plan-api, 06-plan-output, 10-rtw-planner-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Plan type decision tree (normal_hours, partial_hours, graduated_return)
    - 80% suitable threshold for duty restrictions
    - Graduated schedule progression (4->4->6->8 hours over 4 weeks)
    - Restriction review date truncation

key-files:
  created:
    - server/services/planGenerator.ts
    - server/services/scheduleCalculator.ts
    - server/services/planGenerator.test.ts
  modified: []

key-decisions:
  - "80% suitable threshold for duty restrictions (aligns with industry standard)"
  - "Default graduated progression: 4hrs/3days -> 4hrs/5days -> 6hrs/5days -> 8hrs/5days"
  - "Max 12 weeks schedule duration (reasonable recovery ceiling)"
  - "Max 2 hour/day or 2 day/week increase per week (safe progression warning)"
  - "Schedule truncates at restriction review date (GEN-08 compliance)"

patterns-established:
  - "PlanType enum for type-safe plan classification"
  - "WeekSchedule interface for schedule representation"
  - "ScheduleValidation pattern with errors and warnings separation"
  - "Modification notes limited to 3 suggestions for readability"

# Metrics
duration: 18min
completed: 2026-01-28
---

# Phase 5 Plan 01: Core Plan Generation Services Summary

**Backend services for auto-selecting RTW plan types and generating graduated schedules with 4->6->8 hour progression**

## Performance

- **Duration:** 18 min
- **Started:** 2026-01-28T20:40:00Z
- **Completed:** 2026-01-28T20:58:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Plan type auto-selection algorithm (GEN-01) with decision tree for normal_hours, partial_hours, graduated_return
- Duty filtering with inclusion/exclusion logic (GEN-05, GEN-06)
- Graduated schedule generation with WorkSafe Victoria 4->6->8 hour progression (GEN-02, GEN-03)
- Custom schedule validation with restriction compliance (GEN-04)
- Weekly hours calculation (GEN-07)
- Restriction review date enforcement (GEN-08)
- 53 comprehensive unit tests covering all GEN-01 through GEN-08 requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Plan Generator Service** - `805d6fd` (feat)
2. **Task 2: Create Schedule Calculator Service** - `1038df5` (feat)
3. **Task 3: Create Unit Tests** - `d33571c` (test)

## Files Created/Modified
- `server/services/planGenerator.ts` - Plan type recommendation, duty filtering, plan duty generation (328 lines)
- `server/services/scheduleCalculator.ts` - Schedule generation, validation, weekly hours calculation (429 lines)
- `server/services/planGenerator.test.ts` - Comprehensive unit tests for both services (987 lines)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 80% suitable threshold | Industry standard for "duties OK" determination - allows minor modifications while flagging major issues |
| 4-4-6-8 hour progression | WorkSafe Victoria guidance: days increase before hours for safer progression |
| Max 12 weeks schedule | Reasonable recovery ceiling - longer plans should be broken into phases |
| Safe progression warnings | 2 hour/day or 2 day/week max increase per week prevents aggressive ramp-up |
| Modification notes capped at 3 | Keeps plan documentation readable, full details in suitability assessment |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Core plan generation services complete and tested
- Ready for Phase 5 Plan 02: RTW Plan API endpoints
- Services export all types needed for API layer integration
- Test patterns established for future plan generation tests

---
*Phase: 05-plan-generator*
*Plan: 01*
*Completed: 2026-01-28*
