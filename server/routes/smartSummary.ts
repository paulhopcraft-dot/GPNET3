/**
 * Smart Summary Engine v1 - API Routes
 *
 * GET /api/cases/:caseId/smart-summary
 * Returns a structured case summary with risks, actions, RTW readiness, and compliance status.
 */

import express, { type Request, type Response } from "express";
import { authorize } from "../middleware/auth";
import { storage } from "../storage";
import { generateSmartSummary, generateFallbackSummary } from "../services/smartSummary";

const router = express.Router();

/**
 * GET /api/cases/:caseId/smart-summary
 * Generate or retrieve a structured case summary
 *
 * Query params:
 * - fallback=true: Use rule-based analysis instead of AI (faster, no API key needed)
 */
router.get(
  "/:caseId/smart-summary",
  authorize(),
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const useFallback = req.query.fallback === "true";

      // Check if case exists
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({
          success: false,
          error: "Case not found",
        });
      }

      let summary;

      if (useFallback) {
        // Use rule-based analysis (no AI)
        summary = await generateFallbackSummary(storage, caseId);
      } else {
        // Try AI-powered analysis, fall back to rule-based if AI unavailable
        try {
          summary = await generateSmartSummary(storage, caseId);
        } catch (error: any) {
          const msg = error.message || "";
          const isAIUnavailable =
            msg.includes("ANTHROPIC_API_KEY") ||
            msg.includes("authentication_error") ||
            msg.includes("invalid x-api-key") ||
            msg.startsWith("401");
          if (isAIUnavailable) {
            console.warn("AI unavailable, using fallback summary:", msg.slice(0, 100));
            summary = await generateFallbackSummary(storage, caseId);
          } else {
            throw error;
          }
        }
      }

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("Smart summary generation failed:", error);

      if (error.message?.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({
          success: false,
          error: "AI service unavailable",
          message: "Configure ANTHROPIC_API_KEY to enable AI summaries",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to generate summary",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/cases/:caseId/smart-summary
 * Force regenerate a structured case summary (ignores any cache)
 */
router.post(
  "/:caseId/smart-summary",
  authorize(),
  async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const useFallback = req.query.fallback === "true";

      // Check if case exists
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({
          success: false,
          error: "Case not found",
        });
      }

      let summary;

      if (useFallback) {
        summary = await generateFallbackSummary(storage, caseId);
      } else {
        try {
          summary = await generateSmartSummary(storage, caseId);
        } catch (error: any) {
          const msg = error.message || "";
          const isAIUnavailable =
            msg.includes("ANTHROPIC_API_KEY") ||
            msg.includes("authentication_error") ||
            msg.includes("invalid x-api-key") ||
            msg.startsWith("401");
          if (isAIUnavailable) {
            console.warn("AI unavailable, using fallback summary:", msg.slice(0, 100));
            summary = await generateFallbackSummary(storage, caseId);
          } else {
            throw error;
          }
        }
      }

      res.json({
        success: true,
        data: summary,
        regenerated: true,
      });
    } catch (error: any) {
      console.error("Smart summary regeneration failed:", error);

      if (error.message?.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({
          success: false,
          error: "AI service unavailable",
          message: "Configure ANTHROPIC_API_KEY to enable AI summaries",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to regenerate summary",
        message: error.message,
      });
    }
  }
);

export default router;
