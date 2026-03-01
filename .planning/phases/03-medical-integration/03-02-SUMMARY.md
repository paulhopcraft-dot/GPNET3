---
phase: 03-medical-integration
plan: 02
subsystem: restriction-aggregation
tags: [rest-api, drizzle, aggregation, rtw-planner]
dependency-graph:
  requires: ["03-01"]
  provides: ["restriction-mapper-service", "current-restrictions-api", "multi-certificate-aggregation"]
  affects: ["04-01", "05-01", "10-01"]
tech-stack:
  added: []
  patterns: ["most-restrictive-wins", "case-ownership-middleware", "typed-json-aggregation"]
key-files:
  created:
    - server/services/restrictionMapper.ts
    - server/routes/restrictions.ts
  modified:
    - server/storage.ts
    - server/routes.ts
decisions:
  - decision: "CAPABILITY_PRIORITY as constant mapping"
    rationale: "Clear precedence order: cannot(3) > with_modifications(2) > can(1) > not_assessed(0)"
    phase: "03-02"
  - decision: "Weight limits use minimum value"
    rationale: "Lower weight limit = more restrictive = safer for worker"
    phase: "03-02"
  - decision: "Rest requirements use maximum value"
    rationale: "More rest time required = more restrictive = safer for worker"
    phase: "03-02"
  - decision: "Return source indicator in API"
    rationale: "UI can show whether restrictions come from single cert or combined sources"
    phase: "03-02"
metrics:
  duration: "5 minutes"
  completed: "2026-01-28"
---

# Phase 3 Plan 02: Restriction Mapper + Current Restrictions API Summary

**One-liner:** Multi-certificate restriction aggregation service with "most restrictive wins" logic and protected API endpoint for RTW planning screen.

## What Was Built

### Task 1: restrictionMapper.ts Service
Created `server/services/restrictionMapper.ts` with:
- `CAPABILITY_PRIORITY` constant: `{cannot: 3, with_modifications: 2, can: 1, not_assessed: 0}`
- `getMostRestrictive(capabilities[])` - returns highest priority capability from array
- `combineRestrictions(restrictionsList[])` - aggregates multiple FunctionalRestrictions using:
  - Capability fields: highest priority wins
  - Weight limits (liftingMaxKg, carryingMaxKg): minimum value (more restrictive)
  - Rest requirements (exerciseMinutesPerHour, restMinutesPerHour): maximum value (more restrictive)
  - Review dates (nextExaminationDate): earliest date (soonest review)

### Task 2: getCurrentRestrictions Storage Method
Added to `server/storage.ts`:
- Import `combineRestrictions` from restrictionMapper service
- Import `FunctionalRestrictions` type from schema
- New method `getCurrentRestrictions(caseId, organizationId)` that:
  - Verifies case ownership before querying
  - Queries certificates where `isCurrentCertificate=true OR endDate >= today`
  - Returns null if no certificates or no restrictions extracted
  - Single certificate: returns restrictions directly
  - Multiple certificates: combines using `combineRestrictions`
  - Returns source indicator ("single_certificate" | "combined") and certificate count

### Task 3: Restrictions API Endpoint
Created `server/routes/restrictions.ts` with:
- `GET /api/cases/:id/current-restrictions`
- JWT authentication via `authorize()`
- Case ownership check via `requireCaseOwnership()`
- Returns 404 with hint when no restrictions found
- Returns: restrictions, maxWorkHoursPerDay, maxWorkDaysPerWeek, source, certificateCount, retrievedAt

Registered in `server/routes.ts`:
- Import `restrictionRoutes` from `./routes/restrictions`
- Mount at `/api/cases` prefix

## Key Files

| File | Purpose |
|------|---------|
| `server/services/restrictionMapper.ts` | Multi-certificate aggregation with priority logic (211 lines) |
| `server/storage.ts` | getCurrentRestrictions method with combineRestrictions call |
| `server/routes/restrictions.ts` | Protected API endpoint for current restrictions |
| `server/routes.ts` | Route registration for restrictions endpoint |

## Commits

| Commit | Task | Description |
|--------|------|-------------|
| `6862af2` | 1 | Create restrictionMapper service for multi-certificate aggregation |
| `b79a7d8` | 2 | Add getCurrentRestrictions method to storage |
| `cb19683` | 3 | Add GET /api/cases/:id/current-restrictions endpoint |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| CAPABILITY_PRIORITY as constant mapping | Clear precedence order for combining restrictions |
| Weight limits use minimum | Lower weight = more restrictive = safer for worker |
| Rest requirements use maximum | More rest = more restrictive = safer for worker |
| Earliest review date | Sooner review = more restrictive = more cautious |
| Return source indicator | UI can display whether combined or single source |
| 404 for no restrictions | Clear signal that extraction hasn't run or no valid certs exist |

## Verification

- [x] `npm run build` (tsc) passes
- [x] server/services/restrictionMapper.ts exports combineRestrictions
- [x] storage.getCurrentRestrictions method exists and imports combineRestrictions
- [x] GET /api/cases/:id/current-restrictions returns 404 when no restrictions found

## Success Criteria Met

- [x] Multiple certificates combine correctly (most restrictive wins)
- [x] Priority order: cannot > with_modifications > can > not_assessed
- [x] Weight limits use minimum (more restrictive)
- [x] Rest requirements use maximum (more restrictive)
- [x] API endpoint is JWT-protected with case ownership check
- [x] Response includes source indicator (single vs combined)

## Next Phase Readiness

**Phase 3 Plan 03 can proceed:** The API endpoint and aggregation logic are ready. Plan 03 can:
- Build UI component to display current restrictions
- Show restriction matrix on RTW planning screen
- Display source indicator and certificate count

**Phase 4 (Functional Ability Matrix) can proceed:** The current restrictions can be queried to:
- Compare restrictions against job duty demands
- Calculate duty suitability (suitable/with_modification/not_suitable)
- Generate RTW plan recommendations

**Dependencies satisfied:**
- MED-09: Current restrictions queryable by case ID
- MED-10: Multiple certificates combine using most restrictive logic

**Blockers:** None
