/**
 * RTW Plan Compliance Engine v1
 *
 * Computes RTW plan compliance status following certificate compliance patterns:
 * - no_plan: Case has no RTW plans or plan status is 'not_planned'
 * - plan_expiring_soon: Active plan expires within 7 days
 * - plan_expired: Plan has passed its target end date
 * - plan_compliant: Active plan exists and not expiring soon
 */

import type {
  TreatmentPlan,
  RTWCompliance,
  RTWComplianceStatus,
  RTWPlanStatus
} from "@shared/schema";
import type { IStorage } from "../storage";

// Configuration - match certificate compliance thresholds
const EXPIRING_SOON_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculate days between two dates (can be negative if date is in the past)
 */
function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Check if an RTW plan is currently active based on status and dates
 */
function isRTWPlanActive(plan: TreatmentPlan, status: RTWPlanStatus, now: Date = new Date()): boolean {
  // Only consider plans with active statuses
  const activeStatuses: RTWPlanStatus[] = ['in_progress', 'working_well'];
  if (!activeStatuses.includes(status)) {
    return false;
  }

  // Plan must have target end date to be considered for expiry tracking
  if (!plan.rtwPlanTargetEndDate) {
    return false;
  }

  const targetEndDate = new Date(plan.rtwPlanTargetEndDate);
  targetEndDate.setHours(23, 59, 59, 999);

  // Plan is active if it hasn't reached its target end date
  const nowStart = new Date(now);
  nowStart.setHours(0, 0, 0, 0);

  return nowStart <= targetEndDate;
}

/**
 * Calculate target end date for RTW plan if not explicitly set
 */
function calculateTargetEndDate(plan: TreatmentPlan): string | undefined {
  if (plan.rtwPlanTargetEndDate) {
    return plan.rtwPlanTargetEndDate;
  }

  // Calculate from start date + expected duration
  if (plan.rtwPlanStartDate && plan.expectedDurationWeeks) {
    const startDate = new Date(plan.rtwPlanStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (plan.expectedDurationWeeks * 7));
    return endDate.toISOString();
  }

  // Fallback: use plan generation date + expected duration
  if (plan.generatedAt && plan.expectedDurationWeeks) {
    const startDate = new Date(plan.generatedAt);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (plan.expectedDurationWeeks * 7));
    return endDate.toISOString();
  }

  return undefined;
}

/**
 * Compute RTW plan compliance status for a case
 */
export function computeRTWCompliance(
  plan: TreatmentPlan | undefined,
  rtwPlanStatus: RTWPlanStatus,
  now: Date = new Date()
): RTWCompliance {
  // No plan or plan not started
  if (!plan || rtwPlanStatus === "not_planned" || rtwPlanStatus === "planned_not_started") {
    return {
      status: "no_plan",
      requiresReview: rtwPlanStatus === "planned_not_started",
      message: rtwPlanStatus === "planned_not_started"
        ? "RTW plan created but not started"
        : "No RTW plan on file",
    };
  }

  // Calculate or use existing target end date
  const targetEndDate = calculateTargetEndDate(plan);
  if (!targetEndDate) {
    return {
      status: "no_plan",
      requiresReview: true,
      message: "RTW plan missing timeline information",
    };
  }

  // Update plan with calculated target end date if needed
  const planWithEndDate = {
    ...plan,
    rtwPlanTargetEndDate: targetEndDate
  };

  const endDate = new Date(targetEndDate);
  endDate.setHours(23, 59, 59, 999);

  // Check if plan is currently active
  if (isRTWPlanActive(planWithEndDate, rtwPlanStatus, now)) {
    const daysUntilExpiry = daysBetween(now, endDate);

    // Plan expiring soon (within EXPIRING_SOON_DAYS)
    if (daysUntilExpiry <= EXPIRING_SOON_DAYS) {
      return {
        status: "plan_expiring_soon",
        activePlan: planWithEndDate,
        daysUntilExpiry,
        requiresReview: true,
        message: daysUntilExpiry <= 0
          ? "RTW plan expires today"
          : `RTW plan expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
      };
    }

    // Plan compliant - active and not expiring soon
    return {
      status: "plan_compliant",
      activePlan: planWithEndDate,
      daysUntilExpiry,
      requiresReview: false,
      message: "Active RTW plan on track",
    };
  }

  // Plan has expired or is not active
  const daysSinceExpiry = Math.abs(daysBetween(endDate, now));

  return {
    status: "plan_expired",
    activePlan: planWithEndDate,
    daysSinceExpiry,
    requiresReview: true,
    message: daysSinceExpiry === 0
      ? "RTW plan expired today"
      : `RTW plan expired ${daysSinceExpiry} day${daysSinceExpiry === 1 ? "" : "s"} ago`,
  };
}

/**
 * Get RTW compliance for a case using the storage layer
 */
export async function getCaseRTWCompliance(
  storage: IStorage,
  caseId: string,
  organizationId: string
): Promise<RTWCompliance> {
  // Get all cases for the organization and find the specific case
  const cases = await storage.getGPNet2Cases(organizationId);
  const workerCase = cases.find(c => c.id === caseId);

  if (!workerCase) {
    return {
      status: "no_plan",
      requiresReview: false,
      message: "Case not found",
    };
  }

  const clinicalStatus = workerCase.clinical_status_json;
  const treatmentPlan = clinicalStatus?.treatmentPlan;
  const rtwPlanStatus = clinicalStatus?.rtwPlanStatus || workerCase.rtwPlanStatus || "not_planned";

  return computeRTWCompliance(treatmentPlan, rtwPlanStatus);
}

/**
 * Determine if an RTW plan requires immediate action based on compliance status
 */
export function requiresRTWAction(compliance: RTWCompliance): boolean {
  return compliance.status === "plan_expiring_soon" ||
         compliance.status === "plan_expired" ||
         compliance.requiresReview;
}

/**
 * Get priority level based on RTW compliance status (matches notification priority levels)
 */
export function getRTWCompliancePriority(compliance: RTWCompliance): "low" | "medium" | "high" | "critical" {
  switch (compliance.status) {
    case "plan_expired":
      return "critical";
    case "plan_expiring_soon":
      if (compliance.daysUntilExpiry !== undefined && compliance.daysUntilExpiry <= 1) {
        return "critical";
      } else if (compliance.daysUntilExpiry !== undefined && compliance.daysUntilExpiry <= 3) {
        return "high";
      } else {
        return "medium";
      }
    case "no_plan":
      return compliance.requiresReview ? "medium" : "low";
    case "plan_compliant":
    default:
      return "low";
  }
}