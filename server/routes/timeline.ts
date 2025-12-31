import type { Express, Request, Response } from "express";
import { db } from "../db";
import { workerCases, medicalCertificates } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { calculateRecoveryTimeline } from "../services/recoveryEstimator";
import { evaluateClinicalEvidence } from "../services/clinicalEvidence";
import { logger } from "../lib/logger";

/**
 * Timeline estimation routes
 * GET /api/cases/:id/timeline-estimate - Get dynamic recovery timeline for a case
 */
export function registerTimelineRoutes(app: Express) {
  // Get timeline estimate for a case
  app.get("/api/cases/:id/timeline-estimate", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Fetch case with clinical evidence
      const cases = await db
        .select()
        .from(workerCases)
        .where(eq(workerCases.id, id))
        .limit(1);

      if (cases.length === 0) {
        return res.status(404).json({ error: "Case not found" });
      }

      const workerCase = cases[0] as any; // DB row type differs slightly from WorkerCase interface

      // Evaluate clinical evidence to get flags
      const clinicalEvidence = evaluateClinicalEvidence(workerCase);

      // Calculate timeline estimate
      const estimate = calculateRecoveryTimeline({
        dateOfInjury: workerCase.dateOfInjury.toISOString(),
        summary: workerCase.summary || "",
        riskLevel: workerCase.riskLevel as "High" | "Medium" | "Low",
        clinicalFlags: clinicalEvidence.flags || [],
      });

      return res.json(estimate);
    } catch (error) {
      logger.api.error("Error calculating timeline estimate", {}, error);
      return res.status(500).json({
        error: "Failed to calculate timeline estimate",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
