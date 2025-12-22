/**
 * Recovery Estimator Service (PRD-25, Spec-14)
 *
 * Estimates recovery timelines and tracks progress against expected milestones.
 * Based on clinical pathways and historical patterns.
 *
 * Per Spec-25: Case duration forecasting, RTW probability assessment
 * Per Spec-14: Timeline aggregation with key transitions highlighted
 */

import type {
  WorkerCase,
  MedicalCertificate,
  WorkCapacity,
  RTWPlanStatus,
} from "../../shared/schema";

// =====================================================
// Recovery Estimation Types
// =====================================================

export type InjuryCategory =
  | "soft_tissue"
  | "musculoskeletal"
  | "spinal"
  | "surgical"
  | "psychological"
  | "chronic"
  | "unknown";

export type ProgressStatus =
  | "ahead_of_schedule"
  | "on_track"
  | "slight_delay"
  | "behind_schedule"
  | "stalled"
  | "deteriorating"
  | "unknown";

export interface RecoveryMilestone {
  weekNumber: number;
  expectedCapacity: WorkCapacity;
  description: string;
  achieved: boolean;
  achievedDate?: string;
}

export interface RecoveryTrajectoryPoint {
  date: string;
  weekNumber: number;
  expectedCapacityScore: number; // 0-100 (0=unfit, 50=partial, 100=fit)
  actualCapacityScore: number | null;
  expectedHoursPercentage: number; // 0-100
  actualHoursPercentage: number | null;
}

export interface RecoveryEstimate {
  caseId: string;
  workerName: string;
  estimatedAt: string;

  // Injury classification
  injuryCategory: InjuryCategory;
  injuryDate: string;
  daysSinceInjury: number;

  // Expected timeline
  expectedDurationWeeks: number;
  expectedRtwDate: string;
  confidenceScore: number;

  // Current progress
  currentCapacity: WorkCapacity;
  progressStatus: ProgressStatus;
  progressPercentage: number;
  daysAheadOrBehind: number;

  // Milestones
  milestones: RecoveryMilestone[];
  nextMilestone: RecoveryMilestone | null;

  // Trajectory data for charting
  trajectory: RecoveryTrajectoryPoint[];

  // Risk indicators
  riskFactors: string[];
  positiveFactors: string[];

  // Advisory flag per PRD-9
  advisory: boolean;
}

export interface RecoveryEstimateInput {
  caseId: string;
  workerName: string;
  dateOfInjury: string;
  injuryDescription?: string;
  currentCapacity?: WorkCapacity;
  rtwPlanStatus?: RTWPlanStatus;
  certificates?: MedicalCertificate[];
  medicalConstraintsCount?: number;
  hasSpecialistInvolvement?: boolean;
  hasSurgery?: boolean;
}

// =====================================================
// Clinical Pathway Definitions
// =====================================================

