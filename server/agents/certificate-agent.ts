/**
 * Medical Certificate Agent — Proactive Expiry Monitor + Reactive Processor
 *
 * Mode 1 (Proactive): Monitors expiry, emails worker/GP on schedule
 * Mode 2 (Reactive): Processes inbound certificates from Freshdesk
 */

import { runAgent, type AgentTool } from "./base-agent";
import { caseTools } from "./agent-tools/case-tools";
import { certificateTools } from "./agent-tools/certificate-tools";
import { emailTools } from "./agent-tools/email-tools";
import { timelineTools } from "./agent-tools/timeline-tools";
import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("CertificateAgent");

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
  findTool(timelineTools, "schedule_followup"),
  findTool(timelineTools, "notify_case_manager"),
  findTool(timelineTools, "update_job_summary"),
];

/** Mode 1: Proactive expiry monitoring */
export async function runCertificateExpiryAgent(
  jobId: string,
  caseId: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  logger.info("Starting certificate expiry agent", { jobId, caseId });

  await db
    .update(agentJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  try {
    // Pre-gather certificate status
    const [workerCase, latestCert] = await Promise.all([
      findTool(caseTools, "get_case").execute({ caseId }),
      findTool(certificateTools, "get_latest_certificate").execute({ caseId }),
    ]);

    const agentContext = {
      caseId,
      jobId,
      today: new Date().toDateString(),
      triggerContext: context,
      workerCase,
      latestCert,
    };

    const task = `
You are the Certificate Agent for Preventli. Manage medical certificate expiry for this worker.

Based on the certificate data, take the appropriate action:

If 5 days until expiry:
- draft_email (certificate_chase, recipient: worker) then send_email
- create_timeline_event: "5-day certificate expiry reminder sent to worker"
- schedule_followup: 5 days from now, agentType: "certificate"

If 0 days (expiry today or passed, under 7 days overdue):
- draft_email (certificate_chase, recipient: other [GP]) then send_email
- create_timeline_event: "Certificate expired — GP notified"
- schedule_followup: 7 days from now, agentType: "certificate"

If 7+ days overdue with no new cert:
- notify_case_manager with priority "high": "Certificate overdue 7+ days, human follow-up required"
- create_timeline_event: "Certificate overdue — escalated to case manager"
- Set autoExecute: false on the notify_case_manager action

At the end call update_job_summary.
Only act on expiry. Do not make RTW decisions.
    `.trim();

    const result = await runAgent(task, agentContext, ACTION_TOOLS, jobId, caseId);

    await db
      .update(agentJobs)
      .set({ status: "completed", completedAt: new Date(), summary: result.result })
      .where(eq(agentJobs.id, jobId));

    logger.info("Certificate expiry agent completed", { jobId, caseId, actionsCount: result.actionsCount });
  } catch (err) {
    logger.error("Certificate expiry agent failed", { jobId, caseId }, err);
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

/** Mode 2: Process an inbound certificate */
export async function runCertificateInboundAgent(
  jobId: string,
  caseId: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  logger.info("Starting certificate inbound agent", { jobId, caseId });

  await db
    .update(agentJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  try {
    const [workerCase, latestCert] = await Promise.all([
      findTool(caseTools, "get_case").execute({ caseId }),
      findTool(certificateTools, "get_latest_certificate").execute({ caseId }),
    ]);

    const agentContext = {
      caseId,
      jobId,
      today: new Date().toDateString(),
      inboundCertContext: context,
      workerCase,
      latestCert,
    };

    const task = `
A new medical certificate has been received for this worker.

Review the certificate and:
1. create_timeline_event: "New certificate received: [date range and capacity from the cert data]"
2. If the certificate shows significantly reduced or changed capacity compared to previous,
   notify_case_manager with the change details (set autoExecute: false)
3. Call update_job_summary with what changed

Do not send emails for inbound certificates — just record and notify if significant.
    `.trim();

    const result = await runAgent(task, agentContext, ACTION_TOOLS, jobId, caseId);

    await db
      .update(agentJobs)
      .set({ status: "completed", completedAt: new Date(), summary: result.result })
      .where(eq(agentJobs.id, jobId));

    logger.info("Certificate inbound agent completed", { jobId, caseId });
  } catch (err) {
    logger.error("Certificate inbound agent failed", { jobId, caseId }, err);
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
