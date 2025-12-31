import { Router, type Response } from "express";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { storage } from "../storage";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "../services/auditLogger";
import { calculatePrediction, calculatePredictions, type CasePrediction } from "../services/predictionEngine";
import { isLegitimateCase } from "@shared/schema";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/predictions
 * Returns predictions for all legitimate cases
 * PRD-9: AI & Intelligence Layer - advisory predictions
 */
router.get("/", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const cases = await storage.getGPNet2Cases(organizationId);

    // Only predict on legitimate cases (not test/deleted)
    const legitimateCases = cases.filter(isLegitimateCase);
    const predictions = calculatePredictions(legitimateCases);

    // Enrich predictions with case details for the UI
    const enrichedPredictions = predictions.map((prediction, index) => {
      const workerCase = legitimateCases[index];
      return {
        ...prediction,
        workerName: workerCase.workerName,
        company: workerCase.company,
        workStatus: workerCase.workStatus,
        riskLevel: workerCase.riskLevel,
      };
    });

    // Calculate summary statistics
    const stats = {
      total: enrichedPredictions.length,
      avgRtwProbability: enrichedPredictions.length > 0
        ? Math.round(enrichedPredictions.reduce((sum, p) => sum + p.rtwProbability, 0) / enrichedPredictions.length)
        : 0,
      highRtwProbability: enrichedPredictions.filter(p => p.rtwProbability >= 70).length,
      lowRtwProbability: enrichedPredictions.filter(p => p.rtwProbability < 50).length,
      highEscalationRisk: enrichedPredictions.filter(p => p.escalationRisk === "High").length,
      highCostRisk: enrichedPredictions.filter(p => p.costRisk === "High").length,
    };

    await logAuditEvent({
      userId: req.user!.id,
      organizationId,
      eventType: AuditEventTypes.CASE_LIST,
      resourceType: "predictions",
      metadata: { caseCount: predictions.length },
      ...getRequestMetadata(req),
    });

    res.json({
      predictions: enrichedPredictions,
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.api.error("Failed to fetch predictions", {}, err);
    res.status(500).json({
      error: "Failed to fetch predictions",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /api/cases/:id/prediction
 * Returns prediction for a specific case
 * PRD-9: AI & Intelligence Layer - case-specific prediction with explainability
 */
router.get("/:id/prediction", authorize(), requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!;
    const prediction = calculatePrediction(workerCase);

    await logAuditEvent({
      userId: req.user!.id,
      organizationId: req.user!.organizationId,
      eventType: AuditEventTypes.CASE_VIEW,
      resourceType: "prediction",
      resourceId: workerCase.id,
      ...getRequestMetadata(req),
    });

    res.json({
      ...prediction,
      workerName: workerCase.workerName,
      company: workerCase.company,
      workStatus: workerCase.workStatus,
      riskLevel: workerCase.riskLevel,
    });
  } catch (err) {
    logger.api.error("Failed to fetch case prediction", {}, err);
    res.status(500).json({
      error: "Failed to fetch case prediction",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
