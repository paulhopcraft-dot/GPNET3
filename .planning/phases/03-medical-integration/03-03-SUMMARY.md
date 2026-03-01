---
phase: 03-medical-integration
plan: 03
subsystem: rtw-ui
tags: [react, tailwind, tanstack-query, lucide-react, rtw-planner]
dependency-graph:
  requires: ["03-01"]
  provides: ["current-restrictions-panel", "restriction-utils"]
  affects: ["04-01", "05-01", "10-01"]
tech-stack:
  added: []
  patterns: ["category-grouped-display", "color-coded-capabilities", "loading-error-empty-states"]
key-files:
  created:
    - client/src/lib/restrictionUtils.ts
    - client/src/components/rtw/CurrentRestrictionsPanel.tsx
  modified: []
decisions:
  - decision: "Category-based grouping for restrictions display"
    rationale: "Groups related physical demands together for easier scanning (mobility, reaching, manual handling, other)"
    phase: "03-03"
  - decision: "Color coding matches severity pattern"
    rationale: "Green=can, Yellow=modifications, Red=cannot, Gray=not assessed - consistent with app-wide status colors"
    phase: "03-03"
  - decision: "Weight limits displayed inline"
    rationale: "Shows max kg next to lifting/carrying restrictions for immediate context"
    phase: "03-03"
metrics:
  duration: "5 minutes"
  completed: "2026-01-28"
---

# Phase 3 Plan 03: Current Restrictions UI Panel Summary

**One-liner:** React component displays FunctionalRestrictions with color-coded capability indicators, category grouping, and weight/time limit formatting.

## What Was Built

### Task 1: restrictionUtils.ts Helper Functions
Created `client/src/lib/restrictionUtils.ts` with:
- `getCapabilityIcon(capability)` - Returns Lucide icon name for capability level
- `getCapabilityColor(capability)` - Returns Tailwind text color class
- `getCapabilityBgColor(capability)` - Returns background + text classes for badges
- `formatRestrictionLabel(key)` - Human-readable labels for all 15 demand categories
- `formatCapabilityLabel(capability)` - Human-readable status labels
- `formatWeightLimit(kg)` - Formats weight with "max X kg" pattern
- `formatTimeLimit(value, unit)` - Formats hours/day or days/week
- `restrictionCategories` - Grouping object for organized display
- `getCategoryLabel(category)` - Category heading labels

### Task 2: CurrentRestrictionsPanel Component
Created `client/src/components/rtw/CurrentRestrictionsPanel.tsx` with:

**Data Fetching:**
- Uses fetchWithCsrf to call `/api/cases/:id/current-restrictions`
- Handles loading, error, empty, and data states
- Cancellation support to prevent state updates after unmount

**Visual Components:**
- `CapabilityIcon` - Color-coded Lucide icons (Check, X, AlertTriangle, Minus)
- `LoadingSkeleton` - Animated loading placeholders
- `EmptyState` - Friendly message when no restrictions exist
- `ErrorState` - Error display with message
- `RestrictionItem` - Individual restriction row with icon, label, badge
- `CategorySection` - Grouped restrictions by category
- `TimeLimitsSection` - Highlighted time restrictions in amber box
- `SourceBadge` - Shows if from single or combined certificates

**Display Structure:**
1. Card header with title and source indicator
2. Time limits section (if present) - amber highlighted
3. Four category sections:
   - Mobility: sitting, standing/walking, bending, squatting, kneeling/climbing, twisting
   - Reaching: overhead, forward, neck movement
   - Manual Handling: lifting (with max kg), carrying (with max kg), pushing, pulling
   - Other: repetitive movements, use of injured limb
4. Footer with extraction timestamp

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `client/src/lib/restrictionUtils.ts` | Display helper functions | 147 |
| `client/src/components/rtw/CurrentRestrictionsPanel.tsx` | UI component | 361 |

## Commits

| Commit | Task | Description |
|--------|------|-------------|
| `cabaf59` | 1 | Create restrictionUtils.ts helper functions |
| `01e4954` | 2 | Create CurrentRestrictionsPanel component |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Category-based grouping | Groups related demands for easier scanning by users |
| Color coding (green/yellow/red/gray) | Consistent with app-wide status colors and intuitive meaning |
| Inline weight limits | Immediate context for lifting/carrying restrictions without extra clicks |
| Amber highlight for time limits | Draws attention to work hour restrictions that affect scheduling |
| Badge abbreviations (Can/Modified/Cannot/N/A) | Compact display that fits well in table-like layout |

## Verification

- [x] `npm run build` passes (vite build + tsc)
- [x] client/src/lib/restrictionUtils.ts exports all required functions
- [x] client/src/components/rtw/CurrentRestrictionsPanel.tsx compiles without errors
- [x] Component handles loading, error, and empty states
- [x] Color coding: green (can), yellow (with_modifications), red (cannot), gray (not_assessed)

## Success Criteria Met

- [x] Restrictions display with visual capability indicators
- [x] Weight limits show with kg units (inline with lifting/carrying)
- [x] Time limits show hours/days per week (in highlighted section)
- [x] Source indicator shows when data is combined from multiple certificates
- [x] Loading and error states are user-friendly
- [x] Component exports for flexible integration

## Integration Notes

**API Dependency:** The component expects `/api/cases/:id/current-restrictions` endpoint to return:
```typescript
{
  restrictions: FunctionalRestrictionsExtracted;
  maxWorkHoursPerDay: number | null;
  maxWorkDaysPerWeek: number | null;
  source: "single_certificate" | "combined";
  certificateCount: number;
  retrievedAt: string;
}
```

This API endpoint needs to be created (likely in Phase 3 Plan 02 or Phase 4).

**Usage:**
```tsx
import { CurrentRestrictionsPanel } from "@/components/rtw/CurrentRestrictionsPanel";

// In RTW planning screen:
<CurrentRestrictionsPanel caseId={caseId} />
```

## Next Phase Readiness

**Phase 4 can proceed:** The UI component is ready to display restrictions. Phase 4 (Functional Ability Matrix) can:
- Compare these restrictions against job duty demands
- Build the suitability matrix calculation
- Use the same restriction categories for consistency

**API endpoint needed:** The `/api/cases/:id/current-restrictions` endpoint should be created to:
1. Find current/recent certificate(s) for the case
2. Return the functionalRestrictionsJson data
3. Include time limits from the extraction

**Blockers:** None
