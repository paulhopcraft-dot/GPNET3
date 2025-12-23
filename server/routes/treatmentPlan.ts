/**
 * Treatment Plan API Routes
 *
 * POST /api/cases/:id/treatment-plan/generate - Generate new treatment plan
 * GET /api/cases/:id/treatment-plan - Get current treatment plan
 * PUT /api/cases/:id/treatment-plan/:planId - Update treatment plan
 * GET /api/cases/:id/treatment-plan/history - Get treatment plan history
 *
 * PRD-9 Compliant: Advisory only, case ownership required
 */

import type { Express, Request, Response } from "express";
import type { GenerateTreatmentPlanRequest, UpdateTreatmentPlanRequest } from "../services/treatmentPlanService";
import { generateTreatmentPlan, getTreatmentPlan, updateTreatmentPlan } from "../services/treatmentPlanService";
import type { IStorage } from "../storage";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { csrfProtection } from "../middleware/security";

export function registerTreatmentPlanRoutes(app: Express, storage: IStorage) {
  /**
   * POST /api/cases/:id/treatment-plan/generate
   * Generate new treatment plan with AI
   */
  app.post(
    "/api/cases/:id/treatment-plan/generate",
    csrfProtection,
    requireCaseOwnership(),
    async (req: Request, res: Response) => {
      try {
        const { id: caseId } = req.params;
        const { additionalContext } = req.body;
        const organizationId = (req.user as any)?.organizationId;

        if (!organizationId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const request: GenerateTreatmentPlanRequest = {
          caseId,
          organizationId,
          additionalContext: additionalContext || "",
        };

        const plan = await generateTreatmentPlan(storage, request);
        return res.json(plan);
      } catch (error) {
        console.error("[TreatmentPlanRoutes] Error generating plan:", error);
        return res.status(500).json({
          error: "Failed to generate treatment plan",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * GET /api/cases/:id/treatment-plan
   * Get current treatment plan
   */
  app.get(
    "/api/cases/:id/treatment-plan",
    requireCaseOwnership(),
    async (req: Request, res: Response) => {
      try {
        const { id: caseId } = req.params;
        const organizationId = (req.user as any)?.organizationId;

        if (!organizationId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const plan = await getTreatmentPlan(storage, caseId, organizationId);
        if (!plan) {
          return res.status(404).json({ error: "No treatment plan found" });
        }

        return res.json(plan);
      } catch (error) {
        console.error("[TreatmentPlanRoutes] Error fetching plan:", error);
        return res.status(500).json({
          error: "Failed to fetch treatment plan",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * PUT /api/cases/:id/treatment-plan/:planId
   * Update treatment plan status or notes
   */
  app.put(
    "/api/cases/:id/treatment-plan/:planId",
    csrfProtection,
    requireCaseOwnership(),
    async (req: Request, res: Response) => {
      try {
        const { id: caseId, planId } = req.params;
        const updates: UpdateTreatmentPlanRequest = req.body;
        const organizationId = (req.user as any)?.organizationId;

        if (!organizationId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const plan = await updateTreatmentPlan(storage, caseId, organizationId, planId, updates);
        return res.json(plan);
      } catch (error) {
        console.error("[TreatmentPlanRoutes] Error updating plan:", error);
        return res.status(500).json({
          error: "Failed to update treatment plan",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * GET /api/cases/:id/treatment-plan/history
   * Get treatment plan history
   */
  app.get(
    "/api/cases/:id/treatment-plan/history",
    requireCaseOwnership(),
    async (req: Request, res: Response) => {
      try {
        const { id: caseId } = req.params;
        const organizationId = (req.user as any)?.organizationId;

        if (!organizationId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);
        if (!workerCase) {
          return res.status(404).json({ error: "Case not found" });
        }

        const history = workerCase.clinical_status_json?.treatmentPlanHistory || [];
        return res.json(history);
      } catch (error) {
        console.error("[TreatmentPlanRoutes] Error fetching history:", error);
        return res.status(500).json({
          error: "Failed to fetch treatment plan history",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
