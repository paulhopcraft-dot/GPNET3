---
phase: phase-1-database-schema
plan: "01"
subsystem: database
tags: [drizzle, postgresql, rtw-planner, schema, tables, physical-demands, cognitive-demands]

# Dependency graph
requires: []
provides:
  - RTW Planner database tables (rtwRoles, rtwDuties, rtwDutyDemands, rtwPlans, rtwPlanVersions, rtwPlanDuties, rtwPlanSchedule, rtwApprovals)
  - DemandFrequency type (never/occasionally/frequently/constantly)
  - DutySuitability type (suitable/suitable_with_modification/not_suitable)
  - RTWPlanType and RTWApprovalStatus types
  - DutyPhysicalDemands and DutyCognitiveDemands interfaces
  - FunctionalRestrictions interface for medical certificate matrix
  - RTWAuditEventType for audit trail extension
affects: [phase-2-admin-roles-duties, phase-3-medical-integration, phase-4-functional-ability-matrix, phase-5-plan-generator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Organization-scoped tables with organizationId foreign key
    - Cascade deletes for parent-child relationships (roles->duties, plans->versions)
    - JSONB for flexible data storage (dutiesJson, dataJson)
    - Demand frequency as varchar with default 'never'

key-files:
  created: []
  modified:
    - shared/schema.ts

key-decisions:
  - "DemandFrequency as varchar (not enum) for flexibility"
  - "Cascade delete from rtwRoles to rtwDuties for data integrity"
  - "RTW plan versions as separate table for full version history"
  - "Weight limits stored alongside frequency (liftingMaxKg, carryingMaxKg)"

patterns-established:
  - "RTW tables prefixed with rtw_ for namespace isolation"
  - "Insert/Select types exported for each table (RTWRoleDB, InsertRTWRole)"
  - "Zod schemas created using createInsertSchema with id/timestamp fields omitted"

# Metrics
duration: 15min
completed: 2026-01-26
---

# Phase 1: Database Schema Summary

**8 RTW Planner tables with physical/cognitive demand matrix using DemandFrequency type (never/occasionally/frequently/constantly)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-26T00:28:29Z
- **Completed:** 2026-01-26T00:43:00Z
- **Tasks:** 2 (schema definition + migration)
- **Files modified:** 1 (shared/schema.ts)

## Accomplishments

- Created 8 new database tables for RTW Planner Engine (DB-01 to DB-09)
- Defined DemandFrequency type for physical/cognitive demand tracking
- Established FunctionalRestrictions interface matching medical certificate format
- Verified cascade delete relationships work correctly
- Tested all demand frequency values (never, occasionally, frequently, constantly)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema definitions** - `28edd14` (feat)
   - Added all RTW types, interfaces, and 8 table definitions
   - Added Zod insert schemas for validation

2. **Task 2: Database migration** - (runtime operation, no commit)
   - Ran `npm run db:push` to apply schema changes
   - Verified all 8 tables created with correct columns
   - Tested foreign key relationships and cascade deletes

## Files Created/Modified

- `shared/schema.ts` - Added ~400 lines of RTW Planner schema definitions:
  - Types: DemandFrequency, PhysicalDemandCategory, CognitiveDemandCategory, DutySuitability, RTWPlanType, RTWApprovalStatus, RestrictionCapability
  - Interfaces: DutyPhysicalDemands, DutyCognitiveDemands, FunctionalRestrictions
  - Tables: rtwRoles, rtwDuties, rtwDutyDemands, rtwPlans, rtwPlanVersions, rtwPlanDuties, rtwPlanSchedule, rtwApprovals
  - Zod schemas: insertRTWRoleSchema, insertRTWDutySchema, insertRTWDutyDemandsSchema, insertRTWPlanSchema, insertRTWPlanVersionSchema, insertRTWPlanDutySchema, insertRTWPlanScheduleSchema, insertRTWApprovalSchema

## Tables Created

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| rtw_roles | Job roles per organization | organizationId, name, description |
| rtw_duties | Duties for each role | roleId, name, isModifiable, riskFlags |
| rtw_duty_demands | Physical/cognitive demands | dutyId, bending, lifting, concentration, etc. |
| rtw_plans | Formal RTW plans | caseId, planType, status, version |
| rtw_plan_versions | Version control | planId, version, dataJson, changeReason |
| rtw_plan_duties | Plan-duty assignments | planVersionId, dutyId, suitability |
| rtw_plan_schedule | Week-by-week schedule | planVersionId, weekNumber, hoursPerDay |
| rtw_approvals | Manager approval workflow | planVersionId, approverId, status |

## Decisions Made

1. **DemandFrequency as varchar** - Used varchar instead of PostgreSQL enum for flexibility in adding new frequency levels without migration
2. **Cascade deletes** - Implemented cascade deletes from parent to child tables (roles->duties->demands, plans->versions->duties/schedule)
3. **Version snapshots** - RTW plan versions store complete dataJson snapshot for full audit history
4. **Weight limits alongside frequency** - liftingMaxKg and carryingMaxKg stored as separate integer columns for precise weight tracking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - database migration completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 2: Admin - Roles & Duties**
- Database foundation complete
- All foreign key relationships verified
- Organization isolation (multi-tenancy) properly implemented
- API endpoints can now be built on top of these tables

**Dependencies provided:**
- rtwRoles and rtwDuties tables for CRUD operations
- rtwDutyDemands table for physical/cognitive demand matrix
- Type definitions for TypeScript type safety

---
*Phase: phase-1-database-schema*
*Completed: 2026-01-26*
