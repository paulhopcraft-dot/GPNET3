import { callClaudeSkill } from "./claudeSkillCaller";

/**
 * Thin wrapper to call a compliance-focused Claude skill.
 * You can point this to "GoCaseAdvisor" or a dedicated policy skill.
 */
export async function assessCompliance(caseId: string) {
  const result = await callClaudeSkill("GoCaseAdvisor", { caseId });
  return result;
}
