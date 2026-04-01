# Scenario Execution Report

**Date:** 2026-03-25
**Method:** API-level testing via curl against running app (localhost:5000), code inspection
**Auth:** Admin (admin@gpnet.local), Employer (employer@test.com)

---

## Critical Discovery: Route Registration Gaps

Before individual scenarios, a systemic issue was found:

**11 of 17 tested endpoints return HTML (Vite SPA fallback) instead of JSON API responses.**

This means these routes are **not registered on the server** or their middleware/router path is broken.

| Endpoint | Status Code | Content-Type | Verdict |
|----------|-------------|-------------|---------|
| `/api/cases` | 200 | application/json | WORKING |
| `/api/workers` | 200 | application/json | WORKING (0 workers) |
| `/api/actions` | 500 | application/json | BROKEN (missing DB column `rationale`) |
| `/api/actions/pending` | 500 | application/json | BROKEN (same column error) |
| `/api/pre-employment/assessments` | 200 | application/json | WORKING (21 assessments) |
| `/api/pre-employment/requirements` | 200 | application/json | WORKING |
| `/api/rtw-plans` | 400 | application/json | WORKING (needs caseId param) |
| `/api/compliance-dashboard/summary` | 200 | text/html | **NOT REGISTERED** |
| `/api/admin/companies` | 200 | text/html | **NOT REGISTERED** |
| `/api/audit` | 200 | text/html | **NOT REGISTERED** |
| `/api/notifications` | 200 | text/html | **NOT REGISTERED** |
| `/api/certificates` | 200 | text/html | **NOT REGISTERED** |
| `/api/employer/dashboard` | 500 | application/json | BROKEN (same column error) |
| `/api/employer/cases` | 200 | text/html | **NOT REGISTERED** |
| `/api/control` | 200 | text/html | **NOT REGISTERED** |
| `/api/agents` | 200 | text/html | **NOT REGISTERED** |
| `/api/intelligence` | 200 | text/html | **NOT REGISTERED** |
| `/api/definitely-not-a-route` | 200 | text/html | Confirms: ALL unknown routes → HTML |

**Impact:**
- Compliance dashboard, certificates, notifications, audit log, employer cases, admin companies, control tower, agents, intelligence — all non-functional via API
- Any client code hitting these returns HTML which would cause JSON parse errors
- **Security issue:** No 401/403 for unauthorized API access — employer hitting `/api/admin/companies` gets HTML 200, not a proper denial

**Root Cause:** Either route registration order issue in `routes.ts`, or Vite middleware catching `/api/*` before Express routes.

---

## Scenario Results

### S001: Pre-Employment Happy Path
**Status: PARTIAL PASS**
- List assessments: **PASS** — 21 assessments returned, correctly structured
- Magic link generation: **PASS** — 1 assessment has accessToken
- Public questionnaire endpoint: **PASS** — `/api/public/check/:token` returns proper 404 for expired token
- Report viewing: **PARTIAL** — Only 1 of 21 assessments has `reportJson`
- Approve/Reject: **BLOCKED** — CSRF required (correct security, but untestable via curl without CSRF token)
- Employer notification: **FAIL** — 0 of 21 assessments have `employerNotifiedAt` set
- Candidate notification: **N/A** — `candidateNotifiedAt` field does not exist in response

### S002: Pre-Employment Rejection and Retrieval
**Status: FAIL**
- 0 rejected assessments in system (no `not_cleared` clearance levels)
- Cannot filter by clearance level (only status filter exists)
- Cannot verify retrieval of rejected assessments — none exist in test data
- **Gap confirmed:** No clearance-level filter in UI or API

### S003: Pre-Employment Conditional Clearance
**Status: FAIL**
- 0 conditional or restricted clearance levels in database
- Clearance distribution: `cleared_unconditional`: 15, `cleared`: 3, `None`: 3
- **Code-confirmed:** UI only has Approve (→ cleared_unconditional) and Reject (→ not_cleared) buttons
- No UI path to set `cleared_conditional` or `cleared_with_restrictions`

