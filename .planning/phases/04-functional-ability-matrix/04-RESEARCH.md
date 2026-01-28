# Phase 4: Functional Ability Matrix - Research

**Researched:** 2026-01-28
**Domain:** Functional ability matrix comparison algorithm and UI for matching worker restrictions against duty demands
**Confidence:** HIGH

## Summary

Phase 4 implements the core matching algorithm that compares worker functional restrictions (from Phase 3) against job duty demands (from Phase 2) to calculate suitability ratings. This is a decision-support system used in occupational health to determine which duties are safe for an injured worker to perform.

The challenge is multi-dimensional: (1) comparing categorical frequency values (never/occasionally/frequently/constantly) against capability levels (can/with_modifications/cannot/not_assessed), (2) comparing numeric weight limits, (3) generating actionable modification suggestions, (4) handling edge cases like missing data, and (5) allowing manual overrides with audit trails.

Research confirms this is a custom algorithm domain with no off-the-shelf libraries - the comparison logic must be hand-coded. However, the UI patterns (matrix visualization, color-coding) align with standard React data grid approaches already in use. The existing restrictionMapper.ts service provides a foundation for the "most restrictive wins" logic.

**Primary recommendation:** Build a custom FunctionalAbilityCalculator service that implements frequency-to-capability matching rules, store results in rtw_plan_duties table (already designed with suitability/override fields), and display in a custom React matrix component using existing shadcn/ui primitives.

## Standard Stack

### Core (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | Current | Database queries and storage | Project standard, rtw_plan_duties table ready |
| TypeScript | 5.x | Type-safe algorithm implementation | Ensures correctness of comparison logic |
| React 18 | Current | Matrix UI component | Project standard |
| TanStack Query | 4.x | Cache matrix calculations | Already used for server state |

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | Current | Color-coded cell styling | Green/yellow/red suitability indicators |
| shadcn/ui | Current | Table, Card, Badge components | Matrix structure |
| Zod | 3.x | Validation of override reasons | Input validation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom algorithm | Hungarian algorithm library | Hungarian algorithm for optimal assignment, but we need suitability scoring not optimal matching |
| Custom matrix UI | AG Grid / TanStack Table | Heavy libraries for a simple comparison matrix, existing approach is sufficient |
| Shadow table audit | Generic audit log table | Shadow table already exists (auditEvents), just need to use it |

**Installation:**
No new packages required - all functionality can be built with existing stack.

## Architecture Patterns

### Recommended Project Structure

```
server/
├── services/
│   ├── restrictionMapper.ts        # EXISTS: Combines restrictions (Phase 3)
│   ├── functionalAbilityCalculator.ts  # NEW: Core matching algorithm
│   └── modificationSuggester.ts    # NEW: Generate modification suggestions
├── routes/
│   └── functionalAbility.ts        # NEW: API for matrix calculation
client/src/
├── components/
│   └── rtw/
│       ├── FunctionalAbilityMatrix.tsx  # NEW: Matrix display
│       ├── DutySuitabilityRow.tsx       # NEW: Single duty row
│       └── OverrideReasonDialog.tsx     # NEW: Manual override UI
└── lib/
    └── suitabilityUtils.ts         # NEW: Color mapping, labels
```

### Pattern 1: Frequency-to-Capability Comparison Algorithm

**What:** Core matching logic that compares duty demand frequency against worker restriction capability
**When to use:** FAM-01, FAM-02, FAM-03, FAM-04, FAM-05, FAM-06
**Example:**

