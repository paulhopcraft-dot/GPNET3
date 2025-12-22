/**
 * Prediction Service - XGBoost-style Prediction Layer (PRD-25)
 *
 * Implements case outcome predictions using feature extraction and scoring.
 * Designed to be pluggable for future ML model integration.
 *
 * Predictions include:
 * - RTW (Return to Work) probability
 * - Case duration estimate (weeks)
 * - Escalation risk score
 * - Cost risk classification
 *
 * Each prediction includes confidence score and key contributing factors.
 */

import type { WorkerCase } from "@shared/schema";

// Feature weights - would be learned by XGBoost in production
const FEATURE_WEIGHTS = {
  // Work status impact on RTW probability
  workStatus: {
    "At work": 0.9,
    "Modified duties": 0.7,
    "Off work": 0.3,
    "Unknown": 0.5,
  },
  // Risk level impact
  riskLevel: {
    Low: 0.8,
    Medium: 0.5,
    High: 0.2,
  },
  // Compliance impact
  compliance: {
    compliant: 0.85,
    "at-risk": 0.55,
    "non-compliant": 0.3,
  },
  // Certificate status impact
  hasCertificate: {
    true: 0.75,
    false: 0.45,
  },
};

export interface PredictionFactor {
  feature: string;
  value: string | number;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

export interface CasePrediction {
  caseId: string;
  workerName: string;
  company: string;

  // Core predictions
  rtwProbability: number; // 0-100 percentage
  expectedWeeksToRtw: number;
  escalationRisk: "low" | "medium" | "high";
  costRisk: "low" | "medium" | "high";
  deteriorationRisk: "low" | "medium" | "high";

  // Confidence and explanations
  confidence: number; // 0-100 percentage
  factors: PredictionFactor[];

