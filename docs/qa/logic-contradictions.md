# Logic Contradictions

**Generated:** 2026-03-24
**Method:** Static code analysis + schema inspection

---

## CONTRADICTION-001: Compliance Score Despite Missing Data

**Severity:** HIGH
**Workflows:** Compliance engine, all case views

**The Contradiction:**
A case with no medical certificates, no RTW plan, and minimal data will receive a compliance score (e.g., "Very Low" or "Low"). This score implies the system has evaluated compliance and found it lacking. In reality, the system has insufficient data to make any assessment.

**Why It Matters:**
A case manager seeing "Low compliance" takes action to improve compliance. But "insufficient data" requires a different action — gathering data first. The system conflates absence of evidence with evidence of non-compliance.

**Evidence:**
complianceEngine.ts evaluates all rules regardless of data availability. Missing certificate → CERT_CURRENT rule fails → non_compliant. No "unknown" or "insufficient_data" intermediate state.

**Operational Risk:**
Case managers may waste effort on compliance improvement actions when the real issue is data completeness. Worse, a case with no data looks the same as a case with contradictory data.

---

## CONTRADICTION-002: Worker "Off Work" 400+ Days but "Compliant"

**Severity:** HIGH
**Workflows:** Compliance engine, case views

**The Contradiction:**
A worker can be off work for over a year with current medical certificates and a technically valid (but stalled) RTW plan. The compliance engine may rate them as compliant because all rules are technically satisfied. But operationally, a worker off work for 400+ days with no progress is not a compliant case — it's a case that needs intervention.

**Why It Matters:**
Compliance should reflect operational reality, not just rule satisfaction. A compliant label on a stalled case gives false confidence and may delay necessary escalation (e.g., termination review, alternative pathway).

**Evidence:**
Compliance rules check certificate currency and RTW plan existence but not RTW plan progress or time-based escalation. The 78-week and 104-week payment step-down rules exist but are narrow.

---

## CONTRADICTION-003: RTW Plan "Working Well" but Worker Still Off Work

**Severity:** MEDIUM
**Workflows:** RTW planning, case views

**The Contradiction:**
RTW plan status can be "working_well" while the case's workStatus remains "Off work". These should be mutually exclusive — if the RTW plan is working well, the worker should be at work (at least partially).

**Why It Matters:**
A case showing "RTW: working well" and "Status: Off work" is confusing and operationally misleading. It erodes trust in the system's status tracking.

**Evidence:**
RTW plan status and case workStatus are updated independently. No validation ensures consistency.

**Operational Risk:**
Case managers may see conflicting signals and not know which to trust.

---

## CONTRADICTION-004: Employment Status TERMINATED but Case Still Active

**Severity:** MEDIUM
**Workflows:** Termination, case lifecycle

**The Contradiction:**
The case's `employmentStatus` can be TERMINATED while the case `lifecycleStage` remains in an active state (e.g., active_treatment). The employment termination and case lifecycle are not synchronized.

**Why It Matters:**
A terminated worker's case may still show active treatment needs, generate compliance actions, and appear in active case lists. This creates operational confusion.

**Evidence:**
employmentStatus is set by termination workflow. lifecycleStage is set by lifecycle transitions. No cross-validation between them.

---

## CONTRADICTION-005: Pre-Employment "requires_review" but No Review Queue

**Severity:** MEDIUM
**Workflows:** Pre-employment health clearance

**The Contradiction:**
AI can flag a pre-employment assessment as `requires_review` and send an alert. But the pre-employment page does not filter by or highlight items needing review. The alert goes to a specific email (jacinta@preventli.ai) but there is no in-app workflow to act on it.

**Why It Matters:**
A candidate is blocked (cannot start work) but the review mechanism exists outside the app. This creates a bottleneck and tracking gap.

**Evidence:**
`alertSent` flag and hardcoded email in assessment completion logic. PreEmploymentPage shows all assessments equally.

---

## CONTRADICTION-006: Certificate Capacity "Partial" Without Restriction Detail

**Severity:** MEDIUM
**Workflows:** Certificate management, RTW

**The Contradiction:**
A medical certificate can have capacity = "partial" but restrictions may be empty or minimal. Partial capacity is meaningless without knowing what the restrictions are. The system allows this state.

**Why It Matters:**
RTW planning and duty matching depend on knowing specific restrictions. "Partial capacity" without detail cannot inform duty selection and may lead to unsafe work assignments.

**Evidence:**
Certificate schema has `capacity` and `restrictions[]` as independent fields. No validation ensures restrictions are present when capacity is partial.

---

## CONTRADICTION-007: Audit Log Shows "System" Actor for Human-Initiated AI Actions

**Severity:** LOW
**Workflows:** Audit trail, AI summary

**The Contradiction:**
When a case manager clicks "Regenerate Summary," the audit event may record the actor as "System" rather than the user who requested it. This obscures accountability.

**Why It Matters:**
Audit trails must show who initiated an action, not just who executed it. AI actions initiated by humans should record the human actor.

**Evidence:**
Audit events for AI_SUMMARY_GENERATE may use system actor. Needs verification.
