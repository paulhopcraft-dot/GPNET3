/**
 * Tests for Treatment Plan Generator Service (PRD-3.2.3, Spec-21)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  treatmentPlanService,
  type TreatmentPlanInput,
  type TreatmentPlan,
} from "./treatmentPlanService";
import type {
  WorkerCase,
  MedicalConstraints,
  FunctionalCapacity,
} from "../../shared/schema";

// Helper to create mock case
function createMockCase(overrides: Partial<WorkerCase> = {}): WorkerCase {
  return {
    id: "case-123",
    organizationId: "org-456",
    workerName: "John Smith",
    company: "Acme Corp",
    dateOfInjury: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
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

// Helper to create mock input
function createMockInput(overrides: Partial<TreatmentPlanInput> = {}): TreatmentPlanInput {
  return {
    caseId: "case-123",
    workerName: "John Smith",
    dateOfInjury: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe("Treatment Plan Generator Service", () => {
  describe("generatePlan", () => {
    it("generates a basic plan with minimal input", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan).toBeDefined();
      expect(plan.id).toContain("tp-case-123");
      expect(plan.caseId).toBe("case-123");
      expect(plan.workerName).toBe("John Smith");
      expect(plan.advisory).toBe(true);
    });

    it("includes all required plan sections", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.planType).toBeDefined();
      expect(plan.planSummary).toBeDefined();
      expect(plan.expectedDurationWeeks).toBeGreaterThan(0);
      expect(plan.hoursProgression).toBeDefined();
      expect(Array.isArray(plan.hoursProgression)).toBe(true);
      expect(plan.dutyModifications).toBeDefined();
      expect(plan.reviewMilestones).toBeDefined();
      expect(plan.warningSignals).toBeDefined();
      expect(plan.safetyConsiderations).toBeDefined();
      expect(plan.regulatoryNotes).toBeDefined();
    });

    it("always sets advisory flag to true per PRD-9", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.advisory).toBe(true);
    });

    it("calculates confidence score", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(plan.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe("Plan Type Determination", () => {
    it("returns full_capacity for fit worker with no restrictions", () => {
      const input = createMockInput({
        currentCapacity: "fit",
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.planType).toBe("full_capacity");
    });

    it("returns unfit_for_work when capacity is unfit", () => {
      const input = createMockInput({
        currentCapacity: "unfit",
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.planType).toBe("unfit_for_work");
    });

    it("returns graduated_rtw for partial capacity", () => {
      const input = createMockInput({
        currentCapacity: "partial",
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.planType).toBe("graduated_rtw");
    });

    it("returns graduated_rtw when hours are limited", () => {
      const input = createMockInput({
        functionalCapacity: {
          maxWorkHoursPerDay: 4,
          maxWorkDaysPerWeek: 3,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.planType).toBe("graduated_rtw");
    });
  });

  describe("Hours Progression", () => {
    it("generates 4 phases for graduated RTW", () => {
      const input = createMockInput({
        currentCapacity: "partial",
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.hoursProgression.length).toBe(4);
      expect(plan.hoursProgression[0].phase).toBe("initial");
      expect(plan.hoursProgression[3].phase).toBe("full_duties");
    });

    it("includes progressive weekly hours", () => {
      const input = createMockInput({
        currentCapacity: "partial",
      });
      const plan = treatmentPlanService.generatePlan(input);

      // Hours should increase through phases
      const hours = plan.hoursProgression.map((p) => p.totalWeeklyHours);
      for (let i = 1; i < hours.length; i++) {
        expect(hours[i]).toBeGreaterThanOrEqual(hours[i - 1]);
      }
    });

    it("respects functional capacity limits", () => {
      const input = createMockInput({
        currentCapacity: "partial",
        functionalCapacity: {
          maxWorkHoursPerDay: 6,
          maxWorkDaysPerWeek: 4,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      // Final phase should not exceed capacity limits
      const finalPhase = plan.hoursProgression.find((p) => p.phase === "full_duties");
      expect(finalPhase?.hoursPerDay).toBeLessThanOrEqual(6);
      expect(finalPhase?.daysPerWeek).toBeLessThanOrEqual(4);
    });

    it("returns single phase for full capacity", () => {
      const input = createMockInput({
        currentCapacity: "fit",
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.hoursProgression.length).toBe(1);
      expect(plan.hoursProgression[0].phase).toBe("full_duties");
      expect(plan.hoursProgression[0].totalWeeklyHours).toBe(40);
    });

    it("returns zero hours for unfit worker", () => {
      const input = createMockInput({
        currentCapacity: "unfit",
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.hoursProgression[0].totalWeeklyHours).toBe(0);
    });
  });

  describe("Duty Modifications", () => {
    it("generates lifting restriction modifications", () => {
      const input = createMockInput({
        medicalConstraints: {
          noLiftingOverKg: 5,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      const liftingMod = plan.dutyModifications.find((m) =>
        m.restriction.toLowerCase().includes("lifting")
      );
      expect(liftingMod).toBeDefined();
      expect(liftingMod?.category).toBe("physical");
    });

    it("generates bending restriction modifications", () => {
      const input = createMockInput({
        medicalConstraints: {
          noBending: true,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      const bendingMod = plan.dutyModifications.find((m) =>
        m.restriction.toLowerCase().includes("bending")
      );
      expect(bendingMod).toBeDefined();
    });

    it("generates schedule modifications for limited hours", () => {
      const input = createMockInput({
        currentCapacity: "partial",
        functionalCapacity: {
          maxWorkHoursPerDay: 4,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      const scheduleMod = plan.dutyModifications.find((m) => m.category === "schedule");
      expect(scheduleMod).toBeDefined();
      expect(scheduleMod?.restriction).toContain("4 hours");
    });

    it("includes no driving modification when restricted", () => {
      const input = createMockInput({
        medicalConstraints: {
          noDriving: true,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      const drivingMod = plan.dutyModifications.find((m) =>
        m.restriction.toLowerCase().includes("driving")
      );
      expect(drivingMod).toBeDefined();
      expect(drivingMod?.category).toBe("environmental");
    });
  });

  describe("Task Examples", () => {
    it("generates suitable and unsuitable task examples", () => {
      const input = createMockInput({
        medicalConstraints: {
          noLiftingOverKg: 5,
          suitableForLightDuties: true,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.suitableTaskExamples.length).toBeGreaterThan(0);
      expect(plan.unsuiableTaskExamples.length).toBeGreaterThan(0);
    });

    it("includes admin tasks as suitable by default", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(
        plan.suitableTaskExamples.some((t) => t.toLowerCase().includes("administrative"))
      ).toBe(true);
    });

    it("excludes heavy lifting when restricted", () => {
      const input = createMockInput({
        medicalConstraints: {
          noLiftingOverKg: 5,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(
        plan.unsuiableTaskExamples.some((t) => t.toLowerCase().includes("handling"))
      ).toBe(true);
    });
  });

  describe("Review Milestones", () => {
    it("generates review milestones", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.reviewMilestones.length).toBeGreaterThan(0);
    });

    it("includes certificate renewal milestone when date provided", () => {
      const certEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const input = createMockInput({
        certificateEndDate: certEndDate,
      });
      const plan = treatmentPlanService.generatePlan(input);

      const certMilestone = plan.reviewMilestones.find(
        (m) => m.type === "certificate_renewal"
      );
      expect(certMilestone).toBeDefined();
    });

    it("includes medical review milestones", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      const medicalReviews = plan.reviewMilestones.filter(
        (m) => m.type === "medical_review"
      );
      expect(medicalReviews.length).toBeGreaterThan(0);
    });

    it("includes RTW progress reviews", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      const rtwReviews = plan.reviewMilestones.filter((m) => m.type === "rtw_review");
      expect(rtwReviews.length).toBeGreaterThan(0);
    });

    it("sets next review date", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.nextReviewDate).toBeDefined();
      expect(new Date(plan.nextReviewDate).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("Warning Signals", () => {
    it("includes standard warning signals", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.warningSignals.length).toBeGreaterThan(0);

      const painSignal = plan.warningSignals.find((s) =>
        s.signal.toLowerCase().includes("pain")
      );
      expect(painSignal).toBeDefined();
    });

    it("includes lifting warning when restricted", () => {
      const input = createMockInput({
        medicalConstraints: {
          noLiftingOverKg: 5,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      const liftingSignal = plan.warningSignals.find((s) =>
        s.signal.toLowerCase().includes("lift")
      );
      expect(liftingSignal).toBeDefined();
      expect(liftingSignal?.severity).toBe("high");
    });

    it("includes progression signal for graduated RTW", () => {
      const input = createMockInput({
        currentCapacity: "partial",
      });
      const plan = treatmentPlanService.generatePlan(input);

      const progressSignal = plan.warningSignals.find((s) =>
        s.signal.toLowerCase().includes("progress")
      );
      expect(progressSignal).toBeDefined();
    });
  });

  describe("Safety Considerations", () => {
    it("includes basic safety considerations", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.safetyConsiderations.length).toBeGreaterThan(0);
      expect(
        plan.safetyConsiderations.some((s) => s.toLowerCase().includes("supervisor"))
      ).toBe(true);
    });

    it("adds lifting aid consideration when restricted", () => {
      const input = createMockInput({
        medicalConstraints: {
          noLiftingOverKg: 5,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(
        plan.safetyConsiderations.some((s) => s.toLowerCase().includes("lifting"))
      ).toBe(true);
    });

    it("adds transport consideration when driving restricted", () => {
      const input = createMockInput({
        medicalConstraints: {
          noDriving: true,
        },
      });
      const plan = treatmentPlanService.generatePlan(input);

      expect(
        plan.safetyConsiderations.some((s) => s.toLowerCase().includes("transport"))
      ).toBe(true);
    });
  });

  describe("Regulatory Compliance", () => {
    it("includes WorkSafe Victoria compliance notes", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.regulatoryNotes.length).toBeGreaterThan(0);
      expect(
        plan.regulatoryNotes.some((n) => n.toLowerCase().includes("worksafe"))
      ).toBe(true);
    });

    it("sets worksafeCompliance flag", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.worksafeCompliance).toBe(true);
    });

    it("includes employer and worker obligations", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      expect(
        plan.regulatoryNotes.some((n) => n.toLowerCase().includes("employer"))
      ).toBe(true);
      expect(
        plan.regulatoryNotes.some((n) => n.toLowerCase().includes("worker"))
      ).toBe(true);
    });
  });

  describe("generatePlanFromCase", () => {
    it("generates plan from WorkerCase object", () => {
      const workerCase = createMockCase({
        medicalConstraints: {
          noLiftingOverKg: 10,
        },
        rtwPlanStatus: "in_progress",
      });

      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      expect(plan.caseId).toBe(workerCase.id);
      expect(plan.workerName).toBe(workerCase.workerName);
    });

    it("uses case medical constraints", () => {
      const workerCase = createMockCase({
        medicalConstraints: {
          noBending: true,
          noTwisting: true,
        },
      });

      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      const bendingMod = plan.dutyModifications.find((m) =>
        m.restriction.toLowerCase().includes("bending")
      );
      expect(bendingMod).toBeDefined();
    });

    it("uses case functional capacity", () => {
      const workerCase = createMockCase({
        functionalCapacity: {
          maxWorkHoursPerDay: 5,
          maxWorkDaysPerWeek: 4,
        },
      });

      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      expect(plan.targetWeeklyHours).toBe(20); // 5 * 4
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

      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      expect(plan.planType).toBe("graduated_rtw");
    });
  });

  describe("validatePlanSafety", () => {
    it("returns safe when no constraints", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);

      const result = treatmentPlanService.validatePlanSafety(plan);

      expect(result.safe).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("identifies missing lifting modification", () => {
      const input = createMockInput();
      const plan = treatmentPlanService.generatePlan(input);
      // Clear modifications for test
      plan.dutyModifications = [];

      const constraints: MedicalConstraints = {
        noLiftingOverKg: 5,
      };

      const result = treatmentPlanService.validatePlanSafety(plan, constraints);

      expect(result.safe).toBe(false);
      expect(result.issues.some((i) => i.toLowerCase().includes("lifting"))).toBe(true);
    });
  });

  describe("Confidence Scoring", () => {
    it("increases confidence with more data", () => {
      const minimalInput = createMockInput();
      const minimalPlan = treatmentPlanService.generatePlan(minimalInput);

      const fullInput = createMockInput({
        medicalConstraints: { noLiftingOverKg: 5 },
        functionalCapacity: { maxWorkHoursPerDay: 6 },
        currentCapacity: "partial",
        certificateEndDate: new Date().toISOString(),
        specialistRecommendations: "Gradual return recommended",
      });
      const fullPlan = treatmentPlanService.generatePlan(fullInput);

      expect(fullPlan.confidenceScore).toBeGreaterThan(minimalPlan.confidenceScore);
    });

    it("caps confidence at 1.0", () => {
      const input = createMockInput({
        medicalConstraints: { noLiftingOverKg: 5 },
        functionalCapacity: { maxWorkHoursPerDay: 6 },
        currentCapacity: "partial",
        certificateEndDate: new Date().toISOString(),
        specialistRecommendations: "All recommendations",
      });

      const plan = treatmentPlanService.generatePlan(input);

      expect(plan.confidenceScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Expected Duration Calculation", () => {
    it("calculates longer duration for unfit workers", () => {
      const unfitInput = createMockInput({ currentCapacity: "unfit" });
      const partialInput = createMockInput({ currentCapacity: "partial" });

      const unfitPlan = treatmentPlanService.generatePlan(unfitInput);
      const partialPlan = treatmentPlanService.generatePlan(partialInput);

      expect(unfitPlan.expectedDurationWeeks).toBeGreaterThan(
        partialPlan.expectedDurationWeeks
      );
    });

    it("adds duration for severe constraints", () => {
      const basicInput = createMockInput({ currentCapacity: "partial" });
      const restrictedInput = createMockInput({
        currentCapacity: "partial",
        medicalConstraints: {
          noLiftingOverKg: 2,
          noBending: true,
          noTwisting: true,
        },
      });

      const basicPlan = treatmentPlanService.generatePlan(basicInput);
      const restrictedPlan = treatmentPlanService.generatePlan(restrictedInput);

      expect(restrictedPlan.expectedDurationWeeks).toBeGreaterThan(
        basicPlan.expectedDurationWeeks
      );
    });
  });
});
