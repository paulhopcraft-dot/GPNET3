import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { FreshdeskService } from "./services/freshdesk";
import Anthropic from "@anthropic-ai/sdk";
import { generateCaseSummary } from "./src/ai/case_summary";

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

  // AI Case Summary endpoint
  app.get("/api/cases/:id/summary", async (req, res) => {
    try {
      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ 
          error: "AI summary service unavailable",
          details: "OpenAI API key not configured"
        });
      }

      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Generate AI summary with real case data
      const summary = await generateCaseSummary({
        id: workerCase.id,
        worker_name: workerCase.workerName,
        employer_name: workerCase.company,
        injury_type: workerCase.injuryType,
        injury_date: workerCase.dateOfInjury,
        status: workerCase.currentStatus,
        next_step: workerCase.nextStep,
        next_step_owner: workerCase.owner,
        compliance_indicator: workerCase.complianceIndicator,
        risk_level: workerCase.riskLevel,
        due_date: workerCase.dueDate,
        expected_recovery_date: workerCase.expectedRecoveryDate,
      });

      res.json({ id: caseId, summary });
    } catch (err) {
      console.error("Summary generation failed:", err);
      res.status(500).json({ 
        error: "Summary generation failed",
        details: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
