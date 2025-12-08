import {
  WorkerCase,
  RTWPlan,
  RTWPlanPhase,
  RTWPlanStatus,
  RTWRecommendation,
  MedicalConstraints,
  FunctionalCapacity,
  WorkCapacity,
} from "../../shared/schema";
import { randomUUID } from "crypto";

const uuidv4 = randomUUID;

// Default phase templates based on work capacity
const PHASE_TEMPLATES = {
  // For workers with significant restrictions
  graduated_slow: [
    { name: "Initial Return", hoursPerDay: 2, daysPerWeek: 3, durationWeeks: 2 },
    { name: "Build Up", hoursPerDay: 4, daysPerWeek: 4, durationWeeks: 2 },
    { name: "Consolidation", hoursPerDay: 6, daysPerWeek: 5, durationWeeks: 2 },
    { name: "Full Duties", hoursPerDay: 8, daysPerWeek: 5, durationWeeks: 2 },
  ],
  // For workers with moderate restrictions
  graduated_standard: [
    { name: "Modified Start", hoursPerDay: 4, daysPerWeek: 4, durationWeeks: 2 },
    { name: "Progression", hoursPerDay: 6, daysPerWeek: 5, durationWeeks: 2 },
    { name: "Full Return", hoursPerDay: 8, daysPerWeek: 5, durationWeeks: 2 },
  ],
  // For workers with minor restrictions
  graduated_fast: [
    { name: "Light Duties", hoursPerDay: 6, daysPerWeek: 5, durationWeeks: 1 },
    { name: "Full Return", hoursPerDay: 8, daysPerWeek: 5, durationWeeks: 1 },
  ],
  // Direct return with monitoring
  direct_return: [
    { name: "Full Duties with Monitoring", hoursPerDay: 8, daysPerWeek: 5, durationWeeks: 4 },
  ],
};

/**
 * Derive restrictions list from medical constraints
 */
function deriveRestrictions(constraints?: MedicalConstraints): string[] {
  if (!constraints) return [];

  const restrictions: string[] = [];

  if (constraints.noLiftingOverKg) {
    restrictions.push(`No lifting over ${constraints.noLiftingOverKg}kg`);
  }
  if (constraints.noBending) {
    restrictions.push("No bending");
  }
  if (constraints.noTwisting) {
    restrictions.push("No twisting");
  }
  if (constraints.noProlongedStanding) {
    restrictions.push("No prolonged standing");
  }
  if (constraints.noProlongedSitting) {
    restrictions.push("No prolonged sitting");
  }
  if (constraints.noRepetitiveMovement) {
    restrictions.push("No repetitive movements");
  }
  if (constraints.noHeightsOrLadders) {
    restrictions.push("No heights or ladders");
  }
  if (constraints.noDriving) {
    restrictions.push("No driving");
  }
  if (constraints.otherRestrictions) {
    restrictions.push(constraints.otherRestrictions);
  }

  return restrictions;
}

/**
 * Suggest suitable duties based on restrictions and capacity
 */
function suggestDuties(
  restrictions: string[],
  capacity?: FunctionalCapacity
): string[] {
  const duties: string[] = [];

  // Base duties that are usually safe
  const safeDuties = [
    "Administrative tasks",
    "Phone duties",
    "Computer work",
    "Training/mentoring",
    "Quality checks",
    "Inventory management",
    "Documentation",
  ];

  // Check capacity and restrictions to filter
  const hasLiftingRestriction = restrictions.some((r) =>
    r.toLowerCase().includes("lifting")
  );
  const hasStandingRestriction = restrictions.some((r) =>
    r.toLowerCase().includes("standing")
  );
  const hasSittingRestriction = restrictions.some((r) =>
    r.toLowerCase().includes("sitting")
  );
  const hasDrivingRestriction = restrictions.some((r) =>
    r.toLowerCase().includes("driving")
  );

  // Add appropriate duties
  if (!hasSittingRestriction) {
    duties.push("Desk-based tasks");
    duties.push("Computer work");
  }

  if (!hasStandingRestriction) {
    duties.push("Light supervision");
    duties.push("Workplace inspections");
  }

  if (!hasLiftingRestriction || (capacity?.canLiftKg && capacity.canLiftKg >= 5)) {
    duties.push("Light material handling");
  }

  if (!hasDrivingRestriction) {
    duties.push("Site visits");
  }

  // Add general safe duties
  duties.push("Team meetings");
  duties.push("Process documentation");

  // Deduplicate
  return [...new Set(duties)];
}