```typescript
// server/services/functionalAbilityCalculator.ts

import type {
  DemandFrequency,
  RestrictionCapability,
  FunctionalRestrictions,
  RTWDutyDemandsDB
} from "@shared/schema";

/**
 * U.S. Department of Labor frequency definitions:
 * - Never: Activity does not exist (0% of time)
 * - Occasionally: Up to 1/3 of time (0-33%)
 * - Frequently: 1/3 to 2/3 of time (33-67%)
 * - Constantly: 2/3 or more of time (67-100%)
 *
 * Source: https://www.dol.gov/sites/dolgov/files/owcp/dfec/regs/compliance/owcp-5c.pdf
 */

export type SuitabilityLevel = "suitable" | "suitable_with_modification" | "not_suitable";

interface DemandComparison {
  demand: string;
  frequency: DemandFrequency;
  capability: RestrictionCapability;
  match: SuitabilityLevel;
  reason: string;
}

interface SuitabilityResult {
  overallSuitability: SuitabilityLevel;
  demandComparisons: DemandComparison[];
  modificationSuggestions: string[];
  reasons: string[];
}

/**
 * Compare a single demand frequency against worker capability
 *
 * Logic:
 * - "cannot" restriction = not suitable (regardless of frequency)
 * - "can" restriction = suitable (regardless of frequency)
 * - "with_modifications" + low frequency (never/occasionally) = suitable with modification
 * - "with_modifications" + high frequency (frequently/constantly) = not suitable (can't modify most of the job)
 * - "not_assessed" = treat as unknown, mark for modification if demand exists
 */
function compareDemandToCapability(
  demandName: string,
  frequency: DemandFrequency,
  capability: RestrictionCapability
): DemandComparison {
  // No demand = always suitable
  if (frequency === "never") {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable",
      reason: "Demand not required"
    };
  }

  // Worker cannot perform = never suitable
  if (capability === "cannot") {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "not_suitable",
      reason: `Worker cannot perform ${demandName}, duty requires it ${frequency}`
    };
  }

  // Worker can perform = always suitable
  if (capability === "can") {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable",
      reason: "Worker can perform without restriction"
    };
  }

  // Worker can perform with modifications
  if (capability === "with_modifications") {
    // Low frequency demands (occasionally) can be modified
    if (frequency === "occasionally") {
      return {
        demand: demandName,
        frequency,
        capability,
        match: "suitable_with_modification",
        reason: `${demandName} required occasionally - can be modified or assisted`
      };
    }

    // High frequency demands (frequently/constantly) hard to modify
    if (frequency === "frequently" || frequency === "constantly") {
      return {
        demand: demandName,
        frequency,
        capability,
        match: "not_suitable",
        reason: `${demandName} required ${frequency} - too frequent to modify effectively`
      };
    }
  }

  // Not assessed = unknown risk, require modification consideration
  return {
    demand: demandName,
    frequency,
    capability,
    match: "suitable_with_modification",
    reason: `${demandName} capability not assessed - requires evaluation`
  };
}

/**
 * Compare weight limits for lifting/carrying
 */
function compareWeightLimit(
  demandName: string,
  dutyMaxKg: number | null,
  restrictionMaxKg: number | null,
  frequency: DemandFrequency,
  capability: RestrictionCapability
): DemandComparison {
  // If demand has no weight or frequency is never, weight limit doesn't matter
  if (!dutyMaxKg || frequency === "never") {
    return compareDemandToCapability(demandName, frequency, capability);
  }

  // If worker has no weight restriction, use capability only
  if (!restrictionMaxKg) {
    return compareDemandToCapability(demandName, frequency, capability);
  }

  // Compare weight limits
  if (restrictionMaxKg >= dutyMaxKg) {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable",
      reason: `Worker can ${demandName.toLowerCase()} up to ${restrictionMaxKg}kg (duty requires ${dutyMaxKg}kg)`
    };
  }

  // Worker's limit is below duty requirement
  const difference = dutyMaxKg - restrictionMaxKg;
  if (difference <= 5 && (frequency === "occasionally")) {
    return {
      demand: demandName,
      frequency,
      capability,
      match: "suitable_with_modification",
      reason: `${demandName} ${dutyMaxKg}kg exceeds worker limit ${restrictionMaxKg}kg by ${difference}kg - can use mechanical aids`
    };
  }

  return {
    demand: demandName,
    frequency,
    capability,
    match: "not_suitable",
    reason: `${demandName} ${dutyMaxKg}kg exceeds worker limit ${restrictionMaxKg}kg - difference too large to modify safely`
  };
}

/**
 * Calculate suitability for a single duty
 */
export function calculateDutySuitability(
  dutyDemands: RTWDutyDemandsDB,
  restrictions: FunctionalRestrictions,
  isModifiable: boolean
): SuitabilityResult {
  const comparisons: DemandComparison[] = [];

  // Physical demands
  comparisons.push(compareDemandToCapability("Sitting", dutyDemands.sitting, restrictions.sitting));
  comparisons.push(compareDemandToCapability("Standing", dutyDemands.standing, restrictions.standingWalking));
  comparisons.push(compareDemandToCapability("Walking", dutyDemands.walking, restrictions.standingWalking));
  comparisons.push(compareDemandToCapability("Bending", dutyDemands.bending, restrictions.bending));
  comparisons.push(compareDemandToCapability("Squatting", dutyDemands.squatting, restrictions.squatting));
  comparisons.push(compareDemandToCapability("Kneeling", dutyDemands.kneeling, restrictions.kneelingClimbing));
  comparisons.push(compareDemandToCapability("Twisting", dutyDemands.twisting, restrictions.twisting));
  comparisons.push(compareDemandToCapability("Reaching Overhead", dutyDemands.reachingOverhead, restrictions.reachingOverhead));
  comparisons.push(compareDemandToCapability("Reaching Forward", dutyDemands.reachingForward, restrictions.reachingForward));
  comparisons.push(compareDemandToCapability("Repetitive Movements", dutyDemands.repetitiveMovements, restrictions.repetitiveMovements));

  // Weight-dependent demands
  comparisons.push(compareWeightLimit("Lifting", dutyDemands.liftingMaxKg, restrictions.liftingMaxKg, dutyDemands.lifting, restrictions.lifting));
  comparisons.push(compareWeightLimit("Carrying", dutyDemands.carryingMaxKg, restrictions.carryingMaxKg, dutyDemands.carrying, restrictions.carrying));

  // Cognitive demands
  comparisons.push(compareDemandToCapability("Concentration", dutyDemands.concentration, restrictions.concentration || "not_assessed"));
  comparisons.push(compareDemandToCapability("Stress Tolerance", dutyDemands.stressTolerance, restrictions.stressTolerance || "not_assessed"));
  comparisons.push(compareDemandToCapability("Work Pace", dutyDemands.workPace, restrictions.workPace || "not_assessed"));

  // Determine overall suitability
  const notSuitableCount = comparisons.filter(c => c.match === "not_suitable").length;
  const withModificationCount = comparisons.filter(c => c.match === "suitable_with_modification").length;

  let overallSuitability: SuitabilityLevel;
  const reasons: string[] = [];

  if (notSuitableCount > 0) {
    // If duty is not modifiable and we have mismatches, it's not suitable
    if (!isModifiable) {
      overallSuitability = "not_suitable";
      reasons.push(`${notSuitableCount} demands exceed restrictions and duty is not modifiable`);
    } else if (notSuitableCount > 3) {
      // Too many mismatches to modify effectively
      overallSuitability = "not_suitable";
      reasons.push(`${notSuitableCount} demands exceed restrictions - too many to modify effectively`);
    } else {
      overallSuitability = "suitable_with_modification";
      reasons.push(`${notSuitableCount} demands require modification`);
    }
  } else if (withModificationCount > 0) {
    overallSuitability = "suitable_with_modification";
    reasons.push(`${withModificationCount} demands require minor accommodations`);
  } else {
    overallSuitability = "suitable";
    reasons.push("All demands within worker capabilities");
  }

  // Add specific reasons from comparisons
  const notSuitableReasons = comparisons
    .filter(c => c.match === "not_suitable")
    .map(c => c.reason);
  reasons.push(...notSuitableReasons.slice(0, 3)); // Limit to 3 most critical

  return {
    overallSuitability,
    demandComparisons: comparisons,
    modificationSuggestions: [], // Generated separately by modificationSuggester.ts
    reasons
  };
}
```