const CLINICAL_PATHWAYS: Record<InjuryCategory, {
  typicalDurationWeeks: number;
  rangeMin: number;
  rangeMax: number;
  description: string;
  milestonePattern: Array<{ week: number; capacity: WorkCapacity; description: string }>;
}> = {
  soft_tissue: {
    typicalDurationWeeks: 6,
    rangeMin: 4,
    rangeMax: 12,
    description: "Soft tissue injuries (sprains, strains, contusions)",
    milestonePattern: [
      { week: 1, capacity: "unfit", description: "Acute phase - rest and initial treatment" },
      { week: 2, capacity: "partial", description: "Begin modified duties if appropriate" },
      { week: 4, capacity: "partial", description: "Progressive return with increasing hours" },
      { week: 6, capacity: "fit", description: "Expected full return to work" },
    ],
  },
  musculoskeletal: {
    typicalDurationWeeks: 10,
    rangeMin: 6,
    rangeMax: 16,
    description: "Musculoskeletal conditions (back pain, joint issues)",
    milestonePattern: [
      { week: 1, capacity: "unfit", description: "Initial assessment and treatment" },
      { week: 3, capacity: "partial", description: "Graduated return with restrictions" },
      { week: 6, capacity: "partial", description: "Progressive increase in duties" },
      { week: 10, capacity: "fit", description: "Expected full return to work" },
    ],
  },
  spinal: {
    typicalDurationWeeks: 16,
    rangeMin: 10,
    rangeMax: 26,
    description: "Spinal injuries (disc, vertebral issues)",
    milestonePattern: [
      { week: 2, capacity: "unfit", description: "Initial treatment and stabilization" },
      { week: 6, capacity: "partial", description: "Light duties only with significant restrictions" },
      { week: 10, capacity: "partial", description: "Gradual increase in capacity" },
      { week: 16, capacity: "fit", description: "Expected return with possible ongoing management" },
    ],
  },
  surgical: {
    typicalDurationWeeks: 14,
    rangeMin: 8,
    rangeMax: 24,
    description: "Post-surgical recovery",
    milestonePattern: [
      { week: 2, capacity: "unfit", description: "Post-operative recovery" },
      { week: 4, capacity: "unfit", description: "Wound healing and rehabilitation begins" },
      { week: 8, capacity: "partial", description: "Light duties with restrictions" },
      { week: 14, capacity: "fit", description: "Expected full recovery" },
    ],
  },
  psychological: {
    typicalDurationWeeks: 12,
    rangeMin: 6,
    rangeMax: 52,
    description: "Psychological injuries (stress, anxiety, trauma)",
    milestonePattern: [
      { week: 2, capacity: "unfit", description: "Initial assessment and treatment plan" },
      { week: 4, capacity: "partial", description: "Gradual reintroduction with support" },
      { week: 8, capacity: "partial", description: "Increasing responsibilities" },
      { week: 12, capacity: "fit", description: "Expected return with ongoing support available" },
    ],
  },
  chronic: {
    typicalDurationWeeks: 26,
    rangeMin: 12,
    rangeMax: 52,
    description: "Chronic conditions requiring long-term management",
    milestonePattern: [
      { week: 4, capacity: "partial", description: "Stabilization and accommodation planning" },
      { week: 12, capacity: "partial", description: "Adjusted role if needed" },
      { week: 20, capacity: "partial", description: "Sustainable work pattern established" },
      { week: 26, capacity: "fit", description: "Long-term sustainable return" },
    ],
  },
  unknown: {
    typicalDurationWeeks: 8,
    rangeMin: 4,
    rangeMax: 16,
    description: "General injury with unspecified details",
    milestonePattern: [
      { week: 2, capacity: "unfit", description: "Initial treatment phase" },
      { week: 4, capacity: "partial", description: "Graduated return begins" },
      { week: 6, capacity: "partial", description: "Progressive increase" },
      { week: 8, capacity: "fit", description: "Expected full return" },
    ],
  },
};

// =====================================================
// Recovery Estimator Service
// =====================================================

