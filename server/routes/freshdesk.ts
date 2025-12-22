/**
 * Freshdesk Mirroring Routes (PRD-7, PRD-3.6)
 *
 * Endpoints:
 * - POST /api/freshdesk/webhook - Receive Freshdesk webhook events
 * - POST /api/freshdesk/sync - Manual sync trigger (admin)
 * - POST /api/freshdesk/mirror/:caseId - Mirror conversations for a case
 * - GET /api/freshdesk/status - Check Freshdesk integration status
 */

import express, { type Response } from "express";
import { z } from "zod";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import {
  freshdeskMirroringService,
  type FreshdeskWebhookPayload,
} from "../services/freshdeskMirroring";
import { FreshdeskService } from "../services/freshdesk";
import { storage } from "../storage";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "../services/auditLogger";

const router = express.Router();

// Webhook payload validation schema
const freshdeskWebhookSchema = z.object({
  freshdesk_webhook: z.object({
    ticket_id: z.number(),
    ticket_subject: z.string(),
    ticket_status: z.number(),
    ticket_priority: z.number(),
    ticket_type: z.string().nullable(),
    ticket_description: z.string().optional().default(""),
    ticket_description_text: z.string().optional().default(""),
    ticket_created_at: z.string(),
    ticket_updated_at: z.string(),
    ticket_due_by: z.string().nullable(),
    ticket_tags: z.array(z.string()).optional().default([]),
    ticket_custom_fields: z.record(z.unknown()).optional().default({}),
    triggered_event: z.string(),
    requester_name: z.string().optional().default(""),
    requester_email: z.string().optional().default(""),
    company_name: z.string().nullable(),
  }),
});

/**
 * POST /api/freshdesk/webhook
 * Receive Freshdesk webhook events for real-time ticket mirroring
 *
 * Security: Webhook password verification via query param or header
 */
router.post("/webhook", async (req, res: Response) => {
  try {
    // Verify webhook password
    const webhookPassword = process.env.FRESHDESK_WEBHOOK_PASSWORD;
    const providedPassword =
      req.query.password || req.headers["x-freshdesk-webhook-password"];

    if (webhookPassword && providedPassword !== webhookPassword) {
      console.warn("[Freshdesk Webhook] Invalid password");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Parse and validate payload
    const parseResult = freshdeskWebhookSchema.safeParse(req.body);

    if (!parseResult.success) {
      console.warn("[Freshdesk Webhook] Invalid payload:", parseResult.error);
      return res.status(400).json({
        error: "Invalid webhook payload",
        details: parseResult.error.errors,
      });
    }

    const payload = parseResult.data as FreshdeskWebhookPayload;

    // Determine organization from ticket (use default org for now)
    // In production, this would map company_name to organizationId
    const organizationId = process.env.DEFAULT_ORGANIZATION_ID || "default";

    // Process the webhook
    const result = await freshdeskMirroringService.handleWebhook(payload, organizationId);

    console.log(
      `[Freshdesk Webhook] Processed: ticket=${result.ticketId}, case=${result.caseId}, mirrored=${result.conversationsMirrored}`
    );

    res.json({
      success: result.success,
      ticketId: result.ticketId,
      caseId: result.caseId,
      conversationsMirrored: result.conversationsMirrored,
    });
  } catch (error) {
    console.error("[Freshdesk Webhook] Error:", error);
    res.status(500).json({
      error: "Webhook processing failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/freshdesk/sync
 * Manual sync trigger - fetches all tickets and syncs to cases
 * Admin only
 */
router.post("/sync", authorize(["admin"]), async (req: AuthRequest, res: Response) => {
  // Check if Freshdesk is configured
  if (!process.env.FRESHDESK_DOMAIN || !process.env.FRESHDESK_API_KEY) {
    return res.json({
      success: true,
      synced: 0,
      message: "Freshdesk sync skipped - not configured",
      configured: false,
    });
  }

  try {
    const freshdesk = new FreshdeskService();
    const tickets = await freshdesk.fetchTickets();
    const workerCases = await freshdesk.transformTicketsToWorkerCases(tickets);

    let synced = 0;
    for (const workerCase of workerCases) {
      await storage.syncWorkerCaseFromFreshdesk(workerCase);
      synced++;
    }

    // Log audit event
    await logAuditEvent({
      userId: req.user!.id,
      organizationId: req.user!.organizationId,
      eventType: AuditEventTypes.FRESHDESK_SYNC,
      metadata: {
        ticketsFetched: tickets.length,
        casesSynced: synced,
        manual: true,
      },
      ...getRequestMetadata(req),
    });

    res.json({
      success: true,
      synced,
      message: `Successfully synced ${synced} cases from Freshdesk`,
      configured: true,
    });
  } catch (error) {
    console.error("[Freshdesk Sync] Error:", error);
    res.status(500).json({
      error: "Failed to sync Freshdesk tickets",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/freshdesk/mirror/:caseId
 * Mirror all ticket conversations for a specific case
 */
router.post(
  "/mirror/:caseId",
  authorize(),
  requireCaseOwnership(),
  async (req: AuthRequest, res: Response) => {
    try {
      const workerCase = req.workerCase!;

      if (!freshdeskMirroringService.isConfigured()) {
        return res.json({
          success: true,
          message: "Freshdesk not configured",
          configured: false,
          results: [],
        });
      }

      const results = await freshdeskMirroringService.fullSyncCase(
        workerCase.id,
        workerCase.organizationId
      );

      const totalMirrored = results.reduce((sum, r) => sum + r.conversationsMirrored, 0);

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.FRESHDESK_SYNC,
        resourceType: "worker_case",
        resourceId: workerCase.id,
        metadata: {
          ticketsMirrored: results.length,
          conversationsMirrored: totalMirrored,
        },
        ...getRequestMetadata(req),
      });

      res.json({
        success: true,
        caseId: workerCase.id,
        ticketsMirrored: results.length,
        conversationsMirrored: totalMirrored,
        results,
        configured: true,
      });
    } catch (error) {
      console.error("[Freshdesk Mirror] Error:", error);
      res.status(500).json({
        error: "Failed to mirror Freshdesk conversations",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/freshdesk/status
 * Check Freshdesk integration status
 */
router.get("/status", authorize(), async (_req: AuthRequest, res: Response) => {
  const configured = freshdeskMirroringService.isConfigured();

  res.json({
    configured,
    domain: configured ? process.env.FRESHDESK_DOMAIN?.replace(/^https?:\/\//, "").replace(/\.freshdesk\.com.*$/, "") : null,
    webhookEnabled: !!process.env.FRESHDESK_WEBHOOK_PASSWORD,
    features: {
      ticketSync: configured,
      conversationMirroring: configured,
      webhookHandler: true,
    },
  });
});

export default router;
