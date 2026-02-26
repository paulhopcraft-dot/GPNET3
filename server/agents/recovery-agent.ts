/**
 * Recovery Timeline Agent — Watchdog + Predictor + Coordinator
 *
 * Monitors recovery trajectory, flags plateaus, predicts RTW dates,
 * and follows up on specialist appointments and treatment milestones.
 */

import { runAgent } from "./base-agent";
import { caseTools } from "./agent-tools/case-tools";
import { certificateTools } from "./agent-tools/certificate-tools";
import { recoveryTools } from "./agent-tools/recovery-tools";
import { complianceTools } from "./agent-tools/compliance-tools";
import { emailTools } from "./agent-tools/email-tools";
import { timelineTools } from "./agent-tools/timeline-tools";
import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("RecoveryAgent");

const RECOVERY_TOOLS = [
  ...caseTools,
  ...certificateTools,
  ...recoveryTools,
  ...complianceTools,
  ...emailTools,
  ...timelineTools,
];

export async function runRecoveryAgent(
  jobId: string,
  caseId: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  logger.info("Starting recovery agent", { jobId, caseId });

  await db
    .update(agentJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  try {
    const task = `
You are the Recovery Timeline Agent for Preventli. You monitor, predict, and coordinate recovery.

Case ID: ${caseId}
Job ID: ${jobId}
Context: ${JSON.stringify(context)}
Today: ${new Date().toDateString()}

Your responsibilities:

WATCHDOG — check for these red flags:
1. Call get_capacity_trend — is recovery plateauing or declining?
2. Call compare_to_benchmark — is the worker recovering slower than expected?
3. Call get_latest_certificate — is the current certificate expired or about to expire?
4. Call get_case — check specialistStatus (referred but no appointment >14 days? seen but no report >14 days?)
5. Call check_compliance — any critical violations?

PREDICTOR — for case manager dashboard:
6. Call get_recovery_estimate — predict RTW date and risk level
7. If high risk (predicted >26 weeks), call notify_case_manager with the prediction

COORDINATOR — take autonomous action where you can:
8. If specialist referred but no appointment in 2+ weeks: draft_email + send_email to worker
9. If specialist seen but no report in 2+ weeks: draft_email + send_email to specialist
10. Always call create_timeline_event to record your findings
11. Call update_job_summary with what you found and what you did

WHAT YOU DO NOT DO:
- Certificate follow-up (that's the Certificate Agent)
- RTW planning (that's the RTW Agent)
- Human-only decisions — use notify_case_manager for those
    `.trim();

    const result = await runAgent(
      task,
      RECOVERY_TOOLS,
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

    logger.info("Recovery agent completed", { jobId, caseId, actionsCount: result.actionsCount });
  } catch (err) {
    logger.error("Recovery agent failed", { jobId, caseId }, err);
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
