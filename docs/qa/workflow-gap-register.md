# Workflow Gap Register

**Generated:** 2026-03-24
**Severity:** CRITICAL = blocks real-world operation | HIGH = materially misleading or incomplete | MEDIUM = operationally inconvenient | LOW = improvement opportunity

---

## GAP-001: Pre-Employment Conditional Clearance Has No UI Path

**Category:** Workflow gap
**Severity:** HIGH
**Affected Workflow:** Pre-employment health clearance
**Why It Matters:** Schema supports 6 clearance levels but UI only offers Approve (cleared_unconditional) or Reject (not_cleared). Candidates who need conditional clearance or clearance-with-restrictions get forced into binary yes/no, losing critical safety information about workplace restrictions.
**Evidence:** PreEmploymentPage.tsx has only two buttons: Approve → cleared_unconditional, Reject → not_cleared. Schema has cleared_conditional, cleared_with_restrictions.
**Type:** Product gap
**Suggested Action:** Add conditional approval flow with restriction capture UI

---

## GAP-002: Pre-Employment Rejected Assessment — No Retention or Retrieval

**Category:** Workflow gap + Audit gap
**Severity:** HIGH
**Affected Workflow:** Pre-employment health clearance
**Why It Matters:** If a candidate is rejected (not_cleared), the assessment completes but there is no explicit archive, search, or retrieval workflow. A future application by the same candidate cannot reference the prior assessment. For compliance, the rejection and its basis should be retrievable.
**Evidence:** No archive/search UI for completed assessments with not_cleared status. No resubmission workflow.
**Type:** Workflow gap + Audit gap
**Suggested Action:** Add assessment history view, searchable by candidate. Document retention policy for rejected assessments.

---

## GAP-003: Pre-Employment — No Candidate Notification of Outcome

**Category:** Workflow gap
**Severity:** MEDIUM
**Affected Workflow:** Pre-employment health clearance
**Why It Matters:** Candidate completes questionnaire via magic link but never receives notification of the outcome. They rely on the employer to inform them. This creates a poor candidate experience and potential legal exposure.
**Evidence:** `employerNotifiedAt` field exists but no `candidateNotifiedAt`. No email template for candidate notification.
**Type:** Product gap
**Suggested Action:** Add candidate notification step after clearance decision

---

## GAP-004: Compliance Override Without Mandatory Explanation

**Category:** Audit gap
**Severity:** HIGH
**Affected Workflow:** Compliance engine
**Why It Matters:** Compliance can be overridden (complianceOverride fields exist) but the UI path for providing and enforcing an explanation is unclear. An unexplained compliance override is an audit red flag in regulated injury management.
**Evidence:** Schema has `complianceOverrideReason`, `complianceOverrideBy`, `complianceOverrideAt` but no dedicated override UI with mandatory reason field found in client components.
**Type:** Audit gap + Explanation gap
**Suggested Action:** Verify override UI exists; if not, add mandatory reason capture with audit event

---

## GAP-005: Compliance Labels Shown Without Supporting Evidence Context

**Category:** Explanation gap
**Severity:** HIGH
**Affected Workflow:** Compliance engine, all case views
**Why It Matters:** Compliance indicators (Very High / High / Medium / Low / Very Low) are displayed on dashboards and case views but the specific rules that produced the score, and the evidence evaluated, are not consistently shown alongside the indicator. A case manager seeing "Medium compliance" cannot immediately understand why or what to fix.
**Evidence:** ComplianceReportCard.tsx shows detailed breakdown but not all pages include it. Employer dashboard shows indicator without rule-level detail.
**Type:** Explanation gap
**Suggested Action:** Ensure all compliance indicator displays link to or expand rule-level detail

---

## GAP-006: Missing Evidence Still Produces Compliance Score

**Category:** Logic gap
**Severity:** HIGH
**Affected Workflow:** Compliance engine
**Why It Matters:** The compliance engine evaluates rules and produces a score even when key data is missing (no certificates, no RTW plan, etc.). The resulting score may present false certainty. A score of "Low compliance" is different from "insufficient data to assess compliance" — the system conflates the two.
**Evidence:** complianceEngine.ts evaluates all rules; missing data fails the rule check (non_compliant) rather than producing an "unknown/insufficient data" result.
**Type:** Logic gap + Explanation gap
**Suggested Action:** Add "insufficient evidence" state distinct from non_compliant. Flag when compliance score is based on absence of data vs presence of contradictory data.

