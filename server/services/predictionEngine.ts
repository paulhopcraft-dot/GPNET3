/**
 * Prediction Engine - Rule-based case outcome predictions
 *
 * PRD-9 Compliance:
 * - Advisory only (predictions are informational)
 * - Explainable (each prediction includes contributing factors)
 * - No autonomous decisions (returns data for human review)
 */

import type { WorkerCase, RiskLevel } from "@shared/schema";

export type RiskCategory = "High" | "Medium" | "Low";

export interface PredictionFactor {
  description: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
}

export interface CasePrediction {
  caseId: string;
  rtwProbability: number;
  expectedWeeksRemaining: number;
  weeksElapsed: number;
  costRisk: RiskCategory;
  escalationRisk: RiskCategory;
  factors: PredictionFactor[];
  generatedAt: string;
}

/**
 * Calculate weeks elapsed since injury
 */
function getWeeksElapsed(dateOfInjury: string): number {
  const injuryDate = new Date(dateOfInjury);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((now.getTime() - injuryDate.getTime()) / msPerWeek);
}

/**
 * Calculate RTW probability based on case factors
 */
export function calculateRtwProbability(workerCase: WorkerCase): number {
  let probability = 50; // Base probability
  const factors: PredictionFactor[] = [];

  // Work status has the biggest impact
  if (workerCase.workStatus === "At work") {
    probability = 90;
    factors.push({
      description: "Worker is currently at work",
      impact: "positive",
      weight: 40,
    });
  }

  // Risk level adjustment
  switch (workerCase.riskLevel) {
    case "Low":
      probability += 20;
      break;
    case "Medium":
      probability += 0;
      break;
    case "High":
      probability -= 20;
      break;
  }

  // Clinical evidence adjustments
  if (workerCase.clinicalEvidence) {
    const ce = workerCase.clinicalEvidence;

    if (ce.hasCurrentTreatmentPlan) {
      probability += 5;
    } else {
      probability -= 5;
    }

    if (ce.hasCurrentCertificate) {
      probability += 5;
    } else {
      probability -= 5;
    }

    if (ce.isImprovingOnExpectedTimeline === true) {
      probability += 10;
    } else if (ce.isImprovingOnExpectedTimeline === false) {
      probability -= 10;
    }

    if (ce.dutySafetyStatus === "safe") {
      probability += 10;
    } else if (ce.dutySafetyStatus === "unsafe") {
      probability -= 10;
    }

    // Flags reduce probability
    if (ce.flags && ce.flags.length > 0) {
      probability -= ce.flags.length * 3;
    }
  }

  // Clamp to valid range
  return Math.max(0, Math.min(100, Math.round(probability)));
}

/**
 * Calculate expected weeks remaining until RTW
 */
export function calculateWeeksRemaining(workerCase: WorkerCase): number {
  if (workerCase.workStatus === "At work") {
    return 0;
  }

  const weeksElapsed = getWeeksElapsed(workerCase.dateOfInjury);

  // Base expected duration by risk level
  let expectedTotalWeeks: number;
  switch (workerCase.riskLevel) {
    case "Low":
      expectedTotalWeeks = 4;
      break;
    case "Medium":
      expectedTotalWeeks = 8;
      break;
    case "High":
      expectedTotalWeeks = 12;
      break;
    default:
      expectedTotalWeeks = 8;
  }

  // Clinical evidence may extend duration
  if (workerCase.clinicalEvidence) {
    const ce = workerCase.clinicalEvidence;
    if (ce.isImprovingOnExpectedTimeline === false) {
      expectedTotalWeeks += 4;
    }
    // If specialist is needed (referred/booked/waiting) but no report yet, extend duration
    const needsSpecialist = ce.specialistStatus === "referred" ||
                            ce.specialistStatus === "appointment_booked" ||
                            ce.specialistStatus === "seen_waiting_report";
    if (needsSpecialist && !ce.specialistReportPresent) {
      expectedTotalWeeks += 2;
    }
  }

  const remaining = expectedTotalWeeks - weeksElapsed;
  return Math.max(0, Math.round(remaining));
}

/**
 * Calculate cost risk based on case factors
 */
export function calculateCostRisk(workerCase: WorkerCase): RiskCategory {
  // High risk cases have high cost risk
  if (workerCase.riskLevel === "High") {
    return "High";
  }

  // Low risk cases at work have low cost risk
  if (workerCase.riskLevel === "Low" && workerCase.workStatus === "At work") {
    return "Low";
  }

  // Medium risk or low risk off work
  if (workerCase.riskLevel === "Low") {
    return "Low";
  }

  return "Medium";
}

