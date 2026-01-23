import type { Express, Request, Response } from "express";
import { db } from "../db";
import { workerCases, medicalCertificates } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import {
  calculateRecoveryTimeline,
  generateRecoveryTimelineChartData,
  extractInjuryType,
  getInjuryModel,
  getAvailableInjuryTypes,
} from "../services/recoveryEstimator";
import { evaluateClinicalEvidence } from "../services/clinicalEvidence";
import { logger } from "../lib/logger";
import type { MedicalCertificate, WorkCapacity } from "../../shared/schema";

/**
 * Timeline estimation routes
 * GET /api/cases/:id/timeline-estimate - Get dynamic recovery timeline for a case
 * GET /api/cases/:id/recovery-chart - Get chart-ready recovery timeline data
 * GET /api/injury-types - Get all available injury types
 */
export function registerTimelineRoutes(app: Express) {
  // Get timeline estimate for a case (legacy endpoint)
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

  // Get comprehensive recovery chart data for a case
  app.get("/api/cases/:id/recovery-chart", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Fetch case
      const cases = await db
        .select()
        .from(workerCases)
        .where(eq(workerCases.id, id))
        .limit(1);

      if (cases.length === 0) {
        return res.status(404).json({ error: "Case not found" });
      }

      const workerCase = cases[0] as any;

      // Fetch medical certificates for this case
      const certificateRows = await db
        .select()
        .from(medicalCertificates)
        .where(eq(medicalCertificates.caseId, id))
        .orderBy(desc(medicalCertificates.startDate));

      // Map to MedicalCertificate interface
      const certificates: MedicalCertificate[] = certificateRows.map((row) => ({
        id: row.id,
        caseId: row.caseId,
        issueDate: row.issueDate?.toISOString() ?? row.startDate.toISOString(),
        startDate: row.startDate.toISOString(),
        endDate: row.endDate.toISOString(),
        capacity: row.capacity as WorkCapacity,
        workCapacityPercentage: row.workCapacityPercentage ?? undefined,
        notes: row.notes ?? undefined,
        source: (row.source as "freshdesk" | "manual") ?? "freshdesk",
        documentUrl: row.documentUrl ?? undefined,
        sourceReference: row.sourceReference ?? undefined,
        createdAt: row.createdAt?.toISOString(),
        updatedAt: row.updatedAt?.toISOString(),
      }));

      // Evaluate clinical evidence to get flags
      const clinicalEvidence = evaluateClinicalEvidence(workerCase);

      // Generate comprehensive chart data
      const chartData = generateRecoveryTimelineChartData(
        id,
        workerCase.workerName,
        workerCase.dateOfInjury.toISOString(),
        workerCase.summary || "",
        workerCase.riskLevel as "High" | "Medium" | "Low",
        clinicalEvidence.flags || [],
        certificates
      );

      return res.json(chartData);
    } catch (error) {
      logger.api.error("Error generating recovery chart data", {}, error);
      return res.status(500).json({
        error: "Failed to generate recovery chart data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get injury model details for a specific injury type
  app.get("/api/injury-models/:type", async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const model = getInjuryModel(type as any);

      if (!model) {
        return res.status(404).json({ error: "Injury type not found" });
      }

      return res.json({
        type,
        label: type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
        ...model,
      });
    } catch (error) {
      logger.api.error("Error fetching injury model", {}, error);
      return res.status(500).json({
        error: "Failed to fetch injury model",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get all available injury types
  app.get("/api/injury-types", async (_req: Request, res: Response) => {
    try {
      const types = getAvailableInjuryTypes();
      return res.json(types);
    } catch (error) {
      logger.api.error("Error fetching injury types", {}, error);
      return res.status(500).json({
        error: "Failed to fetch injury types",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
