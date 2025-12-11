import { randomUUID } from "crypto";

// Liability & Decision Engine
// Analyzes case evidence to assess work-relatedness and compensability

export type LiabilityOutcome = "likely_compensable" | "unlikely_compensable" | "unclear_needs_investigation";

export type EvidenceStrength = "strong" | "moderate" | "weak" | "missing";

export interface InjuryDetails {
  description: string;
  mechanism: string;           // How the injury occurred
  bodyPart: string;
  injuryType: string;
  dateOfInjury: string;
  timeOfInjury?: string;
  locationOfInjury?: string;
  witnessesPresent?: boolean;
}

export interface WorkConditions {
  jobTitle: string;
  normalDuties: string[];
  dutyAtTimeOfInjury?: string;
  workEnvironment?: string;
  equipmentInvolved?: string[];
  supervisorPresent?: boolean;
  trainingProvided?: boolean;
  safetyEquipmentUsed?: boolean;
}

export interface DocumentaryEvidence {
  hasIncidentReport: boolean;
  incidentReportTimely?: boolean;  // Within 24 hours
  hasWitnessStatements: boolean;
  witnessStatementCount?: number;
  hasMedicalCertificate: boolean;
  medicalSupportsClaim?: boolean;
  hasPhotographicEvidence?: boolean;
  hasVideoEvidence?: boolean;
  hasPriorIncidents?: boolean;
  priorIncidentCount?: number;
}

export interface WorkerHistory {
  priorClaimsCount: number;
  priorClaimsRelated?: boolean;  // Same body part or injury type
  preExistingCondition?: boolean;
  preExistingConditionDescription?: string;
  employmentDuration: string;    // e.g., "2 years", "6 months"
  performanceIssues?: boolean;
  recentDisciplinary?: boolean;
}

export interface BehaviouralFactors {
  reportedPromptly: boolean;
  cooperativeWithProcess: boolean;
  consistentNarrative: boolean;
  sentimentTrend?: "positive" | "neutral" | "negative";
  engagementLevel?: "high" | "normal" | "low";
}

export interface LiabilityEvidence {
  injury: InjuryDetails;
  workConditions: WorkConditions;
  documentary: DocumentaryEvidence;
  workerHistory: WorkerHistory;
  behavioural: BehaviouralFactors;
}

export interface EvidenceFactor {
  factor: string;
  category: "supporting" | "concerning" | "neutral";
  weight: number;            // -1 to 1
  evidence: string;
  strength: EvidenceStrength;
}

export interface EvidenceGap {
  id: string;
  gapType: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
  requiredAction: string;
}

export interface LiabilityAssessment {
  id: string;
  caseId: string;
  assessedAt: string;
  assessedBy: string;

  // Primary outcome
  outcome: LiabilityOutcome;
  confidenceScore: number;      // 0-100
  outcomeDescription: string;

  // Detailed analysis
  supportingFactors: EvidenceFactor[];
  concerningFactors: EvidenceFactor[];
  neutralFactors: EvidenceFactor[];

  // Evidence summary
  evidenceStrengthSummary: {
    overall: EvidenceStrength;
    injury: EvidenceStrength;
    workRelatedness: EvidenceStrength;
    documentation: EvidenceStrength;
  };

  // Gaps and recommendations
  evidenceGaps: EvidenceGap[];
  investigationNeeded: boolean;
  recommendedActions: string[];

  // Rationale
  rationale: string;
  keyConsiderations: string[];

  // Regulatory context
  applicableRules: string[];
  riskFactors: string[];

  // Audit
  decisionVersion: string;
  evidenceSnapshot: LiabilityEvidence;
}

