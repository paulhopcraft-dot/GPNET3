# Project State: RTW Planner Engine

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Automatically generate legally-defensible RTW plans from structured medical constraints and job duty data
**Current focus:** Phase 11 - System-Wide Testing

## Current Position

Phase: 11 of 11 (System-Wide Testing)
Plan: 7 of 7 - PENDING HUMAN VERIFICATION
Status: Awaiting checkpoint approval
Last activity: 2026-01-28 - Auto tasks completed for 11-07-PLAN.md (Test Report Generator)

Progress: [######....] 60%

## Current Status

| Artifact | Status |
|----------|--------|
| PROJECT.md | Created |
| config.json | Created |
| REQUIREMENTS.md | Created (90 requirements) |
| ROADMAP.md | Created (10 phases) |

## Phase Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Database Schema | COMPLETE | 1/1 |
| 2 | Admin: Roles & Duties | IN PROGRESS | 3/5 |
| 3 | Medical Integration | Pending | 0/0 |
| 4 | Functional Ability Matrix | Pending | 0/0 |
| 5 | Plan Generator | Pending | 0/0 |
| 6 | Plan Output | Pending | 0/0 |
| 7 | Email Generation | Pending | 0/0 |
| 8 | Approval Workflow | Pending | 0/0 |
| 9 | Audit Trail | Pending | 0/0 |
| 10 | RTW Planner UI | Pending | 0/0 |
| 11 | System-Wide Testing | PENDING VERIFICATION | 7/7 (checkpoint) |

## Accumulated Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| DemandFrequency as varchar | Flexibility for future frequency levels without migration | 1 |
| Cascade deletes for RTW tables | Data integrity when parent records deleted | 1 |
| RTW plan versions as separate table | Full version history with dataJson snapshots | 1 |
| Weight limits as separate columns | Precise tracking of liftingMaxKg, carryingMaxKg | 1 |
| Always create demands record for duties | Ensure consistent data structure | 2 |
| Upsert pattern for demands on update | Handles missing demands gracefully | 2 |
| Soft delete preserves demands | Audit trail for deleted duties | 2 |
| Transaction wrapping for multi-table ops | Atomicity for duty+demands operations | 2 |
| Playwright extended fixtures for auth | Reusable login across all E2E tests | 11 |
| TEST_GREP env var for wave filtering | Enables smoke/critical/regression/performance test execution | 11 |
| Graceful tab handling in tests | Tab tests use catch pattern to handle missing tabs without failing | 11 |
| 5 second performance target | All major endpoints and pages should respond within 5 seconds | 11 |
| Performance logging for baseline | Tests log actual times to establish baseline before enforcing | 11 |
| Direct pg Pool for integrity tests | Raw SQL cleaner for referential checks, avoids ORM in test layer | 11 |
| Conditional skip for DATABASE_URL | Tests skip gracefully when no database, not fail | 11 |
| Recovery chart tests log missing data | Test data may lack certificates; log rather than fail | 11 |

## Blockers/Concerns

None currently.

## Next Action

**Human Verification Required:** Plan 11-07 checkpoint awaits user approval.

User must verify:
1. Run `npm run dev` to start server
2. Run `npm run test:e2e:smoke` for smoke tests
3. Run `npm run test:e2e:critical` for critical path tests
4. Run `npm run test:full` for full suite with report
5. Verify all Phase 11 success criteria met

After approval, Phase 11 will be complete.

## Roadmap Evolution

- Phase 11 added: System-Wide Testing (2026-01-28)

## Session Notes

- 2026-01-25: Project initialized
- RTW Planner is currently a stub showing zeros
- Medical certificates already exist with structured data
- Job duties database needs to be built from scratch
- Physical demands matrix: Bending, Squatting, Kneeling, Twisting, Reaching, etc.
- Frequency levels: Never / Occasionally / Frequently / Constantly
- User has sample RTW plans in Google Drive (clients directory)
- Medical constraints come from latest medical certificate
- 2026-01-25: Phase 1 PLAN.md created - defines 8 new tables for RTW system
- 2026-01-26: Phase 1 EXECUTED - 8 RTW tables created, all migrations successful
- 2026-01-26: Phase 2 Wave 1 (02-01, 02-02) EXECUTED - Roles and Duties APIs complete
- 2026-01-26: Phase 2 Plan 03 EXECUTED - Roles UI pages (RolesList, RoleForm) complete
- 2026-01-28: Phase 11 Plan 01 EXECUTED - Test infrastructure (auth fixture, test data, wave-based scripts)
- 2026-01-28: Phase 11 Plan 02 EXECUTED - Smoke tests (health, auth, navigation with @smoke tags)
- 2026-01-28: Phase 11 Plan 03 EXECUTED - Critical path E2E tests (dashboard, case list, 7 case detail tabs)
- 2026-01-28: Phase 11 Plan 05 EXECUTED - Performance tests (API response times, page load times)
- 2026-01-28: Phase 11 Plan 06 EXECUTED - Database integrity tests, error handling E2E tests, recovery chart tests
- 2026-01-28: Phase 11 Plan 07 AUTO TASKS COMPLETE - Test report generator, npm scripts (checkpoint pending)

## Session Continuity

Last session: 2026-01-28T05:42:00Z
Stopped at: 11-07-PLAN.md checkpoint (pending human verification)
Resume file: .planning/phases/11-system-wide-testing/11-07-PLAN.md

---
*Last updated: 2026-01-28*
