# Compliance Engine Disconnect — Root Cause Analysis

**Date:** 2026-03-25
**Severity:** CRITICAL
**Impact:** complianceIndicator shown to users is stale and disconnected from actual compliance state

---

## The Problem

There are **TWO independent compliance systems** that do NOT sync:

### System A: Freshdesk-based (Legacy) → Sets `complianceIndicator`
- **File:** `server/services/freshdesk.ts:304-438`
- Reads Freshdesk custom fields and tags
- Checks deadline dates, `cf_valid_until`, `cf_latest_medical_certificate`
- **Writes** to `workerCase.complianceIndicator`
- Only runs during Freshdesk sync
- Does NOT query `medical_certificates` table

### System B: Rules Engine (New) → Stores to `case_compliance_checks`
- **File:** `server/services/complianceEngine.ts:51-152`
- Evaluates 16 rules including CERT_CURRENT (queries actual certificates)
- Returns CaseComplianceReport with overallStatus + complianceScore
- **Does NOT update** `workerCase.complianceIndicator`
- Runs on-demand or nightly via scheduler

## The Result

The `complianceIndicator` field that users see on dashboards, case lists, and employer views is **always the Freshdesk-derived value** and **never reflects the Rules Engine evaluation**.

### Example: Priya Nair
- **Shown:** complianceIndicator = "Very High"
- **Reality:** 440 days off work, 0 certificates in medical_certificates table
- **Rules Engine would say:** NON_COMPLIANT (no certificate on file)
- **Why the lie:** Freshdesk tag `has_certificate` was set, Freshdesk deadline was not overdue

## The Fix

**Option A (Quick):** After nightly `evaluateCase()`, update `complianceIndicator`:
```typescript
// In complianceScheduler.ts processComplianceForCase()
const report = await evaluateCase(caseId);
const indicator = scoreToIndicator(report.complianceScore);
await db.update(workerCases)
  .set({ complianceIndicator: indicator })
  .where(eq(workerCases.id, caseId));
```

**Option B (Better):** Remove `complianceIndicator` from `worker_cases` entirely. Always compute live from Rules Engine. Cache with TTL if performance is a concern.

## Affected Users

- Case managers see stale compliance badges
- Employers see meaningless compliance indicators
- Compliance dashboard aggregates stale data
- 10 cases currently show High/Very High compliance with no certificate
