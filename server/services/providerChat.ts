import { randomUUID } from "crypto";
import { WorkerCase, ActionTarget, ClinicalActionType } from "../../shared/schema";

// Provider communication workflow - templates and message generation

export type MessageChannel = "email" | "phone" | "fax" | "portal";
export type MessagePriority = "low" | "normal" | "high" | "urgent";
export type MessageStatus = "draft" | "pending_approval" | "approved" | "sent" | "failed";

export interface ProviderMessage {
  id: string;
  caseId: string;
  workerName: string;
  target: ActionTarget;
  actionType: ClinicalActionType;
  channel: MessageChannel;
  priority: MessagePriority;
  status: MessageStatus;

  // Content
  subject: string;
  body: string;
  phoneScript?: string;

  // Metadata
  createdAt: string;
  createdBy?: string;
  sentAt?: string;
  responseReceived?: boolean;
  responseDate?: string;
  responseNotes?: string;
}

export interface MessageTemplate {
  id: string;
  actionType: ClinicalActionType;
  target: ActionTarget;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  phoneScriptTemplate?: string;
  variables: string[];
}

// Message templates for different action types and targets
const MESSAGE_TEMPLATES: MessageTemplate[] = [
  // GP Templates
  {
    id: "gp-request-certificate",
    actionType: "REQUEST_UPDATED_CERTIFICATE",
    target: "GP",
    name: "Request Updated Medical Certificate",
    subjectTemplate: "Request for Updated Medical Certificate - {{workerName}}",
    bodyTemplate: `Dear Dr {{gpName}},

Re: {{workerName}} - Workplace Injury Case

I am writing regarding your patient {{workerName}} who sustained a workplace injury on {{injuryDate}}.

The current medical certificate {{#if certificateExpiry}}expired on {{certificateExpiry}}{{else}}is not on file{{/if}}. To continue supporting {{workerName}}'s recovery and return to work, we require an updated certificate.

Could you please provide:
1. Current work capacity (fit/partial/unfit)
2. Expected duration of any restrictions
3. Specific duties the worker can/cannot perform
4. Recommended review date

{{#if urgentReason}}This request is urgent because: {{urgentReason}}{{/if}}

Please send the updated certificate via our secure portal or fax to {{faxNumber}}.

Kind regards,
{{caseManagerName}}
Case Manager`,
    phoneScriptTemplate: `Hello, this is {{caseManagerName}} calling regarding patient {{workerName}}.
- Confirm you're speaking with the correct clinic
- Request updated medical certificate
- Current certificate status: {{certificateStatus}}
- Ask about expected timeframe for certificate
- Confirm preferred method to receive (fax/email/portal)`,
    variables: ["workerName", "gpName", "injuryDate", "certificateExpiry", "urgentReason", "faxNumber", "caseManagerName", "certificateStatus"],
  },
  {
    id: "gp-request-treatment-plan",
    actionType: "REQUEST_TREATMENT_PLAN",
    target: "GP",
    name: "Request Treatment Plan",
    subjectTemplate: "Treatment Plan Request - {{workerName}}",
    bodyTemplate: `Dear Dr {{gpName}},

Re: {{workerName}} - Workplace Injury ({{injuryDate}})

We are writing to request a treatment plan for {{workerName}} to support their recovery from the workplace injury sustained on {{injuryDate}}.

Current status:
- Work capacity: {{workCapacity}}
- Days since injury: {{daysSinceInjury}}
- Current restrictions: {{restrictions}}

Could you please provide:
1. Recommended treatment modalities (physio, specialist referrals, etc.)
2. Expected treatment duration
3. Milestones and review points
4. Any barriers to recovery you've identified

This information will help us coordinate appropriate support and plan the return to work pathway.

Kind regards,
{{caseManagerName}}
Case Manager`,
    variables: ["workerName", "gpName", "injuryDate", "workCapacity", "daysSinceInjury", "restrictions", "caseManagerName"],
  },
  {
    id: "gp-rtw-review",
    actionType: "REVIEW_RTW_PLAN_WITH_GP",
    target: "GP",
    name: "RTW Plan Review with GP",
    subjectTemplate: "Return to Work Plan Review - {{workerName}}",
    bodyTemplate: `Dear Dr {{gpName}},

Re: {{workerName}} - Return to Work Plan Review

We are writing regarding {{workerName}}'s return to work plan and would appreciate your clinical input.

Current RTW status: {{rtwStatus}}
Current phase: {{currentPhase}}
Proposed duties: {{proposedDuties}}

We would like to confirm:
1. Is the current RTW plan appropriate given {{workerName}}'s condition?
2. Are there any medical concerns with the proposed duties?
3. What signs should we monitor for that might indicate the plan needs adjustment?
4. Recommended review date for the next phase

Please advise if you would prefer a phone consultation or case conference to discuss.

Kind regards,
{{caseManagerName}}
Case Manager`,
    variables: ["workerName", "gpName", "rtwStatus", "currentPhase", "proposedDuties", "caseManagerName"],
  },
  {
    id: "gp-clinical-explanation",
    actionType: "REQUEST_CLINICAL_EXPLANATION_FOR_DELAY",
    target: "GP",
    name: "Request Clinical Explanation for Delay",
    subjectTemplate: "Clinical Review Request - Recovery Timeline - {{workerName}}",
    bodyTemplate: `Dear Dr {{gpName}},

Re: {{workerName}} - Recovery Progress Review

We are writing regarding {{workerName}} who has been off work for {{daysSinceInjury}} days following their injury on {{injuryDate}}.

Based on typical recovery timelines for this type of injury, we would like to understand if there are clinical factors contributing to the extended recovery period.

Could you please advise:
1. Are there any complicating factors affecting recovery?
2. Is the current treatment approach achieving expected outcomes?
3. Would a specialist referral be beneficial?
4. What is your current prognosis for return to work?

This information will help us provide appropriate support and update the insurer on case progress.

Kind regards,
{{caseManagerName}}
Case Manager`,
    variables: ["workerName", "gpName", "daysSinceInjury", "injuryDate", "caseManagerName"],
  },

  // Specialist Templates
  {
    id: "specialist-appointment-status",
    actionType: "REQUEST_SPECIALIST_APPOINTMENT_STATUS",
    target: "SPECIALIST",
    name: "Request Specialist Appointment Status",
    subjectTemplate: "Appointment Status Inquiry - {{workerName}}",
    bodyTemplate: `Dear {{specialistName}},

Re: {{workerName}} - Referral Follow-up

We are writing regarding {{workerName}} who was referred to your practice for {{referralReason}}.

Referral date: {{referralDate}}
Referring GP: Dr {{gpName}}

Could you please confirm:
1. Has an appointment been scheduled?
2. If so, what is the appointment date?
3. If not, what is the expected wait time?
4. Are there any additional documents or information required?

Your prompt response would be appreciated as it will help us plan the ongoing case management.

Kind regards,
{{caseManagerName}}
Case Manager`,
    variables: ["workerName", "specialistName", "referralReason", "referralDate", "gpName", "caseManagerName"],
  },
  {
    id: "specialist-request-report",
    actionType: "REQUEST_SPECIALIST_REPORT",
    target: "SPECIALIST",
    name: "Request Specialist Report",
    subjectTemplate: "Report Request Following Consultation - {{workerName}}",
    bodyTemplate: `Dear {{specialistName}},

Re: {{workerName}} - Consultation Report Request

We understand {{workerName}} attended a consultation with you on {{appointmentDate}}.

To progress the case management and return to work planning, we would appreciate receiving your report including:
1. Diagnosis and findings
2. Recommended treatment plan
3. Work capacity assessment
4. Prognosis and expected recovery timeline
5. Any surgical recommendations if applicable

Please send the report via secure email or fax to {{faxNumber}}.

Kind regards,
{{caseManagerName}}
Case Manager`,
    variables: ["workerName", "specialistName", "appointmentDate", "faxNumber", "caseManagerName"],
  },

  // Physiotherapist Templates
  {
    id: "physio-progress-update",
    actionType: "REQUEST_TREATMENT_PLAN",
    target: "PHYSIOTHERAPIST",
    name: "Request Physio Progress Update",
    subjectTemplate: "Treatment Progress Update Request - {{workerName}}",
    bodyTemplate: `Dear {{physioName}},

Re: {{workerName}} - Physiotherapy Progress Update

We are writing to request an update on {{workerName}}'s physiotherapy treatment progress.

Treatment commenced: {{treatmentStartDate}}
Sessions completed: {{sessionsCompleted}}
Initial presentation: {{initialPresentation}}

Could you please provide:
1. Current functional status compared to initial assessment
2. Treatment goals achieved to date
3. Remaining treatment plan and expected sessions
4. Work capacity recommendations
5. Any concerns or barriers to progress

This information will assist us in coordinating the return to work plan.

Kind regards,
{{caseManagerName}}
Case Manager`,
    variables: ["workerName", "physioName", "treatmentStartDate", "sessionsCompleted", "initialPresentation", "caseManagerName"],
  },

  // Worker Templates
  {
    id: "worker-duties-review",
    actionType: "REVIEW_DUTIES_WITH_WORKER",
    target: "WORKER",
    name: "Review Duties with Worker",
    subjectTemplate: "Return to Work - Duties Discussion",
    bodyTemplate: `Dear {{workerName}},

I hope this message finds you recovering well.

I would like to schedule a time to discuss your return to work plan and the duties available for you.

Based on your medical certificate, you are currently certified for {{workCapacity}} duties with the following restrictions:
{{restrictions}}

We have identified some suitable duties that may work for you:
{{proposedDuties}}

Could you please let me know:
1. Your availability for a phone call or meeting
2. Any concerns you have about the proposed duties
3. How you're feeling about returning to work

Please feel free to call me on {{caseManagerPhone}} or reply to this email.

Kind regards,
{{caseManagerName}}
Case Manager`,
    phoneScriptTemplate: `Hello {{workerName}}, this is {{caseManagerName}} calling.
- Check how they're feeling and their recovery progress
- Discuss the proposed duties: {{proposedDuties}}
- Address any concerns they have
- Confirm their availability to start/increase duties
- Remind them of support available
- Arrange follow-up check-in`,
    variables: ["workerName", "workCapacity", "restrictions", "proposedDuties", "caseManagerPhone", "caseManagerName"],
  },

  // Insurer Templates
  {
    id: "insurer-non-compliance",
    actionType: "ESCALATE_NON_COMPLIANCE_TO_INSURER",
    target: "INSURER",
    name: "Escalate Non-Compliance to Insurer",
    subjectTemplate: "Non-Compliance Notification - {{workerName}} - Claim {{claimNumber}}",
    bodyTemplate: `Dear Claims Manager,

Re: {{workerName}} - Claim Number: {{claimNumber}}

We are writing to advise of ongoing non-compliance issues with this claim.

Worker: {{workerName}}
Employer: {{companyName}}
Date of Injury: {{injuryDate}}

Non-compliance issues identified:
{{nonComplianceIssues}}

Actions taken to address:
{{actionsTaken}}

Current status:
- Work capacity: {{workCapacity}}
- RTW plan: {{rtwStatus}}
- Last contact with worker: {{lastContactDate}}

We recommend the following next steps:
{{recommendedActions}}

Please advise how you would like us to proceed.

Kind regards,
{{caseManagerName}}
Case Manager`,
    variables: ["workerName", "claimNumber", "companyName", "injuryDate", "nonComplianceIssues", "actionsTaken", "workCapacity", "rtwStatus", "lastContactDate", "recommendedActions", "caseManagerName"],
  },
];

