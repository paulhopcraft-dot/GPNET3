import express, { type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authorize } from "../middleware/auth";
import type { CaseActionStatus, CaseActionType } from "@shared/schema";
import {
  getCaseCompliance,
  processComplianceForCase,
  getCertificatesWithStatus,
} from "../services/certificateCompliance";

const router = express.Router();

// Authentication middleware
const requireAuth = authorize();

// =====================================================
// Action Queue Endpoints
// =====================================================

/**
 * GET /api/actions
 * Get all pending actions with case info (for Action Queue dashboard)
 */
router.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const status = (_req.query.status as CaseActionStatus) || "pending";
    const limit = parseInt(_req.query.limit as string) || 50;

    const actions = await storage.getAllActionsWithCaseInfo({ status, limit });
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
router.get("/pending", requireAuth, async (_req: Request, res: Response) => {
  try {
    const limit = parseInt(_req.query.limit as string) || 10;
    const actions = await storage.getPendingActions(limit);
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
router.get("/overdue", requireAuth, async (_req: Request, res: Response) => {
  try {
    const limit = parseInt(_req.query.limit as string) || 10;
    const actions = await storage.getOverdueActions(limit);
    res.json({ success: true, data: actions });
  } catch (error: any) {
    console.error("Error fetching overdue actions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/actions/:id
 * Get a single action by ID
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const action = await storage.getActionById(req.params.id);

    if (!action) {
      return res.status(404).json({ success: false, message: "Action not found" });
    }

    res.json({ success: true, data: action });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/actions/:id
 * Update an action (status, notes, dueDate, etc.)
 */
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const updateSchema = z.object({
      status: z.enum(["pending", "done", "cancelled"]).optional(),
      dueDate: z.string().datetime().optional(),
      priority: z.number().optional(),
      notes: z.string().optional(),
    });

    const updates = updateSchema.parse(req.body);
    const action = await storage.getActionById(req.params.id);

    if (!action) {
      return res.status(404).json({ success: false, message: "Action not found" });
    }

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
 */
router.post("/:id/done", requireAuth, async (req: Request, res: Response) => {
  try {
    const action = await storage.getActionById(req.params.id);

    if (!action) {
      return res.status(404).json({ success: false, message: "Action not found" });
    }

    const updated = await storage.markActionDone(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/actions/:id/cancel
 * Mark an action as cancelled
 */
router.post("/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const action = await storage.getActionById(req.params.id);

    if (!action) {
      return res.status(404).json({ success: false, message: "Action not found" });
    }

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
 * GET /api/cases/:caseId/actions
 * Get all actions for a specific case
 */
router.get("/case/:caseId", requireAuth, async (req: Request, res: Response) => {
  try {
    const actions = await storage.getActionsByCase(req.params.caseId);
    res.json({ success: true, data: actions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/cases/:caseId/actions
 * Create a new action for a case
 */
router.post("/case/:caseId", requireAuth, async (req: Request, res: Response) => {
  try {
    const createSchema = z.object({
      type: z.enum(["chase_certificate", "review_case", "follow_up"]),
      dueDate: z.string().datetime().optional(),
      priority: z.number().optional(),
      notes: z.string().optional(),
    });

    const data = createSchema.parse(req.body);
    const caseId = req.params.caseId;

    // Check if case exists
    const workerCase = await storage.getGPNet2CaseById(caseId);
    if (!workerCase) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const action = await storage.createAction({
      caseId,
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
 * GET /api/cases/:caseId/compliance
 * Get certificate compliance status for a case
 */
router.get("/case/:caseId/compliance", requireAuth, async (req: Request, res: Response) => {
  try {
    const caseId = req.params.caseId;

    // Check if case exists
    const workerCase = await storage.getGPNet2CaseById(caseId);
    if (!workerCase) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const compliance = await getCaseCompliance(storage, caseId);
    res.json({ success: true, data: compliance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/cases/:caseId/compliance/sync
 * Compute compliance and sync actions for a case
 */
router.post("/case/:caseId/compliance/sync", requireAuth, async (req: Request, res: Response) => {
  try {
    const caseId = req.params.caseId;

    // Check if case exists
    const workerCase = await storage.getGPNet2CaseById(caseId);
    if (!workerCase) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const compliance = await processComplianceForCase(storage, caseId);
    res.json({ success: true, data: compliance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/cases/:caseId/certificates-with-status
 * Get certificates with display status (active, expiring_soon, expired)
 */
router.get("/case/:caseId/certificates-with-status", requireAuth, async (req: Request, res: Response) => {
  try {
    const caseId = req.params.caseId;

    // Check if case exists
    const workerCase = await storage.getGPNet2CaseById(caseId);
    if (!workerCase) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const dbCerts = await storage.getCertificatesByCase(caseId);
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
