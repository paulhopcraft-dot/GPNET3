# Compliance AI System - Architecture

## Vision

Build an AI-powered compliance assistant that:
1. **Knows the rules** - WorkSafe Claims Manual + WIRC Act
2. **Checks compliance** - Evaluates each case against requirements
3. **Answers questions** - Query the manual and act via AI
4. **Future**: Voice/avatar interface for natural conversation

## Example Use Cases

### Use Case 1: Automatic Compliance Check
```
Jacob Gunn - WorkCover Claim

AI Compliance Analysis:
❌ CERTIFICATE COMPLIANCE (WIRC s38, Manual 2.4)
   Requirement: Certificate must be current while off work
   Status: Certificate expired 14 days ago
   Consequence: Payment can be suspended
   Action: Chase certificate immediately

⚠️ RTW PLAN (WIRC s41, Manual 5.3)
   Requirement: RTW plan within 10 weeks for serious injuries
   Status: No plan developed, 12 weeks since injury
   Consequence: Claim may be reviewed
   Action: Develop RTW plan with Symmetry

⚠️ FILE REVIEW (WIRC Regulation 224, Manual 5.1)
   Requirement: Case review every 8 weeks maximum
   Status: Last reviewed 7 weeks ago
   Consequence: None yet
   Action: Schedule review within 1 week
```

### Use Case 2: Query the System
**User:** "How long does a worker have to return to work before payments reduce?"

**AI:** "According to WIRC Act Section 37 and Claims Manual 3.4, weekly payments step down after 13 weeks if the worker has not returned to work with pre-injury employer."

### Use Case 3: Voice Avatar (Future)
**User (speaking):** "What are the requirements for Centrelink clearance?"

**AI Avatar:** "Based on Claims Manual Section 3.5, employers must obtain Centrelink clearance before processing payments if the worker is receiving social security benefits. This prevents double-dipping. The clearance notice must be dated and on file before payments can commence."

## Architecture

### 1. Document Storage & Indexing

```
┌─────────────────────────────────────────────────────┐
│           COMPLIANCE KNOWLEDGE BASE                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐    ┌──────────────────┐     │
│  │  WorkSafe Manual │    │    WIRC Act      │     │
│  │                  │    │                  │     │
│  │ • Section 1-7    │    │ • Part 1-10      │     │
│  │ • ~200 topics    │    │ • 200+ sections  │     │
│  │ • HTML format    │    │ • PDF/HTML       │     │
│  └──────────────────┘    └──────────────────┘     │
│           │                        │               │
│           └────────┬───────────────┘               │
│                    ↓                               │
│           ┌────────────────┐                       │
│           │  Document DB   │                       │
│           │                │                       │
│           │ • Full text    │                       │
│           │ • Metadata     │                       │
│           │ • Section IDs  │                       │
│           └────────────────┘                       │
└─────────────────────────────────────────────────────┘
```

### 2. Compliance Rules Engine

```
┌──────────────────────────────────────────────┐
│         COMPLIANCE RULES ENGINE              │
├──────────────────────────────────────────────┤
│                                              │
│  Rule 1: Certificate Must Be Current        │
│  Source: WIRC s38, Manual 2.4               │
│  Check: certificate.endDate >= today        │
│  Severity: CRITICAL                         │
│  Action: "Chase certificate immediately"    │
│                                              │
│  Rule 2: RTW Plan Within 10 Weeks           │
│  Source: WIRC s41, Manual 5.3               │
│  Check: rtwPlan.created <= injury + 70 days │
│  Severity: HIGH                             │
│  Action: "Develop RTW plan"                 │
│                                              │
│  Rule 3: 8-Week File Review                 │
│  Source: WIRC Reg 224, Manual 5.1           │
│  Check: lastReview <= 56 days ago           │
│  Severity: MEDIUM                           │
│  Action: "Schedule case review"             │
│                                              │
│  ... (50+ compliance rules)                 │
└──────────────────────────────────────────────┘
```

### 3. RAG Query System

