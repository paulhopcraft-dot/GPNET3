# 30 — System Remediation & Enhancement Specification

**Version:** 1.0
**Date:** 3 March 2026
**Status:** Draft — pending review
**Scope:** Full system update addressing security, usability, compliance accuracy, accessibility, and architecture findings from comprehensive audit.
**Prerequisite reading:** `PREVENTLI_FULL_AUDIT_REPORT.md` (audit findings this spec remediates)

---

## Overview

This specification defines all changes required to bring Preventli from its current state (production with 174 cases, 15+ employers) to a system that is secure, accessible, and genuinely usable by three distinct user roles: **Case Managers**, **AHR (Allied Health Rehabilitation) Managers**, and **HR Managers**. The core design principle is that any user should be able to open any case and immediately understand: where the case is up to, why it's in that state, and what needs to happen next.

Every change is grouped into one of six phases. Phases 1-2 are prerequisites — nothing else ships until they're done. Phases 3-6 can overlap.

---

## Table of Contents

- [Phase 1: Security Hardening](#phase-1-security-hardening)
- [Phase 2: The Explanation Layer](#phase-2-the-explanation-layer)
- [Phase 3: Data Model & Case Lifecycle](#phase-3-data-model--case-lifecycle)
- [Phase 4: Case Manager Experience](#phase-4-case-manager-experience)
- [Phase 5: HR Manager Experience](#phase-5-hr-manager-experience)
- [Phase 6: AHR Manager & Clinical Experience](#phase-6-ahr-manager--clinical-experience)
- [Phase 7: Compliance Engine Expansion](#phase-7-compliance-engine-expansion)
- [Phase 8: RTW System Rebuild](#phase-8-rtw-system-rebuild)
- [Phase 9: Termination Workflow Hardening](#phase-9-termination-workflow-hardening)
- [Phase 10: Accessibility & Performance](#phase-10-accessibility--performance)
- [Phase 11: Edge Cases & Advanced Scenarios](#phase-11-edge-cases--advanced-scenarios)
- [Phase 12: Documentation & Onboarding](#phase-12-documentation--onboarding)
- [Appendix A: New & Modified Types](#appendix-a-new--modified-types)
- [Appendix B: Human-Readable Label Map](#appendix-b-human-readable-label-map)
- [Appendix C: Compliance Rule Reference Table](#appendix-c-compliance-rule-reference-table)
- [Appendix D: Explanation Templates](#appendix-d-explanation-templates)

---

## Phase 1: Security Hardening

**Priority:** CRITICAL — must ship before any other changes.
**Estimated effort:** 1-2 days.
**Principle:** Fail closed. Never trust client-side filtering. Every endpoint must authenticate and authorise.

### 1.1 — Fix Authentication Bypass on RTW Routes

**File:** `server/routes/rtw.ts` lines 231, 295, 323

The `authorize` middleware is passed as a reference (`authorize`) instead of being invoked (`authorize()`). This means the middleware function itself is passed as an argument but never called — requests pass through unauthenticated.

**Change:** Replace `authorize` with `authorize()` on all three lines. Verify with a test that unauthenticated requests to these endpoints return 401.

**Affected endpoints:**
- `PUT /api/cases/:id/rtw-plan/extend`
- `POST /api/cases/:id/rtw-plan/schedule`
- `PUT /api/cases/:id/rtw-plan/status`

### 1.2 — Close Fail-Open Email Webhook

**File:** `server/routes/inbound-email.ts` line 44

When `INBOUND_EMAIL_WEBHOOK_SECRET` is not set, the webhook accepts all incoming requests. This allows forged emails to be injected into case records.

**Change:** When the secret is not configured, reject all requests with 503 ("Email webhook not configured"). Log a warning at startup if the secret is missing.

### 1.3 — Restore Rate Limiting

**File:** `server/middleware/security.ts` line 15

Rate limiter is set to 100,000 requests per 15 minutes with a "TEMP" comment. This provides no meaningful protection.

**Change:** Set to 10,000 requests per 15 minutes for general endpoints. For authentication endpoints (`/api/auth/*`), set to 20 requests per 15 minutes per IP. Remove the "TEMP" comment.

### 1.4 — Protect Diagnostic Endpoints

**Affected endpoints:**
- `GET /api/system/health` — returns uptime and service status
- `GET /api/diagnostics/env` — confirms which services are configured

**Change:** Move `/api/diagnostics/env` behind authentication. Reduce `/api/system/health` to return only `{ status: "ok" }` without internal details. Internal details available only to authenticated admin users.

### 1.5 — Sanitise Error Responses

Multiple routes return raw `error.message` to clients, potentially leaking stack traces, database errors, and internal implementation details.

**Change:** Create a centralised error handler middleware. All error responses return a structured object:

```typescript
interface ErrorResponse {
  error: string;        // Human-readable message (safe for client)
  code: string;         // Machine-readable error code (e.g., "CASE_NOT_FOUND")
  requestId: string;    // For support correlation
}
```

Internal error details logged server-side only, never sent to client.

### 1.6 — Remove Mock Data from Production Endpoints

**File:** `server/routes.ts` lines 308-345

Dashboard statistics endpoints return `Math.random()` values for active users, cases processed, and other metrics. Users see fabricated numbers.

**Change:** Replace with actual database queries or remove the endpoints until real data is available. If an endpoint cannot return real data, return `null` with a flag indicating data is unavailable.

### 1.7 — Secure ID Generation

**File:** `server/routes/memory.ts` line 73

`Math.random()` used for ID generation. Not cryptographically secure.

**Change:** Replace with `crypto.randomUUID()` (Node.js built-in) for all ID generation.

### 1.8 — Server-Enforced Data Boundaries (RBAC)

This is the most significant security change. Currently, multi-tenant isolation works via `organizationId` ownership checks, but there is no **role-based field filtering** — a user with the `employer` role can potentially access the same case data as a `case_manager` role.

**Requirements:**

Define three data visibility tiers:

| Field Category | Case Manager | AHR Manager | HR/Employer |
|---------------|-------------|-------------|-------------|
| Worker identity (name, DOB, contact) | ✅ | ✅ | ✅ |
| Injury type & date | ✅ | ✅ | ✅ |
| Work status & days off | ✅ | ✅ | ✅ |
| Medical certificate dates & validity | ✅ | ✅ | ✅ |
| Functional capacity & restrictions | ✅ | ✅ | ✅ |
| RTW plan status & schedule | ✅ | ✅ | ✅ |
| Compliance status | ✅ | ✅ | ✅ |
| **Diagnosis details** | ✅ | ✅ | ❌ |
| **Treatment plans** | ✅ | ✅ | ❌ |
| **Clinical notes** | ✅ | ✅ | ❌ |
| **GP/specialist reports** | ✅ | ✅ | ❌ |
| **Mental health details** | ✅ | ✅ | ❌ |
| **Discussion notes (clinical)** | ✅ | ✅ | ❌ |
| AI clinical summaries | ✅ | ✅ | ❌ |
| Case actions & next steps | ✅ | ✅ | ✅ (own actions only) |
| Financial/cost data | ✅ | ❌ | ✅ |
| Termination workflow | ✅ | ❌ | ✅ |

**Implementation:** Create a `filterCaseByRole(case, userRole)` function in the API layer that strips fields before response. This must be called on **every endpoint that returns case data**. Never rely on the frontend to hide fields.

Add a `user_roles` table:

```typescript
type UserRole = "admin" | "case_manager" | "ahr_manager" | "employer_hr" | "employer_supervisor" | "worker";
```

---

## Phase 2: The Explanation Layer

**Priority:** HIGH — the single highest-impact UX change across all roles.
**Estimated effort:** 5-7 days.
**Principle:** Every flag, score, recommendation, and status in the system must answer three questions: **What** (the status), **Why** (the reasoning), and **So What** (the next step).

### 2.1 — Explanation Data Structure

Add a universal explanation type used across the system:

```typescript
interface Explanation {
  summary: string;              // One-sentence plain English (shown by default)
  detail?: string;              // 2-3 sentence expanded explanation (shown on click/expand)
  factors?: ExplanationFactor[];// Contributing factors with weights
  legislativeRef?: {            // Relevant legislation
    act: string;                // e.g., "WIRC Act 2013"
    section: string;            // e.g., "s82"
    description: string;        // e.g., "Employer obligations for return to work"
  };
  consequence?: string;         // What happens if ignored
  remedy?: string;              // Specific next step to resolve
  confidence?: "high" | "medium" | "low";
}

interface ExplanationFactor {
  factor: string;               // e.g., "Duration exceeds expected"
  impact: "positive" | "negative" | "neutral";
  detail: string;               // e.g., "Off work 8 weeks vs expected 4-6 weeks"
  weight?: number;              // 0-1, how much this factor contributes
}
```

### 2.2 — Risk Level Explanations

**Current state:** Risk shows as "HIGH", "MEDIUM", or "LOW" with no reasoning.

**Required state:** The `TimelineFactor[]` array already exists in the recovery estimator. Surface these factors as human-readable explanations.

**Template:**
```
Risk level: {riskLevel}
{summary}

Contributing factors:
- {factor1.detail}
- {factor2.detail}
- {factor3.detail}

Recommendation: {remedy}
```

**Example output:**
```
Risk level: HIGH
This worker's recovery is significantly behind expected timeline for this injury type.

Contributing factors:
- Off work 8 weeks vs expected 4-6 weeks for soft tissue shoulder injury
- Last 2 certificates extended time off without new clinical findings
- No RTW plan in place despite capacity for modified duties

Recommendation: Request an Independent Medical Examination and schedule a
3-way meeting with the worker and treating practitioner.
```

### 2.3 — Compliance Rule Explanations

**Current state:** Compliance shows rule codes like `CERT_CURRENT: NON_COMPLIANT`.

**Required state:** Every compliance rule carries a full explanation object.

Update the `ComplianceRule` type to include:

```typescript
interface ComplianceRule {
  // ... existing fields ...
  explanation: {
    obligation: string;       // Plain English: what you must do
    legislativeRef: string;   // e.g., "WIRC Act 2013, s38"
    consequence: string;      // What happens if non-compliant
    remedy: string;           // Specific action to become compliant
  };
}
```

**Example for each existing rule:**

| Rule Code | Obligation | Legislation | Consequence | Remedy |
|-----------|-----------|-------------|-------------|--------|
| `CERT_CURRENT` | "A current medical certificate must be on file at all times during an active claim" | WIRC Act 2013, s112 | "WorkSafe can issue an improvement notice; worker cannot be directed to duties without a valid certificate" | "Contact the treating GP to request an updated certificate. Draft email available below." |
| `RTW_PLAN_10WK` | "For serious injuries, an RTW plan must be developed within 10 weeks of the claim" | WorkSafe RTW Code of Practice, cl.4.3 | "Non-compliance may trigger WorkSafe investigation and penalties" | "Initiate RTW planning using the worker's current functional capacity and restrictions." |
| `FILE_REVIEW_8WK` | "Case files must be reviewed at least every 8 weeks" | WorkSafe Claims Manual, ch.7 | "Stale case files increase risk of non-compliance and missed intervention opportunities" | "Schedule a case review. Review current medical status, RTW progress, and compliance items." |
| `PAYMENT_STEPDOWN` | "Weekly compensation reduces to 80% of pre-injury earnings after 13 weeks" | WIRC Act 2013, s114 | "Incorrect payments create liability for the insurer and confusion for the worker" | "Verify payment calculations have been adjusted. Notify the worker of the change in writing." |
| `CENTRELINK_CLEARANCE` | "Centrelink clearance must be obtained for workers receiving income support" | Social Security Act 1991 | "Duplicate payments create recovery obligations" | "Submit Centrelink clearance request if not already done." |
| `SUITABLE_DUTIES` | "Employers must provide suitable duties to injured workers where available" | WIRC Act 2013, s82-83 | "Failure to provide suitable duties may result in WorkSafe prosecution" | "Conduct a workplace assessment to identify suitable duties matching the worker's current capacity." |
| `RTW_OBLIGATIONS` | "Both employer and worker have obligations to participate in return to work" | WIRC Act 2013, s82-83; RTW Code of Practice | "WorkSafe can issue compliance notices to either party" | "Ensure both employer and worker are actively engaged in the RTW process." |

### 2.4 — RTW Recommendation Explanations

**Current state:** Plan generator recommends a plan type silently.

**Required state:** Every recommendation includes the decision chain.

**Templates by plan type:**

**Graduated Return:**
```
Recommended: Graduated Return
Based on: Worker currently certified for {maxHours}hrs/day max (certificate dated {certDate}).
Functional capacity shows {capacityPercent}% of pre-injury level. Restrictions include {restrictions}.
A graduated return allows progressive loading over {weeks} weeks while monitoring symptom response.
This aligns with WorkSafe's RTW Code of Practice for {injuryCategory} injuries.
```

**Partial Hours:**
```
Recommended: Partial Hours
Based on: Worker has hour restrictions ({maxHours}hrs/day) but {dutyPercent}% of pre-injury duties
are within current capacity. Partial hours at the same role allows maintenance of work conditioning
while respecting medical restrictions.
```

**Normal Hours:**
```
Recommended: Normal Hours (Modified Duties)
Based on: No hour restrictions on current certificate. However, {restrictionCount} duty restrictions
apply ({restrictions}). Worker can attend for full hours with modified task allocation.
```

### 2.5 — Recovery Timeline Interpretations

**Current state:** Shows "2 weeks behind expected" with no clinical context.

**Required state:** Interpretation varies by injury type and recovery phase.

**Template:**
```
Recovery tracking: {weeksDifference} weeks {ahead/behind} expected
For {injuryType}, most workers {expectedOutcome} by week {expectedWeek}.
This worker is at week {currentWeek} with capacity at {capacityPercent}%.
{phaseSpecificInterpretation}
{recommendedAction}
```

**Phase-specific interpretation examples:**

| Phase | Behind interpretation |
|-------|---------------------|
| Early (weeks 1-4) | "Early-stage delays often indicate inadequate initial pain management or insufficient rest. Consider reviewing the treatment plan with the GP." |
| Mid (weeks 4-8) | "Mid-recovery delays commonly indicate psychosocial barriers (fear of re-injury, workplace conflict) or inadequate physiotherapy frequency. Consider an occupational rehabilitation referral." |
| Late (weeks 8+) | "Late-stage plateaus often indicate developing chronic pain patterns, undiagnosed comorbidities, or secondary psychological conditions. Consider requesting an Independent Medical Examination." |

### 2.6 — Action Rationales

**Current state:** Actions appear as tasks with no context (e.g., "Schedule employer meeting").

**Required state:** Every action includes a one-line rationale explaining why this action is needed now.

```typescript
interface CaseAction {
  // ... existing fields ...
  rationale: string;    // Why this action, why now
  triggerCondition: string; // What triggered this action
}
```

**Example rationales:**

| Action | Rationale |
|--------|-----------|
| "Request updated certificate" | "Current certificate expires in 3 days. A gap in certification means no duties can be assigned." |
| "Schedule employer meeting" | "Worker's certificate now allows modified duties (seated, 4hrs/day) but no suitable duties have been identified yet. Employer consultation required under s82(2)." |
| "Initiate RTW plan" | "Worker has been off work 8 weeks. Under WorkSafe guidelines, RTW plan must be in place by week 10 for serious injuries. Current certificate shows capacity for modified duties." |
| "Request treatment plan review" | "Worker is 3 weeks behind expected recovery for this injury type. Treatment plan was last updated 6 weeks ago. A review may identify opportunities to adjust the treatment approach." |
| "Schedule Independent Medical Examination" | "Worker has been off work 12 weeks with no improvement in last 4 weeks. Recovery has plateaued despite active treatment. An IME can provide independent assessment of capacity and prognosis." |

### 2.7 — Frontend Rendering

All explanations must be rendered consistently across the UI:

- **Default view:** Show `summary` text inline next to the flag/score/action
- **Expand view:** Click/tap to expand to `detail` + `factors` + `legislativeRef`
- **Tooltip hover:** On desktop, hover over any flag/badge to see the `summary`
- **Style:** Use a subtle info icon (ℹ) next to any element that has an explanation. Never hide explanations behind multiple clicks.

---

## Phase 3: Data Model & Case Lifecycle

**Priority:** HIGH — foundational for all UX improvements.
**Estimated effort:** 3-5 days.

### 3.1 — Case Lifecycle Stage

**Current state:** `caseStatus` is `"open" | "closed"`. The 5-stage lifecycle exists only as hardcoded client-side arrays, calculated from `daysOffWork` heuristic.

**Required state:** Lifecycle stage is a persisted, auditable, first-class field.

Add to `WorkerCase`:

```typescript
type CaseLifecycleStage =
  | "intake"              // Claim received, initial documentation being gathered
  | "assessment"          // Medical assessment, functional capacity evaluation
  | "active_treatment"    // Ongoing treatment, monitoring recovery
  | "rtw_transition"      // Actively planning or executing return to work
  | "maintenance"         // Worker returned but still on modified duties / monitoring
  | "closed_rtw"          // Closed — successful return to work
  | "closed_medical_retirement"  // Closed — medical retirement
  | "closed_terminated"   // Closed — employment terminated (s82)
  | "closed_claim_denied" // Closed — claim denied/rejected
  | "closed_other";       // Closed — other reason

interface WorkerCase {
  // ... existing fields ...
  lifecycleStage: CaseLifecycleStage;
  lifecycleStageChangedAt: string;   // ISO timestamp
  lifecycleStageChangedBy: string;   // User ID
  lifecycleStageReason?: string;     // Optional reason for stage change
}
```

**Lifecycle transitions:**

```
intake → assessment
assessment → active_treatment | closed_claim_denied
active_treatment → rtw_transition | closed_medical_retirement | closed_terminated
rtw_transition → maintenance | active_treatment (regression) | closed_terminated
maintenance → closed_rtw | rtw_transition (regression) | active_treatment (regression)
```

Invalid transitions must be rejected by the API with an explanation of why (e.g., "Cannot move from intake to rtw_transition — assessment must be completed first").

**Migration:** All existing `open` cases must be assigned a lifecycle stage based on their current data:
- Has RTW plan in `in_progress`/`working_well` → `rtw_transition`
- Has RTW plan in `completed` → `maintenance`
- Has active certificate and >4 weeks off work → `active_treatment`
- Has active certificate and ≤4 weeks off work → `assessment`
- Otherwise → `intake`
- All `closed` cases → `closed_rtw` (default, can be manually corrected)

**Audit trail:** Every stage transition is logged in `case_lifecycle_log`:

```typescript
interface CaseLifecycleLog {
  id: string;
  caseId: string;
  fromStage: CaseLifecycleStage;
  toStage: CaseLifecycleStage;
  changedBy: string;
  changedAt: string;
  reason?: string;
  automated: boolean;  // true if system-triggered, false if manual
}
```

### 3.2 — Case Assignment

Add case ownership and assignment:

```typescript
interface WorkerCase {
  // ... existing fields ...
  assignedTo: string;            // Primary case manager user ID
  assignedToName: string;        // Denormalized for display
  assignedAt: string;
  secondaryAssignment?: string;  // Optional secondary (e.g., AHR manager)
}
```

### 3.3 — Unified Action System

**Current state:** Three disconnected action sources — Case Action Plan (persisted), Smart Actions (ephemeral), Clinical Actions (stateless).

**Required state:** One unified, persisted action system.

```typescript
type ActionSource = "compliance" | "clinical" | "rtw" | "manual" | "ai_recommendation";
type ActionAssignee = "case_manager" | "ahr_manager" | "hr" | "employer" | "worker" | "gp" | "specialist";
type ActionPriority = "critical" | "high" | "medium" | "low";

interface UnifiedCaseAction {
  id: string;
  caseId: string;
  organizationId: string;

  // What
  title: string;                    // e.g., "Request updated medical certificate"
  description: string;              // Detailed description
  rationale: string;                // WHY this action (see Phase 2)

  // Who
  assignedTo: ActionAssignee;       // Role responsible
  assignedToUserId?: string;        // Specific user (optional)

  // When
  dueDate: string;
  createdAt: string;
  completedAt?: string;

  // Priority & Status
  priority: ActionPriority;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "overdue";

  // Source & context
  source: ActionSource;
  triggerCondition: string;         // What triggered this action
  complianceRuleCode?: string;      // If compliance-triggered
  legislativeRef?: string;          // If legally required

  // Helpers
  draftEmail?: string;              // Pre-written email if applicable
  phoneScript?: string;             // Phone call script if applicable

  // Explanation
  explanation: Explanation;         // Full explanation object (Phase 2)
}
```

**Behaviour:**
- All existing action sources (compliance engine, clinical analysis, AI recommendations) write to this single table
- Actions are persisted — "Mark Complete" actually saves
- Actions display in a single ordered list on the case view, sorted by: overdue first, then priority, then due date
- Completed actions move to a "History" tab, not deleted
- Cancelled actions require a reason

### 3.4 — Human-Readable Labels

**Current state:** Raw enum values leak to the UI (e.g., `not_planned`, `off_work`, `non_compliant`).

**Required state:** All enum values have a display label and description.

Create a central label mapping (see Appendix B for full table). This is used by all frontend components. No component should ever render a raw enum value.

---

## Phase 4: Case Manager Experience

**Priority:** HIGH.
**Estimated effort:** 8-10 days.
**Design principle:** A case manager should be able to manage 50-100 cases without losing track of any.

### 4.1 — Case List Redesign

**Current state:** Flat list with limited filtering.

**Required state:**

**Filters (persistent, saved per user):**
- **My Cases / All Cases** toggle (default: My Cases)
- **Lifecycle stage** multi-select chips
- **Risk level** multi-select chips
- **Compliance status** multi-select chips
- **RTW plan status** multi-select chips
- **Employer** dropdown
- **Search** by worker name or case ID

**Sort options:**
- Urgency (overdue actions first, then critical priority)
- Days off work (descending)
- Compliance risk (worst first)
- Next action due date
- Lifecycle stage
- Worker name (alphabetical)

**Case card in list view must show:**
- Worker name + employer
- Lifecycle stage badge (colour-coded)
- Risk level badge
- Days off work
- Top overdue action (if any) with red indicator
- Compliance status indicator
- RTW plan status indicator
- Assigned case manager avatar/initials

### 4.2 — Full-Page Case View

**Current state:** 384px sidebar panel with 17+ scrollable sections.

**Required state:** Full-page layout with tabbed sections.

**Tab structure:**

**Tab 1: Overview (default)**
- Case header: Worker name, employer, injury type, date of injury, days off work
- Lifecycle stage indicator (horizontal stepper, colour-coded)
- Three summary cards in a row:
  - **Current Capacity** — restrictions and functional capacity in plain language (e.g., "Seated work up to 4hrs/day. No lifting over 5kg. No bending or twisting.")
  - **Compliance** — overall status with explanation, next compliance deadline
  - **Recovery** — ahead/on track/behind badge with explanation, expected RTW date
- **Actions** — unified action list (see 3.3), showing pending/overdue actions sorted by priority
- **Case timeline** — chronological log of key events (certificate received, stage change, action completed, communication sent)

**Tab 2: Clinical**
- Recovery timeline chart (simplified — see Phase 6)
- Medical certificates (table with dates, GP, restrictions, upload)
- Treatment plans
- Specialist referrals and reports
- Clinical notes / discussion notes
- Mental health tracking (if applicable)

**Tab 3: RTW (Return to Work)**
- RTW plan status with state machine visualisation
- Current plan details (type, schedule, duties)
- Plan history
- Graduated return schedule (editable)
- Worker consent status
- Employer duty assessment

**Tab 4: Communications**
- All emails, calls, and notes for this case
- Stakeholder contact list
- Communication templates
- Draft emails ready to send

### 4.3 — Current Capacity Card

**This is a new top-level component that does not exist today.**

The system stores `MedicalConstraints` and `FunctionalCapacity` in the schema but never surfaces them prominently. For case managers and employers, "what can this worker do right now?" is one of the most frequent questions.

**Design:**

```
┌──────────────────────────────────────────────────┐
│ 📋 Current Capacity          Updated: 15 Feb 2026│
│                                                    │
│ ✅ Seated work up to 4 hours/day                  │
│ ✅ Light duties (no heavy manual handling)        │
│ ❌ No lifting over 5kg                            │
│ ❌ No bending or twisting                         │
│ ❌ No prolonged standing (>30 min)                │
│                                                    │
│ Hours: 4hrs/day max, 3 days/week                  │
│ Source: GP Certificate dated 15 Feb 2026          │
│                                                    │
│ ℹ️ Why these restrictions?                        │
│ Worker has a Grade II lumbar disc protrusion.     │
│ Current phase: active recovery (week 6). These    │
│ restrictions are typical for this injury at this  │
│ stage and are expected to progressively ease.     │
└──────────────────────────────────────────────────┘
```

This card appears on:
- Case Overview tab (prominently)
- Employer case detail view
- RTW planning form (pre-populated)

---

## Phase 5: HR Manager Experience

**Priority:** HIGH.
**Estimated effort:** 6-8 days.
**Design principle:** HR dips in when needed. Show only what requires their attention. Explain everything in plain English, not clinical or legal jargon.

### 5.1 — Decisions Needed Queue

**New page for HR users.** Surfaces cases that specifically require HR input.

**Trigger conditions for "Decision Needed":**

| Trigger | Label shown to HR |
|---------|-------------------|
| Suitable duties assessment not completed within 7 days of RTW plan | "Workplace assessment needed" |
| Termination eligibility reached (52+ weeks) | "Termination eligibility — review required" |
| RTW plan requires employer sign-off | "RTW plan ready for your review" |
| Worker has refused reasonable duties | "Worker duty refusal — escalation needed" |
| Worker consent not obtained for RTW plan | "Worker consent outstanding" |
| Compliance breach requiring employer action | "Compliance action required: {ruleDescription}" |
| Pre-termination meeting due | "Pre-termination meeting scheduling required" |

**Each decision card shows:**
- Worker name, injury type, days off work
- What decision is needed (plain English)
- Why it's needed (rationale with legislative reference where applicable)
- Deadline (if any)
- Quick-action buttons (e.g., "Review RTW Plan", "Schedule Meeting", "View Case")

### 5.2 — Portfolio Summary

**New component at top of employer dashboard.** Answers: "What's my overall injury picture?"

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Active Claims│ Cost This FY│ Compliance  │ Approaching │
│     12       │   $84,200   │    78%      │ Termination │
│  ▲2 vs last │  ▲$12K vs   │  ▼ from 85% │      2      │
│    month     │  last month │  last month │             │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Data sources:**
- Active claims: count of `caseStatus = 'open'` for this organization
- Cost: from financial tracking (existing)
- Compliance: average compliance score across active cases
- Approaching termination: cases where `weeksOffWork >= 48` (approaching 52-week s82 threshold)

**Trend indicators:** Compare current month to previous month. Show directional arrows and delta values.

### 5.3 — RTW Plan Employer Sign-Off Workflow

**Current state:** Free-text "Employer Input" section in the RTW form.

**Required state:** Structured review-and-approve workflow.

```
Case Manager creates/updates RTW plan
    ↓
Plan status: "pending_employer_review"
    ↓
HR/Employer receives notification + decision card
    ↓
HR reviews plan → Can:
  - Approve (plan moves to "planned_not_started" or "in_progress")
  - Request changes (adds comment, plan stays in "pending_employer_review")
  - Reject with reason (plan moves to "not_planned", reason logged)
    ↓
All actions logged in audit trail
```

Add to RTWPlanStatus:
```typescript
type RTWPlanStatus =
  | "not_planned"
  | "pending_employer_review"    // NEW
  | "planned_not_started"
  | "in_progress"
  | "working_well"
  | "failing"
  | "on_hold"
  | "completed";
```

### 5.4 — Export & Reporting

HR managers report to executives. They need exportable data.

**Required exports:**

| Report | Format | Contents |
|--------|--------|----------|
| Monthly injury summary | PDF | New claims, closed claims, avg days lost, cost, compliance score |
| Case summary | PDF | Single case overview suitable for management review |
| Compliance report | PDF | All cases with compliance status, overdue items, risk areas |
| Cost analysis | CSV + PDF | Per-case costs, totals, trends |

**Implementation:** Use a server-side PDF generation library (e.g., `puppeteer` for HTML→PDF or `pdfkit`). CSV export for data tables. All exports must respect role-based data boundaries (Phase 1.8).

### 5.5 — Plain-Language Mode

All content shown to HR/employer users must use the human-readable label map (Appendix B). Additionally:

- Replace "Non-Compliant" with "Action Required"
- Replace "Duty Safety: UNSAFE" with "Current duties need review"
- Replace "Health Score: attention" with "Needs Review"
- Never show rule codes (e.g., `CERT_CURRENT`) — show the obligation in plain English
- Never show raw dates in ISO format — always `DD MMM YYYY` (e.g., "15 Feb 2026")

---

## Phase 6: AHR Manager & Clinical Experience

**Priority:** MEDIUM-HIGH.
**Estimated effort:** 5-7 days.

### 6.1 — Recovery Timeline Simplification

**Current state:** Information overload — work capacity shown 3 times (chart + glass panel + progress ring), risk shown twice.

**Required state:** One chart + one summary row. Remove duplicate visualisations.

**Keep:**
- Area chart with expected vs actual recovery curves
- Certificate markers (clickable)
- "Now" and "Est. RTW" reference lines
- Ahead/On Track/Behind badge at top

**Remove:**
- Glass panels (Work Capacity, Recovery Phase, Risk Level) — redundant with chart
- Progress rings — redundant with chart
- Keep the information but show it in the summary row below the chart

**Add:**
- Compliance deadline markers on the chart (10-week RTW plan, 8-week file review, 13/52/130-week payment step-downs)
- Colour-coded background bands for recovery phases (subtle, behind the chart)

**Summary row below chart:**

```
Week 8 of ~12 expected | Capacity: 60% | Phase: Active Recovery | Risk: Medium ℹ️
```

### 6.2 — Clinical Override of Recovery Estimates

**Current state:** Recovery estimates are hardcoded per injury type with no adjustment mechanism.

**Required state:** AHR managers can adjust the expected recovery timeline with a clinical reason.

**UI:** "Adjust Timeline" button on the recovery timeline. Opens a form:
- **New expected duration:** (weeks)
- **Reason for adjustment:** (required, free text)
- **Factors:** Checkboxes for common reasons:
  - Comorbidities
  - Age-related factors
  - Psychological overlay
  - Surgical intervention required
  - Treatment complications
  - Stronger than expected recovery
  - Other (specify)

**Data model:**

```typescript
interface RecoveryOverride {
  id: string;
  caseId: string;
  originalEstimateWeeks: number;
  adjustedEstimateWeeks: number;
  reason: string;
  factors: string[];
  overriddenBy: string;
  overriddenAt: string;
}
```

The override replaces the hardcoded estimate for this case only. The original estimate is preserved for comparison. The recovery timeline chart shows both the original and adjusted expected curves (original as dotted line, adjusted as solid line).

### 6.3 — Milestone Separation

**Current state:** Milestones mix clinical outcomes ("Pain controlled") with case management tasks ("RTW plan implemented").

**Required state:** Separate milestones into two categories:

| Type | Examples | Audience |
|------|----------|----------|
| **Clinical milestones** | "Range of motion improved", "Grip strength returning", "Pain controlled at rest" | AHR manager, case manager |
| **Case management milestones** | "RTW plan initiated", "Employer duties assessed", "Suitable duties identified" | Case manager, HR |

Display clinical milestones on the Clinical tab, case management milestones on the Overview timeline. The recovery chart shows clinical milestones only.

---

## Phase 7: Compliance Engine Expansion

**Priority:** HIGH.
**Estimated effort:** 5-7 days.

### 7.1 — New Compliance Rules

Add the following rules to the compliance engine:

**CLAIM_NOTIFICATION (s25):**
- Employer must notify insurer within 10 business days of becoming aware of injury
- Trigger: When `dateOfInjury` is set and no claim notification date recorded
- Status: Non-compliant if >10 business days since injury with no notification
- Priority: High
- Explanation: "Under s25 of the WIRC Act, employers must notify the insurer within 10 business days of becoming aware of the injury. Late notification may affect claim acceptance."

**PAYMENT_STEPDOWN_52WK (s114):**
- Weekly compensation reduces at 52 weeks
- Trigger: When `weeksOffWork >= 50` (2 weeks warning)
- Status: Warning at 50 weeks, action required at 52 weeks
- Priority: High
- Explanation: "Under s114, weekly compensation reduces at 52 weeks. The worker must be notified in advance and payment calculations adjusted."

**PAYMENT_STEPDOWN_130WK (s114):**
- Entitlement to weekly payments ceases at 130 weeks (with exceptions for serious injury)
- Trigger: When `weeksOffWork >= 126` (4 weeks warning)
- Status: Warning at 126 weeks, critical at 130 weeks
- Priority: Critical
- Explanation: "Under s114, weekly payment entitlement generally ceases at 130 weeks. If the worker has a 'serious injury' as defined by the Act, entitlement may continue. Determine serious injury status before this date."

**TERMINATION_ELIGIBILITY (s82):**
- Employer cannot terminate within first 52 weeks
- Trigger: When termination process is initiated
- Status: Non-compliant if `weeksOffWork < 52` and termination is attempted
- Priority: Critical
- Explanation: "Under s82, an employer must not terminate employment solely or mainly because of the worker's incapacity within the first 52 weeks. Termination before this point exposes the employer to unfair dismissal claims and WorkSafe prosecution."

**IME_FREQUENCY:**
- IMEs should not be scheduled more frequently than every 12 weeks for the same condition
- Trigger: When an IME is scheduled
- Status: Warning if <12 weeks since last IME
- Priority: Medium
- Explanation: "WorkSafe guidelines recommend IMEs no more frequently than every 12 weeks. More frequent examinations may be viewed as harassing the worker."

**PROVISIONAL_PAYMENTS:**
- Insurer must commence provisional payments within 10 business days
- Trigger: When claim is received and no payment recorded
- Status: Non-compliant if >10 business days without payment
- Priority: High
- Explanation: "Under s267A, provisional weekly payments must commence within 10 business days of the insurer receiving the claim. Delayed payments attract penalties."

### 7.2 — Compliance on Case Timeline

Every compliance rule's due date must be surfaced on the case timeline (Overview tab) and optionally on the recovery chart (Clinical tab).

Render as:
- Upcoming deadlines: Blue marker with label
- Approaching deadlines (<7 days): Orange marker
- Overdue: Red marker with alert icon
- Completed/compliant: Green checkmark

---

## Phase 8: RTW System Rebuild

**Priority:** HIGH.
**Estimated effort:** 5-7 days.

### 8.1 — Fix ComprehensiveRTWForm

**Current state:** 129 blank fields, doesn't pre-populate, submits to wrong endpoint (`/api/pre-employment/assessments`).

**Required state:** A guided, intelligent RTW planning experience.

**Pre-population rules:**

| Form Section | Pre-populate from |
|-------------|------------------|
| Worker Details | `WorkerCase.workerName`, organization, dates |
| Injury Details | `WorkerCase.dateOfInjury`, injury type, mechanism |
| Medical Status | Latest `MedicalCertificate`, `clinical_status_json` |
| Functional Capacity | `WorkerCase.functionalCapacity` |
| Restrictions | `WorkerCase.medicalConstraints` |

**Guided workflow:**

Replace the monolithic 9-section form with a step-by-step wizard:

1. **Review Current Status** (pre-populated, editable) — shows current medical status, restrictions, capacity. User verifies or updates.
2. **Plan Type Selection** — system recommends a plan type using `planGenerator.recommendPlanType()` with explanation (Phase 2). User can accept or override.
3. **Schedule Builder** — system generates a default graduated schedule using `scheduleCalculator.generateDefaultSchedule()`. User can adjust weeks, hours, days. Visual timeline preview.
4. **Duties & Workplace** — structured duty assessment: checkboxes for available duty types, not just free text.
5. **Review & Submit** — summary of the complete plan for review before submission.

**Submit to:** `POST /api/cases/:id/rtw-plan` (correct endpoint).

### 8.2 — Worker Consent Tracking

**New requirement.** Under the RTW Code of Practice, worker participation and agreement is required.

```typescript
interface RTWPlanConsent {
  id: string;
  rtwPlanId: string;
  caseId: string;
  consentStatus: "pending" | "agreed" | "agreed_with_conditions" | "refused";
  conditions?: string;          // If agreed with conditions
  refusalReason?: string;       // If refused
  recordedAt: string;
  recordedBy: string;           // Who recorded the consent
  method: "verbal" | "written" | "email";
  documentUrl?: string;         // Uploaded signed consent form
}
```

If consent is `refused`, trigger an action: "Worker has refused RTW plan — review plan suitability and consider conciliation."

### 8.3 — Structured RTW Pathways

**Current state:** `alternativeDutiesAvailable` is a boolean with free-text description.

**Required state:** Structured pathway selection.

```typescript
type RTWPathway =
  | "same_role_full_duties"         // Return to pre-injury role, no modifications
  | "same_role_modified_duties"     // Same role, modified tasks
  | "same_employer_different_role"  // Different role with same employer
  | "different_employer"            // Labour hire or host employer placement
  | "retraining"                    // Vocational retraining program
  | "self_employment";              // Supported transition to self-employment

interface RTWPlan {
  // ... existing fields ...
  pathway: RTWPathway;
  pathwayRationale: string;     // Why this pathway was chosen
}
```

---

## Phase 9: Termination Workflow Hardening

**Priority:** HIGH (legally critical).
**Estimated effort:** 2-3 days.

### 9.1 — Add 52-Week Prerequisite Gate

**Current state:** Termination workflow can be initiated regardless of how long the worker has been on WorkCover.

**Required state:** System blocks termination initiation if `weeksOffWork < 52`. The block is a hard gate, not just a warning.

**UI:** If a user attempts to initiate termination for a case with <52 weeks:
```
⛔ Termination cannot be initiated
Under s82 of the WIRC Act 2013, an employer must not terminate a worker's
employment solely or mainly because of incapacity within the first 52 weeks
of the claim. This worker has been on WorkCover for {weeks} weeks.

Earliest eligible date: {date52weeks}
```

### 9.2 — Add Legislative Citations

Every step of the termination workflow must reference the specific legislative section.

| Step | Current Label | Required Label |
|------|-------------|----------------|
| PREP_EVIDENCE | "Prepare evidence" | "Gather evidence of incapacity (s82(1)(a) WIRC Act)" |
| AGENT_MEETING | "Agent meeting" | "Independent medical/occupational assessment (s82(1)(b))" |
| CONSULTANT_CONFIRMATION | "Consultant confirmation" | "Obtain consultant report confirming incapacity (s82(3))" |
| PRE_TERMINATION_INVITE | "Pre-termination invite" | "Written invitation to pre-termination meeting (s82(4)) — minimum 7 days notice" |
| DECISION_PENDING | "Decision pending" | "Consider worker's response and decide (s82(6))" |
| TERMINATED | "Terminated" | "Notice of termination issued (s82(7)) — notify WorkSafe" |

### 9.3 — WorkSafe Notification Requirement

After termination, the employer must notify WorkSafe. Add this as a mandatory final step that cannot be skipped:

```
TERMINATED → WORKSAFE_NOTIFIED (new terminal state)
```

If WorkSafe notification is not completed within 10 business days of termination, create a critical compliance action.

---

## Phase 10: Accessibility & Performance

**Priority:** MEDIUM.
**Estimated effort:** 8-12 days.

### 10.1 — Error Boundaries

Add error boundaries at three levels:
1. **App-level:** Wraps `<Routes>`. Shows "Something went wrong" with reload button.
2. **Route-level:** Each `<Suspense>` gets an error boundary. Shows error within the page layout (nav still accessible).
3. **Component-level:** The recovery timeline, compliance engine, and action list each get error boundaries. A failure in one doesn't affect the others.

### 10.2 — Form Accessibility

**All form fields must have:**
- `<label>` with `htmlFor` pointing to the input
- `aria-describedby` for help text or error messages
- `aria-required="true"` for required fields
- `aria-invalid="true"` when validation fails
- Visible focus indicators (2px outline, not just colour change)

**Priority forms for remediation:**
1. TerminationPanel (27 unlabeled inputs — legally critical form)
2. ComprehensiveRTWForm / RTW wizard
3. PreEmploymentForm
4. InjuryAssessmentForm

### 10.3 — Keyboard Navigation

- All interactive elements must be reachable by Tab key
- Custom components (cards, stat panels) with `onClick` must have `role="button"`, `tabIndex={0}`, and `onKeyDown` handler for Enter/Space
- Modal dialogs must trap focus and return focus on close
- Replace all `window.confirm()` with accessible modal dialog components

### 10.4 — Screen Reader Support

- Add `aria-label` to all page-level containers
- Add `aria-live="polite"` regions for dynamic content (action list, compliance status updates)
- Add `role="status"` to loading indicators
- Add `aria-label` to all icon-only buttons
- Add `alt` text to all images (certificate uploads, charts)
- Ensure all data visualisations (charts, progress indicators) have text alternatives

### 10.5 — Performance Optimisation

**Frontend:**
- Add `React.memo()` to case list card components
- Add `useCallback` to all event handlers passed as props in list contexts
- Break up god components:
  - `CaseDetailPanel.tsx` → separate tab content into individual components
  - `DynamicRecoveryTimeline.tsx` → extract chart, summary row, phases into sub-components
  - `PreEmploymentForm.tsx` → extract sections into step components
- Add skeleton loading states using existing `ui/skeleton.tsx` for all data-fetching views
- Remove either `date-fns` or `dayjs` — standardise on one

**Backend:**
- Add pagination to case list endpoints (default 50, max 200)
- Add compliance result caching (invalidate on certificate update, case status change)
- Split `storage.ts` into domain-specific modules (`caseStorage.ts`, `certificateStorage.ts`, `complianceStorage.ts`, etc.)
- Add connection pool configuration to Drizzle/Neon

---

## Phase 11: Edge Cases & Advanced Scenarios

**Priority:** MEDIUM (will arise with scale).
**Estimated effort:** 5-8 days.

### 11.1 — Multiple Simultaneous Claims

A worker may have multiple concurrent claims (e.g., physical injury + mental health claim, or injury to two different body parts).

**Data model change:** Cases are already per-worker, but add:

```typescript
interface WorkerCase {
  // ... existing fields ...
  relatedCaseIds?: string[];     // Links to related cases for same worker
  claimType: "primary" | "secondary" | "consequential";
  primaryCaseId?: string;        // If secondary/consequential, reference to primary
}
```

**UI:** When viewing a case that has related cases, show a banner: "This worker has {n} related claims" with links.

### 11.2 — Disputed Claims

Add a dispute status to cases:

```typescript
type DisputeStatus =
  | "none"
  | "liability_disputed"          // Insurer disputing liability
  | "worker_disputing_capacity"   // Worker disputing capacity assessment
  | "worker_disputing_duties"     // Worker disputing suitable duties
  | "conciliation_requested"      // s97 conciliation
  | "conciliation_in_progress"
  | "court_proceedings"
  | "resolved";

interface CaseDispute {
  id: string;
  caseId: string;
  disputeType: DisputeStatus;
  raisedBy: "worker" | "employer" | "insurer";
  raisedAt: string;
  description: string;
  resolvedAt?: string;
  resolution?: string;
  conciliationDate?: string;
  conciliationOutcome?: string;
}
```

### 11.3 — Mental Health Claim Integration

Mental health claims have different management requirements under WorkSafe:
- Longer expected recovery timelines
- Different RTW pathway considerations (workplace triggers)
- Specific privacy requirements (diagnosis should have even more restricted access)
- Different compliance timelines

**Integration:** When `injuryType` is categorised as psychological/mental health:
- Use mental-health-specific recovery models in the estimator
- Flag additional privacy restrictions in the data boundary layer
- Include workplace psychosocial risk factors in the RTW planning
- Surface the `MentalHealthForm.tsx` data in the Clinical tab

---

## Phase 12: Documentation & Onboarding

**Priority:** MEDIUM.
**Estimated effort:** 5-7 days.

### 12.1 — In-App Contextual Help

Wire the existing `ContextualHelpSystem.tsx` into all core pages, not just the unified workspace.

**Help topics per page:**

| Page | Help Topics |
|------|-------------|
| Case list | How to filter/sort, what badges mean, how to create a case |
| Case detail — Overview | What each card means, how to complete actions, what lifecycle stages mean |
| Case detail — Clinical | How to read the recovery timeline, what milestones mean, how to upload certificates |
| Case detail — RTW | RTW plan statuses explained, how to create a plan, graduated return schedules |
| Employer dashboard | What the summary means, how to respond to decision requests, compliance obligations |
| Termination panel | Full walkthrough of the s82 process, legal obligations at each step |

### 12.2 — First-Time User Experience

When a user logs in for the first time (or when their role is first assigned), show a guided tour:

- **Case Manager:** "Here's your case list. Cases are filtered to yours by default. Let's look at a case together..." (5 steps)
- **HR Manager:** "Here's your dashboard. You'll see decisions that need your attention here..." (4 steps)
- **AHR Manager:** "Here's the recovery timeline for your cases. Here's how to read it..." (4 steps)

Use the existing `SmartWorkflowWizard.tsx` component (it already has difficulty levels and estimated times).

### 12.3 — Update Specs to Match Reality

All spec documents (01-27) must be updated to reflect the actual implementation. Specifically:
- Spec 13 (operational workflow) needs to be rewritten to match the lifecycle stage system
- Spec 22 (termination) needs to document the full 7-stage workflow with s82 references
- Spec 07 (compliance) needs to include all new rules from Phase 7

---

## Appendix A: New & Modified Types

### New Types

```typescript
// Case Lifecycle
type CaseLifecycleStage = "intake" | "assessment" | "active_treatment" | "rtw_transition" | "maintenance" | "closed_rtw" | "closed_medical_retirement" | "closed_terminated" | "closed_claim_denied" | "closed_other";

// User Roles
type UserRole = "admin" | "case_manager" | "ahr_manager" | "employer_hr" | "employer_supervisor" | "worker";

// Unified Actions
type ActionSource = "compliance" | "clinical" | "rtw" | "manual" | "ai_recommendation";
type ActionAssignee = "case_manager" | "ahr_manager" | "hr" | "employer" | "worker" | "gp" | "specialist";
type ActionPriority = "critical" | "high" | "medium" | "low";

// RTW Enhancements
type RTWPathway = "same_role_full_duties" | "same_role_modified_duties" | "same_employer_different_role" | "different_employer" | "retraining" | "self_employment";

// Disputes
type DisputeStatus = "none" | "liability_disputed" | "worker_disputing_capacity" | "worker_disputing_duties" | "conciliation_requested" | "conciliation_in_progress" | "court_proceedings" | "resolved";
```

### Modified Types

```typescript
// RTWPlanStatus — added "pending_employer_review"
type RTWPlanStatus = "not_planned" | "pending_employer_review" | "planned_not_started" | "in_progress" | "working_well" | "failing" | "on_hold" | "completed";

// WorkerCase — added fields
interface WorkerCase {
  // NEW fields
  lifecycleStage: CaseLifecycleStage;
  lifecycleStageChangedAt: string;
  lifecycleStageChangedBy: string;
  lifecycleStageReason?: string;
  assignedTo: string;
  assignedToName: string;
  assignedAt: string;
  secondaryAssignment?: string;
  relatedCaseIds?: string[];
  claimType: "primary" | "secondary" | "consequential";
  primaryCaseId?: string;
  disputeStatus?: DisputeStatus;
}
```

### New Interfaces

```typescript
interface Explanation {
  summary: string;
  detail?: string;
  factors?: ExplanationFactor[];
  legislativeRef?: { act: string; section: string; description: string };
  consequence?: string;
  remedy?: string;
  confidence?: "high" | "medium" | "low";
}

interface ExplanationFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
  weight?: number;
}

interface UnifiedCaseAction {
  id: string;
  caseId: string;
  organizationId: string;
  title: string;
  description: string;
  rationale: string;
  assignedTo: ActionAssignee;
  assignedToUserId?: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  priority: ActionPriority;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "overdue";
  source: ActionSource;
  triggerCondition: string;
  complianceRuleCode?: string;
  legislativeRef?: string;
  draftEmail?: string;
  phoneScript?: string;
  explanation: Explanation;
}

interface CaseLifecycleLog {
  id: string;
  caseId: string;
  fromStage: CaseLifecycleStage;
  toStage: CaseLifecycleStage;
  changedBy: string;
  changedAt: string;
  reason?: string;
  automated: boolean;
}

interface RTWPlanConsent {
  id: string;
  rtwPlanId: string;
  caseId: string;
  consentStatus: "pending" | "agreed" | "agreed_with_conditions" | "refused";
  conditions?: string;
  refusalReason?: string;
  recordedAt: string;
  recordedBy: string;
  method: "verbal" | "written" | "email";
  documentUrl?: string;
}

interface RecoveryOverride {
  id: string;
  caseId: string;
  originalEstimateWeeks: number;
  adjustedEstimateWeeks: number;
  reason: string;
  factors: string[];
  overriddenBy: string;
  overriddenAt: string;
}

interface CaseDispute {
  id: string;
  caseId: string;
  disputeType: DisputeStatus;
  raisedBy: "worker" | "employer" | "insurer";
  raisedAt: string;
  description: string;
  resolvedAt?: string;
  resolution?: string;
  conciliationDate?: string;
  conciliationOutcome?: string;
}
```

---

## Appendix B: Human-Readable Label Map

All enum values must be mapped to display labels. No raw enum value should ever appear in the UI.

### Case Lifecycle Stages

| Value | Label | Colour | Description |
|-------|-------|--------|-------------|
| `intake` | Intake | Grey | Claim received, gathering initial documentation |
| `assessment` | Assessment | Blue | Medical assessment and functional capacity evaluation |
| `active_treatment` | Active Treatment | Orange | Ongoing treatment, monitoring recovery progress |
| `rtw_transition` | Return to Work | Teal | Actively planning or executing return to work |
| `maintenance` | Maintenance | Green | Worker returned on modified duties, monitoring |
| `closed_rtw` | Closed — Returned to Work | Green | Successful return to full duties |
| `closed_medical_retirement` | Closed — Medical Retirement | Purple | Worker medically retired |
| `closed_terminated` | Closed — Employment Ended | Red | Employment terminated under s82 |
| `closed_claim_denied` | Closed — Claim Not Accepted | Grey | Claim denied or rejected |
| `closed_other` | Closed — Other | Grey | Other closure reason |

### RTW Plan Status

| Value | Label | Colour |
|-------|-------|--------|
| `not_planned` | No Plan | Grey |
| `pending_employer_review` | Awaiting Employer Review | Yellow |
| `planned_not_started` | Plan Ready — Not Started | Blue |
| `in_progress` | In Progress | Teal |
| `working_well` | Working Well | Green |
| `failing` | Plan Under Review | Red |
| `on_hold` | On Hold | Orange |
| `completed` | Completed | Green |

### Risk Level

| Value | Label | Colour |
|-------|-------|--------|
| `High` | High Risk | Red |
| `Medium` | Medium Risk | Orange |
| `Low` | Low Risk | Green |

### Compliance Status

| Value | Label (Case Manager) | Label (HR Manager) |
|-------|---------------------|-------------------|
| `compliant` | Compliant | All Good |
| `partially_compliant` | Partially Compliant | Some Items Need Attention |
| `non_compliant` | Non-Compliant | Action Required |
| `unknown` | Not Assessed | Pending Assessment |

### Work Status

| Value | Label |
|-------|-------|
| `At work` | At Work |
| `Off work` | Off Work |

### Specialist Status

| Value | Label |
|-------|-------|
| `none` | No Specialist Involved |
| `referred` | Referred — Awaiting Appointment |
| `appointment_booked` | Appointment Booked |
| `seen_waiting_report` | Seen — Awaiting Report |
| `report_received` | Report Received |
| `did_not_attend` | Did Not Attend |
| `not_required` | Not Required |

### Action Priority

| Value | Label | Colour |
|-------|-------|--------|
| `critical` | Urgent | Red |
| `high` | High Priority | Orange |
| `medium` | Normal | Blue |
| `low` | Low Priority | Grey |

---

## Appendix C: Compliance Rule Reference Table

Complete table of all compliance rules (existing + new from Phase 7).

| Code | Name | WIRC Act Section | Check Type | Severity | When to Check |
|------|------|-----------------|------------|----------|---------------|
| `CERT_CURRENT` | Current Medical Certificate | s112 | certificate | critical | Daily |
| `RTW_PLAN_10WK` | RTW Plan Required (Serious Injury) | RTW Code cl.4.3 | rtw_plan | high | When weeksOffWork >= 8 |
| `FILE_REVIEW_8WK` | Regular File Review | Claims Manual ch.7 | file_review | medium | Every 8 weeks |
| `PAYMENT_STEPDOWN_13WK` | 13-Week Payment Reduction | s114(1) | payment | high | When weeksOffWork >= 11 |
| `PAYMENT_STEPDOWN_52WK` | 52-Week Payment Reduction | s114(2) | payment | high | When weeksOffWork >= 50 |
| `PAYMENT_STEPDOWN_130WK` | 130-Week Entitlement Limit | s114(3) | payment | critical | When weeksOffWork >= 126 |
| `CENTRELINK_CLEARANCE` | Centrelink Clearance | Social Security Act | other | medium | At claim commencement |
| `SUITABLE_DUTIES` | Suitable Duties Obligation | s82-83 | rtw_plan | high | When medical certificate allows modified duties |
| `RTW_OBLIGATIONS` | RTW Participation Obligations | s82-83, RTW Code | rtw_plan | high | Ongoing during active claim |
| `CLAIM_NOTIFICATION` | Employer Claim Notification | s25 | other | high | Within 10 business days of injury awareness |
| `TERMINATION_GATE` | Termination 52-Week Prerequisite | s82 | other | critical | When termination initiated |
| `IME_FREQUENCY` | IME Scheduling Limits | WorkSafe Guidelines | other | medium | When IME scheduled |
| `PROVISIONAL_PAYMENTS` | Provisional Payment Commencement | s267A | payment | high | Within 10 business days of claim receipt |

---

## Appendix D: Explanation Templates

Templates for the most common explanations, with variable placeholders.

### Risk Level Templates

**HIGH — duration-based:**
```
This worker has been off work for {weeksOff} weeks with {injuryType}. Expected recovery for this injury type is {expectedWeeks} weeks. Extended absence beyond the expected timeframe increases the risk of chronic disability and reduces the likelihood of successful return to work.
```

**HIGH — no RTW plan:**
```
No RTW plan is in place despite the worker having capacity for modified duties (current certificate allows {capacitySummary}). Evidence shows that early RTW intervention significantly improves outcomes. Without a plan, the risk of prolonged absence increases.
```

**HIGH — declining trend:**
```
Recovery has been declining over the past {trendWeeks} weeks. Work capacity has dropped from {previousCapacity}% to {currentCapacity}%. This may indicate treatment complications, new symptoms, or psychosocial barriers. Immediate clinical review recommended.
```

**MEDIUM — behind schedule:**
```
Recovery is {weeksBehind} weeks behind expected for {injuryType}, but the overall trend is {trend}. Current capacity is {capacityPercent}% vs expected {expectedCapacity}%. Close monitoring recommended; consider escalation if no improvement in the next 2 weeks.
```

**LOW — on track:**
```
Recovery is progressing as expected for {injuryType}. Worker is at week {currentWeek} of an estimated {expectedWeeks}-week recovery. Current capacity at {capacityPercent}% aligns with expected progress. No intervention needed beyond routine monitoring.
```

### Compliance Templates

**Non-compliant template:**
```
{obligation}

Under {legislativeRef}, {legalRequirement}. This obligation is currently not met because {specificReason}.

If not addressed: {consequence}

To resolve: {remedy}
```

**Warning template:**
```
{obligation} — approaching deadline

{deadlineDescription}. You have {daysRemaining} days to take action.

Required action: {remedy}
```

### Action Rationale Templates

**Certificate expiry:**
```
Current certificate expires on {expiryDate} ({daysRemaining} days). A gap in certification means no duties can be directed and compliance status will drop to non-compliant.
```

**RTW plan initiation:**
```
Worker has been off work {weeksOff} weeks with capacity for modified duties ({capacitySummary}). Under WorkSafe guidelines, early RTW intervention improves outcomes. {complianceNote}
```

**Employer consultation:**
```
Worker's certificate now allows {capacitySummary} but no suitable duties have been identified. Under s82(2), the employer must consult with the worker about available suitable duties.
```

**Treatment plan review:**
```
Worker is {weeksBehind} weeks behind expected recovery. Current treatment plan was last updated {weeksSinceUpdate} weeks ago. A review may identify opportunities to adjust the treatment approach and accelerate recovery.
```

**IME request:**
```
Worker has been off work {weeksOff} weeks with no measurable improvement in the last {plateauWeeks} weeks despite active treatment. An Independent Medical Examination can provide independent assessment of capacity, prognosis, and treatment appropriateness.
```

---

*End of specification. This document supersedes any conflicting guidance in specs 01-27 where explicitly stated. All existing specs remain valid unless directly contradicted by a requirement in this document.*
