/**
 * Smart Summary Engine v1
 *
 * Generates structured case summaries by analyzing:
 * - Timeline events
 * - Medical certificates
 * - Pending actions
 * - Compliance status
 *
 * Uses Anthropic Claude to produce actionable insights with structured data.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { IStorage } from "../storage";
import type {
  CaseSummary,
  WorkerCase,
  TimelineEvent,
  MedicalCertificate,
  CaseAction,
  CertificateCompliance,
  SummaryRisk,
  MissingInfoItem,
  RecommendedAction,
  MedicalCertificateDB,
  CaseActionDB,
} from "@shared/schema";
import { getCaseCompliance } from "./certificateCompliance";

const MODEL = "claude-sonnet-4-20250514";

export interface CaseContext {
  workerCase: WorkerCase;
  timeline: TimelineEvent[];
  certificates: MedicalCertificate[];
  actions: CaseAction[];
  compliance: CertificateCompliance;
}

function mapDbCertificate(cert: MedicalCertificateDB): MedicalCertificate {
  return {
    id: cert.id,
    caseId: cert.caseId,
    issueDate: cert.issueDate?.toISOString() ?? cert.startDate.toISOString(),
    startDate: cert.startDate.toISOString(),
    endDate: cert.endDate.toISOString(),
    capacity: cert.capacity as MedicalCertificate["capacity"],
    notes: cert.notes ?? undefined,
    source: (cert.source as MedicalCertificate["source"]) ?? "freshdesk",
    documentUrl: cert.documentUrl ?? undefined,
    sourceReference: cert.sourceReference ?? undefined,
    createdAt: cert.createdAt?.toISOString(),
    updatedAt: cert.updatedAt?.toISOString(),
  };
}

function mapDbAction(action: CaseActionDB): CaseAction {
  return {
    id: action.id,
    caseId: action.caseId,
    type: action.type as CaseAction["type"],
    status: action.status as CaseAction["status"],
    dueDate: action.dueDate?.toISOString(),
    priority: action.priority ?? 1,
    notes: action.notes ?? undefined,
    createdAt: action.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: action.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Fetch all context data needed for summary generation
 * Exported for reuse by emailDraftService and other modules
 */
export async function fetchCaseContext(
  storage: IStorage,
  caseId: string
): Promise<CaseContext> {
  const workerCase = await storage.getGPNet2CaseById(caseId);
  if (!workerCase) {
    throw new Error(`Case ${caseId} not found`);
  }

  const [timeline, dbCertificates, dbActions, compliance] = await Promise.all([
    storage.getCaseTimeline(caseId, 20),
    storage.getCertificatesByCase(caseId),
    storage.getActionsByCase(caseId),
    getCaseCompliance(storage, caseId),
  ]);

  const certificates = dbCertificates.map(mapDbCertificate);
  const actions = dbActions.map(mapDbAction);

  return {
    workerCase,
    timeline,
    certificates,
    actions,
    compliance,
  };
}

/**
 * Build the prompt for the LLM
 */
