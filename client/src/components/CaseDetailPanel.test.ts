
import type { WorkerCase } from "@shared/schema";
import { deriveSummaryMetaFromCase } from "./CaseDetailPanel";

const baseCase = (): WorkerCase => ({
  id: "case-1",
  workerName: "Jordan Smith",
  company: "Symmetry",
  dateOfInjury: "2024-01-10",
  riskLevel: "Medium",
  workStatus: "At work",
  hasCertificate: false,
  complianceIndicator: "Low",
  compliance: {
    indicator: "Low",
    reason: "Initial",
    source: "manual",
    lastChecked: new Date().toISOString(),
  },
  currentStatus: "Pending",
  nextStep: "Review",
  owner: "CLC Team",
  dueDate: "2024-02-01",
  summary: "Summary",
  ticketIds: ["t-1"],
  ticketCount: 1,
  attachments: [],
});

describe("deriveSummaryMetaFromCase", () => {
  it("marks cached summaries when present", () => {
    const sample = baseCase();
    sample.aiSummary = "Existing summary";
    sample.aiSummaryGeneratedAt = "2025-01-01T00:00:00Z";
    sample.aiSummaryModel = "claude";

    const meta = deriveSummaryMetaFromCase(sample);
    expect(meta.generatedAt).toBe(sample.aiSummaryGeneratedAt);
    expect(meta.model).toBe("claude");
    expect(meta.cached).toBe(true);
  });

  it("returns undefined cached flag when no summary exists", () => {
    const sample = baseCase();
    const meta = deriveSummaryMetaFromCase(sample);
    expect(meta.cached).toBeUndefined();
    expect(meta.generatedAt).toBeUndefined();
  });
});
