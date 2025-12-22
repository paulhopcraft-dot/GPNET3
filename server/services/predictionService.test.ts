/**
 * Tests for Prediction Service (XGBoost-style prediction layer)
 */

import { describe, it, expect } from "vitest";
import {
  predictCase,
  predictCases,
  summarizePredictions,
  type CasePrediction,
} from "./predictionService";
import type { WorkerCase } from "@shared/schema";

// Helper to create test cases with defaults
function createTestCase(overrides: Partial<WorkerCase> = {}): WorkerCase {
  return {
    id: "test-case-1",
    organizationId: "org-1",
    workerName: "Test Worker",
    company: "Test Company",
    dateOfInjury: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    riskLevel: "Medium",
    workStatus: "Off work",
    hasCertificate: true,
    certificateUrl: null,
    complianceIndicator: "Compliant",
    complianceJson: null,
    clinicalStatusJson: null,
    currentStatus: "Active",
    nextStep: "Review case",
    owner: "Case Manager",
    dueDate: "2025-01-01",
    summary: "Test case summary",
    ticketIds: [],
    ticketCount: "1",
    aiSummary: null,
    aiSummaryGeneratedAt: null,
    aiSummaryModel: null,
    aiWorkStatusClassification: null,
    ticketLastUpdatedAt: null,
    clcLastFollowUp: null,
    clcNextFollowUp: null,
    employmentStatus: "ACTIVE",
    terminationProcessId: null,
    terminationReason: null,
    terminationAuditFlag: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as WorkerCase;
}

describe("Prediction Service", () => {
  describe("predictCase", () => {
    it("returns a valid prediction structure", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(prediction).toHaveProperty("caseId", "test-case-1");
      expect(prediction).toHaveProperty("workerName", "Test Worker");
      expect(prediction).toHaveProperty("company", "Test Company");
      expect(prediction).toHaveProperty("rtwProbability");
      expect(prediction).toHaveProperty("expectedWeeksToRtw");
      expect(prediction).toHaveProperty("escalationRisk");
      expect(prediction).toHaveProperty("costRisk");
      expect(prediction).toHaveProperty("deteriorationRisk");
      expect(prediction).toHaveProperty("confidence");
      expect(prediction).toHaveProperty("factors");
      expect(prediction).toHaveProperty("modelVersion");
      expect(prediction).toHaveProperty("generatedAt");
    });

    it("returns RTW probability between 0 and 100", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(prediction.rtwProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.rtwProbability).toBeLessThanOrEqual(100);
    });

    it("returns non-negative weeks to RTW", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(prediction.expectedWeeksToRtw).toBeGreaterThanOrEqual(0);
    });

    it("returns valid risk classifications", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(["low", "medium", "high"]).toContain(prediction.escalationRisk);
      expect(["low", "medium", "high"]).toContain(prediction.costRisk);
      expect(["low", "medium", "high"]).toContain(prediction.deteriorationRisk);
    });

    it("returns confidence between 50 and 95", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(prediction.confidence).toBeGreaterThanOrEqual(50);
      expect(prediction.confidence).toBeLessThanOrEqual(95);
    });

    it("includes explanation factors", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(Array.isArray(prediction.factors)).toBe(true);
      expect(prediction.factors.length).toBeGreaterThan(0);

      const factor = prediction.factors[0];
      expect(factor).toHaveProperty("feature");
      expect(factor).toHaveProperty("value");
      expect(factor).toHaveProperty("impact");
      expect(factor).toHaveProperty("weight");
      expect(factor).toHaveProperty("description");
    });
  });

  describe("Work status impact", () => {
    it("gives higher RTW probability for 'At work' status", () => {
      const atWorkCase = createTestCase({ workStatus: "At work" });
      const offWorkCase = createTestCase({ workStatus: "Off work" });

      const atWorkPrediction = predictCase(atWorkCase);
      const offWorkPrediction = predictCase(offWorkCase);

      expect(atWorkPrediction.rtwProbability).toBeGreaterThan(
        offWorkPrediction.rtwProbability
      );
    });

    it("returns 0 weeks to RTW for 'At work' status", () => {
      const atWorkCase = createTestCase({ workStatus: "At work" });
      const prediction = predictCase(atWorkCase);

      expect(prediction.expectedWeeksToRtw).toBe(0);
    });

    it("gives higher RTW probability for 'Modified duties' than 'Off work'", () => {
      const modifiedCase = createTestCase({ workStatus: "Modified duties" });
      const offWorkCase = createTestCase({ workStatus: "Off work" });

      const modifiedPrediction = predictCase(modifiedCase);
      const offWorkPrediction = predictCase(offWorkCase);

      expect(modifiedPrediction.rtwProbability).toBeGreaterThan(
        offWorkPrediction.rtwProbability
      );
    });
  });

  describe("Risk level impact", () => {
    it("gives higher RTW probability for low risk cases", () => {
      const lowRiskCase = createTestCase({ riskLevel: "Low" });
      const highRiskCase = createTestCase({ riskLevel: "High" });

      const lowRiskPrediction = predictCase(lowRiskCase);
      const highRiskPrediction = predictCase(highRiskCase);

      expect(lowRiskPrediction.rtwProbability).toBeGreaterThan(
        highRiskPrediction.rtwProbability
      );
    });

    it("gives shorter weeks to RTW for low risk cases", () => {
      const lowRiskCase = createTestCase({ riskLevel: "Low", workStatus: "Off work" });
      const highRiskCase = createTestCase({ riskLevel: "High", workStatus: "Off work" });

      const lowRiskPrediction = predictCase(lowRiskCase);
      const highRiskPrediction = predictCase(highRiskCase);

      expect(lowRiskPrediction.expectedWeeksToRtw).toBeLessThan(
        highRiskPrediction.expectedWeeksToRtw
      );
    });

    it("gives higher escalation risk for high risk cases", () => {
      const highRiskCase = createTestCase({
        riskLevel: "High",
        dateOfInjury: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(), // 10 weeks ago
      });

      const prediction = predictCase(highRiskCase);
      expect(prediction.escalationRisk).toBe("high");
    });
  });

  describe("Compliance impact", () => {
    it("gives higher RTW probability for compliant cases", () => {
      const compliantCase = createTestCase({ complianceIndicator: "Compliant" });
      const nonCompliantCase = createTestCase({ complianceIndicator: "Non-compliant" });

      const compliantPrediction = predictCase(compliantCase);
      const nonCompliantPrediction = predictCase(nonCompliantCase);

      expect(compliantPrediction.rtwProbability).toBeGreaterThan(
        nonCompliantPrediction.rtwProbability
      );
    });

    it("gives high deterioration risk for non-compliant cases", () => {
      const nonCompliantCase = createTestCase({
        complianceIndicator: "Non-compliant",
      });

      const prediction = predictCase(nonCompliantCase);
      expect(prediction.deteriorationRisk).toBe("high");
    });
  });

  describe("Certificate impact", () => {
    it("gives higher RTW probability for cases with certificates", () => {
      const withCertCase = createTestCase({ hasCertificate: true });
      const noCertCase = createTestCase({ hasCertificate: false });

      const withCertPrediction = predictCase(withCertCase);
      const noCertPrediction = predictCase(noCertCase);

      expect(withCertPrediction.rtwProbability).toBeGreaterThan(
        noCertPrediction.rtwProbability
      );
    });
  });

  describe("Time decay impact", () => {
    it("gives lower RTW probability for older cases", () => {
      const recentCase = createTestCase({
        dateOfInjury: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
      });
      const oldCase = createTestCase({
        dateOfInjury: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 17 weeks
      });

      const recentPrediction = predictCase(recentCase);
      const oldPrediction = predictCase(oldCase);

      expect(recentPrediction.rtwProbability).toBeGreaterThan(
        oldPrediction.rtwProbability
      );
    });

    it("adds weeks elapsed factor for extended duration cases", () => {
      const oldCase = createTestCase({
        dateOfInjury: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 14+ weeks
      });

      const prediction = predictCase(oldCase);
      const weeksElapsedFactor = prediction.factors.find(
        (f) => f.feature === "weeksElapsed"
      );

      expect(weeksElapsedFactor).toBeDefined();
      expect(weeksElapsedFactor?.impact).toBe("negative");
    });
  });

  describe("RTW plan status impact", () => {
    it("boosts RTW probability for in_progress RTW plan", () => {
      const inProgressCase = createTestCase({
        rtwPlanStatus: "in_progress",
      });
      const notPlannedCase = createTestCase({
        rtwPlanStatus: "not_planned",
      });

      const inProgressPrediction = predictCase(inProgressCase);
      const notPlannedPrediction = predictCase(notPlannedCase);

      expect(inProgressPrediction.rtwProbability).toBeGreaterThan(
        notPlannedPrediction.rtwProbability
      );
    });

    it("reduces RTW probability for failing RTW plan", () => {
      const failingCase = createTestCase({
        rtwPlanStatus: "failing",
      });
      const notPlannedCase = createTestCase({
        rtwPlanStatus: "not_planned",
      });

      const failingPrediction = predictCase(failingCase);
      const notPlannedPrediction = predictCase(notPlannedCase);

      expect(failingPrediction.rtwProbability).toBeLessThan(
        notPlannedPrediction.rtwProbability
      );
    });
  });

  describe("predictCases", () => {
    it("returns predictions for all cases", () => {
      const cases = [
        createTestCase({ id: "case-1" }),
        createTestCase({ id: "case-2" }),
        createTestCase({ id: "case-3" }),
      ];

      const predictions = predictCases(cases);

      expect(predictions).toHaveLength(3);
      expect(predictions.map((p) => p.caseId)).toEqual([
        "case-1",
        "case-2",
        "case-3",
      ]);
    });

    it("returns empty array for empty input", () => {
      const predictions = predictCases([]);
      expect(predictions).toHaveLength(0);
    });
  });

  describe("summarizePredictions", () => {
    it("returns correct summary for multiple predictions", () => {
      const predictions: CasePrediction[] = [
        {
          caseId: "1",
          workerName: "Worker 1",
          company: "Company",
          rtwProbability: 80,
          expectedWeeksToRtw: 2,
          escalationRisk: "low",
          costRisk: "low",
          deteriorationRisk: "low",
          confidence: 85,
          factors: [],
          modelVersion: "v1",
          generatedAt: new Date().toISOString(),
        },
        {
          caseId: "2",
          workerName: "Worker 2",
          company: "Company",
          rtwProbability: 40,
          expectedWeeksToRtw: 8,
          escalationRisk: "high",
          costRisk: "medium",
          deteriorationRisk: "medium",
          confidence: 75,
          factors: [],
          modelVersion: "v1",
          generatedAt: new Date().toISOString(),
        },
        {
          caseId: "3",
          workerName: "Worker 3",
          company: "Company",
          rtwProbability: 60,
          expectedWeeksToRtw: 4,
          escalationRisk: "low",
          costRisk: "low",
          deteriorationRisk: "low",
          confidence: 80,
          factors: [],
          modelVersion: "v1",
          generatedAt: new Date().toISOString(),
        },
      ];

      const summary = summarizePredictions(predictions);

      expect(summary.totalCases).toBe(3);
      expect(summary.avgRtwProbability).toBe(60); // (80 + 40 + 60) / 3 = 60
      expect(summary.highRtwCount).toBe(1); // Only Worker 1 >= 70
      expect(summary.lowRtwCount).toBe(1); // Only Worker 2 < 50
      expect(summary.highEscalationCount).toBe(1); // Only Worker 2
      expect(summary.avgConfidence).toBe(80); // (85 + 75 + 80) / 3 = 80
    });

    it("returns zeros for empty predictions", () => {
      const summary = summarizePredictions([]);

      expect(summary.totalCases).toBe(0);
      expect(summary.avgRtwProbability).toBe(0);
      expect(summary.highRtwCount).toBe(0);
      expect(summary.lowRtwCount).toBe(0);
      expect(summary.highEscalationCount).toBe(0);
      expect(summary.avgConfidence).toBe(0);
    });
  });

  describe("Model version", () => {
    it("includes model version in prediction", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(prediction.modelVersion).toBe("xgboost-sim-v1.0");
    });

    it("includes timestamp in prediction", () => {
      const testCase = createTestCase();
      const prediction = predictCase(testCase);

      expect(prediction.generatedAt).toBeDefined();
      expect(new Date(prediction.generatedAt).getTime()).toBeLessThanOrEqual(
        Date.now()
      );
    });
  });
});
