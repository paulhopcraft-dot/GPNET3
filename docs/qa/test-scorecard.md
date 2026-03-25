# Test Scorecard

**Generated:** 2026-03-24
**Rubric:** Strict workflow-focused scoring (100 points)
**Method:** Static code analysis + schema inspection + agent-verified findings

---

## Scoring Pass #1 — Baseline

| Category | Weight | Score | Justification |
|----------|--------|-------|---------------|
| Workflow Completeness | 25 | 14/25 | Pre-employment: 6 clearance levels but only 2 in UI. Email: backend can send but UI is draft+copy. RTW employer approval: no dedicated UI. Termination: backend complete, UI unclear. Certificate chase: action created but send path incomplete. Case reopening: not supported. |
| Business Logic Consistency | 20 | 12/20 | Compliance engine produces scores from absent data (false certainty). RTW status and work status updated independently (contradictions possible). Employment status and lifecycle stage not synchronized. Compliance override exists but enforcement unclear. |
| Explanation Visibility | 15 | 8/15 | ComplianceReportCard: excellent rule-level detail. But employer view: badge+one-liner only. AI summaries: no correction mechanism. Pre-employment AI analysis: no review basis visible to clinician. Treatment plans: AI-generated without mandatory clinical sign-off. |
| Edge-Case Coverage | 10 | 4/10 | No handling for: multiple overlapping certificates, case reopening, terminated-but-active-case contradiction, pre-employment resubmission, action cascade on closure, concurrent assessment updates. |
| State-Transition Validity | 10 | 7/10 | Lifecycle transitions well-defined with LIFECYCLE_TRANSITIONS. Termination steps validated. RTW plan transitions defined. But: TERMINATION_ABORTED dead end, unused pre-employment states (scheduled, in_progress), no closed→open transition. |
| Auditability / Traceability | 10 | 5/10 | Good: pre-employment approval, lifecycle transitions, RTW status changes, compliance dashboard views. Bad: action completion NOT audited, AI summary NOT audited, recovery override NOT audited, agent action approval NOT audited. No audit export. |
| Permission Correctness | 5 | 4/5 | RBAC middleware enforced. Case ownership middleware prevents cross-org access. Admin cross-tenant access works. Returns 404 not 403 (good). Only gap: employer role action restrictions unclear. |
| Regression Safety | 5 | 3/5 | 301/307 unit tests pass (5 timeout on Claude CLI, not bugs). E2E historically 31% pass rate. No CI for E2E. Integration tests exist but require live DB. Good service test coverage for core logic, poor for infrastructure. |

---

## **TOTAL: 57/100**

---

## Scoring Pass #2 — After Live API Execution (2026-03-25)

API-level testing revealed **critical runtime issues** not visible in static analysis.

| Category | Weight | Pass 1 | Pass 2 | Delta | Justification |
|----------|--------|--------|--------|-------|---------------|
| Workflow Completeness | 25 | 14 | 9 | -5 | 11 of 17 API routes return HTML (not registered). Compliance dashboard, certificates, notifications, audit, employer cases, admin, control tower, agents, intelligence — all non-functional. Actions 500 (missing DB column). |
| Business Logic Consistency | 20 | 12 | 10 | -2 | Cannot evaluate compliance logic in practice — dashboard route missing. Actions broken means compliance → action pipeline is dead. |
| Explanation Visibility | 15 | 8 | 5 | -3 | Compliance dashboard not serving — full rule detail is inaccessible at runtime. Only pre-employment clearance badges actually render. |
| Edge-Case Coverage | 10 | 4 | 3 | -1 | 0 cases, 0 workers, 0 RTW plans in org-alpha — 11 of 20 scenarios untestable due to missing data. |
| State-Transition Validity | 10 | 7 | 6 | -1 | Cannot verify transitions at runtime (routes missing). Schema is correct. |
| Auditability / Traceability | 10 | 5 | 3 | -2 | Audit listing route not registered — audit data written but unreadable via API. |
| Permission Correctness | 5 | 4 | 2 | -2 | Vite SPA fallback returns HTML 200 for all unmatched routes — no 401/403 for unauthorized API access. Security gap. |
| Regression Safety | 5 | 3 | 2 | -1 | DB schema mismatch (rationale column) means actions and employer dashboard crash. No migration guard. |

## **REVISED TOTAL: 40/100** (was 57)

### New Critical Issues Found in Live Testing
1. **CRITICAL: 11 API routes not registered** — return HTML instead of JSON
2. **CRITICAL: `case_actions.rationale` column missing** — Actions + employer dashboard 500
3. **HIGH: No API 404/401 for missing routes** — Vite catches everything with 200 HTML
4. **CRITICAL: Employer portal non-functional** — routes missing + DB error
5. **HIGH: 0 case data in org-alpha** — majority of workflows untestable

### Scenario Execution Results
- **PASS:** 0 of 20
- **PARTIAL PASS:** 1 (pre-employment list/magic link)
- **PARTIAL FAIL:** 2 (email draft, RBAC)
- **FAIL:** 6 (rejection retrieval, conditional clearance, compliance dashboard, certificates, action queue, employer portal, audit)
- **CANNOT TEST:** 11 (no data or broken routes)

See `scenario-execution-report.md` for full details.

---

## Scoring Pass #3 — After DB Fix + Real Data Analysis (2026-03-25)

Fixed 23 missing DB columns. Analyzed 334 real cases via direct DB queries.

| Category | Weight | Pass 2 | Pass 3 | Delta | Justification |
|----------|--------|--------|--------|-------|---------------|
| Workflow Completeness | 25 | 9 | 12 | +3 | Actions endpoint fixed (200). Employer dashboard fixed (300 cases visible). Pre-employment works. But: 0 RTW plans, 0 email drafts, 22 stuck terminations, 300 cases stuck in intake. |
| Business Logic Consistency | 20 | 10 | 8 | -2 | WORSE than estimated: 16 cases have stale `has_certificate` flag. 3 cases marked compliant with no cert. 2 different compliance naming systems. Mixed case risk levels. 400-day off-work cases rated "Very High" compliance. |
| Explanation Visibility | 15 | 5 | 7 | +2 | Compliance dashboard alive with rich data (topIssues, trendData). But employer view still badge-only. |
| Edge-Case Coverage | 10 | 3 | 4 | +1 | Real data reveals edge cases: mixed naming, stale booleans, lifecycle stagnation. |
| State-Transition Validity | 10 | 6 | 5 | -1 | 300/334 cases stuck in intake. 22/22 terminations stuck at NOT_STARTED. Lifecycle transitions not being triggered. |
| Auditability / Traceability | 10 | 3 | 4 | +1 | Audit events exist and capture real activity (1817 case.list, 796 logins). But 5 critical event types still missing. |
| Permission Correctness | 5 | 2 | 4 | +2 | Employer org-scoping works (300 cases visible). CSRF blocks mutations. Auth 401 works. |
| Regression Safety | 5 | 2 | 3 | +1 | E2E pass rate 89% (47/53). DB columns fixed. |

## **REVISED TOTAL: 47/100** (was 40, up 7 from DB fix, down from false data quality)

### Key Finding: Data Integrity Is the Biggest Risk
- 16 stale `has_certificate` flags → false compliance scores
- 2 compliance naming systems → filtering bugs
- 3 risk level casings → missed cases in filters
- 652/660 certificates expired → chase workflow not functioning
- 300/334 cases stuck in intake → lifecycle not progressing

See `production-data-contradictions.md` for full analysis.
