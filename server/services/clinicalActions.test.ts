
import { buildClinicalActionRecommendations } from "./clinicalActions";
import type { WorkerCase, ClinicalEvidenceEvaluation } from "../../shared/schema";

describe("Clinical Action Recommendations (PRD-3.4 Task & Obligation Engine)", () => {
  const baseCase: WorkerCase = {
    id: "test-case-1",
    organizationId: "org-1",
    workerName: "Jane Doe",
    company: "Test Company",
    dateOfInjury: "2025-01-01",
    riskLevel: "Medium",
    workStatus: "Off work",
    hasCertificate: false,
    complianceIndicator: "Medium",
    currentStatus: "Under treatment",
    nextStep: "Await certificate",
    owner: "Test Manager",
    dueDate: "2025-02-01",
    summary: "Test case summary",
    ticketIds: [],
    ticketCount: 0,
  };

  const baseEvaluation: ClinicalEvidenceEvaluation = {
    caseId: "test-case-1",
    hasCurrentTreatmentPlan: false,
    hasCurrentCertificate: false,
    isImprovingOnExpectedTimeline: null,
    dutySafetyStatus: "unknown",
    specialistStatus: "none",
    specialistReportPresent: false,
    specialistReportCurrent: null,
    flags: [],
  };

  describe("PRD-3.4.1: Task Generation from Flags", () => {
    it("should generate treatment plan request action", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          {
            code: "MISSING_TREATMENT_PLAN",
            severity: "warning",
            message: "No treatment plan",
          },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const treatmentPlanAction = actions.find(
        (a) => a.type === "REQUEST_TREATMENT_PLAN"
      );
      expect(treatmentPlanAction).toBeDefined();
      expect(treatmentPlanAction?.target).toBe("GP");
      expect(treatmentPlanAction?.suggestedSubject).toContain("Jane Doe");
      expect(treatmentPlanAction?.suggestedBody).toBeDefined();
    });

    it("should generate certificate update request", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          {
            code: "CERTIFICATE_OUT_OF_DATE",
            severity: "warning",
            message: "Certificate stale",
          },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const certAction = actions.find(
        (a) => a.type === "REQUEST_UPDATED_CERTIFICATE"
      );
      expect(certAction).toBeDefined();
      expect(certAction?.target).toBe("GP");
    });

    it("should generate delay explanation request for RTW failures", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          {
            code: "RTW_PLAN_FAILING",
            severity: "high_risk",
            message: "RTW plan not working",
          },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const delayAction = actions.find(
        (a) => a.type === "REQUEST_CLINICAL_EXPLANATION_FOR_DELAY"
      );
      expect(delayAction).toBeDefined();
      expect(delayAction?.target).toBe("GP");
      expect(delayAction?.relatedFlagCodes).toContain("RTW_PLAN_FAILING");

      const reviewAction = actions.find(
        (a) => a.type === "REVIEW_RTW_PLAN_WITH_GP"
      );
      expect(reviewAction).toBeDefined();
    });

    it("should generate specialist appointment follow-up", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          {
            code: "SPECIALIST_REFERRED_NO_APPOINTMENT",
            severity: "warning",
            message: "Referral without appointment",
          },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const appointmentAction = actions.find(
        (a) => a.type === "REQUEST_SPECIALIST_APPOINTMENT_STATUS"
      );
      expect(appointmentAction).toBeDefined();
      expect(appointmentAction?.target).toBe("WORKER");
      expect(appointmentAction?.suggestedScript).toBeDefined();
      expect(appointmentAction?.suggestedScript).toContain("specialist");
    });

    it("should generate specialist report request", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          {
            code: "SPECIALIST_SEEN_NO_REPORT",
            severity: "warning",
            message: "No report on file",
          },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const reportAction = actions.find(
        (a) => a.type === "REQUEST_SPECIALIST_REPORT"
      );
      expect(reportAction).toBeDefined();
      expect(reportAction?.target).toBe("SPECIALIST");
      expect(reportAction?.suggestedBody).toContain("Jane Doe");
    });

    it("should generate non-compliance escalation and worker discussion", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          {
            code: "WORKER_NON_COMPLIANT",
            severity: "high_risk",
            message: "Worker non-compliant",
          },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const escalateAction = actions.find(
        (a) => a.type === "ESCALATE_NON_COMPLIANCE_TO_INSURER"
      );
      expect(escalateAction).toBeDefined();
      expect(escalateAction?.target).toBe("INSURER");
      expect(escalateAction?.suggestedBody).toContain("Non-compliance report");

      const discussAction = actions.find(
        (a) => a.type === "REVIEW_DUTIES_WITH_WORKER"
      );
      expect(discussAction).toBeDefined();
      expect(discussAction?.target).toBe("WORKER");
      expect(discussAction?.suggestedScript).toBeDefined();
    });

    it("should generate documentation action for incomplete evidence", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          {
            code: "EVIDENCE_INCOMPLETE",
            severity: "warning",
            message: "Evidence gaps exist",
          },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const docAction = actions.find(
        (a) => a.type === "DOCUMENT_EVIDENCE_GAP"
      );
      expect(docAction).toBeDefined();
      expect(docAction?.target).toBe("EMPLOYER_INTERNAL");
    });
  });

  describe("PRD-3.4.2: Action Targeting", () => {
    it("should target appropriate stakeholders for each action type", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "MISSING_TREATMENT_PLAN", severity: "warning", message: "Test" },
          { code: "SPECIALIST_REFERRED_NO_APPOINTMENT", severity: "warning", message: "Test" },
          { code: "WORKER_NON_COMPLIANT", severity: "high_risk", message: "Test" },
          { code: "EVIDENCE_INCOMPLETE", severity: "warning", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const targetCounts = actions.reduce((acc, action) => {
        acc[action.target] = (acc[action.target] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Verify diverse stakeholder targeting
      expect(targetCounts.GP).toBeGreaterThan(0);
      expect(targetCounts.WORKER).toBeGreaterThan(0);
      expect(targetCounts.EMPLOYER_INTERNAL).toBeGreaterThan(0);
    });
  });

  describe("PRD-3.4: Communication Templates", () => {
    it("should provide suggested subject lines for email actions", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "MISSING_TREATMENT_PLAN", severity: "warning", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const emailAction = actions.find((a) => a.suggestedSubject);
      expect(emailAction).toBeDefined();
      expect(emailAction?.suggestedSubject).toContain(baseCase.workerName);
    });

    it("should provide suggested body text for written communications", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "RTW_PLAN_FAILING", severity: "high_risk", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const bodyAction = actions.find((a) => a.suggestedBody);
      expect(bodyAction).toBeDefined();
      expect(bodyAction?.suggestedBody?.length).toBeGreaterThan(0);
    });

    it("should provide suggested scripts for phone/in-person conversations", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "SPECIALIST_REFERRED_NO_APPOINTMENT", severity: "warning", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const scriptAction = actions.find((a) => a.suggestedScript);
      expect(scriptAction).toBeDefined();
      expect(scriptAction?.suggestedScript?.length).toBeGreaterThan(0);
    });
  });

  describe("PRD-9: Advisory Intelligence - Non-Prescriptive", () => {
    it("should provide recommendations, not commands", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "MISSING_TREATMENT_PLAN", severity: "warning", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      actions.forEach((action) => {
        // Verify language is suggestive, not prescriptive
        expect(action.label).toMatch(/request|review|discuss|document|prepare/i);
        expect(action.explanation).toBeDefined();
      });
    });

    it("should link actions to specific flags for explainability", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "RTW_PLAN_FAILING", severity: "high_risk", message: "Test" },
          { code: "WORKER_NON_COMPLIANT", severity: "high_risk", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      actions.forEach((action) => {
        expect(action.relatedFlagCodes).toBeDefined();
        expect(action.relatedFlagCodes.length).toBeGreaterThan(0);

        // Verify at least one of the related flag codes exists in the evaluation
        // (Actions may reference multiple potential flags even if only one is present)
        const hasMatchingFlag = action.relatedFlagCodes.some((code) =>
          evaluation.flags.find((f) => f.code === code)
        );
        expect(hasMatchingFlag).toBe(true);
      });
    });
  });

  describe("Action Uniqueness - PRD-6.4 Performance", () => {
    it("should not generate duplicate actions", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "NO_RECENT_CERTIFICATE", severity: "warning", message: "Test" },
          { code: "CERTIFICATE_OUT_OF_DATE", severity: "warning", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const certActions = actions.filter(
        (a) => a.type === "REQUEST_UPDATED_CERTIFICATE"
      );
      expect(certActions.length).toBe(1);
    });

    it("should generate unique IDs for each action", () => {
      const evaluation: ClinicalEvidenceEvaluation = {
        ...baseEvaluation,
        flags: [
          { code: "MISSING_TREATMENT_PLAN", severity: "warning", message: "Test" },
          { code: "RTW_PLAN_FAILING", severity: "high_risk", message: "Test" },
        ],
      };

      const actions = buildClinicalActionRecommendations(baseCase, evaluation);

      const ids = actions.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Verify ID format includes case, type, and target
      actions.forEach((action) => {
        expect(action.id).toContain(evaluation.caseId);
        expect(action.id).toContain(action.type);
        expect(action.id).toContain(action.target);
      });
    });
  });
});
