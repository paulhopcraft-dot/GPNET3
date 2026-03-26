# Workflow Discovery Report

**Generated:** 2026-03-24
**Method:** Static code analysis + API/route/schema inspection
**Confidence key:** HIGH = full code path traced, MEDIUM = partial/inferred, LOW = implied but incomplete

---

## 1. Pre-Employment Health Clearance

**Business Goal:** Screen candidates for physical fitness before hiring
**Actors:** Employer (creates), Candidate/Worker (completes questionnaire), Clinician (reviews), System (AI analysis)

**Lifecycle States:**
`created` → `sent` → `pending` → `scheduled` → `in_progress` → `completed` → clearance decision
Also: `failed`, `cancelled`

**Clearance Levels:**
`cleared_unconditional` | `cleared_conditional` | `cleared_with_restrictions` | `not_cleared` | `pending_review` | `requires_review`

**Valid Transitions:**
1. Employer creates assessment → status: `created`
2. System generates magic link (accessToken) → status: `sent`, `sentAt` recorded
3. Candidate opens `/check/:token` → PublicQuestionnaire
4. Candidate submits → `questionnaireResponses` stored
5. AI analyzes responses against job requirements → `reportJson` generated
6. If AI uncertain → `clearanceLevel = requires_review`, alert sent to jacinta@preventli.ai
7. Clinician reviews → Approve (cleared_unconditional) or Reject (not_cleared)
8. Employer notified → `employerNotifiedAt` set

**Triggers:** Manual creation by employer
**Confidence:** HIGH

**Suspected Missing Steps:**
- No `cleared_conditional` or `cleared_with_restrictions` approval path in UI (only Approve/Reject buttons)
- No resubmission workflow if candidate provides incomplete info
- No explicit retention/archive policy for rejected assessments
- No worker notification of outcome
- No appeal/dispute path for not_cleared decisions
- `scheduled` and `in_progress` states exist but no UI transitions to them
- No expiry/validity tracking enforced in UI (medicalClearanceValidityMonths exists in schema)

**Open Policy Questions:**
- Can a rejected candidate reapply? When? With same or new assessment?
- Are conditional clearances tracked with specific restrictions that feed into RTW duties?
- Who can override an AI `requires_review` flag?

---

## 2. Injury Case Management (Core)

**Business Goal:** Track and manage workplace injury cases from intake to closure
**Actors:** System (Freshdesk webhook), Employer (reports), Clinician/Case Manager (manages), Worker (subject)

**Lifecycle States:**
`intake` → `assessment` → `active_treatment` → `rtw_transition` → `maintenance` → closed states
Closed: `closed_rtw`, `closed_medical_retirement`, `closed_terminated`, `closed_claim_denied`, `closed_other`

**Valid Transitions:** Defined in `LIFECYCLE_TRANSITIONS` constant

**Triggers:** Freshdesk webhook, manual creation, employer new case form
**Confidence:** HIGH

**Suspected Missing Steps:**
- `employmentStatus` tracks ACTIVE/SUSPENDED/TERMINATED but no UI for recording actual current job/duties
- Worker's real-world employment outside the injury (e.g., they got another job) cannot be recorded
- No formal case reopening workflow (closed → back to active)
- Lifecycle transitions require reason but no approval gate
- No case merging for multiple injuries to same worker
- Phase 11 `relatedCaseIds` exists but no UI for linking cases

**Open Policy Questions:**
- Can a closed case be reopened? Under what conditions?
- What happens to actions when a case is closed?
- Should lifecycle transitions require manager approval?

---

## 3. Medical Certificate Management

**Business Goal:** Track medical certificates, ensure current coverage, chase renewals
**Actors:** GP (issues), Clinician (uploads/reviews), System (compliance checks)

**Lifecycle States:**
Certificate added → active (within date range) → expiring_soon (7 days) → expired

**Compliance States:**
`no_certificate` | `certificate_expiring_soon` | `certificate_expired` | `compliant`

**Triggers:** Manual upload, OCR extraction, Freshdesk email ingestion
**Confidence:** HIGH

**Suspected Missing Steps:**
- Only ONE active certificate at a time — what happens to historical certificates?
- No certificate dispute workflow (worker disagrees with capacity rating)
- No GP notification when certificate is about to expire
- Certificate `requiresReview` flag exists but no dedicated review queue
- No certificate version tracking (if GP updates same period)

---

