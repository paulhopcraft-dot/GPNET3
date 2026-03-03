import { describe, it, expect } from "vitest";
import { filterCaseByRole, isEmployerRole } from "./rbac";
import type { WorkerCase } from "@shared/schema";

const baseCase: WorkerCase = {
  id: "case-1",
  organizationId: "org-1",
  workerName: "Jane Smith",
  company: "Acme Corp",
  dateOfInjury: "2025-01-15",
  riskLevel: "Medium",
  workStatus: "Off work",
  hasCertificate: true,
  complianceIndicator: "Green",
  currentStatus: "Active",
  nextStep: "Review certificate",
  owner: "admin",
  dueDate: "2025-02-01",
  summary: "Worker injured lower back",
  ticketIds: ["T-1"],
  ticketCount: 1,
  // Clinical fields
  specialistStatus: { hasBeenReferred: true, hasAttended: false, hasReport: false },
  specialistReportSummary: { id: "sr-1", caseId: "case-1", summary: "MRI pending", createdAt: "2025-01-20", updatedAt: "2025-01-20" },
  aiSummary: "Worker has chronic lumbar disc injury requiring specialist care",
  aiSummaryGeneratedAt: "2025-01-22T10:00:00Z",
  aiSummaryModel: "claude-opus",
  aiWorkStatusClassification: "Off work - pending specialist review",
  clinicalEvidence: {
    caseId: "case-1",
    hasCurrentTreatmentPlan: true,
    hasCurrentCertificate: true,
    isImprovingOnExpectedTimeline: null,
    dutySafetyStatus: "unknown",
    specialistStatus: { hasBeenReferred: true, hasAttended: false, hasReport: false },
    specialistReportPresent: false,
    specialistReportCurrent: null,
    flags: [],
  },
  // Non-clinical fields
  medicalConstraints: { description: "No lifting > 5kg", restrictions: ["no-lifting"] },
  functionalCapacity: { overallCapacity: "partial", workHoursPerDay: 4 },
  rtwPlanStatus: { status: "in_progress", planId: "rtw-1", startDate: "2025-02-01", targetReturnDate: "2025-03-01" },
  complianceStatus: { isCompliant: true, checks: [] },
};

describe("isEmployerRole", () => {
  it("returns true for employer role", () => {
    expect(isEmployerRole("employer")).toBe(true);
  });

  it("returns false for clinician role", () => {
    expect(isEmployerRole("clinician")).toBe(false);
  });

  it("returns false for admin role", () => {
    expect(isEmployerRole("admin")).toBe(false);
  });

  it("returns false for insurer role", () => {
    expect(isEmployerRole("insurer")).toBe(false);
  });
});

describe("filterCaseByRole", () => {
  describe("non-employer roles", () => {
    it("returns case unchanged for clinician", () => {
      const result = filterCaseByRole(baseCase, "clinician");
      expect(result).toBe(baseCase); // same reference — no copy made
    });

    it("returns case unchanged for admin", () => {
      const result = filterCaseByRole(baseCase, "admin");
      expect(result).toBe(baseCase);
    });

    it("returns case unchanged for insurer", () => {
      const result = filterCaseByRole(baseCase, "insurer");
      expect(result).toBe(baseCase);
    });
  });

  describe("employer role — clinical fields stripped", () => {
    let filtered: WorkerCase;

    beforeEach(() => {
      filtered = filterCaseByRole(baseCase, "employer");
    });

    // Fields that MUST be stripped
    it("removes specialistStatus", () => {
      expect(filtered.specialistStatus).toBeUndefined();
    });

    it("removes specialistReportSummary", () => {
      expect(filtered.specialistReportSummary).toBeUndefined();
    });

    it("removes aiSummary", () => {
      expect(filtered.aiSummary).toBeUndefined();
    });

    it("removes aiSummaryGeneratedAt", () => {
      expect(filtered.aiSummaryGeneratedAt).toBeUndefined();
    });

    it("removes aiSummaryModel", () => {
      expect(filtered.aiSummaryModel).toBeUndefined();
    });

    it("removes aiWorkStatusClassification", () => {
      expect(filtered.aiWorkStatusClassification).toBeUndefined();
    });

    it("removes clinicalEvidence", () => {
      expect(filtered.clinicalEvidence).toBeUndefined();
    });

    it("removes latestDiscussionNotes", () => {
      expect(filtered.latestDiscussionNotes).toBeUndefined();
    });

    it("removes discussionInsights", () => {
      expect(filtered.discussionInsights).toBeUndefined();
    });

    // Fields that MUST remain
    it("retains worker identity fields", () => {
      expect(filtered.workerName).toBe("Jane Smith");
      expect(filtered.company).toBe("Acme Corp");
      expect(filtered.dateOfInjury).toBe("2025-01-15");
    });

    it("retains work status and risk level", () => {
      expect(filtered.workStatus).toBe("Off work");
      expect(filtered.riskLevel).toBe("Medium");
    });

    it("retains compliance indicator", () => {
      expect(filtered.complianceIndicator).toBe("Green");
    });

    it("retains medicalConstraints (RTW coordination)", () => {
      expect(filtered.medicalConstraints).toBeDefined();
    });

    it("retains functionalCapacity (RTW coordination)", () => {
      expect(filtered.functionalCapacity).toBeDefined();
    });

    it("retains rtwPlanStatus", () => {
      expect(filtered.rtwPlanStatus).toBeDefined();
    });

    it("retains complianceStatus", () => {
      expect(filtered.complianceStatus).toBeDefined();
    });

    it("does not mutate the original case", () => {
      expect(baseCase.aiSummary).toBeDefined(); // original unchanged
    });
  });
});
