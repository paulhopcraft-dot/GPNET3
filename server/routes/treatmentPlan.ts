/**
 * Treatment Plan API Routes (PRD-3.2.3, Spec-21)
 *
 * Endpoints for generating and managing RTW treatment plans.
 */

import express from "express";
import { z } from "zod";
import { authorize, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { treatmentPlanService, type TreatmentPlanInput } from "../services/treatmentPlanService";
import { logAuditEvent, AuditEventTypes } from "../services/auditLogger";

const router = express.Router();

// Zod schema for treatment plan generation request
const generatePlanSchema = z.object({
  injuryType: z.string().optional(),
  jobRequirements: z.string().optional(),
});

/**
 * POST /api/treatment-plans/:caseId/generate
 * Generate a new treatment plan for a case
 */
router.post(
  "/:caseId/generate",
  authorize(["admin", "clinician", "employer"]),
  async (req, res) => {
    try {
      const { caseId } = req.params;
      const userId = req.user?.id;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Validate optional input
      const inputResult = generatePlanSchema.safeParse(req.body);
      const additionalInput = inputResult.success ? inputResult.data : {};

      // Fetch the case
      const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate the treatment plan
      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      // Log audit event
      await logAuditEvent({
        userId: userId ?? "system",
        organizationId,
        eventType: AuditEventTypes.CASE_UPDATE,
        resourceType: "treatment_plan",
        resourceId: plan.id,
        metadata: {
          caseId,
          planType: plan.planType,
          expectedDurationWeeks: plan.expectedDurationWeeks,
          confidenceScore: plan.confidenceScore,
        },
      });

      res.json({
        success: true,
        plan,
      });
    } catch (error) {
      console.error("[Treatment Plan] Error generating plan:", error);
      res.status(500).json({
        error: "Failed to generate treatment plan",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/treatment-plans/:caseId
 * Get the current treatment plan for a case (generates if none exists)
 */
router.get(
  "/:caseId",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req, res) => {
    try {
      const { caseId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Fetch the case
      const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate a treatment plan based on current case data
      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      res.json({
        success: true,
        plan,
      });
    } catch (error) {
      console.error("[Treatment Plan] Error fetching plan:", error);
      res.status(500).json({
        error: "Failed to fetch treatment plan",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/treatment-plans/:caseId/validate
 * Validate current plan against restrictions
 */
router.post(
  "/:caseId/validate",
  authorize(["admin", "clinician", "employer"]),
  async (req, res) => {
    try {
      const { caseId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Fetch the case
      const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate current plan
      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      // Validate against constraints
      const validation = treatmentPlanService.validatePlanSafety(
        plan,
        workerCase.medicalConstraints
      );

      res.json({
        success: true,
        caseId,
        planId: plan.id,
        validation,
      });
    } catch (error) {
      console.error("[Treatment Plan] Error validating plan:", error);
      res.status(500).json({
        error: "Failed to validate treatment plan",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/treatment-plans/:caseId/progression
 * Get the hours progression schedule for a case
 */
router.get(
  "/:caseId/progression",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req, res) => {
    try {
      const { caseId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Fetch the case
      const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate plan and extract progression
      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      res.json({
        success: true,
        caseId,
        workerName: workerCase.workerName,
        hoursProgression: plan.hoursProgression,
        currentPhase: plan.currentPhase,
        currentWeeklyHours: plan.currentWeeklyHours,
        targetWeeklyHours: plan.targetWeeklyHours,
        advisory: plan.advisory,
      });
    } catch (error) {
      console.error("[Treatment Plan] Error fetching progression:", error);
      res.status(500).json({
        error: "Failed to fetch hours progression",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/treatment-plans/:caseId/milestones
 * Get review milestones for a case
 */
router.get(
  "/:caseId/milestones",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req, res) => {
    try {
      const { caseId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Fetch the case
      const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate plan and extract milestones
      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      res.json({
        success: true,
        caseId,
        workerName: workerCase.workerName,
        reviewMilestones: plan.reviewMilestones,
        nextReviewDate: plan.nextReviewDate,
        advisory: plan.advisory,
      });
    } catch (error) {
      console.error("[Treatment Plan] Error fetching milestones:", error);
      res.status(500).json({
        error: "Failed to fetch review milestones",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/treatment-plans/:caseId/duties
 * Get duty modifications for a case
 */
router.get(
  "/:caseId/duties",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req, res) => {
    try {
      const { caseId } = req.params;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Fetch the case
      const workerCase = await storage.getGPNet2CaseById(caseId, organizationId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate plan and extract duty info
      const plan = treatmentPlanService.generatePlanFromCase(workerCase);

      res.json({
        success: true,
        caseId,
        workerName: workerCase.workerName,
        dutyModifications: plan.dutyModifications,
        suitableTaskExamples: plan.suitableTaskExamples,
        unsuiableTaskExamples: plan.unsuiableTaskExamples,
        safetyConsiderations: plan.safetyConsiderations,
        advisory: plan.advisory,
      });
    } catch (error) {
      console.error("[Treatment Plan] Error fetching duties:", error);
      res.status(500).json({
        error: "Failed to fetch duty modifications",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