---

## GAP-007: Worker Real-World Employment Status Cannot Be Recorded

**Category:** Schema gap
**Severity:** CRITICAL
**Affected Workflow:** Injury case management, RTW, compliance
**Why It Matters:** The system tracks `employmentStatus` (ACTIVE/SUSPENDED/TERMINATED) for the employer of record, but cannot capture whether the worker has obtained other employment, is doing cash-in-hand work, or has partial duties elsewhere. This is critical for compliance (affects entitlements), RTW planning (changes capacity assessment), and case closure.
**Evidence:** No field for external/secondary employment. `workStatus` is At work/Off work (binary). No mechanism to record worker working elsewhere.
**Type:** Schema gap
**Suggested Action:** Add external employment status field. Document policy for how this affects compliance and RTW calculations.

---

## GAP-008: RTW Plan Employer Approval — Incomplete UI Flow

**Category:** Workflow gap
**Severity:** HIGH
**Affected Workflow:** RTW planning
**Why It Matters:** Schema has `rtwApprovals` table and `pending_employer_review` status, but employer-facing UI does not have a clear approve/reject workflow for RTW plans. Employer sees status but cannot formally sign off.
**Evidence:** EmployerCaseDetailPage shows RTW status. RTWPlannerPage allows status updates. But no employer-specific approval dialog with duties review.
**Type:** Product gap
**Suggested Action:** Add employer RTW plan approval screen with duties review and sign-off

---

## GAP-009: Action Auto-Completion via Email — No Validation

**Category:** Logic gap
**Severity:** MEDIUM
**Affected Workflow:** Action queue
**Why It Matters:** Actions can be auto-completed when an email is received matching the `emailReference` field. But there is no validation that the email content actually resolves the action (e.g., a GP reply "I'll send it next week" auto-completing a certificate chase).
**Evidence:** `autoCompleted` boolean and `emailReference` field in case_actions schema. Auto-completion logic in action routes.
**Type:** Logic gap
**Suggested Action:** Flag auto-completed actions for human review. Add email content analysis or require confirmation.

---

## GAP-010: Terminated Case — No Path Back

**Category:** Workflow gap
**Severity:** MEDIUM
**Affected Workflow:** Termination workflow
**Why It Matters:** `TERMINATION_ABORTED` status exists but there is no documented workflow for what happens next — does the case return to active management? Is the termination process deleted or archived?
**Evidence:** Termination service has abort status but no handler for post-abort state transition.
**Type:** Workflow gap
**Suggested Action:** Document and implement post-abort workflow (return to prior lifecycle stage)

---

## GAP-011: WorkSafe Notification — Logged But Not Actually Sent

**Category:** Workflow gap
**Severity:** HIGH
**Affected Workflow:** Termination workflow
**Why It Matters:** The final termination step is "Notify WorkSafe within 10 business days." The API endpoint records that notification was done, but there is no actual integration to send the notification to WorkSafe. This is a legal compliance requirement.
**Evidence:** `POST /api/termination/:id/worksafe-notify` records the event but no outbound integration exists.
**Type:** Workflow gap + Compliance gap
**Suggested Action:** At minimum, generate the notification document. Ideally integrate with WorkSafe portal or produce a downloadable form.

---

## GAP-012: AI Summary — No Correction or Dispute Mechanism

**Category:** Explanation gap + Audit gap
**Severity:** HIGH
**Affected Workflow:** Smart summary / AI analysis
**Why It Matters:** AI-generated summaries are displayed to case managers and may influence clinical decisions. There is no mechanism to flag an inaccurate summary, correct it, or record disagreement. This is particularly dangerous when AI makes assertions about compliance, RTW readiness, or risk.
**Evidence:** SummaryCard.tsx shows AI summary with refresh button but no edit/flag/correct controls. No summary review audit trail.
**Type:** Explanation gap + Audit gap
**Suggested Action:** Add "flag as inaccurate" button. Record human corrections. Show correction history.

---

## GAP-013: AI Recommendations — No Clear Action Conversion

