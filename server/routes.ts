import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { FreshdeskService } from "./services/freshdesk.js";
import complianceRouter from "./src/routes/compliance.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // AI Compliance routes
  app.use("/api/compliance", complianceRouter);

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

  const httpServer = createServer(app);

  return httpServer;
}
