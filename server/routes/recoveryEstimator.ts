/**
 * Recovery Estimator API Routes (PRD-25, Spec-14)
 *
 * Endpoints for estimating and tracking recovery timelines.
 */

import express from "express";
import { authorize, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { recoveryEstimatorService } from "../services/recoveryEstimatorService";
import { logAuditEvent, AuditEventTypes } from "../services/auditLogger";

const router = express.Router();

/**
 * GET /api/recovery/:caseId/estimate
 * Get recovery estimate for a case
 */
router.get(
  "/:caseId/estimate",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req: AuthRequest, res) => {
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

      // Fetch certificates for analysis
      const certificates = await storage.getCaseRecoveryTimeline(caseId, organizationId);

      // Generate recovery estimate
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase, certificates);

      // Log audit event
      await logAuditEvent({
        userId: req.user?.id ?? "system",
        organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "recovery_estimate",
        resourceId: caseId,
      });

      res.json({
        success: true,
        estimate,
      });
    } catch (error) {
      console.error("[Recovery Estimator] Error generating estimate:", error);
      res.status(500).json({
        error: "Failed to generate recovery estimate",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/recovery/:caseId/trajectory
 * Get recovery trajectory data for charting
 */
router.get(
  "/:caseId/trajectory",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req: AuthRequest, res) => {
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

      // Fetch certificates
      const certificates = await storage.getCaseRecoveryTimeline(caseId, organizationId);

      // Generate estimate to get trajectory
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase, certificates);

      res.json({
        success: true,
        caseId,
        workerName: workerCase.workerName,
        trajectory: estimate.trajectory,
        expectedDurationWeeks: estimate.expectedDurationWeeks,
        progressStatus: estimate.progressStatus,
        progressPercentage: estimate.progressPercentage,
        advisory: estimate.advisory,
      });
    } catch (error) {
      console.error("[Recovery Estimator] Error fetching trajectory:", error);
      res.status(500).json({
        error: "Failed to fetch recovery trajectory",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/recovery/:caseId/milestones
 * Get recovery milestones for a case
 */
router.get(
  "/:caseId/milestones",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req: AuthRequest, res) => {
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

      // Fetch certificates
      const certificates = await storage.getCaseRecoveryTimeline(caseId, organizationId);

      // Generate estimate to get milestones
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase, certificates);

      res.json({
        success: true,
        caseId,
        workerName: workerCase.workerName,
        milestones: estimate.milestones,
        nextMilestone: estimate.nextMilestone,
        progressStatus: estimate.progressStatus,
        daysAheadOrBehind: estimate.daysAheadOrBehind,
        advisory: estimate.advisory,
      });
    } catch (error) {
      console.error("[Recovery Estimator] Error fetching milestones:", error);
      res.status(500).json({
        error: "Failed to fetch recovery milestones",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/recovery/:caseId/factors
 * Get risk and positive factors for a case
 */
router.get(
  "/:caseId/factors",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req: AuthRequest, res) => {
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

      // Fetch certificates
      const certificates = await storage.getCaseRecoveryTimeline(caseId, organizationId);

      // Generate estimate
      const estimate = recoveryEstimatorService.estimateFromCase(workerCase, certificates);

      res.json({
        success: true,
        caseId,
        workerName: workerCase.workerName,
        injuryCategory: estimate.injuryCategory,
        progressStatus: estimate.progressStatus,
        riskFactors: estimate.riskFactors,
        positiveFactors: estimate.positiveFactors,
        confidenceScore: estimate.confidenceScore,
        advisory: estimate.advisory,
      });
    } catch (error) {
      console.error("[Recovery Estimator] Error fetching factors:", error);
      res.status(500).json({
        error: "Failed to fetch recovery factors",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/recovery/summary
 * Get recovery summary across all cases
 */
router.get(
  "/summary",
  authorize(["admin", "clinician", "employer", "insurer"]),
  async (req: AuthRequest, res) => {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID required" });
      }

      // Fetch all cases
      const cases = await storage.getGPNet2Cases(organizationId);

      // Generate estimates for each case
      const estimates = await Promise.all(
        cases.slice(0, 50).map(async (workerCase) => {
          const certificates = await storage.getCaseRecoveryTimeline(
            workerCase.id,
            organizationId
          ).catch(() => []);
          return recoveryEstimatorService.estimateFromCase(workerCase, certificates);
        })
      );

      // Calculate summary statistics
      const statusCounts = {
        ahead_of_schedule: 0,
        on_track: 0,
        slight_delay: 0,
        behind_schedule: 0,
        stalled: 0,
        deteriorating: 0,
        unknown: 0,
      };

      const categoryCounts: Record<string, number> = {};
      let totalConfidence = 0;

      for (const estimate of estimates) {
        statusCounts[estimate.progressStatus]++;
        categoryCounts[estimate.injuryCategory] = (categoryCounts[estimate.injuryCategory] || 0) + 1;
        totalConfidence += estimate.confidenceScore;
      }

      const averageConfidence = estimates.length > 0
        ? Math.round((totalConfidence / estimates.length) * 100) / 100
        : 0;

      // Find cases needing attention
      const casesNeedingAttention = estimates
        .filter(e =>
          e.progressStatus === "behind_schedule" ||
          e.progressStatus === "stalled" ||
          e.progressStatus === "deteriorating"
        )
        .map(e => ({
          caseId: e.caseId,
          workerName: e.workerName,
          progressStatus: e.progressStatus,
          daysAheadOrBehind: e.daysAheadOrBehind,
          riskFactors: e.riskFactors,
        }));

      res.json({
        success: true,
        totalCases: estimates.length,
        statusCounts,
        categoryCounts,
        averageConfidence,
        casesNeedingAttention: casesNeedingAttention.slice(0, 10),
        advisory: true,
      });
    } catch (error) {
      console.error("[Recovery Estimator] Error generating summary:", error);
      res.status(500).json({
        error: "Failed to generate recovery summary",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
