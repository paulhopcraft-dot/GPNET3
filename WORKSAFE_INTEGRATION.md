# WorkSafe Claims Manual Integration

## Vision

Every GPNet case should be evaluated against the **WorkSafe Victoria Claims Manual** to ensure compliance and provide guidance aligned with official WorkCover requirements.

## What We're Building

### 1. WorkSafe Knowledge Base
Scrape and store key sections of the WorkSafe Claims Manual:
- **WorkCover Scheme** - What qualifies as a WorkCover claim
- **Claims Management** - Lodgement, certificates, timelines
- **Weekly Payments** - Entitlement calculations
- **Medical Services** - Approved treatments and costs
- **Return to Work** - RTW obligations and processes
- **Dispute Resolution** - Handling disputes

### 2. AI Summary Enhancement
Update the AI summary prompt to include WorkSafe context:

**Current Summary:**
```
Case Summary - Jacob Gunn
Status: Off work
Next: Get certificate from DXC
```

**Enhanced with WorkSafe Context:**
```
Case Summary - Jacob Gunn
🏷️ **WORKCOVER CLAIM** - Victorian WorkCover Scheme

**WorkSafe Compliance Status:**
⚠️ CERTIFICATE GAP - Certificate expired 14 days ago
   → WorkSafe Manual 2.4: Certificates must be current
   → Action required: Chase certificate immediately

⚠️ RTW PLANNING - No suitable duties identified
   → WorkSafe Manual 5.2: Employer must provide suitable duties
   → Action required: Identify suitable duties at Symmetry

✓ CLAIM ACCEPTED - Thoracic spine (primary injury)
✗ CLAIM REJECTED - Shoulders/neck (secondary)

**WorkSafe Requirements for this case:**
1. Current medical certificate required (Manual 2.4)
2. RTW plan must be developed within 10 weeks (Manual 5.3)
3. Regular file review every 8 weeks (Manual 5.1)
4. Centrelink clearance for payment processing (Manual 3.5)
```

### 3. WorkCover Indicator Badge
Add a prominent badge to every case:

```
┌────────────────────────────────────────┐
│ Jacob Gunn                      🏷️ WORKCOVER │
│ Symmetry                                 │
│ Status: Off work | High risk             │
└────────────────────────────────────────┘
```

vs

