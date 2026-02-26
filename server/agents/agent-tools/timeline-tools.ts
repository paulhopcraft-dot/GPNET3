/**
 * Timeline & Logging Tools — creates case timeline events and agent logs
 */

import { storage } from "../../storage";
import { db } from "../../db";
import { agentJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent, AuditEventTypes } from "../../services/auditLogger";
import type { AgentTool } from "../base-agent";

export const createTimelineEventTool: AgentTool = {
  name: "create_timeline_event",
  description: "Log an event to the case timeline. Used to record significant agent actions for the case manager to see.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
      event: { type: "string", description: "Short event title, e.g. 'RTW Plan sent for comment'" },
      details: { type: "string", description: "Full details of what happened" },
    },
    required: ["caseId", "event", "details"],
  },
  async execute({ caseId, event, details }) {
    const workerCase = await storage.getCaseById(caseId as string);
    const organizationId = workerCase?.organizationId ?? "system";

    await logAuditEvent({
      userId: "agent-system",
      organizationId,
      eventType: AuditEventTypes.CASE_UPDATE,
      resourceType: "worker_case",
      resourceId: caseId as string,
      metadata: {
        agentEvent: event,
        agentDetails: details,
        source: "agent",
      },
    });
    return { logged: true, caseId, event };
  },
};

export const notifyCaseManagerTool: AgentTool = {
  name: "notify_case_manager",
  description: "Create a case action for the human case manager to review. Use for anything outside agent scope.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
      message: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
    },
    required: ["caseId", "message", "priority"],
  },
  async execute({ caseId, message, priority }) {
    const workerCase = await storage.getCaseById(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);

    await storage.createAction({
      organizationId: workerCase.organizationId,
      caseId: caseId as string,
      type: "review_case",
      status: "pending",
      priority: priority === "critical" ? 4 : priority === "high" ? 3 : priority === "medium" ? 2 : 1,
      notes: `[Agent] ${message}`,
      isBlocker: priority === "critical",
    });

    return { notified: true, caseId, priority };
  },
};

export const scheduleFollowupTool: AgentTool = {
  name: "schedule_followup",
  description: "Schedule a follow-up action for a case in N days.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
      daysFromNow: { type: "number" },
      agentType: { type: "string", enum: ["coordinator", "rtw", "recovery", "certificate"] },
      context: { type: "object" },
    },
    required: ["caseId", "daysFromNow", "agentType"],
  },
  async execute({ caseId, daysFromNow, agentType, context }) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (daysFromNow as number));

    const workerCase = await storage.getCaseById(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);

    await storage.createAction({
      organizationId: workerCase.organizationId,
      caseId: caseId as string,
      type: "follow_up",
      status: "pending",
      dueDate,
      priority: 1,
      notes: JSON.stringify({
        scheduledAgentType: agentType,
        context: context || {},
        scheduledFor: dueDate.toISOString(),
      }),
    });

    return { scheduled: true, caseId, agentType, dueDate: dueDate.toISOString() };
  },
};

export const updateJobSummaryTool: AgentTool = {
  name: "update_job_summary",
  description: "Update the agent job with a plain-English summary of what was accomplished. Call this at the end of a job.",
  inputSchema: {
    type: "object",
    properties: {
      jobId: { type: "string" },
      summary: { type: "string" },
    },
    required: ["jobId", "summary"],
  },
  async execute({ jobId, summary }) {
    await db
      .update(agentJobs)
      .set({ summary: summary as string })
      .where(eq(agentJobs.id, jobId as string));
    return { updated: true, jobId };
  },
};

export const timelineTools: AgentTool[] = [
  createTimelineEventTool,
  notifyCaseManagerTool,
  scheduleFollowupTool,
  updateJobSummaryTool,
];
