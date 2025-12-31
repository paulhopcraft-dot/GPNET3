# GPNet UI Charter Compliance Redesign

## Executive Summary

This document outlines the UI redesign strategy to align with the Post-Frontend Architecture Charter. The audit revealed **~18% charter alignment** in the current frontend. This redesign transforms the UI from an "operating environment" to a "control surface."

## Current State vs Target State

| Aspect | Current (Violation) | Target (Compliant) |
|--------|--------------------|--------------------|
| **CaseDetailPanel** | 39K monolith, 15+ useState, embedded workflows | Narrative display + minimal action buttons |
| **TerminationPanel** | 25+ form fields, 8-stage workflow | Status narrative + single "Continue Process" button |
| **RTWPlannerPage** | Client-side state machine | Backend-driven transitions with explanation |
| **Dashboards** | Interactive filters, charts, click-to-navigate | Narrative reports with action queue |
| **EmailDraftModal** | 2-step wizard | Single-page with AI draft + confirm |

## Core Redesign Principles

### 1. Narrative Over Interactivity
Every screen must answer these questions without requiring clicks:
- **What happened?** → Case narrative/summary
- **Why did it happen?** → Rule/obligation explanations
- **What happens next?** → Next action with rationale

### 2. Backend Owns All Logic
- State machines (RTW, termination) → Backend validates transitions
- Calculations (cost, recovery) → Backend computes, frontend displays
- Business rules → Backend enforces, frontend shows outcomes

### 3. Minimal Control Surface
- Maximum 3 primary actions per view
- Actions are confirmations, not data entry
- Forms collect rationale, not workflow state

### 4. Disposable UI
- All narratives must be API-fetchable (already in place)
- No frontend-only state that couldn't be reconstructed
- Voice/API-only mode must be feasible

---

## Component Redesign Specifications

### 1. CaseNarrative (replaces CaseDetailPanel)

**Before:** 1000+ lines, 15+ state variables, embedded sub-workflows
**After:** ~200 lines, pure display component

```
┌─────────────────────────────────────────────────┐
│ Worker Name                          [Actions ▼]│
├─────────────────────────────────────────────────┤
│ CASE NARRATIVE (from Smart Summary API)         │
│ ─────────────────────────────────────           │
│ "John Smith sustained a lower back injury on    │
│ 15 Oct 2024 while lifting equipment. Currently  │
│ on partial duties with physiotherapy ongoing.   │
│ Recovery on track - expected RTW by Feb 2025."  │
│                                                 │
│ COMPLIANCE STATUS                               │
│ ─────────────────                               │
│ ● Certificate: Valid until 15 Jan 2025         │
│ ● RTW Plan: In progress, working well          │
│ ● Risk Level: Medium (specialist pending)      │
│                                                 │
│ NEXT ACTIONS                                    │
│ ─────────────                                   │
│ 1. Request specialist appointment → [Send]     │
│ 2. Review certificate on 10 Jan  → [Schedule]  │
│                                                 │
│ WHY THESE ACTIONS?                              │
│ "Specialist referral was made 3 weeks ago but  │
│ no appointment has been confirmed. WorkSafe    │
│ requires specialist input within 28 days of    │
│ referral for cases with ongoing restrictions." │
└─────────────────────────────────────────────────┘
```

**Key Changes:**
- Remove all useState except loading/error
- Remove embedded TerminationPanel, TreatmentPlanCard workflows
- Fetch single `/api/cases/:id/narrative` endpoint
- Actions link to simple confirmation pages

### 2. TerminationStatus (replaces TerminationPanel)

**Before:** 25+ form fields, inline multi-stage workflow
**After:** Status display + single action button

