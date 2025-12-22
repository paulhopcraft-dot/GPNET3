/**
 * Prediction Routes - XGBoost Prediction Layer API (PRD-25)
 *
 * Endpoints:
 * - GET /api/predictions - Get predictions for all cases
 * - GET /api/predictions/summary - Get prediction summary stats
 * - GET /api/predictions/:caseId - Get prediction for a specific case
 */

import express, { type Response } from "express";
import { storage } from "../storage";
import { authorize, type AuthRequest } from "../middleware/auth";
import {
  predictCase,
  predictCases,
  summarizePredictions,
  type CasePrediction,
  type PredictionSummary,
} from "../services/predictionService";
import { isLegitimateCase } from "@shared/schema";

const router = express.Router();

/**
 * GET /api/predictions
 * Get predictions for all cases the user has access to
 */
router.get("/", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cases = await storage.getGPNet2Cases(organizationId);
    const legitimateCases = cases.filter(isLegitimateCase);
    const predictions = predictCases(legitimateCases);

    // Sort by RTW probability ascending (lowest first = highest priority)
    predictions.sort((a, b) => a.rtwProbability - b.rtwProbability);

    res.json({
      predictions,
      count: predictions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating predictions:", error);
    res.status(500).json({ error: "Failed to generate predictions" });
  }
});

/**
 * GET /api/predictions/summary
 * Get summary statistics for all case predictions
 */
router.get("/summary", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cases = await storage.getGPNet2Cases(organizationId);
    const legitimateCases = cases.filter(isLegitimateCase);
    const predictions = predictCases(legitimateCases);
    const summary = summarizePredictions(predictions);

    res.json({
      ...summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating prediction summary:", error);
    res.status(500).json({ error: "Failed to generate prediction summary" });
  }
});

/**
 * GET /api/predictions/high-risk
 * Get cases with high escalation or deterioration risk
 */
router.get("/high-risk", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cases = await storage.getGPNet2Cases(organizationId);
    const legitimateCases = cases.filter(isLegitimateCase);
    const predictions = predictCases(legitimateCases);

    const highRiskPredictions = predictions.filter(
      (p) =>
        p.escalationRisk === "high" ||
        p.deteriorationRisk === "high" ||
        p.rtwProbability < 40
    );

    // Sort by RTW probability ascending
    highRiskPredictions.sort((a, b) => a.rtwProbability - b.rtwProbability);

    res.json({
      predictions: highRiskPredictions,
      count: highRiskPredictions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching high-risk predictions:", error);
    res.status(500).json({ error: "Failed to fetch high-risk predictions" });
  }
});

/**
 * GET /api/predictions/:caseId
 * Get prediction for a specific case
 */
router.get("/:caseId", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

    if (!workerCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    const prediction = predictCase(workerCase);

    res.json(prediction);
  } catch (error) {
    console.error("Error generating case prediction:", error);
    res.status(500).json({ error: "Failed to generate prediction" });
  }
});

export default router;
