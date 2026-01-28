# Roadmap: RTW Planner Engine

**Created:** 2026-01-25
**Phases:** 11
**Approach:** Bottom-up (data layer -> logic -> UI)

## Phase Overview

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| 1 | Database Schema | Data foundation for all modules | DB-01 to DB-10 | Complete |
| 2 | Admin: Roles & Duties | Employers can define their job structure | ADMIN-01 to ADMIN-12 | Complete |
| 3 | Medical Integration | Extract constraints from existing certs | MED-01 to MED-10 | Complete |
| 4 | Functional Ability Matrix | Match restrictions to duties | FAM-01 to FAM-09 | Pending |
| 5 | Plan Generator | Auto-create RTW plans | GEN-01 to GEN-10 | Pending |
| 6 | Plan Output | Display and format plans | OUT-01 to OUT-10 | Pending |
| 7 | Email Generation | Manager-ready communications | EMAIL-01 to EMAIL-10 | Pending |
| 8 | Approval Workflow | Manager approve/reject flow | APPR-01 to APPR-11 | Pending |
| 9 | Audit Trail | Immutable decision logging | AUDIT-01 to AUDIT-08 | Pending |
| 10 | RTW Planner UI | Complete user interface | UI-01 to UI-10 | Pending |
| 11 | System-Wide Testing | Comprehensive E2E & integration tests | TEST-01 to TEST-15 | Complete |

---

## Phase 1: Database Schema

**Goal:** Create the data foundation for the entire RTW system

**Requirements:** DB-01 to DB-10

**Success Criteria:**
1. All tables created with proper relationships
2. Migrations run successfully
3. Foreign keys enforce referential integrity
4. Demand frequency enum works correctly
5. Audit log captures all entity types

**Dependencies:** None (foundation phase)

---

## Phase 2: Admin - Roles & Duties

**Goal:** Employers can create and manage their job roles and duties with physical/cognitive demands

**Requirements:** ADMIN-01 to ADMIN-12

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md - Backend API for roles CRUD
- [x] 02-02-PLAN.md - Backend API for duties CRUD with demands
- [x] 02-03-PLAN.md - Frontend roles list and form pages
- [x] 02-04-PLAN.md - Frontend duties list, form, and DemandMatrix component
- [x] 02-05-PLAN.md - End-to-end verification checkpoint

**Success Criteria:**
1. Admin can create a role with duties
2. Each duty has a complete demands matrix (physical + cognitive)
3. Duties can be marked modifiable or fixed
4. Role can be copied as template
5. Data persists and displays correctly

**Dependencies:** Phase 1 (database schema)

---

## Phase 3: Medical Integration

**Goal:** Extract structured medical restrictions from existing certificate data

**Requirements:** MED-01 to MED-10

**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md - Schema update + restriction extractor service (Claude Haiku)
- [x] 03-02-PLAN.md - Restriction mapper + current restrictions API endpoint
- [x] 03-03-PLAN.md - Current restrictions UI panel component

**Wave Structure:**
- Wave 1: Plan 01 (schema + extraction service)
- Wave 2: Plans 02, 03 (parallel - API endpoint + UI component)

**Success Criteria:**
1. Restrictions pulled from certificate records
2. Hours/days limits extracted correctly
3. Physical restrictions mapped to demand categories
4. Multiple restrictions combine (most restrictive wins)
5. Current restrictions display on planning screen

**Dependencies:** Phase 1 (database schema)

---

## Phase 4: Functional Ability Matrix

**Goal:** Automatically compare worker restrictions against duty requirements (suitability PREVIEW on templates)

**Requirements:** FAM-01 to FAM-08 (FAM-09 override deferred to Phase 8)

**Plans:** 4 plans

Plans:
- [ ] 04-01-PLAN.md - Core suitability calculator and modification suggester services (with FAM-02 explicit tests)
- [ ] 04-02-PLAN.md - Matrix API endpoint for duty templates and suitability display utilities
- [ ] 04-03-PLAN.md - TRUE matrix UI component (duties as rows, demand categories as columns)
- [ ] 04-04-PLAN.md - End-to-end verification checkpoint

**Wave Structure:**
- Wave 1: Plan 01 (algorithm services + unit tests)
- Wave 2: Plans 02, 03 (parallel - matrix API + matrix UI)
- Wave 3: Plan 04 (verification checkpoint)

**Architecture Note:**
Phase 4 calculates suitability on duty TEMPLATES (rtwDuties) for preview.
Override functionality requires plan INSTANCES (rtwPlanDuties) - deferred to Phase 8.

**Success Criteria:**
1. Matrix calculates suitability for each duty template
2. Color-coded display: green/yellow/red in TRUE matrix format (FAM-08)
3. "With modification" includes suggestions
4. Edge cases handled (missing data, partial restrictions)
5. Suitability values are ONLY 'suitable' | 'suitable_with_modification' | 'not_suitable' (FAM-02)

**Dependencies:** Phase 2 (duties), Phase 3 (restrictions)

---

## Phase 5: Plan Generator

**Goal:** Auto-generate RTW plans based on matrix results

**Requirements:** GEN-01 to GEN-10

**Success Criteria:**
1. Plan type auto-selected correctly
2. Graduated schedule generated (4->6->8 hrs)
3. Custom schedule allowed
4. Only suitable duties included
5. Plan respects restriction review dates

