# Phase 5: Plan Generator - Research

**Researched:** 2026-01-28
**Domain:** Automated RTW plan generation with graduated schedules, duty filtering, and preview/draft workflow
**Confidence:** HIGH

## Summary

Phase 5 implements automated generation of Return-to-Work (RTW) plans based on the suitability matrix calculated in Phase 4. The system must intelligently select plan type (normal hours, partial hours, graduated return) based on worker restrictions, generate week-by-week schedules with appropriate hour progressions, filter duties to include only suitable/modifiable ones, and respect medical restriction review dates that limit plan duration.

The core challenge is multi-dimensional: (1) auto-selecting plan type based on hours and duty restrictions, (2) generating graduated schedules that follow evidence-based progression patterns (4hrs → 6hrs → 8hrs over 2-4 weeks), (3) calculating total weekly hours and ensuring medical restrictions aren't exceeded, (4) implementing preview-before-save workflow with draft persistence, and (5) creating immutable version history for compliance.

Research confirms this is a domain with established patterns but no off-the-shelf libraries. RTW plan generation follows industry-standard graduated return schedules documented by WorkSafe Victoria and other compensation authorities. The 4-6-8 hour progression is evidence-based and widely adopted. The technical implementation uses React multi-step forms (well-established pattern with React Hook Form + Zod), database version control (already designed in schema), and sessionStorage for draft persistence (standard approach for temporary data).

**Primary recommendation:** Build a custom plan generation service that implements graduated schedule algorithms, use React Hook Form with multi-step wizard for UI, store plans in existing rtw_plans/rtw_plan_versions/rtw_plan_schedule tables, and persist drafts in sessionStorage until explicitly saved.

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | Current | Database operations for plan storage | Project standard, rtw_plans schema ready |
| TypeScript | 5.x | Type-safe schedule calculations | Ensures correctness of hour calculations and date logic |
| React 18 | Current | Multi-step plan wizard UI | Project standard |
| React Hook Form | 7.x | Multi-step form state management | Already in project, excellent for wizard flows |
| Zod | 3.x | Validation of plan parameters | Already in project, validates schedule constraints |
| TanStack Query | 4.x | Cache plan data and duty lists | Already used for server state |

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | Current | Dialog, Card, Button, Select components | Plan preview dialog, schedule display |
| Tailwind CSS | Current | Schedule visualization styling | Week-by-week schedule table |
| date-fns | 2.x | Date calculations for schedule | Week ranges, restriction review date checks |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom schedule algorithm | Third-party scheduler library | No suitable RTW-specific scheduler exists, medical compliance requires custom logic |
| sessionStorage for drafts | Database draft table | sessionStorage simpler for temporary data, database overkill for in-progress form data |
| Multi-step form | Single long form | Multi-step better UX for complex plan generation, follows industry wizard pattern |
| date-fns | Day.js or Luxon | date-fns already in project, sufficient for week calculations |

**Installation:**
No new packages required - all functionality can be built with existing stack.

## Architecture Patterns

### Recommended Project Structure

```
server/
├── services/
│   ├── functionalAbilityCalculator.ts  # EXISTS: Phase 4 suitability calculation
│   ├── planGenerator.ts                # NEW: Auto-generate plan based on restrictions
│   └── scheduleCalculator.ts           # NEW: Generate graduated schedules
├── routes/
│   └── rtwPlans.ts                     # NEW: Plan CRUD, preview, draft management
client/src/
├── components/
│   └── rtw/
│       ├── PlanGeneratorWizard.tsx     # NEW: Multi-step wizard
│       ├── PlanTypeSelector.tsx        # NEW: Auto-select + manual override
│       ├── ScheduleEditor.tsx          # NEW: Week-by-week hour editor
│       ├── DutySelector.tsx            # NEW: Select suitable duties
│       ├── PlanPreview.tsx             # NEW: Preview before save
│       └── DraftPlanManager.tsx        # NEW: Save/restore drafts
└── hooks/
    └── usePlanDraft.ts                 # NEW: sessionStorage draft persistence
```

### Pattern 1: Plan Type Auto-Selection Algorithm

**What:** Determine plan type (normal/partial/graduated) based on restriction analysis
**When to use:** GEN-01
**Example:**

