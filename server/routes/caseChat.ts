import { Router, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { storage } from "../storage";
import { logger } from "../lib/logger";

const router = Router();

// Apply authentication and case ownership check
router.use("/:id/chat", authorize(), requireCaseOwnership());

/**
 * POST /api/cases/:id/chat
 * Chat with AI about a specific case
 */
router.post("/:id/chat", async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!;
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Message is required",
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "AI service is not configured",
      });
    }

    // Gather all case context
    const [certificates, timeline, discussionNotes] = await Promise.all([
      storage.getCaseRecoveryTimeline(workerCase.id, workerCase.organizationId).catch(() => []),
      storage.getCaseTimeline(workerCase.id, workerCase.organizationId, 20).catch(() => []),
      storage.getCaseDiscussionNotes(workerCase.id, workerCase.organizationId, 10).catch(() => []),
    ]);

    // Build case context for the AI
    const caseContext = buildCaseContext(workerCase, certificates, timeline, discussionNotes);

    // Call Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: `You are a case management assistant for GPNet, a workers compensation case management system. You help users understand and query specific worker cases.

You have access to the following case data. Answer questions accurately based on this data. If the information is not available, say so clearly.

Be concise but thorough. Format dates in a readable format (e.g., "15 January 2025"). Use bullet points for lists when appropriate.

${caseContext}`,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const content = response.content[0];
    const responseText = content.type === "text" ? content.text : "";

    res.json({
      success: true,
      data: {
        response: responseText,
        model: response.model,
        usage: response.usage,
      },
    });
  } catch (error) {
    logger.ai.error("Case chat error", {}, error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to process chat request",
    });
  }
});

function buildCaseContext(
  workerCase: any,
  certificates: any[],
  timeline: any[],
  discussionNotes: any[]
): string {
  const sections: string[] = [];

  // Basic case info
  sections.push(`## Case Information
- **Worker Name:** ${workerCase.workerName}
- **Company:** ${workerCase.company}
- **Date of Injury:** ${workerCase.dateOfInjury || "Not recorded"}
- **Injury Type:** ${workerCase.injuryType || "Not specified"}
- **Work Status:** ${workerCase.workStatus || "Unknown"}
- **Risk Level:** ${workerCase.riskLevel || "Not assessed"}
- **Compliance Indicator:** ${workerCase.complianceIndicator || "Unknown"}
- **Next Step:** ${workerCase.nextStep || "None specified"}
- **Due Date:** ${workerCase.dueDate || "Not set"}`);

  // Clinical status
  if (workerCase.rtwPlanStatus || workerCase.complianceStatus || workerCase.specialistStatus) {
    sections.push(`## Clinical Status
- **RTW Plan Status:** ${formatStatus(workerCase.rtwPlanStatus)}
- **Compliance Status:** ${formatStatus(workerCase.complianceStatus)}
- **Specialist Status:** ${formatStatus(workerCase.specialistStatus)}`);
  }

  // Medical certificates
  if (certificates.length > 0) {
    const certList = certificates.map((cert, i) => {
      const num = i + 1;
      return `${num}. **${cert.capacity}** capacity (${cert.startDate} to ${cert.endDate})${cert.restrictions ? ` - Restrictions: ${cert.restrictions}` : ""}`;
    }).join("\n");

    const firstCert = certificates[0];
    const lastCert = certificates[certificates.length - 1];

    // Determine recovery trend
    let trend = "Unknown";
    if (certificates.length >= 2) {
      const capacityOrder = { unfit: 0, partial: 1, fit: 2, unknown: 0.5 };
      const firstScore = capacityOrder[firstCert.capacity as keyof typeof capacityOrder] ?? 0.5;
      const lastScore = capacityOrder[lastCert.capacity as keyof typeof capacityOrder] ?? 0.5;

      if (lastScore > firstScore) trend = "Improving";
      else if (lastScore < firstScore) trend = "Declining";
      else trend = "Stable";
    }

    sections.push(`## Medical Certificates (${certificates.length} total)
**Recovery Trend:** ${trend}

**First Certificate:** ${firstCert.capacity} capacity (${firstCert.startDate})
**Latest Certificate:** ${lastCert.capacity} capacity (${lastCert.endDate})

### All Certificates:
${certList}`);
  } else {
    sections.push(`## Medical Certificates
No medical certificates on file.`);
  }

  // Timeline events
  if (timeline.length > 0) {
    const recentEvents = timeline.slice(0, 10).map((event) => {
      return `- **${event.eventType}** (${event.eventDate}): ${event.description || "No description"}`;
    }).join("\n");

    sections.push(`## Recent Timeline Events (last 10)
${recentEvents}`);
  }

  // Discussion notes
  if (discussionNotes.length > 0) {
    const notes = discussionNotes.slice(0, 5).map((note) => {
      const flags = note.riskFlags?.length > 0 ? ` [Flags: ${note.riskFlags.join(", ")}]` : "";
      return `- **${note.timestamp}:** ${note.summary}${flags}`;
    }).join("\n");

    sections.push(`## Recent Discussion Notes
${notes}`);
  }

  // AI Summary if available
  if (workerCase.aiSummary) {
    sections.push(`## AI Case Summary (previously generated)
${workerCase.aiSummary}`);
  }

  // Worker attitude indicators (if available from notes)
  const attitudeIndicators: string[] = [];
  if (workerCase.complianceStatus === "compliant") {
    attitudeIndicators.push("Worker appears cooperative with RTW process");
  } else if (workerCase.complianceStatus === "non_compliant") {
    attitudeIndicators.push("Worker has shown non-compliance with some requirements");
  }

  if (attitudeIndicators.length > 0) {
    sections.push(`## Worker Attitude Indicators
${attitudeIndicators.map(i => `- ${i}`).join("\n")}`);
  }

  return sections.join("\n\n");
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "Not recorded";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default router;