// Rules-based factors for liability assessment
const LIABILITY_RULES = {
  strongSupport: [
    { condition: "witnessed_incident", weight: 0.8, description: "Incident was witnessed by others" },
    { condition: "timely_report", weight: 0.6, description: "Reported within 24 hours" },
    { condition: "medical_supports", weight: 0.7, description: "Medical evidence supports work-relatedness" },
    { condition: "normal_duties", weight: 0.5, description: "Occurred during normal work duties" },
    { condition: "no_prior_issues", weight: 0.4, description: "No relevant prior claims or conditions" },
  ],
  concerns: [
    { condition: "pre_existing", weight: -0.6, description: "Pre-existing condition in same area" },
    { condition: "delayed_report", weight: -0.4, description: "Significant delay in reporting" },
    { condition: "inconsistent_narrative", weight: -0.5, description: "Inconsistencies in injury account" },
    { condition: "prior_claims", weight: -0.3, description: "History of multiple claims" },
    { condition: "recent_disciplinary", weight: -0.4, description: "Recent disciplinary issues" },
    { condition: "performance_issues", weight: -0.3, description: "Ongoing performance concerns" },
  ],
};

/**
 * Assess evidence strength for a category
 */
function assessEvidenceStrength(score: number): EvidenceStrength {
  if (score >= 0.7) return "strong";
  if (score >= 0.4) return "moderate";
  if (score >= 0.2) return "weak";
  return "missing";
}

/**
 * Analyze injury evidence
 */
function analyzeInjuryEvidence(injury: InjuryDetails): { factors: EvidenceFactor[]; score: number } {
  const factors: EvidenceFactor[] = [];
  let score = 0.5; // Start neutral

  // Clear mechanism
  if (injury.mechanism && injury.mechanism.length > 20) {
    factors.push({
      factor: "Clear injury mechanism",
      category: "supporting",
      weight: 0.3,
      evidence: `Described as: ${injury.mechanism.substring(0, 100)}`,
      strength: "moderate",
    });
    score += 0.15;
  }

  // Location specified
  if (injury.locationOfInjury) {
    factors.push({
      factor: "Specific location identified",
      category: "supporting",
      weight: 0.2,
      evidence: `Occurred at: ${injury.locationOfInjury}`,
      strength: "moderate",
    });
    score += 0.1;
  }

  // Witnesses present
  if (injury.witnessesPresent) {
    factors.push({
      factor: "Witnesses present",
      category: "supporting",
      weight: 0.4,
      evidence: "The incident was witnessed",
      strength: "strong",
    });
    score += 0.2;
  }

  // Time of day (work hours indicator)
  if (injury.timeOfInjury) {
    const hour = parseInt(injury.timeOfInjury.split(":")[0]);
    if (hour >= 7 && hour <= 18) {
      factors.push({
        factor: "Occurred during normal work hours",
        category: "supporting",
        weight: 0.15,
        evidence: `Time: ${injury.timeOfInjury}`,
        strength: "moderate",
      });
      score += 0.1;
    }
  }

  return { factors, score: Math.min(1, score) };
}

/**
 * Analyze work conditions evidence
 */
function analyzeWorkConditions(work: WorkConditions): { factors: EvidenceFactor[]; score: number } {
  const factors: EvidenceFactor[] = [];
  let score = 0.5;

  // Duty at time of injury
  if (work.dutyAtTimeOfInjury && work.normalDuties.some(d =>
    work.dutyAtTimeOfInjury!.toLowerCase().includes(d.toLowerCase())
  )) {
    factors.push({
      factor: "Injury occurred during normal duties",
      category: "supporting",
      weight: 0.4,
      evidence: `Performing: ${work.dutyAtTimeOfInjury}`,
      strength: "strong",
    });
    score += 0.2;
  }

  // Supervisor present
  if (work.supervisorPresent) {
    factors.push({
      factor: "Supervisor present at time of injury",
      category: "supporting",
      weight: 0.25,
      evidence: "Supervisor can verify circumstances",
      strength: "moderate",
    });
    score += 0.1;
  }

  // Training provided
  if (work.trainingProvided === false) {
    factors.push({
      factor: "Adequate training not provided",
      category: "supporting",
      weight: 0.3,
      evidence: "Worker had not received relevant training",
      strength: "moderate",
    });
    score += 0.15;
  }

  // Safety equipment
  if (work.safetyEquipmentUsed === false) {
    factors.push({
      factor: "Safety equipment not used",
      category: "neutral",
      weight: 0,
      evidence: "May indicate contributory negligence or equipment not provided",
      strength: "weak",
    });
  }

  return { factors, score: Math.min(1, score) };
}

