# Interactive Action Plan Feature

## Problem Statement
Complex cases like Jacob Gunn have no clear plan. The plan is buried in 30+ emails across merged tickets. Case managers need:
1. **A visible plan** - What needs to happen next?
2. **Progress tracking** - What's done? What's pending?
3. **Auto-detection** - System detects when actions complete based on incoming emails

## Solution: Interactive Action Plan

### Visual Design

```
┌─────────────────────────────────────────────────────────────┐
│ CASE PLAN - Jacob Gunn                                      │
├─────────────────────────────────────────────────────────────┤
│ ☐ Get latest CoC from DXC (confirm current restrictions)    │
│   WHO: GPNet (Paul) · BY WHEN: Jan 3, 2026 (3 days ago)    │
│   Priority: High · 🚨 OVERDUE                               │
│                                                              │
│ ☐ Chase Centrelink clearance status                         │
│   WHO: GPNet (Paul) · BY WHEN: Awaiting response           │
│   Priority: High · 🚫 BLOCKER - Blocks payment processing   │
│                                                              │
│ ☐ Symmetry: decide terminate vs continue employment         │
│   WHO: Symmetry (Michelle) · BY WHEN: Jan 10, 2026         │
│   Priority: Medium                                          │
│                                                              │
│ ✓ Forklift placement identified at IG Design                │
│   WHO: DXC (Saurav) · COMPLETED: Dec 4, 2025               │
│   (auto-detected from email)                                │
│                                                              │
│ ✗ Connect Team placement (research tasks)                   │
│   WHO: DXC (Saurav) · FAILED: Dec 1, 2025                  │
│   Reason: Jacob's dyslexia/computer inexperience            │
│                                                              │
│ [+ Add manual action]                                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Always Visible** - Top of case detail panel, above summary
2. **Interactive Checkboxes** - Click to mark complete
3. **Status Indicators**:
   - ☐ Pending (white checkbox)
   - ⏳ In Progress (blue, spinner)
   - ✓ Completed (green checkmark)
   - ✗ Failed/Cancelled (red X)
   - 🚫 Blocker (red, urgent)

4. **Auto-Completion from Emails**:
   - System scans incoming emails for keywords
   - If email mentions "certificate attached", mark "Get certificate" as done
   - Show "auto-detected from email" badge

5. **AI-Generated from Summary**:
   - Summary extraction already identifies next actions
   - Now displayed prominently as interactive plan
   - Updated each time summary regenerates

## Database Schema Changes

### Add to `case_actions` table:

```sql
-- WHO does what
ALTER TABLE case_actions ADD COLUMN assigned_to VARCHAR; -- User/organization responsible
ALTER TABLE case_actions ADD COLUMN assigned_to_name VARCHAR; -- Display name (e.g., "GPNet (Paul)", "DXC (Saurav)")

-- BY WHEN
ALTER TABLE case_actions ADD COLUMN due_date TIMESTAMP; -- Already exists, but critical

-- Completion tracking
ALTER TABLE case_actions ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE case_actions ADD COLUMN completed_by VARCHAR;
ALTER TABLE case_actions ADD COLUMN auto_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE case_actions ADD COLUMN email_reference VARCHAR; -- Email ID that triggered completion

-- Status indicators
ALTER TABLE case_actions ADD COLUMN is_blocker BOOLEAN DEFAULT FALSE;
ALTER TABLE case_actions ADD COLUMN failed BOOLEAN DEFAULT FALSE;
ALTER TABLE case_actions ADD COLUMN failure_reason TEXT;
```

### Update status types:
- `pending` → Action not started
- `in_progress` → Someone is working on it
- `done` → Completed successfully
- `failed` → Attempted but didn't work
- `cancelled` → No longer relevant

## Implementation Plan

### Phase 1: UI - Interactive Plan Section
- [ ] Create `CaseActionPlanCard` component
- [ ] Add checkbox interactions
- [ ] Show completion date/user
- [ ] Display at top of CaseDetailPanel
- [ ] Add status badges (blocker, auto-completed, failed)

### Phase 2: Completion Tracking
- [ ] API endpoint: `POST /api/cases/:id/actions/:actionId/complete`
- [ ] API endpoint: `POST /api/cases/:id/actions/:actionId/fail`
- [ ] API endpoint: `POST /api/cases/:id/actions/:actionId/cancel`
- [ ] Track who completed and when
- [ ] Update action status in database

### Phase 3: AI Extraction Improvements
- [ ] Modify summary prompt to ALWAYS generate a plan
- [ ] Extract blockers and mark as `is_blocker: true`
- [ ] Extract failed attempts and mark as `failed: true`
- [ ] Ensure minimum 3 action items per case

### Phase 4: Email Auto-Completion (Future)
- [ ] Parse incoming Freshdesk emails
- [ ] Keyword matching: "certificate attached" → complete "Get certificate"
- [ ] Mark as `auto_completed: true`
- [ ] Store email reference
- [ ] Notify case manager of auto-completion

## API Endpoints

### Complete an Action
```
POST /api/cases/:caseId/actions/:actionId/complete
Body: {
  notes?: string,
  emailReference?: string, // If auto-completed from email
  autoCompleted: boolean
}
```

### Fail an Action
```
POST /api/cases/:caseId/actions/:actionId/fail
Body: {
  reason: string,
  notes?: string
}
```

### Add Manual Action
```
POST /api/cases/:caseId/actions
Body: {
  type: "follow_up",
  notes: string,
  priority: number,
  dueDate?: string,
  isBlocker?: boolean
}
```

## Example: Jacob Gunn Case

**Before (Current):**
- Action Queue: 2 items (buried in sidebar)
- No visibility into the plan
- Can't tell what's blocking progress

**After (Interactive Plan):**
```
CASE PLAN - Jacob Gunn
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☐ Get latest CoC from DXC
  Priority: High · Due: 3 days ago

☐ Chase Centrelink clearance
  🚫 BLOCKER - Blocks payment processing
  Priority: High · No ETA

☐ Symmetry: terminate or continue decision
  Priority: Medium

✓ Forklift role at IG Design identified
  Completed: Dec 4, 2025

✗ Connect Team placement failed
  Reason: Dyslexia/computer inexperience
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Success Metrics

1. **Every case has a visible plan** (100% coverage)
2. **Actions completed faster** (reduced time to resolution)
3. **Less "what do I do next?" questions** (clear next actions)
4. **Auto-detection reduces manual updates** (measure % auto-completed)

## Next Steps

1. ✅ Get user approval
2. ⏳ Implement Phase 1 (UI)
3. Implement Phase 2 (Completion tracking)
4. Implement Phase 3 (AI improvements)
5. Implement Phase 4 (Email auto-completion)