**Category:** Workflow gap
**Severity:** MEDIUM
**Affected Workflow:** Smart summary → Action queue
**Why It Matters:** AI summaries include recommendedActions[] but it's unclear whether these automatically create case_actions or are display-only. If display-only, recommendations may be ignored without accountability. If auto-created, they may generate noise.
**Evidence:** hybridSummary.ts returns recommendedActions. Unclear if these feed into case_actions table.
**Type:** Workflow gap
**Suggested Action:** Clarify and document the AI-to-action pipeline. Consider "accept recommendation" button.

---

## GAP-014: Email Draft — No Actual Send Path

**Category:** Workflow gap
**Severity:** HIGH
**Affected Workflow:** Email communication
**Why It Matters:** EmailDraftModal generates AI email drafts but the only action appears to be copy-to-clipboard. There is no integrated send path. The `email_drafts` table tracks `status: sent` but the mechanism to transition from draft to sent is unclear.
**Evidence:** EmailDraftModal.tsx has copy button. SendGrid is a dependency but send integration unclear. `sentAt` and `sentBy` fields exist but no send endpoint found.
**Type:** Product gap
**Suggested Action:** Wire up actual email send via SendGrid. Track delivery status.

---

## GAP-015: Discussion Notes — No Insight-to-Action Conversion

**Category:** Workflow gap
**Severity:** MEDIUM
**Affected Workflow:** Discussion notes / transcripts
**Why It Matters:** AI extracts insights from discussion notes (area, severity, summary, detail) but there is no mechanism to convert a high-risk insight into a case action. Insights are informational only.
**Evidence:** case_discussion_insights table stores insights. No link to case_actions.
**Type:** Workflow gap
**Suggested Action:** Add "create action from insight" button

---

## GAP-016: Pre-Employment — Unused Status States

**Category:** Schema gap
**Severity:** LOW
**Affected Workflow:** Pre-employment
**Why It Matters:** Assessment statuses `scheduled` and `in_progress` exist in schema but no UI transitions to them. This suggests planned but unimplemented workflow stages (e.g., scheduling a physical assessment with a provider).
**Evidence:** Status enum includes these values. No route or UI sets them.
**Type:** Schema gap (dead states)
**Suggested Action:** Either implement or remove unused states. Document intended workflow.

---

## GAP-017: Case Reopening Not Supported

**Category:** Workflow gap
**Severity:** MEDIUM
**Affected Workflow:** Case lifecycle
**Why It Matters:** Cases can reach closed states (closed_rtw, closed_terminated, etc.) but there is no documented or implemented path to reopen a case. In practice, injuries can recur, claims can be reopened, and administrative closures can be reversed.
**Evidence:** LIFECYCLE_TRANSITIONS defines closed states as terminal. No transition back to active stages.
**Type:** Workflow gap + Policy gap
**Suggested Action:** Document policy. If reopening is needed, add transition from closed → assessment with audit trail.

---

## GAP-018: Bulk Case Actions on Closure

**Category:** Workflow gap
**Severity:** MEDIUM
**Affected Workflow:** Case lifecycle + Action queue
**Why It Matters:** When a case is closed, pending actions should be resolved (cancelled with reason, or flagged for review). No bulk action handling on case closure is evident.
**Evidence:** No handler for cascading action status when lifecycle transitions to closed state.
**Type:** Workflow gap
**Suggested Action:** Add cascade logic: on case close, cancel or archive pending actions with "case_closed" reason.

---

## GAP-019: Certificate Review Queue Missing

**Category:** Workflow gap
**Severity:** MEDIUM
**Affected Workflow:** Certificate management
**Why It Matters:** Certificates have `requiresReview` flag (OCR extraction uncertainty) but no dedicated review queue. Certificates needing review may be overlooked.
**Evidence:** `requiresReview` boolean in medical_certificates schema. CertificateReviewPage exists at `/certificates/review` but may not filter by this flag.
**Type:** Product gap
**Suggested Action:** Ensure CertificateReviewPage surfaces certificates where requiresReview=true

---

## GAP-020: No GP or Worker Notification System

**Category:** Workflow gap
**Severity:** HIGH
**Affected Workflow:** Certificate management, RTW
**Why It Matters:** The system generates actions for case managers to chase certificates and manage RTW, but there is no outbound notification to GPs (certificate reminders) or workers (RTW plan updates, assessment results). All communication relies on manual email drafting.
**Evidence:** Notification service exists but targets internal users. No external notification templates or send paths for GPs/workers.
**Type:** Product gap
**Suggested Action:** Add GP/worker notification templates and delivery path