/**
 * Analyze documentary evidence
 */
function analyzeDocumentaryEvidence(docs: DocumentaryEvidence): { factors: EvidenceFactor[]; score: number; gaps: EvidenceGap[] } {
  const factors: EvidenceFactor[] = [];
  const gaps: EvidenceGap[] = [];
  let score = 0;

  // Incident report
  if (docs.hasIncidentReport) {
    if (docs.incidentReportTimely) {
      factors.push({
        factor: "Timely incident report submitted",
        category: "supporting",
        weight: 0.4,
        evidence: "Report filed within 24 hours",
        strength: "strong",
      });
      score += 0.25;
    } else {
      factors.push({
        factor: "Incident report submitted (delayed)",
        category: "neutral",
        weight: 0.1,
        evidence: "Report submitted but not within 24 hours",
        strength: "moderate",
      });
      score += 0.1;
    }
  } else {
    gaps.push({
      id: randomUUID(),
      gapType: "missing_incident_report",
      description: "No incident report on file",
      impact: "high",
      recommendation: "Obtain incident report from employer",
      requiredAction: "Request completion of incident report form",
    });
  }

  // Witness statements
  if (docs.hasWitnessStatements) {
    factors.push({
      factor: "Witness statements obtained",
      category: "supporting",
      weight: 0.35,
      evidence: `${docs.witnessStatementCount || 1} witness statement(s) on file`,
      strength: docs.witnessStatementCount && docs.witnessStatementCount > 1 ? "strong" : "moderate",
    });
    score += 0.2;
  } else {
    gaps.push({
      id: randomUUID(),
      gapType: "no_witness_statements",
      description: "No witness statements collected",
      impact: "medium",
      recommendation: "Interview any witnesses to the incident",
      requiredAction: "Obtain written statements from witnesses",
    });
  }

  // Medical certificate
  if (docs.hasMedicalCertificate) {
    if (docs.medicalSupportsClaim) {
      factors.push({
        factor: "Medical evidence supports work-relatedness",
        category: "supporting",
        weight: 0.5,
        evidence: "Treating doctor confirms work-related injury",
        strength: "strong",
      });
      score += 0.3;
    } else {
      factors.push({
        factor: "Medical certificate obtained",
        category: "neutral",
        weight: 0.15,
        evidence: "Certificate on file but does not specifically address causation",
        strength: "moderate",
      });
      score += 0.1;
    }
  } else {
    gaps.push({
      id: randomUUID(),
      gapType: "no_medical_certificate",
      description: "No medical certificate on file",
      impact: "high",
      recommendation: "Obtain medical certificate confirming injury and work-relatedness",
      requiredAction: "Request certificate from treating practitioner",
    });
  }

  // Prior incidents
  if (docs.hasPriorIncidents) {
    factors.push({
      factor: "Prior similar incidents documented",
      category: docs.priorIncidentCount && docs.priorIncidentCount > 2 ? "concerning" : "neutral",
      weight: docs.priorIncidentCount && docs.priorIncidentCount > 2 ? -0.2 : 0,
      evidence: `${docs.priorIncidentCount || "Multiple"} prior incidents on record`,
      strength: "moderate",
    });
    if (docs.priorIncidentCount && docs.priorIncidentCount > 2) {
      score -= 0.1;
    }
  }

  return { factors, score: Math.max(0, Math.min(1, score)), gaps };
}

/**
 * Analyze worker history
 */