```typescript
// server/services/planGenerator.ts

import type {
  FunctionalRestrictions,
  WorkerCase,
  RTWDutyDB,
  SuitabilityLevel
} from "@shared/schema";
import { calculateDutySuitability } from "./functionalAbilityCalculator";

export type PlanType = "normal_hours" | "partial_hours" | "graduated_return";

interface PlanTypeRecommendation {
  planType: PlanType;
  reason: string;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

interface DutySuitabilityResult {
  duty: RTWDutyDB;
  suitability: SuitabilityLevel;
  isIncluded: boolean;
  exclusionReason?: string;
}

/**
 * Auto-select RTW plan type based on worker restrictions
 *
 * Decision logic (GEN-01):
 * - Normal hours: Worker can perform full hours (8hrs/day, 5 days/week) AND all/most duties suitable
 * - Partial hours: Hours restricted but duties OK (e.g., max 6hrs/day, all duties suitable)
 * - Graduated return: Hours AND/OR duties need gradual increase (most common for injury recovery)
 *
 * Source: WorkSafe Victoria return to work guidance
 */
export function recommendPlanType(
  restrictions: FunctionalRestrictions,
  dutySuitability: DutySuitabilityResult[],
  workerCase: WorkerCase
): PlanTypeRecommendation {
  const warnings: string[] = [];

  // Check hour restrictions
  const maxHoursPerDay = restrictions.maxWorkHoursPerDay;
  const maxDaysPerWeek = restrictions.maxWorkDaysPerWeek;

  const hasHourRestrictions =
    (maxHoursPerDay !== null && maxHoursPerDay < 8) ||
    (maxDaysPerWeek !== null && maxDaysPerWeek < 5);

  // Check duty restrictions
  const suitableDuties = dutySuitability.filter(d => d.suitability === "suitable");
  const modificationDuties = dutySuitability.filter(d => d.suitability === "suitable_with_modification");
  const notSuitableDuties = dutySuitability.filter(d => d.suitability === "not_suitable");

  const totalDuties = dutySuitability.length;
  const suitablePercentage = totalDuties > 0 ? (suitableDuties.length / totalDuties) * 100 : 0;

  const hasDutyRestrictions = suitablePercentage < 80; // Less than 80% fully suitable

  // Decision tree

  // Case 1: No significant restrictions - Normal hours
  if (!hasHourRestrictions && !hasDutyRestrictions) {
    if (suitablePercentage === 100) {
      return {
        planType: "normal_hours",
        reason: "Worker can perform all duties at full hours (8 hours/day, 5 days/week)",
        confidence: "high",
        warnings: []
      };
    } else {
      warnings.push(`${modificationDuties.length} duties require modifications`);
      return {
        planType: "normal_hours",
        reason: `Worker can perform ${suitablePercentage.toFixed(0)}% of duties at full hours with minor modifications`,
        confidence: "medium",
        warnings
      };
    }
  }

  // Case 2: Hour restrictions only, duties OK - Partial hours
  if (hasHourRestrictions && !hasDutyRestrictions) {
    const recommendedHours = maxHoursPerDay || 6;
    const recommendedDays = maxDaysPerWeek || 5;

    return {
      planType: "partial_hours",
      reason: `Worker can perform duties but hours restricted to ${recommendedHours} hours/day, ${recommendedDays} days/week`,
      confidence: "high",
      warnings
    };
  }

  // Case 3: Duty restrictions OR significant combined restrictions - Graduated return
  if (hasDutyRestrictions || (hasHourRestrictions && suitablePercentage < 60)) {
    const reasons: string[] = [];

    if (hasHourRestrictions) {
      reasons.push(`Hours restricted to max ${maxHoursPerDay || 6}hrs/day`);
    }

    if (hasDutyRestrictions) {
      reasons.push(`Only ${suitablePercentage.toFixed(0)}% of duties fully suitable`);
    }

    if (notSuitableDuties.length > 0) {
      warnings.push(`${notSuitableDuties.length} duties not suitable - excluded from plan`);
    }

    return {
      planType: "graduated_return",
      reason: `Gradual increase recommended: ${reasons.join(", ")}`,
      confidence: "high",
      warnings
    };
  }

  // Case 4: Mixed restrictions - Graduated return (safest default)
  return {
    planType: "graduated_return",
    reason: "Mixed restrictions present - gradual return recommended for safety",
    confidence: "medium",
    warnings: ["Consider consulting treating practitioner for specific progression plan"]
  };
}
```

### Pattern 2: Graduated Schedule Generation

**What:** Generate week-by-week schedule with progressive hour increases
**When to use:** GEN-02, GEN-03, GEN-04
**Example:**

