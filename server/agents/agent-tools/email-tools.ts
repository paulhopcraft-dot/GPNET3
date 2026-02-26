/**
 * Email Tools — wraps emailDraftService.ts and emailService.ts
 */

import { storage } from "../../storage";
import type { AgentTool } from "../base-agent";

export const draftEmailTool: AgentTool = {
  name: "draft_email",
  description: "Generate an AI email draft for a case. Returns the draft with subject and body. Does NOT send it.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
      emailType: {
        type: "string",
        enum: [
          "initial_contact",
          "certificate_chase",
          "check_in_follow_up",
          "rtw_update",
          "duties_proposal",
          "non_compliance_warning",
          "other",
        ],
      },
      recipient: {
        type: "string",
        enum: ["worker", "employer", "insurer", "host", "other"],
      },
      recipientName: { type: "string" },
      additionalContext: { type: "string" },
    },
    required: ["caseId", "emailType", "recipient"],
  },
  async execute({ caseId, emailType, recipient, recipientName, additionalContext }) {
    const { generateEmailDraft } = await import("../../services/emailDraftService");
    const workerCase = await storage.getCaseById(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);

    const draft = await generateEmailDraft(
      storage,
      caseId as string,
      workerCase.organizationId,
      {
        emailType: emailType as any,
        recipient: recipient as any,
        recipientName: recipientName as string | undefined,
        additionalContext: additionalContext as string | undefined,
      }
    );

    return {
      draftId: draft.id,
      subject: draft.subject,
      body: draft.body,
      tone: draft.tone,
      recipient: draft.recipient,
    };
  },
};

export const sendEmailTool: AgentTool = {
  name: "send_email",
  description: "Send an email. Use draft_email first to review the content, then call this to send.",
  inputSchema: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string" },
      body: { type: "string" },
    },
    required: ["to", "subject", "body"],
  },
  async execute({ to, subject, body }) {
    const { sendEmail } = await import("../../services/emailService");

    const result = await sendEmail({
      to: to as string,
      subject: subject as string,
      body: body as string,
      html: `<p>${(body as string).replace(/\n/g, "<br>")}</p>`,
    });

    return {
      sent: result.success,
      to,
      subject,
      sentAt: new Date().toISOString(),
      error: result.error,
    };
  },
};

export const emailTools: AgentTool[] = [
  draftEmailTool,
  sendEmailTool,
];
