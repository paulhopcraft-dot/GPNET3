/**
 * Compliance Tools — wraps complianceEngine.ts
 */

import type { AgentTool } from "../base-agent";

export const checkComplianceTool: AgentTool = {
  name: "check_compliance",
  description: "Run a full compliance evaluation for a case against all WIRC Act rules. Returns score and findings.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
    },
    required: ["caseId"],
  },
  async execute({ caseId }) {
    const { evaluateCase } = await import("../../services/complianceEngine");
    const report = await evaluateCase(caseId as string);
    const violations = report.checks.filter((c) => c.status === "non_compliant");
    return {
      overallScore: report.complianceScore,
      status: report.overallStatus,
      criticalViolations: violations.filter((v) => v.severity === "critical").length,
      highViolations: violations.filter((v) => v.severity === "high").length,
      totalViolations: violations.length,
      topFindings: violations.slice(0, 5).map((v) => ({
        ruleCode: v.ruleCode,
        severity: v.severity,
        finding: v.finding,
        recommendation: v.recommendation,
      })),
    };
  },
};

export const getComplianceViolationsTool: AgentTool = {
  name: "get_compliance_violations",
  description: "Get the list of current compliance violations for a case.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
    },
    required: ["caseId"],
  },
  async execute({ caseId }) {
    const { evaluateCase } = await import("../../services/complianceEngine");
    const report = await evaluateCase(caseId as string);
    const violations = report.checks.filter((c) => c.status === "non_compliant");
    return {
      violations,
      totalCount: violations.length,
    };
  },
};

export const complianceTools: AgentTool[] = [
  checkComplianceTool,
  getComplianceViolationsTool,
];
