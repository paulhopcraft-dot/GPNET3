---
phase: 05-plan-generator
plan: 02
subsystem: api
tags: [rtw-plans, rest-api, express, drizzle, zod, validation]

# Dependency graph
requires:
  - phase: 05-01
    provides: Plan generator and schedule calculator services
  - phase: 04
    provides: Functional ability calculator for duty suitability
  - phase: 03
    provides: Current restrictions API and restriction mapper
provides:
  - GET /api/rtw-plans/recommend endpoint for plan preview
  - POST /api/rtw-plans endpoint for draft plan creation
  - GET /api/rtw-plans/:planId endpoint for plan retrieval
  - RTW plan storage methods with transaction support
affects: [05-03, 06, 08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Transaction-based multi-table insert for plan creation
    - Zod validation for API request bodies and queries
    - Duty suitability validation before plan save

key-files:
  created:
    - server/routes/rtwPlans.ts
  modified:
    - server/storage.ts
    - server/routes.ts

key-decisions:
  - "Server-side suitability validation rejects not_suitable duties"
  - "Schedule validation enforces restriction review dates"
  - "Transaction wrapping ensures atomic plan creation"
  - "Audit logging captures plan creation events"

patterns-established:
  - "Plan creation uses transaction for atomicity across 4 tables"
  - "Recommend endpoint calculates but doesn't persist - POST saves"

# Metrics
duration: 15min
completed: 2026-01-28
---

# Phase 5 Plan 02: RTW Plans API Summary

**REST API endpoints for RTW plan recommendation, creation, and retrieval with full server-side validation and transactional persistence**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-28T13:06:24Z
- **Completed:** 2026-01-28T13:21:XX
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- GET /api/rtw-plans/recommend returns plan type, default schedule, and filtered duties
- POST /api/rtw-plans creates plan as draft with version 1 using database transaction
- Server validates duties are suitable before saving (rejects not_suitable)
- Server validates schedule against medical restriction review dates
- Storage methods support atomic plan creation with all related records

## Task Commits

Each task was committed atomically:

1. **Task 2: Add Storage Methods for RTW Plans** - `00b311f` (feat)
2. **Task 1: Create RTW Plans API Router** - `03ffd4d` (feat)
3. **Task 3: Register RTW Plans Router** - `8831a8d` (feat)

_Note: Task 2 committed first because Task 1 depends on storage methods_

## Files Created/Modified
- `server/routes/rtwPlans.ts` - RTW plans API router with recommend, create, and get endpoints
- `server/storage.ts` - Added CreateRTWPlanData, RTWDutyWithDemands, RTWPlanWithDetails types and 4 new methods
- `server/routes.ts` - Imported and registered rtwPlansRouter at /api/rtw-plans

## Decisions Made
- **Server-side suitability re-validation:** Even though frontend calculates suitability, POST endpoint recalculates to prevent accepting manipulated requests with not_suitable duties
- **Transaction for plan creation:** Uses Drizzle transaction to ensure plan, version, schedule, and duties are created atomically or not at all
- **Audit logging integration:** Uses existing case.create event type since RTW-specific types not yet in AuditEventTypes (future enhancement)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- API endpoints ready for frontend wizard integration (Plan 03)
- Storage methods support all plan CRUD operations needed
- Validation ensures only valid plans can be created

---
*Phase: 05-plan-generator*
*Completed: 2026-01-28*