function buildPrompt(context: CaseContext): string {
  const { workerCase, timeline, certificates, actions, compliance } = context;

  const timelineText = timeline.length > 0
    ? timeline
        .slice(0, 15)
        .map(
          (e) =>
            `- [${new Date(e.timestamp).toLocaleDateString("en-AU")}] ${e.eventType}: ${e.title}${e.description ? ` - ${e.description}` : ""}`
        )
        .join("\n")
    : "No timeline events recorded.";

  const certificatesText = certificates.length > 0
    ? certificates
        .slice(0, 5)
        .map(
          (c) =>
            `- Capacity: ${c.capacity.toUpperCase()} | ${new Date(c.startDate).toLocaleDateString("en-AU")} to ${new Date(c.endDate).toLocaleDateString("en-AU")}${c.notes ? ` | Notes: ${c.notes.slice(0, 100)}` : ""}`
        )
        .join("\n")
    : "No medical certificates on file.";

  const pendingActions = actions.filter((a) => a.status === "pending");
  const actionsText = pendingActions.length > 0
    ? pendingActions
        .map(
          (a) =>
            `- ${a.type.replace(/_/g, " ").toUpperCase()}${a.dueDate ? ` (due: ${new Date(a.dueDate).toLocaleDateString("en-AU")})` : ""}${a.notes ? `: ${a.notes}` : ""}`
        )
        .join("\n")
    : "No pending actions.";

  const complianceText = `Status: ${compliance.status.replace(/_/g, " ").toUpperCase()}\n${compliance.message}${compliance.daysUntilExpiry !== undefined ? `\nDays until expiry: ${compliance.daysUntilExpiry}` : ""}${compliance.daysSinceExpiry !== undefined ? `\nDays since expiry: ${compliance.daysSinceExpiry}` : ""}`;

  return `You are analyzing a workplace injury/health case for a case manager in Australia.

CASE DATA:
- Worker: ${workerCase.workerName}
- Company: ${workerCase.company}
- Date of Injury: ${workerCase.dateOfInjury}
- Current Work Status: ${workerCase.workStatus}
- Risk Level: ${workerCase.riskLevel}
- Compliance Indicator: ${workerCase.complianceIndicator}
- Current Status: ${workerCase.currentStatus}
- Next Step: ${workerCase.nextStep}
- Has Certificate: ${workerCase.hasCertificate ? "Yes" : "No"}

CASE DESCRIPTION:
${workerCase.summary || "No description available."}

TIMELINE (most recent first):
${timelineText}

MEDICAL CERTIFICATES:
${certificatesText}

CERTIFICATE COMPLIANCE STATUS:
${complianceText}

PENDING ACTIONS:
${actionsText}

Generate a structured case analysis. You MUST respond with ONLY a valid JSON object (no markdown, no code blocks) matching this exact schema:

{
  "summaryText": "2-3 paragraph narrative overview of the case situation",
  "currentStatus": "One-line status summary",
  "risks": [
    {
      "level": "high" | "medium" | "low",
      "description": "Description of the risk",
      "source": "What data point triggered this risk"
    }
  ],
  "missingInfo": [
    {
      "item": "What information is missing",
      "importance": "critical" | "recommended"
    }
  ],
  "recommendedActions": [
    {
      "action": "What should be done",
      "priority": "urgent" | "normal",
      "reason": "Why this is needed"
    }
  ],
  "rtwReadiness": {
    "level": "ready" | "conditional" | "not_ready" | "unknown",
    "conditions": ["Conditions that must be met"],
    "blockers": ["What's blocking RTW"]
  },
  "compliance": {
    "status": "compliant" | "at_risk" | "non_compliant",
    "issues": ["List of compliance issues"]
  },
  "confidence": 0-100
}

IMPORTANT:
- Be concise but thorough
- Focus on actionable insights
- Identify any gaps in documentation
- Consider WorkSafe Victoria compliance requirements
- Assess return-to-work readiness based on medical evidence
- Output ONLY the JSON object, no other text`;
}

/**
 * Parse the LLM response into a CaseSummary
 */
function parseResponse(caseId: string, responseText: string): CaseSummary {
  // Clean up the response - remove any markdown code blocks if present
  let cleanedResponse = responseText.trim();
  if (cleanedResponse.startsWith("```json")) {
    cleanedResponse = cleanedResponse.slice(7);
  } else if (cleanedResponse.startsWith("```")) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  if (cleanedResponse.endsWith("```")) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }
  cleanedResponse = cleanedResponse.trim();

  try {
    const parsed = JSON.parse(cleanedResponse);

    // Validate and normalize the response
    return {
      caseId,
      generatedAt: new Date().toISOString(),
      summaryText: parsed.summaryText || "Unable to generate summary.",
      currentStatus: parsed.currentStatus || "Status unknown",
      risks: Array.isArray(parsed.risks)
        ? parsed.risks.map((r: any) => ({
            level: r.level || "medium",
            description: r.description || "",
            source: r.source || "Unknown",
          }))
        : [],
      missingInfo: Array.isArray(parsed.missingInfo)
        ? parsed.missingInfo.map((m: any) => ({
            item: m.item || "",
            importance: m.importance || "recommended",
          }))
        : [],
      recommendedActions: Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions.map((a: any) => ({
            action: a.action || "",
            priority: a.priority || "normal",
            reason: a.reason || "",
          }))
        : [],
      rtwReadiness: {
        level: parsed.rtwReadiness?.level || "unknown",
        conditions: Array.isArray(parsed.rtwReadiness?.conditions)
          ? parsed.rtwReadiness.conditions
          : [],
        blockers: Array.isArray(parsed.rtwReadiness?.blockers)
          ? parsed.rtwReadiness.blockers
          : [],
      },
      compliance: {
        status: parsed.compliance?.status || "at_risk",
        issues: Array.isArray(parsed.compliance?.issues)
          ? parsed.compliance.issues
          : [],
      },
      confidence: typeof parsed.confidence === "number"
        ? Math.min(100, Math.max(0, parsed.confidence))
        : 50,
    };
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    console.error("Response was:", cleanedResponse.slice(0, 500));

    // Return a fallback summary
    return {
      caseId,
      generatedAt: new Date().toISOString(),
      summaryText: "Unable to parse AI response. Please try regenerating the summary.",
      currentStatus: "Error generating summary",
      risks: [],
      missingInfo: [],
      recommendedActions: [],
      rtwReadiness: {
        level: "unknown",
        conditions: [],
        blockers: [],
      },
      compliance: {
        status: "at_risk",
        issues: ["Unable to determine compliance status"],
      },
      confidence: 0,
    };
  }
}

/**
 * Generate a smart case summary
 */
