
import { evaluateClinicalEvidence } from "./clinicalEvidence";
import type { WorkerCase } from "../../shared/schema";

describe("Clinical Evidence Evaluation (PRD-3.3, PRD-3.4, PRD-9)", () => {
  const baseCase: WorkerCase = {
    id: "test-case-1",
    organizationId: "org-1",
    workerName: "Test Worker",
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
    freshdeskTicketId: null,
    ticketUrl: null,
    ticketSubject: null,
    ticketPriority: null,
    ticketLastUpdatedAt: null,
    aiSummary: null,
    freshdeskRawData: null,
    latestCertificate: null,
    certificateHistory: null,
    attachments: [],
  };

  describe("Flag Generation - PRD-3.3.2 Evidence Classification", () => {
    it("should flag missing treatment plan", () => {
      const evaluation = evaluateClinicalEvidence(baseCase);

      const missingPlanFlag = evaluation.flags.find(
        (f) => f.code === "MISSING_TREATMENT_PLAN"
      );
      expect(missingPlanFlag).toBeDefined();
      expect(missingPlanFlag?.severity).toBe("warning");
      expect(missingPlanFlag?.message).toContain("treatment plan");
    });

    it("should flag missing certificate", () => {
      const evaluation = evaluateClinicalEvidence(baseCase);

      const noCertFlag = evaluation.flags.find(
        (f) => f.code === "NO_RECENT_CERTIFICATE"
      );
      expect(noCertFlag).toBeDefined();
      expect(noCertFlag?.severity).toBe("warning");
    });

    it("should flag out-of-date certificate as high_risk for high risk cases", () => {
      const caseWithOldCert: WorkerCase = {
        ...baseCase,
        riskLevel: "High",
        hasCertificate: true,
        latestCertificate: {
          id: "cert-1",
          caseId: "test-case-1",
          issueDate: "2024-01-01",
          startDate: "2024-01-01",
          endDate: "2024-02-01", // Over 42 days old
          capacity: "unfit",
          notes: "Old certificate",
          source: "manual",
          createdAt: "2024-01-01",
        },
      };

      const evaluation = evaluateClinicalEvidence(caseWithOldCert);

      const staleFlag = evaluation.flags.find(
        (f) => f.code === "CERTIFICATE_OUT_OF_DATE"
      );
      expect(staleFlag).toBeDefined();
      expect(staleFlag?.severity).toBe("high_risk");
    });

    it("should flag non-compliance as high_risk", () => {
      const nonCompliantCase: WorkerCase = {
        ...baseCase,
        complianceStatus: "non_compliant",
      };

      const evaluation = evaluateClinicalEvidence(nonCompliantCase);

      const nonComplianceFlag = evaluation.flags.find(
        (f) => f.code === "WORKER_NON_COMPLIANT"
      );
      expect(nonComplianceFlag).toBeDefined();
      expect(nonComplianceFlag?.severity).toBe("high_risk");
    });

    it("should flag failing RTW plan as high_risk", () => {
      const failingRTWCase: WorkerCase = {
        ...baseCase,
        rtwPlanStatus: "failing",
      };

      const evaluation = evaluateClinicalEvidence(failingRTWCase);

      const rtwFlag = evaluation.flags.find((f) => f.code === "RTW_PLAN_FAILING");
      expect(rtwFlag).toBeDefined();
      expect(rtwFlag?.severity).toBe("high_risk");
      expect(evaluation.isImprovingOnExpectedTimeline).toBe(false);
    });

    it("should flag specialist referral without appointment", () => {
      const referredCase: WorkerCase = {
        ...baseCase,
        specialistStatus: "referred",
      };

      const evaluation = evaluateClinicalEvidence(referredCase);

      const specialistFlag = evaluation.flags.find(
        (f) => f.code === "SPECIALIST_REFERRED_NO_APPOINTMENT"
      );
      expect(specialistFlag).toBeDefined();
      expect(specialistFlag?.severity).toBe("warning");
    });

    it("should flag overdue specialist appointment", () => {
      const overdueCase: WorkerCase = {
        ...baseCase,
        specialistStatus: "appointment_booked",
        specialistReportSummary: {
          lastAppointmentDate: "2024-01-01", // Past date
        },
      };

      const evaluation = evaluateClinicalEvidence(overdueCase);

      const overdueFlag = evaluation.flags.find(
        (f) => f.code === "SPECIALIST_APPOINTMENT_OVERDUE"
      );
      expect(overdueFlag).toBeDefined();
      expect(overdueFlag?.severity).toBe("warning");
    });

    it("should flag when specialist seen but no report", () => {
      const noReportCase: WorkerCase = {
        ...baseCase,
        specialistStatus: "seen_waiting_report",
      };

      const evaluation = evaluateClinicalEvidence(noReportCase);

      const noReportFlag = evaluation.flags.find(
        (f) => f.code === "SPECIALIST_SEEN_NO_REPORT"
      );
      expect(noReportFlag).toBeDefined();
    });

    it("should flag outdated specialist report", () => {
      const outdatedReportCase: WorkerCase = {
        ...baseCase,
        specialistStatus: "report_received",
        specialistReportSummary: {
          lastAppointmentDate: "2024-01-01", // Over 90 days old
        },
      };

      const evaluation = evaluateClinicalEvidence(outdatedReportCase);

      const outdatedFlag = evaluation.flags.find(
        (f) => f.code === "SPECIALIST_REPORT_OUTDATED"
      );
      expect(outdatedFlag).toBeDefined();
      expect(evaluation.specialistReportCurrent).toBe(false);
    });

    it("should flag incomplete evidence", () => {
      const minimalCase: WorkerCase = {
        ...baseCase,
        hasCertificate: false,
        medicalConstraints: undefined,
        specialistStatus: undefined,
        complianceStatus: undefined,
        rtwPlanStatus: undefined,
      };

      const evaluation = evaluateClinicalEvidence(minimalCase);

      const incompleteFlag = evaluation.flags.find(
        (f) => f.code === "EVIDENCE_INCOMPLETE"
      );
      expect(incompleteFlag).toBeDefined();
      expect(incompleteFlag?.severity).toBe("warning");
    });
  });

  describe("Duty Safety Status - PRD-3.3 Evidence Evaluation", () => {
    it("should mark duty as unsafe when non-compliant with high risk", () => {
      const unsafeCase: WorkerCase = {
        ...baseCase,
        riskLevel: "High",
        complianceStatus: "non_compliant",
        medicalConstraints: {
          noLiftingOverKg: 5,
        },
      };

      const evaluation = evaluateClinicalEvidence(unsafeCase);
      expect(evaluation.dutySafetyStatus).toBe("unsafe");
    });

    it("should mark duty as unsafe when RTW plan failing with constraints", () => {
      const unsafeCase: WorkerCase = {
        ...baseCase,
        rtwPlanStatus: "failing",
        medicalConstraints: {
          noBending: true,
        },
      };

      const evaluation = evaluateClinicalEvidence(unsafeCase);
      expect(evaluation.dutySafetyStatus).toBe("unsafe");
    });

    it("should mark duty as safe when all conditions are favorable", () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const safeCase: WorkerCase = {
        ...baseCase,
        hasCertificate: true,
        latestCertificate: {
          id: "cert-1",
          caseId: "test-case-1",
          issueDate: recentDate.toISOString(),
          startDate: recentDate.toISOString(),
          endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Future
          capacity: "partial",
          notes: "Fit for modified duties",
          source: "manual",
          createdAt: recentDate.toISOString(),
        },
        medicalConstraints: {
          noLiftingOverKg: 10,
          suitableForLightDuties: true,
        },
        functionalCapacity: {
          canLiftKg: 10,
          maxWorkHoursPerDay: 6,
        },
        rtwPlanStatus: "working_well",
        complianceStatus: "compliant",
      };

      const evaluation = evaluateClinicalEvidence(safeCase);
      expect(evaluation.dutySafetyStatus).toBe("safe");
      expect(evaluation.hasCurrentCertificate).toBe(true);
      expect(evaluation.hasCurrentTreatmentPlan).toBe(true);
      expect(evaluation.isImprovingOnExpectedTimeline).toBe(true);
    });

    it("should mark duty as unknown when insufficient information", () => {
      const unknownCase: WorkerCase = {
        ...baseCase,
        hasCertificate: false,
      };

      const evaluation = evaluateClinicalEvidence(unknownCase);
      expect(evaluation.dutySafetyStatus).toBe("unknown");
    });
  });

  describe("Treatment Plan Detection - PRD-3.4 Obligation Tracking", () => {
    it("should recognize medical constraints as treatment plan", () => {
      const caseWithConstraints: WorkerCase = {
        ...baseCase,
        medicalConstraints: {
          noLiftingOverKg: 15,
          noBending: true,
        },
      };

      const evaluation = evaluateClinicalEvidence(caseWithConstraints);
      expect(evaluation.hasCurrentTreatmentPlan).toBe(true);
    });

    it("should recognize functional capacity as treatment plan", () => {
      const caseWithCapacity: WorkerCase = {
        ...baseCase,
        functionalCapacity: {
          canLiftKg: 10,
          canStandMinutes: 30,
        },
      };

      const evaluation = evaluateClinicalEvidence(caseWithCapacity);
      expect(evaluation.hasCurrentTreatmentPlan).toBe(true);
    });

    it("should recognize specialist summary as treatment plan", () => {
      const caseWithSpecialist: WorkerCase = {
        ...baseCase,
        specialistReportSummary: {
          functionalSummary: "Worker can perform light duties with restrictions",
        },
      };

      const evaluation = evaluateClinicalEvidence(caseWithSpecialist);
      expect(evaluation.hasCurrentTreatmentPlan).toBe(true);
    });

    it("should not recognize empty constraints as treatment plan", () => {
      const caseWithEmptyConstraints: WorkerCase = {
        ...baseCase,
        medicalConstraints: {},
      };

      const evaluation = evaluateClinicalEvidence(caseWithEmptyConstraints);
      expect(evaluation.hasCurrentTreatmentPlan).toBe(false);
    });
  });

  describe("Recommended Actions - PRD-3.4.1 Task Generation", () => {
    it("should recommend actions for all high-risk flags", () => {
      const highRiskCase: WorkerCase = {
        ...baseCase,
        complianceStatus: "non_compliant",
        rtwPlanStatus: "failing",
      };

      const evaluation = evaluateClinicalEvidence(highRiskCase);

      expect(evaluation.recommendedActions).toBeDefined();
      expect(evaluation.recommendedActions!.length).toBeGreaterThan(0);

      // Should have actions for non-compliance
      const nonComplianceAction = evaluation.recommendedActions!.find(
        (a) => a.type === "ESCALATE_NON_COMPLIANCE_TO_INSURER"
      );
      expect(nonComplianceAction).toBeDefined();

      // Should have actions for failing RTW plan
      const rtwAction = evaluation.recommendedActions!.find(
        (a) => a.type === "REVIEW_RTW_PLAN_WITH_GP"
      );
      expect(rtwAction).toBeDefined();
    });

    it("should include suggested communication templates - PRD-3.4", () => {
      const caseNeedingCert: WorkerCase = {
        ...baseCase,
        hasCertificate: false,
      };

      const evaluation = evaluateClinicalEvidence(caseNeedingCert);

      const certAction = evaluation.recommendedActions!.find(
        (a) => a.type === "REQUEST_UPDATED_CERTIFICATE"
      );
      expect(certAction).toBeDefined();
      expect(certAction?.target).toBe("GP");
    });
  });

  describe("Edge Cases & Null Handling - PRD-6.4 Performance", () => {
    it("should handle case with no dates gracefully", () => {
      const noDatesCase: WorkerCase = {
        ...baseCase,
        dateOfInjury: "",
        latestCertificate: null,
      };

      const evaluation = evaluateClinicalEvidence(noDatesCase);
      expect(evaluation).toBeDefined();
      expect(evaluation.caseId).toBe(noDatesCase.id);
    });

    it("should handle invalid certificate dates", () => {
      const invalidDateCase: WorkerCase = {
        ...baseCase,
        hasCertificate: true,
        latestCertificate: {
          id: "cert-1",
          caseId: "test-case-1",
          issueDate: "invalid-date",
          startDate: "invalid-date",
          endDate: "invalid-date",
          capacity: "unfit",
          notes: "",
          source: "manual",
          createdAt: "2025-01-01",
        },
      };

      const evaluation = evaluateClinicalEvidence(invalidDateCase);
      expect(evaluation).toBeDefined();
      expect(evaluation.hasCurrentCertificate).toBe(false);
    });

    it("should handle null/undefined specialist status", () => {
      const noSpecialistCase: WorkerCase = {
        ...baseCase,
        specialistStatus: undefined,
        specialistReportSummary: undefined,
      };

      const evaluation = evaluateClinicalEvidence(noSpecialistCase);
      expect(evaluation.specialistStatus).toBe("none");
      expect(evaluation.specialistReportPresent).toBe(false);
    });
  });

  describe("Advisory Intelligence - PRD-9: Non-Medical, Explainable", () => {
    it("should provide explainable flags with details", () => {
      const evaluation = evaluateClinicalEvidence(baseCase);

      evaluation.flags.forEach((flag) => {
        expect(flag.code).toBeDefined();
        expect(flag.severity).toMatch(/info|warning|high_risk/);
        expect(flag.message).toBeDefined();
        expect(flag.message.length).toBeGreaterThan(0);
      });
    });

    it("should not make medical determinations - PRD-1.6 Out of Scope", () => {
      const evaluation = evaluateClinicalEvidence(baseCase);

      // Verify flags are administrative/coordination, not medical diagnoses or prescriptions
      // Note: "treatment plan" is acceptable as it refers to documentation, not prescribing treatment
      evaluation.flags.forEach((flag) => {
        expect(flag.message).not.toMatch(/\bdiagnose\b|\bprescribe\b|\bprescribing\b/i);
        expect(flag.message).not.toMatch(/recommend.*medication|suggest.*surgery/i);
      });
    });

    it("should provide actionable recommendations only - PRD-9", () => {
      const caseNeedingActions: WorkerCase = {
        ...baseCase,
        complianceStatus: "non_compliant",
      };

      const evaluation = evaluateClinicalEvidence(caseNeedingActions);

      evaluation.recommendedActions?.forEach((action) => {
        expect(action.target).toMatch(/WORKER|EMPLOYER_INTERNAL|GP|PHYSIOTHERAPIST|SPECIALIST|INSURER/);
        expect(action.label).toBeDefined();
        expect(action.explanation).toBeDefined();
      });
    });
  });
});
