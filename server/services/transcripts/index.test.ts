import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi, afterEach } from "vitest";
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
import { storage } from "../../storage";

afterEach(() => {
  vi.clearAllMocks();
});

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

describe("Transcript ingestion control flow", () => {
  const moduleInstance = new TranscriptIngestionModule();

  const callPersist = (moduleInstance as any).persistNotes.bind(
    moduleInstance as any,
  ) as (filePath: string, parsed: any[]) => Promise<boolean>;

  it("returns false when no worker match is found so file can be retried", async () => {
    const findMock = storage.findCaseByWorkerName as vi.Mock;
    findMock.mockResolvedValue(null);
    const persisted = await callPersist("unmatched.txt", [
      {
        workerName: "Mystery Person",
        timestamp: new Date(),
        rawText: "No matching worker yet",
        summary: "Summary",
        nextSteps: [],
        riskFlags: [],
        updatesCompliance: false,
        updatesRecoveryTimeline: false,
      },
    ]);
    expect(persisted).toBe(false);
    expect(storage.upsertCaseDiscussionNotes).not.toHaveBeenCalled();
  });

  it("only marks files as processed after successful persistence", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpnet-transcripts-"));
    const transcriptPath = path.join(tmpDir, "alex.txt");
    fs.writeFileSync(
      transcriptPath,
      "Worker: Alex Smith\nMissed appointment and needs RTW follow up.\n",
      "utf-8",
    );

    const processFile = (moduleInstance as any).processFile.bind(
      moduleInstance as any,
    ) as (filePath: string) => Promise<void>;
    const processedFiles = (moduleInstance as any).processedFiles as Map<
      string,
      number
    >;

    const findMock = storage.findCaseByWorkerName as vi.Mock;
    findMock.mockResolvedValue(null);
    (storage.upsertCaseDiscussionNotes as vi.Mock).mockResolvedValue(undefined);
    (storage.upsertCaseDiscussionInsights as vi.Mock).mockResolvedValue(
      undefined,
    );

    await processFile(transcriptPath);
    expect(processedFiles.has(transcriptPath)).toBe(false);

    findMock.mockResolvedValue({
      caseId: "case-1",
      workerName: "Alex Smith",
      confidence: 0.9,
    });

    await processFile(transcriptPath);
    expect(processedFiles.has(transcriptPath)).toBe(true);
    expect(storage.upsertCaseDiscussionNotes).toHaveBeenCalledTimes(1);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