function analyzeWorkerHistory(history: WorkerHistory): { factors: EvidenceFactor[]; score: number } {
  const factors: EvidenceFactor[] = [];
  let score = 0.5;

  // Prior claims
  if (history.priorClaimsCount === 0) {
    factors.push({
      factor: "No prior compensation claims",
      category: "supporting",
      weight: 0.25,
      evidence: "Clean claims history",
      strength: "moderate",
    });
    score += 0.1;
  } else if (history.priorClaimsCount > 2) {
    factors.push({
      factor: "Multiple prior claims",
      category: "concerning",
      weight: -0.3,
      evidence: `${history.priorClaimsCount} previous claims on record`,
      strength: "moderate",
    });
    score -= 0.15;

    if (history.priorClaimsRelated) {
      factors.push({
        factor: "Prior claims related to same injury area",
        category: "concerning",
        weight: -0.25,
        evidence: "Pattern of similar injury claims",
        strength: "strong",
      });
      score -= 0.1;
    }
  }

  // Pre-existing condition
  if (history.preExistingCondition) {
    factors.push({
      factor: "Pre-existing condition documented",
      category: "concerning",
      weight: -0.35,
      evidence: history.preExistingConditionDescription || "Pre-existing condition in relevant area",
      strength: "strong",
    });
    score -= 0.2;
  }

  // Employment duration
  const months = parseEmploymentDuration(history.employmentDuration);
  if (months < 3) {
    factors.push({
      factor: "Recent hire",
      category: "neutral",
      weight: 0,
      evidence: `Employment duration: ${history.employmentDuration}`,
      strength: "weak",
    });
  }

  // Disciplinary/performance issues
  if (history.recentDisciplinary) {
    factors.push({
      factor: "Recent disciplinary action",
      category: "concerning",
      weight: -0.2,
      evidence: "Worker has recent disciplinary issues on record",
      strength: "moderate",
    });
    score -= 0.1;
  }

  if (history.performanceIssues) {
    factors.push({
      factor: "Performance concerns documented",
      category: "concerning",
      weight: -0.15,
      evidence: "Ongoing performance issues noted",
      strength: "weak",
    });
    score -= 0.05;
  }

  return { factors, score: Math.max(0, Math.min(1, score)) };
}

/**
 * Parse employment duration to months
 */
function parseEmploymentDuration(duration: string): number {
  const years = duration.match(/(\d+)\s*year/i);
  const months = duration.match(/(\d+)\s*month/i);
  let total = 0;
  if (years) total += parseInt(years[1]) * 12;
  if (months) total += parseInt(months[1]);
  return total || 12; // Default to 1 year if unparseable
}

/**
 * Analyze behavioural factors
 */
function analyzeBehaviouralFactors(behaviour: BehaviouralFactors): { factors: EvidenceFactor[]; score: number } {
  const factors: EvidenceFactor[] = [];
  let score = 0.5;

  if (behaviour.reportedPromptly) {
    factors.push({
      factor: "Injury reported promptly",
      category: "supporting",
      weight: 0.25,
      evidence: "Worker reported injury without undue delay",
      strength: "moderate",
    });
    score += 0.1;
  } else {
    factors.push({
      factor: "Delayed reporting of injury",
      category: "concerning",
      weight: -0.2,
      evidence: "Significant delay between injury and reporting",
      strength: "moderate",
    });
    score -= 0.1;
  }

  if (behaviour.cooperativeWithProcess) {
    factors.push({
      factor: "Cooperative with claims process",
      category: "supporting",
      weight: 0.15,
      evidence: "Worker engaging appropriately with case management",
      strength: "moderate",
    });
    score += 0.05;
  }

  if (!behaviour.consistentNarrative) {
    factors.push({
      factor: "Inconsistent injury narrative",
      category: "concerning",
      weight: -0.35,
      evidence: "Worker's account has changed or contains inconsistencies",
      strength: "strong",
    });
    score -= 0.2;
  }

  if (behaviour.engagementLevel === "low") {
    factors.push({
      factor: "Low engagement with process",
      category: "concerning",
      weight: -0.15,
      evidence: "Worker not actively participating in case management",
      strength: "weak",
    });
    score -= 0.05;
  }

  return { factors, score: Math.max(0, Math.min(1, score)) };
}

/**
 * Determine liability outcome from weighted score
 */
function determineOutcome(score: number): { outcome: LiabilityOutcome; description: string } {
  if (score >= 0.65) {
    return {
      outcome: "likely_compensable",
      description: "Evidence supports that this injury is likely work-related and compensable under workers' compensation legislation.",
    };
  } else if (score <= 0.35) {
    return {
      outcome: "unlikely_compensable",
      description: "Evidence does not adequately support work-relatedness. Further investigation may be required before determining liability.",
    };
  } else {
    return {
      outcome: "unclear_needs_investigation",
      description: "Evidence is mixed or insufficient. Additional investigation and documentation is recommended before making a liability determination.",
    };
  }
}

