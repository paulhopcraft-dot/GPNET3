/**
 * PlanGeneratorWizard
 * GEN-09: Preview plan (Step 4)
 * GEN-10: Save as draft (final action)
 *
 * 4-step wizard:
 * 1. Plan Type - Auto-selected with override
 * 2. Schedule - Week-by-week hours
 * 3. Duties - Select suitable duties
 * 4. Preview - Review and save
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePlanDraft, PlanDraftData } from "@/hooks/usePlanDraft";
import { PlanTypeSelector } from "./PlanTypeSelector";
import { ScheduleEditor } from "./ScheduleEditor";
import { DutySelector } from "./DutySelector";
import { PlanPreview } from "./PlanPreview";

interface Props {
  caseId: string;
  roleId: string;
  onComplete: (planId: string) => void;
  onCancel: () => void;
}

interface RecommendationResponse {
  recommendation: {
    planType: string;
    reason: string;
    confidence: string;
    warnings: string[];
  };
  defaultSchedule: Array<{
    weekNumber: number;
    hoursPerDay: number;
    daysPerWeek: number;
    totalHoursPerWeek: number;
    startDate: string;
    endDate: string;
    notes?: string;
  }>;
  restrictionReviewDate: string | null;
  restrictions: {
    maxHoursPerDay: number | null;
    maxDaysPerWeek: number | null;
  };
  duties: Array<{
    dutyId: string;
    dutyName: string;
    suitability: string;
    isIncluded: boolean;
    modificationNotes: string | null;
    excludedReason: string | null;
  }>;
}

const STEPS = [
  { id: 1, name: "Plan Type", description: "Auto-selected based on restrictions" },
  { id: 2, name: "Schedule", description: "Week-by-week hours" },
  { id: 3, name: "Duties", description: "Select suitable duties" },
  { id: 4, name: "Preview", description: "Review and save" },
];

export function PlanGeneratorWizard({ caseId, roleId, onComplete, onCancel }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Draft persistence
  const { draft, isLoaded, hasDraft, saveDraft, clearDraft } = usePlanDraft(caseId);

  // Form state
  const [planType, setPlanType] = useState<string>("graduated_return");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [schedule, setSchedule] = useState<
    Array<{
      weekNumber: number;
      hoursPerDay: number;
      daysPerWeek: number;
    }>
  >([]);
  const [selectedDutyIds, setSelectedDutyIds] = useState<string[]>([]);

  // Fetch recommendation
  const { data: recommendation, isLoading: isLoadingRecommendation } =
    useQuery<RecommendationResponse>({
      queryKey: ["rtw-plan-recommend", caseId, roleId],
      queryFn: async () => {
        const response = await fetch(
          `/api/rtw-plans/recommend?caseId=${encodeURIComponent(caseId)}&roleId=${encodeURIComponent(roleId)}`,
          { credentials: "include" }
        );
        if (!response.ok) throw new Error("Failed to load recommendation");
        const json = await response.json();
        return json.data;
      },
      enabled: !!caseId && !!roleId,
    });

  // Initialize from recommendation or draft
  useEffect(() => {
    if (!isLoaded) return;

    if (hasDraft && draft) {
      // Restore from draft
      setPlanType(draft.planType);
      setStartDate(draft.startDate.split("T")[0]);
      setSchedule(draft.schedule);
      setSelectedDutyIds(draft.selectedDutyIds);
      toast({
        title: "Draft Restored",
        description: "Your previous progress has been restored.",
      });
    } else if (recommendation) {
      // Initialize from recommendation
      setPlanType(recommendation.recommendation.planType);
      setSchedule(
        recommendation.defaultSchedule.map((s) => ({
          weekNumber: s.weekNumber,
          hoursPerDay: s.hoursPerDay,
          daysPerWeek: s.daysPerWeek,
        }))
      );
      setSelectedDutyIds(
        recommendation.duties.filter((d) => d.isIncluded).map((d) => d.dutyId)
      );
    }
  }, [isLoaded, hasDraft, draft, recommendation, toast]);

  // Auto-save draft on changes
  useEffect(() => {
    if (isLoaded && (planType || schedule.length > 0 || selectedDutyIds.length > 0)) {
      saveDraft({
        caseId,
        roleId,
        planType: planType as PlanDraftData["planType"],
        startDate,
        schedule,
        selectedDutyIds,
      });
    }
  }, [planType, startDate, schedule, selectedDutyIds, isLoaded, saveDraft, caseId, roleId]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/rtw-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseId,
          roleId,
          planType,
          startDate: new Date(startDate).toISOString(),
          schedule,
          selectedDutyIds,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save plan");
      }
      return response.json();
    },
    onSuccess: (data) => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["rtw-plans", caseId] });
      toast({
        title: "Plan Saved",
        description: "RTW plan created as draft.",
      });
      onComplete(data.planId);
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const progress = (currentStep / STEPS.length) * 100;

  if (isLoadingRecommendation || !isLoaded) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading plan recommendations...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Generate RTW Plan</CardTitle>
          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-sm text-muted-foreground">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={step.id === currentStep ? "font-medium text-foreground" : ""}
                >
                  {step.name}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && recommendation && (
            <PlanTypeSelector
              recommendation={recommendation.recommendation}
              selectedType={planType}
              onTypeChange={setPlanType}
              restrictions={recommendation.restrictions}
            />
          )}
          {currentStep === 2 && recommendation && (
            <ScheduleEditor
              schedule={schedule}
              onScheduleChange={setSchedule}
              startDate={startDate}
              onStartDateChange={setStartDate}
              restrictions={recommendation.restrictions}
              restrictionReviewDate={recommendation.restrictionReviewDate}
            />
          )}
          {currentStep === 3 && recommendation && (
            <DutySelector
              duties={recommendation.duties}
              selectedIds={selectedDutyIds}
              onSelectionChange={setSelectedDutyIds}
            />
          )}
          {currentStep === 4 && recommendation && (
            <PlanPreview
              planType={planType}
              startDate={startDate}
              schedule={schedule}
              selectedDuties={recommendation.duties.filter((d) =>
                selectedDutyIds.includes(d.dutyId)
              )}
              excludedDuties={recommendation.duties.filter((d) => !d.isIncluded)}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="space-x-2">
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || selectedDutyIds.length === 0}
            >
              {saveMutation.isPending ? "Saving..." : "Save as Draft"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
