import express, { type Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "../services/auditLogger";
import type { RTWPlanStatus, CaseClinicalStatus } from "@shared/schema";

const router = express.Router();

// Valid RTW plan statuses per PRD-3.2.3
const RTW_STATUSES: RTWPlanStatus[] = [
  "not_planned",
  "planned_not_started",
  "in_progress",
  "working_well",
  "failing",
  "on_hold",
  "completed",
];

// Zod schema for RTW plan update
const rtwPlanUpdateSchema = z.object({
  status: z.enum([
    "not_planned",
    "planned_not_started",
    "in_progress",
    "working_well",
    "failing",
    "on_hold",
    "completed",
  ]),
  notes: z.string().optional(),
  targetDate: z.string().optional(),
  restrictions: z.array(z.string()).optional(),
  dutiesAssigned: z.boolean().optional(),
  hostSite: z.string().optional(),
});

/**
 * GET /api/cases/:caseId/rtw-plan
 * Get RTW plan status for a case
 */
router.get(
  "/:caseId/rtw-plan",
  authorize(),
  requireCaseOwnership(),
  async (req: AuthRequest, res: Response) => {
    try {
      const workerCase = req.workerCase!;

      res.json({
        success: true,
        data: {
          caseId: workerCase.id,
          workerName: workerCase.workerName,
          workStatus: workerCase.workStatus,
          rtwPlanStatus: workerCase.rtwPlanStatus || "not_planned",
          medicalConstraints: workerCase.medicalConstraints,
          functionalCapacity: workerCase.functionalCapacity,
          complianceStatus: workerCase.complianceStatus,
          dateOfInjury: workerCase.dateOfInjury,
          latestCertificate: workerCase.latestCertificate,
        },
      });
    } catch (error) {
      console.error("Failed to get RTW plan:", error);
      res.status(500).json({ success: false, message: "Failed to get RTW plan" });
    }
  }
);

/**
 * PATCH /api/cases/:caseId/rtw-plan
 * Update RTW plan status for a case
 *
 * Per PRD-3.2.3: All state transitions must be logged
 */
router.patch(
  "/:caseId/rtw-plan",
  authorize(),
  requireCaseOwnership(),
  async (req: AuthRequest, res: Response) => {
    try {
      const workerCase = req.workerCase!;
      const user = req.user!;
      const organizationId = user.organizationId;

      // Validate input
      const parseResult = rtwPlanUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }

      const { status, notes } = parseResult.data;
      const previousStatus = workerCase.rtwPlanStatus || "not_planned";

      // Update clinical status with new RTW plan status
      const clinicalStatusUpdate: CaseClinicalStatus = {
        rtwPlanStatus: status,
      };

      await storage.updateClinicalStatus(workerCase.id, organizationId, clinicalStatusUpdate);

      // Log the state transition per PRD-3.2.3
      await logAuditEvent({
        userId: user.id,
        organizationId,
        eventType: AuditEventTypes.CASE_UPDATE,
        resourceType: "worker_case",
        resourceId: workerCase.id,
        metadata: {
          field: "rtwPlanStatus",
          previousValue: previousStatus,
          newValue: status,
          notes,
          transitionType: "rtw_plan_update",
        },
        ...getRequestMetadata(req),
      });

      // Get updated case
      const updatedCase = await storage.getGPNet2CaseById(workerCase.id, organizationId);

      res.json({
        success: true,
        data: {
          caseId: workerCase.id,
          previousStatus,
          newStatus: status,
          rtwPlanStatus: updatedCase?.rtwPlanStatus || status,
        },
        message: `RTW plan status updated from ${previousStatus} to ${status}`,
      });
    } catch (error) {
      console.error("Failed to update RTW plan:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update RTW plan",
      });
    }
  }
);

/**
 * GET /api/rtw/summary
 * Get RTW summary statistics for the organization
 */
router.get("/summary", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const cases = await storage.getGPNet2Cases(organizationId);

    const stats = {
      total: cases.length,
      offWork: cases.filter((c) => c.workStatus === "Off work").length,
      atWork: cases.filter((c) => c.workStatus === "At work").length,
      byRtwStatus: {
        not_planned: 0,
        planned_not_started: 0,
        in_progress: 0,
        working_well: 0,
        failing: 0,
        on_hold: 0,
        completed: 0,
      } as Record<RTWPlanStatus, number>,
    };

    // Count by RTW status
    for (const workerCase of cases) {
      const status = workerCase.rtwPlanStatus || "not_planned";
      if (status in stats.byRtwStatus) {
        stats.byRtwStatus[status as RTWPlanStatus]++;
      }
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Failed to get RTW summary:", error);
    res.status(500).json({ success: false, message: "Failed to get RTW summary" });
  }
});

export default router;
