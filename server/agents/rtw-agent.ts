/**
 * RTW Agent — Autonomous Return-to-Work Manager
 *
 * Orchestrates the full RTW journey from employer confirmation
 * through plan generation, sending for comment, monitoring,
 * and check-ins.
 */

import { runAgent } from "./base-agent";
import { caseTools } from "./agent-tools/case-tools";
import { rtwTools } from "./agent-tools/rtw-tools";
import { emailTools } from "./agent-tools/email-tools";
import { timelineTools } from "./agent-tools/timeline-tools";
import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("RTWAgent");

const RTW_TOOLS = [
  ...caseTools,
  ...rtwTools,
  ...emailTools,
  ...timelineTools,
];

export async function runRTWAgent(
  jobId: string,
  caseId: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  logger.info("Starting RTW agent", { jobId, caseId });

  await db
    .update(agentJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  try {
    const task = `
You are the RTW Agent for Preventli. Your job is to manage the Return-to-Work process for a worker.

Case ID: ${caseId}
Job ID: ${jobId}
Trigger context: ${JSON.stringify(context)}
Today: ${new Date().toDateString()}

Follow this workflow:

1. Call get_case to understand the current state of the case
2. Call get_medical_constraints to understand what the worker can/cannot do
3. Call get_suitable_duties to confirm the employer has offered suitable duties
4. Call generate_rtw_plan to create the recommended plan
5. Draft emails for all treating parties using draft_email then send_email:
   - Recipient: treating GP (email type: rtw_update)
   - Recipient: employer (email type: duties_proposal)
   - Recipient: worker (email type: check_in_follow_up)
6. Call update_rtw_plan_status to mark the plan as "planned_not_started"
7. Call create_timeline_event to record "RTW Plan sent for comment"
8. Call schedule_followup for 3 days from now (certificate check-up with GP) with agentType: "rtw"
9. Call schedule_followup for 5 days from now (deemed acceptance check) with agentType: "rtw"
10. Call update_job_summary with a summary of what you did

WHAT YOU CAN DO AUTOMATICALLY (no human approval needed):
- Generate and review RTW plan
- Send emails to GP, employer, worker
- Update plan status
- Schedule follow-ups
- Log timeline events

WHAT REQUIRES HUMAN (use notify_case_manager instead of acting):
- Worker doesn't attend Day 1
- Doctor or employer objects to the plan
- Worker requests significant modifications to the plan
    `.trim();

    const result = await runAgent(
      task,
      RTW_TOOLS,
      jobId,
      caseId,
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

    logger.info("RTW agent completed", { jobId, caseId, actionsCount: result.actionsCount });
  } catch (err) {
    logger.error("RTW agent failed", { jobId, caseId }, err);
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
