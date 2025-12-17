import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import type { CaseActionStatus, CaseActionType, CaseActionDB } from "@shared/schema";
import {
  getCaseCompliance,
  processComplianceForCase,
  getCertificatesWithStatus,
} from "../services/certificateCompliance";
import { logAuditEvent, AuditEventTypes } from "../services/auditLogger";

const router = express.Router();

// Authentication middleware
const requireAuth = authorize();

// Extend AuthRequest to include action
interface ActionAuthRequest extends AuthRequest {
  action?: CaseActionDB;
}

/**
 * Middleware to verify that the authenticated user has access to the requested action.
 *
 * SECURITY:
 * - Admins can access any action (cross-tenant)
 * - Non-admin users can only access actions belonging to cases in their organization
 * - Returns 404 (not 403) to prevent information disclosure
 */
function requireActionOwnership() {
  return async (req: ActionAuthRequest, res: Response, next: NextFunction) => {
    try {
      const actionId = req.params.id;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Fetch the action
      const action = await storage.getActionById(actionId);
      if (!action) {
        return res.status(404).json({ success: false, message: "Action not found" });
      }

      // Admin bypass - admins can access all actions
      if (user.role === "admin") {
        req.action = action;
        return next();
      }

      // Non-admin: verify action belongs to user's organization
      // Actions have organizationId directly on them
      if (action.organizationId !== user.organizationId) {
        // Log access denial
        await logAuditEvent({
          userId: user.id,
          organizationId: user.organizationId,
          eventType: AuditEventTypes.ACCESS_DENIED,
          resourceType: "case_action",
          resourceId: actionId,
          metadata: {
            reason: "action_wrong_org",
            attemptedActionId: actionId,
            actionOrganizationId: action.organizationId,
            userOrganizationId: user.organizationId,
          },
        });

        // Return 404 to prevent information disclosure
        return res.status(404).json({ success: false, message: "Action not found" });
      }

      // Attach action to request for downstream handlers
      req.action = action;
      next();
    } catch (error) {
      console.error("[ActionOwnership] Authorization check failed:", error);
      return res.status(500).json({ success: false, message: "Authorization check failed" });
    }
  };
}

// =====================================================
// Action Queue Endpoints
// =====================================================

/**
 * GET /api/actions
 * Get all pending actions with case info (for Action Queue dashboard)
 */
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const status = (req.query.status as CaseActionStatus) || "pending";
    const limit = parseInt(req.query.limit as string) || 50;

    const actions = await storage.getAllActionsWithCaseInfo(organizationId, { status, limit });
    res.json({ success: true, data: actions });
  } catch (error: any) {
    console.error("Error fetching actions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/actions/pending
 * Get pending actions sorted by due date
 */
router.get("/pending", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const limit = parseInt(req.query.limit as string) || 10;
    const actions = await storage.getPendingActions(organizationId, limit);
    res.json({ success: true, data: actions });
  } catch (error: any) {
    console.error("Error fetching pending actions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/actions/overdue
 * Get overdue actions (pending + past due date)
 */
router.get("/overdue", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const limit = parseInt(req.query.limit as string) || 10;
    const actions = await storage.getOverdueActions(organizationId, limit);
    res.json({ success: true, data: actions });
  } catch (error: any) {
    console.error("Error fetching overdue actions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/actions/:id
 * Get a single action by ID
 * SECURITY: requireActionOwnership validates user can access this action
 */
router.get("/:id", requireAuth, requireActionOwnership(), async (req: ActionAuthRequest, res: Response) => {
  try {
    // Action already validated and attached by middleware
    res.json({ success: true, data: req.action });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/actions/:id
 * Update an action (status, notes, dueDate, etc.)
 * SECURITY: requireActionOwnership validates user can access this action
 */
router.patch("/:id", requireAuth, requireActionOwnership(), async (req: ActionAuthRequest, res: Response) => {
  try {
    const updateSchema = z.object({
      status: z.enum(["pending", "done", "cancelled"]).optional(),
      dueDate: z.string().datetime().optional(),
      priority: z.number().optional(),
      notes: z.string().optional(),
    });

    const updates = updateSchema.parse(req.body);
    // Action already validated by middleware

    const updated = await storage.updateAction(req.params.id, {
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/actions/:id/done
 * Mark an action as done
 * SECURITY: requireActionOwnership validates user can access this action
 */
router.post("/:id/done", requireAuth, requireActionOwnership(), async (req: ActionAuthRequest, res: Response) => {
  try {
    // Action already validated by middleware
    const updated = await storage.markActionDone(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/actions/:id/cancel
 * Mark an action as cancelled
 * SECURITY: requireActionOwnership validates user can access this action
 */
router.post("/:id/cancel", requireAuth, requireActionOwnership(), async (req: ActionAuthRequest, res: Response) => {
  try {
    // Action already validated by middleware
    const updated = await storage.markActionCancelled(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================
// Case-specific Action and Compliance Endpoints
// =====================================================

/**
 * GET /api/actions/case/:caseId
 * Get all actions for a specific case
 */
router.get("/case/:caseId", requireAuth, requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware
    const actions = await storage.getActionsByCase(workerCase.id, workerCase.organizationId);
    res.json({ success: true, data: actions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/actions/case/:caseId
 * Create a new action for a case
 */
router.post("/case/:caseId", requireAuth, requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const createSchema = z.object({
      type: z.enum(["chase_certificate", "review_case", "follow_up"]),
      dueDate: z.string().datetime().optional(),
      priority: z.number().optional(),
      notes: z.string().optional(),
    });

    const data = createSchema.parse(req.body);
    const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

    const action = await storage.createAction({
      organizationId: workerCase.organizationId,
      caseId: workerCase.id,
      type: data.type,
      status: "pending",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority ?? 1,
      notes: data.notes,
    });

    res.json({ success: true, data: action });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/actions/case/:caseId/compliance
 * Get certificate compliance status for a case
 */
router.get("/case/:caseId/compliance", requireAuth, requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

    const compliance = await getCaseCompliance(storage, workerCase.id);
    res.json({ success: true, data: compliance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/actions/case/:caseId/compliance/sync
 * Compute compliance and sync actions for a case
 */
router.post("/case/:caseId/compliance/sync", requireAuth, requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

    const compliance = await processComplianceForCase(storage, workerCase.id);
    res.json({ success: true, data: compliance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/actions/case/:caseId/certificates-with-status
 * Get certificates with display status (active, expiring_soon, expired)
 */
router.get("/case/:caseId/certificates-with-status", requireAuth, requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

    const dbCerts = await storage.getCertificatesByCase(workerCase.id);
    const certificates = dbCerts.map(cert => ({
      id: cert.id,
      caseId: cert.caseId,
      issueDate: cert.issueDate?.toISOString() ?? cert.startDate.toISOString(),
      startDate: cert.startDate.toISOString(),
      endDate: cert.endDate.toISOString(),
      capacity: cert.capacity as "fit" | "partial" | "unfit" | "unknown",
      notes: cert.notes ?? undefined,
      source: (cert.source as "freshdesk" | "manual") ?? "freshdesk",
      documentUrl: cert.documentUrl ?? undefined,
      sourceReference: cert.sourceReference ?? undefined,
      createdAt: cert.createdAt?.toISOString(),
      updatedAt: cert.updatedAt?.toISOString(),
    }));

    const certsWithStatus = getCertificatesWithStatus(certificates);

    // Sort by startDate descending (newest first)
    certsWithStatus.sort((a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    res.json({ success: true, data: certsWithStatus });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
