import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { FreshdeskService } from "./services/freshdesk";
import { summaryService } from "./services/summary";
import Anthropic from "@anthropic-ai/sdk";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // GET /api/cases/:id/summary - Returns cached summary without triggering generation
  app.get("/api/cases/:id/summary", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Return cached summary data
      res.json({
        id: caseId,
        summary: workerCase.aiSummary || null,
        generatedAt: workerCase.aiSummaryGeneratedAt || null,
        model: workerCase.aiSummaryModel || null,
        ticketLastUpdatedAt: workerCase.ticketLastUpdatedAt || null,
        needsRefresh: await storage.needsSummaryRefresh(caseId),
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
      const workerCase = await storage.getGPNet2CaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate or fetch cached summary (API key check happens inside service if needed)
      const result = await summaryService.getCachedOrGenerateSummary(caseId);

      res.json({
        id: caseId,
        summary: result.summary,
        cached: result.cached,
        generatedAt: result.generatedAt,
        model: result.model,
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

  const httpServer = createServer(app);

  return httpServer;
}
