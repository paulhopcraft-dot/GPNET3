/**
 * RTW Email Service v1
 *
 * AI-powered email drafting for RTW plan manager notifications.
 * Uses plan context (worker, role, schedule, duties, restrictions)
 * to generate professional emails for employer/manager.
 *
 * EMAIL-09: Organization-specific email templates supported via Handlebars.
 * Fallback chain: Template -> AI -> Fallback template
 */

import Anthropic from "@anthropic-ai/sdk";
import Handlebars from "handlebars";
import { logger } from "../lib/logger";
import { storage } from "../storage";

const MODEL = "claude-3-haiku-20240307";

/**
 * RTW Plan context for email generation
 */
export interface RTWPlanEmailContext {
  // Worker/case info
  workerName: string;
  company: string;
  dateOfInjury: string;
  workStatus: string;

  // Role info
  roleName: string;
  roleDescription?: string | null;

  // Plan info
  planType: string;
  planStatus: string;
  startDate: string;
  restrictionReviewDate?: string | null;

  // Schedule
  schedule: Array<{
    weekNumber: number;
    hoursPerDay: number;
    daysPerWeek: number;
  }>;

  // Duties
  includedDuties: Array<{
    dutyName: string;
    suitability: string;
    modificationNotes?: string | null;
  }>;
  excludedDuties: Array<{
    dutyName: string;
    excludedReason?: string | null;
  }>;

  // Restrictions summary
  maxHoursPerDay?: number | null;
  maxDaysPerWeek?: number | null;
}

/**
 * Generated email result
 */
export interface GeneratedEmail {
  subject: string;
  body: string;
}

/**
 * Plan type display labels
 */
const PLAN_TYPE_LABELS: Record<string, string> = {
  normal_hours: "Normal Hours",
  partial_hours: "Partial Hours",
  graduated_return: "Graduated Return to Work",
};

/**
 * Format schedule summary for email
 * Example: "Week 1: 4 hours/day, 3 days/week. Week 2: 5 hours/day, 4 days/week."
 */
function formatScheduleSummary(
  schedule: RTWPlanEmailContext["schedule"]
): string {
  if (schedule.length === 0) {
    return "No schedule defined.";
  }

  if (schedule.length === 1) {
    const week = schedule[0];
    return `${week.hoursPerDay} hours per day, ${week.daysPerWeek} days per week`;
  }

  // Group consecutive weeks with same hours
  const summaryParts: string[] = [];
  let currentGroup = {
    startWeek: schedule[0].weekNumber,
    endWeek: schedule[0].weekNumber,
    hoursPerDay: schedule[0].hoursPerDay,
    daysPerWeek: schedule[0].daysPerWeek,
  };

  for (let i = 1; i < schedule.length; i++) {
    const week = schedule[i];
    if (
      week.hoursPerDay === currentGroup.hoursPerDay &&
      week.daysPerWeek === currentGroup.daysPerWeek
    ) {
      currentGroup.endWeek = week.weekNumber;
    } else {
      // End current group
      if (currentGroup.startWeek === currentGroup.endWeek) {
        summaryParts.push(
          `Week ${currentGroup.startWeek}: ${currentGroup.hoursPerDay}hrs/day, ${currentGroup.daysPerWeek} days`
        );
      } else {
        summaryParts.push(
          `Weeks ${currentGroup.startWeek}-${currentGroup.endWeek}: ${currentGroup.hoursPerDay}hrs/day, ${currentGroup.daysPerWeek} days`
        );
      }
      // Start new group
      currentGroup = {
        startWeek: week.weekNumber,
        endWeek: week.weekNumber,
        hoursPerDay: week.hoursPerDay,
        daysPerWeek: week.daysPerWeek,
      };
    }
  }

  // Add final group
  if (currentGroup.startWeek === currentGroup.endWeek) {
    summaryParts.push(
      `Week ${currentGroup.startWeek}: ${currentGroup.hoursPerDay}hrs/day, ${currentGroup.daysPerWeek} days`
    );
  } else {
    summaryParts.push(
      `Weeks ${currentGroup.startWeek}-${currentGroup.endWeek}: ${currentGroup.hoursPerDay}hrs/day, ${currentGroup.daysPerWeek} days`
    );
  }

  return summaryParts.join("; ");
}

/**
 * Format duties list for email
 */