```
┌────────────────────────────────────────┐
│ Jane Smith                               │
│ Allied Health                    NON-WORKCOVER │
│ Status: At work | Low risk               │
└────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Scrape WorkSafe Manual ✅ IN PROGRESS
- [x] Identify manual structure
- [ ] Scrape all 7 main sections
- [ ] Extract key requirements and timelines
- [ ] Store in structured format (JSON or database)

### Phase 2: Add WorkCover Indicator
- [ ] Add `is_workcover` field to `worker_cases` table
- [ ] Auto-detect from Freshdesk data (claim type, insurer, etc.)
- [ ] Display badge prominently in UI
- [ ] Filter cases by WorkCover/Non-WorkCover

### Phase 3: Integrate into AI Summaries
- [ ] Add WorkSafe manual sections to AI prompt context
- [ ] Update summary format to include WorkSafe compliance
- [ ] Extract compliance issues (certificate gaps, RTW delays)
- [ ] Generate WorkSafe-aligned next actions

### Phase 4: WorkSafe Compliance Dashboard
- [ ] Show cases with compliance issues
- [ ] Certificate expiry tracking per WorkSafe timelines
- [ ] RTW plan status per Manual 5.3
- [ ] File review reminders (8-week intervals per Manual 5.1)

## Key WorkSafe Requirements (From Manual)

### Certificate Requirements (Manual 2.4)
- Must be current at all times
- Worker off work without certificate = non-compliance
- Employer must forward within required timeframe

### RTW Requirements (Manual 5.1-5.3)
- **8-week file reviews** - Agent must review every 8 weeks max
- **Suitable duties hierarchy:**
  1. Return to work with injury employer (preferred)
  2. Only if exhausted, seek alternate employer
- **RTW plan required** within 10 weeks for certain injuries
- **Case conferences** when capacity limitations exist

### Claims Management (Manual 2.1-2.9)
- **Claim lodgement** - Worker or employer can lodge
- **Liability assessment** - Must determine within required timeframe
- **Medical examinations** - Can be requested for assessment
- **High-risk worker management** - Special protocols apply

### Weekly Payments (Manual 3.x)
- Entitlement calculations based on pre-injury average weekly earnings
- Step-down payments after 13 weeks
- Centrelink interactions and offset requirements

### Dispute Resolution (Manual 7.x)
- RTW issue resolution process (Ministerial Direction)
- Must attempt workplace resolution first
- Formal dispute processes available

## Data Model Changes

### Add to `worker_cases` table:
```sql
ALTER TABLE worker_cases ADD COLUMN is_workcover BOOLEAN DEFAULT false;
ALTER TABLE worker_cases ADD COLUMN workcover_claim_number VARCHAR;
ALTER TABLE worker_cases ADD COLUMN insurer_name VARCHAR;
ALTER TABLE worker_cases ADD COLUMN liability_accepted BOOLEAN;
ALTER TABLE worker_cases ADD COLUMN liability_accepted_date TIMESTAMP;
ALTER TABLE worker_cases ADD COLUMN last_file_review_date TIMESTAMP; -- For 8-week compliance
ALTER TABLE worker_cases ADD COLUMN rtw_plan_required BOOLEAN;
ALTER TABLE worker_cases ADD COLUMN rtw_plan_completed_date TIMESTAMP;
```

### WorkSafe Compliance Tracking Table:
```sql
CREATE TABLE worksafe_compliance (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR REFERENCES worker_cases(id),
  compliance_type VARCHAR, -- 'certificate', 'rtw_plan', 'file_review', 'suitable_duties'
  status VARCHAR, -- 'compliant', 'at_risk', 'non_compliant'
  due_date TIMESTAMP,
  completed_date TIMESTAMP,
  manual_section VARCHAR, -- e.g., "Manual 5.3"
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## WorkSafe Manual Sections Scraped

### ✅ Section 1: WorkCover Scheme
- Victorian WorkCover is "statutory, no-fault, compulsory insurance"
- Covers "work-related injuries and diseases"
- Injury must "arose out of or in the course of employment"

### ✅ Section 2: Claims Management
- 9 subsections covering full lifecycle
- Worker/injury definitions
- Claim lodgement, registration, liability assessment
- Medical examinations and investigations

### ✅ Section 5: Return to Work
- **Worker must be provided "appropriate advice and assistance"**
- **File reviews every 8 weeks maximum** (AC s99, WIRC r224)
- **RTW hierarchy:** Injury employer first, alternate employer second
- **Case conferences** for capacity limitations
- **RTW Issue Resolution Process** (Ministerial Direction)

### 🔄 In Progress: Sections 3, 4, 6, 7
- Weekly Payments
- Medical and Like Services
- Specialised Payments
- Dispute Resolution

## Example: Jacob Gunn with WorkSafe Context

**Current State:**
- Certificate expired 14 days ago
- No RTW plan in place
- Centrelink hold blocking payments
- Forklift role identified but not started

**WorkSafe Compliance Analysis:**
```
❌ CERTIFICATE COMPLIANCE (Manual 2.4)
   Status: Non-compliant (certificate expired 14 days ago)
   Action: Chase certificate immediately
   Due: Overdue

⚠️ RTW PLAN COMPLIANCE (Manual 5.3)
   Status: At risk (no plan developed, >10 weeks since injury)
   Action: Develop RTW plan with Symmetry
   Due: Overdue

⚠️ SUITABLE DUTIES (Manual 5.2)
   Status: Attempted (Forklift role identified but not commenced)
   Action: Resolve barriers to forklift placement or identify alternatives
   Due: Immediate

✓ FILE REVIEW (Manual 5.1)
   Status: Compliant (reviewed within 8 weeks)
   Next due: Jan 15, 2026
```

## Next Steps

1. **Complete manual scraping** - Fetch remaining sections (3, 4, 6, 7)
2. **Structure the data** - JSON or database storage
3. **Update AI prompt** - Add WorkSafe context to summary generation
4. **Add WorkCover indicator** - Database field + UI badge
5. **Test on Jacob Gunn** - Verify improved summary quality
6. **Build compliance dashboard** - Show WorkSafe compliance across all cases

---

**This will transform GPNet from "here's what happened" to "here's what happened AND here's what WorkSafe says should happen next."**
