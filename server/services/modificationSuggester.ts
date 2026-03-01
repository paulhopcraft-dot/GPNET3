/**
 * Modification Suggester Service
 * FAM-07: Generate actionable modification suggestions for duties requiring accommodation
 *
 * Generates context-aware suggestions based on:
 * - Specific demand types (lifting, standing, cognitive, etc.)
 * - Occupational therapy best practices
 * - WorkSafe Victoria return-to-work guidance
 *
 * Categories of modifications:
 * - Task restructuring: Redistribute or eliminate tasks
 * - Equipment/tools: Mechanical aids, assistive devices
 * - Schedule adjustments: Breaks, reduced hours
 * - Job rotation: Share demanding tasks across workers
 * - Workstation modification: Ergonomic adjustments
 */

import type { DemandComparison, SuitabilityLevel } from "./functionalAbilityCalculator";

/**
 * Context for generating modification suggestions
 */
export interface ModificationContext {
  dutyName: string;
  dutyDescription: string;
  demandComparisons: DemandComparison[];
  isModifiable: boolean;
}

/**
 * Demand-specific suggestion mapping
 * Maps demand names to arrays of suggested modifications
 */
const DEMAND_SUGGESTIONS: Record<string, string[]> = {
  // Weight-related demands
  Lifting: [
    "Use mechanical aids (trolleys, hoists, team lifts)",
    "Redistribute heavy lifting to team members",
    "Break loads into smaller weights",
    "Position items at optimal height to reduce strain",
  ],
  Carrying: [
    "Use mechanical aids (trolleys, hoists, team lifts)",
    "Redistribute heavy carrying tasks to team members",
    "Reduce carrying distances",
    "Use wheeled equipment instead of manual carrying",
  ],

  // Posture-related demands
  Bending: [
    "Raise work surface height to reduce bending",
    "Use long-handled tools or reaching aids",
    "Provide kneeling pad or stool for low work",
    "Store frequently used items at waist height",
  ],
  Squatting: [
    "Raise work surface height",
    "Use long-handled tools or reaching aids",
    "Provide kneeling pad or mobile stool",
    "Allow alternative positions (sitting, kneeling)",
  ],
  Kneeling: [
    "Provide kneeling pad or cushioned mat",
    "Use mobile platform or stool",
    "Raise work surface where possible",
    "Alternate with standing or sitting tasks",
  ],
  Twisting: [
    "Reorganize workspace to reduce twisting",
    "Use swivel chair or rotating platform",
    "Position work directly in front of worker",
    "Allow full body turns instead of trunk rotation",
  ],

  // Reaching demands
  "Reaching Overhead": [
    "Store items at waist height",
    "Provide step ladder or reaching aids",
    "Use adjustable shelving",
    "Relocate frequently accessed items to lower positions",
  ],
  "Reaching Forward": [
    "Move work closer to the worker",
    "Use turntables or lazy susans",
    "Provide reaching tools or grabbers",
    "Adjust workstation depth",
  ],

  // Standing/sitting demands
  Standing: [
    "Provide sit-stand workstation or stool",
    "Allow position changes every 30 minutes",
    "Use anti-fatigue mat",
    "Schedule regular seated rest periods",
  ],
  Sitting: [
    "Provide standing desk option",
    "Ergonomic chair with lumbar support",
    "Allow walking breaks every 30 minutes",
    "Use sit-stand workstation",
  ],
  Walking: [
    "Reduce walking distances where possible",
    "Provide rest breaks between walking tasks",
    "Use mobility aids if appropriate",
    "Reorganize workflow to minimize travel",
  ],

  // Repetitive demands
  "Repetitive Movements": [
    "Rotate tasks every 1-2 hours to vary movements",
    "Allow micro-breaks (5 min per hour)",
    "Provide ergonomic tools to reduce strain",
    "Automate repetitive tasks where possible",
  ],

  // Cognitive demands
  Concentration: [
    "Reduce distractions in work area",
    "Provide clear written instructions",
    "Allow additional time for complex tasks",
    "Break tasks into smaller steps",
  ],
  "Stress Tolerance": [
    "Reduce distractions in work area",
    "Provide clear written instructions",
    "Allow additional time for tasks",
    "Ensure access to quiet space for breaks",
  ],
  "Work Pace": [
    "Adjust productivity targets during recovery period",
    "Provide flexible task deadlines",
    "Allow self-pacing where possible",
    "Remove time-pressure elements temporarily",
  ],
};