class RecoveryEstimatorService {
  /**
   * Estimate recovery timeline for a case
   */
  estimateRecovery(input: RecoveryEstimateInput): RecoveryEstimate {
    const {
      caseId,
      workerName,
      dateOfInjury,
      injuryDescription,
      currentCapacity = "unknown",
      rtwPlanStatus,
      certificates = [],
      medicalConstraintsCount = 0,
      hasSpecialistInvolvement = false,
      hasSurgery = false,
    } = input;

    // Calculate days since injury
    const injuryDate = new Date(dateOfInjury);
    const now = new Date();
    const daysSinceInjury = Math.floor((now.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));

    // Classify injury type
    const injuryCategory = this.classifyInjury(injuryDescription, hasSurgery);

    // Get clinical pathway
    const pathway = CLINICAL_PATHWAYS[injuryCategory];

    // Calculate expected duration with adjustments
    const { expectedDurationWeeks, confidenceScore } = this.calculateExpectedDuration(
      pathway,
      medicalConstraintsCount,
      hasSpecialistInvolvement,
      certificates
    );

    // Calculate expected RTW date
    const expectedRtwDate = new Date(injuryDate);
    expectedRtwDate.setDate(expectedRtwDate.getDate() + expectedDurationWeeks * 7);

    // Generate milestones
    const milestones = this.generateMilestones(
      pathway,
      expectedDurationWeeks,
      injuryDate,
      certificates
    );

    // Calculate progress
    const { progressStatus, progressPercentage, daysAheadOrBehind } = this.calculateProgress(
      daysSinceInjury,
      expectedDurationWeeks,
      currentCapacity,
      rtwPlanStatus,
      certificates
    );

    // Generate trajectory
    const trajectory = this.generateTrajectory(
      injuryDate,
      expectedDurationWeeks,
      certificates
    );

    // Identify risk and positive factors
    const riskFactors = this.identifyRiskFactors(input, progressStatus, daysSinceInjury, expectedDurationWeeks);
    const positiveFactors = this.identifyPositiveFactors(input, progressStatus, certificates);

    // Find next milestone
    const nextMilestone = milestones.find(m => !m.achieved) ?? null;

    return {
      caseId,
      workerName,
      estimatedAt: new Date().toISOString(),

      injuryCategory,
      injuryDate: dateOfInjury,
      daysSinceInjury,

      expectedDurationWeeks,
      expectedRtwDate: expectedRtwDate.toISOString().split("T")[0],
      confidenceScore,

      currentCapacity,
      progressStatus,
      progressPercentage,
      daysAheadOrBehind,

      milestones,
      nextMilestone,

      trajectory,

      riskFactors,
      positiveFactors,

      advisory: true, // Per PRD-9
    };
  }

  /**
   * Estimate recovery from a full WorkerCase object
   */
  estimateFromCase(workerCase: WorkerCase, certificates: MedicalCertificate[] = []): RecoveryEstimate {
    const input: RecoveryEstimateInput = {
      caseId: workerCase.id,
      workerName: workerCase.workerName,
      dateOfInjury: workerCase.dateOfInjury,
      injuryDescription: workerCase.summary,
      currentCapacity: workerCase.latestCertificate?.capacity ?? "unknown",
      rtwPlanStatus: workerCase.rtwPlanStatus,
      certificates,
      medicalConstraintsCount: workerCase.medicalConstraints
        ? Object.keys(workerCase.medicalConstraints).filter(k =>
            (workerCase.medicalConstraints as Record<string, unknown>)[k] === true ||
            typeof (workerCase.medicalConstraints as Record<string, unknown>)[k] === "number"
          ).length
        : 0,
      hasSpecialistInvolvement: workerCase.specialistStatus !== "none" && workerCase.specialistStatus !== undefined,
      hasSurgery: workerCase.specialistReportSummary?.surgeryLikely === true ||
                  (workerCase.specialistReportSummary?.surgeryPlannedDate !== null &&
                   workerCase.specialistReportSummary?.surgeryPlannedDate !== undefined),
    };

    return this.estimateRecovery(input);
  }

  /**
   * Classify injury type from description
   */
  private classifyInjury(description?: string, hasSurgery?: boolean): InjuryCategory {
    if (hasSurgery) {
      return "surgical";
    }

    if (!description) {
      return "unknown";
    }

    const desc = description.toLowerCase();

    // Check for psychological indicators
    if (/stress|anxiety|depression|trauma|ptsd|mental|psychological/i.test(desc)) {
      return "psychological";
    }

    // Check for spinal indicators
    if (/spine|spinal|disc|vertebr|lumbar|cervical|thoracic/i.test(desc)) {
      return "spinal";
    }

    // Check for chronic indicators
    if (/chronic|ongoing|long.?term|degenerative|arthritis|fibromyalgia/i.test(desc)) {
      return "chronic";
    }

    // Check for musculoskeletal
    if (/back|shoulder|knee|hip|joint|tendon|ligament|muscle|fracture/i.test(desc)) {
      return "musculoskeletal";
    }

    // Check for soft tissue
    if (/sprain|strain|contusion|bruise|tear|laceration/i.test(desc)) {
      return "soft_tissue";
    }

    return "unknown";
  }