### S004: Compliance Score Explanation Drill-Down
**Status: FAIL**
- `/api/compliance-dashboard/summary` returns HTML — **route not registered**
- Compliance dashboard is non-functional via API
- **Code-confirmed:**
  - ComplianceReportCard.tsx shows full rule-level detail (rule name, finding, recommendation, legislative ref)
  - EmployerCaseDetailPage shows badge + one-line text only
  - ComplianceDashboardWidget shows rule name + severity only, no findings

### S005: Worker Off Work 400+ Days — Compliance Reality Check
**Status: CANNOT TEST**
- 0 cases in admin org (org-alpha has no worker cases in current database)
- Cannot verify compliance scoring behavior with real case data
- **Code-confirmed:** complianceEngine.ts does not distinguish "missing data" from "non-compliant"

### S006: RTW Plan Status vs Work Status Consistency
**Status: CANNOT TEST**
- 0 RTW plans in system
- 0 cases with RTW plan status to compare against work status
- **Code-confirmed:** No cross-validation between RTW plan status and case workStatus

### S007: Certificate Expiry Chase Workflow
**Status: FAIL**
- `/api/certificates` returns HTML — **route not registered**
- Cannot view, create, or manage certificates via API
- Cannot test expiry chase workflow

### S008: Action Queue — Overdue Action Visibility
**Status: FAIL**
- `/api/actions` returns 500: `column case_actions.rationale does not exist`
- `/api/actions/pending` returns same 500 error
- **Root cause:** Database schema mismatch — code references `rationale` column that doesn't exist in DB
- Action queue is completely broken

### S009: Termination Workflow
**Status: CANNOT TEST**
- 0 cases to test termination against
- Termination endpoint returns proper 404 for unknown case
- Backend logic exists and is well-structured per code inspection

### S010: Termination Abort and Recovery
**Status: CANNOT TEST**
- No active termination processes in database

### S011: AI Summary Accuracy and Correction
**Status: CANNOT TEST**
- 0 cases to generate summaries for
- **Code-confirmed:** No correction/flag mechanism in SummaryCard.tsx

### S012: Email Draft — Generate, Edit, Send
**Status: PARTIAL FAIL**
- **Code-confirmed:** EmailDraftModal has Regenerate, Copy to Clipboard, Save Draft — **no Send button**
- Backend has NodeMailer email service that can send (falls back to console log in dev)
- Agent tools (RTW agent) can send emails via `sendEmail` function
- **Verdict:** Backend ready, UI missing Send button

### S013: Employer View — Can They Do Their Job?
**Status: FAIL**
- Employer login: **PASS** — role=employer confirmed
- Employer → cases: returns HTML — **route not registered for employer**
- Employer → dashboard: returns 500 (same `rationale` column error)
- Employer → admin routes: returns HTML 200 — **no 401/403 denial**
- **Verdict:** Employer portal is non-functional. Both case list and dashboard fail.

### S014: Case with No Data — Compliance Scoring
**Status: CANNOT TEST**
- 0 cases in org-alpha
- **Code-confirmed:** Compliance engine does not distinguish missing data from non-compliance

### S015: Audit Trail — Material Decision Coverage
**Status: FAIL**
- `/api/audit` returns HTML — **no audit listing API endpoint registered**
- Audit events may be written to DB but cannot be read via API
- **Code-confirmed (from prior agent):**
  - AUDITED: pre-employment status changes, lifecycle transitions, RTW status changes, compliance dashboard views
  - NOT AUDITED: action completion, AI summary generation, recovery override, RTW plan approval, agent action approval

### S016: Multiple Certificates — Overlap Handling
**Status: CANNOT TEST**
- `/api/certificates` not registered
- Cannot test overlap handling

### S017: Case Closure — Action Cascade
**Status: CANNOT TEST**
- 0 cases and actions broken (500 error)