/**
 * General suggestions added when any problematic demands exist
 */
const GENERAL_SUGGESTIONS: string[] = [
  "Gradual increase in duty demands over 2-4 weeks",
  "Regular check-ins with supervisor to assess tolerance",
];

/**
 * Generate modification suggestions based on comparison results
 *
 * @param context - Duty context and demand comparison results
 * @returns Array of deduplicated modification suggestions
 */
export function generateModificationSuggestions(context: ModificationContext): string[] {
  const suggestions: string[] = [];

  // Get all problematic demands (not_suitable or suitable_with_modification)
  const problematicDemands = context.demandComparisons.filter(
    (c) => c.match === "not_suitable" || c.match === "suitable_with_modification"
  );

  // If no problematic demands, no suggestions needed
  if (problematicDemands.length === 0) {
    return [];
  }

  // If duty is not modifiable, provide limited suggestions
  if (!context.isModifiable) {
    suggestions.push(
      "Note: This duty is marked as not modifiable. Consider reassigning to alternative duties."
    );
    return suggestions;
  }

  // Generate demand-specific suggestions
  for (const comparison of problematicDemands) {
    const demandSuggestions = DEMAND_SUGGESTIONS[comparison.demand];
    if (demandSuggestions) {
      // Add first 2 suggestions for each problematic demand to keep list manageable
      suggestions.push(...demandSuggestions.slice(0, 2));
    }
  }

  // Add general suggestions when issues exist
  suggestions.push(...GENERAL_SUGGESTIONS);

  // Deduplicate using Set and return as array
  return Array.from(new Set(suggestions));
}

/**
 * Get a single-line summary of suggested modifications
 * Useful for display in compact UI elements
 *
 * @param suggestions - Array of suggestions
 * @param maxLength - Maximum length of summary string
 * @returns Truncated summary string
 */
export function getSuggestionSummary(suggestions: string[], maxLength: number = 100): string {
  if (suggestions.length === 0) {
    return "No modifications required";
  }

  const summary = suggestions.slice(0, 2).join("; ");
  if (summary.length <= maxLength) {
    return suggestions.length > 2 ? `${summary}; +${suggestions.length - 2} more` : summary;
  }

  return summary.substring(0, maxLength - 3) + "...";
}

/**
 * Group suggestions by category for organized display
 *
 * @param suggestions - Array of suggestions
 * @returns Map of category to suggestions
 */
export function groupSuggestionsByCategory(suggestions: string[]): Map<string, string[]> {
  const categories = new Map<string, string[]>();

  const categoryPatterns: { pattern: RegExp; category: string }[] = [
    { pattern: /mechanical aids|trolleys|hoists/i, category: "Equipment & Tools" },
    { pattern: /ergonomic|chair|workstation|mat/i, category: "Ergonomic Setup" },
    { pattern: /break|rest|micro-break/i, category: "Schedule & Breaks" },
    { pattern: /redistribute|team|alternate/i, category: "Task Distribution" },
    { pattern: /height|position|distance/i, category: "Workspace Layout" },
    { pattern: /gradual|check-in/i, category: "Recovery Support" },
  ];

  for (const suggestion of suggestions) {
    let assigned = false;
    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(suggestion)) {
        const existing = categories.get(category) || [];
        existing.push(suggestion);
        categories.set(category, existing);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      const existing = categories.get("Other") || [];
      existing.push(suggestion);
      categories.set("Other", existing);
    }
  }

  return categories;
}
