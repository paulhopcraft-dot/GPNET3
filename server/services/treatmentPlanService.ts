/**
 * Treatment Plan Generator Service (PRD-3.2.3, Spec-21)
 *
 * Generates evidence-based RTW treatment plans tailored to each worker's
 * medical restrictions, job requirements, and recovery trajectory.
 *
 * Per Spec-21: Creates structured plans with phased hours progressions,
 * modified duties, and review cycles aligned with certificate validity.
 */

import type {
  WorkerCase,
  MedicalConstraints,
  FunctionalCapacity,
  WorkCapacity,
  RTWPlanStatus,
} from "../../shared/schema";

// =====================================================
// Treatment Plan Types
// =====================================================

export type PhaseType = "initial" | "progression" | "consolidation" | "full_duties";

export interface HoursProgression {
  phase: PhaseType;
  weekNumber: number;
  hoursPerDay: number;
  daysPerWeek: number;
  totalWeeklyHours: number;
  description: string;
}

export interface DutyModification {
  category: "physical" | "mental" | "environmental" | "schedule";
  restriction: string;
  modification: string;
  rationale: string;
  reviewDate?: string;
}

export interface ReviewMilestone {
  weekNumber: number;
  date: string;
  type: "medical_review" | "rtw_review" | "certificate_renewal" | "progress_check";
  description: string;
  expectedOutcome: string;
}

export interface WarningSignal {
  signal: string;
  severity: "low" | "medium" | "high";
  action: string;
  monitoringFrequency: "daily" | "weekly" | "per_shift";
}

export interface TreatmentPlan {
  id: string;
  caseId: string;
  workerName: string;
  generatedAt: string;

  // Plan summary
  planType: "graduated_rtw" | "modified_duties" | "full_capacity" | "unfit_for_work";
  planSummary: string;
  expectedDurationWeeks: number;
  confidenceScore: number;

  // Hours progression
  hoursProgression: HoursProgression[];
  currentPhase: PhaseType;
  currentWeeklyHours: number;
  targetWeeklyHours: number;

  // Duty modifications
  dutyModifications: DutyModification[];
  suitableTaskExamples: string[];
  unsuiableTaskExamples: string[];

  // Milestones and reviews
  reviewMilestones: ReviewMilestone[];
  nextReviewDate: string;

  // Safety and monitoring
  warningSignals: WarningSignal[];
  safetyConsiderations: string[];

  // Compliance notes
  regulatoryNotes: string[];
  worksafeCompliance: boolean;

  // Advisory flag per PRD-9
  advisory: boolean;
}

export interface TreatmentPlanInput {
  caseId: string;
  workerName: string;
  dateOfInjury: string;
  injuryType?: string;
  medicalConstraints?: MedicalConstraints;
  functionalCapacity?: FunctionalCapacity;
  currentCapacity?: WorkCapacity;
  currentRtwStatus?: RTWPlanStatus;
  certificateEndDate?: string;
  specialistRecommendations?: string;
  jobRequirements?: string;
}

// =====================================================
// Treatment Plan Generator
// =====================================================

