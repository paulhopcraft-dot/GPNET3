# Production Data Contradiction Report

**Date:** 2026-03-25
**Method:** Direct DB queries against 334 real cases
**Source:** org-alpha (all cases are in one org)

---

## Data Profile

| Metric | Value |
|--------|-------|
| Total cases | 334 |
| At work | 143 (43%) |
| Off work | 186 (56%) |
| Mixed/legacy work status | 5 (1.5%) |
| Has certificate | 328 (98%) |
| No certificate | 6 |
| Total certificates | 660+ |
| Expired certificates | 652 (99%!) |
| Expiring in 7 days | 2 |
| Actions pending | 108 |
| Actions done | 9 |
| Lifecycle: intake | 300 (90%) |
| Lifecycle: active_treatment | 17 |
| Lifecycle: closed_rtw | 11 |
| Lifecycle: maintenance | 5 |
| Lifecycle: assessment | 1 |

---

## CONFIRMED CONTRADICTIONS

### CONTRADICTION-002 CONFIRMED: Long Off-Work + High Compliance

**3 workers off work 400+ days with High or Very High compliance:**

| Worker | Days Off Work | Compliance |
|--------|--------------|------------|
| Ava Thompson | 446 | High |
| Harper Lin | 444 | High |
| Priya Nair | 440 | Very High |

**Why this matters:** A worker off work for 440+ days with "Very High" compliance is operationally misleading. The compliance engine is saying "everything is fine" when a real case manager would flag this as a stalled case needing intervention. High compliance should not be possible with 400+ days off work without an active RTW plan showing progress.

### CONTRADICTION-001 CONFIRMED: No Certificate But Compliance Scored

**6 cases with no certificate but still given a compliance score:**

| Worker | Compliance | Has Cert | Work Status |
|--------|-----------|----------|-------------|
| Maria Santos | compliant | false | MODIFIED_DUTIES |
| David Nguyen | compliant | false | FULL_DUTIES |
| Tom Caldwell | compliant | false | MODIFIED_DUTIES |
| Sarah Mitchell | at-risk | false | OFF_WORK |
| James Thornton | non-compliant | false | OFF_WORK |
| Wood | Very Low | false | Off work |

**Why this matters:** A case cannot be "compliant" without a medical certificate — that's a core Victorian workers' compensation requirement (s112 WIRC Act). Maria Santos, David Nguyen, and Tom Caldwell are all marked "compliant" with no certificate. This is false compliance.

---

## DATA QUALITY ISSUES

### ISSUE-001: Compliance Indicator Naming Inconsistency

Two different naming systems co-exist:

**System A (Severity-based, 5 levels — 329 cases):**
- Very High: 133
- Very Low: 131
- Medium: 50
- Low: 12
- High: 3

**System B (Status-based, 3 levels — 5 cases):**
- compliant: 3
- at-risk: 1
- non-compliant: 1

**Impact:** Code that checks `complianceIndicator === 'compliant'` will miss 133 "Very High" cases that are probably compliant. Code that shows color badges will mis-map System B values.

### ISSUE-002: Risk Level Case Inconsistency

Mixed casing:
- `Low`: 191, `low`: 1
- `Medium`: 100, `medium`: 2
- `High`: 38, `high`: 2

**Impact:** Filtering by `risk_level = 'High'` misses 2 cases with `'high'`.

### ISSUE-003: Work Status Naming Inconsistency

Mixed naming:
- `Off work`: 186, `OFF_WORK`: 2
- `At work`: 143
- `MODIFIED_DUTIES`: 2
- `FULL_DUTIES`: 1

**Impact:** 5 cases use non-standard work status values that won't match UI filters.

### ISSUE-004: 90% of Cases Stuck in Intake

300 of 334 cases (90%) are in `intake` lifecycle stage with avg age 52 days. This suggests:
- Lifecycle transitions are not being triggered automatically
- Cases are not progressing through the expected lifecycle
- The lifecycle feature may not be actively used

### ISSUE-005: 652 of 660 Certificates Expired (99%)

Almost all certificates are expired. This either means:
- Certificate renewal is not being tracked
- Test/demo data has old dates
- The certificate chase workflow is not functioning

### ISSUE-006: 108 Pending Actions, Only 9 Done

92% of actions are still pending. This suggests:
- The action queue is not being worked
- Or actions are being generated faster than completed
- Or the action completion workflow has friction

