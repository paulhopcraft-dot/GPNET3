import type { ComplianceIndicator } from "./schema";

export interface ComplianceBadgeProps {
  bgColor: string;
  textColor: string;
  label: string;
}

/**
 * Semantic compliance color mapping where:
 * - Green = Good compliance (on track, plenty of time)
 * - Yellow = Needs attention (due soon)
 * - Orange/Red = Urgent/Critical (due today, overdue)
 */
export const complianceColors: Record<ComplianceIndicator, ComplianceBadgeProps> = {
  'Very High': {
    bgColor: 'bg-green-500',
    textColor: 'text-white',
    label: 'Very High'
  },
  'High': {
    bgColor: 'bg-green-400',
    textColor: 'text-white',
    label: 'High'
  },
  'Medium': {
    bgColor: 'bg-yellow-500',
    textColor: 'text-white',
    label: 'Medium'
  },
  'Low': {
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
    label: 'Low'
  },
  'Very Low': {
    bgColor: 'bg-red-500',
    textColor: 'text-white',
    label: 'Very Low'
  }
} as const;

/**
 * Get badge styling properties for a compliance indicator
 */
export function getComplianceBadgeProps(indicator: ComplianceIndicator | undefined): ComplianceBadgeProps {
  if (!indicator) {
    return {
      bgColor: 'bg-gray-400',
      textColor: 'text-white',
      label: '—'
    };
  }
  return complianceColors[indicator];
}