```typescript
// server/services/scheduleCalculator.ts

import type { FunctionalRestrictions } from "@shared/schema";
import { addWeeks, differenceInWeeks, isAfter } from "date-fns";

export interface WeekSchedule {
  weekNumber: number;
  hoursPerDay: number;
  daysPerWeek: number;
  totalHoursPerWeek: number;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

export interface ScheduleConfig {
  startDate: Date;
  restrictionReviewDate: Date | null;
  maxHoursPerDay: number | null;
  maxDaysPerWeek: number | null;
  targetHours?: number; // Goal hours per day (default 8)
  targetDays?: number;  // Goal days per week (default 5)
}

/**
 * Generate default graduated schedule (GEN-03)
 *
 * Standard progression based on WorkSafe Victoria guidance:
 * - Week 1: 4 hours/day, 3 days/week (12 hours/week)
 * - Week 2: 4 hours/day, 5 days/week (20 hours/week)
 * - Week 3: 6 hours/day, 5 days/week (30 hours/week)
 * - Week 4: 8 hours/day, 5 days/week (40 hours/week - full time)
 *
 * Sources:
 * - Sample GRTW schedules from major compensation authorities
 * - Standard 4→6→8 hour progression over 3-4 weeks
 * - Days increase first, then hours
 */
export function generateDefaultSchedule(config: ScheduleConfig): WeekSchedule[] {
  const {
    startDate,
    restrictionReviewDate,
    maxHoursPerDay,
    maxDaysPerWeek,
    targetHours = 8,
    targetDays = 5
  } = config;

  // Calculate maximum plan duration based on restriction review date
  const maxWeeks = restrictionReviewDate
    ? Math.min(differenceInWeeks(restrictionReviewDate, startDate), 12) // Max 12 weeks
    : 12; // Default to 12 weeks if no review date

  // Respect worker restrictions
  const hourCap = maxHoursPerDay || targetHours;
  const dayCap = maxDaysPerWeek || targetDays;

  const schedule: WeekSchedule[] = [];

  // Week 1: Start slow - 4 hours/day, 3 days/week
  const week1Hours = Math.min(4, hourCap);
  const week1Days = Math.min(3, dayCap);

  schedule.push({
    weekNumber: 1,
    hoursPerDay: week1Hours,
    daysPerWeek: week1Days,
    totalHoursPerWeek: week1Hours * week1Days,
    startDate: startDate,
    endDate: addWeeks(startDate, 1),
    notes: "Initial assessment week - monitor tolerance"
  });

  if (maxWeeks < 2) return schedule;

  // Week 2: Increase days - 4 hours/day, 5 days/week
  const week2Hours = Math.min(4, hourCap);
  const week2Days = Math.min(5, dayCap);

  schedule.push({
    weekNumber: 2,
    hoursPerDay: week2Hours,
    daysPerWeek: week2Days,
    totalHoursPerWeek: week2Hours * week2Days,
    startDate: addWeeks(startDate, 1),
    endDate: addWeeks(startDate, 2),
    notes: week2Days > week1Days ? "Increased days per week" : undefined
  });

  if (maxWeeks < 3) return schedule;

  // Week 3: Increase hours - 6 hours/day, 5 days/week
  const week3Hours = Math.min(6, hourCap);
  const week3Days = Math.min(5, dayCap);

  schedule.push({
    weekNumber: 3,
    hoursPerDay: week3Hours,
    daysPerWeek: week3Days,
    totalHoursPerWeek: week3Hours * week3Days,
    startDate: addWeeks(startDate, 2),
    endDate: addWeeks(startDate, 3),
    notes: week3Hours > week2Hours ? "Increased hours per day" : undefined
  });

  if (maxWeeks < 4) return schedule;

  // Week 4+: Target hours - 8 hours/day, 5 days/week (or restriction cap)
  const finalHours = Math.min(targetHours, hourCap);
  const finalDays = Math.min(targetDays, dayCap);

  // Generate remaining weeks at full capacity
  const remainingWeeks = Math.min(maxWeeks - 3, 9); // Up to 12 weeks total

  for (let i = 0; i < remainingWeeks; i++) {
    const weekNum = 4 + i;
    schedule.push({
      weekNumber: weekNum,
      hoursPerDay: finalHours,
      daysPerWeek: finalDays,
      totalHoursPerWeek: finalHours * finalDays,
      startDate: addWeeks(startDate, weekNum - 1),
      endDate: addWeeks(startDate, weekNum),
      notes: i === 0 ? "Target hours reached" : undefined
    });
  }

  return schedule;
}

/**
 * Validate custom schedule against restrictions (GEN-04)
 */
export function validateCustomSchedule(
  schedule: WeekSchedule[],
  restrictions: FunctionalRestrictions,
  restrictionReviewDate: Date | null
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const maxHours = restrictions.maxWorkHoursPerDay;
  const maxDays = restrictions.maxWorkDaysPerWeek;

  schedule.forEach((week) => {
    // Check hour restrictions
    if (maxHours !== null && week.hoursPerDay > maxHours) {
      errors.push(`Week ${week.weekNumber}: ${week.hoursPerDay} hours/day exceeds restriction of ${maxHours} hours/day`);
    }

    // Check day restrictions
    if (maxDays !== null && week.daysPerWeek > maxDays) {
      errors.push(`Week ${week.weekNumber}: ${week.daysPerWeek} days/week exceeds restriction of ${maxDays} days/week`);
    }

    // Check restriction review date (GEN-08)
    if (restrictionReviewDate && isAfter(week.endDate, restrictionReviewDate)) {
      errors.push(`Week ${week.weekNumber}: Schedule extends past restriction review date ${restrictionReviewDate.toISOString().split('T')[0]}`);
    }
  });

  // Check progression is gradual (safety check)
  for (let i = 1; i < schedule.length; i++) {
    const prev = schedule[i - 1];
    const curr = schedule[i];

    const hourIncrease = curr.hoursPerDay - prev.hoursPerDay;
    const dayIncrease = curr.daysPerWeek - prev.daysPerWeek;

    // Allow decrease (flexibility) or small increases (2 hours or 2 days max per week)
    if (hourIncrease > 2) {
      errors.push(`Week ${curr.weekNumber}: Hours increased by ${hourIncrease} from previous week - max 2 hours/week increase recommended`);
    }

    if (dayIncrease > 2) {
      errors.push(`Week ${curr.weekNumber}: Days increased by ${dayIncrease} from previous week - max 2 days/week increase recommended`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate total weekly hours (GEN-07)
 */
export function calculateWeeklyHours(hoursPerDay: number, daysPerWeek: number): number {
  return hoursPerDay * daysPerWeek;
}
```

### Pattern 3: Duty Filtering and Selection

**What:** Filter duties based on suitability, include only suitable/with-modification
**When to use:** GEN-05, GEN-06
**Example:**

