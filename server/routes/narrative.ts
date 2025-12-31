/**
 * Narrative API Routes
 *
 * Charter-compliant endpoints that return narrative-first responses.
 * These endpoints provide complete case explanations without requiring
 * multi-step UI navigation.
 *
 * Principle: Every response must answer:
 * - What happened?
 * - Why did it happen?
 * - Which rule or obligation triggered it?
 * - What happens next?
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { generateSmartSummary, generateFallbackSummary, fetchCaseContext } from "../services/smartSummary";
import { evaluateClinicalEvidence } from "../services/clinicalEvidence";
import { getCaseCompliance } from "../services/certificateCompliance";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "../services/auditLogger";
import { createLogger } from "../lib/logger";
import type { CaseSummary, TerminationProcess, WorkerCase } from "@shared/schema";

const router = Router();
const log = createLogger("NarrativeRoutes");

/**
 * Case Narrative - Complete case explanation in a single response
 *
 * GET /api/cases/:id/narrative
 *
 * Returns a complete narrative view of a case including:
 * - AI-generated summary text
 * - Compliance status with explanations
 * - Next actions with rationale
 * - Risk explanations
 */
router.get(
  "/:id/narrative",
  authorize(),
  requireCaseOwnership(),
  async (req: AuthRequest, res) => {
    try {
      const workerCase = req.workerCase!;
      const caseId = workerCase.id;
      const organizationId = workerCase.organizationId;

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "case_narrative",
        resourceId: caseId,
        ...getRequestMetadata(req),
      });

      // Fetch or generate smart summary
      let caseSummary: CaseSummary;
      try {
        caseSummary = await generateSmartSummary(storage, caseId, organizationId);
      } catch (error) {
        log.warn("AI summary unavailable, using fallback", { caseId });
        caseSummary = await generateFallbackSummary(storage, caseId, organizationId);
      }

      // Get clinical evidence evaluation
      const clinicalEvidence = evaluateClinicalEvidence(workerCase);

      // Get compliance details
      const compliance = await getCaseCompliance(storage, caseId, organizationId);

      // Build next actions with full rationale
      const nextActions = caseSummary.recommendedActions.map((action, index) => ({
        id: `action-${index}`,
        description: action.action,
        rationale: action.reason,
        priority: action.priority,
        endpoint: buildActionEndpoint(action.action, caseId),
      }));

      // Build risk narrative
      const riskNarrative = buildRiskNarrative(caseSummary, workerCase);

      // Build compliance narrative
      const complianceNarrative = buildComplianceNarrative(compliance, caseSummary);

      // Build RTW status narrative
      const rtwNarrative = buildRTWNarrative(caseSummary, workerCase);

      // Build timeline explanation
      const timelineExplanation = buildTimelineExplanation(workerCase);

      res.json({
        caseId,
        workerName: workerCase.workerName,
        company: workerCase.company,
        generatedAt: caseSummary.generatedAt,
        confidence: caseSummary.confidence,

        // Primary narrative - answers "What's happening with this case?"
        summary: caseSummary.summaryText,
        currentStatus: caseSummary.currentStatus,

        // Compliance section - answers "Is this case compliant and why?"
        compliance: {
          status: complianceNarrative.status,
          indicator: workerCase.complianceIndicator,
          narrative: complianceNarrative.narrative,
          issues: caseSummary.compliance.issues,
        },

        // Risk section - answers "What are the risks and why?"
        risk: {
          level: workerCase.riskLevel,
          narrative: riskNarrative,
          items: caseSummary.risks,
        },

        // RTW section - answers "Is this worker ready to return?"
        returnToWork: {
          status: caseSummary.rtwReadiness.level,
          narrative: rtwNarrative,
          conditions: caseSummary.rtwReadiness.conditions,
          blockers: caseSummary.rtwReadiness.blockers,
          planStatus: workerCase.rtwPlanStatus,
        },

        // Clinical evidence - answers "What does the medical evidence say?"
        clinicalEvidence: clinicalEvidence
          ? {
              dutySafetyStatus: clinicalEvidence.dutySafetyStatus,
              highRiskFlags: clinicalEvidence.flags
                .filter((f) => f.severity === "high_risk")
                .map((f) => f.message),
              recommendations: clinicalEvidence.recommendedActions?.slice(0, 3).map((a) => ({
                action: a.label,
                explanation: a.explanation,
              })),
            }
          : null,

        // Next actions - answers "What should I do next and why?"
        nextActions,

        // Missing information - answers "What's missing?"
        missingInfo: caseSummary.missingInfo,

        // Timeline explanation
        timeline: timelineExplanation,

        // Meta information for audit trail
        meta: {
          model: "smart-summary-v1",
          fallback: caseSummary.confidence < 50,
        },
      });
    } catch (error) {
      log.error("Failed to generate case narrative", {}, error);
      res.status(500).json({
        error: "Failed to generate case narrative",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Termination Narrative - Complete termination process explanation
 *
 * GET /api/termination/:workerCaseId/narrative
 *
 * Returns a complete narrative view of termination process including:
 * - Current stage description
 * - Completed steps with summaries
 * - Next step with rationale
 * - Warnings and risk flags
 */
router.get(
  "/termination/:workerCaseId/narrative",
  authorize(),
  async (req: AuthRequest, res) => {
    try {
      const { workerCaseId } = req.params;
      const organizationId = req.user!.organizationId;

      // Verify case ownership
      const workerCase = await storage.getGPNet2CaseById(workerCaseId, organizationId);
      if (!workerCase) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId,
        eventType: AuditEventTypes.CASE_VIEW,
        resourceType: "termination_narrative",
        resourceId: workerCaseId,
        ...getRequestMetadata(req),
      });

      // Get termination process
      const process = await storage.getTerminationProcess(workerCaseId);

      if (!process) {
        return res.json({
          caseId: workerCaseId,
          workerName: workerCase.workerName,
          hasProcess: false,
          narrative: `No employment capacity review has been initiated for ${workerCase.workerName}. This process should only be started when all return-to-work options have been exhausted and documented.`,
          nextStep: {
            description: "Initiate capacity review if RTW options exhausted",
            rationale: "Employment capacity review is a last resort after documenting all RTW attempts and alternative role considerations.",
            action: "initiate",
          },
          warnings: workerCase.terminationAuditFlag === "HIGH_RISK"
            ? ["Medical evidence appears stale. Review flagged as HIGH RISK."]
            : [],
        });
      }

      // Build completed steps narrative
      const completedSteps = buildCompletedSteps(process);

      // Build current stage description
      const stageDescription = getStageDescription(process);

      // Build next step
      const nextStep = getNextStep(process);

      // Build warnings
      const warnings = buildTerminationWarnings(process, workerCase);

      res.json({
        caseId: workerCaseId,
        workerName: workerCase.workerName,
        hasProcess: true,
        currentStage: process.status,
        stageLabel: TERMINATION_STAGE_LABELS[process.status],
        stageDescription,
        completedSteps,
        nextStep,
        warnings,

        // Document IDs if available
        documents: {
          preTerminationLetter: process.preTerminationLetterDocId,
          terminationLetter: process.terminationLetterDocId,
        },

        // Key dates
        dates: {
          initiated: process.createdAt,
          lastUpdated: process.updatedAt,
          preTerminationMeeting: process.preTerminationMeetingDate,
          terminationEffective: process.terminationEffectiveDate,
        },
      });
    } catch (error) {
      log.error("Failed to generate termination narrative", {}, error);
      res.status(500).json({
        error: "Failed to generate termination narrative",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * Portfolio Report - Narrative summary of all cases
 *
 * GET /api/reports/portfolio
 *
 * Returns a narrative report of the entire case portfolio including:
 * - Executive summary
 * - Cases requiring attention
 * - Risk distribution
 * - Financial summary
 */
router.get(
  "/portfolio",
  authorize(),
  async (req: AuthRequest, res) => {
    try {
      const organizationId = req.user!.organizationId;

      // Log access
      await logAuditEvent({
        userId: req.user!.id,
        organizationId,
        eventType: AuditEventTypes.CASE_LIST,
        resourceType: "portfolio_report",
        ...getRequestMetadata(req),
      });

      // Get all cases for the organization
      const casesResult = await storage.getGPNet2CasesPaginated(organizationId, 1, 500);
      const cases = casesResult.cases.filter((c) => c.caseStatus !== "closed");

      // Categorize cases
      const highRisk = cases.filter((c) => c.riskLevel === "High");
      const mediumRisk = cases.filter((c) => c.riskLevel === "Medium");
      const lowRisk = cases.filter((c) => c.riskLevel === "Low");

      const complianceRisk = cases.filter(
        (c) => c.complianceIndicator === "Low" || c.complianceIndicator === "Very Low"
      );

      const offWork = cases.filter((c) => c.workStatus === "Off work");
      const atWork = cases.filter((c) => c.workStatus === "At work");

      // Find cases needing attention
      const attentionRequired = cases
        .filter((c) => {
          const isHighRisk = c.riskLevel === "High";
          const isLowCompliance = c.complianceIndicator === "Low" || c.complianceIndicator === "Very Low";
          const hasExpiredCert = !c.hasCertificate;
          return isHighRisk || isLowCompliance || hasExpiredCert;
        })
        .slice(0, 5)
        .map((c) => ({
          caseId: c.id,
          workerName: c.workerName,
          company: c.company,
          issue: buildCaseIssue(c),
          action: buildCaseAction(c),
        }));

      // Calculate financial estimates
      const weeklyCostEstimate = cases.reduce((total, c) => {
        return total + (c.workStatus === "Off work" ? 15000 : 5000);
      }, 0);

      const potentialSavings = offWork.length * 10000; // Simplified estimate

      // Build executive summary
      const executiveSummary = buildExecutiveSummary(
        cases.length,
        attentionRequired.length,
        highRisk.length,
        offWork.length
      );

      res.json({
        generatedAt: new Date().toISOString(),
        organizationId,

        executiveSummary,

        attentionRequired,

        riskDistribution: {
          high: highRisk.length,
          medium: mediumRisk.length,
          low: lowRisk.length,
          complianceRisk: complianceRisk.length,
        },

        workStatus: {
          atWork: atWork.length,
          offWork: offWork.length,
        },

        financialSummary: {
          estimatedWeeklyCost: weeklyCostEstimate,
          potentialWeeklySavings: potentialSavings,
          narrative: `Current estimated weekly cost is $${weeklyCostEstimate.toLocaleString()} across ${cases.length} active cases. With ${offWork.length} workers off work, successful RTW for all could save approximately $${potentialSavings.toLocaleString()} per week.`,
        },

        meta: {
          totalCases: cases.length,
          closedCases: casesResult.cases.length - cases.length,
        },
      });
    } catch (error) {
      log.error("Failed to generate portfolio report", {}, error);
      res.status(500).json({
        error: "Failed to generate portfolio report",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Helper functions

const TERMINATION_STAGE_LABELS: Record<TerminationProcess["status"], string> = {
  NOT_STARTED: "Not Started",
  PREP_EVIDENCE: "Preparing Evidence & Alternatives",
  AGENT_MEETING: "Agent Meeting",
  CONSULTANT_CONFIRMATION: "Consultant Confirmation",
  PRE_TERMINATION_INVITE_SENT: "Pre-Termination Invite Sent",
  PRE_TERMINATION_MEETING_COMPLETED: "Pre-Termination Meeting Completed",
  DECISION_PENDING: "Decision Pending",
  TERMINATED: "Terminated",
  TERMINATION_ABORTED: "Process Aborted",
};

const STAGE_DESCRIPTIONS: Record<TerminationProcess["status"], string> = {
  NOT_STARTED: "The employment capacity review has not been initiated. This should only begin after all RTW options have been documented and exhausted.",
  PREP_EVIDENCE: "Documenting pre-injury role, RTW attempts, and alternative roles considered. This evidence forms the foundation of the capacity review.",
  AGENT_MEETING: "Meeting with the employment agent to discuss the worker's situation and document the path forward.",
  CONSULTANT_CONFIRMATION: "Obtaining specialist confirmation of long-term restrictions and capacity to return to pre-injury role.",
  PRE_TERMINATION_INVITE_SENT: "The worker has been invited to a pre-termination meeting. They have been advised of their right to bring a support person.",
  PRE_TERMINATION_MEETING_COMPLETED: "The pre-termination meeting has been held. Any new medical information provided is being reviewed.",
  DECISION_PENDING: "All evidence has been gathered. A final decision on employment termination is pending.",
  TERMINATED: "Employment has been terminated. The worker has been provided with termination documentation and entitlements.",
  TERMINATION_ABORTED: "The termination process has been aborted. This may be due to new medical evidence or alternative arrangements.",
};

function getStageDescription(process: TerminationProcess): string {
  return STAGE_DESCRIPTIONS[process.status] || "Status unknown.";
}

function buildCompletedSteps(process: TerminationProcess): Array<{
  stage: string;
  summary: string;
  completedAt?: string;
}> {
  const steps: Array<{ stage: string; summary: string; completedAt?: string }> = [];

  if (process.preInjuryRole) {
    steps.push({
      stage: "Evidence & Alternatives",
      summary: `Pre-injury role documented. ${process.hasSustainableRole ? "Sustainable role found." : "No sustainable roles available."}`,
    });
  }

  if (process.agentMeetingDate) {
    steps.push({
      stage: "Agent Meeting",
      summary: `Meeting held on ${new Date(process.agentMeetingDate).toLocaleDateString("en-AU")}.`,
      completedAt: process.agentMeetingDate,
    });
  }

  if (process.consultantReportId) {
    steps.push({
      stage: "Consultant Confirmation",
      summary: `Specialist report received. ${process.canReturnPreInjuryRole ? "Worker can return to pre-injury role." : "Worker cannot return to pre-injury role."}`,
    });
  }

  if (process.preTerminationMeetingDate && process.status !== "PRE_TERMINATION_INVITE_SENT") {
    steps.push({
      stage: "Pre-Termination Meeting",
      summary: process.preTerminationMeetingHeld
        ? "Meeting held as scheduled."
        : "Meeting was scheduled but not held.",
      completedAt: process.preTerminationMeetingDate,
    });
  }

  return steps;
}

function getNextStep(process: TerminationProcess): {
  description: string;
  rationale: string;
  action: string;
} {
  const nextSteps: Record<TerminationProcess["status"], { description: string; rationale: string; action: string }> = {
    NOT_STARTED: {
      description: "Document evidence and alternatives considered",
      rationale: "Before proceeding, all RTW attempts and alternative roles must be documented to demonstrate due diligence.",
      action: "prepare_evidence",
    },
    PREP_EVIDENCE: {
      description: "Schedule agent meeting",
      rationale: "The employment agent meeting provides opportunity to discuss options before proceeding with formal process.",
      action: "schedule_meeting",
    },
    AGENT_MEETING: {
      description: "Obtain consultant confirmation",
      rationale: "Independent specialist confirmation is required to verify long-term restrictions and capacity assessment.",
      action: "request_consultant",
    },
    CONSULTANT_CONFIRMATION: {
      description: "Send pre-termination meeting invite",
      rationale: "Worker must be formally invited to a meeting where they can respond to the proposed termination.",
      action: "send_invite",
    },
    PRE_TERMINATION_INVITE_SENT: {
      description: "Record meeting outcome",
      rationale: "Document whether meeting was held and any new medical information provided.",
      action: "record_meeting",
    },
    PRE_TERMINATION_MEETING_COMPLETED: {
      description: "Make final decision",
      rationale: "All evidence has been gathered. Consider any new information before making the final decision.",
      action: "make_decision",
    },
    DECISION_PENDING: {
      description: "Confirm decision and generate letter",
      rationale: "Confirm the termination decision and prepare formal documentation.",
      action: "confirm_decision",
    },
    TERMINATED: {
      description: "Process complete",
      rationale: "Employment has been terminated. Ensure all documentation is filed.",
      action: "complete",
    },
    TERMINATION_ABORTED: {
      description: "Review and restart if needed",
      rationale: "Process was aborted. Review circumstances before deciding whether to restart.",
      action: "review",
    },
  };

  return nextSteps[process.status] || {
    description: "Unknown step",
    rationale: "Unable to determine next step.",
    action: "unknown",
  };
}

function buildTerminationWarnings(process: TerminationProcess, workerCase: WorkerCase): string[] {
  const warnings: string[] = [];

  if (workerCase.terminationAuditFlag === "HIGH_RISK") {
    warnings.push("Medical evidence appears stale. Review flagged as HIGH RISK.");
  }

  if (!process.hasSustainableRole && !process.alternativeRolesConsideredSummary) {
    warnings.push("Alternative roles have not been documented. This is required before proceeding.");
  }

  if (process.status === "DECISION_PENDING" && process.anyNewMedicalInfoProvided && !process.newMedicalDocsSummary) {
    warnings.push("New medical information was provided but has not been summarized.");
  }

  return warnings;
}

function buildActionEndpoint(action: string, caseId: string): string {
  const actionLower = action.toLowerCase();

  if (actionLower.includes("certificate")) {
    return `/api/cases/${caseId}/email-drafts/generate`;
  }
  if (actionLower.includes("specialist")) {
    return `/api/cases/${caseId}/email-drafts/generate`;
  }
  if (actionLower.includes("rtw") || actionLower.includes("return")) {
    return `/api/cases/${caseId}/rtw-status`;
  }

  return `/api/cases/${caseId}/actions`;
}

function buildRiskNarrative(summary: CaseSummary, workerCase: WorkerCase): string {
  if (summary.risks.length === 0) {
    return `This case is currently assessed as ${workerCase.riskLevel.toLowerCase()} risk with no immediate concerns identified.`;
  }

  const highRisks = summary.risks.filter((r) => r.level === "high");
  const mediumRisks = summary.risks.filter((r) => r.level === "medium");

  if (highRisks.length > 0) {
    return `This case has ${highRisks.length} high-priority risk${highRisks.length > 1 ? "s" : ""}: ${highRisks.map((r) => r.description).join("; ")}. Immediate attention is required.`;
  }

  if (mediumRisks.length > 0) {
    return `This case has ${mediumRisks.length} moderate risk${mediumRisks.length > 1 ? "s" : ""} that should be monitored: ${mediumRisks.map((r) => r.description).join("; ")}.`;
  }

  return `This case has ${summary.risks.length} low-level risk${summary.risks.length > 1 ? "s" : ""} being monitored.`;
}

function buildComplianceNarrative(
  compliance: { status: string; message: string; daysUntilExpiry?: number; daysSinceExpiry?: number },
  summary: CaseSummary
): { status: string; narrative: string } {
  if (compliance.status === "compliant") {
    return {
      status: "compliant",
      narrative: `${compliance.message} The case is meeting WorkSafe Victoria compliance requirements.`,
    };
  }

  if (compliance.status === "certificate_expired") {
    return {
      status: "non_compliant",
      narrative: `${compliance.message} A valid medical certificate is required for WorkSafe compliance. ${compliance.daysSinceExpiry ? `The certificate has been expired for ${compliance.daysSinceExpiry} days.` : ""}`,
    };
  }

  if (compliance.status === "certificate_expiring_soon") {
    return {
      status: "at_risk",
      narrative: `${compliance.message} ${compliance.daysUntilExpiry ? `The certificate will expire in ${compliance.daysUntilExpiry} days.` : ""} Request a renewal proactively to maintain compliance.`,
    };
  }

  return {
    status: "unknown",
    narrative: compliance.message || "Unable to determine compliance status.",
  };
}

function buildRTWNarrative(summary: CaseSummary, workerCase: WorkerCase): string {
  const readiness = summary.rtwReadiness;

  if (readiness.level === "ready") {
    return "The worker is ready to return to work based on current medical evidence.";
  }

  if (readiness.level === "conditional") {
    const conditions = readiness.conditions.length > 0
      ? ` Conditions: ${readiness.conditions.join("; ")}.`
      : "";
    return `The worker can return to work with modifications.${conditions}`;
  }

  if (readiness.level === "not_ready") {
    const blockers = readiness.blockers.length > 0
      ? ` Current blockers: ${readiness.blockers.join("; ")}.`
      : "";
    return `The worker is not currently able to return to work.${blockers}`;
  }

  return "Return to work readiness cannot be determined. Additional medical evidence may be required.";
}

function buildTimelineExplanation(workerCase: WorkerCase): string {
  const injuryDate = new Date(workerCase.dateOfInjury);
  const today = new Date();
  const daysSinceInjury = Math.floor((today.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSinceInjury = Math.floor(daysSinceInjury / 7);

  return `${workerCase.workerName} sustained their injury ${weeksSinceInjury} weeks ago (${workerCase.dateOfInjury}). Current status: ${workerCase.workStatus}.`;
}

function buildCaseIssue(workerCase: WorkerCase): string {
  if (workerCase.riskLevel === "High") {
    return `High risk - ${workerCase.workStatus}`;
  }
  if (workerCase.complianceIndicator === "Low" || workerCase.complianceIndicator === "Very Low") {
    return "Compliance risk - action required";
  }
  if (!workerCase.hasCertificate) {
    return "No valid medical certificate";
  }
  return "Requires review";
}

function buildCaseAction(workerCase: WorkerCase): string {
  if (!workerCase.hasCertificate) {
    return "Request medical certificate";
  }
  if (workerCase.complianceIndicator === "Low" || workerCase.complianceIndicator === "Very Low") {
    return "Address compliance issues";
  }
  if (workerCase.riskLevel === "High") {
    return "Review and assess risk";
  }
  return "Review case status";
}

function buildExecutiveSummary(
  totalCases: number,
  attentionCount: number,
  highRiskCount: number,
  offWorkCount: number
): string {
  if (totalCases === 0) {
    return "No active cases in the portfolio.";
  }

  const attentionText = attentionCount > 0
    ? `${attentionCount} case${attentionCount > 1 ? "s" : ""} require${attentionCount === 1 ? "s" : ""} immediate attention. `
    : "No cases require immediate attention. ";

  const riskText = highRiskCount > 0
    ? `${highRiskCount} high-risk case${highRiskCount > 1 ? "s" : ""} being monitored. `
    : "";

  const workText = `${offWorkCount} worker${offWorkCount !== 1 ? "s" : ""} currently off work.`;

  return `${totalCases} active case${totalCases > 1 ? "s" : ""} across the portfolio. ${attentionText}${riskText}${workText}`;
}

export default router;
