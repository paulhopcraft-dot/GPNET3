# Preventli (GPNet3) — Comprehensive System Audit

**Date:** 3 March 2026
**Audited by:** Uno (AI Assistant)
**System:** Preventli — Victorian WorkCover Injury & Case Management Platform
**Stack:** React + Vite (frontend) / Express + Drizzle ORM + PostgreSQL (backend) / Claude AI
**Production status:** 174 active cases, 15+ employers, $500K seed funding

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Usability Audit — Case Manager](#2-usability-audit--case-manager)
3. [Usability Audit — AHR Manager](#3-usability-audit--ahr-manager)
4. [Usability Audit — HR Manager](#4-usability-audit--hr-manager)
5. [The "Why" Problem — Missing Explanation Layer](#5-the-why-problem--missing-explanation-layer)
6. [Architecture & Code Quality](#6-architecture--code-quality)
7. [Security & Privacy](#7-security--privacy)
8. [Frontend UX & Accessibility](#8-frontend-ux--accessibility)
9. [Workflow & Business Logic (WorkCover Accuracy)](#9-workflow--business-logic-workcover-accuracy)
10. [Documentation & Onboarding](#10-documentation--onboarding)
11. [Performance & Scalability](#11-performance--scalability)
12. [Master Finding Summary](#12-master-finding-summary)
13. [Prioritised Remediation Roadmap](#13-prioritised-remediation-roadmap)

---

## 1. Executive Summary

### Overall Score: 5.5/10

Preventli has **strong domain logic** — the compliance engine, recovery estimator, termination workflow, and plan generator demonstrate deep WorkCover knowledge. The data model is comprehensive and the AI integration is well-architected.

However, the system has **critical gaps** in security, accessibility, and usability that must be addressed before scaling:

| Dimension | Score | Verdict |
|-----------|-------|---------|
| **Security** | 4/10 | 3 auth bypass routes, fail-open webhook, rate limiter disabled |
| **Accessibility** | 2/10 | Near-zero ARIA attributes, no error boundaries, unlabeled form fields |
| **Case Manager UX** | 6.5/10 | Good action cards, but 3 disconnected action systems, 384px sidebar |
| **AHR Manager UX** | 6/10 | Best-served role, but restrictions not surfaced, compliance not on timeline |
| **HR Manager UX** | 4/10 | No decision queue, no portfolio summary, compliance not plain-language |
| **Architecture** | 6/10 | Good ORM usage, but god files, mock data in production, 116 `any` types |
| **WorkCover Accuracy** | 6/10 | 7 rules implemented, but missing s25, s82 gate, s114 multi-step-down |
| **Documentation** | 3/10 | Specs are brief narratives; code has drifted significantly ahead |
| **Performance** | 5/10 | No `useCallback`/`memo`, god components, no code splitting beyond routes |

### The Three Biggest Problems

1. **Security vulnerabilities in production** — auth bypass on 3 RTW routes, fail-open email webhook, disabled rate limiter
2. **Users can't answer "why?"** — every flag, score, and recommendation lacks explanation of the reasoning behind it
3. **Three disconnected action systems** — case managers see different "next steps" depending which panel they're looking at

---

## 2. Usability Audit — Case Manager

**Core question:** *"Where is this case and what do I need to do next?"*

### What works ✅

- **Traffic-light banner** at top of each case (red/amber/green) gives instant status
- **Action plan card** shows WHO needs to do WHAT by WHEN, with overdue flags and pre-written email drafts
- **RTW plan status state machine** — 7 states with valid transitions, well-enforced
- **Recovery timeline** — expected vs actual curves with "ahead/on track/behind" badges
- **Certificate markers** on timeline are clickable with upload capability
- **Missing certificate interpolation** — system fills gaps at 70% of expected and flags them

### What's broken ❌

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Three disconnected action systems**: Case Action Plan (persisted, checkable), Smart Actions (ephemeral, recomputed each load, "Mark Complete" doesn't persist), Clinical Actions (stateless, regenerated) | Case managers get conflicting "next steps" |
| 2 | **Case detail is a 384px sidebar with 17+ sections** | Everything below the fold is invisible; treatment plans, certs, and restrictions buried |
| 3 | **No persisted lifecycle stage** — database only stores `open/closed` | Can't answer "is this in assessment or active treatment?" at a glance |
| 4 | **No "my cases" vs "all cases" filter** | In a team of case managers, fundamental |
| 5 | **No sort by urgency or days off work** | Case managers triage by severity; can't do this today |
| 6 | **Work restrictions not surfaced** — schema stores detailed restrictions but no dedicated UI section | "What can this worker do right now?" is unanswerable quickly |
| 7 | **Smart Actions / Expert Insights labels** | AI marketing language makes clinical staff skeptical |
| 8 | **Raw enum values leak through** | `not_planned` shown instead of "No RTW Plan" |

### Recommendations

1. **Unify all actions into one persisted system** — one list, one source of truth, one "mark complete"
2. **Full-page case view with tabs**: Overview | Clinical | RTW | Communications
3. **Add lifecycle stage enum to database**: `intake → assessment → active_treatment → rtw_transition → closed`
4. **Add case assignment + "my cases" filter** as first-class features
5. **Surface restrictions prominently** — card at top of case view: "Current capacity: seated work 4hrs/day, no lifting >5kg"

---

## 3. Usability Audit — AHR Manager

**Core question:** *"Is recovery on track and are we treating the right things?"*

The AHR manager sits between case manager and HR — they need clinical depth plus compliance awareness.

### What works ✅

- **Recovery estimator** has 20 injury-specific models with medically-informed phases and milestones
- **Plan generator** auto-recommends `graduated_return` vs `partial_hours` vs `normal_hours` based on restrictions
- **Schedule calculator** generates WorkSafe-aligned graduated schedules (4hrs/3days → 4hrs/5days → 6hrs/5days → 8hrs/5days)
- **Recovery analysis** with trend tracking (improving/stable/declining)

### What's broken ❌

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Recovery timeline is information-dense** — work capacity shown 3 times (chart + panel + ring), risk shown twice | Overwhelms rather than informs |
| 2 | **Compliance deadlines not on recovery timeline** | 10-week RTW plan deadline, 8-week file review, cert expiry not visible alongside recovery phases |
| 3 | **No mechanism to adjust estimated timelines** | AHR managers need to override estimates based on clinical judgment or comorbidities |
| 4 | **RTW form ignores backend intelligence** — 129 blank fields, doesn't pre-populate, submits to wrong endpoint | All the smart plan generation is wasted |
| 5 | **Milestones mix clinical and case management** | "Pain controlled" vs "RTW plan implemented" are different audiences |

### Recommendations

1. **Simplify recovery timeline** — chart + one summary row, remove duplicate panels/rings
2. **Overlay compliance milestones on recovery timeline** — cert due dates, RTW plan deadline, file review
3. **Allow clinical override of recovery estimates** — "Adjust timeline" button with reason field
4. **Fix RTW form** — pre-populate from case data, use plan generator's recommendation, submit to correct API

---

## 4. Usability Audit — HR Manager

**Core question:** *"How many injured workers, what's the cost, are we compliant, do I need to act?"*

### What works ✅

- **Employer Dashboard** exists with case counts and status breakdowns
- **Employer-specific case view** — stripped-down version (good data boundary intent)
- **Termination workflow** — covers multi-stage s82 process
- **Financial tracking page** exists

### What's broken ❌

| # | Issue | Impact |
|---|-------|--------|
| 1 | **No "decisions needed" queue** | HR must scroll all cases to find ones needing their input |
| 2 | **No portfolio summary** — active claims, cost exposure, compliance score in one card | Executives ask for this; HR can't produce it quickly |
| 3 | **Compliance speaks in rule codes** | `CERT_CURRENT: NON_COMPLIANT` means nothing to HR |
| 4 | **No obligation explainer** | HR asks "what am I legally required to do?" — system doesn't answer in plain English |
| 5 | **Data boundary enforcement unclear** | Medical data filtering may be UI-only, not server-enforced — privacy breach risk |
| 6 | **No reporting/export** | Monthly injury report, cost trends, compliance score over time — none exportable |
| 7 | **No RTW plan sign-off workflow** | No structured employer review → approve → sign-off flow |

### Recommendations

1. **Build "Decisions Needed" queue** — filtered to cases requiring HR action specifically
2. **Portfolio summary card** — X active claims, $Y exposure, Z% compliant, W approaching termination
3. **Plain-language compliance** — every rule gets: obligation, legislation reference, consequence, remedy
4. **Server-enforce data boundaries** — medical data must be filtered at API level, not UI
5. **Add export/print for reports** — PDF export of case summary, compliance report, cost analysis

---

## 5. The "Why" Problem — Missing Explanation Layer

**This is the single highest-impact issue across ALL user types.**

The system **tells** users what to do but never **explains why**.

### Examples of the gap

| What the system shows | What users actually need |
|----------------------|------------------------|
| ⚠️ Risk Level: HIGH | "Risk elevated because: off work 2x expected duration, 2 certificate extensions without clinical change, no RTW plan in place" |
| RTW Plan Required | "Worker has been off 8 weeks with lumbar disc injury. Under WorkSafe guidelines, RTW plan must be in place by week 10. Current certificate shows capacity for modified duties." |
| Recovery: 2 weeks behind | "For Grade II ankle sprain, most workers return by week 6. At week 8 with 60% capacity, common causes include inadequate physio frequency or developing chronic pain patterns." |
| CERT_CURRENT: NON_COMPLIANT | "Medical certificate expired 3 days ago. You cannot direct the worker to duties without a current certificate. Risk: WorkSafe improvement notice." |
| Action: Schedule employer meeting | "Worker's certificate now allows modified duties but no suitable duties identified. Employer consultation required under s82(2)." |

### The principle

**Every flag, score, recommendation, and status must answer three questions:**

1. **What** — the status/recommendation itself
2. **Why** — the reasoning behind it, in plain language
3. **So what** — what the user should do about it, with the specific next step

### Implementation approach

Most data already exists in the backend. What's needed is an **explanation rendering layer**:

| Component | Has the data | Needs |
|-----------|-------------|-------|
| Risk level | `TimelineFactor[]` with impacts | Template: "Risk elevated because: {factors}" |
| Compliance | Rule codes + Act references | Plain-language descriptions + consequences |
| RTW recommendation | `recommendPlanType()` logic | Decision explanation per plan type |
| Recovery tracking | `comparedToExpected` + `weeksDifference` | Injury-specific interpretation per phase |
| Actions | Action type + trigger condition | One-line rationale per action |

90% can be **templated** (case-specific variables in standard sentences). 10% edge cases can use Claude for contextual generation.

---

## 6. Architecture & Code Quality

### CRITICAL

| # | Finding | File | Details |
|---|---------|------|---------|
| A1 | **Auth bypass on 3 RTW routes** | `server/routes/rtw.ts` lines 231, 295, 323 | `authorize` passed as reference instead of `authorize()` — middleware never executes |
| A2 | **Fail-open email webhook** | `server/routes/inbound-email.ts` line 44 | When `INBOUND_EMAIL_WEBHOOK_SECRET` unset, accepts ALL requests |
| A3 | **Rate limiter disabled** | `server/middleware/security.ts` line 15 | Set to 100,000 req/15min ("TEMP" comment) |

### HIGH

| # | Finding | File | Details |
|---|---------|------|---------|
| A4 | **Mock/random data in production endpoints** | `server/routes.ts` lines 308-345 | `Math.random()` values served as real statistics (active users, cases processed) |
| A5 | **God files** | Multiple | `routes.ts` (2,114 lines), `storage.ts` (3,626 lines), `recoveryEstimator.ts` (58KB), `freshdesk.ts` (42KB) |
| A6 | **Zero client-side tests** | `client/src/` | No unit or component tests for a healthcare application |
| A7 | **4 broken TODO code paths** | `server/routes.ts` lines 1827, 1893, 1988, 2064 | "TODO: Fix this - IStorage doesn't have query method" — dead code |
| A8 | **116 instances of `: any`** | 29 server files | Top: `intelligenceCoordinator.ts` (9), `routes.ts` (13), `webhooks.ts` (7) |

### MEDIUM

| # | Finding | Details |
|---|---------|---------|
| A9 | **Error messages leak implementation details** | `error.message` returned directly to clients in multiple routes |
| A10 | **`Math.random()` for ID generation** | `server/routes/memory.ts` line 73 — not cryptographically secure |
| A11 | **Unauthenticated diagnostics endpoint** | `/api/diagnostics/env` confirms which services are configured |
| A12 | **Mixed date libraries** | Both `date-fns` and `dayjs` in dependencies |
| A13 | **`@types/*` in production dependencies** | Should be in devDependencies |
| A14 | **Hardcoded company mapping** | `routes.ts` lines 52-58 — should come from database |

---

## 7. Security & Privacy

### CRITICAL

| # | Finding | Risk | Remediation |
|---|---------|------|-------------|
| S1 | **3 routes with auth bypass** (see A1) | Unauthorized access to RTW data, ability to extend plans | Change `authorize` to `authorize()` on lines 231, 295, 323 of `rtw.ts` |
| S2 | **Fail-open email webhook** (see A2) | Fake emails injected into case records | Change to fail-closed: reject when secret not configured |
| S3 | **Rate limiter at 100K/15min** | Effectively no DDoS protection | Reduce to 10,000 or lower |
| S4 | **Data boundary enforcement unclear** | Medical data (diagnosis, treatment) may be accessible to employer roles via API | Audit all endpoints returning case data; enforce role-based field filtering at API layer |

### HIGH

| # | Finding | Risk |
|---|---------|------|
| S5 | **No explicit RBAC on most route handlers** | Routes check `organizationId` ownership but not role-specific permissions (case manager vs HR vs employer) |
| S6 | **Unauthenticated endpoints expose server info** | `/api/system/health` returns uptime; `/api/diagnostics/env` confirms service configuration |
| S7 | **Error messages leak internal details** | Stack traces, DB errors returned to client |

### Australian Privacy Act Considerations

| Requirement | Status |
|------------|--------|
| APP 6 — Use/disclosure of personal info | ⚠️ Medical data may not be filtered by role at API level |
| APP 11 — Security of personal info | ❌ Auth bypass routes, fail-open webhook |
| Health Records Act (Vic) | ⚠️ Medical data has higher protection requirements; current RBAC doesn't distinguish clinical vs employment data |
| Audit trail for medical data access | ✅ `logAuditEvent()` exists on auth events and data changes |
| Encryption at rest | ✅ PostgreSQL (Neon) handles this |

### What's solid ✅

- JWT with httpOnly cookies and refresh token rotation
- CSRF protection via double-submit cookie
- bcrypt password hashing
- Invite-only registration
- Drizzle ORM prevents SQL injection (no raw string interpolation found)
- Multi-tenant isolation via `requireCaseOwnership()` middleware
- Comprehensive audit logging on auth events

---

## 8. Frontend UX & Accessibility

### CRITICAL

| # | Finding | WCAG | Details |
|---|---------|------|---------|
| F1 | **Zero error boundaries** | — | Any component render error crashes the entire app white-screen |
| F2 | **TerminationPanel: 27 unlabeled inputs** | 1.1.1, 1.3.1, 4.1.2 | No `<label>`, `aria-label`, or `htmlFor` on the most legally critical form |
| F3 | **Zero `aria-label` in any page component** | 4.1.2 | Only 20 total `aria-*` attributes in entire codebase, all in UI primitives |

### HIGH

| # | Finding | Details |
|---|---------|---------|
| F4 | **7 god components >800 lines, 3 >1200 lines** | `PreEmploymentForm.tsx` (1,655), `DynamicRecoveryTimeline.tsx` (1,265), `ComprehensiveRTWForm.tsx` (1,246), `CaseDetailPanel.tsx` (1,162) |
| F5 | **13 total `useCallback`/`React.memo` in entire codebase** | Every re-render creates new function references; case list with 50-100 cases will have scroll jank |
| F6 | **`window.confirm()` for destructive actions** | Case closure and contact deletion use browser confirm dialogs (inaccessible, unstyled) |
| F7 | **30+ flat top-level routes, no breadcrumbs in practice** | Breadcrumb component exists in UI library but unused in pages |

### MEDIUM

| # | Finding | Details |
|---|---------|---------|
| F8 | **Duplicate dashboards** | `EmployerDashboard.tsx` + `EmployerDashboardPage.tsx` + `GPNet2Dashboard.tsx` |
| F9 | **Skeleton loading unused** | `ui/skeleton.tsx` exists but no page uses it; loading states are inconsistent |
| F10 | **Empty states are text-only** | "No workers in this category" with no illustrations, suggested actions, or help links |
| F11 | **Forms lack progressive disclosure** | `ContextualHelpSystem.tsx` and `SmartWorkflowWizard.tsx` exist but aren't wired into core forms |
| F12 | **No print/export stylesheets** | Compliance reports and case summaries can't be printed cleanly |
| F13 | **Limited tablet responsiveness** | Some tab layouts overflow on smaller screens |

---

## 9. Workflow & Business Logic (WorkCover Accuracy)

### Case Lifecycle

| Stage | Status | Notes |
|-------|--------|-------|
| Intake / claim notification | ❌ Not modeled | s25 employer notification within 10 days not tracked |
| Initial assessment | ⚠️ Implicit | Inferred from `daysOffWork` heuristic, not persisted |
| Active treatment | ⚠️ Implicit | Same — client-side calculation only |
| RTW transition | ✅ Modeled | 7-state machine with valid transitions |
| Case closure | ⚠️ Binary only | `open/closed` — no structured exit pathways |

### Compliance Rules

| Rule | Implemented | Accuracy |
|------|------------|----------|
| Current medical certificate | ✅ `CERT_CURRENT` | Good — tracks expiry and gaps |
| RTW plan within 10 weeks | ✅ `RTW_PLAN_10WK` | Good — serious injury check |
| File review at 8 weeks | ✅ `FILE_REVIEW_8WK` | Good |
| 13-week payment step-down | ✅ `PAYMENT_STEPDOWN` | Partial — only 13-week, not 52/130 |
| Centrelink clearance | ✅ `CENTRELINK_CLEARANCE` | Good |
| Suitable duties | ✅ `SUITABLE_DUTIES` | Good |
| RTW obligations | ✅ `RTW_OBLIGATIONS` | Good |
| **10-day claim notification (s25)** | ❌ Missing | Employer must notify insurer within 10 days |
| **52-week payment step-down (s114)** | ❌ Missing | Major entitlement change |
| **130-week entitlement limit (s114)** | ❌ Missing | Final entitlement boundary |
| **s82 termination — 52-week gate** | ❌ Missing | Cannot terminate within first 52 weeks |
| **IME scheduling rules** | ❌ Missing | Limits on frequency, notice requirements |
| **Provisional payments (10 business days)** | ❌ Missing | Insurer obligation |
| **s97 conciliation requirements** | ❌ Missing | Dispute resolution process |

### Termination Workflow

| Requirement | Status | Notes |
|------------|--------|-------|
| Multi-stage process | ✅ | PREP_EVIDENCE → AGENT_MEETING → CONSULTANT_CONFIRMATION → PRE_TERMINATION_INVITE → DECISION_PENDING → TERMINATED |
| Consultant report staleness check | ✅ | 6-month recency requirement enforced |
| Pre-termination meeting notice | ✅ | 7-day minimum enforced |
| Letter generation | ✅ | Templates for termination letters |
| **52-week prerequisite check** | ❌ Missing | s82 requires worker to be on WorkCover 52+ weeks before termination |
| **Explicit legislative citations** | ❌ Missing | No s82 reference anywhere in codebase (searched all variants) |
| **WorkSafe notification** | ⚠️ Unclear | Captured in flow but enforcement unclear |

### RTW Planning

| Feature | Status | Notes |
|---------|--------|-------|
| Plan type recommendation | ✅ | Auto-recommends graduated/partial/normal based on restrictions |
| Schedule generation | ✅ | WorkSafe-aligned 4-week graduated schedules |
| Multiple RTW pathways | ⚠️ Partial | Same employer/modified duties partially addressed; different employer placement not structured |
| Worker consent/refusal | ❌ Missing | No tracking of worker agreement to plan |
| Employer duty assessment | ⚠️ Partial | Free-text "alternative duties" field, no structured assessment |

### Edge Cases

| Scenario | Status |
|----------|--------|
| Multiple simultaneous injuries | ❌ Not handled |
| Disputed/rejected claims | ❌ No dispute workflow |
| Aggravation of pre-existing condition | ❌ Not modeled |
| Secondary/consequential injuries | ❌ Not modeled |
| Mental health claims (different management) | ⚠️ `MentalHealthForm.tsx` exists but not integrated into compliance engine |

---

## 10. Documentation & Onboarding

### Specification Quality

| Spec | Quality | Notes |
|------|---------|-------|
| 01-system-overview | ✅ Good | Clear system design overview |
| 07-compliance-engine | ✅ Good | Detailed rule definitions |
| 13-operational-case-workflow | ❌ 7 lines | Brief narrative; code implementation is far more detailed |
| 22-hr-termination | ❌ 3 paragraphs | Code implements 7-stage workflow with letter generation |

**Key gap:** Specs describe *intent*; code implements *mechanics*. The specs **cannot serve as compliance documentation for regulators** because they don't reflect what's actually built.

### Developer Documentation

| Item | Status |
|------|--------|
| README with setup instructions | ⚠️ Basic |
| CLAUDE.md for AI guidance | ✅ Exists |
| API documentation | ⚠️ May exist but likely drifted from implementation |
| Inline code comments | ⚠️ Inconsistent — some services well-commented, others none |
| CONTRIBUTING guide | ❌ Missing |

### User-Facing Documentation

| Item | Status |
|------|--------|
| In-app help text / tooltips | ⚠️ Concentrated in `unified-case-management/` components only; absent from core forms |
| User guide | ❌ None |
| Onboarding wizard | ⚠️ `SmartWorkflowWizard.tsx` exists but may not be wired up |
| First-time experience | ❌ No guided setup for new employers or case managers |
| Contextual help system | ⚠️ `ContextualHelpSystem.tsx` exists but only in unified workspace |

### Error Messages

**Developer-oriented, not user-friendly.** Multiple routes return raw `error.message` including potential stack traces and database errors. Users see technical jargon instead of actionable guidance.

---

## 11. Performance & Scalability

### Frontend

| Concern | Severity | Details |
|---------|----------|---------|
| Missing `useCallback`/`React.memo` | HIGH | Only 13 instances across entire codebase; case lists with 50+ items will re-render excessively |
| God components | HIGH | `CaseDetailPanel.tsx` has 16 `useState`, 5 `useEffect` in one file — every state change re-renders everything |
| No code splitting beyond routes | MEDIUM | Route-level `React.lazy` exists but no component-level splitting |
| No skeleton loading | LOW | Content jumps on load; skeleton component exists but unused |
| Bundle size | MEDIUM | Both `date-fns` and `dayjs` included; could eliminate one |

### Backend

| Concern | Severity | Details |
|---------|----------|---------|
| `storage.ts` is 3,626 lines | HIGH | Single file for all data access — no query caching, connection pooling unclear |
| No pagination on case list endpoints | MEDIUM | With 174 cases now, fine; at 1,000+ will be a problem |
| Compliance engine runs all rules per check | MEDIUM | No selective rule execution or caching of recent results |
| Recovery estimator recalculates each request | LOW | Results could be cached per case with invalidation on new certificate |

---

## 12. Master Finding Summary

### By Severity

| Severity | Count | Key Items |
|----------|-------|-----------|
| **CRITICAL** | 6 | Auth bypass (3 routes), fail-open webhook, rate limiter disabled, zero error boundaries, unlabeled termination form, zero page-level ARIA |
| **HIGH** | 14 | Mock data in prod, god files, zero client tests, missing lifecycle stage, 3 disconnected action systems, missing s82 52-week gate, missing s25/s114 compliance rules, no HR decision queue, no "why" explanations |
| **MEDIUM** | 13 | 116 `any` types, error message leakage, insecure ID generation, duplicate dashboards, no breadcrumbs, no export, RTW form broken, missing edge cases |
| **LOW** | 8 | Inconsistent loading states, minimal empty states, date library duplication, tooltip gaps, style inconsistencies |

### By Dimension

| Dimension | Score | Biggest Gap |
|-----------|-------|-------------|
| Security | **4/10** | Auth bypass on production routes |
| Accessibility | **2/10** | Effectively zero WCAG compliance |
| HR Manager UX | **4/10** | No decision queue, no plain-language compliance |
| Documentation | **3/10** | Specs don't match reality; no user guide |
| Performance | **5/10** | Missing memoization; god components |
| Case Manager UX | **6.5/10** | 3 disconnected action systems |
| AHR Manager UX | **6/10** | Good domain models but not surfaced in UI |
| Architecture | **6/10** | Good ORM/auth patterns undermined by god files and tech debt |
| WorkCover Accuracy | **6/10** | Core rules solid; missing important secondary rules |

---

## 13. Prioritised Remediation Roadmap

### Phase 1: Security & Stability (Week 1-2) 🔴

**Must-fix before any scaling. These are production vulnerabilities.**

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1.1 | Fix `authorize` → `authorize()` on 3 RTW routes | 15 min | Closes auth bypass |
| 1.2 | Change email webhook to fail-closed | 30 min | Prevents email injection |
| 1.3 | Reduce rate limiter to 10K/15min | 5 min | Restores DDoS protection |
| 1.4 | Add error boundaries (top-level + per-route) | 2 hrs | Prevents app-wide crashes |
| 1.5 | Remove/protect diagnostic endpoints | 30 min | Stops info leakage |
| 1.6 | Audit data boundary enforcement (server-side) | 4 hrs | Ensures medical data privacy |
| 1.7 | Remove mock `Math.random()` data from production endpoints | 1 hr | Users see real data |
| 1.8 | Sanitize error responses (no raw `error.message` to client) | 2 hrs | Prevents info leakage |

### Phase 2: The "Why" Layer (Week 2-4) 🟡

**Highest-impact UX improvement across all roles.**

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 2.1 | Add explanation templates for compliance rules (obligation + legislation + consequence + remedy) | 1 day | HR can understand compliance |
| 2.2 | Surface `TimelineFactor[]` as plain-language risk explanations | 4 hrs | Case managers can explain risk to stakeholders |
| 2.3 | Add decision chain explanations to RTW recommendations | 4 hrs | AHR managers trust the system's suggestions |
| 2.4 | Add clinical interpretation to recovery "behind/ahead" status | 4 hrs | Actionable rather than just informational |
| 2.5 | Add one-line rationale to every action recommendation | 1 day | "Why this action, why now?" answered |
| 2.6 | Add legislative citations to termination workflow (s82 references) | 2 hrs | Defensible audit trail |

### Phase 3: Case Manager Experience (Week 3-6) 🟡

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 3.1 | Unify action systems into one persisted list | 3 days | Single "what's next?" for every case |
| 3.2 | Add lifecycle stage enum to database + UI | 2 days | "Where is this case?" answered at a glance |
| 3.3 | Full-page case view with tabs (Overview / Clinical / RTW / Comms) | 3 days | End the 384px sidebar era |
| 3.4 | Add case assignment + "my cases" filter | 1 day | Team case management |
| 3.5 | Surface restrictions as top-level card on case view | 4 hrs | "What can this worker do?" instantly visible |
| 3.6 | Overlay compliance milestones on recovery timeline | 1 day | Unified view of clinical + regulatory deadlines |

### Phase 4: HR Manager Experience (Week 4-6) 🟡

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 4.1 | Build "Decisions Needed" queue for HR | 2 days | HR sees only what needs their action |
| 4.2 | Portfolio summary card (claims, cost, compliance, terminations) | 1 day | Executive-ready at-a-glance view |
| 4.3 | RTW plan employer sign-off workflow | 2 days | Structured review → approve → sign-off |
| 4.4 | Add export/PDF for case summaries and compliance reports | 2 days | HR can report to leadership |

### Phase 5: WorkCover Completeness (Week 5-8) 🟡

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 5.1 | Add s82 52-week prerequisite check to termination | 4 hrs | Legal safety |
| 5.2 | Add s25 10-day claim notification rule | 4 hrs | Compliance completeness |
| 5.3 | Add s114 52-week and 130-week payment step-downs | 1 day | Full entitlement tracking |
| 5.4 | Add worker consent tracking to RTW plans | 4 hrs | Required under RTW Code of Practice |
| 5.5 | Handle multiple simultaneous claims per worker | 2 days | Edge case that will arise with scale |

### Phase 6: Quality & Accessibility (Week 6-10) 🔵

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 6.1 | Add `aria-label` to all interactive elements in core pages | 2 days | WCAG 2.1 AA baseline |
| 6.2 | Label all form fields in TerminationPanel | 4 hrs | Legal form must be accessible |
| 6.3 | Replace `window.confirm()` with proper modal dialogs | 4 hrs | Consistent, accessible confirmations |
| 6.4 | Add `useCallback`/`React.memo` to case list and detail components | 2 days | Performance with 100+ cases |
| 6.5 | Break up god components (CaseDetailPanel, PreEmploymentForm) | 3 days | Maintainability |
| 6.6 | Add client-side component tests for critical flows | 5 days | Safety net for healthcare app |
| 6.7 | Wire up ContextualHelpSystem and SmartWorkflowWizard to core forms | 2 days | Guided UX for all users |
| 6.8 | Update specs to match implementation | 3 days | Specs usable for compliance audits |

---

## Appendix: Positive Findings

Things the system does well and should be preserved:

- **JWT auth with httpOnly cookies, refresh rotation, CSRF protection** — solid auth architecture
- **Drizzle ORM throughout** — no SQL injection risk found
- **Multi-tenant isolation** via `requireCaseOwnership()` — properly enforced
- **Comprehensive audit logging** — `logAuditEvent()` on auth and data changes
- **20 injury-specific recovery models** — medically-informed phases and milestones
- **RTW plan state machine** — 7 states with valid transitions, best-modeled part of system
- **Compliance engine infrastructure** — evaluates WIRC Act rules with auto-generated actions
- **Plan generator decision logic** — sound, WorkSafe-aligned recommendations
- **Schedule calculator** — follows WorkSafe Victoria graduated return guidelines
- **Certificate integration on timeline** — clickable markers, upload capability, missing cert interpolation
- **Termination workflow** — multi-stage process with evidence gathering, consultant confirmation, letter generation
- **AI integration** — Claude used for summaries, compliance analysis, action recommendations

---

*Report generated 3 March 2026. Based on static code analysis of the Preventli (GPNet3) codebase.*