## 4. Compliance Engine

**Business Goal:** Evaluate cases against Victorian workers' compensation rules
**Actors:** System (automated), Clinician (reviews), Employer (receives alerts)

**Rules Evaluated:**
- CERT_CURRENT — Current medical certificate required (s112 WIRC)
- RTW_PLAN_10WK — RTW plan within 10 weeks of serious injury (s4.3 RTW Code)
- FILE_REVIEW_8WK — Case file review every 8 weeks (Claims Manual ch.7)
- PAYMENT_STEPDOWN — Payment step-down at 13/26/52/78/104 weeks
- CENTRELINK_CLEARANCE — Centrelink clearance if receiving income support
- SUITABLE_DUTIES — Suitable duties offered when capacity allows
- RTW_OBLIGATIONS — RTW obligations met

**Compliance Indicators:** Very High | High | Medium | Low | Very Low
**Compliance Status:** compliant | partially_compliant | non_compliant | unknown

**Triggers:** Nightly scheduled run, on-demand evaluation
**Confidence:** HIGH

**Suspected Missing Steps:**
- `complianceOverride` exists (3 fields) but no UI for explaining override decisions
- Compliance score shown but explanation visibility varies by page
- No compliance trend tracking (was compliant, now non-compliant — when did it change?)
- No formal escalation path for persistent non-compliance
- No employer-facing compliance explanation (employer sees indicator but not the rules)
- Missing data still produces a score — no "insufficient evidence" cautious state

**Open Policy Questions:**
- When override is used, is override reason mandatory?
- Should compliance indicators be shown to employers? With what level of detail?
- What triggers a compliance "freeze" during disputes?

---

## 5. Action Queue System

**Business Goal:** Unified task management for case managers
**Actors:** System (generates), Case Manager (acts), Various assignees

**Lifecycle States:**
`pending` → `in_progress` → `done` | `cancelled` | `overdue`

**Action Types:** chase_certificate, review_case, follow_up
**Sources:** compliance, clinical, rtw, manual, ai_recommendation
**Priority:** critical, high, medium, low

**Triggers:** Compliance engine, clinical evidence evaluation, manual creation, AI recommendation
**Confidence:** HIGH

**Suspected Missing Steps:**
- `overdue` is a status but unclear if it's system-computed or manually set
- No reassignment workflow (action assigned to wrong person)
- No SLA tracking (time from creation to completion)
- Auto-completion via email reference — but what validates the email actually resolves the issue?
- No action templates for common scenarios
- No bulk action operations (close all actions for a closed case)
- Cancelled actions require reason but no audit of cancellation decisions

---

## 6. Termination Workflow (s82 WIRC Act)

**Business Goal:** Formal incapacity termination following Victorian legislation
**Actors:** Case Manager (drives), Consultant (confirms), Worker (responds), WorkSafe (notified)

**Lifecycle States (10 steps):**
`NOT_STARTED` → `PREP_EVIDENCE` → `AGENT_MEETING` → `CONSULTANT_CONFIRMATION` → `PRE_TERMINATION_INVITE_SENT` → `PRE_TERMINATION_MEETING_COMPLETED` → `DECISION_PENDING` → `TERMINATED` → `WORKSAFE_NOTIFIED`
Also: `TERMINATION_ABORTED`

**Decision Options:** NO_DECISION | TERMINATE | DEFER | ALTERNATIVE_ROLE_FOUND

**Triggers:** Manual initiation when RTW prospects exhausted
**Confidence:** HIGH (backend), MEDIUM (UI — TerminationPanel exists but completeness unclear)

**Suspected Missing Steps:**
- No undo/rollback for steps taken in error
- No template generation for pre-termination invitation letter
- WorkSafe notification — recorded as done but is it actually sent or just logged?
- No tracking of mandatory 7-day notice period for pre-termination meeting
- No worker response recording mechanism
- `TERMINATION_ABORTED` exists but no path back to active case management
- Pay status tracking exists but no integration with payroll systems

---

## 7. Return-to-Work (RTW) Planning

**Business Goal:** Structured return to work with employer, worker consent, and progress tracking
**Actors:** Clinician (plans), Employer (approves duties), Worker (consents), System (generates)

**RTW Plan Status:**
`not_planned` → `pending_employer_review` → `planned_not_started` → `in_progress` → `working_well` | `failing` → `completed`
Also: `on_hold`

