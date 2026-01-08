import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { FreshdeskService } from "./services/freshdesk";
import { syncScheduler } from "./services/syncScheduler";
import { complianceScheduler } from "./services/complianceScheduler";
import { summaryService } from "./services/summary";
import Anthropic from "@anthropic-ai/sdk";
import { logger, createLogger } from "./lib/logger";

const routeLogger = createLogger("Routes");
import authRoutes from "./routes/auth";
import terminationRoutes from "./routes/termination";
import inviteRoutes from "./routes/invites";
import webhookRoutes from "./routes/webhooks";
import certificateRoutes from "./routes/certificates";
import actionRoutes from "./routes/actions";
import smartSummaryRoutes from "./routes/smartSummary";
import emailDraftRoutes from "./routes/emailDrafts";
import notificationRoutes from "./routes/notifications";
import adminOrganizationRoutes from "./routes/admin/organizations";
import adminInsurerRoutes from "./routes/admin/insurers";
import organizationRoutes from "./routes/organization";
import caseChatRoutes from "./routes/caseChat";
import rtwRoutes from "./routes/rtw";
import predictionRoutes from "./routes/predictions";
import { registerTimelineRoutes } from "./routes/timeline";
import { registerTreatmentPlanRoutes } from "./routes/treatmentPlan";
import type { RecoveryTimelineSummary } from "@shared/schema";
import { evaluateClinicalEvidence } from "./services/clinicalEvidence";
import { authorize, type AuthRequest } from "./middleware/auth";
import { requireCaseOwnership } from "./middleware/caseOwnership";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "./services/auditLogger";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function registerRoutes(app: Express): Promise<void> {
  // Authentication routes
  app.use("/api/auth", authRoutes);
  app.use("/api/termination", terminationRoutes);

  // Admin invite routes (requires admin authentication)
  app.use("/api/admin/invites", inviteRoutes);

  // Admin organization management routes (requires admin authentication)
  app.use("/api/admin/organizations", adminOrganizationRoutes);

  // Admin insurer management routes (requires admin authentication)
  app.use("/api/admin/insurers", adminInsurerRoutes);

  // Organization self-service routes (authenticated users)
  app.use("/api/organization", organizationRoutes);

  // Webhook routes (password-protected, fail-closed security)
  app.use("/api/webhooks", webhookRoutes);

  // Certificate Engine v1 routes (JWT-protected)
  app.use("/api/certificates", certificateRoutes);

  // Action Queue v1 routes (JWT-protected)
  app.use("/api/actions", actionRoutes);

  // Smart Summary Engine v1 routes (JWT-protected)
  app.use("/api/cases", smartSummaryRoutes);

  // Case Chat routes (JWT-protected, case ownership)
  app.use("/api/cases", caseChatRoutes);

  // RTW Plan routes (JWT-protected, case ownership)
  app.use("/api/cases", rtwRoutes);
  app.use("/api/rtw", rtwRoutes);

  // Prediction Engine routes (PRD-9: AI & Intelligence Layer)
  app.use("/api/predictions", predictionRoutes);
  app.use("/api/cases", predictionRoutes);

  // Timeline Estimator routes (JWT-protected, case ownership)
  registerTimelineRoutes(app);

  // Treatment Plan routes (JWT-protected, case ownership, PRD-9 compliant)
  registerTreatmentPlanRoutes(app, storage);

  // Email Drafts routes (JWT-protected)
  app.use("/api", emailDraftRoutes);

  // Notification Engine v1 routes (JWT-protected, admin)
  app.use("/api/notifications", notificationRoutes);

  // Local diagnostics (non-sensitive env presence check)
  app.get("/api/diagnostics/env", (_req, res) => {
    res.json({
      DATABASE_URL: !!process.env.DATABASE_URL,
      FRESHDESK_DOMAIN: !!process.env.FRESHDESK_DOMAIN,
      FRESHDESK_API_KEY: !!process.env.FRESHDESK_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    });
  });
  // Claude compliance assistant - input validation schema
  const complianceRequestSchema = z.object({
    message: z.string()
      .min(1, "Message is required")
      .max(4000, "Message too long (max 4000 characters)")
      .trim(),
  });

  app.post("/api/compliance", authorize(), async (req: AuthRequest, res) => {
    // Validate input with Zod
    const parseResult = complianceRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.errors.map(e => e.message).join(", ")
      });
    }

    const { message } = parseResult.data;

    // Check API key before making request
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: "Compliance service unavailable",
      });
    }

    try {
      // Get user's cases for context
      const organizationId = req.user!.role === 'admin' ? undefined : req.user!.organizationId;
      const paginatedData = await storage.getGPNet2CasesPaginated(organizationId, 1, 200);
      const cases = paginatedData.cases;

      // Build context summary
      const totalCases = cases.length;
      const offWorkCases = cases.filter(c => c.workStatus === 'Off work').length;
      const atWorkCases = cases.filter(c => c.workStatus === 'At work').length;
      const highRiskCases = cases.filter(c => c.complianceIndicator === 'High').length;
      const mediumRiskCases = cases.filter(c => c.complianceIndicator === 'Medium').length;
      const lowRiskCases = cases.filter(c => c.complianceIndicator === 'Low').length;

      // Get unique companies
      const companies = [...new Set(cases.map(c => c.company))].sort();

      // Check if user is asking about a specific case
      const caseMentioned = cases.find(c =>
        message.toLowerCase().includes(c.workerName.toLowerCase()) ||
        message.toLowerCase().includes(c.company.toLowerCase())
      );

      // Build context for AI
      let contextData = `
CURRENT CASE DATA:
- Total Cases: ${totalCases}
- Off Work: ${offWorkCases}
- At Work: ${atWorkCases}
- High Risk: ${highRiskCases}
- Medium Risk: ${mediumRiskCases}
- Low Risk: ${lowRiskCases}
- Companies: ${companies.join(', ')}
`.trim();

      // If asking about a specific case, provide detailed context
      if (caseMentioned) {
        contextData += `\n\nSPECIFIC CASE DETAILS:
Worker: ${caseMentioned.workerName}
Company: ${caseMentioned.company}
Work Status: ${caseMentioned.workStatus}
Risk Level: ${caseMentioned.complianceIndicator}
Date of Injury: ${caseMentioned.dateOfInjury}
Has Medical Certificate: ${caseMentioned.hasCertificate ? 'Yes' : 'No'}
Current Status: ${caseMentioned.currentStatus || 'N/A'}
Next Step: ${caseMentioned.nextStep || 'Pending review'}
Due Date: ${caseMentioned.dueDate || 'Not set'}
Summary: ${caseMentioned.summary || 'No summary available'}`;
      } else {
        // Show sample of recent cases
        contextData += `\n\nRecent Cases (sample):
${cases.slice(0, 10).map(c => `- ${c.workerName} (${c.company}): ${c.workStatus}, ${c.complianceIndicator} risk, Next: ${c.nextStep || 'Review needed'}`).join('\n')}`;
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: `You are an AI assistant for GPNet, a worker's compensation case management system for WorkSafe Victoria compliance.

You have access to the user's current case data and can answer questions about their specific cases, statistics, and provide actionable "next steps" guidance.

${contextData}

When answering:
- For case status questions: Reference the specific case data above and explain what the current status means
- For "what next" questions: Provide 2-3 clear, actionable next steps based on the case status, risk level, and whether they have medical certificates
- For statistics: Use the exact numbers from the data above
- For compliance: Provide WorkSafe Victoria policy guidance
- Be concise and practical - focus on what the user should DO next

Example next steps based on case status:
- High Risk + No Cert = "1. Request updated medical certificate, 2. Schedule return-to-work meeting, 3. Review workplace modifications"
- Off Work + Has Cert = "1. Check certificate expiry date, 2. Contact worker for progress update, 3. Plan graduated RTW if improving"
- At Work + Medium Risk = "1. Monitor for any deterioration, 2. Ensure modified duties are in place, 3. Document progress"`,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });

      const content = response.content[0];
      const text = content.type === "text" ? content.text : "";

      res.json({
        response: text,
        model: response.model,
        usage: response.usage
      });
    } catch (err) {
      routeLogger.error("Claude API error", {}, err);
      // Don't expose internal error details to client
      res.status(500).json({
        error: "Compliance evaluation failed. Please try again.",
      });
    }
  });
  // GPNet 2 Dashboard - Get all cases (paginated)
  app.get("/api/gpnet2/cases", authorize(), async (req: AuthRequest, res) => {
    try {
      // Admin users can see all organizations' cases, others only see their own
      const organizationId = req.user!.role === 'admin' ? undefined : req.user!.organizationId;

      // Parse pagination params (defaults: page=1, limit=50, max limit=200)
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_LIST,
        ...getRequestMetadata(req),
      });

      const result = await storage.getGPNet2CasesPaginated(organizationId, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // Create new case (claims intake)
  const createCaseSchema = z.object({
    workerName: z.string().min(1, "Worker name is required"),
    company: z.string().min(1, "Company is required"),
    dateOfInjury: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
    workStatus: z.enum(["At work", "Off work"]),
    riskLevel: z.enum(["Low", "Medium", "High"]),
    summary: z.string().optional(),
  });

  app.post("/api/cases", authorize(), async (req: AuthRequest, res) => {
    try {
      const organizationId = req.user!.organizationId;

      // Validate request body
      const validationResult = createCaseSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const caseData = validationResult.data;

      // Create the case
      const newCase = await storage.createCase({
        organizationId,
        workerName: caseData.workerName,
        company: caseData.company,
        dateOfInjury: caseData.dateOfInjury,
        workStatus: caseData.workStatus,
        riskLevel: caseData.riskLevel,
        summary: caseData.summary,
      });

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        organizationId,
        eventType: AuditEventTypes.CASE_CREATE,
        resourceType: "case",
        resourceId: newCase.id,
        metadata: {
          workerName: caseData.workerName,
          company: caseData.company,
        },
        ...getRequestMetadata(req),
      });

      res.status(201).json(newCase);
    } catch (error) {
      routeLogger.error("Error creating case", {}, error);
      res.status(500).json({
        error: "Failed to create case",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Close case endpoint
  const closeCaseSchema = z.object({
    reason: z.string().optional(),
  });

  app.post("/api/cases/:id/close", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!;
      const validationResult = closeCaseSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { reason } = validationResult.data;

      // Update case status to closed
      await storage.closeCase(workerCase.id, workerCase.organizationId, reason);

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_UPDATE,
        resourceType: "case",
        resourceId: workerCase.id,
        metadata: {
          action: "close",
          reason: reason || "No reason provided",
        },
        ...getRequestMetadata(req),
      });

      // Attempt to close the Freshdesk ticket(s) if configured
      if (process.env.FRESHDESK_DOMAIN && process.env.FRESHDESK_API_KEY && workerCase.ticketIds?.length) {
        try {
          const freshdesk = new FreshdeskService();
          for (const ticketId of workerCase.ticketIds) {
            // Extract numeric ID from FD-123 format
            const numericId = ticketId.replace("FD-", "");
            if (numericId && !isNaN(Number(numericId))) {
              await freshdesk.closeTicket(Number(numericId));
            }
          }
        } catch (freshdeskError) {
          routeLogger.error("Failed to close Freshdesk ticket(s)", {}, freshdeskError);
          // Don't fail the request if Freshdesk sync fails - case is already closed locally
        }
      }

      res.json({
        success: true,
        message: "Case closed successfully",
        caseId: workerCase.id,
      });
    } catch (error) {
      routeLogger.error("Error closing case", {}, error);
      res.status(500).json({
        error: "Failed to close case",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Compliance override endpoint
  const complianceOverrideSchema = z.object({
    complianceValue: z.enum(["Very High", "High", "Medium", "Low", "Very Low"]),
    reason: z.string().min(1, "Reason is required"),
  });

  app.post("/api/cases/:id/compliance-override", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!;
      const validationResult = complianceOverrideSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { complianceValue, reason } = validationResult.data;
      const overrideBy = req.user!.email;

      await storage.setComplianceOverride(
        workerCase.id,
        workerCase.organizationId,
        complianceValue,
        reason,
        overrideBy
      );

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_UPDATE,
        resourceType: "case",
        resourceId: workerCase.id,
        metadata: {
          action: "compliance_override",
          previousValue: workerCase.complianceIndicator,
          newValue: complianceValue,
          reason,
        },
        ...getRequestMetadata(req),
      });

      res.json({
        success: true,
        message: "Compliance status overridden successfully",
        caseId: workerCase.id,
        complianceValue,
      });
    } catch (error) {
      routeLogger.error("Error overriding compliance", {}, error);
      res.status(500).json({
        error: "Failed to override compliance",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Clear compliance override endpoint
  app.delete("/api/cases/:id/compliance-override", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!;

      await storage.clearComplianceOverride(workerCase.id, workerCase.organizationId);

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_UPDATE,
        resourceType: "case",
        resourceId: workerCase.id,
        metadata: {
          action: "compliance_override_cleared",
        },
        ...getRequestMetadata(req),
      });

      res.json({
        success: true,
        message: "Compliance override cleared",
        caseId: workerCase.id,
      });
    } catch (error) {
      routeLogger.error("Error clearing compliance override", {}, error);
      res.status(500).json({
        error: "Failed to clear compliance override",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Merge tickets endpoint
  const mergeTicketsSchema = z.object({
    masterTicketId: z.string().min(1, "Master ticket ID is required"),
    closeOthers: z.boolean().optional().default(true),
  });

  app.post("/api/cases/:id/merge-tickets", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!;
      const validationResult = mergeTicketsSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors,
        });
      }

      const { masterTicketId, closeOthers } = validationResult.data;

      // Verify master ticket is in the case's ticket list
      if (!workerCase.ticketIds?.includes(masterTicketId)) {
        return res.status(400).json({
          error: "Invalid master ticket",
          details: "The specified master ticket is not associated with this case",
        });
      }

      // Update the case with master ticket
      await storage.mergeTickets(workerCase.id, workerCase.organizationId, masterTicketId);

      // Close other tickets in Freshdesk if requested
      let closedTickets: string[] = [];
      if (closeOthers && process.env.FRESHDESK_DOMAIN && process.env.FRESHDESK_API_KEY) {
        const otherTickets = workerCase.ticketIds.filter(id => id !== masterTicketId);
        const freshdesk = new FreshdeskService();

        for (const ticketId of otherTickets) {
          try {
            const numericId = ticketId.replace("FD-", "");
            if (numericId && !isNaN(Number(numericId))) {
              await freshdesk.closeTicket(Number(numericId));
              closedTickets.push(ticketId);
            }
          } catch (err) {
            routeLogger.error(`Failed to close ticket`, { ticketId }, err);
          }
        }
      }

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_UPDATE,
        resourceType: "case",
        resourceId: workerCase.id,
        metadata: {
          action: "merge_tickets",
          masterTicketId,
          closedTickets,
          totalTickets: workerCase.ticketIds?.length || 0,
        },
        ...getRequestMetadata(req),
      });

      res.json({
        success: true,
        message: "Tickets merged successfully",
        caseId: workerCase.id,
        masterTicketId,
        closedTickets,
      });
    } catch (error) {
      routeLogger.error("Error merging tickets", {}, error);
      res.status(500).json({
        error: "Failed to merge tickets",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Debug endpoint to view raw Freshdesk data for a worker
  app.get("/api/freshdesk/debug/:workerName", authorize(["admin"]), async (req: AuthRequest, res) => {
    if (!process.env.FRESHDESK_DOMAIN || !process.env.FRESHDESK_API_KEY) {
      return res.json({ error: "Freshdesk not configured" });
    }

    try {
      const workerName = req.params.workerName.toLowerCase();
      const freshdesk = new FreshdeskService();
      const tickets = await freshdesk.fetchTickets();

      // Find tickets matching this worker
      const matchingTickets = tickets.filter((t: any) => {
        const subject = (t.subject || '').toLowerCase();
        const desc = (t.description_text || '').toLowerCase();
        const firstName = (t.custom_fields?.cf_worker_first_name || '').toLowerCase();
        const lastName = (t.custom_fields?.cf_workers_name || '').toLowerCase();

        return subject.includes(workerName) ||
               desc.includes(workerName) ||
               firstName.includes(workerName) ||
               lastName.includes(workerName) ||
               `${firstName} ${lastName}`.includes(workerName);
      });

      // Return raw data for inspection
      res.json({
        workerName: req.params.workerName,
        ticketsFound: matchingTickets.length,
        rawTickets: matchingTickets.map((t: any) => ({
          id: t.id,
          subject: t.subject,
          created_at: t.created_at,
          updated_at: t.updated_at,
          status: t.status,
          priority: t.priority,
          custom_fields: t.custom_fields,
          description_text: t.description_text?.substring(0, 500),
        })),
      });
    } catch (error) {
      logger.freshdesk.error("Error fetching debug data", {}, error);
      res.status(500).json({ error: "Failed to fetch Freshdesk data" });
    }
  });

  // Freshdesk sync endpoint (admin only - syncs across all organizations)
  app.post("/api/freshdesk/sync", authorize(["admin"]), async (req: AuthRequest, res) => {
    // Check if Freshdesk is configured before attempting sync
    if (!process.env.FRESHDESK_DOMAIN || !process.env.FRESHDESK_API_KEY) {
      // Return success with 0 synced - graceful degradation when Freshdesk isn't configured
      return res.json({
        success: true,
        synced: 0,
        certificates: 0,
        message: "Freshdesk sync skipped - not configured",
        configured: false
      });
    }

    try {
      const freshdesk = new FreshdeskService();
      const tickets = await freshdesk.fetchTickets();
      const workerCases = await freshdesk.transformTicketsToWorkerCases(tickets);

      // Sync worker cases
      for (const workerCase of workerCases) {
        await storage.syncWorkerCaseFromFreshdesk(workerCase);
      }

      // Fetch and sync private notes (discussion notes) from Freshdesk
      let discussionNotesProcessed = 0;
      for (const workerCase of workerCases) {
        if (!workerCase.ticketIds || workerCase.ticketIds.length === 0) {
          continue;
        }

        // Fetch conversations for all tickets in this case
        for (const ticketId of workerCase.ticketIds) {
          try {
            const numericId = parseInt(ticketId.replace('FD-', ''));
            if (isNaN(numericId)) continue;

            const conversations = await freshdesk.fetchTicketConversations(numericId);
            if (conversations.length === 0) continue;

            const discussionNotes = freshdesk.convertConversationsToDiscussionNotes(
              conversations,
              workerCase.id!,
              workerCase.organizationId || 'default',
              workerCase.workerName!
            );

            if (discussionNotes.length > 0) {
              await storage.upsertCaseDiscussionNotes(discussionNotes);
              discussionNotesProcessed += discussionNotes.length;
            }
          } catch (err) {
            logger.freshdesk.warn(`Failed to fetch conversations for ticket`, { ticketId }, err);
          }
        }
      }

      logger.freshdesk.info(`Synced discussion notes from Freshdesk`, { count: discussionNotesProcessed });

      // Process certificate attachments (async, don't block response)
      // Certificate processing happens in background
      let certificatesProcessed = 0;
      const processCertificates = req.query.processCertificates !== "false";

      if (processCertificates && process.env.ANTHROPIC_API_KEY) {
        // Import dynamically to avoid circular deps
        const { processCertificatesFromTickets } = await import("./services/certificatePipeline");
        const { isCertificateAttachment } = await import("./services/pdfProcessor");

        // Build list of tickets with attachments
        const ticketsWithAttachments = tickets
          .filter((t: any) => t.attachments && t.attachments.length > 0)
          .filter((t: any) => t.attachments.some(isCertificateAttachment))
          .map((t: any) => {
            // Find matching case
            const matchingCase = workerCases.find((c: any) => c.ticketIds?.includes(`FD-${t.id}`));
            return {
              ticketId: `FD-${t.id}`,
              caseId: matchingCase?.id || `FD-${t.id}`,
              organizationId: matchingCase?.organizationId || "default",
              attachments: t.attachments,
            };
          })
          .filter((t: any) => t.caseId);

        if (ticketsWithAttachments.length > 0) {
          logger.freshdesk.info(`Processing certificates from tickets`, { count: ticketsWithAttachments.length });
          const certResult = await processCertificatesFromTickets(ticketsWithAttachments, storage);
          certificatesProcessed = certResult.successful;
        }
      }

      res.json({
        success: true,
        synced: workerCases.length,
        certificates: certificatesProcessed,
        discussionNotes: discussionNotesProcessed,
        message: `Successfully synced ${workerCases.length} cases, ${certificatesProcessed} certificates, and ${discussionNotesProcessed} discussion notes from Freshdesk`,
        configured: true
      });
    } catch (error) {
      logger.freshdesk.error("Error syncing Freshdesk tickets", {}, error);
      res.status(500).json({
        error: "Failed to sync Freshdesk tickets",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get sync scheduler status (admin only)
  app.get("/api/sync/status", authorize(["admin"]), async (req: AuthRequest, res) => {
    try {
      const status = syncScheduler.getStatus();
      res.json({
        ...status,
        enabled: process.env.DAILY_SYNC_ENABLED === "true",
        syncTime: process.env.DAILY_SYNC_TIME || "18:00"
      });
    } catch (error) {
      logger.sync.error("Error getting sync status", {}, error);
      res.status(500).json({
        error: "Failed to get sync status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manually trigger sync (admin only)
  app.post("/api/sync/trigger", authorize(["admin"]), async (req: AuthRequest, res) => {
    try {
      logger.sync.info("Manual sync triggered", { userId: req.user!.id });
      const result = await syncScheduler.triggerManualSync();
      res.json(result);
    } catch (error) {
      logger.sync.error("Error triggering manual sync", {}, error);
      res.status(500).json({
        error: "Failed to trigger manual sync",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get compliance scheduler status (admin only)
  app.get("/api/compliance/status", authorize(["admin"]), async (req: AuthRequest, res) => {
    try {
      const status = complianceScheduler.getStatus();
      res.json({
        ...status,
        enabled: process.env.COMPLIANCE_CHECK_ENABLED === "true",
        complianceTime: process.env.COMPLIANCE_CHECK_TIME || "06:00"
      });
    } catch (error) {
      logger.compliance.error("Error getting compliance status", {}, error);
      res.status(500).json({
        error: "Failed to get compliance status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manually trigger compliance check (admin only)
  app.post("/api/compliance/trigger", authorize(["admin"]), async (req: AuthRequest, res) => {
    try {
      logger.compliance.info("Manual compliance check triggered", { userId: req.user!.id });
      const result = await complianceScheduler.triggerManualCheck();
      res.json(result);
    } catch (error) {
      logger.compliance.error("Error triggering manual compliance check", {}, error);
      res.status(500).json({
        error: "Failed to trigger manual compliance check",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Evaluate a single case against compliance rules
  app.get("/api/cases/:id/compliance/evaluate", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const caseId = req.params.id;
      const { evaluateCase } = await import("./services/complianceEngine");

      logger.compliance.info("Evaluating case compliance", {
        caseId,
        userId: req.user!.id
      });

      const report = await evaluateCase(caseId);

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "compliance_report",
        resourceId: caseId,
        ...getRequestMetadata(req),
      });

      res.json(report);
    } catch (error) {
      logger.compliance.error("Error evaluating case compliance", { caseId: req.params.id }, error);
      res.status(500).json({
        error: "Failed to evaluate compliance",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/cases/:id/recovery-timeline", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "recovery_timeline",
        resourceId: workerCase.id,
        ...getRequestMetadata(req),
      });

      const certificates = await storage.getCaseRecoveryTimeline(workerCase.id, workerCase.organizationId);
      const lastCertificate = certificates[certificates.length - 1];

      const summary: RecoveryTimelineSummary = {
        totalCertificates: certificates.length,
        daysOnReducedCapacity: certificates.reduce((total, cert) => {
          if (cert.capacity === "fit") {
            return total;
          }
          const start = new Date(cert.startDate).getTime();
          const end = new Date(cert.endDate).getTime();
          if (Number.isNaN(start) || Number.isNaN(end)) {
            return total;
          }
          const diff = Math.max(1, Math.round((end - start) / MS_PER_DAY));
          return total + diff;
        }, 0),
        lastKnownCapacity: lastCertificate?.capacity ?? "unknown",
        lastUpdated: lastCertificate?.endDate ?? lastCertificate?.startDate ?? null,
      };

      res.json({
        certificates,
        summary,
      });
    } catch (err) {
      routeLogger.error("Failed to fetch recovery timeline", {}, err);
      res.status(500).json({
        error: "Failed to fetch recovery timeline",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/cases/:id/clinical-evidence", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "clinical_evidence",
        resourceId: workerCase.id,
        ...getRequestMetadata(req),
      });

      const clinicalEvidence = evaluateClinicalEvidence(workerCase);
      res.json({ caseId: workerCase.id, clinicalEvidence });
    } catch (err) {
      routeLogger.error("Failed to evaluate clinical evidence", {}, err);
      res.status(500).json({
        error: "Failed to evaluate clinical evidence",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/cases/:id/discussion-notes", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "discussion_notes",
        resourceId: workerCase.id,
        ...getRequestMetadata(req),
      });

      const [notes, insights] = await Promise.all([
        storage.getCaseDiscussionNotes(workerCase.id, workerCase.organizationId, 25),
        storage.getCaseDiscussionInsights(workerCase.id, workerCase.organizationId, 25),
      ]);
      res.json({ notes, insights });
    } catch (err) {
      routeLogger.error("Failed to fetch discussion notes", {}, err);
      res.status(500).json({
        error: "Failed to fetch discussion notes",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/cases/:id/timeline", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware
      const limit = parseInt(req.query.limit as string) || 50;

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "timeline",
        resourceId: workerCase.id,
        ...getRequestMetadata(req),
      });

      const events = await storage.getCaseTimeline(workerCase.id, workerCase.organizationId, limit);

      res.json({
        caseId: workerCase.id,
        events,
        totalEvents: events.length
      });
    } catch (err) {
      routeLogger.error("Failed to fetch timeline", {}, err);
      res.status(500).json({
        error: "Failed to fetch timeline",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  // GET /api/cases/:id/summary - Returns cached summary without triggering generation
  app.get("/api/cases/:id/summary", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "summary",
        resourceId: workerCase.id,
        ...getRequestMetadata(req),
      });

      const [discussionNotes, discussionInsights] = await Promise.all([
        storage.getCaseDiscussionNotes(workerCase.id, workerCase.organizationId, 5),
        storage.getCaseDiscussionInsights(workerCase.id, workerCase.organizationId, 5),
      ]);

      // Return cached summary data
      res.json({
        id: workerCase.id,
        summary: workerCase.aiSummary || null,
        generatedAt: workerCase.aiSummaryGeneratedAt || null,
        model: workerCase.aiSummaryModel || null,
        workStatusClassification: workerCase.aiWorkStatusClassification || null,
        ticketLastUpdatedAt: workerCase.ticketLastUpdatedAt || null,
        needsRefresh: await storage.needsSummaryRefresh(workerCase.id, workerCase.organizationId),
        discussionNotes,
        discussionInsights,
      });
    } catch (err) {
      routeLogger.error("Failed to fetch summary", {}, err);
      res.status(500).json({ 
        error: "Failed to fetch summary",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  // POST /api/cases/:id/summary - Validates cache and generates/refreshes summary
  app.post("/api/cases/:id/summary", authorize(), requireCaseOwnership(), async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware
      const force = req.query.force === 'true';

      // If force=true, always regenerate; otherwise use cached if valid
      let result;
      if (force) {
        try {
          // Force regeneration
          const generated = await summaryService.generateCaseSummary(workerCase);

          // Store in database
          await storage.updateAISummary(workerCase.id, workerCase.organizationId, generated.summary, summaryService.model, generated.workStatusClassification);

          // Log AI summary generation
          await logAuditEvent({
            userId: req.user!.id,
            organizationId: req.user!.organizationId,
            eventType: AuditEventTypes.AI_SUMMARY_GENERATE,
            resourceType: "worker_case",
            resourceId: workerCase.id,
            metadata: {
              model: summaryService.model,
              forced: true,
            },
            ...getRequestMetadata(req),
          });
          
          result = {
            summary: generated.summary,
            cached: false,
            generatedAt: new Date().toISOString(),
            model: summaryService.model,
            workStatusClassification: generated.workStatusClassification,
          };
        } catch (err) {
          // If generation fails, fall back to cached summary with warning
          if (workerCase.aiSummary) {
            result = {
              summary: workerCase.aiSummary,
              cached: true,
              generatedAt: workerCase.aiSummaryGeneratedAt,
              model: workerCase.aiSummaryModel,
              workStatusClassification: workerCase.aiWorkStatusClassification,
            };
          } else {
            throw err; // Re-throw if no cached summary exists
          }
        }
      } else {
        // Generate or fetch cached summary (API key check happens inside service if needed)
        result = await summaryService.getCachedOrGenerateSummary(workerCase.id);

        // Log AI summary generation if it was freshly generated (not cached)
        if (!result.cached) {
          await logAuditEvent({
            userId: req.user!.id,
            organizationId: req.user!.organizationId,
            eventType: AuditEventTypes.AI_SUMMARY_GENERATE,
            resourceType: "worker_case",
            resourceId: workerCase.id,
            metadata: {
              model: result.model,
              forced: false,
            },
            ...getRequestMetadata(req),
          });
        }
      }

      const [discussionNotes, discussionInsights] = await Promise.all([
        storage.getCaseDiscussionNotes(workerCase.id, workerCase.organizationId, 5),
        storage.getCaseDiscussionInsights(workerCase.id, workerCase.organizationId, 5),
      ]);

      res.json({
        id: workerCase.id,
        summary: result.summary,
        cached: result.cached,
        generatedAt: result.generatedAt,
        model: result.model,
        workStatusClassification: result.workStatusClassification,
        discussionNotes,
        discussionInsights,
      });
    } catch (err) {
      routeLogger.error("Summary generation failed", {}, err);
      
      // Return 503 if API key not configured during generation attempt
      if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({ 
          error: "AI summary service unavailable",
          details: err.message
        });
      }
      
      res.status(500).json({ 
        error: "Summary generation failed",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

}
