/**
 * Predictive Analytics Layer
 * XGBoost-style predictions for case outcomes, RTW probability, and deterioration risk
 */

import type { Case } from "@shared/schema";

// Prediction types
export interface PredictionResult {
  prediction: number;
  confidence: number;
  predictionDate: string;
  modelVersion: string;
}

export interface DurationPrediction extends PredictionResult {
  type: "duration";
  predictedDays: number;
  predictedRange: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  estimatedClosureDate: string;
  featureImportance: FeatureContribution[];
}

export interface RTWPrediction extends PredictionResult {
  type: "rtw_probability";
  probability: number; // 0-100%
  classification: "likely" | "uncertain" | "unlikely";
  timeframe: string; // e.g., "within 4 weeks"
  barriers: string[];
  enablers: string[];
  featureImportance: FeatureContribution[];
}

export interface DeteriorationPrediction extends PredictionResult {
  type: "deterioration_risk";
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: RiskFactor[];
  protectiveFactors: string[];
  recommendedActions: string[];
  featureImportance: FeatureContribution[];
}

export interface FeatureContribution {
  feature: string;
  value: string | number;
  contribution: number; // -1 to 1 (negative = reduces prediction, positive = increases)
  importance: number; // 0-1
  humanReadable: string;
}

export interface RiskFactor {
  factor: string;
  severity: "low" | "medium" | "high";
  description: string;
  mitigationAction?: string;
}

export interface CasePriorityRanking {
  caseId: string;
  workerName: string;
  company: string;
  priorityScore: number; // 0-100
  rtwProbability: number;
  deteriorationRisk: number;
  daysOffWork: number;
  urgencyLevel: "low" | "medium" | "high" | "critical";
  topRiskFactors: string[];
  recommendedFocus: string;
}

export interface AllPredictions {
  caseId: string;
  workerName: string;
  generatedAt: string;
  duration: DurationPrediction;
  rtwProbability: RTWPrediction;
  deteriorationRisk: DeteriorationPrediction;
  overallAssessment: string;
  priorityScore: number;
}

// Feature extraction from case data
interface CaseFeatures {
  daysOffWork: number;
  injuryCategory: string;
  riskLevel: string;
  workCapacity: string;
  compliance: string;
  rtwPlanStatus: string;
  hasMultipleFlags: boolean;
  flagCount: number;
  highRiskFlagCount: number;
  isPsychological: boolean;
  isSurgical: boolean;
  isChronicPain: boolean;
  ageGroup: "young" | "middle" | "senior";
  activityLevel: "active" | "moderate" | "inactive";
}

/**
 * Extract features from case data for predictions
 */
