/**
 * Recovery Tools — analyses recovery trajectory from certificate history
 *
 * The recoveryEstimator.ts service has a complex InjuryContext interface.
 * These tools implement lighter recovery analysis directly from certificate data,
 * which is sufficient for the agent's monitoring purposes.
 */

import { storage } from "../../storage";
import type { AgentTool } from "../base-agent";

export const getCapacityTrendTool: AgentTool = {
  name: "get_capacity_trend",
  description: "Analyse functional capacity trend across certificates. Returns improving/static/declining and plateau detection.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
    },
    required: ["caseId"],
  },
  async execute({ caseId }) {
    const workerCase = await storage.getGPNet2CaseByIdAdmin(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);

    const certs = await storage.getCertificatesByCase(caseId as string, workerCase.organizationId);
    if (certs.length < 2) {
      return { trend: "insufficient_data", certCount: certs.length };
    }

    const sorted = certs.sort(
      (a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
    );
    const capacityValues = sorted
      .map((c) => c.workCapacityPercentage)
      .filter((v): v is number => v !== null && v !== undefined);

    if (capacityValues.length < 2) {
      return { trend: "insufficient_data", certCount: certs.length };
    }

    const first = capacityValues[0];
    const last = capacityValues[capacityValues.length - 1];
    const diff = last - first;
    const trend = diff > 10 ? "improving" : diff < -10 ? "declining" : "static";

    const lastThree = capacityValues.slice(-3);
    const isPlateaued =
      lastThree.length >= 2 && lastThree.every((v) => Math.abs(v - lastThree[0]) < 5);

    const injuryDate = new Date(workerCase.dateOfInjury);
    const weeksOffWork = Math.floor(
      (Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    return {
      trend,
      isPlateaued,
      firstCapacity: first,
      latestCapacity: last,
      changePercent: diff,
      certCount: certs.length,
      weeksOffWork,
      dataPoints: capacityValues,
    };
  },
};

export const compareToBenchmarkTool: AgentTool = {
  name: "compare_to_benchmark",
  description: "Compare a worker's recovery to typical benchmarks. Returns on-track/behind/ahead assessment.",
  inputSchema: {
    type: "object",
    properties: {
      caseId: { type: "string" },
    },
    required: ["caseId"],
  },
  async execute({ caseId }) {
    const workerCase = await storage.getGPNet2CaseByIdAdmin(caseId as string);
    if (!workerCase) throw new Error(`Case not found: ${caseId}`);

    const injuryDate = new Date(workerCase.dateOfInjury);
    const weeksOffWork = Math.floor(
      (Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    // General benchmark: most soft-tissue injuries resolve within 12 weeks
    // High-risk: if off work more than 6 weeks with no improvement
    const isLongTerm = weeksOffWork > 12;
    const isRisky = weeksOffWork > 6;
    const riskLevel = isLongTerm ? "high" : isRisky ? "medium" : "low";

    const workerCase2 = await storage.getCertificatesByCase(caseId as string, workerCase.organizationId);
    const latestCapacity = workerCase2.sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    )[0]?.workCapacityPercentage ?? 0;

    const progressStatus =
      latestCapacity >= 100
        ? "full_capacity"
        : latestCapacity >= 75
        ? "near_full"
        : latestCapacity >= 50
        ? "moderate"
        : "limited";

    return {
      weeksOffWork,
      riskLevel,
      progressStatus,
      latestCapacity,
      predictedLongTerm: isLongTerm,
      flags: [
        ...(isLongTerm ? ["Worker has been off work 12+ weeks — long-term disability risk"] : []),
        ...(isRisky && !isLongTerm ? ["Worker has been off work 6+ weeks — monitor closely"] : []),
        ...(latestCapacity < 50 && weeksOffWork > 4 ? ["Low functional capacity after 4+ weeks"] : []),
      ],
    };
  },
};

export const recoveryTools: AgentTool[] = [
  getCapacityTrendTool,
  compareToBenchmarkTool,
];
