/**
 * Certificate Tools — wraps certificateService.ts and storage
 */

import { storage } from "../../storage";
import type { AgentTool } from "../base-agent";

export const getCertificatesTool: AgentTool = {
  name: "get_certificates",
  description: "Get all medical certificates for a case, sorted by date descending.",
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
    const certs = await storage.getCertificatesByCase(caseId as string, workerCase.organizationId);
    return {
      total: certs.length,
      certificates: certs.map((c) => ({
        id: c.id,
        issueDate: c.issueDate,
        startDate: c.startDate,
        endDate: c.endDate,
        capacity: c.capacity,
        workCapacityPercentage: c.workCapacityPercentage,
        restrictions: c.restrictions,
        treatingPractitioner: c.treatingPractitioner,
        practitionerType: c.practitionerType,
        isCurrentCertificate: c.isCurrentCertificate,
        requiresReview: c.requiresReview,
        extractionConfidence: c.extractionConfidence,
      })),
    };
  },
};

export const getLatestCertificateTool: AgentTool = {
  name: "get_latest_certificate",
  description: "Get the most recent medical certificate for a case, including days until expiry.",
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
    const certs = await storage.getCertificatesByCase(caseId as string, workerCase.organizationId);
    if (!certs.length) return { certificate: null };
    const latest = certs.sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    )[0];
    const now = new Date();
    const endDate = new Date(latest.endDate);
    const daysUntilExpiry = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      certificate: {
        id: latest.id,
        issueDate: latest.issueDate,
        startDate: latest.startDate,
        endDate: latest.endDate,
        capacity: latest.capacity,
        workCapacityPercentage: latest.workCapacityPercentage,
        restrictions: latest.restrictions,
        treatingPractitioner: latest.treatingPractitioner,
        daysUntilExpiry,
        isExpired: daysUntilExpiry < 0,
        isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
      },
    };
  },
};

export const getExpiringCertificatesTool: AgentTool = {
  name: "get_expiring_certificates",
  description: "Get all cases with certificates expiring within the next N days for an organisation.",
  inputSchema: {
    type: "object",
    properties: {
      organizationId: { type: "string", description: "Organisation ID to filter by." },
      daysAhead: { type: "number", description: "Number of days ahead to check. Defaults to 7." },
    },
    required: ["organizationId"],
  },
  async execute({ organizationId, daysAhead }) {
    const days = (daysAhead as number) || 7;
    const expiring = await storage.getExpiringCertificates(organizationId as string, days);
    return {
      total: expiring.length,
      expiring: expiring.map((c) => ({
        id: c.id,
        caseId: c.caseId,
        endDate: c.endDate,
        treatingPractitioner: c.treatingPractitioner,
      })),
    };
  },
};

export const certificateTools: AgentTool[] = [
  getCertificatesTool,
  getLatestCertificateTool,
  getExpiringCertificatesTool,
];