**Pathways:** same_role_full_duties, same_role_modified_duties, same_employer_different_role, different_employer, retraining, self_employment

**Consent Status:** pending | agreed | agreed_with_conditions | refused

**Triggers:** 10-week compliance rule, manual planning, AI recommendation
**Confidence:** HIGH

**Suspected Missing Steps:**
- RTW plan approval exists (`rtwApprovals` table) but no clear employer approval UI flow
- Worker consent refusal exists but no escalation path
- No plan modification workflow (plan approved, then duties change)
- No formal GP sign-off on RTW plan
- Failing plan → intervention path unclear (what intervention?)
- Different employer pathway exists but no mechanism to link to external employer
- No progress tracking against schedule milestones (week-by-week)

---

## 8. Smart Summary / AI Analysis

**Business Goal:** AI-generated case analysis for clinical decision support
**Actors:** System (generates), Clinician (reviews)

**Outputs:** summaryText, risks[], missingInfo[], recommendedActions[], rtwReadiness, compliance

**Triggers:** Manual "regenerate" button, potentially scheduled
**Confidence:** MEDIUM

**Suspected Missing Steps:**
- No human review/approval step before summary is displayed
- No correction mechanism if AI summary contains errors
- AI confidence score exists but no threshold below which human review is mandatory
- No version history of summaries (only latest)
- No audit trail of which AI model generated which summary
- recommendedActions from AI — do they auto-create actions or are they just display?
- No mechanism to flag an AI summary as inaccurate

---

## 9. Email Draft / Communication

**Business Goal:** AI-assisted email drafting for case communication
**Actors:** Clinician (requests/reviews/sends), System (AI generates)

**Draft Status:** draft → sent | discarded

**Email Types:** certificate_chase, rtw_plan_notification, non_compliance_notice, injury_update, other

**Triggers:** Manual request via EmailDraftModal
**Confidence:** MEDIUM

**Suspected Missing Steps:**
- Draft generated but no actual send mechanism visible (copy to clipboard only?)
- No integration with email provider (SendGrid configured but send path unclear)
- No tracking of whether email was actually sent vs just drafted
- No response tracking (did the GP respond to the certificate chase?)
- No template library beyond AI generation

---

## 10. Audit Trail

**Business Goal:** Record all material actions for compliance and security
**Actors:** System (records automatically)

**Event Types (20+):** USER_LOGIN, CASE_VIEW, CASE_UPDATE, AI_SUMMARY_GENERATE, CERTIFICATE_CREATE, ACTION_COMPLETE, TERMINATION_*, ACCESS_DENIED, COMPLIANCE_DASHBOARD_VIEW

**Triggers:** Middleware hooks, explicit logging calls
**Confidence:** HIGH (logging), MEDIUM (completeness)

**Suspected Missing Steps:**
- Audit log page exists but filtering is basic (category + date range)
- No export capability for regulatory compliance
- No tamper protection (audit records stored in same DB)
- No alerting on suspicious patterns (e.g., bulk case access)
- Compliance override decisions — are they audited?
- Pre-employment approval/rejection — audited?
- RTW plan approval — audited?
- Some material decisions may not emit audit events

---

## 11. Employer Dashboard / Portal

**Business Goal:** Employer self-service view of their workers' cases
**Actors:** Employer (views), System (aggregates)

**Features:** Case stats, priority actions, case list, new case creation
**Confidence:** HIGH (UI), MEDIUM (data completeness)

**Suspected Missing Steps:**
- Employer can create new case but workflow after creation unclear
- Employer sees RTW status but cannot formally approve/reject RTW plan in UI
- Employer sees compliance indicator but no explanation of rules
- No employer-specific action queue (actions assigned to employer role may not surface)
- No employer notification preferences

---

## 12. Discussion Notes / Transcripts

**Business Goal:** Capture and analyze clinical meeting notes
**Actors:** Clinician (enters/uploads), System (AI extracts insights)

**Outputs:** rawText, summary, nextSteps[], riskFlags[], insights (area, severity, summary, detail)

**Triggers:** Manual entry, transcript ingestion from `/transcripts` directory
**Confidence:** MEDIUM

**Suspected Missing Steps:**
- `updatesCompliance` and `updatesRecoveryTimeline` flags exist but unclear if they trigger re-evaluation
- Insights extracted but no mechanism to convert insight → action
- No speaker attribution in transcripts
- No review/approval of AI-extracted insights
