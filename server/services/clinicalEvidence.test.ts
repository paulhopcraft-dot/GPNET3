import { describe, it, expect } from "vitest";
import { evaluateClinicalEvidence } from "./clinicalEvidence";
import type { WorkerCase } from "@shared/schema";

// Helper to create a minimal worker case
function createMockCase(overrides: Partial<WorkerCase> = {}): WorkerCase {
  return {
    id: "case-123",
    organizationId: "org-456",
    workerName: "John Smith",
    company: "Acme Corp",
    dateOfInjury: "2025-01-01",
    riskLevel: "Medium",
    workStatus: "Off work",
    hasCertificate: false,
    complianceIndicator: "Medium",
    currentStatus: "Under review",
    nextStep: "Follow up",
    owner: "Case Manager",
    dueDate: "2025-02-01",
    summary: "Back injury",
    ticketIds: [],
    ticketCount: 0,
    employmentStatus: "ACTIVE",
    terminationProcessId: null,
    terminationReason: null,
    terminationAuditFlag: null,
    attachments: [],
    ...overrides,
  };
}

describe("evaluateClinicalEvidence", () => {
  describe("treatment plan flags", () => {
    it("flags missing treatment plan when no constraints documented", () => {
      const workerCase = createMockCase({
        medicalConstraints: undefined,
        functionalCapacity: undefined,
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "MISSING_TREATMENT_PLAN");
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe("warning");
    });

    it("does not flag when medical constraints exist", () => {
      const workerCase = createMockCase({
        medicalConstraints: {
          noLiftingOverKg: 5,
          noBending: true,
        },
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "MISSING_TREATMENT_PLAN");
      expect(flag).toBeUndefined();
      expect(result.hasCurrentTreatmentPlan).toBe(true);
    });
  });

  describe("certificate flags", () => {
    it("flags no recent certificate when case has no certificate", () => {
      const workerCase = createMockCase({
        hasCertificate: false,
        latestCertificate: undefined,
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "NO_RECENT_CERTIFICATE");
      expect(flag).toBeDefined();
      expect(result.hasCurrentCertificate).toBe(false);
    });

    it("flags outdated certificate older than 42 days", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 50); // 50 days ago

      const workerCase = createMockCase({
        hasCertificate: true,
        latestCertificate: {
          id: "cert-1",
          caseId: "case-123",
          issueDate: oldDate.toISOString(),
          startDate: oldDate.toISOString(),
          endDate: oldDate.toISOString(),
          capacity: "partial",
          source: "manual",
        },
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "CERTIFICATE_OUT_OF_DATE");
      expect(flag).toBeDefined();
      expect(result.hasCurrentCertificate).toBe(false);
    });

    it("considers certificate current if within 42 days", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago

      const workerCase = createMockCase({
        hasCertificate: true,
        latestCertificate: {
          id: "cert-1",
          caseId: "case-123",
          issueDate: recentDate.toISOString(),
          startDate: recentDate.toISOString(),
          endDate: recentDate.toISOString(),
          capacity: "partial",
          source: "manual",
        },
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "CERTIFICATE_OUT_OF_DATE");
      expect(flag).toBeUndefined();
      expect(result.hasCurrentCertificate).toBe(true);
    });
  });

  describe("RTW plan flags", () => {
    it("flags failing RTW plan as high risk", () => {
      const workerCase = createMockCase({
        rtwPlanStatus: "failing",
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "RTW_PLAN_FAILING");
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe("high_risk");
      expect(result.isImprovingOnExpectedTimeline).toBe(false);
    });

    it("recognizes working well RTW plan", () => {
      const workerCase = createMockCase({
        rtwPlanStatus: "working_well",
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "RTW_PLAN_FAILING");
      expect(flag).toBeUndefined();
      expect(result.isImprovingOnExpectedTimeline).toBe(true);
    });
  });

  describe("compliance flags", () => {
    it("flags non-compliant worker as high risk", () => {
      const workerCase = createMockCase({
        complianceStatus: "non_compliant",
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "WORKER_NON_COMPLIANT");
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe("high_risk");
    });
  });

  describe("duty safety status", () => {
    it("marks unsafe when non-compliant with medical constraints", () => {
      const workerCase = createMockCase({
        complianceStatus: "non_compliant",
        medicalConstraints: { noBending: true },
      });

      const result = evaluateClinicalEvidence(workerCase);

      expect(result.dutySafetyStatus).toBe("unsafe");
    });

    it("marks unsafe when RTW plan is failing", () => {
      const workerCase = createMockCase({
        rtwPlanStatus: "failing",
        medicalConstraints: { noLiftingOverKg: 5 },
      });

      const result = evaluateClinicalEvidence(workerCase);

      expect(result.dutySafetyStatus).toBe("unsafe");
    });

    it("marks safe when all conditions are good", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);

      const workerCase = createMockCase({
        hasCertificate: true,
        latestCertificate: {
          id: "cert-1",
          caseId: "case-123",
          issueDate: recentDate.toISOString(),
          startDate: recentDate.toISOString(),
          endDate: recentDate.toISOString(),
          capacity: "fit",
          source: "manual",
        },
        medicalConstraints: { suitableForLightDuties: true },
        rtwPlanStatus: "working_well",
        complianceStatus: "compliant",
      });

      const result = evaluateClinicalEvidence(workerCase);

      expect(result.dutySafetyStatus).toBe("safe");
    });
  });

  describe("specialist flags", () => {
    it("flags specialist referred but no appointment", () => {
      const workerCase = createMockCase({
        specialistStatus: "referred",
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "SPECIALIST_REFERRED_NO_APPOINTMENT");
      expect(flag).toBeDefined();
    });

    it("flags specialist seen but no report", () => {
      const workerCase = createMockCase({
        specialistStatus: "seen_waiting_report",
        specialistReportSummary: undefined,
      });

      const result = evaluateClinicalEvidence(workerCase);

      const flag = result.flags.find((f) => f.code === "SPECIALIST_SEEN_NO_REPORT");
      expect(flag).toBeDefined();
    });
  });

  describe("evaluation summary", () => {
    it("includes recommended actions for flagged cases", () => {
      const workerCase = createMockCase({
        complianceStatus: "non_compliant",
        rtwPlanStatus: "failing",
      });

      const result = evaluateClinicalEvidence(workerCase);

      expect(result.recommendedActions).toBeDefined();
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it("returns case ID in evaluation", () => {
      const workerCase = createMockCase({ id: "my-case-id" });

      const result = evaluateClinicalEvidence(workerCase);

      expect(result.caseId).toBe("my-case-id");
    });
  });
});
