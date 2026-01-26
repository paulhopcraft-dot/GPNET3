# Requirements: RTW Planner Engine

**Defined:** 2026-01-25
**Core Value:** Automatically generate legally-defensible RTW plans from structured medical constraints and job duty data

## v1 Requirements

### Database Schema (DB)

- [ ] **DB-01**: Create `roles` table (org_id, name, description, created_at)
- [ ] **DB-02**: Create `duties` table (role_id, name, description, modifiable, risk_flags)
- [ ] **DB-03**: Create `duty_demands` table with physical demand categories:
  - Bending, Squatting, Kneeling, Twisting
  - Reaching overhead, Reaching forward
  - Lifting (with weight limits), Carrying
  - Standing, Sitting, Walking
  - Repetitive movements
  - Cognitive: concentration, stress tolerance, pace
- [ ] **DB-04**: Demand frequency enum: Never | Occasionally | Frequently | Constantly
- [ ] **DB-05**: Create `rtw_plans` table (case_id, worker_id, status, plan_type, created_by)
- [ ] **DB-06**: Create `rtw_plan_versions` table (plan_id, version, data_json, created_at)
- [ ] **DB-07**: Create `rtw_plan_duties` table (plan_version_id, duty_id, suitability, modification_notes)
- [ ] **DB-08**: Create `rtw_plan_schedule` table (plan_version_id, week_number, hours_per_day, days_per_week, duties_json)
- [ ] **DB-09**: Create `rtw_approvals` table (plan_version_id, approver_id, status, reason, approved_at)
- [ ] **DB-10**: Create `rtw_audit_log` table (entity_type, entity_id, action, user_id, data_json, timestamp)

### Admin UI - Roles & Duties (ADMIN)

- [ ] **ADMIN-01**: List all roles for organisation
- [ ] **ADMIN-02**: Create new role with name and description
- [ ] **ADMIN-03**: Edit existing role
- [ ] **ADMIN-04**: Delete role (soft delete, check for active plans)
- [ ] **ADMIN-05**: List duties for a role
- [ ] **ADMIN-06**: Create new duty with name, description, modifiable flag
- [ ] **ADMIN-07**: Set physical demands for duty (frequency matrix)
- [ ] **ADMIN-08**: Set cognitive demands for duty
- [ ] **ADMIN-09**: Mark duty risk flags
- [ ] **ADMIN-10**: Edit existing duty and demands
- [ ] **ADMIN-11**: Delete duty (soft delete)
- [ ] **ADMIN-12**: Copy role with all duties (template feature)

### Medical Constraints Integration (MED)

- [ ] **MED-01**: Read medical restrictions from existing certificate data
- [ ] **MED-02**: Map certificate restrictions to demand categories
- [ ] **MED-03**: Extract: max hours/day, max days/week
- [ ] **MED-04**: Extract: lifting limits (kg)
- [ ] **MED-05**: Extract: sitting/standing tolerance
- [ ] **MED-06**: Extract: repetitive movement limits
- [ ] **MED-07**: Extract: cognitive limits (concentration, stress, pace)
- [ ] **MED-08**: Extract: restriction start and review dates
- [ ] **MED-09**: Display current restrictions on RTW planning screen
- [ ] **MED-10**: Handle multiple active restrictions (combine most restrictive)

### Functional Ability Matrix (FAM)

- [ ] **FAM-01**: Compare worker restrictions against duty demands
- [ ] **FAM-02**: Calculate suitability per duty: Suitable / With modification / Not suitable
- [ ] **FAM-03**: For each demand category, compare restriction vs requirement
- [ ] **FAM-04**: "Suitable" = all demands within restrictions
- [ ] **FAM-05**: "With modification" = some demands exceed but duty is modifiable
- [ ] **FAM-06**: "Not suitable" = demands exceed and not modifiable
- [ ] **FAM-07**: Generate modification suggestions for "with modification" duties
- [ ] **FAM-08**: Display matrix view: duties vs demand categories with color coding
- [ ] **FAM-09**: Allow manual override with reason (logged)

### RTW Plan Generator (GEN)

- [ ] **GEN-01**: Auto-select plan type based on restrictions:
  - Normal hours: restrictions allow full duties
  - Partial hours: hours capped, duties OK
  - Graduated return: hours and/or duties scale over weeks
- [ ] **GEN-02**: Generate week-by-week schedule for graduated plans
- [ ] **GEN-03**: Default graduation: 4hrs → 6hrs → 8hrs over 3 weeks
- [ ] **GEN-04**: Allow custom graduation schedule
- [ ] **GEN-05**: Include only suitable and "with modification" duties
- [ ] **GEN-06**: Exclude not-suitable duties with reason
- [ ] **GEN-07**: Calculate total hours per week
- [ ] **GEN-08**: Respect review dates (plan cannot extend past restriction review)
- [ ] **GEN-09**: Preview plan before saving
- [ ] **GEN-10**: Save plan as draft