### Pattern 2: Modification Suggestion Generation

**What:** Generate actionable suggestions for "with_modification" duties
**When to use:** FAM-07
**Example:**

```typescript
// server/services/modificationSuggester.ts

interface ModificationContext {
  dutyName: string;
  dutyDescription: string;
  demandComparisons: DemandComparison[];
  isModifiable: boolean;
}

/**
 * Generate modification suggestions based on comparison results
 *
 * Sources:
 * - Job modification strategies from occupational therapy best practices
 * - WorkSafe Victoria return-to-work guidance
 *
 * Categories:
 * - Task restructuring: Redistribute or eliminate tasks
 * - Equipment/tools: Mechanical aids, assistive devices
 * - Schedule adjustments: Breaks, reduced hours
 * - Job rotation: Share demanding tasks across workers
 * - Workstation modification: Ergonomic adjustments
 */
export function generateModificationSuggestions(
  context: ModificationContext
): string[] {
  const suggestions: string[] = [];
  const problematicDemands = context.demandComparisons.filter(
    c => c.match === "not_suitable" || c.match === "suitable_with_modification"
  );

  for (const comparison of problematicDemands) {
    switch (comparison.demand) {
      case "Lifting":
      case "Carrying":
        suggestions.push(`Use mechanical aids (trolleys, hoists, team lifts) for loads over ${comparison.capability === "with_modifications" ? "worker limit" : "any weight"}`);
        suggestions.push("Redistribute heavy lifting tasks to other team members");
        break;

      case "Bending":
      case "Squatting":
        suggestions.push("Raise work surface height to reduce bending/squatting");
        suggestions.push("Use long-handled tools or reaching aids");
        break;

      case "Standing":
        suggestions.push("Provide sit-stand workstation or stool for rest periods");
        suggestions.push("Allow position changes every 30 minutes");
        break;

      case "Sitting":
        suggestions.push("Provide standing desk option or walking breaks");
        suggestions.push("Ergonomic chair with lumbar support");
        break;

      case "Reaching Overhead":
        suggestions.push("Store frequently used items at waist height");
        suggestions.push("Provide step ladder or reaching aids");
        break;

      case "Repetitive Movements":
        suggestions.push("Rotate tasks every 1-2 hours to vary movements");
        suggestions.push("Allow micro-breaks (5 min per hour)");
        break;

      case "Concentration":
      case "Stress Tolerance":
        suggestions.push("Reduce distractions in work area");
        suggestions.push("Provide clear written instructions");
        suggestions.push("Allow additional time for complex tasks");
        break;

      case "Work Pace":
        suggestions.push("Adjust productivity targets during recovery period");
        suggestions.push("Provide flexible task deadlines");
        break;
    }
  }

  // Add general suggestions
  if (problematicDemands.length > 0) {
    suggestions.push("Gradual increase in duty demands over 2-4 weeks");
    suggestions.push("Regular check-ins with supervisor to assess tolerance");
  }

  // Deduplicate
  return Array.from(new Set(suggestions));
}
```

