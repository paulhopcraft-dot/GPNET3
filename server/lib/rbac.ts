/**
 * Role-Based Access Control (RBAC) — Phase 1.8
 *
 * Defines server-side data boundaries by user role.
 * Clinical fields (diagnosis, treatment plans, specialist reports, AI summaries)
 * are stripped from responses for employer-role users.
 *
 * Rule: Never rely on the frontend to hide fields. All filtering is server-side.
 */

import type { UserRole, WorkerCase, CaseClinicalStatus } from "@shared/schema";

/**
 * Returns true for any role that maps to "employer" access level.
 * Partner-role users act on behalf of an employer client and get the same
 * clinical-data filtering treatment as employer-role users.
 */
export function isEmployerRole(role: UserRole): boolean {
  return role === "employer" || role === "partner";
}

/**
 * Strips clinical fields from CaseClinicalStatus for employer-role users.
 * Employers may see: functional capacity, RTW plan status, compliance status.
 * Employers cannot see: treatment plans, specialist reports, medical constraints detail.
 */
function filterClinicalStatus(
  json: CaseClinicalStatus | null | undefined,
  role: UserRole
): CaseClinicalStatus | null | undefined {
  if (!json) return json;
  if (!isEmployerRole(role)) return json;

  // Retain fields employers need for RTW coordination
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    treatmentPlan: _tp,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    treatmentPlanHistory: _tph,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    specialistStatus: _ss,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    specialistReportSummary: _srs,
    ...safeFields
  } = json;

  return safeFields;
}

/**
 * Filters a WorkerCase object to remove fields the requesting role is not
 * permitted to see. Returns a new object — never mutates the original.
 *
 * Clinical fields hidden from employer role:
 *   - specialistStatus, specialistReportSummary
 *   - aiSummary, aiSummaryGeneratedAt, aiSummaryModel, aiWorkStatusClassification
 *   - clinical_status_json (treatmentPlan, treatmentPlanHistory, specialistStatus, specialistReportSummary)
 *   - clinicalEvidence
 *   - latestDiscussionNotes, discussionInsights
 */
export function filterCaseByRole(workerCase: WorkerCase, role: UserRole): WorkerCase {
  if (!isEmployerRole(role)) return workerCase;

  return {
    ...workerCase,
    // Strip specialist/clinical fields
    specialistStatus: undefined,
    specialistReportSummary: undefined,
    clinicalEvidence: undefined,
    // Strip AI summaries (contain clinical reasoning)
    aiSummary: undefined,
    aiSummaryGeneratedAt: undefined,
    aiSummaryModel: undefined,
    aiWorkStatusClassification: undefined,
    // Strip clinical discussion content
    latestDiscussionNotes: undefined,
    discussionInsights: undefined,
    // Phase 11.2: Strip dispute details from employer view (conciliation strategy is confidential)
    disputeStatus: workerCase.disputeStatus === "none" || workerCase.disputeStatus === "resolved"
      ? workerCase.disputeStatus
      : undefined,
    // Partial-strip the JSON blob
    clinical_status_json: filterClinicalStatus(workerCase.clinical_status_json, role) ?? undefined,
  };
}
