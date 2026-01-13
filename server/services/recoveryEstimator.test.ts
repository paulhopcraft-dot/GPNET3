import { describe, it, expect } from "vitest";
import {
  calculateRecoveryTimeline,
  extractInjuryType,
  generateRecoveryTimelineChartData,
  type TimelineEstimate,
  type InjuryContext,
} from "./recoveryEstimator";
import type { RiskLevel, ClinicalEvidenceFlag, MedicalCertificate } from "../../shared/schema";

describe("Recovery Timeline Estimator", () => {
  describe("extractInjuryType", () => {
    it("should extract fracture injuries from summary", () => {
      const result = extractInjuryType(
        "Worker sustained a fracture to the left wrist on 2024-01-15"
      );
      expect(result).toBe("fracture_upper_limb");
    });

    it("should extract back strain from summary", () => {
      const result = extractInjuryType(
        "Lower back strain from lifting heavy boxes"
      );
      expect(result).toBe("back_strain");
    });

    it("should extract soft tissue sprains", () => {
      const result = extractInjuryType("Muscle strain in shoulder from lifting");
      expect(result).toBe("soft_tissue_sprain");
    });

    it("should extract ankle sprain as specific injury type", () => {
      const result = extractInjuryType("Ankle sprain during work");
      expect(result).toBe("ankle_sprain");
    });

    it("should extract trigger finger", () => {
      const result = extractInjuryType("Trigger finger from repetitive gripping");
      expect(result).toBe("trigger_finger");
    });

    it("should extract psychological injuries", () => {
      const result = extractInjuryType(
        "Work-related stress and anxiety disorder"
      );
      expect(result).toBe("psychological_stress");
    });

    it("should default to unknown for unrecognized injuries", () => {
      const result = extractInjuryType("Some unusual medical condition");
      expect(result).toBe("unknown");
    });

    it("should handle empty or null summaries", () => {
      expect(extractInjuryType("")).toBe("unknown");
      expect(extractInjuryType(null as any)).toBe("unknown");
    });
  });

  describe("calculateRecoveryTimeline", () => {
    const baseContext: InjuryContext = {
      dateOfInjury: "2024-01-01T00:00:00.000Z",
      summary: "Worker sustained a soft tissue sprain",
      riskLevel: "Low",
      clinicalFlags: [],
    };

    it("should return estimated status for valid injury data", () => {
      const result = calculateRecoveryTimeline(baseContext);
      expect(result.status).toBe("estimated");
      expect(result.estimatedWeeks).toBeGreaterThan(0);
      expect(result.estimatedCompletionDate).toBeDefined();
    });

    it("should return baseline of 6 weeks for soft tissue sprain", () => {
      const result = calculateRecoveryTimeline(baseContext);
      expect(result.estimatedWeeks).toBe(6);
      expect(result.baselineWeeks).toBe(6);
    });

    it("should return baseline of 8 weeks for upper limb fracture", () => {
      const context: InjuryContext = {
        ...baseContext,
        summary: "Fractured wrist requiring cast",
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.estimatedWeeks).toBe(8);
      expect(result.baselineWeeks).toBe(8);
    });

    it("should return baseline of 12 weeks for lower limb fracture", () => {
      const context: InjuryContext = {
        ...baseContext,
        summary: "Fractured ankle",
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.estimatedWeeks).toBe(12);
      expect(result.baselineWeeks).toBe(12);
    });

    it("should add 2 weeks for medium risk cases", () => {
      const context: InjuryContext = {
        ...baseContext,
        riskLevel: "Medium",
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.estimatedWeeks).toBe(8); // 6 baseline + 2 for medium risk
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          factor: "Medium risk level",
          impact: "increases",
        })
      );
    });

    it("should add 4 weeks for high risk cases", () => {
      const context: InjuryContext = {
        ...baseContext,
        riskLevel: "High",
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.estimatedWeeks).toBe(10); // 6 baseline + 4 for high risk
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          factor: "High risk level",
          impact: "increases",
        })
      );
    });

    it("should add weeks for high-risk clinical flags", () => {
      const flags: ClinicalEvidenceFlag[] = [
        {
          code: "NOT_IMPROVING_AGAINST_EXPECTED_TIMELINE",
          severity: "high_risk",
          message: "Not improving as expected",
        },
        {
          code: "RTW_PLAN_FAILING",
          severity: "high_risk",
          message: "RTW plan is failing",
        },
      ];
      const context: InjuryContext = {
        ...baseContext,
        clinicalFlags: flags,
      };
      const result = calculateRecoveryTimeline(context);
      // 6 baseline + 2 weeks per high-risk flag = 10 weeks
      expect(result.estimatedWeeks).toBe(10);
      expect(result.factors.length).toBeGreaterThan(1);
    });

    it("should include explainability factors", () => {
      const result = calculateRecoveryTimeline(baseContext);
      expect(result.factors).toBeDefined();
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.factors[0]).toHaveProperty("factor");
      expect(result.factors[0]).toHaveProperty("impact");
      expect(result.factors[0]).toHaveProperty("description");
    });

    it("should calculate correct completion date", () => {
      const result = calculateRecoveryTimeline(baseContext);
      const injuryDate = new Date(baseContext.dateOfInjury);
      const expectedDate = new Date(injuryDate);
      expectedDate.setDate(expectedDate.getDate() + result.estimatedWeeks! * 7);

      expect(result.estimatedCompletionDate).toBeDefined();
      const actualDate = new Date(result.estimatedCompletionDate!);
      expect(actualDate.getTime()).toBeCloseTo(expectedDate.getTime(), -4); // Within 10 seconds
    });

    it("should set confidence to high for low risk with no flags", () => {
      const result = calculateRecoveryTimeline(baseContext);
      expect(result.confidence).toBe("high");
    });

    it("should set confidence to medium for medium risk", () => {
      const context: InjuryContext = {
        ...baseContext,
        riskLevel: "Medium",
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.confidence).toBe("medium");
    });

    it("should set confidence to low for high risk with flags", () => {
      const flags: ClinicalEvidenceFlag[] = [
        {
          code: "NOT_IMPROVING_AGAINST_EXPECTED_TIMELINE",
          severity: "high_risk",
          message: "Not improving",
        },
      ];
      const context: InjuryContext = {
        ...baseContext,
        riskLevel: "High",
        clinicalFlags: flags,
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.confidence).toBe("low");
    });

    it("should return pending status when injury summary is missing", () => {
      const context: InjuryContext = {
        ...baseContext,
        summary: "",
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.status).toBe("pending_medical_assessment");
      expect(result.estimatedWeeks).toBeNull();
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          factor: "Awaiting medical assessment",
        })
      );
    });

    it("should cap maximum estimate at 52 weeks", () => {
      const flags: ClinicalEvidenceFlag[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          code: "NOT_IMPROVING_AGAINST_EXPECTED_TIMELINE" as const,
          severity: "high_risk" as const,
          message: `Flag ${i}`,
        }));
      const context: InjuryContext = {
        ...baseContext,
        summary: "Complex psychological injury with multiple comorbidities",
        riskLevel: "High",
        clinicalFlags: flags,
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.estimatedWeeks).toBeLessThanOrEqual(52);
    });

    it("should enforce minimum estimate of 1 week", () => {
      const context: InjuryContext = {
        ...baseContext,
        summary: "Very minor soft tissue injury",
        riskLevel: "Low",
        clinicalFlags: [],
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.estimatedWeeks).toBeGreaterThanOrEqual(1);
    });

    it("should use conservative default for unknown injury types", () => {
      const context: InjuryContext = {
        ...baseContext,
        summary: "Some rare medical condition",
      };
      const result = calculateRecoveryTimeline(context);
      expect(result.estimatedWeeks).toBe(12); // Conservative default
      expect(result.confidence).toBe("low");
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          factor: "Unknown injury type",
        })
      );
    });
  });

  describe("generateRecoveryTimelineChartData", () => {
    const injuryDate = "2024-01-01T00:00:00.000Z";

    it("should generate chart data with estimated curve", () => {
      const result = generateRecoveryTimelineChartData(
        "case-123",
        "John Doe",
        injuryDate,
        "Soft tissue strain in shoulder",
        "Low",
        [],
        []
      );

      expect(result.caseId).toBe("case-123");
      expect(result.workerName).toBe("John Doe");
      expect(result.estimatedCurve).toBeDefined();
      expect(result.estimatedCurve.length).toBeGreaterThan(0);
      // Estimated curve should have data points for each week
      expect(result.estimatedCurve[0].week).toBe(0);
      expect(result.estimatedCurve[0].estimatedCapacity).toBeDefined();
    });

    it("should return empty actual curve when no certificates", () => {
      const result = generateRecoveryTimelineChartData(
        "case-123",
        "John Doe",
        injuryDate,
        "Soft tissue strain",
        "Low",
        [],
        []
      );

      expect(result.actualCurve).toEqual([]);
      expect(result.certificateMarkers).toEqual([]);
      expect(result.analysis.comparedToExpected).toBe("insufficient_data");
    });

    it("should generate actual curve with continuous data from certificates", () => {
      const certificates: MedicalCertificate[] = [
        {
          id: "cert-1",
          caseId: "case-123",
          issueDate: "2024-01-15T00:00:00.000Z",
          startDate: "2024-01-15T00:00:00.000Z",
          endDate: "2024-01-22T00:00:00.000Z",
          capacity: "unfit",
          source: "freshdesk",
        },
        {
          id: "cert-2",
          caseId: "case-123",
          issueDate: "2024-01-22T00:00:00.000Z",
          startDate: "2024-01-22T00:00:00.000Z",
          endDate: "2024-01-29T00:00:00.000Z",
          capacity: "partial",
          source: "freshdesk",
        },
      ];

      const result = generateRecoveryTimelineChartData(
        "case-123",
        "John Doe",
        injuryDate,
        "Soft tissue strain",
        "Low",
        [],
        certificates
      );

      // Should have actual curve data
      expect(result.actualCurve.length).toBeGreaterThan(0);

      // Should have continuous data from first cert to current week
      // Certificates are at weeks 2 and 3 approximately
      const actualWeeks = result.actualCurve.map(p => p.week);
      expect(actualWeeks.length).toBeGreaterThanOrEqual(2);

      // Each point should have actualCapacity defined
      result.actualCurve.forEach(point => {
        expect(point.actualCapacity).toBeDefined();
        expect(point.actualCapacity).not.toBeNull();
      });

      // Should have certificate markers
      expect(result.certificateMarkers.length).toBe(2);
      expect(result.certificateMarkers[0].capacity).toBe(0); // unfit = 0%
      expect(result.certificateMarkers[1].capacity).toBe(50); // partial = 50%
    });

    it("should carry forward capacity between certificate dates", () => {
      // Two certificates with gap between them
      const certificates: MedicalCertificate[] = [
        {
          id: "cert-1",
          caseId: "case-123",
          issueDate: "2024-01-15T00:00:00.000Z",
          startDate: "2024-01-15T00:00:00.000Z",
          endDate: "2024-01-22T00:00:00.000Z",
          capacity: "partial", // 50%
          source: "freshdesk",
        },
        {
          id: "cert-2",
          caseId: "case-123",
          issueDate: "2024-02-12T00:00:00.000Z",
          startDate: "2024-02-12T00:00:00.000Z",
          endDate: "2024-02-19T00:00:00.000Z",
          capacity: "fit", // 100%
          source: "freshdesk",
        },
      ];

      const result = generateRecoveryTimelineChartData(
        "case-123",
        "John Doe",
        injuryDate,
        "Soft tissue strain",
        "Low",
        [],
        certificates
      );

      // Should have points for every week from first cert to last/current
      expect(result.actualCurve.length).toBeGreaterThan(2);

      // Find week 3 (between cert 1 at week 2 and cert 2 at week 6)
      const week3Point = result.actualCurve.find(p => p.week === 3);
      if (week3Point) {
        // Should carry forward the 50% from first certificate
        expect(week3Point.actualCapacity).toBe(50);
      }
    });

    it("should include analysis comparing actual to expected recovery", () => {
      const certificates: MedicalCertificate[] = [
        {
          id: "cert-1",
          caseId: "case-123",
          issueDate: "2024-01-15T00:00:00.000Z",
          startDate: "2024-01-15T00:00:00.000Z",
          endDate: "2024-01-22T00:00:00.000Z",
          capacity: "fit", // 100% - ahead of expected
          source: "freshdesk",
        },
      ];

      const result = generateRecoveryTimelineChartData(
        "case-123",
        "John Doe",
        injuryDate,
        "Soft tissue strain",
        "Low",
        [],
        certificates
      );

      expect(result.analysis).toBeDefined();
      expect(result.analysis.message).toBeDefined();
      // With 100% capacity early on, should be ahead
      expect(["ahead", "on_track"]).toContain(result.analysis.comparedToExpected);
    });
  });
});
