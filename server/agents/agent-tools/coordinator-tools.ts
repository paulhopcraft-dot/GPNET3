/**
 * Coordinator Tools — used by the coordinator agent to trigger specialist agents
 */

import { db } from "../../db";
import { agentJobs } from "@shared/schema";
import { createLogger } from "../../lib/logger";
import type { AgentTool } from "../base-agent";

const logger = createLogger("CoordinatorTools");

export const triggerAgentTool: AgentTool = {
  name: "trigger_agent",
  description: "Trigger a specialist agent job for a case. The agent will run asynchronously.",
  inputSchema: {
    type: "object",
    properties: {
      agentType: {
        type: "string",
        enum: ["rtw", "recovery", "certificate"],
        description: "Which specialist agent to trigger",
      },
      caseId: { type: "string" },
      organizationId: { type: "string" },
      context: {
        type: "object",
        description: "Context to pass to the specialist agent (e.g. reason for triggering)",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Job priority",
      },
    },
    required: ["agentType", "caseId", "organizationId"],
  },
  async execute({ agentType, caseId, organizationId, context, priority }) {
    const [job] = await db
      .insert(agentJobs)
      .values({
        organizationId: organizationId as string,
        caseId: caseId as string,
        agentType: agentType as any,
        status: "queued",
        triggeredBy: "agent",
        context: (context as Record<string, unknown>) || {},
      })
      .returning();

    logger.info("Agent job queued", { agentType, caseId, jobId: job.id });

    // Trigger async execution (fire and forget — picked up by job runner)
    setImmediate(async () => {
      try {
        const { runSpecialistAgent } = await import("../agent-runner");
        await runSpecialistAgent(job.id);
      } catch (err) {
        logger.error("Failed to run specialist agent", { jobId: job.id }, err);
      }
    });

    return {
      triggered: true,
      jobId: job.id,
      agentType,
      caseId,
    };
  },
};

export const getPortfolioHealthTool: AgentTool = {
  name: "get_portfolio_health",
  description: "Get a high-level health overview of all cases for an organisation.",
  inputSchema: {
    type: "object",
    properties: {
      organizationId: { type: "string" },
    },
    required: [],
  },
  async execute({ organizationId }) {
    const { storage } = await import("../../storage");
    const result = await storage.getGPNet2CasesPaginated(
      organizationId as string | undefined,
      1,
      500
    );
    const cases = result.cases.filter((c) => c.caseStatus !== "closed");

    const offWork = cases.filter((c) => c.workStatus === "Off work");
    const noRTWPlan = offWork.filter((c) => !c.rtwPlanStatus || c.rtwPlanStatus === "not_planned");
    const expiringCerts = cases.filter((c) => {
      if (!c.currentCertificateEnd) return false;
      const daysLeft = Math.ceil(
        (new Date(c.currentCertificateEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft >= 0 && daysLeft <= 7;
    });
    const highRisk = cases.filter((c) => c.riskLevel === "High");
    const lowCompliance = cases.filter(
      (c) => c.complianceIndicator === "Very Low" || c.complianceIndicator === "Low"
    );

    // De-duplicate cases across categories and cap at 10 to keep the prompt manageable
    const seen = new Set<string>();
    const allNeedingAction: Array<{ caseId: string; workerName: string; reason: string }> = [];
    for (const c of expiringCerts) {
      if (!seen.has(c.id)) { seen.add(c.id); allNeedingAction.push({ caseId: c.id, workerName: c.workerName, reason: "Certificate expiring" }); }
    }
    for (const c of highRisk) {
      if (!seen.has(c.id)) { seen.add(c.id); allNeedingAction.push({ caseId: c.id, workerName: c.workerName, reason: "High risk" }); }
    }
    for (const c of noRTWPlan) {
      if (!seen.has(c.id)) { seen.add(c.id); allNeedingAction.push({ caseId: c.id, workerName: c.workerName, reason: "No RTW plan" }); }
    }

    return {
      totalActiveCases: cases.length,
      offWork: offWork.length,
      noRTWPlan: noRTWPlan.length,
      expiringCertificates: expiringCerts.length,
      highRisk: highRisk.length,
      lowCompliance: lowCompliance.length,
      // Top 10 cases needing action (prioritised: expiring certs > high risk > no RTW plan)
      casesNeedingAction: allNeedingAction.slice(0, 10),
    };
  },
};

export const coordinatorTools: AgentTool[] = [
  triggerAgentTool,
  getPortfolioHealthTool,
];