/**
 * Calculate escalation risk based on case factors and time
 */
export function calculateEscalationRisk(workerCase: WorkerCase): RiskCategory {
  const weeksElapsed = getWeeksElapsed(workerCase.dateOfInjury);

  // High risk with many weeks = high escalation
  if (workerCase.riskLevel === "High" && weeksElapsed > 8) {
    return "High";
  }

  // Any case over 12 weeks is at least medium escalation
  if (weeksElapsed > 12) {
    return workerCase.riskLevel === "High" ? "High" : "Medium";
  }

  // Low risk recent cases
  if (workerCase.riskLevel === "Low" && weeksElapsed < 4) {
    return "Low";
  }

  // Medium risk or older low risk
  if (workerCase.riskLevel === "High") {
    return "Medium";
  }

  if (weeksElapsed > 8) {
    return "Medium";
  }

  return "Low";
}

/**
 * Generate explainability factors for the prediction
 */
function generateFactors(workerCase: WorkerCase): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  // Work status factor
  factors.push({
    description:
      workerCase.workStatus === "At work"
        ? "Worker is currently at work"
        : "Worker is currently off work",
    impact: workerCase.workStatus === "At work" ? "positive" : "negative",
    weight: workerCase.workStatus === "At work" ? 40 : -20,
  });

  // Risk level factor
  const riskImpact: Record<RiskLevel, "positive" | "negative" | "neutral"> = {
    Low: "positive",
    Medium: "neutral",
    High: "negative",
  };
  factors.push({
    description: `Case risk level is ${workerCase.riskLevel}`,
    impact: riskImpact[workerCase.riskLevel],
    weight: workerCase.riskLevel === "Low" ? 20 : workerCase.riskLevel === "High" ? -20 : 0,
  });

  // Duration factor
  const weeksElapsed = getWeeksElapsed(workerCase.dateOfInjury);
  if (weeksElapsed > 12) {
    factors.push({
      description: `Case has been open for ${weeksElapsed} weeks (over 12 weeks)`,
      impact: "negative",
      weight: -15,
    });
  } else if (weeksElapsed < 4) {
    factors.push({
      description: `Case is recent (${weeksElapsed} weeks)`,
      impact: "positive",
      weight: 10,
    });
  }

  // Clinical evidence factors
  if (workerCase.clinicalEvidence) {
    const ce = workerCase.clinicalEvidence;

    if (ce.hasCurrentTreatmentPlan) {
      factors.push({
        description: "Active treatment plan in place",
        impact: "positive",
        weight: 5,
      });
    } else {
      factors.push({
        description: "No current treatment plan",
        impact: "negative",
        weight: -5,
      });
    }

    if (ce.isImprovingOnExpectedTimeline === true) {
      factors.push({
        description: "Worker is improving on expected timeline",
        impact: "positive",
        weight: 10,
      });
    } else if (ce.isImprovingOnExpectedTimeline === false) {
      factors.push({
        description: "Recovery is slower than expected",
        impact: "negative",
        weight: -10,
      });
    }

    if (ce.dutySafetyStatus === "safe") {
      factors.push({
        description: "Worker is cleared for duties",
        impact: "positive",
        weight: 10,
      });
    }

    if (ce.flags && ce.flags.length > 0) {
      factors.push({
        description: `${ce.flags.length} clinical flag(s) present`,
        impact: "negative",
        weight: -ce.flags.length * 3,
      });
    }
  }

  return factors;
}

/**
 * Calculate complete prediction for a case
 */
export function calculatePrediction(workerCase: WorkerCase): CasePrediction {
  const weeksElapsed = getWeeksElapsed(workerCase.dateOfInjury);

  return {
    caseId: workerCase.id,
    rtwProbability: calculateRtwProbability(workerCase),
    expectedWeeksRemaining: calculateWeeksRemaining(workerCase),
    weeksElapsed,
    costRisk: calculateCostRisk(workerCase),
    escalationRisk: calculateEscalationRisk(workerCase),
    factors: generateFactors(workerCase),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate predictions for multiple cases
 */
export function calculatePredictions(cases: WorkerCase[]): CasePrediction[] {
  return cases.map(calculatePrediction);
}
