/**
 * Coordinator Agent — Morning Briefing
 *
 * Runs every morning at 9am. Reviews all cases for an org,
 * decides which specialist agents to activate, and produces
 * a plain-English briefing for the case manager.
 */

import { runAgent } from "./base-agent";
import { caseTools } from "./agent-tools/case-tools";
import { certificateTools } from "./agent-tools/certificate-tools";
import { timelineTools } from "./agent-tools/timeline-tools";
import { coordinatorTools } from "./agent-tools/coordinator-tools";
import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("CoordinatorAgent");

const COORDINATOR_TOOLS = [
  ...caseTools,
  ...certificateTools,
  ...timelineTools,
  ...coordinatorTools,
];

export async function runCoordinatorAgent(
  jobId: string,
  organizationId: string
): Promise<void> {
  logger.info("Starting coordinator agent", { jobId, organizationId });

  await db
    .update(agentJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  try {
    const task = `
You are the Coordinator Agent for Preventli, a workers compensation case management system.

Your job today:
1. Call get_portfolio_health for organizationId "${organizationId}" to see all open cases
2. For each case that needs action, decide which specialist agent to trigger:
   - RTW Agent: if employer has confirmed suitable duties (suitableDutiesOffered = true) but no RTW plan is in progress
   - Certificate Agent: if certificate expires in 7 days or less, or has already expired
   - Recovery Agent: if worker has been off work 6+ weeks with static or declining capacity trend
3. Trigger the appropriate specialist agents using trigger_agent
4. For any case that needs immediate human attention (non-attendance, serious compliance breach), use notify_case_manager
5. Call update_job_summary with a plain-English morning briefing summary

Be decisive. Trigger agents autonomously for routine cases. Only involve humans for judgment calls.

Today's date: ${new Date().toDateString()}
Organisation: ${organizationId}
Job ID: ${jobId}
    `.trim();

    const result = await runAgent(
      task,
      COORDINATOR_TOOLS,
      jobId,
      "", // No single case ID — coordinator works across all cases
      "claude-3-5-haiku-20241022"
    );

    await db
      .update(agentJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
        summary: result.result,
      })
      .where(eq(agentJobs.id, jobId));

    logger.info("Coordinator agent completed", {
      jobId,
      actionsCount: result.actionsCount,
    });
  } catch (err) {
    logger.error("Coordinator agent failed", { jobId }, err);
    await db
      .update(agentJobs)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(agentJobs.id, jobId));
    throw err;
  }
}