### Pattern 3: Manual Override with Audit Logging

**What:** Allow authorized users to override calculated suitability with logged reason
**When to use:** FAM-09
**Example:**

```typescript
// server/routes/functionalAbility.ts

import { Router } from "express";
import { authorize } from "../middleware/auth";
import { storage } from "../storage";
import { auditLogger } from "../services/auditLogger";
import { z } from "zod";

const router = Router();

const overrideSchema = z.object({
  planDutyId: z.string().uuid(),
  newSuitability: z.enum(["suitable", "suitable_with_modification", "not_suitable"]),
  reason: z.string().min(10, "Override reason must be at least 10 characters"),
  modificationNotes: z.string().optional(),
});

/**
 * POST /api/functional-ability/override
 * Manually override calculated suitability with audit trail
 *
 * Uses shadow table pattern from audit logging research:
 * - Record override in rtw_plan_duties (manuallyOverridden, overrideReason, overriddenBy)
 * - Log event in auditEvents table for compliance
 *
 * Source: https://www.red-gate.com/blog/database-design-for-audit-logging/
 */
router.post("/override",
  authorize(["admin", "clinician"]),
  async (req, res) => {
    try {
      const override = overrideSchema.parse(req.body);
      const userId = req.user!.id;

      // Get original calculated suitability
      const [planDuty] = await storage.db
        .select()
        .from(rtwPlanDuties)
        .where(eq(rtwPlanDuties.id, override.planDutyId));

      if (!planDuty) {
        return res.status(404).json({ error: "Plan duty not found" });
      }

      const originalSuitability = planDuty.suitability;

      // Update plan duty with override
      await storage.db
        .update(rtwPlanDuties)
        .set({
          suitability: override.newSuitability,
          manuallyOverridden: true,
          overrideReason: override.reason,
          overriddenBy: userId,
          modificationNotes: override.modificationNotes,
        })
        .where(eq(rtwPlanDuties.id, override.planDutyId));

      // Audit log
      await auditLogger.logEvent({
        eventType: "rtw_duty_override",
        userId,
        resourceType: "rtw_plan_duty",
        resourceId: override.planDutyId,
        metadata: {
          originalSuitability,
          newSuitability: override.newSuitability,
          reason: override.reason,
          timestamp: new Date().toISOString(),
        },
      });

      res.json({
        success: true,
        message: "Suitability override recorded",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: err.errors,
        });
      }
      console.error("Override failed:", err);
      res.status(500).json({ error: "Failed to record override" });
    }
  }
);

export default router;
```

### Pattern 4: Matrix UI Component

**What:** Display duties vs demand categories with color-coded suitability
**When to use:** FAM-08
**Example:**

```tsx
// client/src/components/rtw/FunctionalAbilityMatrix.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SuitabilityLevel } from "@shared/schema";

interface MatrixData {
  duties: Array<{
    id: string;
    name: string;
    suitability: SuitabilityLevel;
    manuallyOverridden: boolean;
    modificationSuggestions: string[];
    demandDetails: Array<{
      demand: string;
      match: SuitabilityLevel;
    }>;
  }>;
}

interface Props {
  caseId: string;
  roleId: string;
}

export function FunctionalAbilityMatrix({ caseId, roleId }: Props) {
  const { data, isLoading } = useQuery<MatrixData>({
    queryKey: ["functional-ability-matrix", caseId, roleId],
    queryFn: () =>
      fetch(`/api/functional-ability/matrix?caseId=${caseId}&roleId=${roleId}`)
        .then(r => r.json()),
  });

  if (isLoading) return <div>Calculating suitability...</div>;
  if (!data) return <div>No duties found for this role</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Functional Ability Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.duties.map(duty => (
            <DutySuitabilityRow
              key={duty.id}
              duty={duty}
              onOverride={(newSuitability, reason) => {
                // Handle override
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DutySuitabilityRowProps {
  duty: MatrixData["duties"][0];
  onOverride: (newSuitability: SuitabilityLevel, reason: string) => void;
}

function DutySuitabilityRow({ duty, onOverride }: DutySuitabilityRowProps) {
  const colorClass = getSuitabilityColor(duty.suitability);
  const icon = getSuitabilityIcon(duty.suitability);

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h4 className="font-medium">{duty.name}</h4>
            {duty.manuallyOverridden && (
              <Badge variant="outline">Manually Adjusted</Badge>
            )}
          </div>

          <div className="mt-2 text-sm">
            <strong>Status:</strong> {formatSuitability(duty.suitability)}
          </div>

          {duty.modificationSuggestions.length > 0 && (
            <div className="mt-2">
              <div className="text-sm font-medium">Suggested Modifications:</div>
              <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                {duty.modificationSuggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Demand details in collapsible section */}
          <details className="mt-2">
            <summary className="text-sm cursor-pointer hover:underline">
              View demand breakdown
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {duty.demandDetails.map(detail => (
                <div key={detail.demand} className="flex items-center gap-1">
                  <span>{getSuitabilityIcon(detail.match)}</span>
                  <span>{detail.demand}</span>
                </div>
              ))}
            </div>
          </details>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Open override dialog
          }}
        >
          Override
        </Button>
      </div>
    </div>
  );
}

/**
 * Color coding based on suitability
 * Source: Industry standard green/yellow/red for safe/caution/unsafe
 */
function getSuitabilityColor(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable":
      return "bg-green-50 border-green-200";
    case "suitable_with_modification":
      return "bg-yellow-50 border-yellow-200";
    case "not_suitable":
      return "bg-red-50 border-red-200";
  }
}

function getSuitabilityIcon(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable": return "✓";
    case "suitable_with_modification": return "⚠";
    case "not_suitable": return "✗";
  }
}

function formatSuitability(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable": return "Suitable";
    case "suitable_with_modification": return "Suitable with Modification";
    case "not_suitable": return "Not Suitable";
  }
}
```

