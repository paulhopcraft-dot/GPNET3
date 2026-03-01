/**
 * PlanDetailView
 * Complete RTW plan display composing all section components
 * Implements OUT-01 through OUT-06
 */

import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlanSummaryHeader } from "./PlanSummaryHeader";
import { MedicalConstraintsCard } from "./MedicalConstraintsCard";
import { ScheduleSection } from "./ScheduleSection";
import { DutiesSection } from "./DutiesSection";
import { FunctionalAbilityMatrix } from "./FunctionalAbilityMatrix";
import { ManagerEmailSection } from "./ManagerEmailSection";

interface PlanDetailViewProps {
  planId: string;
  showPrintControls?: boolean;
  showEmailSection?: boolean;
}

interface Constraint {
  category: string;
  capability: "can" | "cannot" | "with_modifications" | "not_assessed";
  notes?: string | null;
}

interface PlanDetailsResponse {
  success: boolean;
  data: {
    plan: {
      id: string;
      caseId: string;
      roleId: string;
      planType: string;
      status: string;
      startDate: string;
      restrictionReviewDate: string | null;
    };
    schedule: Array<{
      weekNumber: number;
      hoursPerDay: number;
      daysPerWeek: number;
    }>;
    duties: Array<{
      dutyId: string;
      dutyName: string;
      dutyDescription: string | null;
      suitability: string;
      modificationNotes: string | null;
      isIncluded: boolean;
      excludedReason: string | null;
    }>;
    workerCase: {
      id: string;
      workerName: string;
      company: string;
      dateOfInjury: string;
      workStatus: string;
    } | null;
    role: {
      id: string;
      name: string;
      description: string | null;
    } | null;
    restrictions: Constraint[] | null;
  };
}

export function PlanDetailView({
  planId,
  showEmailSection = true,
}: PlanDetailViewProps): JSX.Element {
  const { data, isLoading, error } = useQuery<PlanDetailsResponse>({
    queryKey: ["rtw-plan-detail", planId],
    queryFn: async () => {
      const response = await fetch(`/api/rtw-plans/${planId}/details`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load plan");
      }
      return response.json();
    },
    enabled: !!planId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading plan details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load plan"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.data) {
    return (
      <Alert>
        <AlertDescription>Plan not found</AlertDescription>
      </Alert>
    );
  }

  const { plan, schedule, duties, workerCase, role, restrictions } = data.data;
  const includedDuties = duties.filter(d => d.isIncluded);
  const excludedDuties = duties.filter(d => !d.isIncluded);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* OUT-01: Plan summary with worker, role, injury */}
      {workerCase && role && (
        <PlanSummaryHeader
          workerName={workerCase.workerName}
          company={workerCase.company}
          dateOfInjury={workerCase.dateOfInjury}
          roleName={role.name}
          planType={plan.planType}
          planStatus={plan.status as "draft" | "pending" | "approved" | "rejected"}
          startDate={plan.startDate}
        />
      )}

      {/* OUT-02: Medical constraints */}
      <MedicalConstraintsCard
        constraints={restrictions}
        restrictionReviewDate={plan.restrictionReviewDate}
      />

      {/* OUT-03: Physical demands matrix */}
      {workerCase && role && (
        <div className="plan-section">
          <FunctionalAbilityMatrix
            caseId={plan.caseId}
            roleId={plan.roleId}
          />
        </div>
      )}

      {/* OUT-05: Proposed schedule */}
      <ScheduleSection
        schedule={schedule}
        startDate={plan.startDate}
      />

      {/* OUT-04 & OUT-06: Duties (proposed and excluded) */}
      <DutiesSection
        includedDuties={includedDuties.map(d => ({
          dutyId: d.dutyId,
          dutyName: d.dutyName,
          suitability: d.suitability as "suitable" | "suitable_with_modification",
          modificationNotes: d.modificationNotes,
        }))}
        excludedDuties={excludedDuties.map(d => ({
          dutyId: d.dutyId,
          dutyName: d.dutyName,
          excludedReason: d.excludedReason,
        }))}
      />

      {/* OUT-07 & OUT-08: Manager email (hide in print) */}
      {showEmailSection && (
        <ManagerEmailSection
          planId={planId}
          planStatus={plan.status}
        />
      )}
    </div>
  );
}