  // Metadata
  modelVersion: string;
  generatedAt: string;
}

export interface PredictionSummary {
  totalCases: number;
  avgRtwProbability: number;
  highRtwCount: number;
  lowRtwCount: number;
  highEscalationCount: number;
  avgConfidence: number;
}

/**
 * Extract features from a worker case for prediction
 */
function extractFeatures(workerCase: WorkerCase): Record<string, number | string> {
  const now = new Date();
  const injuryDate = new Date(workerCase.dateOfInjury);
  const weeksElapsed = Math.max(
    0,
    Math.floor((now.getTime() - injuryDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );

  // Normalize compliance indicator
  let complianceStatus = "compliant";
  if (workerCase.complianceIndicator) {
    const indicator = workerCase.complianceIndicator.toLowerCase();
    if (indicator.includes("non") || indicator.includes("red")) {
      complianceStatus = "non-compliant";
    } else if (indicator.includes("risk") || indicator.includes("amber") || indicator.includes("yellow")) {
      complianceStatus = "at-risk";
    }
  }

  // Extract RTW plan status
  const rtwStatus = workerCase.rtwPlanStatus || "not_planned";

  return {
    weeksElapsed,
    workStatus: workerCase.workStatus || "Unknown",
    riskLevel: workerCase.riskLevel || "Medium",
    hasCertificate: workerCase.hasCertificate ? "true" : "false",
    complianceStatus,
    rtwStatus,
    hasAiSummary: workerCase.aiSummary ? "true" : "false",
  };
}

/**
 * Calculate RTW probability based on extracted features
 */
function calculateRtwProbability(features: Record<string, number | string>): {
  probability: number;
  factors: PredictionFactor[];
} {
  const factors: PredictionFactor[] = [];
  let score = 0.5; // Base probability

  // Work status factor
  const workStatusWeight =
    FEATURE_WEIGHTS.workStatus[features.workStatus as keyof typeof FEATURE_WEIGHTS.workStatus] ||
    0.5;
  score += (workStatusWeight - 0.5) * 0.35;
  factors.push({
    feature: "workStatus",
    value: features.workStatus,
    impact: workStatusWeight >= 0.6 ? "positive" : workStatusWeight <= 0.4 ? "negative" : "neutral",
    weight: 0.35,
    description: `Current work status: ${features.workStatus}`,
  });

  // Risk level factor
  const riskWeight =
    FEATURE_WEIGHTS.riskLevel[features.riskLevel as keyof typeof FEATURE_WEIGHTS.riskLevel] || 0.5;
  score += (riskWeight - 0.5) * 0.25;
  factors.push({
    feature: "riskLevel",
    value: features.riskLevel,
    impact: riskWeight >= 0.6 ? "positive" : riskWeight <= 0.4 ? "negative" : "neutral",
    weight: 0.25,
    description: `Case risk level: ${features.riskLevel}`,
  });

  // Compliance factor
  const complianceWeight =
    FEATURE_WEIGHTS.compliance[
      features.complianceStatus as keyof typeof FEATURE_WEIGHTS.compliance
    ] || 0.55;
  score += (complianceWeight - 0.5) * 0.2;
  factors.push({
    feature: "compliance",
    value: features.complianceStatus,
    impact:
      complianceWeight >= 0.7 ? "positive" : complianceWeight <= 0.4 ? "negative" : "neutral",
    weight: 0.2,
    description: `Compliance status: ${features.complianceStatus}`,
  });

  // Certificate factor
  const hasCert = features.hasCertificate === "true";
  const certWeight = hasCert
    ? FEATURE_WEIGHTS.hasCertificate.true
    : FEATURE_WEIGHTS.hasCertificate.false;
  score += (certWeight - 0.5) * 0.1;
  factors.push({
    feature: "hasCertificate",
    value: hasCert ? "Yes" : "No",
    impact: hasCert ? "positive" : "negative",
    weight: 0.1,
    description: hasCert ? "Valid certificate on file" : "No current certificate",
  });

  // Time decay factor (longer cases have lower RTW probability)
  const weeksElapsed = features.weeksElapsed as number;
  const timeDecay = Math.max(0, 1 - weeksElapsed * 0.02);
  score *= timeDecay;
  if (weeksElapsed > 12) {
    factors.push({
      feature: "weeksElapsed",
      value: weeksElapsed,
      impact: "negative",
      weight: 0.1,
      description: `${weeksElapsed} weeks since injury (extended duration)`,
    });
  }

  // RTW plan status boost
  const rtwStatus = features.rtwStatus as string;
  if (rtwStatus === "in_progress" || rtwStatus === "working_well") {
    score += 0.1;
    factors.push({
      feature: "rtwStatus",
      value: rtwStatus,
      impact: "positive",
      weight: 0.1,
      description: "Active RTW plan in progress",
    });
  } else if (rtwStatus === "failing") {
    score -= 0.15;
    factors.push({
      feature: "rtwStatus",
      value: rtwStatus,
      impact: "negative",
      weight: 0.1,
      description: "RTW plan currently failing",
    });
  }

  // Clamp to 0-100 range
  const probability = Math.round(Math.min(100, Math.max(0, score * 100)));

  return { probability, factors };
}

/**
 * Estimate weeks to RTW based on features
 */
function calculateWeeksToRtw(
  features: Record<string, number | string>,
  rtwProbability: number
): number {
  const weeksElapsed = features.weeksElapsed as number;

  // If already at work, 0 weeks remaining
  if (features.workStatus === "At work") {
    return 0;
  }

  // Base estimate based on risk level
  let baseWeeks =
    features.riskLevel === "Low"
      ? 4
      : features.riskLevel === "Medium"
        ? 8
        : 12;

  // Adjust based on current probability
  if (rtwProbability >= 70) {
    baseWeeks = Math.max(1, baseWeeks - 3);
  } else if (rtwProbability < 40) {
    baseWeeks += 4;
  }

  // Account for time already elapsed
  const adjustedWeeks = Math.max(0, baseWeeks - Math.floor(weeksElapsed / 2));

  return adjustedWeeks;
}

/**
 * Calculate escalation risk score
 */
function calculateEscalationRisk(
  features: Record<string, number | string>,
  rtwProbability: number
): "low" | "medium" | "high" {
  const weeksElapsed = features.weeksElapsed as number;

  if (
    features.riskLevel === "High" &&
    weeksElapsed > 8 &&
    rtwProbability < 50
  ) {
    return "high";
  }

  if (
    features.riskLevel === "High" ||
    weeksElapsed > 12 ||
    features.complianceStatus === "non-compliant"
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Calculate cost risk classification
 */
function calculateCostRisk(
  features: Record<string, number | string>,
  weeksToRtw: number
): "low" | "medium" | "high" {
  const weeksElapsed = features.weeksElapsed as number;
  const totalProjectedDuration = weeksElapsed + weeksToRtw;

  if (
    features.riskLevel === "High" ||
    totalProjectedDuration > 20 ||
    features.complianceStatus === "non-compliant"
  ) {
    return "high";
  }

  if (
    features.riskLevel === "Medium" ||
    totalProjectedDuration > 10
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Calculate deterioration risk
 */
function calculateDeteriorationRisk(
  features: Record<string, number | string>
): "low" | "medium" | "high" {
  const rtwStatus = features.rtwStatus as string;
  const weeksElapsed = features.weeksElapsed as number;

  if (rtwStatus === "failing" || features.complianceStatus === "non-compliant") {
    return "high";
  }

  if (
    features.riskLevel === "High" ||
    (weeksElapsed > 8 && features.workStatus === "Off work")
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Calculate confidence score for predictions
 */
function calculateConfidence(features: Record<string, number | string>): number {
  let confidence = 70; // Base confidence

  // More data = higher confidence
  if (features.hasAiSummary === "true") confidence += 10;
  if (features.hasCertificate === "true") confidence += 5;
  if (features.rtwStatus !== "not_planned") confidence += 5;

  // Very old cases have lower confidence (patterns may differ)
  const weeksElapsed = features.weeksElapsed as number;
  if (weeksElapsed > 24) confidence -= 15;
  else if (weeksElapsed > 12) confidence -= 5;

  return Math.min(95, Math.max(50, confidence));
}

/**
 * Generate prediction for a single case
 */
export function predictCase(workerCase: WorkerCase): CasePrediction {
  const features = extractFeatures(workerCase);
  const { probability: rtwProbability, factors } = calculateRtwProbability(features);
  const expectedWeeksToRtw = calculateWeeksToRtw(features, rtwProbability);
  const escalationRisk = calculateEscalationRisk(features, rtwProbability);
  const costRisk = calculateCostRisk(features, expectedWeeksToRtw);
  const deteriorationRisk = calculateDeteriorationRisk(features);
  const confidence = calculateConfidence(features);

  return {
    caseId: workerCase.id,
    workerName: workerCase.workerName,
    company: workerCase.company,
    rtwProbability,
    expectedWeeksToRtw,
    escalationRisk,
    costRisk,
    deteriorationRisk,
    confidence,
    factors: factors.sort((a, b) => b.weight - a.weight),
    modelVersion: "xgboost-sim-v1.0",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate predictions for multiple cases
 */
export function predictCases(cases: WorkerCase[]): CasePrediction[] {
  return cases.map(predictCase);
}

/**
 * Generate summary statistics for a set of predictions
 */
export function summarizePredictions(predictions: CasePrediction[]): PredictionSummary {
  if (predictions.length === 0) {
    return {
      totalCases: 0,
      avgRtwProbability: 0,
      highRtwCount: 0,
      lowRtwCount: 0,
      highEscalationCount: 0,
      avgConfidence: 0,
    };
  }

  const avgRtwProbability = Math.round(
    predictions.reduce((sum, p) => sum + p.rtwProbability, 0) / predictions.length
  );

  const avgConfidence = Math.round(
    predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
  );

  return {
    totalCases: predictions.length,
    avgRtwProbability,
    highRtwCount: predictions.filter((p) => p.rtwProbability >= 70).length,
    lowRtwCount: predictions.filter((p) => p.rtwProbability < 50).length,
    highEscalationCount: predictions.filter((p) => p.escalationRisk === "high").length,
    avgConfidence,
  };
}