```typescript
// server/services/planGenerator.ts (continued)

import type { RTWDutyDB, InsertRTWPlanDuty } from "@shared/schema";

interface DutyForPlan {
  dutyId: string;
  dutyName: string;
  suitability: SuitabilityLevel;
  modificationNotes: string | null;
  excludedReason: string | null;
  isIncluded: boolean;
}

/**
 * Filter duties for inclusion in RTW plan (GEN-05, GEN-06)
 *
 * Inclusion rules:
 * - "suitable" = always include
 * - "suitable_with_modification" = include with modification notes
 * - "not_suitable" = exclude with documented reason
 */
export function filterDutiesForPlan(
  dutySuitability: DutySuitabilityResult[],
  includeModifications: boolean = true
): DutyForPlan[] {
  return dutySuitability.map(({ duty, suitability }) => {
    // Suitable - include without modifications
    if (suitability === "suitable") {
      return {
        dutyId: duty.id,
        dutyName: duty.name,
        suitability,
        modificationNotes: null,
        excludedReason: null,
        isIncluded: true
      };
    }

    // Suitable with modifications - include if flag enabled
    if (suitability === "suitable_with_modification") {
      if (includeModifications) {
        return {
          dutyId: duty.id,
          dutyName: duty.name,
          suitability,
          modificationNotes: "Requires workplace modifications - see suitability assessment",
          excludedReason: null,
          isIncluded: true
        };
      } else {
        return {
          dutyId: duty.id,
          dutyName: duty.name,
          suitability,
          modificationNotes: null,
          excludedReason: "Modifications not available at this time",
          isIncluded: false
        };
      }
    }

    // Not suitable - exclude with reason
    return {
      dutyId: duty.id,
      dutyName: duty.name,
      suitability,
      modificationNotes: null,
      excludedReason: `Duty demands exceed worker functional restrictions - see suitability assessment for details`,
      isIncluded: false
    };
  });
}

/**
 * Generate plan duty records for database (GEN-05, GEN-06)
 */
export function generatePlanDuties(
  planVersionId: string,
  filteredDuties: DutyForPlan[]
): InsertRTWPlanDuty[] {
  return filteredDuties.map(duty => ({
    planVersionId,
    dutyId: duty.dutyId,
    suitability: duty.suitability,
    modificationNotes: duty.modificationNotes,
    excludedReason: duty.excludedReason,
    manuallyOverridden: false,
    overrideReason: null,
    overriddenBy: null
  }));
}
```

### Pattern 4: Multi-Step Wizard with Preview

**What:** React multi-step form with preview before save
**When to use:** GEN-09, GEN-10
**Example:**

```tsx
// client/src/components/rtw/PlanGeneratorWizard.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePlanDraft } from "@/hooks/usePlanDraft";
import { PlanTypeSelector } from "./PlanTypeSelector";
import { ScheduleEditor } from "./ScheduleEditor";
import { DutySelector } from "./DutySelector";
import { PlanPreview } from "./PlanPreview";

const planSchema = z.object({
  caseId: z.string().uuid(),
  roleId: z.string().uuid(),
  planType: z.enum(["normal_hours", "partial_hours", "graduated_return"]),
  startDate: z.date(),
  schedule: z.array(z.object({
    weekNumber: z.number(),
    hoursPerDay: z.number().min(1).max(12),
    daysPerWeek: z.number().min(1).max(7),
  })),
  selectedDuties: z.array(z.string().uuid()),
});

type PlanFormData = z.infer<typeof planSchema>;

interface Props {
  caseId: string;
  roleId: string;
  onComplete: (planId: string) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, name: "Plan Type", description: "Select plan type based on restrictions" },
  { id: 2, name: "Schedule", description: "Configure work hours progression" },
  { id: 3, name: "Duties", description: "Select suitable duties" },
  { id: 4, name: "Preview", description: "Review and save plan" },
];

export function PlanGeneratorWizard({ caseId, roleId, onComplete, onCancel }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Draft persistence (auto-save to sessionStorage)
  const { draft, saveDraft, clearDraft } = usePlanDraft(caseId);

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: draft || {
      caseId,
      roleId,
      planType: "graduated_return",
      startDate: new Date(),
      schedule: [],
      selectedDuties: [],
    },
  });

  // Auto-save draft on form changes
  const formValues = form.watch();

  const handleNext = async () => {
    // Validate current step
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    // Save draft
    saveDraft(formValues);

    // Move to next step
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const savePlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const response = await fetch("/api/rtw-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save plan");
      }

      return response.json();
    },
    onSuccess: (data) => {
      clearDraft(); // Clear draft after successful save
      queryClient.invalidateQueries({ queryKey: ["rtw-plans", caseId] });
      toast({
        title: "Plan Saved",
        description: "RTW plan created successfully",
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

  const handleSave = () => {
    form.handleSubmit((data) => {
      savePlanMutation.mutate(data);
    })();
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
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

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <PlanTypeSelector form={form} caseId={caseId} />
          )}

          {currentStep === 2 && (
            <ScheduleEditor form={form} caseId={caseId} />
          )}

          {currentStep === 3 && (
            <DutySelector form={form} caseId={caseId} roleId={roleId} />
          )}

          {currentStep === 4 && (
            <PlanPreview formData={formValues} />
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
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={savePlanMutation.isPending}>
              {savePlanMutation.isPending ? "Saving..." : "Save Plan"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 5: Draft Persistence with sessionStorage

**What:** Auto-save form progress to sessionStorage for recovery
**When to use:** GEN-10, user abandons form and returns
**Example:**

```typescript
// client/src/hooks/usePlanDraft.ts

