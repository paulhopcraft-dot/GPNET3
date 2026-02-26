/**
 * Medical Certificate Agent — Proactive Expiry Monitor + Reactive Processor
 *
 * Mode 1 (Proactive): Monitors expiry and emails worker/GP on schedule
 * Mode 2 (Reactive): Processes inbound certificates from Freshdesk
 */

import { runAgent } from "./base-agent";
import { caseTools } from "./agent-tools/case-tools";
import { certificateTools } from "./agent-tools/certificate-tools";
import { emailTools } from "./agent-tools/email-tools";
import { timelineTools } from "./agent-tools/timeline-tools";
import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("CertificateAgent");

const CERT_TOOLS = [
  ...caseTools,
  ...certificateTools,
  ...emailTools,
  ...timelineTools,
];

/** Mode 1: Proactive expiry monitoring for a specific case */
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
    const task = `
You are the Certificate Agent for Preventli. You manage medical certificate expiry for a worker.

Case ID: ${caseId}
Job ID: ${jobId}
Context: ${JSON.stringify(context)}
Today: ${new Date().toDateString()}

Follow this expiry management workflow:

1. Call get_latest_certificate to check expiry status
2. Based on daysUntilExpiry, take the appropriate action:

   If 5 days until expiry:
   - draft_email (certificate_chase, recipient: worker) then send_email
   - Reminder: "Your certificate expires [date], please see your GP for a renewal."
   - create_timeline_event: "5-day certificate expiry reminder sent to worker"
   - schedule_followup: 5 days from now with agentType: "certificate"

   If 0 days (expiry today):
   - draft_email (certificate_chase, recipient: GP/treating_gp) then send_email
   - Message: "Worker's certificate has expired, please provide updated certificate."
   - create_timeline_event: "Certificate expired — GP notified"
   - schedule_followup: 7 days from now with agentType: "certificate"

   If 7+ days overdue with no new cert:
   - notify_case_manager with priority "high": "Certificate overdue 7+ days, human follow-up required"
   - create_timeline_event: "Certificate overdue — escalated to case manager"

3. Call update_job_summary with what you did

Only act on expiry. Do not make RTW decisions.
    `.trim();

    const result = await runAgent(
      task,
      CERT_TOOLS,
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

/** Mode 2: Process an inbound certificate already extracted by certificateService */
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
    const task = `
You are the Certificate Agent for Preventli. A new certificate has been received for a worker.

Case ID: ${caseId}
Job ID: ${jobId}
Context: ${JSON.stringify(context)}
Today: ${new Date().toDateString()}

Steps:
1. Call get_latest_certificate — confirm the new certificate is recorded
2. Call get_capacity_trend via recovery tools if available, or compare to previous certificate
3. Call create_timeline_event: "New certificate received: [date range, capacity]"
4. Notify the case manager if the certificate shows significantly reduced or changed capacity
5. Call update_job_summary with what changed

Do not send emails for inbound certificates — just record and notify.
    `.trim();

    const result = await runAgent(
      task,
      CERT_TOOLS,
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
