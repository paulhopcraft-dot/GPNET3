---
phase: 06-plan-output
plan: 01
subsystem: api
tags: [rtw-plan, email-generation, claude-haiku, storage-methods]

# Dependency graph
requires:
  - phase: 05-plan-generator
    provides: RTW plan creation and storage, plan types and schedule calculations
provides:
  - GET /api/rtw-plans/:planId/details endpoint for enriched plan display
  - GET /api/rtw-plans/:planId/email endpoint for manager notification emails
  - POST /api/rtw-plans/:planId/email/regenerate endpoint for fresh email generation
  - rtwEmailService with AI-powered email drafting
  - getRTWPlanFullDetails storage method with joined case, role, restrictions
affects: [06-02-plan-output-ui, 08-approval-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AI email generation with context-aware prompts"
    - "Fallback templates when AI unavailable"
    - "Email storage using caseContextSnapshot.planId for plan association"

key-files:
  created:
    - server/services/rtwEmailService.ts
  modified:
    - server/storage.ts
    - server/routes/rtwPlans.ts

key-decisions:
  - "Use caseContextSnapshot.planId for plan email lookup instead of adding columns"
  - "Include fallback email template when ANTHROPIC_API_KEY unavailable"
  - "Block email regeneration for approved plans per OUT-08"

patterns-established:
  - "RTW email context building from plan details"
  - "Schedule summary formatting with grouped consecutive weeks"

# Metrics
duration: 12min
completed: 2026-01-29
---

# Phase 6 Plan 01: Plan Output Backend Summary

**API endpoints and storage methods for RTW plan display data and AI-powered manager email generation using Claude Haiku**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-28T23:55:43Z
- **Completed:** 2026-01-29T00:07:00Z
- **Tasks:** 3/3
- **Files modified:** 3

## Accomplishments

- Created rtwEmailService with AI-powered email generation using Claude Haiku
- Added getRTWPlanFullDetails storage method joining plan, case, role, and restrictions
- Implemented /details, /email, and /email/regenerate API endpoints
- Added fallback email template for when AI service unavailable

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RTW Email Generation Service** - `0e152bd` (feat)
2. **Task 2: Add Storage Methods for Plan Details** - `081da11` (feat)
3. **Task 3: Add Plan Details API Endpoint** - `b48dfe3` (feat)

## Files Created/Modified

- `server/services/rtwEmailService.ts` - AI-powered email drafting for RTW plan manager notifications
- `server/storage.ts` - Added getRTWPlanFullDetails, getRoleById, savePlanEmail, getPlanEmail methods
- `server/routes/rtwPlans.ts` - Added /details, /email, and /email/regenerate endpoints

## Decisions Made

1. **Use caseContextSnapshot.planId for plan email lookup** - The email_drafts table doesn't have resourceType/resourceId columns, so we use the existing caseContextSnapshot JSONB column to store planId for lookup.

2. **Include fallback email template** - When ANTHROPIC_API_KEY is not configured, the service generates a basic but functional email template instead of failing.

3. **Block email regeneration for approved plans** - Per OUT-08 requirement, the /email/regenerate endpoint returns 403 when plan.status === "approved".

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The service gracefully falls back when ANTHROPIC_API_KEY is not set.

## Next Phase Readiness

- API endpoints ready for frontend consumption
- Plan details endpoint returns all data needed for OUT-01 through OUT-06
- Email endpoints ready for manager notification UI (OUT-07, OUT-08)
- Ready for Phase 6 Plan 02: UI components for plan display

---
*Phase: 06-plan-output*
*Completed: 2026-01-29*