function formatDutiesList(
  includedDuties: RTWPlanEmailContext["includedDuties"],
  excludedDuties: RTWPlanEmailContext["excludedDuties"]
): string {
  const lines: string[] = [];

  if (includedDuties.length > 0) {
    lines.push("INCLUDED DUTIES:");
    for (const duty of includedDuties) {
      let line = `- ${duty.dutyName}`;
      if (duty.suitability === "suitable_with_modification" && duty.modificationNotes) {
        line += ` (with modifications: ${duty.modificationNotes})`;
      }
      lines.push(line);
    }
  }

  if (excludedDuties.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("EXCLUDED DUTIES:");
    for (const duty of excludedDuties) {
      let line = `- ${duty.dutyName}`;
      if (duty.excludedReason) {
        line += ` (${duty.excludedReason})`;
      }
      lines.push(line);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No duties defined.";
}

/**
 * Template variable context for Handlebars rendering (EMAIL-09)
 */
interface TemplateVariables {
  workerName: string;
  company: string;
  dateOfInjury: string;
  workStatus: string;
  roleName: string;
  roleDescription?: string | null;
  planType: string;
  planTypeLabel: string;
  planStatus: string;
  startDate: string;
  restrictionReviewDate?: string | null;
  scheduleSummary: string;
  includedDutiesList: string;
  excludedDutiesList: string;
}

/**
 * Build template variables from plan context (EMAIL-09)
 */
function buildTemplateVariables(context: RTWPlanEmailContext): TemplateVariables {
  const planTypeLabel = PLAN_TYPE_LABELS[context.planType] || context.planType;
  const scheduleSummary = formatScheduleSummary(context.schedule);

  const includedDutiesList = context.includedDuties
    .map((d) => `- ${d.dutyName}${d.modificationNotes ? ` (modifications: ${d.modificationNotes})` : ""}`)
    .join("\n");

  const excludedDutiesList = context.excludedDuties
    .map((d) => `- ${d.dutyName}${d.excludedReason ? ` (${d.excludedReason})` : ""}`)
    .join("\n");

  return {
    workerName: context.workerName,
    company: context.company,
    dateOfInjury: context.dateOfInjury,
    workStatus: context.workStatus,
    roleName: context.roleName,
    roleDescription: context.roleDescription,
    planType: context.planType,
    planTypeLabel,
    planStatus: context.planStatus,
    startDate: context.startDate,
    restrictionReviewDate: context.restrictionReviewDate,
    scheduleSummary,
    includedDutiesList: includedDutiesList || "No included duties",
    excludedDutiesList: excludedDutiesList || "No excluded duties",
  };
}

/**
 * Render email from organization template (EMAIL-09)
 * Returns null if no template exists or rendering fails
 */
async function renderFromTemplate(
  organizationId: string,
  context: RTWPlanEmailContext
): Promise<GeneratedEmail | null> {
  const template = await storage.getEmailTemplate(organizationId, "rtw_plan_notification");

  if (!template || !template.isActive) {
    return null;
  }

  try {
    const variables = buildTemplateVariables(context);

    const subjectCompiled = Handlebars.compile(template.subjectTemplate);
    const bodyCompiled = Handlebars.compile(template.bodyTemplate);

    return {
      subject: subjectCompiled(variables),
      body: bodyCompiled(variables),
    };
  } catch (error) {
    logger.api.error("Template rendering failed", { organizationId }, error);
    return null;
  }
}

/**
 * Build the prompt for email generation
 */
function buildEmailPrompt(context: RTWPlanEmailContext): string {
  const planTypeLabel = PLAN_TYPE_LABELS[context.planType] || context.planType;
  const scheduleSummary = formatScheduleSummary(context.schedule);
  const dutiesList = formatDutiesList(context.includedDuties, context.excludedDuties);

  const restrictionInfo = [];
  if (context.maxHoursPerDay) {
    restrictionInfo.push(`Max ${context.maxHoursPerDay} hours per day`);
  }
  if (context.maxDaysPerWeek) {
    restrictionInfo.push(`Max ${context.maxDaysPerWeek} days per week`);
  }

  return `You are drafting a professional email for a workplace injury case manager in Victoria, Australia.

EMAIL TYPE: RTW Plan Manager Notification
RECIPIENT: Employer/Manager at ${context.company}
TONE: Professional, collaborative, supportive

PLAN CONTEXT:
- Worker: ${context.workerName}
- Company: ${context.company}
- Date of Injury: ${context.dateOfInjury}
- Current Work Status: ${context.workStatus}
- Role: ${context.roleName}${context.roleDescription ? ` - ${context.roleDescription}` : ""}

RTW PLAN DETAILS:
- Plan Type: ${planTypeLabel}
- Plan Status: ${context.planStatus}
- Start Date: ${context.startDate}
${context.restrictionReviewDate ? `- Restriction Review Date: ${context.restrictionReviewDate}` : ""}

SCHEDULE:
${scheduleSummary}

WORK RESTRICTIONS:
${restrictionInfo.length > 0 ? restrictionInfo.join(", ") : "As per medical certificate"}

DUTIES:
${dutiesList}

GUIDELINES FOR THIS EMAIL:
- Introduce the RTW plan and its purpose
- Clearly state the plan type and start date
- Summarize the proposed schedule progression
- Highlight which duties the worker can perform (with any modifications)
- Note any duties that are currently excluded and why
- Request the employer's review and feedback
- Offer to discuss any concerns or adjustments
- Use Australian English spelling (favour, colour, organisation, etc.)
- Keep the tone professional and collaborative
- Focus on supporting the worker's safe and sustainable return to work

IMPORTANT RULES:
- Be clear, concise, and actionable
- Do NOT make medical diagnoses or predictions
- Reference specific plan details to personalize the email
- Keep reasonable length (not too long)
- Sign off appropriately (e.g., "Kind regards," or "Best regards,")
- Do NOT include sender name/title - leave for user to add

Generate the email in this exact format:
Subject: [subject line here]

[email body here starting with appropriate greeting]`;
}

/**
 * Parse the AI response to extract subject and body
 */
function parseEmailResponse(responseText: string): GeneratedEmail {
  // Clean up any markdown formatting
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
  }

  // Extract subject line
  const subjectMatch = cleaned.match(/^Subject:\s*(.+?)(?:\n|$)/i);
  const subject = subjectMatch
    ? subjectMatch[1].trim()
    : "Return to Work Plan - Review Required";

  // Extract body (everything after subject line)
  let body = cleaned;
  if (subjectMatch) {
    body = cleaned.slice(subjectMatch[0].length).trim();
  }

  // Remove any leading "Body:" prefix if present
  body = body.replace(/^Body:\s*/i, "").trim();

  return { subject, body };
}

/**
 * Generate RTW plan notification email using template chain (EMAIL-09)
 *
 * Fallback chain:
 * 1. Organization-specific template (if exists and active)
 * 2. AI generation (if API key configured)
 * 3. Fallback static template
 */
export async function generateRTWPlanEmail(
  context: RTWPlanEmailContext,
  organizationId?: string
): Promise<GeneratedEmail> {
  // 1. Try organization-specific template first (EMAIL-09)
  if (organizationId) {
    const templateResult = await renderFromTemplate(organizationId, context);
    if (templateResult) {
      logger.api.info("Generated RTW email from template", {
        workerName: context.workerName,
        organizationId,
      });
      return templateResult;
    }
  }

  // 2. Fall back to AI generation
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.api.warn("ANTHROPIC_API_KEY not configured, using fallback email template");
    return generateFallbackEmail(context);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    // Build the prompt
    const prompt = buildEmailPrompt(context);

    // Call the AI
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      logger.api.warn("No text content in AI response, using fallback");
      return generateFallbackEmail(context);
    }

    // Parse the response
    const result = parseEmailResponse(textContent.text);

    logger.api.info("Generated RTW plan email via AI", {
      workerName: context.workerName,
      planType: context.planType,
      subjectLength: result.subject.length,
      bodyLength: result.body.length,
    });

    return result;
  } catch (error) {
    logger.api.error("RTW email generation failed, using fallback", {
      workerName: context.workerName,
    }, error);
    return generateFallbackEmail(context);
  }
}

