import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all cases
  app.get("/api/cases", async (req, res) => {
    try {
      const cases = await storage.getCases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // Get a specific case by ID with certificates
  app.get("/api/cases/:id", async (req, res) => {
    try {
      const caseData = await storage.getCaseById(req.params.id);
      if (!caseData) {
        return res.status(404).json({ error: "Case not found" });
      }
      
      const certificates = await storage.getCertificatesByCaseId(req.params.id);
      
      res.json({
        ...caseData,
        certificates,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  // Create a new case
  app.post("/api/cases", async (req, res) => {
    try {
      const newCase = await storage.insertCase(req.body);
      res.status(201).json(newCase);
    } catch (error) {
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
