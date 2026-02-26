/**
 * Recovery Timeline Agent — Watchdog + Predictor + Coordinator
 *
 * Pre-gathers recovery data, then uses Claude CLI to decide
 * what flags to raise and what follow-up actions to take.
 */

import { runAgent, type AgentTool } from "./base-agent";
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

function findTool(arr: AgentTool[], name: string): AgentTool {
  const t = arr.find((x) => x.name === name);
  if (!t) throw new Error(`Tool not found: ${name}`);
  return t;
}

/** Action tools Claude can request — write actions only */
const ACTION_TOOLS: AgentTool[] = [
  findTool(emailTools, "draft_email"),
  findTool(emailTools, "send_email"),
  findTool(timelineTools, "create_timeline_event"),
  findTool(timelineTools, "notify_case_manager"),
  findTool(timelineTools, "schedule_followup"),
  findTool(timelineTools, "update_job_summary"),
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
    // Pre-gather all recovery context upfront
    const [workerCase, capacityTrend, benchmark, latestCert, compliance] =
      await Promise.all([
        findTool(caseTools, "get_case").execute({ caseId }),
        findTool(recoveryTools, "get_capacity_trend").execute({ caseId }),
        findTool(recoveryTools, "compare_to_benchmark").execute({ caseId }),
        findTool(certificateTools, "get_latest_certificate").execute({ caseId }),
        findTool(complianceTools, "check_compliance").execute({ caseId }),
      ]);

    const agentContext = {
      caseId,
      jobId,
      today: new Date().toDateString(),
      triggerContext: context,
      workerCase,
      capacityTrend,
      benchmark,
      latestCert,
      compliance,
    };

    const task = `
You are the Recovery Timeline Agent for Preventli. Monitor, predict, and coordinate recovery.

WATCHDOG — look for these red flags in the context:
- Capacity trend plateauing or declining across 2+ certificates
- Worker recovering slower than benchmark (riskLevel: medium or high)
- Certificate expired or expiring (NOTE: do NOT do certificate follow-up — that's the Certificate Agent)
- Specialist referred but no appointment confirmed in 2+ weeks
- Specialist seen but no report received in 2+ weeks
- Critical compliance violations

PREDICTOR — for the case manager:
- If high risk (predictedLongTerm: true, riskLevel: high), notify_case_manager with risk summary
- Set autoExecute: false for human-review notifications

COORDINATOR — take autonomous action:
- If specialist follow-up needed, draft_email then send_email
- Always create_timeline_event recording your findings
- Call update_job_summary with what you found and what you did

Do NOT handle certificate follow-up (Certificate Agent handles that).
Do NOT make RTW planning decisions (RTW Agent handles that).
    `.trim();

    const result = await runAgent(task, agentContext, ACTION_TOOLS, jobId, caseId);

    await db
      .update(agentJobs)
      .set({ status: "completed", completedAt: new Date(), summary: result.result })
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
