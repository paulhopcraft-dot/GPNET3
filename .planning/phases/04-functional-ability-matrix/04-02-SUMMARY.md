---
phase: 04-functional-ability-matrix
plan: 02
subsystem: rtw-planner-api
tags: [api, functional-ability, suitability, matrix, display-utils]

dependency-graph:
  requires:
    - 04-01 (core calculator services)
    - 03-02 (getCurrentRestrictions API)
  provides:
    - GET /api/functional-ability/matrix endpoint
    - suitabilityUtils.ts display helpers
  affects:
    - 04-03 (Matrix UI component will consume this API)
    - Phase 5 (Plan Generator will use matrix data)

tech-stack:
  added: []
  patterns:
    - Express router with authorize() middleware
    - Drizzle ORM for duty template queries
    - Client-side utility pattern (matching restrictionUtils.ts)

key-files:
  created:
    - server/routes/functionalAbility.ts
    - client/src/lib/suitabilityUtils.ts
  modified:
    - server/routes.ts

decisions:
  - id: FAM-02-API-TEMPLATES
    title: API operates on duty templates not plan instances
    rationale: Phase 4 provides suitability PREVIEW before RTW plan creation
    alternatives: ["Wait for plan instances (Phase 5)"]

metrics:
  duration: 3 minutes
  completed: 2026-01-28
---

# Phase 4 Plan 02: Matrix API Endpoint and Suitability Display Summary

Matrix calculation API endpoint with GET /api/functional-ability/matrix returning suitability for all duty templates in a role, plus client-side display utilities.

## What Was Built

### Task 1: Functional Ability API Route

Created `server/routes/functionalAbility.ts` with:

- **GET /api/functional-ability/matrix** endpoint
- Query params: `caseId`, `roleId` (required)
- Returns suitability for all active duty TEMPLATES in the specified role
- Response includes:
  - `dutyId` (template ID from rtwDuties - NOT planDutyId)
  - `dutyName`, `dutyDescription`, `isModifiable`
  - `suitability` (suitable | suitable_with_modification | not_suitable)
  - `reasons` array explaining the suitability decision
  - `modificationSuggestions` array with actionable suggestions
  - `demandDetails` array with per-demand breakdown
- Mounted at `/api/functional-ability` with authorize() middleware

### Task 2: Suitability Display Utilities

Created `client/src/lib/suitabilityUtils.ts` with:

- `getSuitabilityColor()` - Tailwind text color classes
- `getSuitabilityBgColor()` - Background + border classes for cards
- `getSuitabilityIcon()` - Lucide icon names (check, alert-triangle, x)
- `formatSuitability()` - Human-readable labels
- `getSuitabilityBadgeVariant()` - shadcn Badge component variants

## API Response Example

```typescript
{
  success: true,
  data: {
    caseId: "case-123",
    roleId: "role-456",
    roleName: "Warehouse Worker",
    calculatedAt: "2026-01-28T11:22:00Z",
    confidence: 0.85,
    warnings: ["Restrictions combined from 2 certificates"],
    duties: [
      {
        dutyId: "duty-789",  // Template ID
        dutyName: "Pick and Pack",
        dutyDescription: "Retrieve items from shelves and pack orders",
        isModifiable: true,
        suitability: "suitable_with_modification",
        reasons: ["2 demand(s) require minor accommodations"],
        modificationSuggestions: [
          "Use mechanical aids (trolleys, hoists, team lifts)",
          "Break loads into smaller weights"
        ],
        demandDetails: [
          { demand: "Lifting", frequency: "frequently", capability: "with_modifications", match: "not_suitable" },
          { demand: "Standing", frequency: "constantly", capability: "can", match: "suitable" }
        ]
      }
    ]
  }
}
```

## Integration Points

- **Depends on**:
  - `storage.getCurrentRestrictions()` from Phase 3
  - `calculateDutySuitability()` from 04-01
  - `generateModificationSuggestions()` from 04-01

- **Consumed by**:
  - Phase 4 Plan 03: Matrix UI component
  - Phase 5: Plan Generator (for automated plan creation)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Returns `dutyId` not `planDutyId` | Phase 4 operates on templates for preview, plan instances come in Phase 5 |
| No override endpoint | Overrides require plan instances, deferred to Phase 8 |
| Aggregates warnings | Combines calculator warnings + certificate source info |
| Tracks minimum confidence | Overall confidence is lowest duty confidence |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 84d994e | feat | add GET /api/functional-ability/matrix endpoint |
| f2ea456 | feat | add suitabilityUtils.ts display helpers |

## Next Phase Readiness

**Ready for 04-03** (Matrix UI Component):
- API endpoint returns complete suitability data
- Display utilities ready for color coding
- Response includes all data needed for UI rendering

**Requirements addressed:**
- FAM-02: Three-tier suitability output via API
- FAM-06: Per-duty breakdown with demandDetails
- FAM-07: Modification suggestions included in response