```
User Question: "What are certificate requirements?"
        ↓
┌────────────────────────────────────────┐
│   1. Semantic Search                   │
│   - Convert question to embedding      │
│   - Search document vectors            │
│   - Find relevant sections             │
└────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────┐
│   2. Context Retrieval                 │
│   - Manual 2.4: Certificate rules      │
│   - WIRC s38: Certificate obligations  │
│   - Manual 5.1: Certificate reviews    │
└────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────┐
│   3. AI Response                       │
│   - Claude Sonnet with retrieved docs  │
│   - Generate answer with citations     │
│   - Return to user                     │
└────────────────────────────────────────┘
```

## Database Schema

### Table: `compliance_documents`
```sql
CREATE TABLE compliance_documents (
  id VARCHAR PRIMARY KEY,
  source VARCHAR NOT NULL, -- 'worksafe_manual' or 'wirc_act'
  section_id VARCHAR NOT NULL, -- e.g., '2.4' or 's38'
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  full_reference VARCHAR, -- e.g., "WorkSafe Manual Section 2.4"
  url VARCHAR, -- Link to source
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `compliance_rules`
```sql
CREATE TABLE compliance_rules (
  id VARCHAR PRIMARY KEY,
  rule_code VARCHAR NOT NULL, -- e.g., 'CERT_CURRENT'
  name VARCHAR NOT NULL,
  description TEXT NOT NULL,

  -- References to source documents
  document_references JSONB NOT NULL, -- [{"source": "wirc_act", "section": "s38"}, ...]

  -- Rule evaluation
  check_type VARCHAR NOT NULL, -- 'certificate', 'rtw_plan', 'file_review', 'payment'
  severity VARCHAR NOT NULL, -- 'critical', 'high', 'medium', 'low'

  -- Evaluation logic (stored as JSON)
  evaluation_logic JSONB NOT NULL,

  -- Action to take if non-compliant
  recommended_action TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `case_compliance_checks`
```sql
CREATE TABLE case_compliance_checks (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR REFERENCES worker_cases(id),
  rule_id VARCHAR REFERENCES compliance_rules(id),

  -- Check result
  status VARCHAR NOT NULL, -- 'compliant', 'warning', 'non_compliant'
  checked_at TIMESTAMP NOT NULL,

  -- Details
  finding TEXT, -- What was found
  recommendation TEXT, -- What to do

  -- Auto-generated action
  action_created BOOLEAN DEFAULT false,
  action_id VARCHAR REFERENCES case_actions(id),

  created_at TIMESTAMP
);
```

## Implementation Phases

### Phase 1: Document Ingestion ✅ IN PROGRESS
- [x] Scrape WorkSafe Manual sections (3/7 complete)
- [ ] Download WIRC Act (PDF or HTML)
- [ ] Parse WIRC Act into sections
- [ ] Store all documents in `compliance_documents` table
- [ ] Create section index

### Phase 2: Compliance Rules Engine
- [ ] Define 50+ compliance rules from WIRC + Manual
- [ ] Store rules in `compliance_rules` table
- [ ] Build evaluation engine
- [ ] Test rules against real cases

### Phase 3: RAG Query System
- [ ] Set up Claude API with document context
- [ ] Build query endpoint: `POST /api/compliance/query`
- [ ] Test with common questions
- [ ] Add citation formatting

### Phase 4: Auto-Compliance Checks
- [ ] Run compliance checks on every case
- [ ] Store results in `case_compliance_checks`
- [ ] Display compliance status in UI
- [ ] Auto-create actions for non-compliance

### Phase 5: Voice/Avatar Interface (Future)
- [ ] Speech-to-text integration
- [ ] Text-to-speech for AI responses
- [ ] Avatar UI (optional)
- [ ] Real-time query interface

## Key Compliance Rules (Examples)

### Rule: CERT_CURRENT - Certificate Must Be Current
**Source:** WIRC Act s38, WorkSafe Manual 2.4
**Requirement:** Worker off work must have current certificate
**Check:** `certificate.endDate >= today AND worker.workStatus === 'Off work'`
**Severity:** CRITICAL
**Action:** Chase certificate immediately

### Rule: RTW_PLAN_10WK - RTW Plan Within 10 Weeks
**Source:** WIRC Act s41, WorkSafe Manual 5.3
**Requirement:** RTW plan for serious injuries within 10 weeks
**Check:** `rtwPlan.created <= injuryDate + 70 days`
**Severity:** HIGH
**Action:** Develop RTW plan with employer

### Rule: FILE_REVIEW_8WK - Case Review Every 8 Weeks
**Source:** WIRC Regulation 224, WorkSafe Manual 5.1
**Requirement:** Agent must review case every 8 weeks max
**Check:** `lastReviewDate <= today - 56 days`
**Severity:** MEDIUM
**Action:** Schedule case review

### Rule: PAYMENT_STEPDOWN - Weekly Payment Step-Down
**Source:** WIRC Act s37, WorkSafe Manual 3.4
**Requirement:** Payments reduce after 13 weeks if not returned to work
**Check:** `weeksOffWork >= 13 AND notReturnedToWork`
**Severity:** INFO
**Action:** Notify worker of payment reduction

### Rule: CENTRELINK_CLEARANCE - Centrelink Clearance Required
**Source:** WorkSafe Manual 3.5
**Requirement:** Centrelink clearance before payments if receiving benefits
**Check:** `payment.pending AND noCentrelinkClearance`
**Severity:** HIGH
**Action:** Obtain Centrelink clearance

## Example Queries

**Q:** "What happens if a certificate expires?"
**A:** "According to WIRC Act Section 38 and WorkSafe Manual 2.4, if a worker's certificate of capacity expires and they are off work, weekly payments can be suspended until a new certificate is provided. The employer or agent should immediately contact the worker to chase the updated certificate."

**Q:** "How long do we have to develop an RTW plan?"
**A:** "Per WIRC Act Section 41 and WorkSafe Manual 5.3, a Return to Work plan must be developed within 10 weeks for workers with serious injuries. The plan should identify suitable duties and outline the graduated return process."

**Q:** "Can we make payments while waiting for Centrelink clearance?"
**A:** "According to WorkSafe Manual Section 3.5, you should not process payments until Centrelink clearance is obtained if there's any indication the worker may be receiving social security benefits. This prevents double-payment issues and ensures compliance with federal regulations."

## Integration with AI Summary

**Current Summary:**
```
Jacob Gunn - Off work

Next Actions:
- Chase certificate
- Develop RTW plan
```

**Enhanced with Compliance Engine:**
```
Jacob Gunn - Off work
🏷️ WORKCOVER CLAIM

COMPLIANCE STATUS:
❌ NON-COMPLIANT (2 critical issues)

❌ CERTIFICATE COMPLIANCE (WIRC s38, Manual 2.4)
   Status: Certificate expired 14 days ago
   Risk: Payments can be suspended
   Action: WHO: GPNet | WHAT: Chase certificate | BY WHEN: ASAP

⚠️ RTW PLAN (WIRC s41, Manual 5.3)
   Status: No plan developed (12 weeks since injury)
   Risk: Claim review likely
   Action: WHO: Symmetry | WHAT: Develop RTW plan | BY WHEN: Jan 15

✓ FILE REVIEW (WIRC Reg 224, Manual 5.1)
   Status: Compliant (reviewed 7 weeks ago)
   Next: Due in 1 week

Compliance Score: 33% (1/3 requirements met)
```

## Next Steps

1. **Find WIRC Act** - Download full text
2. **Parse documents** - Extract sections into database
3. **Define rules** - Create 50+ compliance rules
4. **Build engine** - Evaluate rules against cases
5. **Test** - Verify on Jacob Gunn and other cases
6. **Deploy** - Auto-check all cases
7. **Query system** - Enable Q&A on manual/act
8. **Voice (future)** - Add speech interface

---

**This will transform GPNet from "here's what happened" to "here's what happened, here's what the law says should happen, and here's where this case is non-compliant."**
