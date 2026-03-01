/**
 * Report Generator Service
 * Triggered after a worker submits their pre-employment questionnaire.
 * Uses Claude to analyze responses against job description and generate a clearance report.
 */
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";
import { type PreEmploymentClearanceLevel, type PreEmploymentAssessmentDB } from "@shared/schema";
import { sendEmail } from "./emailService";
import { createLogger } from "../lib/logger";

const logger = createLogger("ReportGenerator");

const CLEARANCE_VALUES: PreEmploymentClearanceLevel[] = [
  "cleared_unconditional",
  "cleared_conditional",
  "cleared_with_restrictions",
  "requires_review",
  "not_cleared",
];

/**
 * Generate an AI report for a pre-employment assessment.
 * Accepts the full assessment object (already loaded at submission time).
 * Called async (fire-and-forget) after worker questionnaire submission.
 */
export async function generateReport(assessment: PreEmploymentAssessmentDB): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error("generateReport: ANTHROPIC_API_KEY not set");
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = buildReportPrompt(assessment);

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      system: `You are a workplace health assessment specialist.
Analyze pre-employment health questionnaire responses against the job description provided.
Return a structured JSON report only — no prose, no markdown fences.`,
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";
    // Strip markdown code fences if the model wrapped the JSON
    const text = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let report: Record<string, unknown>;
    try {
      report = JSON.parse(text);
    } catch {
      logger.error("generateReport: failed to parse AI response as JSON", { assessmentId: assessment.id, text });
      report = { error: "Could not parse AI output", raw: rawText };
    }

    const clearanceLevel = extractClearance(report);
    await storage.updateAssessmentReport(assessment.id, report, clearanceLevel);

    logger.info("Report generated", { assessmentId: assessment.id, clearanceLevel });

    // Notify employer or alert Jacinta
    await notifyAfterReport(assessment, report, clearanceLevel);
  } catch (error) {
    logger.error("generateReport error:", undefined, error);
    await alertJacinta("report_generation_failed", {
      assessmentId: assessment.id,
      candidateName: assessment.candidateName,
      error: String(error),
    });
  }
}

function buildReportPrompt(assessment: PreEmploymentAssessmentDB): string {
  return `
Pre-Employment Health Assessment Report Request

Candidate: ${assessment.candidateName}
Position: ${assessment.positionTitle}
${assessment.jobDescription ? `Job Description:\n${assessment.jobDescription}` : ""}

Questionnaire Responses:
${JSON.stringify(assessment.questionnaireResponses, null, 2)}

Generate a structured JSON report with this exact shape:
{
  "executiveSummary": "...",
  "healthStatus": "...",
  "fitnessAssessment": "...",
  "flags": ["..."],
  "clearanceRecommendation": "cleared_unconditional | cleared_conditional | cleared_with_restrictions | requires_review | not_cleared",
  "conditions": "any conditions or restrictions if applicable",
  "notes": "..."
}

Choose clearanceRecommendation based on:
- cleared_unconditional: no issues, fit for role
- cleared_conditional: fit with minor conditions or monitoring
- cleared_with_restrictions: fit but with work restrictions
- requires_review: needs doctor review before decision
- not_cleared: not suitable for this role based on responses
`;
}

function extractClearance(report: Record<string, unknown>): PreEmploymentClearanceLevel {
  const raw = String(report.clearanceRecommendation ?? "requires_review");
  if ((CLEARANCE_VALUES as string[]).includes(raw)) return raw as PreEmploymentClearanceLevel;
  return "requires_review";
}

async function notifyAfterReport(
  assessment: PreEmploymentAssessmentDB,
  report: Record<string, unknown>,
  clearanceLevel: PreEmploymentClearanceLevel,
): Promise<void> {
  const autoSend = clearanceLevel === "cleared_unconditional" || clearanceLevel === "cleared_conditional";

  if (autoSend && assessment.candidateEmail) {
    await sendEmail({
      to: assessment.candidateEmail,
      subject: `Pre-Employment Health Assessment — ${assessment.positionTitle}`,
      body: buildEmployerEmail(assessment, report, clearanceLevel),
    });
    await storage.markAssessmentEmployerNotified(assessment.id);
    logger.info("Employer auto-notified", { assessmentId: assessment.id, clearanceLevel });
  } else {
    await alertJacinta("assessment_flagged", {
      assessmentId: assessment.id,
      candidateName: assessment.candidateName,
      positionTitle: assessment.positionTitle,
      clearanceLevel,
      summary: report.executiveSummary,
    });
  }
}

function buildEmployerEmail(
  assessment: PreEmploymentAssessmentDB,
  report: Record<string, unknown>,
  clearanceLevel: string,
): string {
  return `
Pre-Employment Health Check — ${assessment.positionTitle}

Candidate: ${assessment.candidateName}
Clearance: ${clearanceLevel.replace(/_/g, " ").toUpperCase()}

${report.executiveSummary ?? ""}

${report.conditions ? `Conditions: ${report.conditions}` : ""}

This report was generated by Preventli's AI health assessment system.
A registered doctor is available for review via telehealth if required.
  `.trim();
}

async function alertJacinta(type: string, details: Record<string, unknown>): Promise<void> {
  try {
    await sendEmail({
      to: "jacinta@preventli.ai",
      subject: `⚠️ Action Required — ${type.replace(/_/g, " ")}`,
      body: `
Hi Jacinta,

The system requires your attention:

Type: ${type}
Details:
${JSON.stringify(details, null, 2)}

Please review and resolve in the admin panel.

— Preventli System
      `.trim(),
    });
  } catch (err) {
    logger.error("alertJacinta failed:", undefined, err);
  }
}
