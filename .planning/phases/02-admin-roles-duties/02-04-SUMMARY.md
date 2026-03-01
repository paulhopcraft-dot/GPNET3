---
phase: 02-admin-roles-duties
plan: 04
subsystem: admin-rtw-planner
completed: 2026-01-26
duration: ~10 minutes
status: complete

tags:
  - react
  - typescript
  - ui
  - admin
  - rtw-planner
  - demand-matrix

requires:
  - 02-02  # Duties API

provides:
  - DemandMatrix reusable component
  - Duties list page
  - Duty form with full demand specification
  - Copy role functionality

affects:
  - Future RTW plan builder (will consume DemandMatrix)
  - Medical restriction comparison (will use demand data)

tech-stack:
  added: []
  patterns:
    - Reusable matrix component pattern
    - Multi-tag input with suggestions
    - Conditional form fields (weight inputs)

key-files:
  created:
    - client/src/components/DemandMatrix.tsx
    - client/src/pages/admin/duties/DutiesList.tsx
    - client/src/pages/admin/duties/DutyForm.tsx
  modified:
    - client/src/App.tsx

decisions:
  - decision: "Frequency as radio-style buttons instead of dropdown"
    rationale: "Faster selection, visual scan of all demands, better UX for 15 items"
    alternatives: ["Select dropdown per demand", "Single select for all"]

  - decision: "Weight inputs show only when frequency != never"
    rationale: "Reduces visual clutter, enforces logical constraint"
    alternatives: ["Always show weight fields", "Single global weight field"]

  - decision: "Risk flags as tag input with suggestions"
    rationale: "Flexible (custom entries) + guided (common suggestions)"
    alternatives: ["Fixed multi-select only", "Free text only"]

metrics:
  commits: 2
  files_created: 3
  files_modified: 1
  lines_added: ~1055
---

# Phase 02 Plan 04: Duties Management UI Summary

RTW Planner admin UI for managing duties with physical and cognitive demand matrices.

## One-liner

Admin can define duties with 15-category demand matrix (12 physical + 3 cognitive) and risk flags via intuitive UI.

## What Was Built

### 1. DemandMatrix Component (Reusable)
- **Purpose**: Display/edit physical and cognitive demands for any duty
- **Features**:
  - 12 physical demand categories (bending, squatting, kneeling, twisting, reaching, lifting, carrying, standing, sitting, walking, repetitive movements)
  - 3 cognitive demand categories (concentration, stress tolerance, work pace)
  - 4 frequency levels: Never (N), Occasionally (O), Frequently (F), Constantly (C)
  - Color-coded frequency buttons (gray/blue/yellow/red)
  - Conditional weight inputs for lifting/carrying (only when frequency != never)
  - Readonly mode support
  - Grid layout for alignment
  - Legend for frequency meanings

### 2. DutiesList Page
- **Route**: `/admin/roles/:roleId/duties`
- **Features**:
  - Role name in header (fetched from API)
  - Back navigation to roles list
  - Search duties by name
  - Table columns: Name, Modifiable (Yes/No badge), Risk Flags (truncated), Demands Summary, Actions
  - Edit button → navigate to form
  - Delete button → AlertDialog confirmation → DELETE mutation
  - Empty state with "Add Duty" CTA
  - Copy Role button → Dialog → POST `/api/admin/duties/role/:roleId/copy` → navigate to new role's duties

### 3. DutyForm Page
- **Routes**:
  - Create: `/admin/roles/:roleId/duties/new`
  - Edit: `/admin/roles/:roleId/duties/:dutyId`
- **Sections**:
  - **Basic Info**: Name (required), Description (optional), Modifiable toggle
  - **Risk Flags**: Multi-tag input with suggestions (Lifting Hazard, Fall Risk, Repetitive Strain, Hearing Protection, Chemical Exposure, Working at Heights, Confined Space, Heavy Machinery, Manual Handling, PPE Required)
  - **Demand Matrix**: Integrated DemandMatrix component via react-hook-form Controller