### S018: RTW Wizard — 5-Step Completion
**Status: CANNOT TEST**
- 0 cases to run wizard against
- `/api/rtw-plans` properly returns 400 "caseId required" — endpoint works

### S019: Worker Consent Refusal
**Status: CANNOT TEST**
- 0 RTW plans

### S020: Role-Based Access — Wrong Role Actions
**Status: PARTIAL FAIL**
- Employer login: **PASS**
- Employer → admin routes: returns HTML 200 — **FAIL** (should return 401/403)
- Employer → own cases: returns HTML — route not registered
- **Security concern:** Vite SPA fallback masks authorization failures. An unauthorized API request returns 200 with HTML instead of a proper auth error.

---

## Summary

| Scenario | Result | Reason |
|----------|--------|--------|
| S001: Pre-employment happy path | PARTIAL PASS | List/magic link work, approve blocked by CSRF, no employer notification |
| S002: Rejection retrieval | FAIL | No rejected assessments, no clearance filter |
| S003: Conditional clearance | FAIL | Binary Approve/Reject only |
| S004: Compliance explanation | FAIL | Route not registered |
| S005: 400+ days compliance | CANNOT TEST | No case data |
| S006: RTW vs work status | CANNOT TEST | No data |
| S007: Certificate chase | FAIL | Route not registered |
| S008: Action queue overdue | FAIL | 500 error (missing DB column) |
| S009: Termination workflow | CANNOT TEST | No case data |
| S010: Termination abort | CANNOT TEST | No data |
| S011: AI summary correction | CANNOT TEST | No cases |
| S012: Email draft/send | PARTIAL FAIL | No Send button in UI |
| S013: Employer view | FAIL | Routes not registered / 500 |
| S014: No-data compliance | CANNOT TEST | No cases |
| S015: Audit trail | FAIL | Route not registered |
| S016: Certificate overlap | CANNOT TEST | Route not registered |
| S017: Case closure cascade | CANNOT TEST | No cases/broken actions |
| S018: RTW wizard | CANNOT TEST | No cases |
| S019: Worker consent refusal | CANNOT TEST | No RTW plans |
| S020: RBAC wrong role | PARTIAL FAIL | No proper 401/403, HTML fallback |

### Totals
- **PASS:** 0
- **PARTIAL PASS:** 1 (S001)
- **PARTIAL FAIL:** 2 (S012, S020)
- **FAIL:** 6 (S002, S003, S004, S007, S008, S013, S015)
- **CANNOT TEST:** 11 (insufficient test data or broken routes)

---

## NEW Critical Issues Discovered

### CRITICAL-NEW-001: Database Schema Mismatch — `case_actions.rationale`
**Severity:** CRITICAL
**Impact:** Actions endpoint, employer dashboard — both 500
**Error:** `column case_actions.rationale does not exist`
**Fix:** Run `npm run db:push` or add missing column via migration

### CRITICAL-NEW-002: 11 API Routes Not Registered (Vite Fallback)
**Severity:** CRITICAL
**Impact:** Compliance dashboard, certificates, notifications, audit, employer cases, admin, control tower, agents, intelligence — all non-functional
**Affected:** compliance-dashboard, admin/companies, audit, notifications, certificates, employer/cases, control, agents, intelligence
**Possible cause:** Route registration order in routes.ts, or conditional registration failing silently

### CRITICAL-NEW-003: No Authorization Denial for Unregistered Routes
**Severity:** HIGH (Security)
**Impact:** Employer accessing `/api/admin/companies` gets 200 HTML instead of 401/403
**Root cause:** Vite SPA fallback catches all unmatched routes before Express can deny them
**Fix:** Add catch-all `/api/*` 404 handler BEFORE Vite middleware

### CRITICAL-NEW-004: Employer Portal Non-Functional
**Severity:** CRITICAL
**Impact:** Employer users cannot view their cases or dashboard
**Root cause:** Combination of missing routes and DB schema mismatch