/**
 * Generate fallback email when AI is unavailable
 */
function generateFallbackEmail(context: RTWPlanEmailContext): GeneratedEmail {
  const planTypeLabel = PLAN_TYPE_LABELS[context.planType] || context.planType;
  const scheduleSummary = formatScheduleSummary(context.schedule);

  const subject = `Return to Work Plan for ${context.workerName} - ${planTypeLabel}`;

  const includedDutiesList = context.includedDuties
    .map((d) => `  - ${d.dutyName}${d.modificationNotes ? ` (modifications: ${d.modificationNotes})` : ""}`)
    .join("\n");

  const excludedDutiesList = context.excludedDuties
    .map((d) => `  - ${d.dutyName}${d.excludedReason ? ` (${d.excludedReason})` : ""}`)
    .join("\n");

  const body = `Dear Manager,

I am writing to share the proposed Return to Work Plan for ${context.workerName}, who is employed in the ${context.roleName} role at ${context.company}.

Plan Overview:
- Plan Type: ${planTypeLabel}
- Start Date: ${context.startDate}
- Schedule: ${scheduleSummary}
${context.restrictionReviewDate ? `- Restrictions valid until: ${context.restrictionReviewDate}` : ""}

${context.includedDuties.length > 0 ? `Duties the worker can perform:
${includedDutiesList}
` : ""}
${context.excludedDuties.length > 0 ? `Duties currently excluded:
${excludedDutiesList}
` : ""}
Please review this plan and let me know if you have any questions or require any adjustments. I am happy to discuss the details and ensure the plan works for your operations while supporting ${context.workerName}'s safe return to work.

Kind regards,`;

  return { subject, body };
}
