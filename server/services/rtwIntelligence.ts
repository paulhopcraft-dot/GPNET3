/**
 * RTW Intelligence Engine
 *
 * Generates evidence-based return-to-work plans tailored to each worker's
 * medical restrictions, job requirements, and recovery trajectory.
 */

import type { WorkerCase, RTWPlanStatus, WorkCapacity, MedicalConstraints, FunctionalCapacity } from "../../shared/schema";

export interface RTWPlanPhase {
  phase: number;
  description: string;
  hoursPerDay: number;
  daysPerWeek: number;
  dutiesType: "light" | "modified" | "full";
  restrictions: string[];
  durationWeeks: number;
  reviewDate?: string;
}

export interface RTWPlan {
  caseId: string;
  workerName: string;
  status: RTWPlanStatus;
  generatedAt: string;
  phases: RTWPlanPhase[];
  currentPhase: number;
  totalDurationWeeks: number;
  recommendations: string[];
  riskFactors: string[];
  confidenceScore: number;
  expectedRTWDate?: string;
}

export interface RTWProgressAssessment {
  caseId: string;
  isOnTrack: boolean;
  progressPercentage: number;
  issues: Array<{
    type: "warning" | "critical";
    message: string;
    recommendation: string;
  }>;
  nextMilestone?: string;
  daysUntilNextReview?: number;
}

export interface RTWRiskScore {
  caseId: string;
  overallScore: number; // 0-100, higher = higher risk
  factors: Array<{
    factor: string;
    weight: number;
    score: number;
    explanation: string;
  }>;
  riskLevel: "low" | "medium" | "high";
  mitigationStrategies: string[];
}

/**
 * RTW Intelligence Service
 */
class RTWIntelligenceService {
  /**
   * Generate a personalized RTW plan based on case data
   */
  generateRTWPlan(workerCase: WorkerCase): RTWPlan {
    const constraints = workerCase.medicalConstraints || {};
    const capacity = workerCase.functionalCapacity || {};
    const currentStatus = workerCase.rtwPlanStatus || "not_planned";

    // Determine starting hours based on capacity
    const startingHours = this.calculateStartingHours(capacity, constraints);
    const phases = this.generatePhases(startingHours, capacity, constraints);
    const totalDurationWeeks = phases.reduce((sum, p) => sum + p.durationWeeks, 0);

    // Calculate expected RTW date
    const expectedRTWDate = new Date();
    expectedRTWDate.setDate(expectedRTWDate.getDate() + totalDurationWeeks * 7);

    // Generate recommendations
    const recommendations = this.generateRecommendations(workerCase, constraints, capacity);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(workerCase);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(workerCase);

    return {
      caseId: workerCase.id,
      workerName: workerCase.workerName,
      status: currentStatus,
      generatedAt: new Date().toISOString(),
      phases,
      currentPhase: this.determineCurrentPhase(workerCase),
      totalDurationWeeks,
      recommendations,
      riskFactors,
      confidenceScore,
      expectedRTWDate: expectedRTWDate.toISOString(),
    };
  }

  /**
   * Assess the current progress of an RTW plan
   */
  assessProgress(workerCase: WorkerCase, plan: RTWPlan): RTWProgressAssessment {
    const issues: RTWProgressAssessment["issues"] = [];
    let isOnTrack = true;
    let progressPercentage = 0;

    // Check compliance status
    if (workerCase.complianceStatus === "non_compliant") {
      issues.push({
        type: "critical",
        message: "Worker is non-compliant with RTW plan requirements",
        recommendation: "Schedule immediate review meeting to address compliance concerns",
      });
      isOnTrack = false;
    }

    // Check if plan is failing
    if (workerCase.rtwPlanStatus === "failing") {
      issues.push({
        type: "critical",
        message: "RTW plan has been marked as failing",
        recommendation: "Conduct clinical review and consider plan modification",
      });
      isOnTrack = false;
    }

    // Check for recent deterioration signals
    if (workerCase.workStatus === "Off work" && workerCase.rtwPlanStatus === "in_progress") {
      issues.push({
        type: "warning",
        message: "Worker is currently off work despite active RTW plan",
        recommendation: "Verify medical status and update plan accordingly",
      });
      isOnTrack = false;
    }

    // Calculate progress percentage
    if (plan.phases.length > 0 && plan.currentPhase > 0) {
      progressPercentage = Math.round((plan.currentPhase / plan.phases.length) * 100);
    }

    // Calculate next review date
    const nextReviewDays = this.calculateDaysUntilReview(workerCase);

    return {
      caseId: workerCase.id,
      isOnTrack,
      progressPercentage,
      issues,
      nextMilestone: plan.phases[plan.currentPhase]?.description,
      daysUntilNextReview: nextReviewDays,
    };
  }

