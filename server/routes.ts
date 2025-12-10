import type { Express } from "express";
import { storage } from "./storage";
import { FreshdeskService, CreateTicketInput, ReplyToTicketInput } from "./services/freshdesk";
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
import {
  getAllTemplates,
  getTemplatesForTarget,
  getTemplate,
  generateMessage,
  getSuggestedCommunications,
} from "./services/providerChat";
import {
  getInjuryTypes,
  validateIntakeForm,
  processClaimsIntake,
  getIntakeFormTemplate,
  getRequiredDocuments,
  ClaimsIntakeForm,
} from "./services/claimsIntake";
import {
  extractCertificateData,
  validateCertificateData,
  processCertificateIngestion,
  calculateDaysUntilExpiry,
  getExpiryAlertLevel,
  CertificateSource,
} from "./services/certificateIngestion";
import {
  predictCaseDuration,
  predictRTWProbability,
  predictDeteriorationRisk,
  getAllPredictions,
  rankCasesByPriority,
  explainConfidence,
} from "./services/predictions";
import {
  searchKnowledge,
  getRAGContext,
  indexDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  getKnowledgeBaseStats,
  listDocuments,
  findSimilarDocuments,
  getCaseRelevantKnowledge,
  KnowledgeLayer,
  DocumentType,
} from "./services/ragKnowledge";

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

  // Get a specific ticket from Freshdesk
  app.get("/api/freshdesk/tickets/:ticketId", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const ticketId = parseInt(req.params.ticketId, 10);
      const ticket = await freshdesk.getTicket(ticketId);
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching Freshdesk ticket:", error);
      res.status(500).json({
        error: "Failed to fetch ticket",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get conversations for a ticket
  app.get("/api/freshdesk/tickets/:ticketId/conversations", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const ticketId = parseInt(req.params.ticketId, 10);
      const conversations = await freshdesk.getTicketConversations(ticketId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching ticket conversations:", error);
      res.status(500).json({
        error: "Failed to fetch conversations",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create a new ticket in Freshdesk
  app.post("/api/freshdesk/tickets", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const input: CreateTicketInput = req.body;

      if (!input.subject || !input.description || !input.email) {
        return res.status(400).json({
          error: "Missing required fields: subject, description, email"
        });
      }

      const ticket = await freshdesk.createTicket(input);

      // Check for high-risk content in the created ticket
      const highRiskDetection = freshdesk.detectHighRisk(`${input.subject} ${input.description}`);

      res.json({
        ticket,
        highRiskDetection: highRiskDetection.isHighRisk ? highRiskDetection : undefined,
      });
    } catch (error) {
      console.error("Error creating Freshdesk ticket:", error);
      res.status(500).json({
        error: "Failed to create ticket",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Reply to a ticket
  app.post("/api/freshdesk/tickets/:ticketId/reply", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const ticketId = parseInt(req.params.ticketId, 10);
      const input: ReplyToTicketInput = req.body;

      if (!input.body) {
        return res.status(400).json({ error: "Missing required field: body" });
      }

      const conversation = await freshdesk.replyToTicket(ticketId, input);
      res.json(conversation);
    } catch (error) {
      console.error("Error replying to ticket:", error);
      res.status(500).json({
        error: "Failed to reply to ticket",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add a private note to a ticket
  app.post("/api/freshdesk/tickets/:ticketId/notes", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const ticketId = parseInt(req.params.ticketId, 10);
      const { body } = req.body;

      if (!body) {
        return res.status(400).json({ error: "Missing required field: body" });
      }

      const note = await freshdesk.replyToTicket(ticketId, { body, private_note: true });
      res.json(note);
    } catch (error) {
      console.error("Error adding note to ticket:", error);
      res.status(500).json({
        error: "Failed to add note",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update ticket status
  app.put("/api/freshdesk/tickets/:ticketId/status", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const ticketId = parseInt(req.params.ticketId, 10);
      const { status } = req.body;

      if (![2, 3, 4, 5].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 2 (Open), 3 (Pending), 4 (Resolved), or 5 (Closed)" });
      }

      const ticket = await freshdesk.updateTicketStatus(ticketId, status);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      res.status(500).json({
        error: "Failed to update ticket status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update ticket priority
  app.put("/api/freshdesk/tickets/:ticketId/priority", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const ticketId = parseInt(req.params.ticketId, 10);
      const { priority } = req.body;

      if (![1, 2, 3, 4].includes(priority)) {
        return res.status(400).json({ error: "Invalid priority. Must be 1 (Low), 2 (Medium), 3 (High), or 4 (Urgent)" });
      }

      const ticket = await freshdesk.updateTicketPriority(ticketId, priority);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket priority:", error);
      res.status(500).json({
        error: "Failed to update ticket priority",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Webhook endpoint for Freshdesk
  app.post("/api/freshdesk/webhook", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const result = await freshdesk.processWebhook(req.body);

      // If this is a new case, sync it to storage
      if (result.success && result.caseId) {
        const ticket = await freshdesk.getTicket(result.ticketId);
        const workerCases = await freshdesk.transformTicketsToWorkerCases([ticket]);

        for (const workerCase of workerCases) {
          await storage.syncWorkerCaseFromFreshdesk(workerCase);
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error processing Freshdesk webhook:", error);
      res.status(500).json({
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get communication history for a case
  app.get("/api/cases/:id/communications", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const freshdesk = new FreshdeskService();
      const history = await freshdesk.getCaseCommunicationHistory(workerCase.workerName);

      // Convert Map to object for JSON serialization
      const conversationsObj: Record<number, any[]> = {};
      history.conversations.forEach((value, key) => {
        conversationsObj[key] = value;
      });

      res.json({
        tickets: history.tickets,
        conversations: conversationsObj,
        timeline: history.timeline,
        caseId,
        workerName: workerCase.workerName,
      });
    } catch (error) {
      console.error("Error fetching case communications:", error);
      res.status(500).json({
        error: "Failed to fetch communications",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Analyze text for high-risk content
  app.post("/api/freshdesk/analyze-risk", async (req, res) => {
    try {
      const freshdesk = new FreshdeskService();
      const { text, subject } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Missing required field: text" });
      }

      const highRiskDetection = freshdesk.detectHighRisk(text);
      const bounceDetection = freshdesk.detectBounce(text, subject || '');

      res.json({
        highRisk: highRiskDetection,
        bounce: bounceDetection,
      });
    } catch (error) {
      console.error("Error analyzing risk:", error);
      res.status(500).json({
        error: "Failed to analyze risk",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Claims intake endpoints
  app.get("/api/intake/injury-types", async (req, res) => {
    try {
      const injuryTypes = getInjuryTypes();
      res.json(injuryTypes);
    } catch (error) {
      console.error("Error fetching injury types:", error);
      res.status(500).json({ error: "Failed to fetch injury types" });
    }
  });

  app.get("/api/intake/injury-types/:type/documents", async (req, res) => {
    try {
      const injuryType = req.params.type.toUpperCase();
      const documents = getRequiredDocuments(injuryType as any);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching required documents:", error);
      res.status(500).json({ error: "Failed to fetch required documents" });
    }
  });

  app.get("/api/intake/template", async (req, res) => {
    try {
      const template = getIntakeFormTemplate();
      res.json(template);
    } catch (error) {
      console.error("Error fetching intake template:", error);
      res.status(500).json({ error: "Failed to fetch intake template" });
    }
  });

  app.post("/api/intake/validate", async (req, res) => {
    try {
      const form: ClaimsIntakeForm = req.body;
      const validation = validateIntakeForm(form);
      res.json(validation);
    } catch (error) {
      console.error("Error validating intake form:", error);
      res.status(500).json({ error: "Failed to validate intake form" });
    }
  });

  app.post("/api/intake/submit", async (req, res) => {
    try {
      const form: ClaimsIntakeForm = req.body;
      const options = {
        createFreshdeskTicket: req.query.createTicket === 'true',
        autoAssign: req.query.autoAssign === 'true',
      };

      const result = await processClaimsIntake(form, options);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Sync the new case to storage if successful
      if (result.caseId) {
        const workerName = `${form.workerFirstName.trim()} ${form.workerLastName.trim()}`;
        await storage.syncWorkerCaseFromFreshdesk({
          id: result.caseId,
          workerName,
          company: form.company as any,
          dateOfInjury: form.dateOfInjury,
          riskLevel: 'Medium',
          workStatus: form.currentWorkStatus === 'off_work' ? 'Off work' :
                      form.currentWorkStatus === 'working_modified' ? 'Modified duties' : 'At work',
          hasCertificate: false,
          complianceIndicator: 'Medium',
          compliance: {
            indicator: 'Medium',
            reason: 'New case - awaiting initial documentation',
            source: 'intake',
            lastChecked: new Date().toISOString(),
          },
          currentStatus: `New claim: ${form.injuryDescription.substring(0, 100)}`,
          nextStep: result.nextSteps[0] || 'Review case and obtain documentation',
          owner: form.assignedCaseManager || 'CLC Team',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          summary: form.injuryDescription,
          ticketIds: result.freshdeskTicketId ? [`FD-${result.freshdeskTicketId}`] : [result.caseId],
          ticketCount: 1,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error processing claims intake:", error);
      res.status(500).json({
        error: "Failed to process claims intake",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Certificate ingestion endpoints
  app.post("/api/certificates/extract", async (req, res) => {
    try {
      const { text, filename } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Missing required field: text" });
      }

      const extractedData = extractCertificateData(text, filename || '');
      const validation = validateCertificateData(extractedData);

      res.json({
        extractedData,
        validation,
      });
    } catch (error) {
      console.error("Error extracting certificate data:", error);
      res.status(500).json({
        error: "Failed to extract certificate data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/certificates/ingest", async (req, res) => {
    try {
      const { text, source, filename, fileType, fileSize, caseId } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Missing required field: text" });
      }

      const result = processCertificateIngestion(
        text,
        (source as CertificateSource) || 'api_upload',
        filename || 'unknown',
        fileType || 'application/octet-stream',
        fileSize || 0,
        caseId
      );

      res.json(result);
    } catch (error) {
      console.error("Error ingesting certificate:", error);
      res.status(500).json({
        error: "Failed to ingest certificate",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/certificates/validate", async (req, res) => {
    try {
      const { extractedData } = req.body;

      if (!extractedData) {
        return res.status(400).json({ error: "Missing required field: extractedData" });
      }

      const validation = validateCertificateData(extractedData);
      res.json(validation);
    } catch (error) {
      console.error("Error validating certificate:", error);
      res.status(500).json({
        error: "Failed to validate certificate",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/certificates/expiry-check", async (req, res) => {
    try {
      const endDate = req.query.endDate as string;

      if (!endDate) {
        return res.status(400).json({ error: "Missing required query param: endDate" });
      }

      const daysUntilExpiry = calculateDaysUntilExpiry(endDate);
      const alertLevel = getExpiryAlertLevel(daysUntilExpiry);

      res.json({
        endDate,
        daysUntilExpiry,
        alertLevel,
        isExpired: daysUntilExpiry !== null && daysUntilExpiry <= 0,
        needsRenewal: daysUntilExpiry !== null && daysUntilExpiry <= 14,
      });
    } catch (error) {
      console.error("Error checking certificate expiry:", error);
      res.status(500).json({
        error: "Failed to check certificate expiry",
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

  // Provider communication templates
  app.get("/api/provider-templates", (_req, res) => {
    const templates = getAllTemplates();
    res.json({ templates });
  });

  app.get("/api/provider-templates/:target", (req, res) => {
    const target = req.params.target.toUpperCase() as any;
    const templates = getTemplatesForTarget(target);
    res.json({ target, templates });
  });

  // Generate a message from template for a case
  app.post("/api/cases/:id/generate-message", async (req, res) => {
    try {
      const caseId = req.params.id;
      const { templateId, additionalVariables } = req.body;

      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const templates = getAllTemplates();
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const message = generateMessage(template, workerCase, additionalVariables);
      res.json({ message });
    } catch (err) {
      console.error("Failed to generate message:", err);
      res.status(500).json({
        error: "Failed to generate message",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // Get suggested communications for a case
  app.get("/api/cases/:id/suggested-communications", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getGPNet2CaseById(caseId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const suggestions = getSuggestedCommunications(workerCase);
      res.json({ caseId, suggestions });
    } catch (err) {
      console.error("Failed to get suggested communications:", err);
      res.status(500).json({
        error: "Failed to get suggested communications",
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

  // ========================================
  // Predictive Analytics API Endpoints
  // ========================================

  // GET /api/cases/:id/predictions - Get all predictions for a case
  app.get("/api/cases/:id/predictions", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getCaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const predictions = getAllPredictions(workerCase);
      res.json(predictions);
    } catch (err) {
      console.error("Prediction error:", err);
      res.status(500).json({ error: "Failed to generate predictions" });
    }
  });

  // GET /api/cases/:id/predict/duration - Predict case duration
  app.get("/api/cases/:id/predict/duration", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getCaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const prediction = predictCaseDuration(workerCase);
      res.json({
        caseId,
        workerName: workerCase.workerName,
        prediction,
        confidenceExplanation: explainConfidence(prediction.confidence),
      });
    } catch (err) {
      console.error("Duration prediction error:", err);
      res.status(500).json({ error: "Failed to predict duration" });
    }
  });

  // GET /api/cases/:id/predict/rtw - Predict RTW probability
  app.get("/api/cases/:id/predict/rtw", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getCaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const prediction = predictRTWProbability(workerCase);
      res.json({
        caseId,
        workerName: workerCase.workerName,
        prediction,
        confidenceExplanation: explainConfidence(prediction.confidence),
      });
    } catch (err) {
      console.error("RTW prediction error:", err);
      res.status(500).json({ error: "Failed to predict RTW probability" });
    }
  });

  // GET /api/cases/:id/predict/deterioration - Predict deterioration risk
  app.get("/api/cases/:id/predict/deterioration", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getCaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const prediction = predictDeteriorationRisk(workerCase);
      res.json({
        caseId,
        workerName: workerCase.workerName,
        prediction,
        confidenceExplanation: explainConfidence(prediction.confidence),
      });
    } catch (err) {
      console.error("Deterioration prediction error:", err);
      res.status(500).json({ error: "Failed to predict deterioration risk" });
    }
  });

  // GET /api/predictions/rankings - Get all cases ranked by priority
  app.get("/api/predictions/rankings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const urgencyFilter = req.query.urgency as string;

      const allCases = await storage.getGPNet2Cases();
      let rankings = rankCasesByPriority(allCases);

      // Filter by urgency if specified
      if (urgencyFilter && ["low", "medium", "high", "critical"].includes(urgencyFilter)) {
        rankings = rankings.filter(r => r.urgencyLevel === urgencyFilter);
      }

      // Limit results
      rankings = rankings.slice(0, limit);

      res.json({
        rankings,
        totalCases: allCases.length,
        generatedAt: new Date().toISOString(),
        modelVersion: "xgb-priority-v1.0",
      });
    } catch (err) {
      console.error("Rankings error:", err);
      res.status(500).json({ error: "Failed to generate rankings" });
    }
  });

  // ========================================
  // RAG Knowledge Base API Endpoints
  // ========================================

  // GET /api/knowledge/search - Search knowledge base
  app.get("/api/knowledge/search", (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const layers = req.query.layers
        ? (req.query.layers as string).split(",") as KnowledgeLayer[]
        : undefined;
      const types = req.query.types
        ? (req.query.types as string).split(",") as DocumentType[]
        : undefined;
      const company = req.query.company as string;
      const tags = req.query.tags
        ? (req.query.tags as string).split(",")
        : undefined;

      const results = searchKnowledge(query, { limit, layers, types, company, tags });

      res.json({
        query,
        results,
        count: results.length,
        searchedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Knowledge search error:", err);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // POST /api/knowledge/context - Get RAG context for AI
  app.post("/api/knowledge/context", (req, res) => {
    try {
      const { query, limit, company, caseContext } = req.body;

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const context = getRAGContext(query, { limit, company, caseContext });
      res.json(context);
    } catch (err) {
      console.error("RAG context error:", err);
      res.status(500).json({ error: "Failed to get context" });
    }
  });

  // GET /api/knowledge/stats - Get knowledge base statistics
  app.get("/api/knowledge/stats", (_req, res) => {
    try {
      const stats = getKnowledgeBaseStats();
      res.json(stats);
    } catch (err) {
      console.error("Knowledge stats error:", err);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // GET /api/knowledge/documents - List documents
  app.get("/api/knowledge/documents", (req, res) => {
    try {
      const layer = req.query.layer as KnowledgeLayer | undefined;
      const type = req.query.type as DocumentType | undefined;
      const company = req.query.company as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = listDocuments({ layer, type, company, limit, offset });
      res.json(result);
    } catch (err) {
      console.error("List documents error:", err);
      res.status(500).json({ error: "Failed to list documents" });
    }
  });

  // POST /api/knowledge/documents - Index new document
  app.post("/api/knowledge/documents", (req, res) => {
    try {
      const { type, layer, title, content, metadata } = req.body;

      if (!type || !layer || !title || !content) {
        return res.status(400).json({
          error: "type, layer, title, and content are required",
        });
      }

      const doc = indexDocument(type, layer, title, content, metadata || {});
      res.status(201).json(doc);
    } catch (err) {
      console.error("Index document error:", err);
      res.status(500).json({ error: "Failed to index document" });
    }
  });

  // GET /api/knowledge/documents/:id - Get document by ID
  app.get("/api/knowledge/documents/:id", (req, res) => {
    try {
      const doc = getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (err) {
      console.error("Get document error:", err);
      res.status(500).json({ error: "Failed to get document" });
    }
  });

  // PUT /api/knowledge/documents/:id - Update document
  app.put("/api/knowledge/documents/:id", (req, res) => {
    try {
      const updates = req.body;
      const doc = updateDocument(req.params.id, updates);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (err) {
      console.error("Update document error:", err);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // DELETE /api/knowledge/documents/:id - Delete document
  app.delete("/api/knowledge/documents/:id", (req, res) => {
    try {
      const deleted = deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json({ success: true, deletedId: req.params.id });
    } catch (err) {
      console.error("Delete document error:", err);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // GET /api/knowledge/documents/:id/similar - Find similar documents
  app.get("/api/knowledge/documents/:id/similar", (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const similar = findSimilarDocuments(req.params.id, limit);
      res.json({ documentId: req.params.id, similar });
    } catch (err) {
      console.error("Find similar error:", err);
      res.status(500).json({ error: "Failed to find similar documents" });
    }
  });

  // GET /api/cases/:id/knowledge - Get relevant knowledge for a case
  app.get("/api/cases/:id/knowledge", async (req, res) => {
    try {
      const caseId = req.params.id;
      const workerCase = await storage.getCaseById(caseId);

      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      const limit = parseInt(req.query.limit as string) || 8;

      // Extract case characteristics
      const diagnosis = workerCase.diagnosis || "";
      let injuryType = "musculoskeletal";
      if (/psycholog|anxiety|depression|ptsd|stress|mental/i.test(diagnosis)) {
        injuryType = "psychological";
      }

      const knowledge = getCaseRelevantKnowledge(
        {
          company: workerCase.company,
          injuryType,
          diagnosis: workerCase.diagnosis || undefined,
          workStatus: workerCase.workStatus,
          riskLevel: workerCase.riskLevel,
        },
        limit
      );

      res.json({
        caseId,
        workerName: workerCase.workerName,
        knowledge,
      });
    } catch (err) {
      console.error("Case knowledge error:", err);
      res.status(500).json({ error: "Failed to get case knowledge" });
    }
  });

}
