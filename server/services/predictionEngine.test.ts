import { describe, it, expect } from "vitest";
import {
  calculatePrediction,
  calculateRtwProbability,
  calculateWeeksRemaining,
  calculateCostRisk,
  calculateEscalationRisk,
  type CasePrediction,
} from "./predictionEngine";
import type { WorkerCase } from "@shared/schema";

// Helper to create test cases with required fields
function createTestCase(overrides: Partial<WorkerCase> = {}): WorkerCase {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);

  return {
    id: "test-case-1",
    organizationId: "org-1",
    workerName: "Test Worker",
    company: "Test Company",
    dateOfInjury: fourWeeksAgo.toISOString(),
    riskLevel: "Medium",
    workStatus: "Off work",
    hasCertificate: true,
    complianceIndicator: "Medium",
    currentStatus: "Active",
    nextStep: "Follow up",
    owner: "Case Manager",
    dueDate: now.toISOString(),
    summary: "Test case",
    ticketIds: ["ticket-1"],
    ticketCount: 1,
    ...overrides,
  };
}

describe("predictionEngine", () => {
  describe("calculatePrediction", () => {
    it("should return a complete prediction object", () => {
      const testCase = createTestCase();
      const prediction = calculatePrediction(testCase);

      expect(prediction).toHaveProperty("caseId", testCase.id);
      expect(prediction).toHaveProperty("rtwProbability");
      expect(prediction).toHaveProperty("expectedWeeksRemaining");
      expect(prediction).toHaveProperty("weeksElapsed");
      expect(prediction).toHaveProperty("costRisk");
      expect(prediction).toHaveProperty("escalationRisk");
      expect(prediction).toHaveProperty("factors");
      expect(prediction).toHaveProperty("generatedAt");
    });

    it("should include explainability factors (PRD-9 compliance)", () => {
      const testCase = createTestCase();
      const prediction = calculatePrediction(testCase);

      expect(Array.isArray(prediction.factors)).toBe(true);
      expect(prediction.factors.length).toBeGreaterThan(0);
      // Each factor should have a description and impact
      prediction.factors.forEach((factor) => {
        expect(factor).toHaveProperty("description");
        expect(factor).toHaveProperty("impact");
        expect(["positive", "negative", "neutral"]).toContain(factor.impact);
      });
    });
  });

  describe("calculateRtwProbability", () => {
    it("should return high probability (85+) when worker is at work", () => {
      const testCase = createTestCase({ workStatus: "At work" });
      const probability = calculateRtwProbability(testCase);

      expect(probability).toBeGreaterThanOrEqual(85);
      expect(probability).toBeLessThanOrEqual(100);
    });

    it("should return higher probability for low risk cases", () => {
      const lowRiskCase = createTestCase({ riskLevel: "Low" });
      const highRiskCase = createTestCase({ riskLevel: "High" });

      const lowRiskProb = calculateRtwProbability(lowRiskCase);
      const highRiskProb = calculateRtwProbability(highRiskCase);

      expect(lowRiskProb).toBeGreaterThan(highRiskProb);
    });

    it("should return probability between 0 and 100", () => {
      const testCases = [
        createTestCase({ riskLevel: "Low", workStatus: "At work" }),
        createTestCase({ riskLevel: "High", workStatus: "Off work" }),
        createTestCase({ riskLevel: "Medium" }),
      ];

      testCases.forEach((testCase) => {
        const probability = calculateRtwProbability(testCase);
        expect(probability).toBeGreaterThanOrEqual(0);
        expect(probability).toBeLessThanOrEqual(100);
      });
    });

    it("should factor in clinical evidence when present", () => {
      const caseWithGoodEvidence = createTestCase({
        clinicalEvidence: {
          caseId: "test-case-1",
          hasCurrentTreatmentPlan: true,
          hasCurrentCertificate: true,
          isImprovingOnExpectedTimeline: true,
          dutySafetyStatus: "safe",
          specialistStatus: "not_required",
          specialistReportPresent: false,
          specialistReportCurrent: null,
          flags: [],
        },
      });

      const caseWithPoorEvidence = createTestCase({
        clinicalEvidence: {
          caseId: "test-case-1",
          hasCurrentTreatmentPlan: false,
          hasCurrentCertificate: false,
          isImprovingOnExpectedTimeline: false,
          dutySafetyStatus: "unsafe",
          specialistStatus: "referred",
          specialistReportPresent: false,
          specialistReportCurrent: null,
          flags: [{ code: "MISSING_TREATMENT_PLAN", severity: "high_risk", message: "No treatment plan" }],
        },
      });

      const goodProb = calculateRtwProbability(caseWithGoodEvidence);
      const poorProb = calculateRtwProbability(caseWithPoorEvidence);

      expect(goodProb).toBeGreaterThan(poorProb);
    });
  });

  describe("calculateWeeksRemaining", () => {
    it("should return 0 when worker is at work", () => {
      const testCase = createTestCase({ workStatus: "At work" });
      const weeks = calculateWeeksRemaining(testCase);

      expect(weeks).toBe(0);
    });

    it("should return fewer weeks for low risk cases", () => {
      const lowRiskCase = createTestCase({ riskLevel: "Low" });
      const highRiskCase = createTestCase({ riskLevel: "High" });

      const lowRiskWeeks = calculateWeeksRemaining(lowRiskCase);
      const highRiskWeeks = calculateWeeksRemaining(highRiskCase);

      expect(lowRiskWeeks).toBeLessThanOrEqual(highRiskWeeks);
    });

    it("should not return negative weeks", () => {
      // Very old injury (52 weeks ago)
      const now = new Date();
      const yearAgo = new Date(now.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);
      const testCase = createTestCase({ dateOfInjury: yearAgo.toISOString() });

      const weeks = calculateWeeksRemaining(testCase);
      expect(weeks).toBeGreaterThanOrEqual(0);
    });

    it("should return integer value", () => {
      const testCase = createTestCase();
      const weeks = calculateWeeksRemaining(testCase);

      expect(Number.isInteger(weeks)).toBe(true);
    });
  });

  describe("calculateCostRisk", () => {
    it("should return High for high risk cases", () => {
      const testCase = createTestCase({ riskLevel: "High" });
      const costRisk = calculateCostRisk(testCase);

      expect(costRisk).toBe("High");
    });

    it("should return Low for low risk cases at work", () => {
      const testCase = createTestCase({ riskLevel: "Low", workStatus: "At work" });
      const costRisk = calculateCostRisk(testCase);

      expect(costRisk).toBe("Low");
    });

    it("should return valid risk level", () => {
      const testCase = createTestCase();
      const costRisk = calculateCostRisk(testCase);

      expect(["High", "Medium", "Low"]).toContain(costRisk);
    });
  });

  describe("calculateEscalationRisk", () => {
    it("should return High for high risk cases with many weeks elapsed", () => {
      const now = new Date();
      const tenWeeksAgo = new Date(now.getTime() - 10 * 7 * 24 * 60 * 60 * 1000);
      const testCase = createTestCase({
        riskLevel: "High",
        dateOfInjury: tenWeeksAgo.toISOString(),
      });

      const escalationRisk = calculateEscalationRisk(testCase);
      expect(escalationRisk).toBe("High");
    });

    it("should return Low for low risk recent cases", () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 1 * 7 * 24 * 60 * 60 * 1000);
      const testCase = createTestCase({
        riskLevel: "Low",
        dateOfInjury: oneWeekAgo.toISOString(),
      });

      const escalationRisk = calculateEscalationRisk(testCase);
      expect(escalationRisk).toBe("Low");
    });

    it("should increase with time elapsed", () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 1 * 7 * 24 * 60 * 60 * 1000);
      const twentyWeeksAgo = new Date(now.getTime() - 20 * 7 * 24 * 60 * 60 * 1000);

      const recentCase = createTestCase({
        riskLevel: "Medium",
        dateOfInjury: oneWeekAgo.toISOString(),
      });
      const oldCase = createTestCase({
        riskLevel: "Medium",
        dateOfInjury: twentyWeeksAgo.toISOString(),
      });

      const recentRisk = calculateEscalationRisk(recentCase);
      const oldRisk = calculateEscalationRisk(oldCase);

      // Old case should have same or higher escalation risk
      const riskOrder = { Low: 0, Medium: 1, High: 2 };
      expect(riskOrder[oldRisk]).toBeGreaterThanOrEqual(riskOrder[recentRisk]);
    });

    it("should return valid risk level", () => {
      const testCase = createTestCase();
      const escalationRisk = calculateEscalationRisk(testCase);

      expect(["High", "Medium", "Low"]).toContain(escalationRisk);
    });
  });

  describe("edge cases", () => {
    it("should handle case with no clinical evidence", () => {
      const testCase = createTestCase();
      delete testCase.clinicalEvidence;

      const prediction = calculatePrediction(testCase);
      expect(prediction).toBeDefined();
      expect(prediction.rtwProbability).toBeGreaterThanOrEqual(0);
    });

    it("should handle very recent injury (0 weeks)", () => {
      const testCase = createTestCase({ dateOfInjury: new Date().toISOString() });

      const prediction = calculatePrediction(testCase);
      expect(prediction.weeksElapsed).toBe(0);
    });

    it("should handle very old injury (years ago)", () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const testCase = createTestCase({ dateOfInjury: threeYearsAgo.toISOString() });

      const prediction = calculatePrediction(testCase);
      expect(prediction.weeksElapsed).toBeGreaterThan(100);
      expect(prediction.expectedWeeksRemaining).toBeGreaterThanOrEqual(0);
    });
  });
});
