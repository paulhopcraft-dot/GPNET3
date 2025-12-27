import type { RiskLevel, ClinicalEvidenceFlag } from "../../shared/schema";

export interface InjuryContext {
  dateOfInjury: string;
  summary: string;
  riskLevel: RiskLevel;
  clinicalFlags: ClinicalEvidenceFlag[];
}

export interface TimelineFactor {
  factor: string;
  impact: "increases" | "decreases" | "neutral";
  description: string;
}

export type TimelineStatus = "estimated" | "pending_medical_assessment" | "insufficient_data";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface TimelineEstimate {
  status: TimelineStatus;
  estimatedWeeks: number | null;
  estimatedCompletionDate: string | null;
  confidence: ConfidenceLevel;
  factors: TimelineFactor[];
  baselineWeeks?: number;
}

type InjuryType =
  | "fracture_upper_limb"
  | "fracture_lower_limb"
  | "soft_tissue_sprain"
  | "back_strain"
  | "psychological_stress"
  | "unknown";

// Baseline recovery timelines based on injury type (in weeks)
// Sources: WorkSafe Victoria guidelines, medical literature
const INJURY_BASELINES: Record<InjuryType, number> = {
  fracture_upper_limb: 8,
  fracture_lower_limb: 12,
  soft_tissue_sprain: 6,
  back_strain: 10,
  psychological_stress: 12,
  unknown: 12, // Conservative default
};

/**
 * Extract injury type from case summary text
 */
export function extractInjuryType(summary: string): InjuryType {
  if (!summary || typeof summary !== "string") {
    return "unknown";
  }

  const lower = summary.toLowerCase();

  // Check for psychological injuries
  if (
    lower.includes("stress") ||
    lower.includes("anxiety") ||
    lower.includes("depression") ||
    lower.includes("psychological") ||
    lower.includes("mental health")
  ) {
    return "psychological_stress";
  }

  // Check for back injuries
  if (
    (lower.includes("back") || lower.includes("spine") || lower.includes("lumbar")) &&
    (lower.includes("strain") || lower.includes("sprain") || lower.includes("pain"))
  ) {
    return "back_strain";
  }

  // Check for fractures
  if (lower.includes("fracture") || lower.includes("broken") || lower.includes("fractured")) {
    // Determine upper vs lower limb
    if (
      lower.includes("wrist") ||
      lower.includes("arm") ||
      lower.includes("hand") ||
      lower.includes("finger") ||
      lower.includes("elbow") ||
      lower.includes("shoulder") ||
      lower.includes("clavicle")
    ) {
      return "fracture_upper_limb";
    }
    if (
      lower.includes("ankle") ||
      lower.includes("leg") ||
      lower.includes("foot") ||
      lower.includes("toe") ||
      lower.includes("knee") ||
      lower.includes("hip") ||
      lower.includes("femur") ||
      lower.includes("tibia")
    ) {
      return "fracture_lower_limb";
    }
    // Default to upper limb if not specified
    return "fracture_upper_limb";
  }

  // Check for soft tissue injuries (sprains, strains)
  if (
    lower.includes("sprain") ||
    lower.includes("strain") ||
    lower.includes("soft tissue") ||
    lower.includes("ligament") ||
    lower.includes("muscle tear")
  ) {
    return "soft_tissue_sprain";
  }

  return "unknown";
}

/**
 * Calculate dynamic recovery timeline based on injury context
 *
 * PRD Compliance: Advisory only, not medical diagnosis
 */
export function calculateRecoveryTimeline(context: InjuryContext): TimelineEstimate {
  const factors: TimelineFactor[] = [];

  // Handle missing data - return pending status
  if (!context.summary || context.summary.trim() === "") {
    return {
      status: "pending_medical_assessment",
      estimatedWeeks: null,
      estimatedCompletionDate: null,
      confidence: "low",
      factors: [
        {
          factor: "Awaiting medical assessment",
          impact: "neutral",
          description: "Estimate will be available once medical details are received",
        },
      ],
    };
  }

  // Extract injury type and get baseline
  const injuryType = extractInjuryType(context.summary);
  const baselineWeeks = INJURY_BASELINES[injuryType];
  let estimatedWeeks = baselineWeeks;

  // Add baseline factor
  const injuryTypeLabel = injuryType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  factors.push({
    factor: injuryType === "unknown" ? "Unknown injury type" : injuryTypeLabel,
    impact: "neutral",
    description:
      injuryType === "unknown"
        ? "Using conservative 12-week default for unrecognized injury"
        : `Typical recovery time for ${injuryTypeLabel.toLowerCase()}`,
  });

  // Risk level adjustments
  if (context.riskLevel === "Medium") {
    estimatedWeeks += 2;
    factors.push({
      factor: "Medium risk level",
      impact: "increases",
      description: "Medium risk cases typically experience complications, adding 2 weeks",
    });
  } else if (context.riskLevel === "High") {
    estimatedWeeks += 4;
    factors.push({
      factor: "High risk level",
      impact: "increases",
      description: "High risk cases often have extended recovery, adding 4 weeks",
    });
  }

  // Clinical flag adjustments
  const highRiskFlags = context.clinicalFlags.filter((f) => f.severity === "high_risk");
  if (highRiskFlags.length > 0) {
    const weeksAdded = highRiskFlags.length * 2;
    estimatedWeeks += weeksAdded;
    factors.push({
      factor: `${highRiskFlags.length} high-risk clinical flag${highRiskFlags.length > 1 ? "s" : ""}`,
      impact: "increases",
      description: `Clinical concerns identified, adding ${weeksAdded} weeks to timeline`,
    });
  }

  // Apply bounds: minimum 1 week, maximum 52 weeks
  estimatedWeeks = Math.max(1, Math.min(52, estimatedWeeks));

  // Calculate completion date
  const injuryDate = new Date(context.dateOfInjury);
  const completionDate = new Date(injuryDate);
  completionDate.setDate(completionDate.getDate() + estimatedWeeks * 7);

  // Determine confidence level
  let confidence: ConfidenceLevel = "high";
  if (injuryType === "unknown") {
    confidence = "low";
  } else if (context.riskLevel === "High" && highRiskFlags.length > 0) {
    confidence = "low";
  } else if (context.riskLevel === "Medium" || highRiskFlags.length > 0) {
    confidence = "medium";
  }

  return {
    status: "estimated",
    estimatedWeeks,
    estimatedCompletionDate: completionDate.toISOString(),
    confidence,
    factors,
    baselineWeeks,
  };
}
