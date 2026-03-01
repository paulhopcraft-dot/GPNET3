/**
 * Restriction display utilities for RTW Planner
 * Provides formatting helpers for FunctionalRestrictions data display
 */

import type { RestrictionCapability } from "@shared/schema";

/**
 * Get the icon name for a capability level
 * Uses Lucide icon names
 */
export function getCapabilityIcon(capability: RestrictionCapability): string {
  switch (capability) {
    case "can":
      return "check";
    case "with_modifications":
      return "alert-triangle";
    case "cannot":
      return "x";
    case "not_assessed":
      return "minus";
    default:
      return "help-circle";
  }
}

/**
 * Get Tailwind text color class for a capability level
 */
export function getCapabilityColor(capability: RestrictionCapability): string {
  switch (capability) {
    case "can":
      return "text-green-600";
    case "with_modifications":
      return "text-yellow-600";
    case "cannot":
      return "text-red-600";
    case "not_assessed":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}

/**
 * Get Tailwind background + text color classes for badges
 */
export function getCapabilityBgColor(capability: RestrictionCapability): string {
  switch (capability) {
    case "can":
      return "bg-green-100 text-green-800";
    case "with_modifications":
      return "bg-yellow-100 text-yellow-800";
    case "cannot":
      return "bg-red-100 text-red-800";
    case "not_assessed":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

/**
 * Get human-readable label for a restriction key
 */
export function formatRestrictionLabel(key: string): string {
  const labels: Record<string, string> = {
    sitting: "Sitting",
    standingWalking: "Standing/Walking",
    bending: "Bending",
    squatting: "Squatting",
    kneelingClimbing: "Kneeling/Climbing",
    twisting: "Twisting",
    reachingOverhead: "Reaching Overhead",
    reachingForward: "Reaching Forward",
    neckMovement: "Neck Movement",
    lifting: "Lifting",
    carrying: "Carrying",
    pushing: "Pushing",
    pulling: "Pulling",
    repetitiveMovements: "Repetitive Movements",
    useOfInjuredLimb: "Use of Injured Limb",
  };
  return labels[key] || key;
}

/**
 * Get human-readable label for capability status
 */
export function formatCapabilityLabel(capability: RestrictionCapability): string {
  switch (capability) {
    case "can":
      return "Can Perform";
    case "with_modifications":
      return "With Modifications";
    case "cannot":
      return "Cannot Perform";
    case "not_assessed":
      return "Not Assessed";
    default:
      return "Unknown";
  }
}

/**
 * Format weight limit for display with units
 */
export function formatWeightLimit(kg: number | undefined | null): string | null {
  if (kg === undefined || kg === null) {
    return null;
  }
  return `max ${kg} kg`;
}

/**
 * Format time limit for display
 */
export function formatTimeLimit(value: number | undefined | null, unit: "hours" | "days"): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const unitLabel = unit === "hours" ? "hours/day" : "days/week";
  return `${value} ${unitLabel}`;
}

/**
 * Get restriction categories for grouping display
 */
export const restrictionCategories = {
  mobility: ["sitting", "standingWalking", "bending", "squatting", "kneelingClimbing", "twisting"],
  reaching: ["reachingOverhead", "reachingForward", "neckMovement"],
  manualHandling: ["lifting", "carrying", "pushing", "pulling"],
  other: ["repetitiveMovements", "useOfInjuredLimb"],
} as const;

/**
 * Get category label for display
 */
export function getCategoryLabel(category: keyof typeof restrictionCategories): string {
  const labels: Record<keyof typeof restrictionCategories, string> = {
    mobility: "Mobility",
    reaching: "Reaching",
    manualHandling: "Manual Handling",
    other: "Other",
  };
  return labels[category];
}