/**
 * Generate complete liability assessment
 */
export function assessLiability(
  caseId: string,
  evidence: LiabilityEvidence,
  assessedBy: string = "system"
): LiabilityAssessment {
  // Analyze each evidence category
  const injuryAnalysis = analyzeInjuryEvidence(evidence.injury);
  const workAnalysis = analyzeWorkConditions(evidence.workConditions);
  const docAnalysis = analyzeDocumentaryEvidence(evidence.documentary);
  const historyAnalysis = analyzeWorkerHistory(evidence.workerHistory);
  const behaviourAnalysis = analyzeBehaviouralFactors(evidence.behavioural);

  // Combine all factors
  const allFactors = [
    ...injuryAnalysis.factors,
    ...workAnalysis.factors,
    ...docAnalysis.factors,
    ...historyAnalysis.factors,
    ...behaviourAnalysis.factors,
  ];

  const supportingFactors = allFactors.filter(f => f.category === "supporting");
  const concerningFactors = allFactors.filter(f => f.category === "concerning");
  const neutralFactors = allFactors.filter(f => f.category === "neutral");

  // Calculate weighted score
  const scores = [
    { score: injuryAnalysis.score, weight: 0.2 },
    { score: workAnalysis.score, weight: 0.2 },
    { score: docAnalysis.score, weight: 0.25 },
    { score: historyAnalysis.score, weight: 0.2 },
    { score: behaviourAnalysis.score, weight: 0.15 },
  ];
  const weightedScore = scores.reduce((sum, s) => sum + s.score * s.weight, 0);

  // Determine outcome
  const { outcome, description } = determineOutcome(weightedScore);

  // Generate rationale
  const rationale = generateRationale(outcome, supportingFactors, concerningFactors, docAnalysis.gaps);

  // Key considerations
  const keyConsiderations: string[] = [];
  if (supportingFactors.length > 0) {
    keyConsiderations.push(`${supportingFactors.length} factors support work-relatedness`);
  }
  if (concerningFactors.length > 0) {
    keyConsiderations.push(`${concerningFactors.length} factors raise concerns`);
  }
  if (docAnalysis.gaps.length > 0) {
    keyConsiderations.push(`${docAnalysis.gaps.length} evidence gap(s) identified`);
  }

  // Recommended actions
  const recommendedActions: string[] = [];
  for (const gap of docAnalysis.gaps.slice(0, 3)) {
    recommendedActions.push(gap.requiredAction);
  }
  if (outcome === "unclear_needs_investigation") {
    recommendedActions.push("Conduct thorough investigation before liability determination");
  }

  return {
    id: randomUUID(),
    caseId,
    assessedAt: new Date().toISOString(),
    assessedBy,

    outcome,
    confidenceScore: Math.round(
      outcome === "unclear_needs_investigation" ? 50 : Math.abs(weightedScore - 0.5) * 200
    ),
    outcomeDescription: description,

    supportingFactors,
    concerningFactors,
    neutralFactors,

    evidenceStrengthSummary: {
      overall: assessEvidenceStrength(weightedScore),
      injury: assessEvidenceStrength(injuryAnalysis.score),
      workRelatedness: assessEvidenceStrength(workAnalysis.score),
      documentation: assessEvidenceStrength(docAnalysis.score),
    },

    evidenceGaps: docAnalysis.gaps,
    investigationNeeded: docAnalysis.gaps.filter(g => g.impact === "high").length > 0 || outcome === "unclear_needs_investigation",
    recommendedActions,

    rationale,
    keyConsiderations,

    applicableRules: [
      "WorkCover legislation - work-relatedness requirement",
      "Duty to investigate claims thoroughly",
      "Standard of proof: balance of probabilities",
    ],
    riskFactors: concerningFactors.map(f => f.factor),

    decisionVersion: "1.0.0",
    evidenceSnapshot: evidence,
  };
}

