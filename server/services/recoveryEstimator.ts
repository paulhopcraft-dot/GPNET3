import {
  WorkerCase,
  WorkCapacity,
  MedicalCertificate,
} from "../../shared/schema";

// Recovery timeline estimation based on injury patterns and case data

export interface RecoveryEstimate {
  caseId: string;
  workerName: string;
  estimatedAt: string;

  // Current status
  currentCapacity: WorkCapacity;
  daysOffWork: number;
  daysSinceInjury: number;

  // Estimates
  estimatedRecoveryDays: number | null; // null if cannot estimate
  estimatedRecoveryDate: string | null;
  confidenceLevel: "low" | "medium" | "high";

  // Progress indicators
  progressIndicator: "on_track" | "delayed" | "significantly_delayed" | "unknown";
  expectedRecoveryRange: {
    optimistic: number; // days from injury
    realistic: number;
    pessimistic: number;
  } | null;

  // Risk factors affecting recovery
  riskFactors: RecoveryRiskFactor[];

  // Positive factors
  positiveFactors: string[];

  // Benchmark comparison
  injuryCategory: InjuryCategory;
  benchmarkDays: {
    typical: number;
    withComplications: number;
  } | null;

  // Recommendations
  recommendations: string[];
}

export interface RecoveryRiskFactor {
  factor: string;
  impact: "minor" | "moderate" | "major";
  description: string;
  additionalDays: number; // Estimated days added to recovery
}

export type InjuryCategory =
  | "musculoskeletal_minor"      // sprains, strains, minor back pain
  | "musculoskeletal_moderate"   // disc injury, significant muscle/ligament damage
  | "musculoskeletal_severe"     // fractures, surgery required
  | "psychological"              // stress, anxiety, depression, PTSD
  | "mixed_physical_psych"       // physical injury with psych component
  | "surgical"                   // post-operative recovery
  | "chronic"                    // long-term/permanent restrictions
  | "unknown";

// Benchmark recovery days by injury category (based on typical workers comp data)
const INJURY_BENCHMARKS: Record<InjuryCategory, { typical: number; withComplications: number }> = {
  musculoskeletal_minor: { typical: 14, withComplications: 42 },
  musculoskeletal_moderate: { typical: 42, withComplications: 90 },
  musculoskeletal_severe: { typical: 90, withComplications: 180 },
  psychological: { typical: 60, withComplications: 180 },
  mixed_physical_psych: { typical: 90, withComplications: 270 },
  surgical: { typical: 84, withComplications: 180 },
  chronic: { typical: 365, withComplications: 730 },
  unknown: { typical: 60, withComplications: 120 },
};

// Keywords for injury categorization
const PSYCH_KEYWORDS = [
  "ptsd", "post-traumatic", "psychological", "psych", "mental health",
  "anxiety", "depression", "stress", "trauma", "psychiatric", "psychosocial",
];

const SURGERY_KEYWORDS = [
  "surgery", "surgical", "operation", "operative", "post-op", "post-operative",
  "arthroscopy", "fusion", "decompression", "reconstruction", "repair",
];

const SEVERE_MUSCULOSKELETAL_KEYWORDS = [
  "fracture", "broken", "herniated", "disc prolapse", "rupture", "tear",
  "ligament damage", "acl", "mcl", "rotator cuff",
];

const CHRONIC_KEYWORDS = [
  "chronic", "permanent", "degenerative", "long-term", "ongoing", "indefinite",
  "progressive", "irreversible",
];

/**
 * Categorize injury type from case data
 */