### RTW Plan Output (OUT)

- [ ] **OUT-01**: Display plan summary with worker, role, injury details
- [ ] **OUT-02**: Show medical constraints section
- [ ] **OUT-03**: Show physical demands matrix in plan (Never/Occasionally/Frequently/Constantly)
- [ ] **OUT-04**: Show proposed duties with suitability status
- [ ] **OUT-05**: Show proposed schedule (hours per day, days per week, by week)
- [ ] **OUT-06**: Show excluded duties with reasons
- [ ] **OUT-07**: Generate manager email from plan
- [ ] **OUT-08**: Email editable only before approval
- [ ] **OUT-09**: Print-friendly plan view
- [ ] **OUT-10**: PDF export of plan

### Email Generation (EMAIL)

- [ ] **EMAIL-01**: Auto-generate email with manager greeting
- [ ] **EMAIL-02**: Include worker name, role, injury date
- [ ] **EMAIL-03**: Include medical constraints summary
- [ ] **EMAIL-04**: Include proposed duties (suitable, modified, excluded)
- [ ] **EMAIL-05**: Include proposed hours schedule
- [ ] **EMAIL-06**: Include review date
- [ ] **EMAIL-07**: Include approval request call-to-action
- [ ] **EMAIL-08**: Professional formatting with sections
- [ ] **EMAIL-09**: Customizable email templates per organisation
- [ ] **EMAIL-10**: Send email directly or copy to clipboard

### Manager Approval Workflow (APPR)

- [ ] **APPR-01**: Submit plan for approval (changes status to pending)
- [ ] **APPR-02**: Manager receives notification of pending plan
- [ ] **APPR-03**: Manager can view full plan details
- [ ] **APPR-04**: Approve as-is (plan becomes active)
- [ ] **APPR-05**: Request modification with comments
- [ ] **APPR-06**: Reject with mandatory reason
- [ ] **APPR-07**: Modification request returns plan to planner
- [ ] **APPR-08**: Planner can revise and resubmit
- [ ] **APPR-09**: Each revision creates new version
- [ ] **APPR-10**: Show approval history on plan
- [ ] **APPR-11**: Only approved plans show as "active" on case

### Audit Trail (AUDIT)

- [ ] **AUDIT-01**: Log plan creation with user and timestamp
- [ ] **AUDIT-02**: Log all plan edits with before/after data
- [ ] **AUDIT-03**: Log submission for approval
- [ ] **AUDIT-04**: Log approval/rejection/modification request
- [ ] **AUDIT-05**: Log duty changes with user attribution
- [ ] **AUDIT-06**: Immutable log entries (no edit/delete)
- [ ] **AUDIT-07**: View audit history for any plan
- [ ] **AUDIT-08**: Export audit log for compliance

### RTW Planner UI (UI)

- [ ] **UI-01**: RTW Planner landing page with case list needing plans
- [ ] **UI-02**: Filter cases by: off work, needs plan, plan in progress
- [ ] **UI-03**: Quick stats: cases needing plans, plans pending, plans active
- [ ] **UI-04**: Click case to start/edit RTW plan
- [ ] **UI-05**: Plan builder wizard: constraints → role → duties → schedule → review
- [ ] **UI-06**: Side-by-side view: restrictions vs duties matrix
- [ ] **UI-07**: Drag-and-drop duty selection
- [ ] **UI-08**: Schedule builder with week rows
- [ ] **UI-09**: Real-time validation (hours exceed restrictions warning)
- [ ] **UI-10**: Save draft, submit for approval, or discard

## v2 Requirements

### Intelligence Layer
- Predictive recovery timelines based on injury type
- AI-powered plan recommendations from outcomes data
- Anomaly detection for unusual restriction patterns

### Multi-Jurisdiction
- Jurisdiction-specific compliance rules
- Regional duty templates
- Localized terminology

### Integration
- Direct treating practitioner portal
- API for external systems
- Bulk duty import/export

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first, mobile later |
| Video consultations | Not core to RTW planning |
| Direct doctor API | Manual cert upload sufficient |
| Payroll integration | Separate system concern |
| Training module | Nice-to-have, not core |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 to DB-10 | Phase 1 | Pending |
| ADMIN-01 to ADMIN-12 | Phase 2 | Pending |
| MED-01 to MED-10 | Phase 3 | Pending |
| FAM-01 to FAM-09 | Phase 4 | Pending |
| GEN-01 to GEN-10 | Phase 5 | Pending |
| OUT-01 to OUT-10 | Phase 6 | Pending |
| EMAIL-01 to EMAIL-10 | Phase 7 | Pending |
| APPR-01 to APPR-11 | Phase 8 | Pending |
| AUDIT-01 to AUDIT-08 | Phase 9 | Pending |
| UI-01 to UI-10 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 90 total
- Mapped to phases: 90
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after initial definition*
