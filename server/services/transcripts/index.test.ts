import { describe, it, expect, vi } from "vitest";
import type { InsertCaseDiscussionNote } from "@shared/schema";

vi.mock("../../storage", () => ({
  storage: {
    findCaseByWorkerName: vi.fn(),
    upsertCaseDiscussionNotes: vi.fn(),
    upsertCaseDiscussionInsights: vi.fn(),
    getCaseDiscussionNotes: vi.fn(),
    getCaseDiscussionInsights: vi.fn(),
  },
}));

import { TranscriptIngestionModule } from "./index";

describe("TranscriptIngestionModule insight generation", () => {
  const moduleInstance = new TranscriptIngestionModule();
  const buildInsights = (moduleInstance as any).buildInsightsForNote.bind(
    moduleInstance as any,
  ) as (
    row: InsertCaseDiscussionNote,
    noteId: string,
    caseId: string,
  ) => {
    inserts: any[];
    materialized: any[];
  };

  it("creates compliance and risk insights from flags and next steps", () => {
    const row: InsertCaseDiscussionNote = {
      id: "note-1",
      caseId: "case-1",
      workerName: "Jordan Smith",
      timestamp: new Date("2025-02-01T10:00:00Z"),
      rawText: "Worker was a no show. Need compliance review.",
      summary: "Worker no-show and compliance follow-up required.",
      nextSteps: ["Call worker again"],
      riskFlags: ["Compliance risk", "Attendance risk"],
      updatesCompliance: true,
      updatesRecoveryTimeline: false,
    };

    const result = buildInsights(row, "note-1", "case-1");
    expect(result.inserts).toHaveLength(4);
    const areas = result.materialized.map((insight) => insight.area);
    expect(areas).toContain("compliance");
    expect(areas).toContain("risk");
    expect(areas).toContain("returnToWork");
    const severities = result.materialized
      .filter((insight) => insight.area === "compliance")
      .map((insight) => insight.severity);
    expect(severities).toContain("warning");
  });
});