function categorizeInjury(workerCase: WorkerCase): InjuryCategory {
  const textToAnalyze = [
    workerCase.summary,
    workerCase.aiSummary,
    workerCase.currentStatus,
    workerCase.aiWorkStatusClassification,
    workerCase.specialistReportSummary?.diagnosisSummary,
    workerCase.specialistReportSummary?.functionalSummary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasPsych = PSYCH_KEYWORDS.some((k) => textToAnalyze.includes(k));
  const hasSurgery = SURGERY_KEYWORDS.some((k) => textToAnalyze.includes(k));
  const hasSevereMusculoskeletal = SEVERE_MUSCULOSKELETAL_KEYWORDS.some((k) =>
    textToAnalyze.includes(k)
  );
  const hasChronic = CHRONIC_KEYWORDS.some((k) => textToAnalyze.includes(k));

  // Check for surgery planned/performed
  if (workerCase.specialistReportSummary?.surgeryLikely || hasSurgery) {
    return "surgical";
  }

  // Check for chronic condition
  if (hasChronic) {
    return "chronic";
  }

  // Check for mixed physical + psych
  if (hasPsych && (hasSevereMusculoskeletal || hasSurgery)) {
    return "mixed_physical_psych";
  }

  // Purely psychological
  if (hasPsych) {
    return "psychological";
  }

  // Severe musculoskeletal
  if (hasSevereMusculoskeletal) {
    return "musculoskeletal_severe";
  }

  // Base on work capacity and risk level
  if (workerCase.riskLevel === "High") {
    return "musculoskeletal_moderate";
  }

  if (workerCase.functionalCapacity?.maxWorkHoursPerDay &&
      workerCase.functionalCapacity.maxWorkHoursPerDay <= 4) {
    return "musculoskeletal_moderate";
  }

  // Default based on work status
  if (workerCase.workStatus === "Off work") {
    return "musculoskeletal_moderate";
  }

  return "musculoskeletal_minor";
}

/**
 * Calculate days since a date
 */
function daysSince(date: Date): number {
  const now = Date.now();
  return Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}

/**
 * Identify risk factors that could delay recovery
 */
function identifyRiskFactors(workerCase: WorkerCase, daysSinceInjury: number): RecoveryRiskFactor[] {
  const factors: RecoveryRiskFactor[] = [];

  // High risk level
  if (workerCase.riskLevel === "High") {
    factors.push({
      factor: "High Risk Case",
      impact: "major",
      description: "Case flagged as high risk, indicating potential complications",
      additionalDays: 30,
    });
  }

  // Non-compliant worker
  if (workerCase.complianceStatus === "non_compliant") {
    factors.push({
      factor: "Non-Compliant Worker",
      impact: "major",
      description: "Worker non-compliance affects treatment adherence and recovery",
      additionalDays: 45,
    });
  } else if (workerCase.complianceStatus === "partially_compliant") {
    factors.push({
      factor: "Partial Compliance",
      impact: "moderate",
      description: "Worker is only partially compliant with treatment plan",
      additionalDays: 21,
    });
  }

  // RTW plan failing
  if (workerCase.rtwPlanStatus === "failing") {
    factors.push({
      factor: "RTW Plan Failing",
      impact: "major",
      description: "Current return-to-work plan is not succeeding",
      additionalDays: 42,
    });
  } else if (workerCase.rtwPlanStatus === "on_hold") {
    factors.push({
      factor: "RTW Plan On Hold",
      impact: "moderate",
      description: "Return-to-work plan is paused, delaying progression",
      additionalDays: 28,
    });
  }

  // Specialist not improving
  if (workerCase.specialistReportSummary?.improving === false) {
    factors.push({
      factor: "Not Improving",
      impact: "major",
      description: "Specialist reports no improvement in condition",
      additionalDays: 60,
    });
  }

  // Surgery likely
  if (workerCase.specialistReportSummary?.surgeryLikely) {
    factors.push({
      factor: "Surgery Required",
      impact: "major",
      description: "Surgical intervention is likely required",
      additionalDays: 90,
    });
  }

  // Long-tail case (already 180+ days)
  if (daysSinceInjury > 180) {
    factors.push({
      factor: "Extended Duration",
      impact: "moderate",
      description: `Case has been open for ${daysSinceInjury} days, indicating complexity`,
      additionalDays: 30,
    });
  }

  // No recent activity
  if (workerCase.ticketLastUpdatedAt) {
    const lastActivity = new Date(workerCase.ticketLastUpdatedAt);
    const inactiveDays = daysSince(lastActivity);
    if (inactiveDays > 30) {
      factors.push({
        factor: "Worker Disengaged",
        impact: "moderate",
        description: `No case activity for ${inactiveDays} days`,
        additionalDays: inactiveDays > 60 ? 45 : 21,
      });
    }
  }

  // Severe restrictions
  if (workerCase.medicalConstraints) {
    const constraints = workerCase.medicalConstraints;
    const severeRestrictions = [
      constraints.noLiftingOverKg !== undefined && constraints.noLiftingOverKg <= 5,
      constraints.noBending && constraints.noTwisting,
      constraints.noDriving && workerCase.summary?.toLowerCase().includes("driver"),
    ].filter(Boolean).length;

    if (severeRestrictions >= 2) {
      factors.push({
        factor: "Severe Restrictions",
        impact: "moderate",
        description: "Multiple significant workplace restrictions in place",
        additionalDays: 28,
      });
    }
  }

  // Psychological component
  const textToCheck = `${workerCase.summary || ""} ${workerCase.aiSummary || ""}`.toLowerCase();
  if (PSYCH_KEYWORDS.some((k) => textToCheck.includes(k))) {
    factors.push({
      factor: "Psychological Component",
      impact: "moderate",
      description: "Case has psychological/mental health elements",
      additionalDays: 42,
    });
  }

  return factors;
}

/**
 * Identify positive factors that support recovery
 */
function identifyPositiveFactors(workerCase: WorkerCase): string[] {
  const factors: string[] = [];

  // Worker at work
  if (workerCase.workStatus === "At work") {
    factors.push("Worker is currently at work (modified duties)");
  }

  // Low risk
  if (workerCase.riskLevel === "Low") {
    factors.push("Case assessed as low risk");
  }

  // Good compliance
  if (workerCase.complianceStatus === "compliant") {
    factors.push("Worker is fully compliant with treatment plan");
  }

  // RTW progressing
  if (workerCase.rtwPlanStatus === "working_well" || workerCase.rtwPlanStatus === "in_progress") {
    factors.push("Return-to-work plan progressing positively");
  }

  // Specialist reports improving
  if (workerCase.specialistReportSummary?.improving === true) {
    factors.push("Specialist confirms condition is improving");
  }

  // Good functional capacity
  if (workerCase.functionalCapacity) {
    const fc = workerCase.functionalCapacity;
    if (fc.maxWorkHoursPerDay && fc.maxWorkHoursPerDay >= 6) {
      factors.push("Worker can manage 6+ hours/day");
    }
    if (fc.maxWorkDaysPerWeek && fc.maxWorkDaysPerWeek >= 4) {
      factors.push("Worker can manage 4+ days/week");
    }
  }

  // Recent certificate shows partial capacity
  if (workerCase.latestCertificate?.capacity === "partial") {
    factors.push("Worker has partial work capacity");
  }

  return factors;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  workerCase: WorkerCase,
  riskFactors: RecoveryRiskFactor[],
  progressIndicator: string
): string[] {
  const recommendations: string[] = [];

  // Address high-impact risk factors
  const majorFactors = riskFactors.filter((f) => f.impact === "major");

  if (majorFactors.some((f) => f.factor === "Non-Compliant Worker")) {
    recommendations.push("Escalate non-compliance to insurer; document all contact attempts");
  }

  if (majorFactors.some((f) => f.factor === "RTW Plan Failing")) {
    recommendations.push("Schedule urgent RTW plan review with GP and employer");
  }

  if (majorFactors.some((f) => f.factor === "Not Improving")) {
    recommendations.push("Request case conference with treating practitioners");
    recommendations.push("Consider independent medical examination (IME)");
  }

  if (majorFactors.some((f) => f.factor === "Surgery Required")) {
    recommendations.push("Confirm surgery date and pre-operative requirements");
    recommendations.push("Plan post-operative RTW pathway");
  }

  // Progress-based recommendations
  if (progressIndicator === "significantly_delayed") {
    recommendations.push("Conduct comprehensive case review");
    recommendations.push("Identify and address barriers to recovery");
  } else if (progressIndicator === "delayed") {
    recommendations.push("Review treatment plan effectiveness");
    recommendations.push("Increase case management contact frequency");
  }

  // Certificate-based recommendations
  if (!workerCase.hasCertificate) {
    recommendations.push("Obtain current medical certificate");
  }

  // Worker engagement
  if (riskFactors.some((f) => f.factor === "Worker Disengaged")) {
    recommendations.push("Attempt multiple contact methods to re-engage worker");
  }

  // Psych component
  if (riskFactors.some((f) => f.factor === "Psychological Component")) {
    recommendations.push("Consider EAP referral for psychological support");
  }

  // If no specific recommendations, provide general guidance
  if (recommendations.length === 0) {
    recommendations.push("Continue current case management approach");
    recommendations.push("Maintain regular worker check-ins");
  }

  return recommendations;
}

/**
 * Calculate days off work from certificate history
 */
function calculateDaysOffWork(
  certificates: MedicalCertificate[]
): number {
  if (!certificates || certificates.length === 0) return 0;

  let totalDays = 0;
  for (const cert of certificates) {
    if (cert.capacity === "fit") continue;

    const start = new Date(cert.startDate);
    const end = new Date(cert.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    totalDays += days;
  }

  return totalDays;
}

/**
 * Main estimation function
 */
export function estimateRecoveryTimeline(
  workerCase: WorkerCase,
  certificates: MedicalCertificate[] = []
): RecoveryEstimate {
  const now = new Date();
  const injuryDate = workerCase.dateOfInjury ? new Date(workerCase.dateOfInjury) : null;
  const daysSinceInjury = injuryDate && !Number.isNaN(injuryDate.getTime())
    ? daysSince(injuryDate)
    : 0;

  // Get current capacity
  const currentCapacity = workerCase.latestCertificate?.capacity ||
    (workerCase.workStatus === "At work" ? "partial" : "unfit");

  // Calculate days off work
  const daysOffWork = calculateDaysOffWork(certificates);

  // Categorize injury
  const injuryCategory = categorizeInjury(workerCase);
  const benchmarkDays = INJURY_BENCHMARKS[injuryCategory];

  // Identify risk and positive factors
  const riskFactors = identifyRiskFactors(workerCase, daysSinceInjury);
  const positiveFactors = identifyPositiveFactors(workerCase);

  // Calculate additional days from risk factors
  const additionalDaysFromRisk = riskFactors.reduce((sum, f) => sum + f.additionalDays, 0);

  // Calculate estimated recovery
  let estimatedRecoveryDays: number | null = null;
  let estimatedRecoveryDate: string | null = null;
  let confidenceLevel: "low" | "medium" | "high" = "low";

  if (injuryCategory !== "unknown" || daysSinceInjury > 0) {
    // Base estimate on benchmark
    let baseEstimate = benchmarkDays.typical;

    // Adjust for complications if risk factors present
    if (riskFactors.length >= 2 || riskFactors.some((f) => f.impact === "major")) {
      baseEstimate = benchmarkDays.withComplications;
    }

    // Add risk factor delays
    estimatedRecoveryDays = baseEstimate + Math.min(additionalDaysFromRisk, 180);

    // Reduce estimate if positive factors present
    if (positiveFactors.length >= 3) {
      estimatedRecoveryDays = Math.round(estimatedRecoveryDays * 0.85);
    } else if (positiveFactors.length >= 2) {
      estimatedRecoveryDays = Math.round(estimatedRecoveryDays * 0.92);
    }

    // Calculate date from injury
    if (injuryDate && !Number.isNaN(injuryDate.getTime())) {
      const remainingDays = Math.max(0, estimatedRecoveryDays - daysSinceInjury);
      estimatedRecoveryDate = addDays(now, remainingDays);
    }

    // Determine confidence level
    if (certificates.length >= 3 && workerCase.specialistReportSummary) {
      confidenceLevel = "high";
    } else if (certificates.length >= 1 || daysSinceInjury > 30) {
      confidenceLevel = "medium";
    }
  }

  // Determine progress indicator
  let progressIndicator: RecoveryEstimate["progressIndicator"] = "unknown";
  if (estimatedRecoveryDays !== null && daysSinceInjury > 0) {
    const expectedProgress = daysSinceInjury / estimatedRecoveryDays;

    if (workerCase.workStatus === "At work" && currentCapacity === "fit") {
      progressIndicator = "on_track";
    } else if (expectedProgress > 1.5) {
      progressIndicator = "significantly_delayed";
    } else if (expectedProgress > 1.0) {
      progressIndicator = "delayed";
    } else {
      progressIndicator = "on_track";
    }
  }

  // Calculate recovery range
  let expectedRecoveryRange: RecoveryEstimate["expectedRecoveryRange"] = null;
  if (estimatedRecoveryDays !== null) {
    expectedRecoveryRange = {
      optimistic: Math.round(estimatedRecoveryDays * 0.7),
      realistic: estimatedRecoveryDays,
      pessimistic: Math.round(estimatedRecoveryDays * 1.5),
    };
  }

  // Generate recommendations
  const recommendations = generateRecommendations(workerCase, riskFactors, progressIndicator);

  return {
    caseId: workerCase.id,
    workerName: workerCase.workerName,
    estimatedAt: now.toISOString(),
    currentCapacity,
    daysOffWork,
    daysSinceInjury,
    estimatedRecoveryDays,
    estimatedRecoveryDate,
    confidenceLevel,
    progressIndicator,
    expectedRecoveryRange,
    riskFactors,
    positiveFactors,
    injuryCategory,
    benchmarkDays,
    recommendations,
  };
}

/**
 * Get a human-readable summary of the recovery estimate
 */
export function getRecoverySummary(estimate: RecoveryEstimate): string {
  const parts: string[] = [];

  // Current status
  parts.push(`**Current Status**: ${estimate.currentCapacity} capacity, ${estimate.daysSinceInjury} days since injury`);

  // Estimate
  if (estimate.estimatedRecoveryDate) {
    parts.push(`**Estimated Full Recovery**: ${estimate.estimatedRecoveryDate} (${estimate.confidenceLevel} confidence)`);
  }

  // Progress
  const progressLabels: Record<string, string> = {
    on_track: "On track",
    delayed: "Delayed",
    significantly_delayed: "Significantly delayed",
    unknown: "Unknown",
  };
  parts.push(`**Progress**: ${progressLabels[estimate.progressIndicator]}`);

  // Key factors
  if (estimate.riskFactors.length > 0) {
    const majorRisks = estimate.riskFactors.filter((f) => f.impact === "major");
    if (majorRisks.length > 0) {
      parts.push(`**Major Risk Factors**: ${majorRisks.map((f) => f.factor).join(", ")}`);
    }
  }

  if (estimate.positiveFactors.length > 0) {
    parts.push(`**Positive Factors**: ${estimate.positiveFactors.slice(0, 3).join("; ")}`);
  }

  return parts.join("\n");
}
