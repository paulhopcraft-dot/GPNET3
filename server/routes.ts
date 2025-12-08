import type { Express } from "express";
import { storage } from "./storage";
import { FreshdeskService } from "./services/freshdesk";
import { summaryService } from "./services/summary";
import Anthropic from "@anthropic-ai/sdk";
import authRoutes from "./routes/auth";
import terminationRoutes from "./routes/termination";
import type { RecoveryTimelineSummary } from "@shared/schema";
import { evaluateClinicalEvidence } from "./services/clinicalEvidence";
import { generateRTWPlan, assessPlanSafety, generateRecommendations } from "./services/rtwPlanner";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function registerRoutes(app: Express): Promise<void> {
  // Authentication routes
  app.use("/api/auth", authRoutes);
  app.use("/api/termination", terminationRoutes);

  // Local diagnostics (non-sensitive env presence check)
  app.get("/api/diagnostics/env", (_req, res) => {
    res.json({
      DATABASE_URL: !!process.env.DATABASE_URL,
      FRESHDESK_DOMAIN: !!process.env.FRESHDESK_DOMAIN,
      FRESHDESK_API_KEY: !!process.env.FRESHDESK_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    });
  });
  // Claude compliance assistant
  app.post("/api/compliance", async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: "You are a compliance assistant for GPNet, a worker's compensation case management system. You help analyze worker cases for compliance with Worksafe Victoria policies. Provide clear, concise guidance on compliance matters.",
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
      console.error("Claude API error:", err);
      res.status(500).json({ 
        error: "Compliance evaluation failed",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });
  // GPNet 2 Dashboard - Get all cases
  app.get("/api/gpnet2/cases", async (req, res) => {
    try {
      const cases = await storage.getGPNet2Cases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // Freshdesk sync endpoint
  app.post("/api/freshdesk/sync", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const tickets = await freshdesk.fetchTickets();
      const workerCases = await freshdesk.transformTicketsToWorkerCases(tickets);
      
      for (const workerCase of workerCases) {
        await storage.syncWorkerCaseFromFreshdesk(workerCase);
      }

      res.json({ 
        success: true, 
        synced: workerCases.length,
        message: `Successfully synced ${workerCases.length} cases from Freshdesk`
      });
    } catch (error) {
      console.error("Error syncing Freshdesk tickets:", error);
      res.status(500).json({ 
        error: "Failed to sync Freshdesk tickets",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/cases/:id/recovery-timeline", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const certificates = await storage.getCaseRecoveryTimeline(caseId);
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
      console.error("Failed to fetch recovery timeline:", err);
      res.status(500).json({
        error: "Failed to fetch recovery timeline",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/cases/:id/clinical-evidence", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      const clinicalEvidence = evaluateClinicalEvidence(workerCase);
      res.json({ caseId, clinicalEvidence });
    } catch (err) {
      console.error("Failed to evaluate clinical evidence:", err);
      res.status(500).json({
        error: "Failed to evaluate clinical evidence",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/cases/:id/discussion-notes", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      const [notes, insights] = await Promise.all([
        storage.getCaseDiscussionNotes(caseId, 25),
        storage.getCaseDiscussionInsights(caseId, 25),
      ]);
      res.json({ notes, insights });
    } catch (err) {
      console.error("Failed to fetch discussion notes:", err);
      res.status(500).json({
        error: "Failed to fetch discussion notes",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // RTW Plan generation endpoint
  app.get("/api/cases/:id/rtw-plan", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const plan = generateRTWPlan(workerCase);
      res.json({ caseId, plan });
    } catch (err) {
      console.error("Failed to generate RTW plan:", err);
      res.status(500).json({
        error: "Failed to generate RTW plan",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // RTW Plan safety assessment endpoint
  app.post("/api/cases/:id/rtw-plan/assess", async (req, res) => {
    try {
      const caseId = req.params.id;
      const { phase } = req.body;

      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const safety = assessPlanSafety(workerCase, phase);
      const recommendations = generateRecommendations(workerCase, phase ? [phase] : []);

      res.json({ caseId, safety, recommendations });
    } catch (err) {
      console.error("Failed to assess RTW plan:", err);
      res.status(500).json({
        error: "Failed to assess RTW plan",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  app.get("/api/cases/:id/timeline", async (req, res) => {
    try {
      const caseId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;

      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const events = await storage.getCaseTimeline(caseId, limit);

      res.json({
        caseId,
        events,
        totalEvents: events.length
      });
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
      res.status(500).json({
        error: "Failed to fetch timeline",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  // GET /api/cases/:id/summary - Returns cached summary without triggering generation
  app.get("/api/cases/:id/summary", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }
      const [discussionNotes, discussionInsights] = await Promise.all([
        storage.getCaseDiscussionNotes(caseId, 5),
        storage.getCaseDiscussionInsights(caseId, 5),
      ]);

      // Return cached summary data
      res.json({
        id: caseId,
        summary: workerCase.aiSummary || null,
        generatedAt: workerCase.aiSummaryGeneratedAt || null,
        model: workerCase.aiSummaryModel || null,
        workStatusClassification: workerCase.aiWorkStatusClassification || null,
        ticketLastUpdatedAt: workerCase.ticketLastUpdatedAt || null,
        needsRefresh: await storage.needsSummaryRefresh(caseId),
        discussionNotes,
        discussionInsights,
      });
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      res.status(500).json({ 
        error: "Failed to fetch summary",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  // POST /api/cases/:id/summary - Validates cache and generates/refreshes summary
  app.post("/api/cases/:id/summary", async (req, res) => {
    try {
      const caseId = req.params.id;
      const force = req.query.force === 'true';
      const workerCase = await storage.getGPNet2CaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // If force=true, always regenerate; otherwise use cached if valid
      let result;
      if (force) {
        try {
          // Force regeneration
          const generated = await summaryService.generateCaseSummary(workerCase);
          
          // Store in database
          await storage.updateAISummary(caseId, generated.summary, summaryService.model, generated.workStatusClassification);
          
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
        result = await summaryService.getCachedOrGenerateSummary(caseId);
      }

      const [discussionNotes, discussionInsights] = await Promise.all([
        storage.getCaseDiscussionNotes(caseId, 5),
        storage.getCaseDiscussionInsights(caseId, 5),
      ]);

      res.json({
        id: caseId,
        summary: result.summary,
        cached: result.cached,
        generatedAt: result.generatedAt,
        model: result.model,
        workStatusClassification: result.workStatusClassification,
        discussionNotes,
        discussionInsights,
      });
    } catch (err) {
      console.error("Summary generation failed:", err);
      
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
