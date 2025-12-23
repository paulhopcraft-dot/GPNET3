import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IStorage } from "../storage";
import type { WorkerCase, TreatmentPlan, InsertNotification } from "@shared/schema";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  }));
  return { default: MockAnthropic };
});

// Mock audit logger
vi.mock("./auditLogger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock dependencies
vi.mock("./smartSummary", () => ({
  fetchCaseContext: vi.fn().mockResolvedValue({
    workerCase: {},
    timeline: [],
    certificates: [],
    actions: [],
    compliance: { status: "compliant", message: "Test" },
  }),
}));

vi.mock("./recoveryEstimator", () => ({
  calculateRecoveryTimeline: vi.fn().mockReturnValue({
    estimatedWeeks: 8,
    confidence: "medium",
    factors: [],
  }),
}));

vi.mock("./clinicalEvidence", () => ({
  evaluateClinicalEvidence: vi.fn().mockReturnValue({
    flags: [],
    hasCurrentTreatmentPlan: false,
  }),
}));

// Import service functions (will be implemented)
import {
  generateTreatmentPlan,
  getTreatmentPlan,
  updateTreatmentPlan,
} from "./treatmentPlanService";

// Mock storage
function createMockStorage(): IStorage {
  const cases: WorkerCase[] = [];

  return {
    getGPNet2CaseById: vi.fn(async (id: string, orgId: string) => {
      const found = cases.find((c) => c.id === id && c.organizationId === orgId);
      return found || null;
    }),
    updateClinicalStatus: vi.fn(async (caseId: string, orgId: string, status: any) => {
      const caseIndex = cases.findIndex((c) => c.id === caseId);
      if (caseIndex >= 0) {
        cases[caseIndex].clinical_status_json = status;
      }
    }),
    // Add other required stubs
  } as any;
}

describe("Treatment Plan Service", () => {
  let storage: IStorage;
  const organizationId = "org-123";
  const caseId = "case-456";

  beforeEach(() => {
    storage = createMockStorage();
    vi.clearAllMocks();
  });

  describe("generateTreatmentPlan", () => {
    it("should generate treatment plan with AI successfully", async () => {
      // Arrange: Mock case exists
      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        workerName: "John Doe",
        company: "Test Co",
        workStatus: "Off work",
        employmentStatus: "ACTIVE",
        dateOfInjury: "2024-01-01",
        riskLevel: "Medium",
        summary: "Lower back strain from lifting",
        hasCertificate: true,
        complianceIndicator: "Medium",
        currentStatus: "Active",
        nextStep: "Follow up",
        owner: "Manager",
        dueDate: "2024-02-01",
        ticketIds: [],
        ticketCount: 1,
        clinical_status_json: {},
      } as WorkerCase;

      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      // Mock AI response
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const mockClient = new Anthropic({ apiKey: "test-key" });
      vi.mocked(mockClient.messages.create).mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              interventions: [
                {
                  type: "physiotherapy",
                  description: "Core strengthening exercises",
                  frequency: "3x per week",
                  duration: "6 weeks",
                  priority: "critical",
                },
              ],
              milestones: [
                {
                  weekNumber: 2,
                  description: "Pain reduction",
                  expectedOutcome: "50% reduction in pain levels",
                },
              ],
              expectedDurationWeeks: 8,
              expectedOutcomes: ["Return to full duties", "Pain-free movement"],
              factorsConsidered: ["Injury type: back strain", "Risk level: Medium"],
            }),
          },
        ],
      } as any);

      // Act
      const result = await generateTreatmentPlan(storage, {
        caseId,
        organizationId,
        additionalContext: "",
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe("active");
      expect(result.interventions).toHaveLength(1);
      expect(result.interventions[0].type).toBe("physiotherapy");
      expect(result.milestones).toHaveLength(1);
      expect(result.expectedDurationWeeks).toBe(8);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.disclaimerText).toContain("ADVISORY ONLY");
      expect(storage.updateClinicalStatus).toHaveBeenCalled();
    });

    it("should return error when case not found", async () => {
      // Arrange
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        generateTreatmentPlan(storage, {
          caseId: "nonexistent",
          organizationId,
          additionalContext: "",
        })
      ).rejects.toThrow("Case not found");
    });

    it("should handle AI timeout gracefully", async () => {
      // Arrange
      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        summary: "Test injury",
        clinical_status_json: {},
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const mockClient = new Anthropic({ apiKey: "test-key" });
      vi.mocked(mockClient.messages.create).mockRejectedValue(new Error("Timeout"));

      // Act & Assert
      await expect(
        generateTreatmentPlan(storage, { caseId, organizationId, additionalContext: "" })
      ).rejects.toThrow();
    });

    it("should parse malformed AI JSON and return fallback plan", async () => {
      // Arrange
      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        summary: "Test injury",
        riskLevel: "Low",
        clinical_status_json: {},
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const mockClient = new Anthropic({ apiKey: "test-key" });
      vi.mocked(mockClient.messages.create).mockResolvedValue({
        content: [{ type: "text", text: "INVALID JSON {{{" }],
      } as any);

      // Act
      const result = await generateTreatmentPlan(storage, {
        caseId,
        organizationId,
        additionalContext: "",
      });

      // Assert: Should return fallback plan
      expect(result).toBeDefined();
      expect(result.interventions).toBeDefined();
      expect(result.confidence).toBeLessThan(50); // Low confidence for fallback
      expect(result.disclaimerText).toContain("ADVISORY ONLY");
    });

    it("should supersede existing active plan when generating new one", async () => {
      // Arrange
      const existingPlan: TreatmentPlan = {
        id: "plan-1",
        status: "active",
        generatedAt: "2024-01-01T00:00:00.000Z",
        generatedBy: "ai",
        confidence: 75,
        injuryType: "back_strain",
        interventions: [],
        milestones: [],
        expectedDurationWeeks: 8,
        expectedOutcomes: [],
        factorsConsidered: [],
        disclaimerText: "ADVISORY ONLY",
      };

      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        summary: "Test injury",
        riskLevel: "Medium",
        clinical_status_json: {
          treatmentPlan: existingPlan,
          treatmentPlanHistory: [],
        },
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const mockClient = new Anthropic({ apiKey: "test-key" });
      vi.mocked(mockClient.messages.create).mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              interventions: [],
              milestones: [],
              expectedDurationWeeks: 6,
              expectedOutcomes: [],
              factorsConsidered: [],
            }),
          },
        ],
      } as any);

      // Act
      const result = await generateTreatmentPlan(storage, {
        caseId,
        organizationId,
        additionalContext: "",
      });

      // Assert: Old plan should be superseded
      const updateCall = vi.mocked(storage.updateClinicalStatus).mock.calls[0];
      expect(updateCall).toBeDefined();
      const updatedStatus = updateCall[1];
      expect(updatedStatus.treatmentPlanHistory).toHaveLength(1);
      expect(updatedStatus.treatmentPlanHistory[0].status).toBe("superseded");
      expect(updatedStatus.treatmentPlanHistory[0].supersededBy).toBe(result.id);
    });

    it("should include confidence score based on data quality", async () => {
      // Arrange: High-quality case data
      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        summary: "Well-documented lower back strain with detailed injury mechanism",
        riskLevel: "Low",
        hasCertificate: true,
        clinical_status_json: {
          medicalConstraints: { noLiftingOverKg: 10 },
          functionalCapacity: { canLiftKg: 5 },
        },
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const mockClient = new Anthropic({ apiKey: "test-key" });
      vi.mocked(mockClient.messages.create).mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              interventions: [],
              milestones: [],
              expectedDurationWeeks: 6,
              expectedOutcomes: [],
              factorsConsidered: ["Detailed injury summary", "Medical constraints present"],
            }),
          },
        ],
      } as any);

      // Act
      const result = await generateTreatmentPlan(storage, {
        caseId,
        organizationId,
        additionalContext: "",
      });

      // Assert
      expect(result.confidence).toBeGreaterThan(50); // Higher confidence with good data
    });
  });

  describe("getTreatmentPlan", () => {
    it("should retrieve active treatment plan", async () => {
      // Arrange
      const activePlan: TreatmentPlan = {
        id: "plan-1",
        status: "active",
        generatedAt: "2024-01-01T00:00:00.000Z",
        generatedBy: "ai",
        confidence: 80,
        injuryType: "back_strain",
        interventions: [],
        milestones: [],
        expectedDurationWeeks: 8,
        expectedOutcomes: [],
        factorsConsidered: [],
        disclaimerText: "ADVISORY ONLY",
      };

      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        clinical_status_json: { treatmentPlan: activePlan },
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      // Act
      const result = await getTreatmentPlan(storage, caseId, organizationId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe("plan-1");
      expect(result?.status).toBe("active");
    });

    it("should return null when no treatment plan exists", async () => {
      // Arrange
      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        clinical_status_json: {},
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      // Act
      const result = await getTreatmentPlan(storage, caseId, organizationId);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when case not found", async () => {
      // Arrange
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(null);

      // Act
      const result = await getTreatmentPlan(storage, "nonexistent", organizationId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateTreatmentPlan", () => {
    it("should mark treatment plan as completed", async () => {
      // Arrange
      const activePlan: TreatmentPlan = {
        id: "plan-1",
        status: "active",
        generatedAt: "2024-01-01T00:00:00.000Z",
        generatedBy: "ai",
        confidence: 80,
        injuryType: "back_strain",
        interventions: [],
        milestones: [],
        expectedDurationWeeks: 8,
        expectedOutcomes: [],
        factorsConsidered: [],
        disclaimerText: "ADVISORY ONLY",
      };

      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        clinical_status_json: { treatmentPlan: activePlan },
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      // Act
      const result = await updateTreatmentPlan(storage, caseId, organizationId, "plan-1", {
        status: "completed",
        notes: "Worker returned to full duties",
      });

      // Assert
      expect(result.status).toBe("completed");
      expect(result.completedAt).toBeDefined();
      expect(result.notes).toBe("Worker returned to full duties");
      expect(storage.updateClinicalStatus).toHaveBeenCalled();
    });

    it("should add notes to treatment plan", async () => {
      // Arrange
      const activePlan: TreatmentPlan = {
        id: "plan-1",
        status: "active",
        generatedAt: "2024-01-01T00:00:00.000Z",
        generatedBy: "ai",
        confidence: 80,
        injuryType: "back_strain",
        interventions: [],
        milestones: [],
        expectedDurationWeeks: 8,
        expectedOutcomes: [],
        factorsConsidered: [],
        disclaimerText: "ADVISORY ONLY",
      };

      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        clinical_status_json: { treatmentPlan: activePlan },
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      // Act
      const result = await updateTreatmentPlan(storage, caseId, organizationId, "plan-1", {
        notes: "Progressing well with physiotherapy",
      });

      // Assert
      expect(result.notes).toBe("Progressing well with physiotherapy");
      expect(result.status).toBe("active"); // Status unchanged
    });

    it("should throw error when plan ID doesn't match", async () => {
      // Arrange
      const activePlan: TreatmentPlan = {
        id: "plan-1",
        status: "active",
        generatedAt: "2024-01-01T00:00:00.000Z",
        generatedBy: "ai",
        confidence: 80,
        injuryType: "back_strain",
        interventions: [],
        milestones: [],
        expectedDurationWeeks: 8,
        expectedOutcomes: [],
        factorsConsidered: [],
        disclaimerText: "ADVISORY ONLY",
      };

      const mockCase: WorkerCase = {
        id: caseId,
        organizationId,
        clinical_status_json: { treatmentPlan: activePlan },
      } as WorkerCase;
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(mockCase);

      // Act & Assert
      await expect(
        updateTreatmentPlan(storage, caseId, organizationId, "wrong-plan-id", {
          status: "completed",
        })
      ).rejects.toThrow("Treatment plan not found");
    });

    it("should throw error when case not found", async () => {
      // Arrange
      vi.mocked(storage.getGPNet2CaseById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        updateTreatmentPlan(storage, "nonexistent", organizationId, "plan-1", {
          status: "completed",
        })
      ).rejects.toThrow("Case not found");
    });
  });
});