class TreatmentPlanGenerator {
  /**
   * Generate a treatment plan based on case data
   */
  generatePlan(input: TreatmentPlanInput): TreatmentPlan {
    const {
      caseId,
      workerName,
      dateOfInjury,
      medicalConstraints,
      functionalCapacity,
      currentCapacity,
      currentRtwStatus,
      certificateEndDate,
    } = input;

    // Determine plan type based on capacity
    const planType = this.determinePlanType(currentCapacity, functionalCapacity);

    // Calculate expected duration
    const expectedDurationWeeks = this.calculateExpectedDuration(
      dateOfInjury,
      currentCapacity,
      medicalConstraints
    );

    // Generate hours progression
    const hoursProgression = this.generateHoursProgression(
      planType,
      functionalCapacity,
      expectedDurationWeeks
    );

    // Determine current phase
    const currentPhase = this.determineCurrentPhase(currentRtwStatus, hoursProgression);
    const currentWeeklyHours = this.getCurrentWeeklyHours(currentPhase, hoursProgression);
    const targetWeeklyHours = this.getTargetWeeklyHours(functionalCapacity);

    // Generate duty modifications
    const dutyModifications = this.generateDutyModifications(medicalConstraints, functionalCapacity);

    // Generate task examples
    const { suitable, unsuitable } = this.generateTaskExamples(medicalConstraints);

    // Generate review milestones
    const reviewMilestones = this.generateReviewMilestones(
      expectedDurationWeeks,
      certificateEndDate
    );

    // Generate warning signals
    const warningSignals = this.generateWarningSignals(medicalConstraints, planType);

    // Generate safety considerations
    const safetyConsiderations = this.generateSafetyConsiderations(medicalConstraints);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(input);

    const plan: TreatmentPlan = {
      id: `tp-${caseId}-${Date.now()}`,
      caseId,
      workerName,
      generatedAt: new Date().toISOString(),

      planType,
      planSummary: this.generatePlanSummary(planType, workerName, expectedDurationWeeks),
      expectedDurationWeeks,
      confidenceScore,

      hoursProgression,
      currentPhase,
      currentWeeklyHours,
      targetWeeklyHours,

      dutyModifications,
      suitableTaskExamples: suitable,
      unsuiableTaskExamples: unsuitable,

      reviewMilestones,
      nextReviewDate: this.getNextReviewDate(reviewMilestones),

      warningSignals,
      safetyConsiderations,

      regulatoryNotes: this.generateRegulatoryNotes(planType),
      worksafeCompliance: true,

      advisory: true, // Per PRD-9: All AI outputs are advisory only
    };

    return plan;
  }

  /**
   * Generate plan from a full WorkerCase object
   */
  generatePlanFromCase(workerCase: WorkerCase): TreatmentPlan {
    const input: TreatmentPlanInput = {
      caseId: workerCase.id,
      workerName: workerCase.workerName,
      dateOfInjury: workerCase.dateOfInjury,
      medicalConstraints: workerCase.medicalConstraints,
      functionalCapacity: workerCase.functionalCapacity,
      currentCapacity: workerCase.latestCertificate?.capacity,
      currentRtwStatus: workerCase.rtwPlanStatus,
      certificateEndDate: workerCase.latestCertificate?.endDate,
      specialistRecommendations: workerCase.specialistReportSummary?.recommendations,
    };

    return this.generatePlan(input);
  }

  /**
   * Determine plan type based on current capacity
   */
  private determinePlanType(
    capacity?: WorkCapacity,
    functionalCapacity?: FunctionalCapacity
  ): TreatmentPlan["planType"] {
    if (capacity === "fit" && !functionalCapacity?.maxWorkHoursPerDay) {
      return "full_capacity";
    }

    if (capacity === "unfit") {
      return "unfit_for_work";
    }

    if (capacity === "partial" || functionalCapacity?.maxWorkHoursPerDay) {
      return "graduated_rtw";
    }

    return "modified_duties";
  }

