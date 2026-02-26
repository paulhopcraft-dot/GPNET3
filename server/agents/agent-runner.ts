/**
 * Agent Runner — dispatches queued agent jobs to the right agent
 */

import { db } from "../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("AgentRunner");

export async function runSpecialistAgent(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.id, jobId))
    .limit(1);

  if (!job) {
    logger.warn("Job not found", { jobId });
    return;
  }

  if (job.status !== "queued") {
    logger.warn("Job not in queued state, skipping", { jobId, status: job.status });
    return;
  }

  const context = (job.context as Record<string, unknown>) || {};

  logger.info("Running specialist agent", { jobId, agentType: job.agentType, caseId: job.caseId });

  switch (job.agentType) {
    case "rtw": {
      const { runRTWAgent } = await import("./rtw-agent");
      await runRTWAgent(jobId, job.caseId!, context);
      break;
    }
    case "recovery": {
      const { runRecoveryAgent } = await import("./recovery-agent");
      await runRecoveryAgent(jobId, job.caseId!, context);
      break;
    }
    case "certificate": {
      const mode = (context.mode as string) || "expiry";
      if (mode === "inbound") {
        const { runCertificateInboundAgent } = await import("./certificate-agent");
        await runCertificateInboundAgent(jobId, job.caseId!, context);
      } else {
        const { runCertificateExpiryAgent } = await import("./certificate-agent");
        await runCertificateExpiryAgent(jobId, job.caseId!, context);
      }
      break;
    }
    case "coordinator": {
      const { runCoordinatorAgent } = await import("./coordinator-agent");
      await runCoordinatorAgent(jobId, job.organizationId);
      break;
    }
    default:
      logger.warn("Unknown agent type", { agentType: job.agentType, jobId });
  }
}
