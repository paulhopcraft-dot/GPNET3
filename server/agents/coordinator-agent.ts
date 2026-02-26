/**
 * Coordinator Agent — Morning Briefing
 *
 * Runs every morning at 9am. Fetches portfolio health, then uses
 * Claude CLI to decide which specialist agents to activate.
 */

import { runAgent, type AgentTool } from "./base-agent";
import { coordinatorTools } from "./agent-tools/coordinator-tools";
import { timelineTools } from "./agent-tools/timeline-tools";
import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("CoordinatorAgent");

/** Find a tool by name from an array */
function findTool(arr: AgentTool[], name: string): AgentTool {
  const t = arr.find((x) => x.name === name);
  if (!t) throw new Error(`Tool not found: ${name}`);
  return t;
}

/** Action tools Claude can request — write/trigger actions only */
const ACTION_TOOLS: AgentTool[] = [
  findTool(coordinatorTools, "trigger_agent"),
  findTool(timelineTools, "notify_case_manager"),
  findTool(timelineTools, "create_timeline_event"),
  findTool(timelineTools, "update_job_summary"),
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
    // Pre-gather: fetch portfolio health upfront
    const portfolioTool = findTool(coordinatorTools, "get_portfolio_health");
    const portfolio = await portfolioTool.execute({ organizationId });

    const context = {
      organizationId,
      today: new Date().toDateString(),
      jobId,
      portfolio,
    };

    const task = `
You are the Coordinator Agent for Preventli — a workers compensation case management system.

Review the portfolio health data and decide which specialist agents to activate today.

Trigger rules:
- RTW Agent: suitableDutiesOffered = true AND no RTW plan in progress
- Certificate Agent: certificate expires in 7 days or less, OR already expired
- Recovery Agent: worker off work 6+ weeks with static or declining capacity trend

For each case that needs action, call trigger_agent with the appropriate agentType.
For cases needing immediate human attention (serious breach, non-attendance), call notify_case_manager.
At the end, call update_job_summary with a plain-English morning briefing.

Be decisive. Trigger agents autonomously for routine cases. Only involve humans for judgment calls.
    `.trim();

    const result = await runAgent(task, context, ACTION_TOOLS, jobId, "");

    await db
      .update(agentJobs)
      .set({ status: "completed", completedAt: new Date(), summary: result.result })
      .where(eq(agentJobs.id, jobId));

    logger.info("Coordinator agent completed", { jobId, actionsCount: result.actionsCount });
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
