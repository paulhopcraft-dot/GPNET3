/**
 * Email Drafts API Routes
 *
 * Endpoints for AI-powered email drafting.
 */

import express, { Request, Response } from "express";
import { z } from "zod";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { storage } from "../storage";
import {
  generateEmailDraft,
  getEmailDraftsByCase,
  getEmailDraftById,
  updateEmailDraft,
  deleteEmailDraft,
  getEmailTypes,
} from "../services/emailDraftService";

const router = express.Router();

// Zod schemas for validation
const generateSchema = z.object({
  emailType: z.enum([
    "initial_contact",
    "certificate_chase",
    "check_in_follow_up",
    "rtw_update",
    "duties_proposal",
    "non_compliance_warning",
    "employer_update",
    "insurer_report",
    "general_response",
  ]),
  recipient: z.enum(["worker", "employer", "insurer", "host", "other"]),
  recipientName: z.string().max(200).optional(),
  recipientEmail: z.string().email().optional(),
  additionalContext: z.string().max(1000).optional(),
  tone: z.enum(["formal", "supportive", "firm"]).optional(),
});

const updateSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).optional(),
  status: z.enum(["draft", "sent", "discarded"]).optional(),
  recipientName: z.string().max(200).optional(),
  recipientEmail: z.string().email().optional(),
});

/**
 * GET /api/email-drafts/types
 * List available email types for UI dropdown
 */
router.get("/email-drafts/types", authorize(), async (_req: Request, res: Response) => {
  try {
    const types = getEmailTypes();
    res.json({
      success: true,
      data: types,
    });
  } catch (error: any) {
    console.error("Failed to get email types:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get email types",
      message: error.message,
    });
  }
});

/**
 * POST /api/cases/:caseId/email-drafts/generate
 * Generate a new email draft using AI
 */
router.post(
  "/cases/:caseId/email-drafts/generate",
  authorize(),
  requireCaseOwnership(),
  async (req: AuthRequest, res: Response) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware
      const userId = req.user?.id || "unknown";

      // Validate request body
      const parseResult = generateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request body",
          details: parseResult.error.errors,
        });
      }

      const draft = await generateEmailDraft(storage, workerCase.id, workerCase.organizationId, parseResult.data, userId);

      res.json({
        success: true,
        data: draft,
      });
    } catch (error: any) {
      console.error("Email draft generation failed:", error);

      // Handle specific errors
      if (error.message?.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({
          success: false,
          error: "AI service unavailable",
          message: "Email drafting service is not configured",
        });
      }

      if (error.message?.includes("authentication_error") || error.message?.includes("invalid x-api-key")) {
        return res.status(503).json({
          success: false,
          error: "AI service unavailable",
          message: "Email drafting service authentication failed",
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to generate email draft",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/cases/:caseId/email-drafts
 * List all email drafts for a case
 */
router.get(
  "/cases/:caseId/email-drafts",
  authorize(),
  requireCaseOwnership(),
  async (req: AuthRequest, res: Response) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

      const drafts = await getEmailDraftsByCase(storage, workerCase.id, workerCase.organizationId);

      res.json({
        success: true,
        data: drafts,
      });
    } catch (error: any) {
      console.error("Failed to get email drafts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email drafts",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/cases/:caseId/email-drafts/:draftId
 * Get a single email draft
 */
router.get(
  "/cases/:caseId/email-drafts/:draftId",
  authorize(),
  async (req: Request, res: Response) => {
    try {
      const { caseId, draftId } = req.params;

      const draft = await getEmailDraftById(storage, draftId);
      if (!draft || draft.caseId !== caseId) {
        return res.status(404).json({
          success: false,
          error: "Email draft not found",
        });
      }

      res.json({
        success: true,
        data: draft,
      });
    } catch (error: any) {
      console.error("Failed to get email draft:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get email draft",
        message: error.message,
      });
    }
  }
);

/**
 * PATCH /api/cases/:caseId/email-drafts/:draftId
 * Update an email draft
 */
router.patch(
  "/cases/:caseId/email-drafts/:draftId",
  authorize(),
  async (req: Request, res: Response) => {
    try {
      const { caseId, draftId } = req.params;

      // Validate draft exists and belongs to case
      const existing = await getEmailDraftById(storage, draftId);
      if (!existing || existing.caseId !== caseId) {
        return res.status(404).json({
          success: false,
          error: "Email draft not found",
        });
      }

      // Validate request body
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request body",
          details: parseResult.error.errors,
        });
      }

      const updated = await updateEmailDraft(storage, draftId, parseResult.data);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      console.error("Failed to update email draft:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update email draft",
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/cases/:caseId/email-drafts/:draftId
 * Delete an email draft
 */
router.delete(
  "/cases/:caseId/email-drafts/:draftId",
  authorize(),
  async (req: Request, res: Response) => {
    try {
      const { caseId, draftId } = req.params;

      // Validate draft exists and belongs to case
      const existing = await getEmailDraftById(storage, draftId);
      if (!existing || existing.caseId !== caseId) {
        return res.status(404).json({
          success: false,
          error: "Email draft not found",
        });
      }

      await deleteEmailDraft(storage, draftId);

      res.json({
        success: true,
        message: "Email draft deleted",
      });
    } catch (error: any) {
      console.error("Failed to delete email draft:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete email draft",
        message: error.message,
      });
    }
  }
);

export default router;
