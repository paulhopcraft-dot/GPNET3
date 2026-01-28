/**
 * Suitability display utilities for RTW Planner
 * Provides formatting helpers for SuitabilityLevel display in Functional Ability Matrix
 */

/**
 * Three-tier suitability output (FAM-02)
 * Matches server-side SuitabilityLevel from functionalAbilityCalculator.ts
 */
export type SuitabilityLevel = "suitable" | "suitable_with_modification" | "not_suitable";

/**
 * Get Tailwind text color class for a suitability level
 */
export function getSuitabilityColor(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable":
      return "text-green-600";
    case "suitable_with_modification":
      return "text-yellow-600";
    case "not_suitable":
      return "text-red-600";
    default:
      return "text-gray-400";
  }
}

/**
 * Get Tailwind background + border classes for a suitability level
 * Use for card/row backgrounds
 */
export function getSuitabilityBgColor(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable":
      return "bg-green-50 border-green-200";
    case "suitable_with_modification":
      return "bg-yellow-50 border-yellow-200";
    case "not_suitable":
      return "bg-red-50 border-red-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

/**
 * Get Lucide icon name for a suitability level
 */
export function getSuitabilityIcon(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable":
      return "check";
    case "suitable_with_modification":
      return "alert-triangle";
    case "not_suitable":
      return "x";
    default:
      return "help-circle";
  }
}

/**
 * Get human-readable label for a suitability level
 */
export function formatSuitability(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable":
      return "Suitable";
    case "suitable_with_modification":
      return "Suitable with Modification";
    case "not_suitable":
      return "Not Suitable";
    default:
      return "Unknown";
  }
}

/**
 * Get Badge variant for shadcn/ui Badge component
 */
export function getSuitabilityBadgeVariant(suitability: SuitabilityLevel): "default" | "secondary" | "destructive" {
  switch (suitability) {
    case "suitable":
      return "default";
    case "suitable_with_modification":
      return "secondary";
    case "not_suitable":
      return "destructive";
    default:
      return "secondary";
  }
}