### Pattern 5: Edge Case Handling - Missing Data

**What:** Handle missing or partial restriction/demand data gracefully
**When to use:** FAM-01 edge cases
**Example:**

```typescript
// server/services/functionalAbilityCalculator.ts (continued)

/**
 * Handle missing restriction data
 *
 * Best practices from missing data research:
 * - Avoid simple imputation (mean replacement) - leads to bias
 * - Use explicit "not_assessed" state rather than guessing
 * - Flag partial data for manual review
 *
 * Source: https://pmc.ncbi.nlm.nih.gov/articles/PMC3701793/
 */
export function handleMissingRestrictions(
  restrictions: FunctionalRestrictions | null
): { restrictions: FunctionalRestrictions; confidence: number; warnings: string[] } {
  const warnings: string[] = [];

  // No restrictions at all = not assessed
  if (!restrictions) {
    warnings.push("No medical restrictions on file - all demands marked as not assessed");
    return {
      restrictions: createDefaultRestrictions(),
      confidence: 0,
      warnings
    };
  }

  // Check for missing critical fields
  const criticalFields = ["lifting", "carrying", "bending", "standingWalking"];
  const missingCritical = criticalFields.filter(
    field => restrictions[field as keyof FunctionalRestrictions] === "not_assessed"
  );

  if (missingCritical.length > 0) {
    warnings.push(`Critical restrictions not assessed: ${missingCritical.join(", ")}`);
  }

  // Calculate confidence based on completeness
  const allFields = Object.keys(restrictions);
  const assessedFields = allFields.filter(
    field => {
      const value = restrictions[field as keyof FunctionalRestrictions];
      return value !== "not_assessed" && value !== null && value !== undefined;
    }
  );
  const confidence = assessedFields.length / allFields.length;

  if (confidence < 0.5) {
    warnings.push("Less than 50% of restrictions assessed - results may be incomplete");
  }

  return {
    restrictions,
    confidence,
    warnings
  };
}

/**
 * Handle missing demand data
 */
export function handleMissingDemands(
  demands: RTWDutyDemandsDB | null
): { demands: RTWDutyDemandsDB; warnings: string[] } {
  const warnings: string[] = [];

  // No demands = assume all "never" (safe default)
  if (!demands) {
    warnings.push("No demands specified for this duty - assuming no physical/cognitive requirements");
    return {
      demands: createDefaultDemands(),
      warnings
    };
  }

  return { demands, warnings };
}

function createDefaultRestrictions(): FunctionalRestrictions {
  return {
    sitting: "not_assessed",
    standingWalking: "not_assessed",
    bending: "not_assessed",
    squatting: "not_assessed",
    kneelingClimbing: "not_assessed",
    twisting: "not_assessed",
    reachingOverhead: "not_assessed",
    reachingForward: "not_assessed",
    neckMovement: "not_assessed",
    lifting: "not_assessed",
    carrying: "not_assessed",
    pushing: "not_assessed",
    pulling: "not_assessed",
    repetitiveMovements: "not_assessed",
    useOfInjuredLimb: "not_assessed",
  };
}

function createDefaultDemands(): RTWDutyDemandsDB {
  return {
    id: "",
    dutyId: "",
    bending: "never",
    squatting: "never",
    kneeling: "never",
    twisting: "never",
    reachingOverhead: "never",
    reachingForward: "never",
    lifting: "never",
    liftingMaxKg: null,
    carrying: "never",
    carryingMaxKg: null,
    standing: "never",
    sitting: "never",
    walking: "never",
    repetitiveMovements: "never",
    concentration: "never",
    stressTolerance: "never",
    workPace: "never",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

### Anti-Patterns to Avoid

- **Hardcoding suitability rules**: Use configurable logic that can be adjusted as medical guidance evolves
- **Ignoring "not_assessed" state**: Don't treat "not_assessed" as "can" - it's unknown risk
- **Simple mean imputation for missing data**: Results in bias and incorrect risk assessments
- **Storing only final suitability**: Store full comparison breakdown for transparency and debugging
- **Allowing overrides without mandatory reasons**: Every override must be justified for audit compliance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Assignment optimization | Hungarian algorithm from scratch | N/A - we need suitability scoring, not optimal assignment | Hungarian algorithm solves different problem (cost minimization), we need safety assessment |
| Audit trail database | Custom logging table | Existing auditEvents table + rtw_plan_duties override fields | Shadow table pattern already implemented in schema |
| Color-coded table | Custom CSS grid | Tailwind classes + shadcn/ui Card components | Already in project, consistent with design system |
| Multi-certificate aggregation | Custom "most restrictive" logic | restrictionMapper.ts (Phase 3) | Already implemented and tested |

**Key insight:** The comparison algorithm itself must be custom-built (no library exists for occupational health matching), but all supporting infrastructure (storage, UI, audit) follows existing project patterns.

## Common Pitfalls

### Pitfall 1: Treating "not_assessed" as "can"

**What goes wrong:** Algorithm marks demands as suitable when worker capability is unknown
**Why it happens:** "not_assessed" is falsy in some conditions, code defaults to permissive
**How to avoid:** Explicitly handle "not_assessed" state, default to "suitable_with_modification" to flag for review
**Warning signs:** Duties marked suitable despite incomplete medical assessments

### Pitfall 2: Frequency Misinterpretation

**What goes wrong:** Treating "occasionally" (up to 33% of time) as "rarely" or negligible
**Why it happens:** Intuitive interpretation differs from U.S. DOL standard definitions
**How to avoid:** Document DOL frequency definitions in code comments, use constants not magic strings
**Warning signs:** Duties with occasional high-risk demands (overhead work, heavy lifting) marked as suitable without modification

### Pitfall 3: Weight Limit Edge Cases

**What goes wrong:** Marking 10kg lifting duty as suitable when worker limit is 10kg (no safety margin)
**Why it happens:** Using >= comparison without accounting for real-world variability
**How to avoid:** Add 10% safety buffer (worker limit must exceed duty by 10%) or flag exact matches for modification
**Warning signs:** Workers re-injuring on duties marked "suitable"

### Pitfall 4: Ignoring Cumulative Demand

**What goes wrong:** Duty has 5 demands each at "occasionally" frequency, treated independently, but worker performs ALL occasionally = high cumulative load
**Why it happens:** Algorithm compares demands individually without considering total workload
**How to avoid:** Count number of "occasionally" demands - if >4, consider cumulative effect and downgrade suitability
**Warning signs:** Worker fatigues quickly on duties marked suitable

### Pitfall 5: Modification Suggestions Without Context

**What goes wrong:** Suggesting "use mechanical hoist" for 5kg lifting limit breach
**Why it happens:** Generic suggestion generation without considering magnitude of restriction
**How to avoid:** Contextual suggestions based on demand frequency, weight difference, and duty type
**Warning signs:** Impractical or obvious suggestions that add no value ("take breaks" for sitting)

### Pitfall 6: Override Reason Validation Too Lenient

**What goes wrong:** Users enter minimal reasons like "ok" or "seems fine"
**Why it happens:** Only checking for non-empty string, not meaningful content
**How to avoid:** Minimum 10 characters, reject common empty phrases, prompt with expected format
**Warning signs:** Audit logs with unhelpful override justifications

## Code Examples

### API Endpoint - Calculate Matrix

```typescript
// server/routes/functionalAbility.ts

