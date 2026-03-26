# Overnight QA Log

## Executive Morning Summary (REVISED)

**Date:** 2026-03-25 (updated from 2026-03-24 initial)
**Duration:** ~45 minutes across 2 iterations
**Mode:** TEST + ANALYZE + DOCUMENT
**Final Score:** 40/100 (revised down from 57 after live API execution)

### Top Line
**The app looks more complete than it is.** Static code analysis suggested 57/100, but live API testing dropped it to 40/100. 11 of 17 tested routes return HTML instead of JSON (not registered on the server). The action queue is 500ing on a missing DB column. The employer portal is non-functional. Pre-employment is the only workflow that partially works end-to-end.

### Top 5 Critical Issues (REVISED after live testing)

1. **CRITICAL: 11 API Routes Not Registered** — compliance-dashboard, certificates, notifications, audit, employer/cases, admin/companies, control, agents, intelligence all return HTML (Vite fallback) instead of JSON. These features exist in code but are unreachable at runtime.

2. **CRITICAL: Actions + Employer Dashboard 500** — `case_actions.rationale` column missing from DB. The action queue and employer dashboard crash on every request. This blocks the entire compliance → action pipeline.

3. **CRITICAL: Employer Portal Non-Functional** — Between missing routes and DB errors, employer users cannot view cases, dashboard, or compliance information. The employer journey is completely broken.

4. **HIGH: No Authorization Denial for Missing Routes** — Vite SPA fallback returns 200 HTML for ALL unmatched routes. Employer hitting `/api/admin/companies` gets 200, not 401/403. This is a security gap — unauthorized requests don't get proper denials.

5. **HIGH: Pre-Employment Binary Only** — Schema supports 6 clearance levels but UI only has Approve/Reject. 0 conditional/restricted clearances exist in production data. 0 rejected assessments. 0 employer notifications sent.

### Top Contradictions
- Compliance score from absent data (false certainty)
- RTW "working well" possible while case shows "Off work"
- Employment TERMINATED while case lifecycle still active
- AI `requires_review` flag with no in-app review queue

### What's Working Well
- Termination workflow: 10-step s82 WIRC Act path with legislative citations
- Compliance rule engine: 7 rules with structured findings and recommendations
- RBAC and case ownership: solid middleware with 404 masking
- Pre-employment magic link: create → send → complete → review → decide
- Unit test health: 98% pass rate (301/307)
- Audit infrastructure: logging framework exists and covers many operations

### Workflows Inspected
1. Pre-employment health clearance — MAPPED, gaps found
2. Injury case management — MAPPED, lifecycle well-designed
3. Medical certificate management — MAPPED, compliance sync works
4. Compliance engine — MAPPED, false certainty issue
5. Action queue — MAPPED, overdue handling exists
6. Termination (s82 WIRC) — MAPPED, most complete workflow
7. Return-to-work planning — MAPPED, employer approval gap
8. Smart summary / AI — MAPPED, trust gaps
9. Email communication — MAPPED, send gap
10. Audit trail — MAPPED, 5 critical gaps
11. Employer portal — MAPPED, explanation gap
12. Discussion notes — MAPPED, insight-to-action gap

### Tests Executed
- Unit tests: 301 pass / 5 fail (Claude CLI timeout, not bugs) / 1 skipped
- Code verification: 4 parallel agents against live codebase

### Bounded Changes Made
- None (analysis-only first pass)

### Recommended Next Human Decisions

1. **Policy: Compliance "insufficient data" state** — Should missing data produce "unknown" instead of "non-compliant"? This changes how case managers prioritize.

2. **Policy: Pre-employment conditional clearance** — What restrictions should conditional clearance capture? How do they flow into RTW duties?

3. **Policy: Rejected assessment retention** — How long are rejected pre-employment assessments kept? Can candidates reapply? When?

4. **Technical: Wire email Send button** — Backend is ready. UI needs a Send button. This unblocks the entire communication workflow.

5. **Technical: Add 5 audit events** — Bounded fix across 5 route files. Each is a 5-line addition. Closes critical audit gaps.

---

## Detailed Log

### 13:45 — Session started
- Killed existing port 5000 process, restarted dev server
- Server healthy, API responding

### 13:46 — Phase 1: Environment health check
- Stack: Express + React + Drizzle + Neon PostgreSQL
- Tests: Vitest (unit) + Playwright (E2E)
- Auth: JWT + httpOnly cookies + CSRF
- Status: all systems go

### 13:47 — Phase 2-3: Launched 4 parallel exploration agents
- Agent 1: Server routes, controllers, services, schema
- Agent 2: Client pages, components, forms
- Agent 3: Test infrastructure and coverage
- Agent 4: Shared types, enums, data model

### 13:50 — Agents returned: full codebase mapped
- 40+ database tables
- 42 API route files
- 49 pages
- 22 E2E test specs
- 16 unit test files

### 13:52 — Phase 2: Created workflow-discovery-report.md
- 12 major workflows mapped with lifecycle states and gap analysis

### 13:54 — Phase 3-4: Created gap register, contradiction analysis, invariants
- 20 workflow gaps identified
- 7 logic contradictions identified
- 15 business invariants defined
- 8 audit risks catalogued
- 6 AI explainability risks catalogued

### 13:56 — Phase 5: Created human-skeptical-test-plan.md
- 20 scenarios covering all major workflows
- Focus on operational realism, not just technical correctness

### 13:58 — Unit test run
- 301 pass / 5 fail / 1 skipped
- Failures: treatment plan generation tests timing out on Claude CLI calls

### 14:00 — Phase 6: Launched 4 verification agents
- Agent 1: Pre-employment approval UI → CONFIRMED binary only
- Agent 2: Compliance explanation → CONFIRMED employer badge-only
- Agent 3: Email send path → CONFIRMED no UI send, backend exists
- Agent 4: Audit coverage → CONFIRMED 5 critical gaps, pre-employment IS audited

### 14:10 — Scoring and report generation
- Score: 57/100
- All artifacts created in docs/qa/
