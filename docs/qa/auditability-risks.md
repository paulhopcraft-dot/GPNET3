# Auditability Risks

**Generated:** 2026-03-24

---

## AUDIT-RISK-001: Compliance Override Decisions May Not Be Audited

**Severity:** HIGH
**Affected Workflow:** Compliance engine
**Risk:** complianceOverride fields store who/when/reason but unclear if an audit_event is emitted when override is applied. Overrides change a material compliance assessment.
**Recommendation:** Verify COMPLIANCE_OVERRIDE audit event exists. If not, add it.

## AUDIT-RISK-002: Pre-Employment Approval/Rejection Not Audited

**Severity:** HIGH
**Affected Workflow:** Pre-employment clearance
**Risk:** Approve/reject buttons in PreEmploymentPage change clearance level but may not emit audit events. This is a hiring decision with legal implications.
**Recommendation:** Add PREEMPLOYMENT_DECISION audit event with userId, clearanceLevel, candidateId.

## AUDIT-RISK-003: AI Summary Generation Actor Attribution

**Severity:** MEDIUM
**Affected Workflow:** Smart summary
**Risk:** AI_SUMMARY_GENERATE audit events may record "System" as actor when a human triggered the regeneration. Obscures accountability.
**Recommendation:** Pass authenticated userId through to audit event for manually triggered regenerations.

## AUDIT-RISK-004: RTW Plan Approval Not Individually Audited

**Severity:** HIGH
**Affected Workflow:** RTW planning
**Risk:** rtwApprovals table records approval data but may not emit a separate audit event. RTW plan approval changes worker's return-to-work pathway.
**Recommendation:** Add RTW_PLAN_APPROVED / RTW_PLAN_REJECTED audit events.

## AUDIT-RISK-005: Audit Log Not Tamper-Protected

**Severity:** MEDIUM
**Affected Workflow:** Audit trail
**Risk:** Audit events stored in same database as application data. Admin users with database access could modify audit records. For regulated environments, this is insufficient.
**Recommendation:** Consider write-only append log, signed entries, or external audit service.

## AUDIT-RISK-006: Action Cancellation Reason Not Enforced

**Severity:** MEDIUM
**Affected Workflow:** Action queue
**Risk:** Actions can be cancelled with `cancelledReason` but enforcement of providing a reason is unclear. Silent cancellation of compliance-generated actions is risky.
**Recommendation:** Enforce mandatory cancellation reason. Emit CASE_ACTION_CANCELLED audit event.

## AUDIT-RISK-007: No Audit Export for Regulatory Compliance

**Severity:** MEDIUM
**Affected Workflow:** Audit trail
**Risk:** AuditLogPage shows events in-app but there is no export capability. Regulators or insurers requesting audit records need a downloadable/printable format.
**Recommendation:** Add CSV/PDF export for filtered audit log views.

## AUDIT-RISK-008: Lifecycle Transition Audit May Be Incomplete

**Severity:** HIGH
**Affected Workflow:** Case lifecycle
**Risk:** `case_lifecycle_logs` table exists for transition audit. But verify all lifecycle transitions (including closed states) are logged with actor, timestamp, and reason.
**Recommendation:** Test each lifecycle transition and verify log entry is created.