---

## AUDIT TRAIL FINDINGS

| Event Type | Count | Assessment |
|-----------|-------|------------|
| case.list | 1817 | Heavy usage — users browsing cases |
| user.login | 796 | Active user base |
| case.view | 699 | Cases being viewed |
| user.login_failed | 98 | 12% failure rate (high) |
| ai.summary.generate | 47 | AI being used |
| ai.treatment_plan.generate | 34 | Treatment plans generated |
| webhook.processed | 29 | Freshdesk integration active |
| case.update | 24 | Very few case updates vs views (3.4%) |
| termination_process_created | 22 | Termination workflow in use |
| compliance.dashboard.view | 10 | Low compliance dashboard usage |

**Notable:**
- 98 failed logins vs 796 successful = 12% failure rate (investigate brute force or UX issue)
- Only 24 case updates vs 699 views = 3.4% update rate (users viewing but not acting?)
- Only 10 compliance dashboard views — feature underused or undiscoverable

---

## CRITICAL DATA INTEGRITY ISSUES

### ISSUE-007: has_certificate Flag Disagrees with Actual Certificates (16 cases)

**16 cases have `has_certificate=true` but ZERO rows in `medical_certificates` table.**

| Worker | has_certificate | Actual Certs |
|--------|----------------|-------------|
| Harper Lin | true | 0 |
| Ava Thompson | true | 0 |
| Leo Gutierrez | true | 0 |
| Marcus Reid | true | 0 |
| Priya Nair | true | 0 |
| Sofia Marin | true | 0 |
| Ethan Wells | true | 0 |
| + 9 more | true | 0 |

**Impact:** The compliance engine trusts `has_certificate` to determine certificate compliance. These 16 cases appear to have certificates but actually don't. This explains why Priya Nair (440 days off work) shows "Very High" compliance — the system thinks she has a certificate.

**Root cause:** The `has_certificate` boolean on `worker_cases` is denormalized and not synced with `medical_certificates` table. Likely set during Freshdesk import but certificates stored elsewhere (e.g., as URLs, not as DB records).

### ISSUE-008: Zero RTW Plans, Zero Email Drafts

- **0 RTW plans** in the database despite 186 off-work cases
- **0 email drafts** despite 108 pending actions
- This means the RTW planner and email draft features are either unused or not generating data

### ISSUE-009: Discussion Notes Have No Extracted Insights

- 3 discussion notes exist (all for case FD-44415)
- All have `next_steps=null` and `risk_flags=null`
- AI insight extraction is not running or not producing output

### ISSUE-010: All 22 Termination Processes Are NOT_STARTED

- 22 termination processes created but ALL are `NOT_STARTED` with `NO_DECISION`
- No case has progressed beyond the first step
- Either the termination UI is not being used, or the workflow is too complex

---

## RECOMMENDED IMMEDIATE ACTIONS (Priority Order)

### P0 — Data Integrity (Do First)
1. **Sync `has_certificate` with actual certificate data** — 16 cases claim to have certs but don't. This single fix will correct multiple false compliance scores. SQL: `UPDATE worker_cases SET has_certificate = false WHERE id NOT IN (SELECT DISTINCT case_id FROM medical_certificates)`
2. **Normalize compliance naming** — Map `compliant` → `Very High`, `at-risk` → `Medium`, `non-compliant` → `Very Low`. Or add mapping layer in ComplianceEngine.
3. **Normalize risk level casing** — `UPDATE worker_cases SET risk_level = initcap(risk_level) WHERE risk_level != initcap(risk_level)`
4. **Normalize work status** — Map `OFF_WORK` → `Off work`, `MODIFIED_DUTIES` → `At work`, `FULL_DUTIES` → `At work`

### P1 — Compliance Logic
5. **Add time-based compliance escalation** — 400+ days off work + no RTW progress should cap compliance at "Medium" maximum
6. **Add "insufficient data" compliance state** — Don't score compliance when key data (certificates, RTW plan) is missing

### P2 — Workflow Usage
7. **Investigate 300 cases stuck in intake** — Are lifecycle transitions configured? Running?
8. **Investigate 652 expired certificates** — Is this real data or stale demo? If real, certificate chase workflow is failing.
9. **Investigate 22 NOT_STARTED termination processes** — Is the UI workflow accessible and usable?
10. **Investigate 12% login failure rate** — 98 failures vs 796 successes