```
┌─────────────────────────────────────────────────┐
│ EMPLOYMENT CAPACITY REVIEW        [In Progress] │
├─────────────────────────────────────────────────┤
│ CURRENT STAGE: Pre-Termination Invite Sent      │
│                                                 │
│ WHAT'S HAPPENING:                               │
│ "Pre-termination meeting scheduled for 20 Jan   │
│ 2025 at 10:00 AM. Worker has been notified      │
│ they may bring a support person."               │
│                                                 │
│ PREVIOUS STEPS COMPLETED:                       │
│ ✓ Evidence & Alternatives documented            │
│ ✓ Agent meeting held (15 Jan 2025)              │
│ ✓ Consultant confirmed long-term restrictions   │
│                                                 │
│ NEXT STEP:                                      │
│ "After the meeting, record outcome and any new  │
│ medical information provided."                  │
│                                                 │
│                    [Record Meeting Outcome →]   │
└─────────────────────────────────────────────────┘
```

**Key Changes:**
- Remove 25+ useState fields
- Fetch `/api/termination/:id/narrative` (new endpoint)
- Single button leads to focused action page
- All form data entry on separate route

### 3. RTWStatus (replaces RTWPlannerPage)

**Before:** State machine validation, modal dialogs
**After:** List view with inline status + action links