**Dependencies:** Phase 4 (matrix)

---

## Phase 6: Plan Output

**Goal:** Display complete plan with all details in readable format

**Requirements:** OUT-01 to OUT-10

**Success Criteria:**
1. Plan shows worker, role, injury details
2. Physical demands matrix visible in plan
3. Proposed duties and schedule clear
4. Excluded duties shown with reasons
5. PDF export works

**Dependencies:** Phase 5 (generator)

---

## Phase 7: Email Generation

**Goal:** Auto-generate professional manager emails from plans

**Requirements:** EMAIL-01 to EMAIL-10

**Success Criteria:**
1. Email contains all required sections
2. Professional formatting
3. Editable before approval only
4. Send or copy to clipboard works
5. Templates customizable per org

**Dependencies:** Phase 6 (plan output)

---

## Phase 8: Approval Workflow

**Goal:** Managers can approve, modify, or reject plans (includes FAM-09 override capability)

**Requirements:** APPR-01 to APPR-11 + FAM-09

**Note:** FAM-09 (manual suitability override with audit logging) is implemented in Phase 8 because:
- Override operates on plan INSTANCES (rtwPlanDuties), not templates
- Plan instances are created in Phase 5 (Plan Generator)
- Override is part of the approval/modification workflow

**Success Criteria:**
1. Submit changes status to pending
2. Manager can approve/modify/reject
3. Rejection requires reason
4. Modifications create new versions
5. Only approved plans show as active
6. Manual suitability override with audit trail (FAM-09)

**Dependencies:** Phase 6 (plan output)

---

## Phase 9: Audit Trail

**Goal:** Immutable logging of all RTW decisions

**Requirements:** AUDIT-01 to AUDIT-08

**Success Criteria:**
1. All plan actions logged
2. Before/after data captured
3. Logs are immutable (no edit/delete)
4. Audit history viewable per plan
5. Export for compliance works

**Dependencies:** Phase 8 (approval workflow)

---

## Phase 10: RTW Planner UI

**Goal:** Complete, polished user interface for the planner

**Requirements:** UI-01 to UI-10

**Success Criteria:**
1. Landing page shows cases needing plans
2. Filters work (off work, needs plan, in progress)
3. Plan builder wizard flows smoothly
4. Side-by-side matrix view usable
5. Save draft, submit, discard all work

**Dependencies:** All previous phases

---

## Build Order Rationale

```
Phase 1 (DB) -----------------------------------------+
                                                      |
Phase 2 (Duties) --+----------------------------------+
                   |                                  |
Phase 3 (Medical) -+-> Phase 4 (Matrix) -------------+
                                                      |
                       Phase 5 (Generator) ----------+
                                                      |
                       Phase 6 (Output) -------------+
                                                      |
Phase 7 (Email) -------------------------------------+
                                                      |
Phase 8 (Approval + Override) ----------------------+
                                                      |
Phase 9 (Audit) -------------------------------------+
                                                      |
Phase 10 (UI) ---------------------------------------+
```

**Phases 2 & 3 can run in parallel** after Phase 1.

---

## Phase 11: System-Wide Testing

**Goal:** Comprehensive end-to-end testing of the entire GPNet system including employer portal, case management, and all integrations

**Requirements:** TEST-01 to TEST-15

**Plans:** 7 plans

Plans:
- [x] 11-01-PLAN.md - Test infrastructure setup (fixtures, config, npm scripts)
- [x] 11-02-PLAN.md - Smoke tests (health, auth, navigation)
- [x] 11-03-PLAN.md - Critical path E2E tests (dashboard, cases, tabs)
- [ ] 11-04-PLAN.md - New case flow E2E test
- [x] 11-05-PLAN.md - Performance and API tests
- [x] 11-06-PLAN.md - Database integrity and edge case tests
- [x] 11-07-PLAN.md - Run all tests and generate report

**Wave Structure:**
- Wave 1: Plan 01 (infrastructure setup)
- Wave 2: Plans 02, 03, 04 (parallel - smoke, critical, new case)
- Wave 3: Plans 05, 06 (parallel - performance, integrity)
- Wave 4: Plan 07 (full suite run and verification checkpoint)

**Success Criteria:**
1. Employer portal login and navigation verified
2. All 7 case detail tabs functional with real data
3. New case creation flow works end-to-end
4. API performance meets targets (<5s response times)
5. Playwright E2E tests pass for critical paths
6. Database integrity verified
7. Error handling graceful (no infinite loops, proper error messages)
8. Recovery chart displays certificate dots correctly

**Dependencies:** Can run independently (tests existing system)

**Test Coverage Areas:**
- Employer authentication & session management
- Dashboard data accuracy
- Case list filtering and pagination
- Case detail tabs (Summary, Injury, Timeline, Treatment, Contacts, Financial, Risk)
- New case creation wizard
- RTW Planner integration
- API rate limiting and error handling
- Certificate image display
- Smart summary generation

---
*Roadmap created: 2026-01-25*
*Phase 11 planned: 2026-01-28*
*Phase 3 planned: 2026-01-28*
*Phase 4 planned: 2026-01-28*
*Phase 4 revised: 2026-01-28 (FAM-09 override deferred to Phase 8, FAM-08 true matrix design)*