import { useEffect, useState } from "react";

interface PlanDraft {
  caseId: string;
  planType: string;
  startDate: string;
  schedule: any[];
  selectedDuties: string[];
  lastSaved: string;
}

/**
 * Hook for persisting RTW plan drafts in sessionStorage
 *
 * sessionStorage vs localStorage rationale:
 * - sessionStorage: Cleared when tab closes (prevents stale drafts)
 * - Perfect for in-progress form data
 * - Survives page refresh but not tab close
 *
 * Source: React state persistence best practices 2026
 */
export function usePlanDraft(caseId: string) {
  const storageKey = `rtw-plan-draft-${caseId}`;
  const [draft, setDraft] = useState<PlanDraft | null>(null);

  // Load draft on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setDraft(parsed);
      } catch (err) {
        console.error("Failed to parse draft:", err);
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  const saveDraft = (data: Partial<PlanDraft>) => {
    const updated: PlanDraft = {
      caseId,
      planType: data.planType || "",
      startDate: data.startDate || new Date().toISOString(),
      schedule: data.schedule || [],
      selectedDuties: data.selectedDuties || [],
      lastSaved: new Date().toISOString(),
    };

    sessionStorage.setItem(storageKey, JSON.stringify(updated));
    setDraft(updated);
  };

  const clearDraft = () => {
    sessionStorage.removeItem(storageKey);
    setDraft(null);
  };

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft: draft !== null,
  };
}
```

### Anti-Patterns to Avoid

- **Hardcoding schedule progression**: Use configurable week patterns that can be adjusted as medical guidance evolves
- **Ignoring restriction review dates**: Plans extending past review date are invalid - must enforce date checks
- **Including not-suitable duties**: Only suitable/with-modification duties should be included - not-suitable = unsafe
- **Losing draft data on navigation**: Use sessionStorage to persist form state across page refreshes
- **Creating plans without preview**: Always show preview before saving - allows user to catch errors
- **Mutating plan versions**: Once saved, plans are immutable - create new version for changes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-step form state | Custom wizard state machine | React Hook Form with multi-step pattern | Well-established pattern, handles validation, easy to test |
| Draft persistence | Custom storage layer | sessionStorage with JSON serialization | Standard browser API, survives refresh, auto-cleared on tab close |
| Date calculations | Custom week arithmetic | date-fns (already in project) | Handles edge cases (DST, leap years, week boundaries) |
| Schedule validation | Manual constraint checks | Zod schema with custom refinements | Type-safe, composable, generates error messages |
| Plan versioning | Custom version control | Existing rtw_plan_versions table pattern | Database-level immutability, audit trail built-in |

**Key insight:** The plan generation logic is custom (no library for medical RTW planning), but all supporting infrastructure (forms, persistence, validation, versioning) follows well-established patterns already in the project.

## Common Pitfalls

### Pitfall 1: Plan Duration Exceeds Restriction Review Date

**What goes wrong:** Generated schedule extends past the date when medical restrictions need review
**Why it happens:** Algorithm doesn't check restrictionReviewDate when generating week ranges
**How to avoid:** Validate schedule end date against restrictionReviewDate, truncate schedule if necessary (GEN-08)
**Warning signs:** Schedules showing weeks beyond restriction review, plans approved but medical coverage lapsed

### Pitfall 2: Including Not-Suitable Duties

**What goes wrong:** Plan includes duties marked "not_suitable", creating unsafe work conditions
**Why it happens:** UI allows selecting all duties without filtering by suitability
**How to avoid:** Server-side validation rejects plans with not-suitable duties, UI pre-filters to suitable/with-modification only
**Warning signs:** Worker re-injury on approved duties, audit findings of unsafe duty assignments

### Pitfall 3: Graduated Schedule Too Aggressive

**What goes wrong:** Hours increase from 4 to 8 in one week, worker cannot tolerate rapid increase
**Why it happens:** Custom schedules not validated against safe progression limits
**How to avoid:** Validate max 2 hour/day increase per week, warn if progression exceeds recommendations
**Warning signs:** Plans failing within first 2 weeks, workers reporting excessive fatigue

### Pitfall 4: Lost Draft Data

**What goes wrong:** User spends 15 minutes configuring plan, accidentally closes tab, loses all progress
**Why it happens:** No draft persistence, form state only in React component
**How to avoid:** Auto-save to sessionStorage on every form change, restore on mount if draft exists
**Warning signs:** User complaints about lost work, high wizard abandonment rate

### Pitfall 5: Partial Hours vs Graduated Confusion

**What goes wrong:** System selects "partial_hours" when "graduated_return" appropriate, or vice versa
**Why it happens:** Decision logic doesn't consider both hour AND duty restrictions together
**How to avoid:** Clear decision tree: partial_hours = fixed reduced hours with no duty restrictions, graduated = progressive increase needed
**Warning signs:** Plans not matching medical recommendations, clinicians overriding plan type frequently

### Pitfall 6: Total Weekly Hours Exceed Restrictions

**What goes wrong:** Schedule shows 6 hours/day × 5 days = 30 hours/week, but restriction says max 25 hours/week
**Why it happens:** Validation checks daily hours but not total weekly hours
**How to avoid:** Calculate and validate total weekly hours against maxWorkHoursPerWeek if present
**Warning signs:** Plans approved but exceed worker capacity, early plan failures

## Code Examples

### API Endpoint - Generate Plan

```typescript
// server/routes/rtwPlans.ts

