/**
 * FunctionalAbilityMatrix Component
 *
 * TRUE matrix visualization with duties as ROWS and demand categories as COLUMNS.
 * FAM-08: Displays color-coded suitability cells for each duty/demand combination.
 *
 * Features:
 * - Fetches matrix data from /api/functional-ability/matrix
 * - Horizontally scrollable for mobile/narrow screens
 * - Sticky first column (duty name) for navigation
 * - Color-coded cells with tooltips
 * - Overall suitability shown in final column
 *
 * Note: Override functionality deferred to Phase 8 (Approval Workflow)
 * This is a suitability PREVIEW on duty templates.
 */

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  getSuitabilityBgColor,
  formatSuitability,
  type SuitabilityLevel,
} from "@/lib/suitabilityUtils";
import { DemandCategoryCell } from "./DemandCategoryCell";

// ============================================================================
// Types
// ============================================================================

export interface FunctionalAbilityMatrixProps {
  /** Worker case ID */
  caseId: string;
  /** Job role ID for duty lookup */
  roleId: string;
}

interface DemandDetail {
  demand: string;
  frequency: string;
  capability: string;
  match: SuitabilityLevel;
}

interface DutyData {
  dutyId: string;
  dutyName: string;
  dutyDescription: string | null;
  suitability: SuitabilityLevel;
  reasons: string[];
  modificationSuggestions: string[];
  isModifiable: boolean;
  demandDetails: DemandDetail[];
}

interface MatrixResponse {
  success: boolean;
  data: {
    caseId: string;
    roleId: string;
    calculatedAt: string;
    confidence: number;
    warnings: string[];
    duties: DutyData[];
  };
}

// ============================================================================
// Demand Column Definitions (FAM-08 specification)
// ============================================================================

/**
 * Demand categories in display order
 * Short labels for column headers, full names for lookup
 */
const DEMAND_COLUMNS = [
  { key: "Sitting", label: "Sit" },
  { key: "Standing", label: "Stand" },
  { key: "Walking", label: "Walk" },
  { key: "Bending", label: "Bend" },
  { key: "Squatting", label: "Squat" },
  { key: "Kneeling", label: "Kneel" },
  { key: "Twisting", label: "Twist" },
  { key: "Reaching Overhead", label: "OH" },
  { key: "Reaching Forward", label: "Fwd" },
  { key: "Lifting", label: "Lift" },
  { key: "Carrying", label: "Carry" },
  { key: "Repetitive Movements", label: "Rep" },
  { key: "Concentration", label: "Conc" },
  { key: "Stress Tolerance", label: "Stress" },
  { key: "Work Pace", label: "Pace" },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find demand detail by key, with fallback for missing data
 */
function getDemandDetail(
  demandDetails: DemandDetail[],
  demandKey: string
): DemandDetail {
  const found = demandDetails.find((d) => d.demand === demandKey);
  if (found) return found;

  // Fallback for missing data - assume never required, suitable
  return {
    demand: demandKey,
    frequency: "never",
    capability: "not_assessed",
    match: "suitable" as SuitabilityLevel,
  };
}

// ============================================================================
// Component
// ============================================================================

export function FunctionalAbilityMatrix({
  caseId,
  roleId,
}: FunctionalAbilityMatrixProps) {
  // Fetch matrix data
  const { data, isLoading, error } = useQuery<MatrixResponse>({
    queryKey: ["functional-ability-matrix", caseId, roleId],
    queryFn: async () => {
      const response = await fetch(
        `/api/functional-ability/matrix?caseId=${caseId}&roleId=${roleId}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Failed to load matrix"
        );
      }
      return response.json();
    },
    enabled: !!caseId && !!roleId,
  });

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Calculating suitability...
          </span>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load functional ability matrix"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No data or empty duties
  if (!data?.data?.duties || data.data.duties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Functional Ability Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No duties found for this role. Add duties in the Admin section to
            see suitability analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { duties, warnings } = data.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Functional Ability Matrix</CardTitle>
        <CardDescription>
          Suitability preview for duty templates.{" "}
          <span className="text-green-600 font-medium">Green=Suitable</span>
          <span className="text-yellow-600 font-medium ml-2">
            Yellow=With Modification
          </span>
          <span className="text-red-600 font-medium ml-2">
            Red=Not Suitable
          </span>
        </CardDescription>

        {/* Warnings from calculation */}
        {warnings && warnings.length > 0 && (
          <Alert className="mt-2 bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        {/* Scrollable table container */}
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {/* Sticky duty name column */}
                <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[150px] font-semibold">
                  Duty
                </TableHead>

                {/* Demand category columns */}
                {DEMAND_COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    className="text-center text-xs px-1 w-12 font-medium"
                    title={col.key}
                  >
                    {col.label}
                  </TableHead>
                ))}

                {/* Overall suitability column */}
                <TableHead className="text-center font-semibold min-w-[100px]">
                  Overall
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {duties.map((duty) => (
                <TableRow key={duty.dutyId}>
                  {/* Sticky duty name cell */}
                  <TableCell className="sticky left-0 bg-white z-10 font-medium border-r">
                    <div>
                      <div>{duty.dutyName}</div>
                      {duty.isModifiable && (
                        <div className="text-xs text-muted-foreground">
                          Modifiable
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Demand suitability cells */}
                  {DEMAND_COLUMNS.map((col) => {
                    const detail = getDemandDetail(duty.demandDetails, col.key);
                    return (
                      <DemandCategoryCell
                        key={col.key}
                        demand={detail.demand}
                        frequency={detail.frequency}
                        capability={detail.capability}
                        match={detail.match}
                      />
                    );
                  })}

                  {/* Overall suitability cell */}
                  <TableCell
                    className={cn(
                      "text-center font-medium border-l",
                      getSuitabilityBgColor(duty.suitability)
                    )}
                  >
                    {formatSuitability(duty.suitability)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend and notes */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            Hover over cells to see detailed suitability information. This is a
            preview based on current medical restrictions and duty templates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default FunctionalAbilityMatrix;
