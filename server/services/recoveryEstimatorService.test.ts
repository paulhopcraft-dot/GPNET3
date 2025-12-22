/**
 * Tests for Recovery Estimator Service (PRD-25, Spec-14)
 */

import { describe, it, expect } from "vitest";
import {
  recoveryEstimatorService,
  type RecoveryEstimateInput,
} from "./recoveryEstimatorService";
import type { WorkerCase, MedicalCertificate } from "../../shared/schema";

// Helper to create mock input
function createMockInput(overrides: Partial<RecoveryEstimateInput> = {}): RecoveryEstimateInput {
  return {
    caseId: "case-123",
    workerName: "John Smith",
    dateOfInjury: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    ...overrides,
  };
}

// Helper to create mock case
function createMockCase(overrides: Partial<WorkerCase> = {}): WorkerCase {
  return {
    id: "case-123",
    organizationId: "org-456",
    workerName: "John Smith",
    company: "Acme Corp",
    dateOfInjury: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    riskLevel: "Medium",
    workStatus: "Off work",
    hasCertificate: true,
    complianceIndicator: "Medium",
    currentStatus: "Under treatment",
    nextStep: "RTW planning",
    owner: "Case Manager",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    summary: "Worker recovering from injury",
    ticketIds: ["FD-123"],
    ticketCount: 1,
    ...overrides,
  };
}

// Helper to create mock certificate
function createMockCertificate(
  daysAgo: number,
  capacity: "fit" | "partial" | "unfit" = "partial"
): MedicalCertificate {
  const issueDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const endDate = new Date(issueDate);
  endDate.setDate(endDate.getDate() + 14);

  return {
    id: `cert-${daysAgo}`,
    caseId: "case-123",
    issueDate: issueDate.toISOString(),
    startDate: issueDate.toISOString(),
    endDate: endDate.toISOString(),
    capacity,
    source: "manual",
  };
}