import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middleware/auth";
import { storage } from "../storage";
import { recommendPlanType, filterDutiesForPlan } from "../services/planGenerator";
import { generateDefaultSchedule, validateCustomSchedule } from "../services/scheduleCalculator";
import { calculateDutySuitability } from "../services/functionalAbilityCalculator";
import { auditLogger } from "../services/auditLogger";

const router = Router();

const createPlanSchema = z.object({
  caseId: z.string().uuid(),
  roleId: z.string().uuid(),
  planType: z.enum(["normal_hours", "partial_hours", "graduated_return"]),
  startDate: z.string().datetime(),
  schedule: z.array(z.object({
    weekNumber: z.number(),
    hoursPerDay: z.number(),
    daysPerWeek: z.number(),
  })),
  selectedDutyIds: z.array(z.string().uuid()),
});

/**
 * POST /api/rtw-plans
 * Create new RTW plan (GEN-10: save as draft)
 */
router.post("/", authorize(["admin", "clinician"]), async (req, res) => {
  try {
    const planData = createPlanSchema.parse(req.body);
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    // Get case and restrictions
    const workerCase = await storage.getCaseById(planData.caseId, organizationId);
    if (!workerCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    const restrictions = await storage.getCurrentRestrictions(planData.caseId, organizationId);
    if (!restrictions) {
      return res.status(400).json({ error: "No current restrictions - cannot generate plan" });
    }

    // Validate schedule against restrictions
    const scheduleValidation = validateCustomSchedule(
      planData.schedule.map(s => ({
        ...s,
        totalHoursPerWeek: s.hoursPerDay * s.daysPerWeek,
        startDate: new Date(planData.startDate),
        endDate: new Date(planData.startDate),
      })),
      restrictions,
      restrictions.nextExaminationDate
    );

    if (!scheduleValidation.valid) {
      return res.status(400).json({
        error: "Schedule validation failed",
        details: scheduleValidation.errors,
      });
    }

    // Validate duties are suitable
    const duties = await storage.db
      .select()
      .from(rtwDuties)
      .where(and(
        eq(rtwDuties.roleId, planData.roleId),
        inArray(rtwDuties.id, planData.selectedDutyIds)
      ));

    const dutySuitability = duties.map(duty => {
      const result = calculateDutySuitability(duty.demands, restrictions, duty.isModifiable);
      return {
        duty,
        suitability: result.overallSuitability,
        isIncluded: planData.selectedDutyIds.includes(duty.id)
      };
    });

    const notSuitableDuties = dutySuitability.filter(
      d => d.isIncluded && d.suitability === "not_suitable"
    );

    if (notSuitableDuties.length > 0) {
      return res.status(400).json({
        error: "Plan includes not-suitable duties",
        details: notSuitableDuties.map(d => d.duty.name),
      });
    }

    // Create plan with version 1
    const [plan] = await storage.db
      .insert(rtwPlans)
      .values({
        organizationId,
        caseId: planData.caseId,
        roleId: planData.roleId,
        planType: planData.planType,
        status: "draft", // GEN-10: Save as draft
        version: 1,
        startDate: new Date(planData.startDate),
        restrictionReviewDate: restrictions.nextExaminationDate,
        createdBy: userId,
      })
      .returning();

    // Create version record
    const [planVersion] = await storage.db
      .insert(rtwPlanVersions)
      .values({
        planId: plan.id,
        version: 1,
        dataJson: planData,
        createdBy: userId,
        changeReason: "Initial plan creation",
      })
      .returning();

    // Create plan duties
    const filteredDuties = filterDutiesForPlan(dutySuitability, true);
    const planDuties = generatePlanDuties(planVersion.id, filteredDuties);

    await storage.db.insert(rtwPlanDuties).values(planDuties);

    // Create schedule records
    const scheduleRecords = planData.schedule.map(week => ({
      planVersionId: planVersion.id,
      weekNumber: week.weekNumber,
      hoursPerDay: week.hoursPerDay.toString(),
      daysPerWeek: week.daysPerWeek,
      dutiesJson: [],
    }));

    await storage.db.insert(rtwPlanSchedule).values(scheduleRecords);

    // Audit log
    await auditLogger.logEvent({
      eventType: "rtw_plan_created",
      userId,
      organizationId,
      resourceType: "rtw_plan",
      resourceId: plan.id,
      metadata: {
        caseId: planData.caseId,
        planType: planData.planType,
        weekCount: planData.schedule.length,
        dutyCount: planData.selectedDutyIds.length,
      },
    });

    res.json({
      success: true,
      planId: plan.id,
      versionId: planVersion.id,
      message: "RTW plan created as draft",
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.errors,
      });
    }
    console.error("Plan creation failed:", err);
    res.status(500).json({ error: "Failed to create plan" });
  }
});