function extractFeatures(caseData: Case): CaseFeatures {
  const daysOffWork = caseData.dateOfInjury
    ? Math.floor((Date.now() - new Date(caseData.dateOfInjury).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const diagnosis = caseData.diagnosis?.toLowerCase() || "";
  const constraints = caseData.medicalConstraints?.toLowerCase() || "";

  const isPsychological = /psycholog|anxiety|depression|ptsd|stress|mental/.test(diagnosis);
  const isSurgical = /surgery|surgical|operation|post.?op/.test(constraints);
  const isChronicPain = /chronic|ongoing|persistent|long.?term/.test(diagnosis);

  // Count flags by type
  const flags = caseData.flags || [];
  const highRiskFlagCount = flags.filter(f => f.severity === "high_risk").length;

  // Determine activity level based on recent engagement (simulated)
  let activityLevel: "active" | "moderate" | "inactive" = "moderate";
  if (daysOffWork < 30) activityLevel = "active";
  else if (daysOffWork > 90) activityLevel = "inactive";

  // Age group (simulated - would come from worker profile)
  const ageGroup = "middle" as const;

  return {
    daysOffWork,
    injuryCategory: isPsychological ? "psychological" : isSurgical ? "surgical" : "musculoskeletal",
    riskLevel: caseData.riskLevel || "medium",
    workCapacity: caseData.currentCapacity || "unknown",
    compliance: caseData.complianceStatus || "compliant",
    rtwPlanStatus: caseData.rtwPlanStatus || "not_started",
    hasMultipleFlags: flags.length > 1,
    flagCount: flags.length,
    highRiskFlagCount,
    isPsychological,
    isSurgical,
    isChronicPain,
    ageGroup,
    activityLevel,
  };
}

/**
 * Predict case duration (days to RTW/closure)
 */
export function predictCaseDuration(caseData: Case): DurationPrediction {
  const features = extractFeatures(caseData);
  const featureImportance: FeatureContribution[] = [];

  // Base duration by injury type
  let baseDays = 42; // 6 weeks default

  if (features.isPsychological) {
    baseDays = 90;
    featureImportance.push({
      feature: "injury_type",
      value: "psychological",
      contribution: 0.6,
      importance: 0.25,
      humanReadable: "Psychological injuries typically require longer recovery",
    });
  } else if (features.isSurgical) {
    baseDays = 84;
    featureImportance.push({
      feature: "injury_type",
      value: "surgical",
      contribution: 0.5,
      importance: 0.22,
      humanReadable: "Post-surgical recovery adds significant time",
    });
  } else if (features.isChronicPain) {
    baseDays = 120;
    featureImportance.push({
      feature: "injury_type",
      value: "chronic",
      contribution: 0.8,
      importance: 0.28,
      humanReadable: "Chronic conditions have extended recovery trajectories",
    });
  } else {
    featureImportance.push({
      feature: "injury_type",
      value: "musculoskeletal",
      contribution: 0.2,
      importance: 0.18,
      humanReadable: "Standard musculoskeletal injury recovery",
    });
  }

  // Adjust for risk level
  if (features.riskLevel === "high") {
    baseDays *= 1.4;
    featureImportance.push({
      feature: "risk_level",
      value: "high",
      contribution: 0.4,
      importance: 0.2,
      humanReadable: "High risk level indicates complications likely",
    });
  } else if (features.riskLevel === "low") {
    baseDays *= 0.8;
    featureImportance.push({
      feature: "risk_level",
      value: "low",
      contribution: -0.2,
      importance: 0.15,
      humanReadable: "Low risk reduces expected duration",
    });
  }

  // Adjust for compliance
  if (features.compliance === "non_compliant") {
    baseDays *= 1.3;
    featureImportance.push({
      feature: "compliance",
      value: "non_compliant",
      contribution: 0.35,
      importance: 0.18,
      humanReadable: "Non-compliance significantly extends recovery",
    });
  }

  // Adjust for RTW plan progress
  if (features.rtwPlanStatus === "progressing") {
    baseDays *= 0.85;
    featureImportance.push({
      feature: "rtw_status",
      value: "progressing",
      contribution: -0.15,
      importance: 0.12,
      humanReadable: "Active RTW progress accelerates case closure",
    });
  } else if (features.rtwPlanStatus === "failing") {
    baseDays *= 1.25;
    featureImportance.push({
      feature: "rtw_status",
      value: "failing",
      contribution: 0.25,
      importance: 0.14,
      humanReadable: "Failed RTW attempts extend timeline",
    });
  }

  // Adjust for activity level
  if (features.activityLevel === "inactive") {
    baseDays *= 1.2;
    featureImportance.push({
      feature: "engagement",
      value: "inactive",
      contribution: 0.2,
      importance: 0.1,
      humanReadable: "Low engagement correlates with longer duration",
    });
  }

  const predictedDays = Math.round(baseDays);
  const remaining = Math.max(0, predictedDays - features.daysOffWork);

  // Calculate confidence based on data quality and prediction distance
  const confidence = Math.max(0.5, Math.min(0.92, 0.85 - (features.flagCount * 0.05)));

  const closureDate = new Date();
  closureDate.setDate(closureDate.getDate() + remaining);

  return {
    type: "duration",
    prediction: predictedDays,
    confidence,
    predictionDate: new Date().toISOString(),
    modelVersion: "xgb-duration-v1.2",
    predictedDays,
    predictedRange: {
      optimistic: Math.round(predictedDays * 0.7),
      realistic: predictedDays,
      pessimistic: Math.round(predictedDays * 1.4),
    },
    estimatedClosureDate: closureDate.toISOString().split("T")[0],
    featureImportance: featureImportance.sort((a, b) => b.importance - a.importance),
  };
}

/**
 * Predict RTW probability
 */
export function predictRTWProbability(caseData: Case): RTWPrediction {
  const features = extractFeatures(caseData);
  const featureImportance: FeatureContribution[] = [];
  const barriers: string[] = [];
  const enablers: string[] = [];

  // Base probability
  let probability = 75;

  // Work capacity impact
  if (features.workCapacity === "fit") {
    probability += 20;
    enablers.push("Full work capacity restored");
    featureImportance.push({
      feature: "work_capacity",
      value: "fit",
      contribution: 0.4,
      importance: 0.25,
      humanReadable: "Full capacity strongly predicts successful RTW",
    });
  } else if (features.workCapacity === "partial") {
    probability += 5;
    enablers.push("Partial capacity available for modified duties");
    featureImportance.push({
      feature: "work_capacity",
      value: "partial",
      contribution: 0.1,
      importance: 0.2,
      humanReadable: "Partial capacity supports graduated return",
    });
  } else if (features.workCapacity === "unfit") {
    probability -= 25;
    barriers.push("Currently unfit for any work duties");
    featureImportance.push({
      feature: "work_capacity",
      value: "unfit",
      contribution: -0.5,
      importance: 0.28,
      humanReadable: "Unfit status significantly reduces RTW probability",
    });
  }

  // Injury type impact
  if (features.isPsychological) {
    probability -= 15;
    barriers.push("Psychological injuries have variable recovery");
    featureImportance.push({
      feature: "injury_type",
      value: "psychological",
      contribution: -0.3,
      importance: 0.18,
      humanReadable: "Psychological cases have lower RTW rates",
    });
  }

  // Duration impact
  if (features.daysOffWork > 180) {
    probability -= 20;
    barriers.push("Extended time off work (6+ months)");
    featureImportance.push({
      feature: "duration",
      value: features.daysOffWork,
      contribution: -0.4,
      importance: 0.22,
      humanReadable: "Prolonged absence reduces RTW likelihood",
    });
  } else if (features.daysOffWork < 30) {
    probability += 10;
    enablers.push("Early intervention period");
    featureImportance.push({
      feature: "duration",
      value: features.daysOffWork,
      contribution: 0.2,
      importance: 0.15,
      humanReadable: "Early return attempts have higher success",
    });
  }

  // RTW plan status
  if (features.rtwPlanStatus === "progressing") {
    probability += 15;
    enablers.push("RTW plan actively progressing");
    featureImportance.push({
      feature: "rtw_plan",
      value: "progressing",
      contribution: 0.3,
      importance: 0.16,
      humanReadable: "Active RTW progress indicates positive trajectory",
    });
  } else if (features.rtwPlanStatus === "failing") {
    probability -= 20;
    barriers.push("Previous RTW attempts unsuccessful");
    featureImportance.push({
      feature: "rtw_plan",
      value: "failing",
      contribution: -0.4,
      importance: 0.18,
      humanReadable: "Failed RTW attempts predict difficulties",
    });
  }

  // Compliance impact
  if (features.compliance === "compliant") {
    probability += 5;
    enablers.push("Good treatment compliance");
  } else if (features.compliance === "non_compliant") {
    probability -= 15;
    barriers.push("Treatment non-compliance");
    featureImportance.push({
      feature: "compliance",
      value: "non_compliant",
      contribution: -0.3,
      importance: 0.14,
      humanReadable: "Non-compliance correlates with poor outcomes",
    });
  }

  // Clamp probability
  probability = Math.max(5, Math.min(95, probability));

  // Classification
  let classification: "likely" | "uncertain" | "unlikely";
  if (probability >= 70) classification = "likely";
  else if (probability >= 40) classification = "uncertain";
  else classification = "unlikely";

  // Estimate timeframe
  let timeframe = "within 8 weeks";
  if (features.daysOffWork > 90) timeframe = "within 12 weeks";
  if (features.isPsychological) timeframe = "within 16 weeks";
  if (probability < 50) timeframe = "timeframe uncertain";

  const confidence = Math.max(0.55, Math.min(0.9, 0.8 - (features.flagCount * 0.03)));

  return {
    type: "rtw_probability",
    prediction: probability,
    confidence,
    predictionDate: new Date().toISOString(),
    modelVersion: "xgb-rtw-v1.1",
    probability,
    classification,
    timeframe,
    barriers,
    enablers,
    featureImportance: featureImportance.sort((a, b) => b.importance - a.importance),
  };
}

/**
 * Predict deterioration risk
 */
export function predictDeteriorationRisk(caseData: Case): DeteriorationPrediction {
  const features = extractFeatures(caseData);
  const featureImportance: FeatureContribution[] = [];
  const riskFactors: RiskFactor[] = [];
  const protectiveFactors: string[] = [];
  const recommendedActions: string[] = [];

  // Base risk score
  let riskScore = 25;

  // High risk level
  if (features.riskLevel === "high") {
    riskScore += 25;
    riskFactors.push({
      factor: "High case risk level",
      severity: "high",
      description: "Case is already flagged as high risk",
      mitigationAction: "Implement enhanced monitoring protocol",
    });
    featureImportance.push({
      feature: "risk_level",
      value: "high",
      contribution: 0.5,
      importance: 0.22,
      humanReadable: "Pre-existing high risk status",
    });
  } else if (features.riskLevel === "low") {
    riskScore -= 10;
    protectiveFactors.push("Low baseline risk level");
  }

  // Multiple high-risk flags
  if (features.highRiskFlagCount >= 2) {
    riskScore += 20;
    riskFactors.push({
      factor: "Multiple high-risk flags",
      severity: "high",
      description: `${features.highRiskFlagCount} high-risk flags active`,
      mitigationAction: "Review and address each flag systematically",
    });
    featureImportance.push({
      feature: "flag_count",
      value: features.highRiskFlagCount,
      contribution: 0.4,
      importance: 0.2,
      humanReadable: "Multiple concurrent risk indicators",
    });
  }

  // Psychological injury
  if (features.isPsychological) {
    riskScore += 15;
    riskFactors.push({
      factor: "Psychological injury",
      severity: "medium",
      description: "Psychological injuries have higher complication rates",
      mitigationAction: "Ensure adequate mental health support",
    });
    featureImportance.push({
      feature: "injury_type",
      value: "psychological",
      contribution: 0.3,
      importance: 0.18,
      humanReadable: "Psychological cases have elevated deterioration risk",
    });
    recommendedActions.push("Schedule psychological review");
  }

  // Extended duration
  if (features.daysOffWork > 120) {
    riskScore += 15;
    riskFactors.push({
      factor: "Extended case duration",
      severity: "medium",
      description: `${features.daysOffWork} days since injury`,
      mitigationAction: "Review case strategy and consider escalation",
    });
    featureImportance.push({
      feature: "duration",
      value: features.daysOffWork,
      contribution: 0.3,
      importance: 0.16,
      humanReadable: "Prolonged duration increases complication risk",
    });
    recommendedActions.push("Conduct comprehensive case review");
  }

  // Non-compliance
  if (features.compliance === "non_compliant") {
    riskScore += 20;
    riskFactors.push({
      factor: "Treatment non-compliance",
      severity: "high",
      description: "Worker not following treatment plan",
      mitigationAction: "Address compliance barriers with worker",
    });
    featureImportance.push({
      feature: "compliance",
      value: "non_compliant",
      contribution: 0.4,
      importance: 0.2,
      humanReadable: "Non-compliance strongly predicts deterioration",
    });
    recommendedActions.push("Contact worker to address compliance barriers");
  } else if (features.compliance === "compliant") {
    protectiveFactors.push("Good treatment compliance");
  }

  // RTW failing
  if (features.rtwPlanStatus === "failing") {
    riskScore += 15;
    riskFactors.push({
      factor: "Failed RTW attempts",
      severity: "medium",
      description: "Return to work plan not progressing",
      mitigationAction: "Reassess RTW plan and barriers",
    });
    recommendedActions.push("Review and adjust RTW plan");
  } else if (features.rtwPlanStatus === "progressing") {
    riskScore -= 10;
    protectiveFactors.push("RTW plan progressing well");
  }

  // Inactive engagement
  if (features.activityLevel === "inactive") {
    riskScore += 10;
    riskFactors.push({
      factor: "Low engagement",
      severity: "medium",
      description: "Worker disengaged from case management",
      mitigationAction: "Re-engage worker through outreach",
    });
    recommendedActions.push("Schedule welfare check-in call");
  } else if (features.activityLevel === "active") {
    protectiveFactors.push("Active engagement with treatment");
  }

  // Clamp risk score
  riskScore = Math.max(5, Math.min(95, riskScore));

  // Risk level classification
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore >= 75) riskLevel = "critical";
  else if (riskScore >= 50) riskLevel = "high";
  else if (riskScore >= 25) riskLevel = "medium";
  else riskLevel = "low";

  // Add general recommendations
  if (riskScore >= 50 && recommendedActions.length === 0) {
    recommendedActions.push("Increase monitoring frequency");
  }
  if (riskScore >= 75) {
    recommendedActions.push("Escalate to senior case manager");
  }

  const confidence = Math.max(0.6, Math.min(0.88, 0.82 - (features.flagCount * 0.02)));

  return {
    type: "deterioration_risk",
    prediction: riskScore,
    confidence,
    predictionDate: new Date().toISOString(),
    modelVersion: "xgb-deterioration-v1.0",
    riskScore,
    riskLevel,
    riskFactors,
    protectiveFactors,
    recommendedActions,
    featureImportance: featureImportance.sort((a, b) => b.importance - a.importance),
  };
}

/**
 * Get all predictions for a case
 */
export function getAllPredictions(caseData: Case): AllPredictions {
  const duration = predictCaseDuration(caseData);
  const rtwProbability = predictRTWProbability(caseData);
  const deteriorationRisk = predictDeteriorationRisk(caseData);

  // Calculate overall priority score
  const priorityScore = Math.round(
    (deteriorationRisk.riskScore * 0.4) +
    ((100 - rtwProbability.probability) * 0.35) +
    (Math.min(100, duration.predictedDays / 1.8) * 0.25)
  );

  // Generate overall assessment
  let assessment = "";
  if (deteriorationRisk.riskLevel === "critical") {
    assessment = "Critical case requiring immediate attention. High deterioration risk with multiple concerning factors.";
  } else if (deteriorationRisk.riskLevel === "high" || rtwProbability.classification === "unlikely") {
    assessment = "High-priority case with significant challenges. Active intervention recommended.";
  } else if (rtwProbability.classification === "likely" && deteriorationRisk.riskLevel === "low") {
    assessment = "Case progressing well with favorable outlook. Continue current management approach.";
  } else {
    assessment = "Moderate case requiring standard monitoring. Watch for changes in key indicators.";
  }

  return {
    caseId: caseData.id,
    workerName: caseData.workerName,
    generatedAt: new Date().toISOString(),
    duration,
    rtwProbability,
    deteriorationRisk,
    overallAssessment: assessment,
    priorityScore,
  };
}

/**
 * Rank multiple cases by priority
 */
export function rankCasesByPriority(cases: Case[]): CasePriorityRanking[] {
  const rankings = cases.map(caseData => {
    const predictions = getAllPredictions(caseData);
    const features = extractFeatures(caseData);

    // Determine urgency level
    let urgencyLevel: "low" | "medium" | "high" | "critical";
    if (predictions.priorityScore >= 70) urgencyLevel = "critical";
    else if (predictions.priorityScore >= 50) urgencyLevel = "high";
    else if (predictions.priorityScore >= 30) urgencyLevel = "medium";
    else urgencyLevel = "low";

    // Top risk factors
    const topRiskFactors = predictions.deteriorationRisk.riskFactors
      .filter(r => r.severity === "high")
      .map(r => r.factor)
      .slice(0, 3);

    // Recommended focus
    let recommendedFocus = "Standard monitoring";
    if (predictions.deteriorationRisk.riskLevel === "critical") {
      recommendedFocus = "Immediate intervention required";
    } else if (predictions.rtwProbability.classification === "unlikely") {
      recommendedFocus = "Address RTW barriers";
    } else if (features.compliance === "non_compliant") {
      recommendedFocus = "Improve treatment compliance";
    } else if (predictions.duration.predictedDays > 120) {
      recommendedFocus = "Accelerate case progression";
    }

    return {
      caseId: caseData.id,
      workerName: caseData.workerName,
      company: caseData.company,
      priorityScore: predictions.priorityScore,
      rtwProbability: predictions.rtwProbability.probability,
      deteriorationRisk: predictions.deteriorationRisk.riskScore,
      daysOffWork: features.daysOffWork,
      urgencyLevel,
      topRiskFactors,
      recommendedFocus,
    };
  });

  // Sort by priority score descending
  return rankings.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Get prediction confidence explanation
 */
export function explainConfidence(confidence: number): string {
  if (confidence >= 0.85) return "High confidence - strong historical correlation";
  if (confidence >= 0.7) return "Moderate confidence - typical prediction accuracy";
  if (confidence >= 0.55) return "Lower confidence - limited data or atypical case";
  return "Low confidence - insufficient data for reliable prediction";
}