  /**
   * Calculate RTW risk score for a case
   */
  calculateRiskScore(workerCase: WorkerCase): RTWRiskScore {
    const factors: RTWRiskScore["factors"] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Factor 1: Duration off work
    const durationFactor = this.scoreDurationFactor(workerCase);
    factors.push(durationFactor);
    totalScore += durationFactor.score * durationFactor.weight;
    totalWeight += durationFactor.weight;

    // Factor 2: Compliance history
    const complianceFactor = this.scoreComplianceFactor(workerCase);
    factors.push(complianceFactor);
    totalScore += complianceFactor.score * complianceFactor.weight;
    totalWeight += complianceFactor.weight;

    // Factor 3: Injury severity (based on restrictions)
    const severityFactor = this.scoreSeverityFactor(workerCase);
    factors.push(severityFactor);
    totalScore += severityFactor.score * severityFactor.weight;
    totalWeight += severityFactor.weight;

    // Factor 4: RTW plan status
    const planStatusFactor = this.scorePlanStatusFactor(workerCase);
    factors.push(planStatusFactor);
    totalScore += planStatusFactor.score * planStatusFactor.weight;
    totalWeight += planStatusFactor.weight;

    // Calculate overall score
    const overallScore = Math.round(totalScore / totalWeight);
    const riskLevel = overallScore >= 70 ? "high" : overallScore >= 40 ? "medium" : "low";

    // Generate mitigation strategies
    const mitigationStrategies = this.generateMitigationStrategies(factors, riskLevel);

    return {
      caseId: workerCase.id,
      overallScore,
      factors,
      riskLevel,
      mitigationStrategies,
    };
  }

  // Private helper methods

  private calculateStartingHours(capacity: FunctionalCapacity, constraints: MedicalConstraints): number {
    if (capacity.maxWorkHoursPerDay) {
      return Math.min(capacity.maxWorkHoursPerDay, 4);
    }
    if (constraints.suitableForSeatedWork || constraints.suitableForLightDuties) {
      return 4;
    }
    return 2;
  }

  private generatePhases(startingHours: number, capacity: FunctionalCapacity, constraints: MedicalConstraints): RTWPlanPhase[] {
    const phases: RTWPlanPhase[] = [];
    let currentHours = startingHours;
    let phaseNum = 1;

    while (currentHours < 8) {
      const restrictions = this.getPhaseRestrictions(constraints, phaseNum);
      phases.push({
        phase: phaseNum,
        description: `Phase ${phaseNum}: ${currentHours} hours/day with ${restrictions.length > 0 ? "restrictions" : "modified duties"}`,
        hoursPerDay: currentHours,
        daysPerWeek: currentHours <= 4 ? 3 : 5,
        dutiesType: currentHours <= 4 ? "light" : currentHours <= 6 ? "modified" : "full",
        restrictions,
        durationWeeks: 2,
      });
      currentHours += 2;
      phaseNum++;
    }

    // Final phase - full duties
    phases.push({
      phase: phaseNum,
      description: `Phase ${phaseNum}: Full hours and duties`,
      hoursPerDay: 8,
      daysPerWeek: 5,
      dutiesType: "full",
      restrictions: [],
      durationWeeks: 2,
    });

    return phases;
  }