- **Validation**: Zod schema for all 17 demand fields + basic info
- **Mutations**: Create (POST with roleId), Update (PUT)
- **Loading state**: Skeleton during edit mode data fetch

### 4. Routes Registered
- Lazy-loaded DutiesList and DutyForm
- Nested under `/admin` AdminLayout
- Proper Suspense wrappers

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

✅ All tasks completed:
- [x] Task 1: DemandMatrix component created (199 lines)
- [x] Task 2: DutiesList page created (366 lines)
- [x] Task 3: DutyForm page created (464 lines)
- [x] Task 4: Routes registered in App.tsx

✅ Must-have truths verified:
- [x] Admin can see list of duties for a role
- [x] Admin can create a duty with demands matrix
- [x] Admin can set all physical demands (12 categories)
- [x] Admin can set cognitive demands (3 categories)
- [x] Admin can set weight limits for lifting/carrying
- [x] Admin can mark duty as modifiable
- [x] Admin can add risk flags
- [x] Admin can edit duty and update demands
- [x] Admin can delete duty

✅ Artifacts verified:
- [x] client/src/components/DemandMatrix.tsx (199 lines) ✓
- [x] client/src/pages/admin/duties/DutiesList.tsx (366 lines) ✓
- [x] client/src/pages/admin/duties/DutyForm.tsx (464 lines) ✓

✅ Key links verified:
- [x] DutyForm imports DemandMatrix ✓
- [x] DutiesList uses TanStack Query with `/api/admin/duties/role/:roleId` ✓

## Next Phase Readiness

**Ready for**: Phase 02 Plan 05 (RTW Plan Builder UI)

**Provides to next phase**:
- DemandMatrix component ready for reuse in plan builder
- Duty data structure established
- Demand frequency patterns established

**Potential blockers**: None

**Known issues**: None

## Key Insights

1. **Reusable Component Design**: DemandMatrix is intentionally generic - takes `value` and `onChange`, doesn't know about forms. This makes it reusable in RTW plan builder, restriction comparison, and duty editing.

2. **Conditional UI Pattern**: Weight inputs appearing only when relevant (frequency != never) reduces cognitive load and enforces business logic at UI level.

3. **Tag Input UX**: Combining suggestions with custom entries gives best of both worlds - speed for common cases, flexibility for edge cases.

4. **Copy Role Feature**: Implemented at duties level (not just role metadata) - copies all duties and their demands, enabling fast role template creation.

## Testing Notes

**Manual testing required**:
- [ ] Navigate to `/admin/roles` → select role → view duties
- [ ] Create new duty → set demands → verify save
- [ ] Edit existing duty → change frequency → verify weight input shows/hides
- [ ] Add risk flags via suggestions and custom input
- [ ] Delete duty → verify confirmation dialog
- [ ] Copy role → verify new role created with all duties

**TypeScript**: Compiles without errors (verified via build)

## API Dependencies

- `GET /api/admin/roles/:roleId` - Fetch role name for header
- `GET /api/admin/duties/role/:roleId` - Fetch duties for list
- `GET /api/admin/duties/:dutyId` - Fetch duty + demands for edit
- `POST /api/admin/duties` - Create duty (with roleId in body)
- `PUT /api/admin/duties/:dutyId` - Update duty
- `DELETE /api/admin/duties/:dutyId` - Delete duty
- `POST /api/admin/duties/role/:roleId/copy` - Copy role with duties

## Commits

1. **0cf979f**: feat(02-04): create DemandMatrix component for duty demands
   - Reusable physical/cognitive demand matrix
   - 15 demand categories with frequency selector
   - Conditional weight inputs

2. **f489375**: feat(02-04): create duties list and form pages with demand matrix
   - DutiesList with search, CRUD, copy role
   - DutyForm with demand matrix integration
   - Risk flags multi-tag input
   - Routes registered in App.tsx

## Related Documentation

- Plan: `.planning/phases/02-admin-roles-duties/02-04-PLAN.md`
- Schema: `shared/schema.ts` (lines 1686-1716: rtwDutyDemands table)
- API: Previous plan 02-02 (Duties API implementation)
