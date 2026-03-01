---
phase: 03-medical-integration
plan: 01
subsystem: certificate-extraction
tags: [claude-haiku, llm, drizzle, jsonb, rtw-planner]
dependency-graph:
  requires: ["01-01"]
  provides: ["functionalRestrictionsJson-field", "restriction-extractor-service", "certificate-pipeline-integration"]
  affects: ["03-02", "04-01", "05-01"]
tech-stack:
  added: []
  patterns: ["fire-and-forget-async", "claude-haiku-extraction", "jsonb-structured-storage"]
key-files:
  created:
    - server/services/restrictionExtractor.ts
    - migrations/0010_add_functional_restrictions_json.sql
  modified:
    - shared/schema.ts
    - server/services/certificatePipeline.ts
decisions:
  - decision: "FunctionalRestrictionsExtracted interface extends base FunctionalRestrictions"
    rationale: "Allows time limits (maxWorkHoursPerDay, maxWorkDaysPerWeek) and extraction metadata to be stored alongside capabilities"
    phase: "03-01"
  - decision: "Fire-and-forget extraction in certificate pipeline"
    rationale: "Extraction errors should not block certificate creation; extraction can be retried later"
    phase: "03-01"
  - decision: "Edge case handling without LLM calls"
    rationale: "Fit/unfit capacity states have deterministic mappings; saves API costs for simple cases"
    phase: "03-01"
metrics:
  duration: "7 minutes"
  completed: "2026-01-28"
---

# Phase 3 Plan 01: Schema + Restriction Extractor Service Summary

**One-liner:** Claude Haiku extraction service parses medical certificate data into FunctionalRestrictionsExtracted JSONB, integrating asynchronously into certificate upload pipeline.

## What Was Built

### Task 1: Schema Update
- Added `functionalRestrictionsJson` JSONB field to `medical_certificates` table
- Created `FunctionalRestrictionsExtracted` interface extending `FunctionalRestrictions`:
  - `maxWorkHoursPerDay?: number` - time limit from reduced hours restrictions
  - `maxWorkDaysPerWeek?: number` - weekly work limit
  - `repetitiveMovementsMaxPerHour?: number` - MED-06 quantitative limit
  - `extractionConfidence?: number` - confidence score from extraction
  - `extractedAt?: string` - timestamp of extraction

### Task 2: Restriction Extractor Service
Created `server/services/restrictionExtractor.ts` with:
- `extractFunctionalRestrictions(input)` - main extraction function
- `RestrictionExtractionInput` interface for input data
- `RestrictionExtractionResult` interface for output
- Claude Haiku (claude-3-haiku-20240307) integration matching certificateService.ts pattern

**Edge case handling (no LLM call):**
- `fit` capacity with no restrictions -> all "can"
- `unfit` capacity -> all "cannot"
- No usable data -> all "not_assessed" with low confidence

**Physical demands extracted (15 categories):**
- sitting, standingWalking, bending, squatting, kneelingClimbing
- twisting, reachingOverhead, reachingForward, neckMovement
- lifting (with liftingMaxKg), carrying (with carryingMaxKg)
- pushing, pulling, repetitiveMovements (with repetitiveMovementsMaxPerHour)
- useOfInjuredLimb

### Task 3: Database Migration
- Created `migrations/0010_add_functional_restrictions_json.sql`
- Applied via `npm run db:push` - changes applied successfully

### Task 4: Pipeline Integration
Modified `server/services/certificatePipeline.ts`:
- Imported `extractFunctionalRestrictions` from new service
- Added async extraction call after certificate creation
- Fire-and-forget pattern: errors logged but don't block pipeline
- Helper function `extractFunctionalRestrictionsForCertificate` handles extraction and update

## Key Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Added FunctionalRestrictionsExtracted interface and functionalRestrictionsJson field |
| `server/services/restrictionExtractor.ts` | LLM-based restriction extraction service (409 lines) |
| `server/services/certificatePipeline.ts` | Certificate upload flow with extraction integration |
| `migrations/0010_add_functional_restrictions_json.sql` | Database migration for new column |

## Commits

| Commit | Task | Description |
|--------|------|-------------|
| `533bc52` | 1 | Add functionalRestrictionsJson field to medical_certificates schema |
| `ab6d03a` | 2 | Create restrictionExtractor service for medical certificate parsing |
| `f1f3048` | 3 | Add migration for functional_restrictions_json column |
| `dcde9fe` | 4 | Integrate restriction extraction into certificate upload flow |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| FunctionalRestrictionsExtracted extends FunctionalRestrictions | Allows additional metadata (time limits, extraction info) while maintaining compatibility with base interface |
| Fire-and-forget async extraction | Extraction should not block certificate creation; can be retried later if failed |
| Edge case handling without LLM | Deterministic mappings for fit/unfit save API costs and provide instant results |
| Weight validation (0-100kg) | Reasonable range for human lifting restrictions; flags unreasonable values |

## Verification

- [x] `npm run build` (tsc) passes
- [x] shared/schema.ts has functionalRestrictionsJson field on medicalCertificates
- [x] server/services/restrictionExtractor.ts exports extractFunctionalRestrictions
- [x] Database has functional_restrictions_json column (via db:push)
- [x] Certificate upload flow calls extractFunctionalRestrictions

## Success Criteria Met

- [x] FunctionalRestrictions can be stored on medical certificates
- [x] Extraction service parses certificate data using Claude Haiku
- [x] All 15 demand categories covered
- [x] Time limits extracted: maxWorkHoursPerDay, maxWorkDaysPerWeek
- [x] Weight limits extracted: liftingMaxKg, carryingMaxKg
- [x] Extraction runs automatically on certificate upload

## Next Phase Readiness

**Phase 3 Plan 02 can proceed:** The extraction service and storage are ready. Plan 02 can:
- Query functionalRestrictionsJson from current certificates
- Build API endpoint for current restrictions
- Create UI component for restriction display

**Dependencies satisfied:**
- MED-01 through MED-08: FunctionalRestrictions data structure ready
- MED-09: Extraction confidence tracked for quality assurance
- MED-10: Integration with certificate upload complete

**Blockers:** None