  private getPhaseRestrictions(constraints: MedicalConstraints, phase: number): string[] {
    const restrictions: string[] = [];
    if (constraints.noLiftingOverKg) {
      restrictions.push(`No lifting over ${constraints.noLiftingOverKg}kg`);
    }
    if (constraints.noBending) restrictions.push("No bending");
    if (constraints.noTwisting) restrictions.push("No twisting");
    if (constraints.noProlongedStanding) restrictions.push("No prolonged standing");
    if (constraints.noProlongedSitting) restrictions.push("No prolonged sitting");
    if (constraints.noDriving) restrictions.push("No driving");
    if (constraints.noClimbing) restrictions.push("No climbing");

    // Reduce restrictions in later phases
    if (phase >= 3) {
      return restrictions.slice(0, Math.max(1, restrictions.length - 2));
    }
    return restrictions;
  }

  private generateRecommendations(workerCase: WorkerCase, constraints: MedicalConstraints, capacity: FunctionalCapacity): string[] {
    const recommendations: string[] = [];

    if (constraints.suitableForSeatedWork) {
      recommendations.push("Consider allocating seated administrative tasks during initial phases");
    }
    if (capacity.canStandMinutes && capacity.canStandMinutes < 60) {
      recommendations.push("Ensure regular rest breaks are scheduled (every 30-45 minutes)");
    }
    if (workerCase.specialistStatus === "referred" || workerCase.specialistStatus === "appointment_booked") {
      recommendations.push("Coordinate RTW plan review after specialist consultation");
    }
    recommendations.push("Schedule weekly progress check-ins with supervisor");
    recommendations.push("Document any difficulties or concerns during transition");

    return recommendations;
  }

  private identifyRiskFactors(workerCase: WorkerCase): string[] {
    const factors: string[] = [];

    if (workerCase.riskLevel === "High") {
      factors.push("Case classified as high risk");
    }
    if (workerCase.complianceStatus === "non_compliant" || workerCase.complianceStatus === "partially_compliant") {
      factors.push("Compliance concerns identified");
    }
    if (workerCase.workStatus === "Off work") {
      factors.push("Currently not working");
    }
    if (workerCase.employmentStatus === "TERMINATION_IN_PROGRESS") {
      factors.push("Termination proceedings active");
    }

    return factors;
  }

  private calculateConfidenceScore(workerCase: WorkerCase): number {
    let score = 70; // Base score

    // Increase for good compliance
    if (workerCase.complianceStatus === "compliant") score += 15;

    // Increase for low risk
    if (workerCase.riskLevel === "Low") score += 10;

    // Decrease for missing medical info
    if (!workerCase.medicalConstraints) score -= 15;
    if (!workerCase.functionalCapacity) score -= 10;

    // Decrease for high risk factors
    if (workerCase.riskLevel === "High") score -= 20;
    if (workerCase.employmentStatus === "TERMINATION_IN_PROGRESS") score -= 25;

    return Math.max(0, Math.min(100, score));
  }

  private determineCurrentPhase(workerCase: WorkerCase): number {
    if (workerCase.rtwPlanStatus === "not_planned" || workerCase.rtwPlanStatus === "planned_not_started") {
      return 0;
    }
    if (workerCase.rtwPlanStatus === "completed") {
      return -1; // Indicates completion
    }
    // Default to phase 1 for in-progress plans
    return 1;
  }

