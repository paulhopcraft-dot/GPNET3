# Business Invariants

**Generated:** 2026-03-24
**Purpose:** Rules that should always hold in the system. Violations indicate bugs, gaps, or policy failures.

---

## INV-001: Every active injury case must have a current medical certificate OR an active chase action

**Why:** Victorian legislation (s112 WIRC Act) requires current medical certification for workers' compensation cases. A case without a certificate and without an action to obtain one is in an invisible compliance gap.
**Workflows:** Certificate management, compliance engine, action queue
**How to Test:** Query for active cases where certificateCompliance != 'compliant' AND no pending chase_certificate action exists.
**Likely Violations:** New cases created before compliance engine runs. Cases where chase action was cancelled without obtaining certificate.

---

## INV-002: A compliance indicator must be explainable — every score must have visible supporting rule evaluations

**Why:** A compliance score without explanation is worse than no score. It creates false confidence or false alarm without actionable information.
**Workflows:** Compliance engine, all case views
**How to Test:** Navigate to any case with a compliance indicator. Verify that clicking or expanding shows the individual rule evaluations.
**Likely Violations:** Employer dashboard shows indicator without rule detail. Some case views may show badge without breakdown.

---

## INV-003: RTW plan status and case work status must be consistent

**Why:** "Working well" + "Off work" is contradictory. "Not planned" + "At work" is suspicious (worker returned without a plan).
**Workflows:** RTW planning, case management
**How to Test:** Query for cases where rtwPlanStatus = 'working_well' AND workStatus = 'Off work'. Query for rtwPlanStatus = 'not_planned' AND workStatus = 'At work'.
**Likely Violations:** Independent status updates without cross-validation.

---

## INV-004: A material system judgment must be auditable — who, when, what basis

**Why:** Compliance decisions, clearance levels, AI summaries, and termination steps are material judgments. Each must have an audit record showing who made/triggered it, when, and on what basis.
**Workflows:** All decision workflows
**How to Test:** For each decision type, verify an audit_event is created with userId, timestamp, and relevant metadata.
**Likely Violations:** Compliance override decisions, pre-employment approvals, AI summary regeneration may have incomplete audit records.

---

## INV-005: A worker-facing form must have a complete delivery path — create → send → complete → review → decide

**Why:** A form that exists but cannot be delivered, or that is delivered but cannot be reviewed, is a dead-end workflow.
**Workflows:** Pre-employment assessment
**How to Test:** Trace the full lifecycle: creation → magic link → worker completion → clinician review → decision → notification.
**Likely Violations:** Candidate outcome notification missing. Conditional clearance path incomplete.

---

## INV-006: Rejected records with business importance must remain searchable and auditable

**Why:** A rejected pre-employment assessment, a disapproved RTW plan, or a cancelled action may be needed later for legal, compliance, or repeat-application purposes. Disappearing records are an audit risk.
**Workflows:** Pre-employment, RTW approvals, actions
**How to Test:** Reject/cancel records in each workflow. Verify they remain findable via search or filtered views.
**Likely Violations:** Completed assessments (both cleared and not-cleared) may not be easily filterable. Cancelled actions may be hidden.

---

## INV-007: Employment status transitions must be reflected in case lifecycle

**Why:** If employmentStatus = TERMINATED, the case lifecycle should be in a closed state or actively transitioning. Active case management for a terminated worker is operationally invalid.
**Workflows:** Termination, case lifecycle
**How to Test:** Query for cases where employmentStatus = 'TERMINATED' AND lifecycleStage NOT IN (closed states).
**Likely Violations:** Termination workflow updates employmentStatus independently from lifecycle transitions.

---

## INV-008: AI-generated content must be reviewable and correctable

**Why:** AI outputs (summaries, email drafts, treatment plans, pre-employment analysis) influence material decisions. Users must be able to review, correct, and override AI outputs. Uncorrectable AI creates liability.
**Workflows:** Smart summary, email drafts, treatment plans, pre-employment AI analysis
**How to Test:** For each AI output, verify: (1) output is shown before action taken, (2) edit/correct mechanism exists, (3) human override is recorded.
**Likely Violations:** AI summaries have no edit/correct mechanism. Email drafts may only have copy-to-clipboard. Pre-employment AI analysis flows directly to clearance level.

---

## INV-009: Compliance labels must not convey false certainty when underlying data is absent or contradictory

**Why:** "Non-compliant" means the system has evidence of non-compliance. "Unknown" or "insufficient data" means the system cannot assess. These are different and require different responses.
**Workflows:** Compliance engine
**How to Test:** Create a case with minimal data. Check whether compliance indicator is "unknown/insufficient" vs a low compliance score.
**Likely Violations:** complianceEngine.ts produces a score for all cases regardless of data completeness.

---

## INV-010: State transitions must be reachable and coherent — no dead-end states, no orphaned records

**Why:** A record that enters a state with no valid next transition is stuck. This requires manual database intervention to fix.
**Workflows:** All workflows with state machines
**How to Test:** For each state machine, verify every state has at least one valid outbound transition (except explicit terminal states). For terminal states, verify the record is appropriately archived/flagged.
**Likely Violations:** TERMINATION_ABORTED has no documented next state. Closed cases have no reopen path (may be intentional). Failed/cancelled assessments may be orphaned.

---

## INV-011: Actions must cascade appropriately on case closure

**Why:** Pending actions for a closed case are misleading. They suggest work is needed on a case that is already resolved. This wastes case manager time and clutters the action queue.
**Workflows:** Case lifecycle, action queue
**How to Test:** Close a case with pending actions. Verify actions are cancelled with "case_closed" reason or similar.
**Likely Violations:** No cascade logic found in lifecycle transition handler.

---

## INV-012: Every terminated case must have a complete termination audit trail

**Why:** Victorian legislation (s82 WIRC Act) requires specific steps. A terminated case without evidence of each step is a legal risk.
**Workflows:** Termination
**How to Test:** For every case where employmentStatus = TERMINATED, verify termination_processes has records for all mandatory steps with dates and actors.
**Likely Violations:** Steps may be skipped in the UI. The system validates step order but may not prevent skipping steps in database updates.

---

## INV-013: A pre-employment assessment must block hiring until resolved

**Why:** A pending or requires_review assessment should prevent the employer from proceeding with the hire. This is the entire point of pre-employment screening.
**Workflows:** Pre-employment
**How to Test:** Create an assessment in pending_review state. Verify there is no path to mark the candidate as "cleared" without completing the review.
**Likely Violations:** Clearance level defaults and status transitions may allow premature clearing.

---

## INV-014: Only one active medical certificate per case at any time

**Why:** Overlapping certificates create ambiguity about current capacity and restrictions.
**Workflows:** Certificate management
**How to Test:** Upload two certificates with overlapping date ranges for the same case. Verify the system prevents or resolves the conflict.
**Likely Violations:** certificateCompliance.ts uses date range check but may not enforce uniqueness on upload.

---

## INV-015: Notification of material decisions must reach all affected parties

**Why:** A compliance decision, clearance level, or RTW plan change affects multiple stakeholders. The affected parties must be notified.
**Workflows:** All decision workflows
**How to Test:** Make a material decision in each workflow. Verify notification events are created for all affected parties.
**Likely Violations:** External parties (GP, worker, candidate) have no notification path. Employer notification limited.