/**
 * Determine the appropriate phase template based on case data
 */
function selectPhaseTemplate(
  workerCase: WorkerCase
): keyof typeof PHASE_TEMPLATES {
  const { workStatus, riskLevel, functionalCapacity, medicalConstraints } =
    workerCase;

  // If already at work, might just need monitoring
  if (workStatus === "At work" && riskLevel === "Low") {
    return "direct_return";
  }

  // Check functional capacity
  const maxHours = functionalCapacity?.maxWorkHoursPerDay;
  const maxDays = functionalCapacity?.maxWorkDaysPerWeek;

  // Severe restrictions = slow graduation
  if (
    (maxHours && maxHours <= 4) ||
    (maxDays && maxDays <= 3) ||
    riskLevel === "High"
  ) {
    return "graduated_slow";
  }

  // Moderate restrictions
  if (
    (maxHours && maxHours <= 6) ||
    (maxDays && maxDays <= 4) ||
    riskLevel === "Medium"
  ) {
    return "graduated_standard";
  }

  // Minor restrictions
  return "graduated_fast";
}

/**
 * Generate an RTW plan for a worker case
 */
export function generateRTWPlan(workerCase: WorkerCase): RTWPlan {
  const now = new Date();
  const restrictions = deriveRestrictions(workerCase.medicalConstraints);
  const duties = suggestDuties(restrictions, workerCase.functionalCapacity);
  const templateKey = selectPhaseTemplate(workerCase);
  const template = PHASE_TEMPLATES[templateKey];

  // Build phases from template
  let currentDate = new Date(now);
  const phases: RTWPlanPhase[] = template.map((t, index) => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + t.durationWeeks * 7);

    const reviewDate = new Date(endDate);
    reviewDate.setDate(reviewDate.getDate() - 2); // Review 2 days before phase ends

    const phase: RTWPlanPhase = {
      phaseNumber: index + 1,
      name: t.name,
      hoursPerDay: t.hoursPerDay,
      daysPerWeek: t.daysPerWeek,
      durationWeeks: t.durationWeeks,
      duties: duties.slice(0, Math.min(duties.length, 3 + index)), // More duties as phases progress
      restrictions,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      reviewDate: reviewDate.toISOString().split("T")[0],
      status: index === 0 ? "active" : "pending",
    };

    currentDate = endDate;
    return phase;
  });

  // Calculate goal date (end of last phase)
  const goalDate = phases[phases.length - 1]?.endDate;

  // Determine initial status
  const status: RTWPlanStatus =
    workerCase.workStatus === "At work" ? "in_progress" : "planned_not_started";

  // Assess safety
  const { safetyStatus, safetyNotes } = assessPlanSafety(workerCase, phases[0]);

  // Generate recommendations
  const recommendations = generateRecommendations(workerCase, phases);

  return {
    id: uuidv4(),
    caseId: workerCase.id,
    workerName: workerCase.workerName,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status,
    currentPhase: 1,
    phases,
    goalDate,
    safetyStatus,
    safetyNotes,
    recommendations,
    createdBy: "system",
  };
}

/**
 * Assess safety of current plan/phase against worker restrictions
 */
export function assessPlanSafety(
  workerCase: WorkerCase,
  currentPhase?: RTWPlanPhase
): { safetyStatus: RTWPlan["safetyStatus"]; safetyNotes?: string } {
  const { medicalConstraints, functionalCapacity } = workerCase;

  if (!currentPhase) {
    return { safetyStatus: "unknown", safetyNotes: "No active phase to assess" };
  }

  const issues: string[] = [];

  // Check hours against capacity
  if (functionalCapacity?.maxWorkHoursPerDay) {
    if (currentPhase.hoursPerDay > functionalCapacity.maxWorkHoursPerDay) {
      issues.push(
        `Phase hours (${currentPhase.hoursPerDay}h) exceed capacity (${functionalCapacity.maxWorkHoursPerDay}h)`
      );
    }
  }

  // Check days against capacity
  if (functionalCapacity?.maxWorkDaysPerWeek) {
    if (currentPhase.daysPerWeek > functionalCapacity.maxWorkDaysPerWeek) {
      issues.push(
        `Phase days (${currentPhase.daysPerWeek}d) exceed capacity (${functionalCapacity.maxWorkDaysPerWeek}d)`
      );
    }
  }

  // Check if restrictions are properly applied
  if (medicalConstraints) {
    const hasLiftingRestriction =
      medicalConstraints.noLiftingOverKg !== undefined;
    const phaseHasLiftingDuties = currentPhase.duties.some(
      (d) =>
        d.toLowerCase().includes("lifting") ||
        d.toLowerCase().includes("material handling")
    );

    if (
      hasLiftingRestriction &&
      phaseHasLiftingDuties &&
      medicalConstraints.noLiftingOverKg === 0
    ) {
      issues.push("Phase includes lifting duties but worker has lifting restriction");
    }
  }

  if (issues.length === 0) {
    return { safetyStatus: "safe", safetyNotes: "Plan aligns with medical restrictions" };
  }

  if (issues.length >= 2) {
    return {
      safetyStatus: "unsafe",
      safetyNotes: issues.join("; "),
    };
  }

  return {
    safetyStatus: "at_risk",
    safetyNotes: issues.join("; "),
  };
}

