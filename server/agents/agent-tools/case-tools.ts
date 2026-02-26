/**
 * Case Tools — wraps existing storage.ts functions
 */

import { storage } from "../../storage";
import type { AgentTool } from "../base-agent";

export const getCaseTool: AgentTool = {
  name: "get_case",
  description: "Fetch a worker case by ID, including clinical status, RTW plan status, certificate info, and compliance indicator.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string", description: "The worker case ID" },
    },
    required: ["caseId"],
  },
  async execute({ caseId }) {
    const workerCase = await storage.getCaseById(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);
    return {
      id: workerCase.id,
      workerName: workerCase.workerName,
      company: workerCase.company,
      dateOfInjury: workerCase.dateOfInjury,
      workStatus: workerCase.workStatus,
      riskLevel: workerCase.riskLevel,
      rtwPlanStatus: workerCase.rtwPlanStatus,
      complianceIndicator: workerCase.complianceIndicator,
      currentStatus: workerCase.currentStatus,
      nextStep: workerCase.nextStep,
      dueDate: workerCase.dueDate,
      hasCertificate: workerCase.hasCertificate,
      currentCertificateEnd: workerCase.currentCertificateEnd,
      clinicalStatusJson: workerCase.clinicalStatusJson,
      caseStatus: workerCase.caseStatus,
      organizationId: workerCase.organizationId,
    };
  },
};

export const getCasesForOrgTool: AgentTool = {
  name: "get_cases_for_org",
  description: "Fetch all open cases for an organisation. Used by coordinator agent for morning briefing.",
  inputSchema: {
    type: "object",
    properties: {
      organizationId: { type: "string", description: "The organisation ID. Omit to get all (admin only)." },
    },
    required: [],
  },
  async execute({ organizationId }) {
    const orgId = organizationId as string | undefined;
    const result = await storage.getGPNet2CasesPaginated(orgId, 1, 200);
    const cases = result.cases.filter((c) => c.caseStatus !== "closed");
    return {
      totalCases: cases.length,
      cases: cases.map((c) => ({
        id: c.id,
        workerName: c.workerName,
        company: c.company,
        workStatus: c.workStatus,
        riskLevel: c.riskLevel,
        rtwPlanStatus: c.rtwPlanStatus,
        complianceIndicator: c.complianceIndicator,
        hasCertificate: c.hasCertificate,
        currentCertificateEnd: c.currentCertificateEnd,
        dueDate: c.dueDate,
        dateOfInjury: c.dateOfInjury,
        clinicalStatusJson: c.clinicalStatusJson,
      })),
    };
  },
};

export const getTreatingPartiesTool: AgentTool = {
  name: "get_treating_parties",
  description: "Get the GP, physiotherapist, specialist, and employer contacts for a case.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
    },
    required: ["caseId"],
  },
  async execute({ caseId }) {
    const workerCase = await storage.getCaseById(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);
    const contacts = await storage.getCaseContacts(caseId as string, workerCase.organizationId);
    return { contacts };
  },
};

export const getMedicalConstraintsTool: AgentTool = {
  name: "get_medical_constraints",
  description: "Get current medical restrictions and functional capacity for a worker case.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
    },
    required: ["caseId"],
  },
  async execute({ caseId }) {
    const workerCase = await storage.getCaseById(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);
    const clinical = workerCase.clinicalStatusJson;
    return {
      medicalConstraints: clinical?.medicalConstraints ?? null,
      functionalCapacity: clinical?.functionalCapacity ?? null,
      suitableDutiesOffered: clinical?.suitableDutiesOffered ?? false,
      suitableDutiesDate: clinical?.suitableDutiesDate ?? null,
    };
  },
};

export const flagCaseForReviewTool: AgentTool = {
  name: "flag_case_for_review",
  description: "Flag a case for human case manager review with a reason and priority.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
      reason: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
    },
    required: ["caseId", "reason", "priority"],
  },
  async execute({ caseId, reason, priority }) {
    const workerCase = await storage.getCaseById(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);

    await storage.createAction({
      organizationId: workerCase.organizationId,
      caseId: caseId as string,
      type: "review_case",
      status: "pending",
      priority: priority === "critical" ? 4 : priority === "high" ? 3 : priority === "medium" ? 2 : 1,
      notes: `[Agent Flag] ${reason}`,
      isBlocker: priority === "critical" || priority === "high",
    });
    return { flagged: true, caseId, reason, priority };
  },
};

export const caseTools: AgentTool[] = [
  getCaseTool,
  getCasesForOrgTool,
  getTreatingPartiesTool,
  getMedicalConstraintsTool,
  flagCaseForReviewTool,
];