  private calculateDaysUntilReview(workerCase: WorkerCase): number {
    // Default to 14 days if no review date set
    if (workerCase.clcNextFollowUp) {
      const nextFollowUp = new Date(workerCase.clcNextFollowUp);
      const today = new Date();
      const diffTime = nextFollowUp.getTime() - today.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    return 14;
  }

  private scoreDurationFactor(workerCase: WorkerCase): RTWRiskScore["factors"][0] {
    // Score based on how long case has been open
    const createdAt = workerCase.dateOfInjury ? new Date(workerCase.dateOfInjury) : new Date();
    const daysSinceInjury = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    let score = 0;
    if (daysSinceInjury > 180) score = 90;
    else if (daysSinceInjury > 90) score = 70;
    else if (daysSinceInjury > 30) score = 40;
    else score = 20;

    return {
      factor: "Duration Since Injury",
      weight: 25,
      score,
      explanation: `${daysSinceInjury} days since injury - ${score >= 70 ? "extended duration increases RTW difficulty" : "within typical recovery window"}`,
    };
  }

  private scoreComplianceFactor(workerCase: WorkerCase): RTWRiskScore["factors"][0] {
    const compliance = workerCase.complianceStatus || "unknown";
    let score = 50;

    switch (compliance) {
      case "compliant": score = 10; break;
      case "partially_compliant": score = 50; break;
      case "non_compliant": score = 90; break;
      default: score = 50;
    }

    return {
      factor: "Compliance History",
      weight: 30,
      score,
      explanation: `Worker is ${compliance} - ${score >= 70 ? "compliance issues significantly impact RTW success" : "positive engagement with case management"}`,
    };
  }

  private scoreSeverityFactor(workerCase: WorkerCase): RTWRiskScore["factors"][0] {
    const constraints = workerCase.medicalConstraints || {};
    let restrictionCount = 0;

    if (constraints.noLiftingOverKg && constraints.noLiftingOverKg <= 5) restrictionCount += 2;
    else if (constraints.noLiftingOverKg) restrictionCount += 1;
    if (constraints.noBending) restrictionCount++;
    if (constraints.noTwisting) restrictionCount++;
    if (constraints.noProlongedStanding) restrictionCount++;
    if (constraints.noProlongedSitting) restrictionCount++;
    if (constraints.noDriving) restrictionCount++;
    if (constraints.noClimbing) restrictionCount++;

    const score = Math.min(100, restrictionCount * 15);

    return {
      factor: "Injury Severity",
      weight: 25,
      score,
      explanation: `${restrictionCount} medical restrictions in place - ${score >= 60 ? "significant functional limitations" : "manageable restrictions for modified duties"}`,
    };
  }

  private scorePlanStatusFactor(workerCase: WorkerCase): RTWRiskScore["factors"][0] {
    const status = workerCase.rtwPlanStatus || "not_planned";
    let score = 50;

    switch (status) {
      case "working_well": score = 10; break;
      case "in_progress": score = 30; break;
      case "planned_not_started": score = 40; break;
      case "on_hold": score = 60; break;
      case "failing": score = 90; break;
      case "not_planned": score = 70; break;
      default: score = 50;
    }

    return {
      factor: "RTW Plan Status",
      weight: 20,
      score,
      explanation: `Plan status: ${status.replace(/_/g, " ")} - ${score >= 60 ? "plan requires attention" : "plan progressing appropriately"}`,
    };
  }

  private generateMitigationStrategies(factors: RTWRiskScore["factors"], riskLevel: string): string[] {
    const strategies: string[] = [];

    if (riskLevel === "high") {
      strategies.push("Schedule urgent case review with all stakeholders");
      strategies.push("Consider engaging specialist case management support");
    }

    factors.forEach(f => {
      if (f.score >= 70) {
        switch (f.factor) {
          case "Duration Since Injury":
            strategies.push("Evaluate barriers to RTW and consider vocational assessment");
            break;
          case "Compliance History":
            strategies.push("Implement structured compliance monitoring with clear expectations");
            break;
          case "Injury Severity":
            strategies.push("Request functional capacity evaluation to identify suitable duties");
            break;
          case "RTW Plan Status":
            strategies.push("Conduct comprehensive plan review and modification");
            break;
        }
      }
    });

    if (strategies.length === 0) {
      strategies.push("Continue current management approach with regular monitoring");
    }

    return strategies;
  }
}

export const rtwIntelligenceService = new RTWIntelligenceService();