/**
 * GET /api/functional-ability/matrix
 * Calculate full suitability matrix for case + role
 *
 * Query params:
 * - caseId: Worker case ID
 * - roleId: Job role ID
 *
 * Returns matrix of duties with suitability calculations
 */
router.get("/matrix", authorize(), async (req, res) => {
  try {
    const { caseId, roleId } = req.query as { caseId: string; roleId: string };
    const organizationId = req.user!.organizationId;

    // Get current worker restrictions (Phase 3)
    const restrictions = await storage.getCurrentRestrictions(caseId, organizationId);
    if (!restrictions) {
      return res.status(404).json({
        error: "No current medical restrictions found",
        message: "Worker must have an active medical certificate before planning return to work"
      });
    }

    // Get all duties for role (Phase 2)
    const duties = await storage.db
      .select({
        duty: rtwDuties,
        demands: rtwDutyDemands,
      })
      .from(rtwDuties)
      .leftJoin(rtwDutyDemands, eq(rtwDuties.id, rtwDutyDemands.dutyId))
      .where(and(
        eq(rtwDuties.roleId, roleId),
        eq(rtwDuties.organizationId, organizationId),
        eq(rtwDuties.isActive, true)
      ));

    // Calculate suitability for each duty
    const matrixData = duties.map(({ duty, demands }) => {
      const result = calculateDutySuitability(
        demands || createDefaultDemands(),
        restrictions,
        duty.isModifiable
      );

      const suggestions = generateModificationSuggestions({
        dutyName: duty.name,
        dutyDescription: duty.description || "",
        demandComparisons: result.demandComparisons,
        isModifiable: duty.isModifiable,
      });

      return {
        dutyId: duty.id,
        dutyName: duty.name,
        suitability: result.overallSuitability,
        reasons: result.reasons,
        modificationSuggestions: suggestions,
        demandDetails: result.demandComparisons.map(c => ({
          demand: c.demand,
          frequency: c.frequency,
          capability: c.capability,
          match: c.match,
        })),
        isModifiable: duty.isModifiable,
      };
    });

    res.json({
      success: true,
      data: {
        caseId,
        roleId,
        calculatedAt: new Date().toISOString(),
        duties: matrixData,
      },
    });
  } catch (err) {
    console.error("Matrix calculation failed:", err);
    res.status(500).json({
      error: "Failed to calculate suitability matrix",
      details: err instanceof Error ? err.message : "Unknown error"
    });
  }
});
```

### Override Dialog Component

```tsx
// client/src/components/rtw/OverrideReasonDialog.tsx

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import type { SuitabilityLevel } from "@shared/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  planDutyId: string;
  dutyName: string;
  currentSuitability: SuitabilityLevel;
}