/**
 * GET /api/rtw-plans/recommend
 * Get recommended plan type and schedule (GEN-01, GEN-02, GEN-03)
 */
router.get("/recommend", authorize(), async (req, res) => {
  try {
    const { caseId, roleId } = req.query as { caseId: string; roleId: string };
    const organizationId = req.user!.organizationId;

    // Get restrictions
    const restrictions = await storage.getCurrentRestrictions(caseId, organizationId);
    if (!restrictions) {
      return res.status(404).json({ error: "No current restrictions" });
    }

    // Get duty suitability
    const duties = await storage.db
      .select()
      .from(rtwDuties)
      .where(and(
        eq(rtwDuties.roleId, roleId),
        eq(rtwDuties.organizationId, organizationId),
        eq(rtwDuties.isActive, true)
      ));

    const dutySuitability = duties.map(duty => {
      const result = calculateDutySuitability(duty.demands, restrictions, duty.isModifiable);
      return {
        duty,
        suitability: result.overallSuitability,
        isIncluded: result.overallSuitability !== "not_suitable"
      };
    });

    // Get recommendation
    const recommendation = recommendPlanType(restrictions, dutySuitability, null);

    // Generate default schedule
    const defaultSchedule = generateDefaultSchedule({
      startDate: new Date(),
      restrictionReviewDate: restrictions.nextExaminationDate,
      maxHoursPerDay: restrictions.maxWorkHoursPerDay,
      maxDaysPerWeek: restrictions.maxWorkDaysPerWeek,
    });

    res.json({
      recommendation,
      defaultSchedule,
      dutySuitability: dutySuitability.map(d => ({
        dutyId: d.duty.id,
        dutyName: d.duty.name,
        suitability: d.suitability,
        isIncluded: d.isIncluded,
      })),
    });

  } catch (err) {
    console.error("Recommendation failed:", err);
    res.status(500).json({ error: "Failed to generate recommendation" });
  }
});

export default router;
```

### Schedule Preview Component

```tsx
// client/src/components/rtw/PlanPreview.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Clock, Briefcase } from "lucide-react";
import type { WeekSchedule } from "@shared/schema";

interface Props {
  formData: {
    planType: string;
    startDate: Date;
    schedule: WeekSchedule[];
    selectedDuties: string[];
  };
}

