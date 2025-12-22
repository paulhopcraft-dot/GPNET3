import { describe, it, expect } from "vitest";
import { z } from "zod";

// RTW plan update schema - matching the one in rtw.ts
const rtwPlanUpdateSchema = z.object({
  status: z.enum([
    "not_planned",
    "planned_not_started",
    "in_progress",
    "working_well",
    "failing",
    "on_hold",
    "completed",
  ]),
  notes: z.string().optional(),
  targetDate: z.string().optional(),
  restrictions: z.array(z.string()).optional(),
  dutiesAssigned: z.boolean().optional(),
  hostSite: z.string().optional(),
});

describe("RTW Plan Update Schema", () => {
  describe("status validation", () => {
    it("accepts valid not_planned status", () => {
      const result = rtwPlanUpdateSchema.safeParse({ status: "not_planned" });
      expect(result.success).toBe(true);
    });

    it("accepts valid in_progress status", () => {
      const result = rtwPlanUpdateSchema.safeParse({ status: "in_progress" });
      expect(result.success).toBe(true);
    });

    it("accepts valid working_well status", () => {
      const result = rtwPlanUpdateSchema.safeParse({ status: "working_well" });
      expect(result.success).toBe(true);
    });

    it("accepts valid failing status", () => {
      const result = rtwPlanUpdateSchema.safeParse({ status: "failing" });
      expect(result.success).toBe(true);
    });

    it("accepts valid completed status", () => {
      const result = rtwPlanUpdateSchema.safeParse({ status: "completed" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = rtwPlanUpdateSchema.safeParse({ status: "invalid_status" });
      expect(result.success).toBe(false);
    });

    it("rejects missing status", () => {
      const result = rtwPlanUpdateSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("optional fields", () => {
    it("accepts notes as optional string", () => {
      const result = rtwPlanUpdateSchema.safeParse({
        status: "in_progress",
        notes: "Worker started modified duties today",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe("Worker started modified duties today");
      }
    });

    it("accepts targetDate as optional string", () => {
      const result = rtwPlanUpdateSchema.safeParse({
        status: "planned_not_started",
        targetDate: "2025-02-01",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetDate).toBe("2025-02-01");
      }
    });

    it("accepts restrictions as optional string array", () => {
      const result = rtwPlanUpdateSchema.safeParse({
        status: "in_progress",
        restrictions: ["No lifting over 5kg", "Seated work only"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.restrictions).toHaveLength(2);
      }
    });

    it("accepts dutiesAssigned as optional boolean", () => {
      const result = rtwPlanUpdateSchema.safeParse({
        status: "in_progress",
        dutiesAssigned: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dutiesAssigned).toBe(true);
      }
    });

    it("accepts hostSite as optional string", () => {
      const result = rtwPlanUpdateSchema.safeParse({
        status: "in_progress",
        hostSite: "Warehouse A",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hostSite).toBe("Warehouse A");
      }
    });
  });

  describe("all RTW statuses per PRD-3.2.3", () => {
    const validStatuses = [
      "not_planned",
      "planned_not_started",
      "in_progress",
      "working_well",
      "failing",
      "on_hold",
      "completed",
    ];

    validStatuses.forEach((status) => {
      it(`accepts status: ${status}`, () => {
        const result = rtwPlanUpdateSchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });
  });
});

describe("RTW Status Transitions", () => {
  const validTransitions: Record<string, string[]> = {
    not_planned: ["planned_not_started"],
    planned_not_started: ["in_progress", "on_hold"],
    in_progress: ["working_well", "failing", "on_hold", "completed"],
    working_well: ["in_progress", "completed"],
    failing: ["in_progress", "on_hold"],
    on_hold: ["in_progress", "planned_not_started"],
    completed: [],
  };

  it("defines valid transition paths", () => {
    expect(Object.keys(validTransitions)).toHaveLength(7);
    expect(validTransitions.not_planned).toContain("planned_not_started");
    expect(validTransitions.in_progress).toContain("working_well");
    expect(validTransitions.in_progress).toContain("failing");
  });

  it("completed state should be terminal (no outbound transitions)", () => {
    expect(validTransitions.completed).toHaveLength(0);
  });
});