  /**
   * Calculate expected duration based on injury severity
   */
  private calculateExpectedDuration(
    dateOfInjury: string,
    capacity?: WorkCapacity,
    constraints?: MedicalConstraints
  ): number {
    const daysSinceInjury = Math.floor(
      (Date.now() - new Date(dateOfInjury).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Base duration based on capacity
    let baseDuration = 4; // weeks

    if (capacity === "unfit") {
      baseDuration = 12;
    } else if (capacity === "partial") {
      baseDuration = 8;
    }

    // Adjust based on constraints
    if (constraints) {
      if (constraints.noLiftingOverKg && constraints.noLiftingOverKg < 5) {
        baseDuration += 4;
      }
      if (constraints.noBending || constraints.noTwisting) {
        baseDuration += 2;
      }
    }

    // Reduce if already well into recovery
    if (daysSinceInjury > 30) {
      baseDuration = Math.max(2, baseDuration - 2);
    }

    return baseDuration;
  }

  /**
   * Generate hours progression schedule
   */
  private generateHoursProgression(
    planType: TreatmentPlan["planType"],
    functionalCapacity?: FunctionalCapacity,
    expectedWeeks: number = 8
  ): HoursProgression[] {
    if (planType === "full_capacity") {
      return [
        {
          phase: "full_duties",
          weekNumber: 1,
          hoursPerDay: 8,
          daysPerWeek: 5,
          totalWeeklyHours: 40,
          description: "Full duties - no restrictions",
        },
      ];
    }

    if (planType === "unfit_for_work") {
      return [
        {
          phase: "initial",
          weekNumber: 1,
          hoursPerDay: 0,
          daysPerWeek: 0,
          totalWeeklyHours: 0,
          description: "Medical leave - not fit for work",
        },
      ];
    }

    const maxHours = functionalCapacity?.maxWorkHoursPerDay ?? 8;
    const maxDays = functionalCapacity?.maxWorkDaysPerWeek ?? 5;
    const targetWeekly = maxHours * maxDays;

    // Generate graduated progression
    const progression: HoursProgression[] = [];
    const phases: PhaseType[] = ["initial", "progression", "consolidation", "full_duties"];
    const weeksPerPhase = Math.ceil(expectedWeeks / 4);

    // Phase 1: Initial (50% capacity)
    progression.push({
      phase: "initial",
      weekNumber: 1,
      hoursPerDay: Math.ceil(maxHours * 0.5),
      daysPerWeek: Math.min(3, maxDays),
      totalWeeklyHours: Math.ceil(targetWeekly * 0.4),
      description: "Initial phase - focus on tolerance building",
    });

    // Phase 2: Progression (75% capacity)
    progression.push({
      phase: "progression",
      weekNumber: weeksPerPhase + 1,
      hoursPerDay: Math.ceil(maxHours * 0.75),
      daysPerWeek: Math.min(4, maxDays),
      totalWeeklyHours: Math.ceil(targetWeekly * 0.6),
      description: "Progression phase - gradual increase in hours and duties",
    });

    // Phase 3: Consolidation (90% capacity)
    progression.push({
      phase: "consolidation",
      weekNumber: weeksPerPhase * 2 + 1,
      hoursPerDay: Math.ceil(maxHours * 0.9),
      daysPerWeek: maxDays,
      totalWeeklyHours: Math.ceil(targetWeekly * 0.8),
      description: "Consolidation phase - building stamina and confidence",
    });

    // Phase 4: Full duties
    progression.push({
      phase: "full_duties",
      weekNumber: weeksPerPhase * 3 + 1,
      hoursPerDay: maxHours,
      daysPerWeek: maxDays,
      totalWeeklyHours: targetWeekly,
      description: "Full duties phase - return to normal work capacity",
    });

    return progression;
  }

  /**
   * Determine current phase based on RTW status
   */
  private determineCurrentPhase(
    rtwStatus?: RTWPlanStatus,
    hoursProgression?: HoursProgression[]
  ): PhaseType {
    if (!rtwStatus || rtwStatus === "not_planned") {
      return "initial";
    }

    if (rtwStatus === "completed" || rtwStatus === "working_well") {
      return "full_duties";
    }

    if (rtwStatus === "in_progress") {
      return "progression";
    }

    return "initial";
  }

  /**
   * Get current weekly hours based on phase
   */
  private getCurrentWeeklyHours(
    phase: PhaseType,
    hoursProgression: HoursProgression[]
  ): number {
    const phaseData = hoursProgression.find((p) => p.phase === phase);
    return phaseData?.totalWeeklyHours ?? 0;
  }

  /**
   * Get target weekly hours
   */
  private getTargetWeeklyHours(functionalCapacity?: FunctionalCapacity): number {
    const maxHours = functionalCapacity?.maxWorkHoursPerDay ?? 8;
    const maxDays = functionalCapacity?.maxWorkDaysPerWeek ?? 5;
    return maxHours * maxDays;
  }

  /**
   * Generate duty modifications based on constraints
   */
  private generateDutyModifications(
    constraints?: MedicalConstraints,
    functionalCapacity?: FunctionalCapacity
  ): DutyModification[] {
    const modifications: DutyModification[] = [];

    // Add schedule modification if hours limited (check first, regardless of constraints)
    if (functionalCapacity?.maxWorkHoursPerDay && functionalCapacity.maxWorkHoursPerDay < 8) {
      modifications.push({
        category: "schedule",
        restriction: `Maximum ${functionalCapacity.maxWorkHoursPerDay} hours per day`,
        modification: `Reduce daily hours to ${functionalCapacity.maxWorkHoursPerDay}, consider split shifts if beneficial`,
        rationale: "To manage fatigue and support gradual return to full capacity",
      });
    }

    if (!constraints) {
      return modifications;
    }

    if (constraints.noLiftingOverKg) {
      modifications.push({
        category: "physical",
        restriction: `No lifting over ${constraints.noLiftingOverKg}kg`,
        modification:
          functionalCapacity?.canLiftKg
            ? `Limit lifting to ${functionalCapacity.canLiftKg}kg maximum`
            : "Avoid lifting tasks, use mechanical aids",
        rationale: "To prevent aggravation of injury and support recovery",
      });
    }

    if (constraints.noBending) {
      modifications.push({
        category: "physical",
        restriction: "No bending",
        modification: "Provide adjustable work station, use reaching tools",
        rationale: "To maintain neutral spine position",
      });
    }

    if (constraints.noTwisting) {
      modifications.push({
        category: "physical",
        restriction: "No twisting movements",
        modification: "Reorganize workspace to avoid rotation, pivot feet instead of torso",
        rationale: "To prevent spinal stress and re-injury",
      });
    }

    if (constraints.noProlongedStanding) {
      modifications.push({
        category: "physical",
        restriction: "No prolonged standing",
        modification:
          functionalCapacity?.canStandMinutes
            ? `Limit standing to ${functionalCapacity.canStandMinutes} minutes, provide sit-stand station`
            : "Provide seated work option with regular position changes",
        rationale: "To manage fatigue and discomfort",
      });
    }

    if (constraints.noProlongedSitting) {
      modifications.push({
        category: "physical",
        restriction: "No prolonged sitting",
        modification:
          functionalCapacity?.canSitMinutes
            ? `Limit sitting to ${functionalCapacity.canSitMinutes} minutes, schedule movement breaks`
            : "Schedule regular breaks every 30-45 minutes",
        rationale: "To prevent stiffness and promote circulation",
      });
    }

    if (constraints.noDriving) {
      modifications.push({
        category: "environmental",
        restriction: "No driving",
        modification: "Arrange alternative transport or office-based duties only",
        rationale: "Medication effects or physical limitations may impair driving safety",
      });
    }

    if (constraints.noClimbing) {
      modifications.push({
        category: "physical",
        restriction: "No climbing (ladders, stairs frequently)",
        modification: "Assign ground-level duties, limit stair use",
        rationale: "To reduce fall risk and strain on injured area",
      });
    }

    return modifications;
  }

  /**
   * Generate suitable and unsuitable task examples
   */
  private generateTaskExamples(
    constraints?: MedicalConstraints
  ): { suitable: string[]; unsuitable: string[] } {
    const suitable: string[] = [];
    const unsuitable: string[] = [];

    // Default suitable tasks
    suitable.push("Administrative duties");
    suitable.push("Phone/email communication");
    suitable.push("Computer-based work at ergonomic station");

    if (!constraints) {
      return { suitable, unsuitable };
    }

    if (constraints.suitableForLightDuties) {
      suitable.push("Light manual handling (under 5kg)");
      suitable.push("Sorting and organizing");
    }

    if (constraints.suitableForSeatedWork) {
      suitable.push("Seated assembly or inspection tasks");
      suitable.push("Quality control checks");
    }

    // Generate unsuitable based on restrictions
    if (constraints.noLiftingOverKg) {
      unsuitable.push(`Manual handling over ${constraints.noLiftingOverKg}kg`);
      unsuitable.push("Loading/unloading heavy items");
    }

    if (constraints.noBending || constraints.noTwisting) {
      unsuitable.push("Ground-level work requiring bending");
      unsuitable.push("Tasks requiring repetitive rotation");
    }

    if (constraints.noProlongedStanding) {
      unsuitable.push("Assembly line work requiring standing");
      unsuitable.push("Warehouse picking (standing shifts)");
    }

    if (constraints.noClimbing) {
      unsuitable.push("Working at heights");
      unsuitable.push("Ladder or scaffold access tasks");
    }

    if (constraints.noDriving) {
      unsuitable.push("Driving company vehicles");
      unsuitable.push("Delivery duties");
    }

    return { suitable, unsuitable };
  }

  /**
   * Generate review milestones
   */
  private generateReviewMilestones(
    expectedWeeks: number,
    certificateEndDate?: string
  ): ReviewMilestone[] {
    const milestones: ReviewMilestone[] = [];
    const today = new Date();

    // Weekly RTW review for first 4 weeks
    for (let week = 1; week <= Math.min(4, expectedWeeks); week++) {
      const reviewDate = new Date(today);
      reviewDate.setDate(reviewDate.getDate() + week * 7);

      milestones.push({
        weekNumber: week,
        date: reviewDate.toISOString().split("T")[0],
        type: "rtw_review",
        description: `Week ${week} RTW progress review`,
        expectedOutcome: week === 1 ? "Assess initial tolerance" : "Evaluate progression readiness",
      });
    }

    // Certificate renewal milestone if date known
    if (certificateEndDate) {
      const certDate = new Date(certificateEndDate);
      const renewalDate = new Date(certDate);
      renewalDate.setDate(renewalDate.getDate() - 7); // 1 week before expiry

      milestones.push({
        weekNumber: Math.ceil((renewalDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000)),
        date: renewalDate.toISOString().split("T")[0],
        type: "certificate_renewal",
        description: "Certificate renewal due",
        expectedOutcome: "Obtain updated medical certificate or clearance",
      });
    }

    // Medical review at midpoint
    const midpointWeek = Math.ceil(expectedWeeks / 2);
    const midpointDate = new Date(today);
    midpointDate.setDate(midpointDate.getDate() + midpointWeek * 7);

    milestones.push({
      weekNumber: midpointWeek,
      date: midpointDate.toISOString().split("T")[0],
      type: "medical_review",
      description: "Mid-plan medical review",
      expectedOutcome: "Assess recovery progress and adjust plan if needed",
    });

    // Final review
    const finalDate = new Date(today);
    finalDate.setDate(finalDate.getDate() + expectedWeeks * 7);

    milestones.push({
      weekNumber: expectedWeeks,
      date: finalDate.toISOString().split("T")[0],
      type: "medical_review",
      description: "Final capacity assessment",
      expectedOutcome: "Determine fitness for full duties or ongoing accommodations",
    });

    // Sort by date
    return milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get next review date from milestones
   */
  private getNextReviewDate(milestones: ReviewMilestone[]): string {
    const today = new Date().toISOString().split("T")[0];
    const upcoming = milestones.find((m) => m.date >= today);
    return upcoming?.date ?? milestones[milestones.length - 1]?.date ?? today;
  }

  /**
   * Generate warning signals to monitor
   */
  private generateWarningSignals(
    constraints?: MedicalConstraints,
    planType?: TreatmentPlan["planType"]
  ): WarningSignal[] {
    const signals: WarningSignal[] = [
      {
        signal: "Increased pain levels reported",
        severity: "medium",
        action: "Reduce hours/duties, consult treating practitioner",
        monitoringFrequency: "per_shift",
      },
      {
        signal: "Unable to complete assigned tasks",
        severity: "medium",
        action: "Review task suitability, adjust modifications",
        monitoringFrequency: "daily",
      },
      {
        signal: "New symptoms appearing",
        severity: "high",
        action: "Immediate medical review, pause RTW if severe",
        monitoringFrequency: "per_shift",
      },
      {
        signal: "Fatigue significantly impacting work",
        severity: "low",
        action: "Consider reducing hours or adding breaks",
        monitoringFrequency: "daily",
      },
    ];

    if (planType === "graduated_rtw") {
      signals.push({
        signal: "Unable to progress to next phase as scheduled",
        severity: "medium",
        action: "Extend current phase, medical review if plateau persists",
        monitoringFrequency: "weekly",
      });
    }

    if (constraints?.noLiftingOverKg) {
      signals.push({
        signal: "Worker required to lift beyond restriction",
        severity: "high",
        action: "Immediately remove from task, report workplace safety issue",
        monitoringFrequency: "per_shift",
      });
    }

    return signals;
  }

  /**
   * Generate safety considerations
   */
  private generateSafetyConsiderations(constraints?: MedicalConstraints): string[] {
    const considerations: string[] = [
      "Ensure supervisor is aware of all restrictions",
      "Provide clear communication channels for reporting concerns",
      "Document any incidents or near-misses",
    ];

    if (constraints?.noLiftingOverKg) {
      considerations.push("Position mechanical lifting aids where needed");
    }

    if (constraints?.noProlongedStanding || constraints?.noProlongedSitting) {
      considerations.push("Ensure rest areas are accessible");
    }

    if (constraints?.noDriving) {
      considerations.push("Confirm alternative transport arrangements");
    }

    return considerations;
  }

  /**
   * Generate plan summary text
   */
  private generatePlanSummary(
    planType: TreatmentPlan["planType"],
    workerName: string,
    expectedWeeks: number
  ): string {
    switch (planType) {
      case "full_capacity":
        return `${workerName} is cleared for full duties with no restrictions. Regular check-ins recommended to monitor sustained return.`;

      case "unfit_for_work":
        return `${workerName} is currently certified unfit for work. Focus on recovery with regular medical reviews to assess return to work readiness.`;

      case "graduated_rtw":
        return `Graduated return to work plan for ${workerName} over approximately ${expectedWeeks} weeks. Plan includes phased hours increase and modified duties aligned with medical restrictions.`;

      case "modified_duties":
        return `${workerName} to return on modified duties within restrictions. Plan focuses on suitable duties while maintaining recovery progress.`;

      default:
        return `Return to work plan for ${workerName}. Duration approximately ${expectedWeeks} weeks.`;
    }
  }

  /**
   * Generate regulatory compliance notes
   */
  private generateRegulatoryNotes(planType: TreatmentPlan["planType"]): string[] {
    const notes: string[] = [
      "Plan aligned with WorkSafe Victoria RTW obligations",
      "Employer must provide suitable employment per Workplace Injury Rehabilitation and Compensation Act 2013",
      "Worker has obligation to participate in RTW planning per legislation",
    ];

    if (planType === "graduated_rtw" || planType === "modified_duties") {
      notes.push("Suitable duties must be safe, productive, and within medical capacity");
      notes.push("Plan to be reviewed in consultation with treating medical practitioner");
    }

    return notes;
  }

  /**
   * Calculate confidence score based on data completeness
   */
  private calculateConfidence(input: TreatmentPlanInput): number {
    let score = 0.3; // Base confidence

    if (input.medicalConstraints) {
      score += 0.2;
    }

    if (input.functionalCapacity) {
      score += 0.2;
    }

    if (input.currentCapacity) {
      score += 0.1;
    }

    if (input.certificateEndDate) {
      score += 0.1;
    }

    if (input.specialistRecommendations) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Validate a treatment plan against current restrictions
   */
  validatePlanSafety(
    plan: TreatmentPlan,
    constraints?: MedicalConstraints
  ): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!constraints) {
      return { safe: true, issues: [] };
    }

    // Check hours against capacity
    if (constraints.suitableForModifiedHours === false && plan.currentWeeklyHours > 20) {
      issues.push("Plan hours may exceed modified hours recommendation");
    }

    // Check for missing modifications
    if (constraints.noLiftingOverKg && !plan.dutyModifications.some((m) => m.restriction.includes("lifting"))) {
      issues.push("Lifting restriction not addressed in duty modifications");
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }
}

// Export singleton instance
export const treatmentPlanService = new TreatmentPlanGenerator();
