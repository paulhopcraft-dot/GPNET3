# Roadmap: RTW Planner Engine

**Created:** 2026-01-25
**Phases:** 10
**Approach:** Bottom-up (data layer → logic → UI)

## Phase Overview

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| 1 | Database Schema | Data foundation for all modules | DB-01 to DB-10 | ✓ Complete |
| 2 | Admin: Roles & Duties | Employers can define their job structure | ADMIN-01 to ADMIN-12 | Pending |
| 3 | Medical Integration | Extract constraints from existing certs | MED-01 to MED-10 | Pending |
| 4 | Functional Ability Matrix | Match restrictions to duties | FAM-01 to FAM-09 | Pending |
| 5 | Plan Generator | Auto-create RTW plans | GEN-01 to GEN-10 | Pending |
| 6 | Plan Output | Display and format plans | OUT-01 to OUT-10 | Pending |
| 7 | Email Generation | Manager-ready communications | EMAIL-01 to EMAIL-10 | Pending |
| 8 | Approval Workflow | Manager approve/reject flow | APPR-01 to APPR-11 | Pending |
| 9 | Audit Trail | Immutable decision logging | AUDIT-01 to AUDIT-08 | Pending |
| 10 | RTW Planner UI | Complete user interface | UI-01 to UI-10 | Pending |

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

**Success Criteria:**
1. Restrictions pulled from certificate records
2. Hours/days limits extracted correctly
3. Physical restrictions mapped to demand categories
4. Multiple restrictions combine (most restrictive wins)
5. Current restrictions display on planning screen

**Dependencies:** Phase 1 (database schema)

---

## Phase 4: Functional Ability Matrix

**Goal:** Automatically compare worker restrictions against duty requirements

**Requirements:** FAM-01 to FAM-09

**Success Criteria:**
1. Matrix calculates suitability for each duty
2. Color-coded display: green/yellow/red
3. "With modification" includes suggestions
4. Manual override works with logged reason
5. Edge cases handled (missing data, partial restrictions)

**Dependencies:** Phase 2 (duties), Phase 3 (restrictions)

---

## Phase 5: Plan Generator

**Goal:** Auto-generate RTW plans based on matrix results

**Requirements:** GEN-01 to GEN-10

**Success Criteria:**
1. Plan type auto-selected correctly
2. Graduated schedule generated (4→6→8 hrs)
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

**Goal:** Managers can approve, modify, or reject plans

**Requirements:** APPR-01 to APPR-11

**Success Criteria:**
1. Submit changes status to pending
2. Manager can approve/modify/reject
3. Rejection requires reason
4. Modifications create new versions
5. Only approved plans show as active

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
Phase 1 (DB) ─────────────────────────────────────┐
                                                  │
Phase 2 (Duties) ──┬──────────────────────────────┤
                   │                              │
Phase 3 (Medical) ─┴─→ Phase 4 (Matrix) ──────────┤
                                                  │
                       Phase 5 (Generator) ───────┤
                                                  │
                       Phase 6 (Output) ──────────┤
                                                  │
Phase 7 (Email) ──────────────────────────────────┤
                                                  │
Phase 8 (Approval) ───────────────────────────────┤
                                                  │
Phase 9 (Audit) ──────────────────────────────────┤
                                                  │
Phase 10 (UI) ────────────────────────────────────┘
```

**Phases 2 & 3 can run in parallel** after Phase 1.

---
*Roadmap created: 2026-01-25*
