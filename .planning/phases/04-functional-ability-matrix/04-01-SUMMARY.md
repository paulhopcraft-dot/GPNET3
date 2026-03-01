---
phase: 04-functional-ability-matrix
plan: 01
subsystem: api
tags: [suitability, functional-ability, rtw, algorithm, vitest]

# Dependency graph
requires:
  - phase: 03-medical-integration
    provides: FunctionalRestrictions type and restrictionMapper.ts with CAPABILITY_PRIORITY
provides:
  - calculateDutySuitability function for comparing restrictions to demands
  - compareDemandToCapability for single demand comparison
  - compareWeightLimit for weight-based demand comparison
  - generateModificationSuggestions for workplace modifications
  - SuitabilityLevel type (suitable | suitable_with_modification | not_suitable)
  - DemandComparison and SuitabilityResult interfaces
affects: [05-plan-generator, 10-rtw-planner-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-tier suitability calculation (suitable/with_modification/not_suitable)"
    - "Demand-to-restriction field mapping (kneeling -> kneelingClimbing, standing/walking -> standingWalking)"
    - "Weight limit comparison with 5kg tolerance for modifications"
    - "Missing data handled as not_assessed with confidence scoring"

key-files:
  created:
    - server/services/functionalAbilityCalculator.ts
    - server/services/modificationSuggester.ts
    - server/services/functionalAbilityCalculator.test.ts
  modified: []

key-decisions:
  - "Cognitive demands always treated as not_assessed (not in FunctionalRestrictions)"
  - "Weight limit tolerance of 5kg + occasionally = suitable_with_modification"
  - "More than 3 not_suitable demands = not_suitable even if duty is modifiable"
  - "Reuse CAPABILITY_PRIORITY from restrictionMapper.ts (no duplication)"

patterns-established:
  - "SuitabilityLevel type: ONLY three valid values, never undefined/null"
  - "Demand field mapping: document in code comments when schema names differ"
  - "Modification suggestions: deduplicate with Set, limit per demand type"

# Metrics
duration: 6min
completed: 2026-01-28
---

# Phase 4 Plan 01: Core Suitability Calculator Summary

**Three-tier suitability algorithm comparing worker functional restrictions against duty demands with weight limit handling and modification suggestions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-28T11:13:32Z
- **Completed:** 2026-01-28T11:18:49Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Created core suitability calculation algorithm implementing FAM-01 to FAM-06
- Built modification suggestion generator with demand-specific recommendations
- Implemented 43 unit tests with explicit FAM-02 verification (suitability never undefined/null)
- Handled all edge cases: missing restrictions, missing demands, weight limits

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Functional Ability Calculator Service** - `25ad23f` (feat)
2. **Task 2: Create Modification Suggester Service** - `a20cac0` (feat)
3. **Task 3: Create Unit Tests with FAM-02 Verification** - `ac18543` (test)

## Files Created

- `server/services/functionalAbilityCalculator.ts` - Core suitability calculation with demand comparison
- `server/services/modificationSuggester.ts` - Context-aware modification suggestions
- `server/services/functionalAbilityCalculator.test.ts` - 43 unit tests covering all requirements

## Decisions Made

1. **Cognitive demands default to not_assessed**: FunctionalRestrictions doesn't include cognitive fields (concentration, stressTolerance, workPace), so these are always treated as not_assessed when comparing, resulting in suitable_with_modification to flag for review.

2. **Weight limit tolerance of 5kg**: When worker limit is within 5kg of duty requirement AND frequency is "occasionally", allow suitable_with_modification with mechanical aids suggestion.

3. **Maximum 3 not_suitable demands for modification**: Even if duty is modifiable, more than 3 not_suitable demands is too many to accommodate effectively - results in overall not_suitable.

4. **Reuse CAPABILITY_PRIORITY constant**: Imported from existing restrictionMapper.ts rather than duplicating to maintain single source of truth.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for Plan 02:** Matrix API endpoint can now use calculateDutySuitability
- **Ready for Plan 03:** Matrix UI can consume the API with SuitabilityResult structure
- **Integration point:** calculateDutySuitability takes RTWDutyDemandsDB (from Phase 2) and FunctionalRestrictions (from Phase 3)

---
*Phase: 04-functional-ability-matrix*
*Completed: 2026-01-28*