  /**
   * Calculate expected duration with adjustments
   */
  private calculateExpectedDuration(
    pathway: typeof CLINICAL_PATHWAYS[InjuryCategory],
    constraintsCount: number,
    hasSpecialist: boolean,
    certificates: MedicalCertificate[]
  ): { expectedDurationWeeks: number; confidenceScore: number } {
    let duration = pathway.typicalDurationWeeks;
    let confidence = 0.7; // Base confidence

    // Adjust for constraints
    if (constraintsCount > 3) {
      duration += 2;
      confidence -= 0.05;
    }

    // Adjust for specialist involvement
    if (hasSpecialist) {
      duration += 2;
      confidence += 0.05; // Better data with specialist
    }

    // Adjust based on certificate history
    if (certificates.length > 0) {
      confidence += 0.1;

      // Check for deterioration pattern
      const capacityTrend = this.analyzeCapacityTrend(certificates);
      if (capacityTrend === "deteriorating") {
        duration += 4;
        confidence -= 0.1;
      } else if (capacityTrend === "improving") {
        confidence += 0.05;
      }
    }

    // Keep within pathway range
    duration = Math.max(pathway.rangeMin, Math.min(pathway.rangeMax, duration));
    confidence = Math.max(0.3, Math.min(0.95, confidence));

    return {
      expectedDurationWeeks: Math.round(duration),
      confidenceScore: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Analyze capacity trend from certificates
   */
  private analyzeCapacityTrend(certificates: MedicalCertificate[]): "improving" | "stable" | "deteriorating" {
    if (certificates.length < 2) {
      return "stable";
    }

    const sorted = [...certificates].sort(
      (a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
    );

    const capacityScore = (cap: WorkCapacity): number => {
      switch (cap) {
        case "fit": return 3;
        case "partial": return 2;
        case "unfit": return 1;
        default: return 0;
      }
    };

    const recentCerts = sorted.slice(-3);
    const scores = recentCerts.map(c => capacityScore(c.capacity));

    if (scores.length >= 2) {
      const trend = scores[scores.length - 1] - scores[0];
      if (trend > 0) return "improving";
      if (trend < 0) return "deteriorating";
    }

    return "stable";
  }

  /**
   * Generate recovery milestones
   */
  private generateMilestones(
    pathway: typeof CLINICAL_PATHWAYS[InjuryCategory],
    expectedWeeks: number,
    injuryDate: Date,
    certificates: MedicalCertificate[]
  ): RecoveryMilestone[] {
    const scaleFactor = expectedWeeks / pathway.typicalDurationWeeks;

    return pathway.milestonePattern.map(m => {
      const adjustedWeek = Math.round(m.week * scaleFactor);
      const milestoneDate = new Date(injuryDate);
      milestoneDate.setDate(milestoneDate.getDate() + adjustedWeek * 7);

      // Check if milestone achieved based on certificates
      const achieved = this.checkMilestoneAchieved(milestoneDate, m.capacity, certificates);

      return {
        weekNumber: adjustedWeek,
        expectedCapacity: m.capacity,
        description: m.description,
        achieved: achieved.achieved,
        achievedDate: achieved.date,
      };
    });
  }

  /**
   * Check if a milestone has been achieved
   */
  private checkMilestoneAchieved(
    milestoneDate: Date,
    expectedCapacity: WorkCapacity,
    certificates: MedicalCertificate[]
  ): { achieved: boolean; date?: string } {
    const now = new Date();

    if (milestoneDate > now) {
      return { achieved: false };
    }

    const capacityScore = (cap: WorkCapacity): number => {
      switch (cap) {
        case "fit": return 3;
        case "partial": return 2;
        case "unfit": return 1;
        default: return 0;
      }
    };

    const expectedScore = capacityScore(expectedCapacity);

    // Find certificate at or before milestone date with adequate capacity
    const relevantCerts = certificates
      .filter(c => new Date(c.issueDate) <= milestoneDate)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

    if (relevantCerts.length > 0) {
      const latestCert = relevantCerts[0];
      if (capacityScore(latestCert.capacity) >= expectedScore) {
        return { achieved: true, date: latestCert.issueDate };
      }
    }

    return { achieved: false };
  }

  /**
   * Calculate current progress
   */
  private calculateProgress(
    daysSinceInjury: number,
    expectedWeeks: number,
    currentCapacity: WorkCapacity,
    rtwStatus?: RTWPlanStatus,
    certificates?: MedicalCertificate[]
  ): { progressStatus: ProgressStatus; progressPercentage: number; daysAheadOrBehind: number } {
    const expectedDays = expectedWeeks * 7;
    const progressPercentage = Math.min(100, Math.round((daysSinceInjury / expectedDays) * 100));

    // Calculate expected capacity at this point
    const expectedProgressScore = Math.min(100, (daysSinceInjury / expectedDays) * 100);
    const actualCapacityScore = this.capacityToScore(currentCapacity);

    // Calculate days ahead or behind
    let daysAheadOrBehind = 0;
    const expectedCapacityAtThisPoint = expectedProgressScore;
    const capacityDifference = actualCapacityScore - expectedCapacityAtThisPoint;
    daysAheadOrBehind = Math.round((capacityDifference / 100) * expectedDays);

    // Determine status
    let progressStatus: ProgressStatus;

    if (rtwStatus === "completed" || rtwStatus === "working_well") {
      progressStatus = "ahead_of_schedule";
    } else if (rtwStatus === "failing") {
      progressStatus = "deteriorating";
    } else if (currentCapacity === "fit") {
      progressStatus = "ahead_of_schedule";
    } else if (capacityDifference >= 15) {
      progressStatus = "ahead_of_schedule";
    } else if (capacityDifference >= -10) {
      progressStatus = "on_track";
    } else if (capacityDifference >= -25) {
      progressStatus = "slight_delay";
    } else if (this.isStalled(certificates)) {
      progressStatus = "stalled";
    } else if (capacityDifference < -40) {
      progressStatus = "behind_schedule";
    } else {
      progressStatus = "slight_delay";
    }

    return { progressStatus, progressPercentage, daysAheadOrBehind };
  }

  /**
   * Convert capacity to score (0-100)
   */
  private capacityToScore(capacity: WorkCapacity): number {
    switch (capacity) {
      case "fit": return 100;
      case "partial": return 50;
      case "unfit": return 0;
      default: return 25;
    }
  }

  /**
   * Check if recovery is stalled
   */
  private isStalled(certificates?: MedicalCertificate[]): boolean {
    if (!certificates || certificates.length < 3) {
      return false;
    }

    const sorted = [...certificates]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 3);

    // Check if last 3 certificates have same capacity
    return sorted.every(c => c.capacity === sorted[0].capacity);
  }

  /**
   * Generate trajectory data for charting
   */
  private generateTrajectory(
    injuryDate: Date,
    expectedWeeks: number,
    certificates: MedicalCertificate[]
  ): RecoveryTrajectoryPoint[] {
    const trajectory: RecoveryTrajectoryPoint[] = [];
    const now = new Date();

    // Generate weekly points
    for (let week = 0; week <= expectedWeeks + 2; week++) {
      const pointDate = new Date(injuryDate);
      pointDate.setDate(pointDate.getDate() + week * 7);

      // Expected capacity follows a curve
      const progressRatio = week / expectedWeeks;
      const expectedCapacityScore = Math.min(100, progressRatio * 100);
      const expectedHoursPercentage = Math.min(100, progressRatio * 100);

      // Find actual data if available
      let actualCapacityScore: number | null = null;
      let actualHoursPercentage: number | null = null;

      if (pointDate <= now && certificates.length > 0) {
        const relevantCert = certificates
          .filter(c => {
            const certDate = new Date(c.issueDate);
            const certEnd = new Date(c.endDate);
            return certDate <= pointDate && certEnd >= pointDate;
          })
          .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];

        if (relevantCert) {
          actualCapacityScore = this.capacityToScore(relevantCert.capacity);
          // Estimate hours based on capacity
          actualHoursPercentage = actualCapacityScore;
        }
      }

      trajectory.push({
        date: pointDate.toISOString().split("T")[0],
        weekNumber: week,
        expectedCapacityScore,
        actualCapacityScore,
        expectedHoursPercentage,
        actualHoursPercentage,
      });
    }

    return trajectory;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    input: RecoveryEstimateInput,
    progressStatus: ProgressStatus,
    daysSinceInjury: number,
    expectedWeeks: number
  ): string[] {
    const risks: string[] = [];

    if (progressStatus === "behind_schedule") {
      risks.push("Recovery behind expected timeline");
    }

    if (progressStatus === "stalled") {
      risks.push("No improvement in recent certificates");
    }

    if (progressStatus === "deteriorating") {
      risks.push("Condition appears to be worsening");
    }

    if (daysSinceInjury > expectedWeeks * 7 * 1.5) {
      risks.push("Significantly past expected recovery date");
    }

    if (input.medicalConstraintsCount && input.medicalConstraintsCount > 4) {
      risks.push("Multiple medical restrictions in place");
    }

    if (input.hasSpecialistInvolvement && !input.hasSurgery) {
      risks.push("Specialist involvement may indicate complexity");
    }

    if (input.certificates && input.certificates.length === 0 && daysSinceInjury > 14) {
      risks.push("No medical certificates on file");
    }

    return risks;
  }

  /**
   * Identify positive factors
   */
  private identifyPositiveFactors(
    input: RecoveryEstimateInput,
    progressStatus: ProgressStatus,
    certificates: MedicalCertificate[]
  ): string[] {
    const positives: string[] = [];

    if (progressStatus === "ahead_of_schedule") {
      positives.push("Recovery progressing faster than expected");
    }

    if (progressStatus === "on_track") {
      positives.push("Recovery on track with expected timeline");
    }

    if (input.rtwPlanStatus === "in_progress") {
      positives.push("Active return to work plan in place");
    }

    if (input.rtwPlanStatus === "working_well") {
      positives.push("Successfully working with current plan");
    }

    if (certificates.length > 0) {
      const trend = this.analyzeCapacityTrend(certificates);
      if (trend === "improving") {
        positives.push("Improving capacity trend in recent certificates");
      }
    }

    if (input.currentCapacity === "partial" && input.rtwPlanStatus !== "failing") {
      positives.push("Worker able to perform partial duties");
    }

    return positives;
  }

  /**
   * Compare two cases and predict relative recovery
   */
  compareCases(case1: RecoveryEstimate, case2: RecoveryEstimate): {
    fasterRecovery: string;
    differenceWeeks: number;
    factors: string[];
  } {
    const diff = case1.expectedDurationWeeks - case2.expectedDurationWeeks;
    const fasterRecovery = diff > 0 ? case2.caseId : case1.caseId;

    const factors: string[] = [];
    if (case1.injuryCategory !== case2.injuryCategory) {
      factors.push(`Different injury types: ${case1.injuryCategory} vs ${case2.injuryCategory}`);
    }

    if (Math.abs(case1.confidenceScore - case2.confidenceScore) > 0.15) {
      factors.push("Significant difference in estimation confidence");
    }

    return {
      fasterRecovery,
      differenceWeeks: Math.abs(diff),
      factors,
    };
  }
}

// Export singleton instance
export const recoveryEstimatorService = new RecoveryEstimatorService();
