import { Router, type Response } from "express";
import { z } from "zod";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { storage } from "../storage";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "../services/auditLogger";
import type { RTWPlanStatus } from "@shared/schema";

const router = Router();

/**
 * Valid RTW plan status transitions
 * PRD-3.2.3: All transitions must be logged
 */
const VALID_TRANSITIONS: Record<RTWPlanStatus, RTWPlanStatus[]> = {
  not_planned: ["planned_not_started"],
  planned_not_started: ["in_progress", "on_hold", "not_planned"],
  in_progress: ["working_well", "failing", "on_hold", "completed"],
  working_well: ["in_progress", "completed", "on_hold"],
  failing: ["in_progress", "on_hold", "not_planned"],
  on_hold: ["planned_not_started", "in_progress", "not_planned"],
  completed: [], // Terminal state - no transitions out (admin override only)
};

/**
 * Validate RTW plan status transition
 */
function isValidTransition(from: RTWPlanStatus | undefined, to: RTWPlanStatus): boolean {
  // If no current status, treat as "not_planned"
  const currentStatus: RTWPlanStatus = from || "not_planned";

  // If same status, always valid (no-op)
  if (currentStatus === to) return true;

  return VALID_TRANSITIONS[currentStatus]?.includes(to) ?? false;
}

const RTW_STATUS_VALUES: RTWPlanStatus[] = [
  "not_planned",
  "planned_not_started",
  "in_progress",
  "working_well",
  "failing",
  "on_hold",
  "completed",
];

const updateRtwStatusSchema = z.object({
  rtwPlanStatus: z.enum(RTW_STATUS_VALUES as [RTWPlanStatus, ...RTWPlanStatus[]]),
  reason: z.string().min(1, "Reason is required for status changes").max(500),
  forceTransition: z.boolean().optional().default(false),
});

/**
 * GET /api/cases/:id/rtw-plan
 * Returns the current RTW plan status for a case
 * PRD-3.2.3: Case lifecycle states
 */
router.get("/:id/rtw-plan", authorize(), requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!;

    await logAuditEvent({
      userId: req.user!.id,
      organizationId: req.user!.organizationId,
      eventType: AuditEventTypes.CASE_VIEW,
      resourceType: "rtw_plan",
      resourceId: workerCase.id,
      ...getRequestMetadata(req),
    });

    res.json({
      caseId: workerCase.id,
      workerName: workerCase.workerName,
      rtwPlanStatus: workerCase.rtwPlanStatus || "not_planned",
      medicalConstraints: workerCase.medicalConstraints,
      functionalCapacity: workerCase.functionalCapacity,
      workStatus: workerCase.workStatus,
      validTransitions: VALID_TRANSITIONS[workerCase.rtwPlanStatus || "not_planned"],
    });
  } catch (err) {
    console.error("Failed to fetch RTW plan:", err);
    res.status(500).json({
      error: "Failed to fetch RTW plan",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/cases/:id/rtw-plan
 * Updates the RTW plan status for a case
 * PRD-3.2.3: Case lifecycle states, all transitions logged
 * PRD-3.4: Task & obligation engine integration
 */
router.put("/:id/rtw-plan", authorize(), requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!;

    const validationResult = updateRtwStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors,
      });
    }

    const { rtwPlanStatus, reason, forceTransition } = validationResult.data;
    const currentStatus = workerCase.rtwPlanStatus || "not_planned";

    // Check transition validity
    if (!forceTransition && !isValidTransition(currentStatus, rtwPlanStatus)) {
      return res.status(400).json({
        error: "Invalid status transition",
        details: `Cannot transition from '${currentStatus}' to '${rtwPlanStatus}'`,
        currentStatus,
        requestedStatus: rtwPlanStatus,
        validTransitions: VALID_TRANSITIONS[currentStatus],
      });
    }

    // Admin override for force transitions
    if (forceTransition && req.user!.role !== "admin") {
      return res.status(403).json({
        error: "Admin role required for forced transitions",
      });
    }

    // Update the clinical status with new RTW plan status
    await storage.updateClinicalStatus(workerCase.id, workerCase.organizationId, {
      rtwPlanStatus,
    });

    // Log audit event with transition details
    await logAuditEvent({
      userId: req.user!.id,
      organizationId: req.user!.organizationId,
      eventType: AuditEventTypes.CASE_UPDATE,
      resourceType: "rtw_plan",
      resourceId: workerCase.id,
      metadata: {
        previousStatus: currentStatus,
        newStatus: rtwPlanStatus,
        reason,
        forced: forceTransition,
      },
      ...getRequestMetadata(req),
    });

    const newStatus = rtwPlanStatus as RTWPlanStatus;
    res.json({
      success: true,
      caseId: workerCase.id,
      previousStatus: currentStatus,
      rtwPlanStatus: newStatus,
      validTransitions: VALID_TRANSITIONS[newStatus],
    });
  } catch (err) {
    console.error("Failed to update RTW plan:", err);
    res.status(500).json({
      error: "Failed to update RTW plan",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /api/rtw/overview
 * Returns RTW planning overview statistics across all cases
 * PRD-3.4: Task & obligation tracking
 */
router.get("/overview", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const cases = await storage.getGPNet2Cases(organizationId);

    const stats = {
      total: cases.length,
      offWork: cases.filter(c => c.workStatus === "Off work").length,
      notPlanned: cases.filter(c => !c.rtwPlanStatus || c.rtwPlanStatus === "not_planned").length,
      plannedNotStarted: cases.filter(c => c.rtwPlanStatus === "planned_not_started").length,
      inProgress: cases.filter(c => c.rtwPlanStatus === "in_progress").length,
      workingWell: cases.filter(c => c.rtwPlanStatus === "working_well").length,
      failing: cases.filter(c => c.rtwPlanStatus === "failing").length,
      onHold: cases.filter(c => c.rtwPlanStatus === "on_hold").length,
      completed: cases.filter(c => c.rtwPlanStatus === "completed").length,
    };

    await logAuditEvent({
      userId: req.user!.id,
      organizationId,
      eventType: AuditEventTypes.CASE_LIST,
      resourceType: "rtw_overview",
      ...getRequestMetadata(req),
    });

    res.json({
      stats,
      casesNeedingPlan: cases
        .filter(c => c.workStatus === "Off work" && (!c.rtwPlanStatus || c.rtwPlanStatus === "not_planned"))
        .map(c => ({
          id: c.id,
          workerName: c.workerName,
          company: c.company,
          dateOfInjury: c.dateOfInjury,
          daysOffWork: Math.floor((Date.now() - new Date(c.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)),
        })),
      failingPlans: cases
        .filter(c => c.rtwPlanStatus === "failing")
        .map(c => ({
          id: c.id,
          workerName: c.workerName,
          company: c.company,
        })),
    });
  } catch (err) {
    console.error("Failed to fetch RTW overview:", err);
    res.status(500).json({
      error: "Failed to fetch RTW overview",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