/**
 * Get available templates for a target
 */
export function getTemplatesForTarget(target: ActionTarget): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter(t => t.target === target);
}

/**
 * Get template by action type and target
 */
export function getTemplate(actionType: ClinicalActionType, target: ActionTarget): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find(t => t.actionType === actionType && t.target === target);
}

/**
 * Get all available templates
 */
export function getAllTemplates(): MessageTemplate[] {
  return MESSAGE_TEMPLATES;
}

/**
 * Simple template variable substitution
 */
function substituteVariables(template: string, variables: Record<string, string | undefined>): string {
  let result = template;

  // Handle conditional blocks {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (_, varName, content) => {
    return variables[varName] ? content : "";
  });

  // Handle simple variable substitution {{variable}}
  const variableRegex = /\{\{(\w+)\}\}/g;
  result = result.replace(variableRegex, (_, varName) => {
    return variables[varName] || `[${varName}]`;
  });

  return result;
}

/**
 * Extract case variables for template substitution
 */
export function extractCaseVariables(workerCase: WorkerCase): Record<string, string> {
  const vars: Record<string, string> = {
    workerName: workerCase.workerName,
    companyName: workerCase.company,
    injuryDate: workerCase.dateOfInjury,
    workCapacity: workerCase.latestCertificate?.capacity || workerCase.workStatus === "At work" ? "partial" : "unfit",
    workStatus: workerCase.workStatus,
    riskLevel: workerCase.riskLevel,
    caseManagerName: workerCase.owner,
    daysSinceInjury: String(Math.floor((Date.now() - new Date(workerCase.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24))),
  };

  // Add RTW status
  vars.rtwStatus = workerCase.rtwPlanStatus?.replace(/_/g, " ") || "not planned";

  // Add restrictions
  if (workerCase.medicalConstraints) {
    const restrictions: string[] = [];
    const mc = workerCase.medicalConstraints;
    if (mc.noLiftingOverKg !== undefined) restrictions.push(`No lifting over ${mc.noLiftingOverKg}kg`);
    if (mc.noBending) restrictions.push("No bending");
    if (mc.noTwisting) restrictions.push("No twisting");
    if (mc.noProlongedStanding) restrictions.push("No prolonged standing");
    if (mc.noProlongedSitting) restrictions.push("No prolonged sitting");
    if (mc.noDriving) restrictions.push("No driving");
    vars.restrictions = restrictions.length > 0 ? restrictions.join(", ") : "None specified";
  } else {
    vars.restrictions = "Not documented";
  }

  // Add certificate expiry
  if (workerCase.latestCertificate?.endDate) {
    vars.certificateExpiry = workerCase.latestCertificate.endDate;
    vars.certificateStatus = `Expires ${workerCase.latestCertificate.endDate}`;
  } else {
    vars.certificateStatus = "No certificate on file";
  }

  // Add specialist info if available
  if (workerCase.specialistReportSummary) {
    vars.specialistName = workerCase.specialistReportSummary.specialistName || "[Specialist Name]";
    if (workerCase.specialistReportSummary.lastAppointmentDate) {
      vars.appointmentDate = workerCase.specialistReportSummary.lastAppointmentDate;
    }
  }

  return vars;
}

/**
 * Generate a message from a template
 */
export function generateMessage(
  template: MessageTemplate,
  workerCase: WorkerCase,
  additionalVariables?: Record<string, string>
): ProviderMessage {
  const caseVars = extractCaseVariables(workerCase);
  const allVars = { ...caseVars, ...additionalVariables };

  const subject = substituteVariables(template.subjectTemplate, allVars);
  const body = substituteVariables(template.bodyTemplate, allVars);
  const phoneScript = template.phoneScriptTemplate
    ? substituteVariables(template.phoneScriptTemplate, allVars)
    : undefined;

  return {
    id: randomUUID(),
    caseId: workerCase.id,
    workerName: workerCase.workerName,
    target: template.target,
    actionType: template.actionType,
    channel: "email",
    priority: workerCase.riskLevel === "High" ? "high" : "normal",
    status: "draft",
    subject,
    body,
    phoneScript,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate messages for recommended actions
 */
export function generateMessagesForCase(workerCase: WorkerCase): ProviderMessage[] {
  const messages: ProviderMessage[] = [];
  const recommendedActions = workerCase.clinicalEvidence?.recommendedActions || [];

  for (const action of recommendedActions) {
    const template = getTemplate(action.type, action.target);
    if (template) {
      messages.push(generateMessage(template, workerCase));
    }
  }

  return messages;
}

/**
 * Get suggested actions for a case
 */
export function getSuggestedCommunications(workerCase: WorkerCase): {
  target: ActionTarget;
  templateId: string;
  templateName: string;
  reason: string;
  priority: MessagePriority;
}[] {
  const suggestions: {
    target: ActionTarget;
    templateId: string;
    templateName: string;
    reason: string;
    priority: MessagePriority;
  }[] = [];

  // Check for missing/expired certificate
  if (!workerCase.hasCertificate || !workerCase.latestCertificate) {
    suggestions.push({
      target: "GP",
      templateId: "gp-request-certificate",
      templateName: "Request Updated Medical Certificate",
      reason: "No current medical certificate on file",
      priority: "high",
    });
  } else {
    const certEnd = new Date(workerCase.latestCertificate.endDate);
    const daysUntilExpiry = Math.floor((certEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) {
      suggestions.push({
        target: "GP",
        templateId: "gp-request-certificate",
        templateName: "Request Updated Medical Certificate",
        reason: daysUntilExpiry <= 0 ? "Certificate has expired" : `Certificate expires in ${daysUntilExpiry} days`,
        priority: daysUntilExpiry <= 0 ? "urgent" : "high",
      });
    }
  }

  // Check for specialist status
  if (workerCase.specialistStatus === "referred") {
    suggestions.push({
      target: "SPECIALIST",
      templateId: "specialist-appointment-status",
      templateName: "Request Specialist Appointment Status",
      reason: "Specialist referral made but no appointment confirmed",
      priority: "normal",
    });
  } else if (workerCase.specialistStatus === "seen_waiting_report") {
    suggestions.push({
      target: "SPECIALIST",
      templateId: "specialist-request-report",
      templateName: "Request Specialist Report",
      reason: "Specialist consultation completed, awaiting report",
      priority: "high",
    });
  }

  // Check for RTW plan review needed
  if (workerCase.rtwPlanStatus === "failing" || workerCase.rtwPlanStatus === "on_hold") {
    suggestions.push({
      target: "GP",
      templateId: "gp-rtw-review",
      templateName: "RTW Plan Review with GP",
      reason: `RTW plan is ${workerCase.rtwPlanStatus?.replace(/_/g, " ")}`,
      priority: "high",
    });
  }

  // Check for long-tail case
  const daysSinceInjury = Math.floor((Date.now() - new Date(workerCase.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceInjury > 90 && workerCase.workStatus === "Off work") {
    suggestions.push({
      target: "GP",
      templateId: "gp-clinical-explanation",
      templateName: "Request Clinical Explanation for Delay",
      reason: `Worker has been off work for ${daysSinceInjury} days`,
      priority: "normal",
    });
  }

  // Check for non-compliance
  if (workerCase.complianceStatus === "non_compliant") {
    suggestions.push({
      target: "INSURER",
      templateId: "insurer-non-compliance",
      templateName: "Escalate Non-Compliance to Insurer",
      reason: "Worker is non-compliant with treatment/RTW plan",
      priority: "high",
    });
    suggestions.push({
      target: "WORKER",
      templateId: "worker-duties-review",
      templateName: "Review Duties with Worker",
      reason: "Re-engage worker regarding return to work",
      priority: "high",
    });
  }

  return suggestions;
}
