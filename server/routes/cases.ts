import express, { type Request, type Response } from "express";
import { generateCaseSummary } from "../src/ai/case_summary";

const router = express.Router();

/**
 * Simple test route so the server can start and return a demo case list.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json([
    {
      id: 1,
      worker_name: "Demo Worker",
      employer: "Demo Employer",
      injury_type: "Shoulder strain",
      compliance_level: "High",
      risk_level: "Low",
      next_step_owner: "Worker",
      expected_recovery_date: "2025-12-10",
    },
  ]);
});

/**
 * GET /api/cases/:id/summary
 * Generates an AI summary for the given case ID.
 * In production this should pull real case data from the database,
 * but for now we use sample data to demonstrate the workflow.
 */
router.get("/:id/summary", async (req: Request, res: Response) => {
  try {
    const caseId = req.params.id;

    // Temporary demo data — replace with DB query later
    const caseData = {
      id: caseId,
      worker_name: "Demo Worker",
      employer_name: "Demo Employer",
      injury_type: "Shoulder strain",
      injury_date: "2025-10-01",
      status: "Active",
      medical_history: [
        "Initial certificate: no work capacity 4 weeks",
        "Second certificate: modified duties for 2 weeks",
      ],
      notes: [
        "Physiotherapy ongoing",
        "Worker reports improved mobility",
        "Employer organising suitable duties placement",
      ],
    };

    // Call the AI summary generator
    const summary = await generateCaseSummary(caseData);

    res.json({ id: caseId, summary });
  } catch (err) {
    console.error("Summary generation failed:", err);
    res.status(500).json({ error: "Summary generation failed" });
  }
});

export default router;