export function PlanPreview({ formData }: Props) {
  const totalWeeks = formData.schedule.length;
  const maxHours = Math.max(...formData.schedule.map(w => w.hoursPerDay));
  const totalDuties = formData.selectedDuties.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {formData.planType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {totalWeeks} weeks (up to {maxHours} hrs/day)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Duties Included
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {totalDuties} duties
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Week-by-Week Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead>Hours/Day</TableHead>
                <TableHead>Days/Week</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.schedule.map((week) => (
                <TableRow key={week.weekNumber}>
                  <TableCell className="font-medium">Week {week.weekNumber}</TableCell>
                  <TableCell>{week.hoursPerDay}</TableCell>
                  <TableCell>{week.daysPerWeek}</TableCell>
                  <TableCell className="font-medium">
                    {week.totalHoursPerWeek} hours
                  </TableCell>
                  <TableCell>
                    {week.notes && (
                      <Badge variant="outline">{week.notes}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h4 className="font-medium text-yellow-900 mb-2">Review Before Saving</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>✓ Schedule respects medical restrictions</li>
          <li>✓ Only suitable duties included</li>
          <li>✓ Gradual progression for safe recovery</li>
          <li>✓ Plan saved as draft (can be edited before submission)</li>
        </ul>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual plan creation | Auto-generated plans with wizard | 2020s (digital transformation) | Faster plan creation, consistent with medical restrictions, fewer errors |
| Fixed 4-week graduated schedule | Flexible schedule respecting restriction review dates | Recent (patient-centered care) | Plans match individual recovery timelines, no over-commitment |
| Include all duties by default | Pre-filter based on suitability | Phase 4 implementation | Only safe duties included, reduced re-injury risk |
| Single form page | Multi-step wizard with preview | Modern UX patterns (2024-2026) | Better UX for complex forms, reduced abandonment, catch errors before save |
| Lost progress on navigation | sessionStorage draft persistence | React best practices (2025-2026) | User progress preserved, reduced frustration |
| Mutable plan records | Immutable versions with audit trail | Database best practices | Full change history, compliance with WorkSafe record-keeping |

**Deprecated/outdated:**
- Manual duty selection without suitability filtering - Modern systems pre-filter based on functional ability matrix
- Single-page long forms for plan generation - Multi-step wizards provide better UX and validation
- localStorage for temporary drafts - sessionStorage preferred for in-session temporary data (auto-cleared)

## Open Questions

1. **Should plan type auto-selection be overridable by clinicians?**
   - What we know: Algorithm makes recommendation based on restrictions and duty suitability
   - What's unclear: If clinician has additional context (not in system), should they override?
   - Recommendation: Allow manual override with mandatory reason field, log in audit trail

2. **How to handle mid-plan restriction changes?**
   - What we know: Medical restrictions can be updated if new certificate received
   - What's unclear: Should existing plan auto-update or require new version creation?
   - Recommendation: Create new plan version, mark old version as "superseded", maintain immutability

3. **Should custom schedules have maximum deviation from default?**
   - What we know: Default schedule is evidence-based (4→6→8 hours)
   - What's unclear: If clinician creates custom schedule, should system enforce limits?
   - Recommendation: Warn if deviation exceeds 50% (e.g., jumping 4→8 without 6), but allow override with reason

4. **What happens if no duties are suitable?**
   - What we know: Filter includes only suitable/with-modification duties
   - What's unclear: If all duties not-suitable, can plan be created?
   - Recommendation: Block plan creation, display message "No suitable duties - consult treating practitioner for alternative role"

5. **Should graduated plans auto-adjust if restriction review date is near?**
   - What we know: Plan cannot extend past restriction review date
   - What's unclear: If review date is in 2 weeks, should system shorten default 4-week schedule?
   - Recommendation: Yes - truncate schedule to fit within review date, add note "Shortened due to upcoming restriction review"

## Sources

### Primary (HIGH confidence)

- Existing codebase:
  - `shared/schema.ts` (lines 1739-1824) - RTW plans, versions, duties, schedule schema
  - `server/services/functionalAbilityCalculator.ts` - Phase 4 suitability calculation
  - `client/src/components/ui/form.tsx` - React Hook Form integration
  - `client/src/pages/admin/duties/DutyForm.tsx` - Existing form patterns with react-hook-form + Zod

- RTW plan guidance:
  - [WorkSafe Victoria - Return to Work](https://www.worksafe.vic.gov.au/return-to-work) - Employer obligations and plan requirements
  - [WorkSafe Victoria - Returning with Limited Capacity](https://www.worksafe.vic.gov.au/returning-limited-capacity-or-ability) - Graduated return guidance
  - [WorkSafe Victoria - Planning Return to Work](https://www.worksafe.vic.gov.au/planning-your-workers-return-work) - Plan documentation requirements

- Graduated return schedules:
  - [Heka - Phased Return to Work](https://www.hekahappy.com/blog/phased-return-to-work) - 4-6-8 hour progression patterns
  - [Personio - Phased Return to Work Guide](https://www.personio.com/hr-lexicon/phased-return-to-work/) - Week-by-week schedule structure
  - [Gowan Health - Managing Return to Work](https://www.gowanhealth.com/blog/managing-employee-return-to-work-best-practices-for-creating-and-delivering-effective-plans) - Best practices for effective plans

- Medical review timing:
  - [WSIB - RTW Assessments and Plans](https://www.wsib.ca/en/operational-policy-manual/rtw-assessments-and-plans) - Plan duration tied to medical reviews
  - [University of Rochester - Return to Work Program](https://www.rochester.edu/human-resources/benefits/leave-disability/return-to-work/) - 30-day evaluation cycles, 90-day transitional assignments

### Secondary (MEDIUM confidence)

- React multi-step forms:
  - [LogRocket - Building Reusable Multi-Step Form](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/) - React Hook Form + Zod multi-step pattern (Feb 2025)
  - [Build with Matija - Multi-Step Forms Tutorial](https://www.buildwithmatija.com/blog/master-multi-step-forms-build-a-dynamic-react-form-in-6-simple-steps) - Zustand + Zod + Shadcn pattern
  - [Medium - Multi-Step Form with Wizard Pattern](https://medium.com/@vandanpatel29122001/react-building-a-multi-step-form-with-wizard-pattern-85edec21f793) - Architecture patterns

- Draft persistence:
  - [CoreUI - Persist State with sessionStorage](https://coreui.io/answers/how-to-persist-state-with-sessionstorage-in-react/) - sessionStorage for temporary data (Nov 2025)
  - [Medium - Mastering State Persistence with Local Storage](https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react-a-complete-guide-1cf3f56ab15c) - localStorage vs sessionStorage
  - [UXPin - React State Persistence](https://www.uxpin.com/studio/blog/how-to-use-react-for-state-persistence/) - Persistence strategies (Nov 2025)

- Form workflow patterns:
  - [Simple Table - Editable React Data Grids](https://www.simple-table.com/blog/editable-react-data-grids-in-cell-vs-form-editing) - Form-based editing with preview
  - [DEV - Best Design Pattern for Managing Forms](https://dev.to/spencerpauly/the-1-best-design-pattern-for-managing-forms-in-react-4215) - React Hook Form efficiency

### Tertiary (LOW confidence)

- Schedule optimization:
  - General RTW program samples show variation in progression (2-6 weeks typical), but no algorithmic optimization libraries exist
  - WorkSafe BC and WSIB templates provide examples but not prescriptive algorithms

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All required libraries already in project (React Hook Form, Zod, date-fns)
- Architecture: HIGH - Database schema ready (rtw_plans/versions/duties/schedule), Phase 4 suitability available
- Plan generation logic: MEDIUM-HIGH - Based on RTW industry guidance, but algorithm is custom implementation
- Multi-step form patterns: HIGH - Well-established React Hook Form + Zod pattern with recent tutorials
- Draft persistence: HIGH - sessionStorage approach standard and well-documented
- Pitfalls: HIGH - Based on analysis of schedule validation, duty filtering, and form UX requirements

**Research date:** 2026-01-28
**Valid until:** 30 days (moderate churn - React patterns stable, RTW guidance stable, but UI libraries update frequently)