```
┌─────────────────────────────────────────────────┐
│ RETURN TO WORK PLANS                            │
├─────────────────────────────────────────────────┤
│ ATTENTION REQUIRED (2)                          │
│ ─────────────────────                           │
│ • John Smith - Plan failing                     │
│   "No progress in 2 weeks. Consider reassess."  │
│   [Update Status]                               │
│                                                 │
│ • Sarah Jones - Stalled at 60%                  │
│   "Worker reports increased pain. Review cert." │
│   [Update Status]                               │
│                                                 │
│ ON TRACK (5)                                    │
│ ─────────────                                   │
│ • Mike Brown - Working well (85% recovered)     │
│ • Lisa White - In progress (Week 4 of 12)       │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

**Key Changes:**
- Remove `VALID_TRANSITIONS` client-side state machine
- Backend returns `availableTransitions` array
- Simple list with inline narratives
- Status update via `/api/cases/:id/rtw-status` with validation

### 4. CaseReports (replaces RiskDashboard, Financials, Reports)

**Before:** Multiple dashboard pages with charts, filters
**After:** Single narrative report page with sections

```
┌─────────────────────────────────────────────────┐
│ PORTFOLIO REPORT              Generated: Today  │
├─────────────────────────────────────────────────┤
│ EXECUTIVE SUMMARY                               │
│ "12 active cases across 4 companies. 2 cases    │
│ require immediate attention (compliance risk).  │
│ Overall RTW rate on track at 78%."              │
│                                                 │
│ ATTENTION REQUIRED                              │
│ ─────────────────                               │
│ 1. John Smith (ABC Corp) - Certificate expired  │
│    "Last valid certificate: 01 Dec 2024"        │
│    → [Request Certificate]                      │
│                                                 │
│ 2. Sarah Jones (XYZ Ltd) - RTW plan failing     │
│    "No progress since 15 Nov 2024"              │
│    → [Review Plan]                              │
│                                                 │
│ RISK DISTRIBUTION                               │
│ High: 2 | Medium: 4 | Low: 6                    │
│                                                 │
│ FINANCIAL SUMMARY                               │
│ Est. weekly cost: $45,000                       │
│ Projected savings if RTW on track: $12,000/wk  │
└─────────────────────────────────────────────────┘
```

**Key Changes:**
- Remove Recharts visualizations
- Narrative-first with inline metrics
- Single API endpoint for full report
- Actions embedded in narrative

---

## New API Endpoints Required

### Case Narrative API
```
GET /api/cases/:id/narrative
Response: {
  summary: string,           // AI-generated case narrative
  complianceStatus: {...},   // Structured compliance data
  nextActions: [{
    id: string,
    description: string,
    rationale: string,       // Why this action is needed
    endpoint: string         // API to call
  }],
  riskExplanation: string,   // Why current risk level
  timelineExplanation: string // Recovery trajectory explanation
}
```

### Termination Narrative API
```
GET /api/termination/:id/narrative
Response: {
  currentStage: string,
  stageDescription: string,
  completedSteps: [{stage, completedAt, summary}],
  nextStep: {
    description: string,
    rationale: string,
    action: string
  },
  warnings: string[]
}
```

### Portfolio Report API
```
GET /api/reports/portfolio
Response: {
  executiveSummary: string,
  attentionRequired: [{caseId, workerName, issue, action}],
  riskDistribution: {high, medium, low},
  financialSummary: {weeklyCost, projectedSavings},
  generatedAt: string
}
```

---

## Implementation Phases

### Phase 1: Backend Narrative Endpoints (Required First)
- [ ] Add `/api/cases/:id/narrative` endpoint
- [ ] Add `/api/termination/:id/narrative` endpoint
- [ ] Add `/api/reports/portfolio` endpoint
- [ ] Ensure all endpoints include rationale/explanation fields

### Phase 2: Core Component Refactor
- [ ] Create `CaseNarrative` component (replace CaseDetailPanel)
- [ ] Create `TerminationStatus` component (replace TerminationPanel)
- [ ] Create `RTWStatus` component (replace RTWPlannerPage)

### Phase 3: Dashboard Consolidation
- [ ] Create `PortfolioReport` page (replace Risk, Financials, Reports)
- [ ] Simplify main dashboard to case list + action queue

### Phase 4: Cleanup
- [ ] Remove deprecated components
- [ ] Remove unused dependencies (Recharts if not needed)
- [ ] Update tests

---

## Charter Validation Checklist

For each new component:
- [ ] Does it encode business logic? → NO
- [ ] Does it require multi-step navigation? → NO
- [ ] Can info be delivered via text/voice? → YES
- [ ] Does it exist to be clicked or to clarify? → TO CLARIFY

**Final Question:** "If the UI were removed tomorrow, would GPNet still function?"
→ YES - All logic in backend, narratives API-accessible

---

## File Changes Summary

| File | Action | Reason |
|------|--------|--------|
| `CaseDetailPanel.tsx` | Replace | Monolithic, workflow-heavy |
| `TerminationPanel.tsx` | Replace | Form-heavy, 8-stage workflow |
| `RTWPlannerPage.tsx` | Simplify | Client-side state machine |
| `RiskDashboardPage.tsx` | Merge → PortfolioReport | Dashboard pattern |
| `FinancialsPage.tsx` | Merge → PortfolioReport | Dashboard pattern |
| `ReportsPage.tsx` | Merge → PortfolioReport | Charts, filters |
| `EmailDraftModal.tsx` | Simplify | 2-step wizard |

---

## Implementation Status

### Completed (Phase 1)

**Backend Narrative Endpoints** (`server/routes/narrative.ts`):
- [x] `GET /api/cases/:id/narrative` - Complete case narrative with explanations
- [x] `GET /api/termination/:workerCaseId/narrative` - Termination process narrative
- [x] `GET /api/reports/portfolio` - Portfolio report with executive summary

### Completed (Phase 2)

**New Charter-Compliant Components**:
- [x] `CaseNarrative.tsx` - Replaces CaseDetailPanel (~250 lines vs 1000+)
- [x] `TerminationStatus.tsx` - Replaces TerminationPanel (~180 lines vs 600+)
- [x] `RTWStatusCard.tsx` - Simplified RTW status display (~180 lines)
- [x] `PortfolioReportPage.tsx` - Replaces Risk/Financials/Reports dashboards

### Integration Points

**Existing components should migrate to new components**:
- `GPNet2Dashboard` → Use `CaseNarrative` instead of `CaseDetailPanel`
- `CaseSummaryPage` → Use `TerminationStatus` instead of `TerminationPanel`
- `RTWPlannerPage` → Use `RTWStatusCard` for each case
- Navigation → Add `/portfolio` route for consolidated reporting

### Migration Notes

The new components are designed as **drop-in replacements**:

1. **CaseNarrative**: Pass `caseId`, `workerName`, `onClose` props
2. **TerminationStatus**: Pass `caseId`, `workerName`, `onContinue` props
3. **RTWStatusCard**: Pass case data from narrative response
4. **PortfolioReportPage**: Self-contained, fetches own data

Legacy components remain functional during migration. Remove after verification.
