/**
 * DemandCategoryCell Component
 *
 * Displays a single demand suitability cell in the Functional Ability Matrix.
 * Shows color-coded suitability with tooltip for details.
 *
 * Part of FAM-08: TRUE matrix visualization with duties as rows, demands as columns.
 */

import { Check, AlertTriangle, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getSuitabilityBgColor,
  getSuitabilityColor,
  formatSuitability,
  type SuitabilityLevel,
} from "@/lib/suitabilityUtils";

export interface DemandCategoryCellProps {
  /** The demand category name (e.g., "Sitting", "Standing") */
  demand: string;
  /** How often the duty requires this demand (never/occasionally/frequently/constantly) */
  frequency: string;
  /** Worker's capability for this demand (can/with_modifications/cannot/not_assessed) */
  capability: string;
  /** Suitability match result */
  match: SuitabilityLevel;
}

/**
 * Format frequency label for display
 */
function formatFrequency(frequency: string): string {
  switch (frequency) {
    case "never":
      return "Never";
    case "occasionally":
      return "Occasionally (0-33%)";
    case "frequently":
      return "Frequently (33-67%)";
    case "constantly":
      return "Constantly (67-100%)";
    default:
      return frequency;
  }
}

/**
 * Format capability label for display
 */
function formatCapability(capability: string): string {
  switch (capability) {
    case "can":
      return "Can perform";
    case "with_modifications":
      return "With modifications";
    case "cannot":
      return "Cannot perform";
    case "not_assessed":
      return "Not assessed";
    default:
      return capability;
  }
}

/**
 * Get the appropriate icon component for a suitability level
 */
function SuitabilityIcon({ match }: { match: SuitabilityLevel }) {
  switch (match) {
    case "suitable":
      return <Check className="w-4 h-4 mx-auto text-green-600" />;
    case "suitable_with_modification":
      return <AlertTriangle className="w-4 h-4 mx-auto text-yellow-600" />;
    case "not_suitable":
      return <X className="w-4 h-4 mx-auto text-red-600" />;
    default:
      return null;
  }
}

/**
 * DemandCategoryCell - Renders a single cell in the Functional Ability Matrix
 *
 * Displays:
 * - Color-coded background based on suitability
 * - Icon indicating suitability level
 * - Tooltip with demand details on hover
 */
export function DemandCategoryCell({
  demand,
  frequency,
  capability,
  match,
}: DemandCategoryCellProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <td
            className={cn(
              "w-12 h-10 text-center border cursor-help",
              getSuitabilityBgColor(match)
            )}
          >
            <SuitabilityIcon match={match} />
          </td>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <div className="font-medium">{demand}</div>
            <div>
              <span className="text-muted-foreground">Duty requires:</span>{" "}
              {formatFrequency(frequency)}
            </div>
            <div>
              <span className="text-muted-foreground">Worker:</span>{" "}
              {formatCapability(capability)}
            </div>
            <div className={cn("font-medium", getSuitabilityColor(match))}>
              {formatSuitability(match)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default DemandCategoryCell;