/**
 * Generate rationale text
 */
function generateRationale(
  outcome: LiabilityOutcome,
  supporting: EvidenceFactor[],
  concerning: EvidenceFactor[],
  gaps: EvidenceGap[]
): string {
  const parts: string[] = [];

  if (outcome === "likely_compensable") {
    parts.push("Based on the evidence reviewed, this claim appears to meet the threshold for work-relatedness.");
    if (supporting.length > 0) {
      const topSupporting = supporting.slice(0, 2).map(f => f.factor.toLowerCase()).join(" and ");
      parts.push(`Key supporting factors include ${topSupporting}.`);
    }
  } else if (outcome === "unlikely_compensable") {
    parts.push("The available evidence does not adequately establish work-relatedness.");
    if (concerning.length > 0) {
      const topConcerns = concerning.slice(0, 2).map(f => f.factor.toLowerCase()).join(" and ");
      parts.push(`Concerns include ${topConcerns}.`);
    }
  } else {
    parts.push("The evidence is currently insufficient to make a definitive liability determination.");
    if (gaps.length > 0) {
      parts.push(`Critical gaps include: ${gaps.slice(0, 2).map(g => g.description.toLowerCase()).join("; ")}.`);
    }
  }

  if (gaps.length > 0 && outcome !== "unlikely_compensable") {
    parts.push("Additional investigation is recommended to strengthen the evidence base.");
  }

  return parts.join(" ");
}

/**
 * Create sample evidence for testing
 */
export function createSampleEvidence(caseId: string): LiabilityEvidence {
  return {
    injury: {
      description: "Lower back pain after lifting heavy boxes",
      mechanism: "Worker was lifting boxes weighing approximately 25kg from floor to shelf height when they felt sudden pain in lower back",
      bodyPart: "Lower back",
      injuryType: "Musculoskeletal strain",
      dateOfInjury: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      timeOfInjury: "10:30",
      locationOfInjury: "Warehouse - Section B",
      witnessesPresent: true,
    },
    workConditions: {
      jobTitle: "Warehouse Worker",
      normalDuties: ["Picking and packing", "Loading trucks", "Moving stock", "Inventory management"],
      dutyAtTimeOfInjury: "Moving stock between locations",
      workEnvironment: "Indoor warehouse",
      equipmentInvolved: ["Pallet jack", "Hand trolley"],
      supervisorPresent: false,
      trainingProvided: true,
      safetyEquipmentUsed: true,
    },
    documentary: {
      hasIncidentReport: true,
      incidentReportTimely: true,
      hasWitnessStatements: true,
      witnessStatementCount: 1,
      hasMedicalCertificate: true,
      medicalSupportsClaim: true,
      hasPhotographicEvidence: false,
      hasPriorIncidents: false,
    },
    workerHistory: {
      priorClaimsCount: 0,
      employmentDuration: "2 years",
      performanceIssues: false,
      recentDisciplinary: false,
    },
    behavioural: {
      reportedPromptly: true,
      cooperativeWithProcess: true,
      consistentNarrative: true,
      sentimentTrend: "neutral",
      engagementLevel: "normal",
    },
  };
}

/**
 * Quick liability check (simplified)
 */
export function quickLiabilityCheck(
  hasIncidentReport: boolean,
  hasWitness: boolean,
  hasMedicalSupport: boolean,
  priorClaims: number,
  preExisting: boolean
): { likely: boolean; confidence: number; summary: string } {
  let score = 0.5;

  if (hasIncidentReport) score += 0.15;
  if (hasWitness) score += 0.2;
  if (hasMedicalSupport) score += 0.2;
  if (priorClaims > 2) score -= 0.15;
  if (preExisting) score -= 0.2;

  return {
    likely: score >= 0.5,
    confidence: Math.round(Math.abs(score - 0.5) * 200),
    summary: score >= 0.65
      ? "Evidence supports likely compensable claim"
      : score <= 0.35
      ? "Evidence suggests claim may not be compensable"
      : "Further investigation recommended",
  };
}