export async function generateSmartSummary(
  storage: IStorage,
  caseId: string
): Promise<CaseSummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not configured");
  }

  const anthropic = new Anthropic({ apiKey });

  // Fetch all context data
  const context = await fetchCaseContext(storage, caseId);

  // Build the prompt
  const prompt = buildPrompt(context);

  // Call the LLM
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in AI response");
  }

  // Parse and return the summary
  return parseResponse(caseId, textContent.text);
}

/**
 * Generate a summary without AI (rule-based fallback)
 */
export async function generateFallbackSummary(
  storage: IStorage,
  caseId: string
): Promise<CaseSummary> {
  const context = await fetchCaseContext(storage, caseId);
  const { workerCase, timeline, certificates, actions, compliance } = context;

  const risks: SummaryRisk[] = [];
  const missingInfo: MissingInfoItem[] = [];
  const recommendedActions: RecommendedAction[] = [];

  // Analyze compliance status
  if (compliance.status === "certificate_expired") {
    risks.push({
      level: "high",
      description: "Medical certificate has expired",
      source: "Certificate compliance check",
    });
    recommendedActions.push({
      action: "Chase updated medical certificate from worker/GP",
      priority: "urgent",
      reason: "Cannot proceed without valid medical documentation",
    });
  } else if (compliance.status === "certificate_expiring_soon") {
    risks.push({
      level: "medium",
      description: `Certificate expires in ${compliance.daysUntilExpiry} days`,
      source: "Certificate compliance check",
    });
    recommendedActions.push({
      action: "Request certificate renewal before expiry",
      priority: "normal",
      reason: "Proactive certificate management",
    });
  } else if (compliance.status === "no_certificate") {
    risks.push({
      level: "high",
      description: "No medical certificate on file",
      source: "Certificate compliance check",
    });
    missingInfo.push({
      item: "Medical certificate",
      importance: "critical",
    });
  }

  // Check for missing information
  if (!workerCase.dateOfInjury) {
    missingInfo.push({
      item: "Date of injury",
      importance: "critical",
    });
  }

  if (certificates.length === 0) {
    missingInfo.push({
      item: "Medical certificates",
      importance: "critical",
    });
  }

  if (timeline.length < 3) {
    missingInfo.push({
      item: "Case timeline/history",
      importance: "recommended",
    });
  }

  // Pending actions
  const pendingActions = actions.filter((a) => a.status === "pending");
  for (const action of pendingActions.slice(0, 3)) {
    const isOverdue = action.dueDate && new Date(action.dueDate) < new Date();
    recommendedActions.push({
      action: action.type.replace(/_/g, " "),
      priority: isOverdue ? "urgent" : "normal",
      reason: action.notes || "Pending case action",
    });
  }

  // Determine RTW readiness
  const latestCert = certificates[0];
  let rtwLevel: CaseSummary["rtwReadiness"]["level"] = "unknown";
  const conditions: string[] = [];
  const blockers: string[] = [];

  if (latestCert) {
    if (latestCert.capacity === "fit") {
      rtwLevel = "ready";
    } else if (latestCert.capacity === "partial") {
      rtwLevel = "conditional";
      conditions.push("Modified duties required");
    } else if (latestCert.capacity === "unfit") {
      rtwLevel = "not_ready";
      blockers.push("Worker certified unfit for work");
    }
  } else {
    blockers.push("No current medical certificate");
  }

  if (compliance.status !== "compliant") {
    blockers.push("Certificate compliance issues");
  }

  // Determine overall compliance status
  let complianceStatus: CaseSummary["compliance"]["status"] = "compliant";
  const complianceIssues: string[] = [];

  if (compliance.status === "certificate_expired" || compliance.status === "no_certificate") {
    complianceStatus = "non_compliant";
    complianceIssues.push(compliance.message);
  } else if (compliance.status === "certificate_expiring_soon") {
    complianceStatus = "at_risk";
    complianceIssues.push(compliance.message);
  }

  // Build summary text
  const summaryText = `${workerCase.workerName} from ${workerCase.company} has an open worker's compensation case following an injury on ${workerCase.dateOfInjury}. Current work status is "${workerCase.workStatus}" with a ${workerCase.riskLevel.toLowerCase()} risk level.

${certificates.length > 0 ? `The most recent certificate indicates ${latestCert?.capacity} capacity.` : "No medical certificates are currently on file."} ${compliance.message}

${pendingActions.length > 0 ? `There are ${pendingActions.length} pending action(s) requiring attention.` : "No pending actions at this time."} ${timeline.length > 0 ? `The case timeline shows ${timeline.length} recorded events.` : ""}`;

  return {
    caseId,
    generatedAt: new Date().toISOString(),
    summaryText: summaryText.trim(),
    currentStatus: workerCase.currentStatus || `${workerCase.workStatus} - ${workerCase.riskLevel} risk`,
    risks,
    missingInfo,
    recommendedActions,
    rtwReadiness: {
      level: rtwLevel,
      conditions,
      blockers,
    },
    compliance: {
      status: complianceStatus,
      issues: complianceIssues,
    },
    confidence: 60, // Rule-based analysis has moderate confidence
  };
}