export function OverrideReasonDialog({
  open,
  onClose,
  planDutyId,
  dutyName,
  currentSuitability,
}: Props) {
  const [newSuitability, setNewSuitability] = useState<SuitabilityLevel>(currentSuitability);
  const [reason, setReason] = useState("");
  const [modificationNotes, setModificationNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/functional-ability/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDutyId,
          newSuitability,
          reason,
          modificationNotes: modificationNotes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Override failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["functional-ability-matrix"] });
      toast({
        title: "Override recorded",
        description: `${dutyName} suitability manually adjusted`,
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Override failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (reason.length < 10) {
      toast({
        title: "Reason required",
        description: "Please provide a detailed reason (minimum 10 characters)",
        variant: "destructive",
      });
      return;
    }

    overrideMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Override Suitability Assessment</DialogTitle>
          <DialogDescription>
            Manually adjust the calculated suitability for: <strong>{dutyName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Current Assessment</Label>
            <div className="text-sm text-muted-foreground">
              {formatSuitability(currentSuitability)}
            </div>
          </div>

          <div>
            <Label>New Assessment</Label>
            <RadioGroup value={newSuitability} onValueChange={(v) => setNewSuitability(v as SuitabilityLevel)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suitable" id="suitable" />
                <Label htmlFor="suitable">Suitable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suitable_with_modification" id="suitable_with_modification" />
                <Label htmlFor="suitable_with_modification">Suitable with Modification</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_suitable" id="not_suitable" />
                <Label htmlFor="not_suitable">Not Suitable</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="reason">
              Reason for Override <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this manual adjustment is necessary (minimum 10 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {reason.length}/10 characters minimum
            </div>
          </div>

          {newSuitability === "suitable_with_modification" && (
            <div>
              <Label htmlFor="modificationNotes">Modification Notes (Optional)</Label>
              <Textarea
                id="modificationNotes"
                placeholder="Describe specific modifications required"
                value={modificationNotes}
                onChange={(e) => setModificationNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={overrideMutation.isPending || reason.length < 10}
          >
            {overrideMutation.isPending ? "Saving..." : "Save Override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatSuitability(suitability: SuitabilityLevel): string {
  switch (suitability) {
    case "suitable": return "Suitable";
    case "suitable_with_modification": return "Suitable with Modification";
    case "not_suitable": return "Not Suitable";
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Paper-based FAM | Algorithmic calculation with UI | 2020s (digital transformation) | Faster assessment, consistent criteria, audit trail |
| Binary suitable/unsuitable | Three-tier (suitable/with mod/not suitable) | WorkSafe Victoria guidance updates | More nuanced decision-making, identifies modification opportunities |
| Manual modification suggestions | Structured suggestion generation | 2020s (best practice standardization) | Consistent, actionable suggestions based on occupational therapy principles |
| Hard-delete duties | Soft delete + manual override tracking | Database audit requirements | Full change history, compliance with WorkSafe record-keeping |
| Static frequency definitions | U.S. DOL standardized definitions (never/occasionally/frequently/constantly) | 1991 (Dictionary of Occupational Titles) | Consistent interpretation across systems |

**Deprecated/outdated:**
- Simple suitable/unsuitable binary - Modern systems use three-tier approach
- Ignoring "not_assessed" state - Treating unknown as safe is dangerous
- Manual paper-based calculations - Error-prone and time-consuming

## Open Questions

1. **Should cognitive demand comparison be weighted differently than physical?**
   - What we know: Cognitive demands (concentration, stress tolerance) harder to assess from certificates
   - What's unclear: If psychological injury, should cognitive demands be weighted more heavily?
   - Recommendation: Start with equal weighting, add injury-type-specific weighting in Phase 4.5 if needed

2. **How to handle time-limited restrictions (e.g., "reduced hours for 4 weeks")?**
   - What we know: FunctionalRestrictions has constraintDurationWeeks and nextExaminationDate
   - What's unclear: Should matrix auto-recalculate when restriction expires?
   - Recommendation: Display time limit prominently, flag duties for re-assessment when restriction expires

3. **Should cumulative demand be calculated across all duties in a shift?**
   - What we know: Worker may perform multiple duties in a day, cumulative load matters
   - What's unclear: How to model total daily demand when duties vary by shift
   - Recommendation: Phase 4 focuses on individual duty suitability, defer cumulative shift analysis to Phase 5 (schedule planning)

4. **What confidence threshold should trigger manual review?**
   - What we know: handleMissingRestrictions calculates confidence based on data completeness
   - What's unclear: At what confidence level should system force manual review vs. allow automatic calculation?
   - Recommendation: <0.5 confidence = block calculation and require manual assessment, 0.5-0.8 = show warning but allow, >0.8 = proceed

## Sources

### Primary (HIGH confidence)

- Existing codebase:
  - `shared/schema.ts` (lines 1620-1838) - FunctionalRestrictions, DemandFrequency, RTWDutyDemands schema
  - `server/services/restrictionMapper.ts` - Most restrictive combination logic (Phase 3)
  - `.planning/phases/03-medical-integration/03-RESEARCH.md` - FunctionalRestrictions extraction approach
  - `.planning/phases/02-admin-roles-duties/02-RESEARCH.md` - Duty demand structure

- U.S. Department of Labor:
  - [Physical Demands - OWCP Form 5c](https://www.dol.gov/sites/dolgov/files/owcp/dfec/regs/compliance/owcp-5c.pdf) - Official frequency definitions (never/occasionally/frequently/constantly)

- Occupational health authorities:
  - [WSIB Functional Abilities Form](https://www.wsib.ca/en/functional-abilities-form) - Industry standard approach to functional assessment
  - [Fitness for Duty and Return to Work - NCBI](https://www.ncbi.nlm.nih.gov/books/NBK610688/) - Medical guidance on work capacity assessment

### Secondary (MEDIUM confidence)

- Audit logging patterns:
  - [Audit Log Pattern - Martin Fowler](https://martinfowler.com/eaaDev/AuditLog.html) - Temporal data tracking best practices
  - [Database Design for Audit Logging - Redgate](https://www.red-gate.com/blog/database-design-for-audit-logging/) - Shadow table pattern for override tracking

- Job modification strategies:
  - [Job Modification - Work Injury Rights](https://workinjuryrights.com/glossary/job-modification/) - Types of workplace modifications
  - [Advanced Work Rehabilitation - DSI Work Solutions](https://www.dsiworksolutions.com/article.cfm?ArticleNumber=11) - Occupational therapy modification approaches
  - [Key Elements of Modified Duty Return-to-Work](https://www.guideone.com/resources/safety-resource-library/fact-sheet-key-elements-effective-modified-duty-return-work) - Best practices for modified duty programs

- React matrix visualization:
  - [React Data Grid: The Ultimate Guide for Beginners in 2026 - Sencha](https://www.sencha.com/blog/react-data-grids-the-complete-guide/) - Color-coded cell examples
  - [React HeatMap Chart - Syncfusion](https://www.syncfusion.com/react-components/react-heatmap-chart) - Gradient/solid color matrix visualization

### Tertiary (LOW confidence)

- Missing data handling:
  - [Principled Missing Data Methods - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3701793/) - Statistical approaches (most not applicable to safety-critical domain)
  - [Handling Missing Data Review - arXiv](https://arxiv.org/html/2404.04905v1) - Academic survey of imputation methods (not directly applicable)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All required libraries already in project
- Architecture: HIGH - Database schema ready (rtw_plan_duties), patterns established (restrictionMapper.ts)
- Algorithm design: MEDIUM-HIGH - Based on occupational health standards, but custom implementation required
- Pitfalls: HIGH - Based on analysis of frequency definitions, weight limit edge cases, and audit requirements
- Code examples: HIGH - Adapted from existing patterns and occupational health guidance

**Research date:** 2026-01-28
**Valid until:** 60 days (stable domain - U.S. DOL frequency definitions unchanged since 1991, occupational health principles stable)