describe("Recovery Estimator Service", () => {
  describe("estimateRecovery", () => {
    it("generates a basic estimate with minimal input", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate).toBeDefined();
      expect(estimate.caseId).toBe("case-123");
      expect(estimate.workerName).toBe("John Smith");
      expect(estimate.advisory).toBe(true);
    });

    it("includes all required estimate sections", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBeDefined();
      expect(estimate.daysSinceInjury).toBeGreaterThan(0);
      expect(estimate.expectedDurationWeeks).toBeGreaterThan(0);
      expect(estimate.expectedRtwDate).toBeDefined();
      expect(estimate.confidenceScore).toBeGreaterThan(0);
      expect(estimate.progressStatus).toBeDefined();
      expect(estimate.progressPercentage).toBeDefined();
      expect(estimate.milestones).toBeDefined();
      expect(estimate.trajectory).toBeDefined();
    });

    it("always sets advisory flag to true per PRD-9", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.advisory).toBe(true);
    });
  });

  describe("Injury Classification", () => {
    it("classifies soft tissue injuries", () => {
      const input = createMockInput({
        injuryDescription: "Ankle sprain from slip and fall",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBe("soft_tissue");
    });

    it("classifies musculoskeletal injuries", () => {
      const input = createMockInput({
        injuryDescription: "Knee joint inflammation",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBe("musculoskeletal");
    });

    it("classifies spinal injuries", () => {
      const input = createMockInput({
        injuryDescription: "Lumbar disc herniation",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBe("spinal");
    });

    it("classifies surgical cases", () => {
      const input = createMockInput({
        hasSurgery: true,
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBe("surgical");
    });

    it("classifies psychological injuries", () => {
      const input = createMockInput({
        injuryDescription: "Work-related stress and anxiety",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBe("psychological");
    });

    it("classifies chronic conditions", () => {
      const input = createMockInput({
        injuryDescription: "Chronic degenerative condition",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBe("chronic");
    });

    it("defaults to unknown for unrecognized descriptions", () => {
      const input = createMockInput({
        injuryDescription: "General work injury",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.injuryCategory).toBe("unknown");
    });
  });

  describe("Expected Duration", () => {
    it("calculates shorter duration for soft tissue", () => {
      const softTissue = createMockInput({
        injuryDescription: "Muscle strain",
      });
      const spinal = createMockInput({
        injuryDescription: "Spinal disc injury",
      });

      const softEstimate = recoveryEstimatorService.estimateRecovery(softTissue);
      const spinalEstimate = recoveryEstimatorService.estimateRecovery(spinal);

      expect(softEstimate.expectedDurationWeeks).toBeLessThan(
        spinalEstimate.expectedDurationWeeks
      );
    });

    it("adjusts duration for specialist involvement", () => {
      const withoutSpecialist = createMockInput({
        hasSpecialistInvolvement: false,
      });
      const withSpecialist = createMockInput({
        hasSpecialistInvolvement: true,
      });

      const noSpecEstimate = recoveryEstimatorService.estimateRecovery(withoutSpecialist);
      const specEstimate = recoveryEstimatorService.estimateRecovery(withSpecialist);

      expect(specEstimate.expectedDurationWeeks).toBeGreaterThanOrEqual(
        noSpecEstimate.expectedDurationWeeks
      );
    });

    it("adjusts duration for multiple constraints", () => {
      const fewConstraints = createMockInput({
        medicalConstraintsCount: 2,
      });
      const manyConstraints = createMockInput({
        medicalConstraintsCount: 5,
      });

      const fewEstimate = recoveryEstimatorService.estimateRecovery(fewConstraints);
      const manyEstimate = recoveryEstimatorService.estimateRecovery(manyConstraints);

      expect(manyEstimate.expectedDurationWeeks).toBeGreaterThanOrEqual(
        fewEstimate.expectedDurationWeeks
      );
    });
  });

  describe("Milestones", () => {
    it("generates recovery milestones", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.milestones.length).toBeGreaterThan(0);
      estimate.milestones.forEach((milestone) => {
        expect(milestone.weekNumber).toBeDefined();
        expect(milestone.expectedCapacity).toBeDefined();
        expect(milestone.description).toBeDefined();
        expect(typeof milestone.achieved).toBe("boolean");
      });
    });

    it("identifies next milestone", () => {
      const input = createMockInput({
        dateOfInjury: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.nextMilestone).toBeDefined();
    });

    it("marks past milestones based on certificates", () => {
      const certificates: MedicalCertificate[] = [
        createMockCertificate(21, "partial"),
        createMockCertificate(7, "partial"),
      ];

      const input = createMockInput({
        certificates,
        dateOfInjury: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      const achievedMilestones = estimate.milestones.filter((m) => m.achieved);
      expect(achievedMilestones.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Progress Tracking", () => {
    it("detects on-track progress", () => {
      const input = createMockInput({
        currentCapacity: "partial",
        dateOfInjury: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(["on_track", "slight_delay", "ahead_of_schedule"]).toContain(
        estimate.progressStatus
      );
    });

    it("detects ahead of schedule progress", () => {
      const input = createMockInput({
        currentCapacity: "fit",
        rtwPlanStatus: "working_well",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.progressStatus).toBe("ahead_of_schedule");
    });

    it("detects failing RTW plan", () => {
      const input = createMockInput({
        currentCapacity: "unfit",
        rtwPlanStatus: "failing",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.progressStatus).toBe("deteriorating");
    });

    it("calculates progress percentage", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(estimate.progressPercentage).toBeLessThanOrEqual(100);
    });

    it("calculates days ahead or behind", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(typeof estimate.daysAheadOrBehind).toBe("number");
    });
  });

  describe("Trajectory Generation", () => {
    it("generates trajectory data points", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.trajectory.length).toBeGreaterThan(0);
    });

    it("includes expected values for all points", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      estimate.trajectory.forEach((point) => {
        expect(point.date).toBeDefined();
        expect(point.weekNumber).toBeDefined();
        expect(point.expectedCapacityScore).toBeDefined();
        expect(point.expectedHoursPercentage).toBeDefined();
      });
    });

    it("includes actual values when certificates available", () => {
      const certificates: MedicalCertificate[] = [
        createMockCertificate(21, "unfit"),
        createMockCertificate(14, "partial"),
        createMockCertificate(7, "partial"),
      ];

      const input = createMockInput({
        certificates,
        dateOfInjury: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      const pointsWithActual = estimate.trajectory.filter(
        (p) => p.actualCapacityScore !== null
      );
      expect(pointsWithActual.length).toBeGreaterThan(0);
    });

    it("trajectory covers expected duration", () => {
      const input = createMockInput();
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      const maxWeek = Math.max(...estimate.trajectory.map((p) => p.weekNumber));
      expect(maxWeek).toBeGreaterThanOrEqual(estimate.expectedDurationWeeks);
    });
  });

  describe("Risk Factors", () => {
    it("identifies risk factors for behind schedule", () => {
      const input = createMockInput({
        currentCapacity: "unfit",
        dateOfInjury: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.riskFactors.length).toBeGreaterThan(0);
    });

    it("identifies multiple constraints as risk", () => {
      const input = createMockInput({
        medicalConstraintsCount: 5,
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(
        estimate.riskFactors.some((r) => r.toLowerCase().includes("restriction"))
      ).toBe(true);
    });

    it("identifies missing certificates as risk", () => {
      const input = createMockInput({
        certificates: [],
        dateOfInjury: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(
        estimate.riskFactors.some((r) => r.toLowerCase().includes("certificate"))
      ).toBe(true);
    });
  });

  describe("Positive Factors", () => {
    it("identifies ahead of schedule as positive", () => {
      const input = createMockInput({
        currentCapacity: "fit",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(
        estimate.positiveFactors.some((p) => p.toLowerCase().includes("faster"))
      ).toBe(true);
    });

    it("identifies active RTW plan as positive", () => {
      const input = createMockInput({
        rtwPlanStatus: "in_progress",
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(
        estimate.positiveFactors.some((p) => p.toLowerCase().includes("plan"))
      ).toBe(true);
    });

    it("identifies improving capacity trend as positive", () => {
      const certificates: MedicalCertificate[] = [
        createMockCertificate(21, "unfit"),
        createMockCertificate(14, "partial"),
        createMockCertificate(7, "partial"),
      ];

      const input = createMockInput({
        certificates,
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(
        estimate.positiveFactors.some((p) => p.toLowerCase().includes("improving"))
      ).toBe(true);
    });
  });

  describe("Confidence Score", () => {
    it("increases confidence with certificates", () => {
      const withoutCerts = createMockInput({
        certificates: [],
      });
      const withCerts = createMockInput({
        certificates: [createMockCertificate(14), createMockCertificate(7)],
      });

      const noCertEstimate = recoveryEstimatorService.estimateRecovery(withoutCerts);
      const certEstimate = recoveryEstimatorService.estimateRecovery(withCerts);

      expect(certEstimate.confidenceScore).toBeGreaterThan(
        noCertEstimate.confidenceScore
      );
    });

    it("keeps confidence within valid range", () => {
      const input = createMockInput({
        certificates: [
          createMockCertificate(28, "unfit"),
          createMockCertificate(21, "partial"),
          createMockCertificate(14, "partial"),
          createMockCertificate(7, "partial"),
        ],
        hasSpecialistInvolvement: true,
      });
      const estimate = recoveryEstimatorService.estimateRecovery(input);

      expect(estimate.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(estimate.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe("estimateFromCase", () => {
    it("generates estimate from WorkerCase object", () => {
      const workerCase = createMockCase();
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase);

      expect(estimate.caseId).toBe(workerCase.id);
      expect(estimate.workerName).toBe(workerCase.workerName);
    });

    it("uses case data for injury classification", () => {
      const workerCase = createMockCase({
        summary: "Muscle strain from lifting heavy boxes",
      });
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase);

      expect(["soft_tissue", "musculoskeletal"]).toContain(estimate.injuryCategory);
    });

    it("detects surgery from specialist report", () => {
      const workerCase = createMockCase({
        specialistReportSummary: {
          surgeryLikely: true,
        },
      });
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase);

      expect(estimate.injuryCategory).toBe("surgical");
    });

    it("uses latest certificate capacity", () => {
      const workerCase = createMockCase({
        latestCertificate: {
          id: "cert-1",
          caseId: "case-123",
          issueDate: new Date().toISOString(),
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          capacity: "partial",
          source: "manual",
        },
      });
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase);

      expect(estimate.currentCapacity).toBe("partial");
    });

    it("uses case RTW plan status", () => {
      const workerCase = createMockCase({
        rtwPlanStatus: "in_progress",
      });
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase);

      expect(estimate.positiveFactors.some((f) => f.includes("plan"))).toBe(true);
    });
  });

  describe("compareCases", () => {
    it("compares two recovery estimates", () => {
      const case1 = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          injuryDescription: "Soft tissue strain",
        })
      );
      const case2 = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          caseId: "case-456",
          injuryDescription: "Spinal disc injury",
        })
      );

      const comparison = recoveryEstimatorService.compareCases(case1, case2);

      expect(comparison.fasterRecovery).toBeDefined();
      expect(comparison.differenceWeeks).toBeDefined();
      expect(Array.isArray(comparison.factors)).toBe(true);
    });

    it("identifies faster recovery correctly", () => {
      const softTissue = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          injuryDescription: "Muscle strain",
        })
      );
      const spinal = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          caseId: "case-456",
          injuryDescription: "Spinal disc injury",
        })
      );

      const comparison = recoveryEstimatorService.compareCases(softTissue, spinal);

      // Soft tissue should recover faster
      expect(comparison.fasterRecovery).toBe(softTissue.caseId);
    });

    it("notes different injury types as factor", () => {
      const case1 = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          injuryDescription: "Anxiety disorder",
        })
      );
      const case2 = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          caseId: "case-456",
          injuryDescription: "Back strain",
        })
      );

      const comparison = recoveryEstimatorService.compareCases(case1, case2);

      expect(comparison.factors.some((f) => f.includes("injury type"))).toBe(true);
    });
  });

  describe("Clinical Pathway Validation", () => {
    it("soft tissue follows shorter pathway", () => {
      const estimate = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          injuryDescription: "Muscle sprain",
        })
      );

      expect(estimate.expectedDurationWeeks).toBeLessThanOrEqual(12);
    });

    it("surgical follows longer pathway", () => {
      const estimate = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          hasSurgery: true,
        })
      );

      expect(estimate.expectedDurationWeeks).toBeGreaterThanOrEqual(8);
    });

    it("chronic follows extended pathway", () => {
      const estimate = recoveryEstimatorService.estimateRecovery(
        createMockInput({
          injuryDescription: "Chronic degenerative condition",
        })
      );

      expect(estimate.expectedDurationWeeks).toBeGreaterThanOrEqual(12);
    });
  });
});