/**
 * Generate recommendations based on case data and plan
 */
export function generateRecommendations(
  workerCase: WorkerCase,
  phases: RTWPlanPhase[]
): RTWRecommendation[] {
  const recommendations: RTWRecommendation[] = [];

  // Check if worker is high risk
  if (workerCase.riskLevel === "High") {
    recommendations.push({
      id: uuidv4(),
      type: "review_needed",
      priority: "high",
      message: "High-risk case requires close monitoring",
      reason: "Worker is flagged as high risk",
      suggestedAction: "Schedule weekly check-ins and review progress at each phase transition",
    });
  }

  // Check compliance status
  if (workerCase.complianceStatus === "non_compliant") {
    recommendations.push({
      id: uuidv4(),
      type: "escalate",
      priority: "high",
      message: "Worker non-compliance may affect RTW plan",
      reason: "Worker marked as non-compliant",
      suggestedAction: "Address compliance issues before proceeding with plan",
    });
  }

  // Check if RTW plan is failing
  if (workerCase.rtwPlanStatus === "failing") {
    recommendations.push({
      id: uuidv4(),
      type: "extend_phase",
      priority: "high",
      message: "Current RTW plan is not working",
      reason: "Plan status marked as failing",
      suggestedAction: "Review current phase, consider reducing hours or extending duration",
    });
  }

  // Check psychological markers (from summary)
  const summaryText = `${workerCase.summary || ""} ${workerCase.aiSummary || ""}`.toLowerCase();
  const hasPsychMarkers = ["ptsd", "anxiety", "depression", "psychological", "mental health"].some(
    (keyword) => summaryText.includes(keyword)
  );

  if (hasPsychMarkers) {
    recommendations.push({
      id: uuidv4(),
      type: "review_needed",
      priority: "medium",
      message: "Psychological component detected",
      reason: "Case involves psychological injury markers",
      suggestedAction: "Consider EAP referral and ensure workplace support is in place",
    });
  }

  // Check if plan is long (many phases)
  if (phases.length >= 4) {
    recommendations.push({
      id: uuidv4(),
      type: "review_needed",
      priority: "low",
      message: "Extended RTW timeline",
      reason: `Plan has ${phases.length} phases spanning multiple weeks`,
      suggestedAction: "Monitor engagement and adjust pace based on progress",
    });
  }

  return recommendations;
}

/**
 * Update plan status based on current date and phase dates
 */
export function updatePlanProgress(plan: RTWPlan): RTWPlan {
  const now = new Date();
  const updatedPhases = plan.phases.map((phase) => {
    if (phase.status === "completed" || phase.status === "skipped") {
      return phase;
    }

    const startDate = phase.startDate ? new Date(phase.startDate) : null;
    const endDate = phase.endDate ? new Date(phase.endDate) : null;

    if (endDate && now > endDate) {
      return { ...phase, status: "completed" as const };
    }

    if (startDate && now >= startDate && (!endDate || now <= endDate)) {
      return { ...phase, status: "active" as const };
    }

    return phase;
  });

  // Determine current phase
  const activePhaseIndex = updatedPhases.findIndex((p) => p.status === "active");
  const currentPhase = activePhaseIndex >= 0 ? activePhaseIndex + 1 : plan.currentPhase;

  // Update overall status
  const allCompleted = updatedPhases.every(
    (p) => p.status === "completed" || p.status === "skipped"
  );
  const anyActive = updatedPhases.some((p) => p.status === "active");

  let status: RTWPlanStatus = plan.status;
  if (allCompleted) {
    status = "completed";
  } else if (anyActive) {
    status = "in_progress";
  }

  return {
    ...plan,
    phases: updatedPhases,
    currentPhase,
    status,
    updatedAt: now.toISOString(),
  };
}
