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
import { estimateRecoveryTimeline, getRecoverySummary } from "./services/recoveryEstimator";
import { generateWorkerProfile, formatProfileSections, getStatusLine } from "./services/workerProfile";
import {
  CHECKIN_QUESTIONS,
  createCheckIn,
  completeCheckIn,
  generateTrendSummary,
  CheckIn,
  CheckInResponse,
} from "./services/weeklyCheckin";
import { generateTreatmentPlan, getTreatmentPlanSummary } from "./services/treatmentPlan";

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

  // Risk Dashboard - Executive summary of all cases
  app.get("/api/dashboard/risk-summary", async (req, res) => {
    try {
      const cases = await storage.getGPNet2Cases();

      // Risk level breakdown
      const riskBreakdown = {
        high: cases.filter((c) => c.riskLevel === "High").length,
        medium: cases.filter((c) => c.riskLevel === "Medium").length,
        low: cases.filter((c) => c.riskLevel === "Low").length,
      };

      // Work status breakdown
      const workStatusBreakdown = {
        offWork: cases.filter((c) => c.workStatus === "Off work").length,
        atWork: cases.filter((c) => c.workStatus === "At work").length,
      };

      // Flag counts from clinical evidence
      const flagCounts: Record<string, number> = {};
      const urgentCases: Array<{ id: string; workerName: string; company: string; flags: string[] }> = [];

      for (const c of cases) {
        if (c.clinicalEvidence?.flags) {
          const highRiskFlags: string[] = [];
          for (const flag of c.clinicalEvidence.flags) {
            flagCounts[flag.code] = (flagCounts[flag.code] || 0) + 1;
            if (flag.severity === "high_risk") {
              highRiskFlags.push(flag.message);
            }
          }
          if (highRiskFlags.length > 0) {
            urgentCases.push({
              id: c.id,
              workerName: c.workerName,
              company: c.company,
              flags: highRiskFlags,
            });
          }
        }
      }

      // Company breakdown
      const companyRisk: Record<string, { total: number; high: number; medium: number; low: number }> = {};
      for (const c of cases) {
        if (!companyRisk[c.company]) {
          companyRisk[c.company] = { total: 0, high: 0, medium: 0, low: 0 };
        }
        companyRisk[c.company].total++;
        if (c.riskLevel === "High") companyRisk[c.company].high++;
        if (c.riskLevel === "Medium") companyRisk[c.company].medium++;
        if (c.riskLevel === "Low") companyRisk[c.company].low++;
      }

      res.json({
        totalCases: cases.length,
        riskBreakdown,
        workStatusBreakdown,
        flagCounts,
        urgentCases: urgentCases.slice(0, 10), // Top 10 urgent cases
        companyRisk,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to generate risk summary:", error);
      res.status(500).json({ error: "Failed to generate risk summary" });
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

  // Treatment plan generator endpoint
  app.get("/api/cases/:id/treatment-plan", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const plan = generateTreatmentPlan(workerCase);
      const summary = getTreatmentPlanSummary(plan);

      res.json({
        caseId,
        plan,
        summary,
      });
    } catch (err) {
      console.error("Failed to generate treatment plan:", err);
      res.status(500).json({
        error: "Failed to generate treatment plan",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Recovery timeline estimation endpoint
  app.get("/api/cases/:id/recovery-estimate", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Get certificate history for more accurate estimation
      const certificates = await storage.getCaseRecoveryTimeline(caseId);

      const estimate = estimateRecoveryTimeline(workerCase, certificates);
      const summary = getRecoverySummary(estimate);

      res.json({
        caseId,
        estimate,
        summary,
      });
    } catch (err) {
      console.error("Failed to estimate recovery timeline:", err);
      res.status(500).json({
        error: "Failed to estimate recovery timeline",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Worker profile summary endpoint
  app.get("/api/cases/:id/profile", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Get certificate history for more complete profile
      const certificates = await storage.getCaseRecoveryTimeline(caseId);

      const profile = generateWorkerProfile(workerCase, certificates);
      const sections = formatProfileSections(profile);
      const statusLine = getStatusLine(profile);

      res.json({
        caseId,
        profile,
        sections,
        statusLine,
      });
    } catch (err) {
      console.error("Failed to generate worker profile:", err);
      res.status(500).json({
        error: "Failed to generate worker profile",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // In-memory check-in storage (would be in database in production)
  const checkInStore: Map<string, CheckIn[]> = new Map();

  // Get check-in questions
  app.get("/api/checkin/questions", (_req, res) => {
    res.json({ questions: CHECKIN_QUESTIONS });
  });

  // Create a new check-in for a case
  app.post("/api/cases/:id/checkin", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const { scheduledDate } = req.body;
      const checkIn = createCheckIn(caseId, workerCase.workerName, scheduledDate);

      // Store check-in
      const existing = checkInStore.get(caseId) || [];
      existing.push(checkIn);
      checkInStore.set(caseId, existing);

      res.json({ checkIn });
    } catch (err) {
      console.error("Failed to create check-in:", err);
      res.status(500).json({
        error: "Failed to create check-in",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Submit check-in responses
  app.post("/api/checkin/:checkInId/submit", async (req, res) => {
    try {
      const { checkInId } = req.params;
      const { responses } = req.body as { responses: CheckInResponse[] };

      // Find the check-in
      let found: CheckIn | null = null;
      let caseId: string | null = null;

      for (const [cid, checkIns] of checkInStore.entries()) {
        const idx = checkIns.findIndex((c) => c.id === checkInId);
        if (idx !== -1) {
          found = checkIns[idx];
          caseId = cid;
          break;
        }
      }

      if (!found || !caseId) {
        return res.status(404).json({ error: "Check-in not found" });
      }

      // Get previous scores for comparison
      const caseCheckIns = checkInStore.get(caseId) || [];
      const completed = caseCheckIns
        .filter((c) => c.status === "completed" && c.id !== checkInId)
        .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime());
      const previousScores = completed[0]?.scores;

      // Complete the check-in
      const completedCheckIn = completeCheckIn(found, responses, previousScores);

      // Update store
      const allCheckIns = checkInStore.get(caseId)!;
      const idx = allCheckIns.findIndex((c) => c.id === checkInId);
      allCheckIns[idx] = completedCheckIn;

      res.json({
        checkIn: completedCheckIn,
        hasHighRiskSignals: completedCheckIn.riskSignals.some((s) => s.severity === "high"),
      });
    } catch (err) {
      console.error("Failed to submit check-in:", err);
      res.status(500).json({
        error: "Failed to submit check-in",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Get check-in history for a case
  app.get("/api/cases/:id/checkins", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const checkIns = checkInStore.get(caseId) || [];
      const trend = generateTrendSummary(caseId, workerCase.workerName, checkIns);

      res.json({
        caseId,
        checkIns,
        trend,
      });
    } catch (err) {
      console.error("Failed to fetch check-ins:", err);
      res.status(500).json({
        error: "Failed to fetch check-ins",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Get a specific check-in
  app.get("/api/checkin/:checkInId", (req, res) => {
    try {
      const { checkInId } = req.params;

      for (const checkIns of checkInStore.values()) {
        const found = checkIns.find((c) => c.id === checkInId);
        if (found) {
          return res.json({ checkIn: found });
        }
      }

      res.status(404).json({ error: "Check-in not found" });
    } catch (err) {
      console.error("Failed to fetch check-in:", err);
      res.status(500).json({
        error: "Failed to fetch check-in",
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
