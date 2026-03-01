# GPNet3/Preventli Test Data Specification & Findings Report

**Date:** 28 February 2026  
**Version:** 1.0  
**Status:** Draft - Pending Implementation

---

## Executive Summary

This document outlines the test data injected into the Freshdesk/GPNet3 system and identifies **gaps, edge cases, and required system changes** to handle real-world scenarios.

### Test Data Created

| Category | Count | Purpose |
|----------|-------|---------|
| Standard Workflow Cases | 50 | Test normal case progression |
| Edge Case Scenarios | 20 | Test error handling & edge cases |
| **Total** | **70** | - |

---

## Part 1: Standard Workflow Test Cases

### 1.1 Case Distribution by Type

| Case Type | Count | Workflow Stages Covered |
|-----------|-------|------------------------|
| Injury | 15 | Intake → Assessment → RTW → Recovery → Closed |
| New Starter | 12 | Pre-employment health checks |
| Exit Health Check | 8 | Exit clearance assessments |
| Preventative | 10 | Annual medicals, hearing tests, etc. |
| Mental Health | 5 | EAP, psychological injury cases |

### 1.2 Workflow Stage Distribution

| Stage | Week | Cases | Expected Status |
|-------|------|-------|-----------------|
| Intake | 0 | 14 | Open, High Priority |
| Assessment | 1 | 11 | Open, High Priority |
| Medical Review | 2 | 1 | Pending |
| RTW Planning | 4 | 2 | Open |
| Early RTW | 6 | 3 | Open (Modified Duties) |
| Mid Recovery | 12 | 2 | Open |
| Extended | 18 | 3 | Open, Escalation |
| Complex | 26 | 1 | Pending, Urgent |
| Closed | 8-30 | 13 | Closed |

### 1.3 Validation Results

```
SYNC STATUS: ✅ 166 cases synced to GPNet3 database
TEST CASES: 60 identified (50 standard + 10 from prior sync)

PASS RATE: 100% (basic field validation)
```

### 1.4 ISSUE FOUND: Workflow Stage Not Preserved

**Problem:** The workflow stage tags (intake, assessment, rtw_planning, etc.) are included in the Freshdesk ticket subject/tags but are NOT being parsed and stored as a dedicated field in the `worker_cases` table.

**Impact:**
- Cannot filter dashboard by workflow stage
- Cannot calculate expected timeframes per stage
- Cannot identify overdue stage transitions

**Required Changes:**

```sql
-- Add workflow_stage field
ALTER TABLE worker_cases ADD COLUMN workflow_stage VARCHAR(50);
ALTER TABLE worker_cases ADD COLUMN workflow_stage_entered_at TIMESTAMP;
ALTER TABLE worker_cases ADD COLUMN expected_stage_duration_days INTEGER;
```

**Sync Logic Update:**
```typescript
// In freshdesk.ts transformation
// Parse stage from tags
const stageTags = ['intake', 'assessment', 'medical_review', 
                   'rtw_planning', 'early_rtw', 'mid_recovery', 
                   'extended', 'complex', 'closed_resolved'];
const workflowStage = ticket.tags.find(t => stageTags.includes(t.toLowerCase()));
```

---

## Part 2: Edge Case Scenarios

### 2.1 Medical Certificate Issues

#### EDGE-001: Illegible Certificate Scan
**Scenario:** GP handwriting cannot be read, dates unclear, no restrictions visible.

**Current System Behavior:** Unknown - no OCR/document processing.

**Required System Changes:**
1. Add certificate upload validation with quality check
2. Flag low-quality scans for manual review
3. Store certificate parsing status: `cert_readable: boolean`
4. Implement "Request Resubmission" workflow action

**Database Changes:**
```sql
ALTER TABLE medical_certificates ADD COLUMN quality_status VARCHAR(20);
-- Values: 'readable', 'partial', 'unreadable', 'pending_review'
ALTER TABLE medical_certificates ADD COLUMN ocr_confidence DECIMAL(3,2);
ALTER TABLE medical_certificates ADD COLUMN requires_resubmission BOOLEAN DEFAULT FALSE;
```

---

#### EDGE-002: Expired Certificate
**Scenario:** Certificate end date has passed, no new certificate received.

**Current System Behavior:** Dates extracted but expiry not actively monitored.

**Required System Changes:**
1. Add certificate expiry monitoring job (daily)
2. Calculate "days without valid certificate" metric
3. Auto-generate follow-up email 3 days before expiry
4. Flag case as HIGH PRIORITY when certificate expired

**New Compliance Rule:**
```typescript
{
  rule: 'CERT_EXPIRY',
  trigger: 'certificate_end_date < today',
  action: 'flag_high_priority',
  notification: 'Email worker + employer',
  escalation_after_days: 7
}
```

---

#### EDGE-003: Conflicting Certificates
**Scenario:** Two certificates from different doctors with different restrictions.

**Current System Behavior:** Not handled - only stores latest certificate.

**Required System Changes:**
1. Store ALL certificates, not just latest
2. Add `is_primary: boolean` field
3. Implement conflict detection: different restrictions within 14 days
4. Require manual resolution with audit trail

**Database Changes:**
```sql
CREATE TABLE certificate_conflicts (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES worker_cases(id),
  cert_1_id INTEGER REFERENCES medical_certificates(id),
  cert_2_id INTEGER REFERENCES medical_certificates(id),
  conflict_type VARCHAR(50), -- 'restrictions', 'duration', 'fitness'
  resolution VARCHAR(50), -- 'use_cert_1', 'use_cert_2', 'ime_required'
  resolved_by VARCHAR(100),
  resolved_at TIMESTAMP
);
```

---

#### EDGE-004: Future-Dated Certificate
**Scenario:** Certificate has dates in the future (data entry error).

**Current System Behavior:** Partially handled - logs warning but still uses date.

**Required System Changes:**
1. REJECT certificates with issue_date > today
2. REJECT certificates with start_date > today + 7 days
3. Return clear error to user
4. Log for compliance audit

**Validation Rule:**
```typescript
if (certificate.issueDate > new Date()) {
  throw new ValidationError('Certificate issue date cannot be in the future');
}
if (certificate.startDate > addDays(new Date(), 7)) {
  throw new ValidationError('Certificate start date is too far in future');
}
```

---

### 2.2 Compliance Issues

#### EDGE-005: WorkCover Lodgement Overdue
**Scenario:** Employer hasn't lodged claim within required timeframe.

**Current System Behavior:** No lodgement tracking.

**Required System Changes:**
1. Add `lodgement_status` field with values: `not_required`, `pending`, `lodged`, `overdue`
2. Add `lodgement_due_date` calculated field (injury_date + 10 business days)
3. Daily job to check overdue lodgements
4. Critical alert when overdue

**Dashboard Widget:**
```typescript
// Compliance Summary
{
  widget: 'ComplianceLodgements',
  data: {
    overdue: cases.filter(c => c.lodgement_status === 'overdue').length,
    due_today: cases.filter(c => c.lodgement_due_date === today).length,
    pending: cases.filter(c => c.lodgement_status === 'pending').length
  }
}
```

---

#### EDGE-006: Missing Mandatory Documents
**Scenario:** Required documents not received despite multiple requests.

**Current System Behavior:** No document checklist per case type.

**Required System Changes:**
1. Define required documents per case type
2. Track document receipt status
3. Auto-generate follow-up reminders (3, 7, 14 days)
4. Calculate compliance percentage

**Document Checklist by Case Type:**
```typescript
const REQUIRED_DOCS = {
  injury: [
    'initial_med_cert',
    'incident_report', 
    'workcover_claim_form',
    'employer_notification'
  ],
  new_starter: [
    'pre_employment_form',
    'health_declaration'
  ],
  exit: [
    'exit_form',
    'clearance_certificate'
  ]
};
```

---

### 2.3 Matching/Identification Issues

#### EDGE-008: Duplicate Worker Records
**Scenario:** Same worker name exists in multiple cases - are they the same person?

**Current System Behavior:** No duplicate detection.

**Required System Changes:**
1. On case creation, check for existing workers with same name
2. Show potential duplicates to admin
3. Allow merge or keep separate with reason
4. NEVER auto-merge

**Matching Algorithm:**
```typescript
async function findPotentialDuplicates(workerName: string): Promise<DuplicateMatch[]> {
  const normalized = normalizeName(workerName);
  const candidates = await db.query(`
    SELECT * FROM worker_cases 
    WHERE similarity(LOWER(worker_name), $1) > 0.7
    OR soundex(worker_name) = soundex($2)
  `, [normalized, workerName]);
  
  return candidates.map(c => ({
    caseId: c.id,
    workerName: c.worker_name,
    employer: c.company,
    injuryDate: c.date_of_injury,
    similarity: calculateSimilarity(normalized, c.worker_name)
  }));
}
```

---

#### EDGE-009: Cannot Identify Employer
**Scenario:** Incomplete inquiry with insufficient information.

**Current System Behavior:** Creates case with "Unknown Company".

**Required System Changes:**
1. Flag cases with missing employer as `INCOMPLETE`
2. Block progression until employer identified
3. Generate templated response requesting details
4. Track "days pending info" metric

**Incomplete Case Handling:**
```typescript
if (!case.employer || case.employer === 'Unknown Company') {
  case.status = 'incomplete';
  case.incomplete_reason = 'employer_unknown';
  await sendTemplate('REQUEST_EMPLOYER_INFO', case.contact_email);
}
```

---

### 2.4 Document Processing Issues

#### EDGE-011: Password Protected PDF
**Current Behavior:** Unknown - likely fails silently.

**Required Changes:**
1. Detect encrypted PDFs on upload
2. Return clear error: "This file is password protected"
3. Provide option to enter password or request unprotected version
4. Log for audit

---

#### EDGE-012: Corrupt File
**Current Behavior:** Unknown.

**Required Changes:**
1. Validate file integrity on upload
2. Check file size matches expected
3. Attempt to parse headers to verify format
4. Clear error message with re-upload prompt

---

#### EDGE-013: Unsupported Format
**Current Behavior:** Unknown.

**Required Changes:**
1. Whitelist supported formats: PDF, PNG, JPG, JPEG, DOC, DOCX
2. Reject others with clear message
3. Suggest conversion for common unsupported formats (HEIC → JPG)

---

### 2.5 Date Handling Issues

#### EDGE-014: Inconsistent Dates Across Documents
**Scenario:** Four different injury dates from four sources.

**Current Behavior:** Uses single extraction, no conflict detection.

**Required Changes:**
1. Store ALL extracted dates with sources
2. Flag when dates differ by > 3 days
3. Require manual confirmation when conflicting
4. Audit trail of which date was selected and why

**Database Changes:**
```sql
CREATE TABLE injury_date_sources (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES worker_cases(id),
  source_type VARCHAR(50), -- 'employer_notification', 'worker_statement', 'med_cert', 'incident_report'
  date_value DATE,
  confidence VARCHAR(10), -- 'high', 'medium', 'low'
  extracted_text TEXT,
  is_selected BOOLEAN DEFAULT FALSE
);
```

---

#### EDGE-015: Ambiguous Date Format
**Scenario:** "01/02/26" - is this DD/MM/YY or MM/DD/YY?

**Current Behavior:** Assumes Australian format.

**Required Changes:**
1. Default to DD/MM/YYYY (Australian)
2. Flag ambiguous dates (where day ≤ 12)
3. Allow manual override
4. Store original text for audit

**Detection Logic:**
```typescript
function isAmbiguousDate(dateStr: string): boolean {
  const parts = dateStr.split(/[\/\-]/);
  const first = parseInt(parts[0]);
  const second = parseInt(parts[1]);
  // Ambiguous if both could be day or month
  return first <= 12 && second <= 12 && first !== second;
}
```

---

### 2.6 Status/Workflow Issues

#### EDGE-016: Conflicting Work Status
**Scenario:** Certificate says modified duties, worker says off work.

**Required Changes:**
1. Support multiple status inputs with sources
2. Display conflicts in dashboard
3. Require reconciliation before status update
4. Case notes explaining resolution

---

#### EDGE-017: RTW Attempt Failed
**Scenario:** Worker started modified duties but couldn't continue.

**Required Changes:**
1. Track RTW attempts as events
2. Record: start date, end date, reason for failure
3. Trigger plan revision workflow
4. Flag for specialist assessment if multiple failures

**Database Changes:**
```sql
CREATE TABLE rtw_attempts (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) REFERENCES worker_cases(id),
  started_at DATE,
  ended_at DATE,
  planned_hours DECIMAL(4,1),
  actual_hours DECIMAL(4,1),
  duties_description TEXT,
  outcome VARCHAR(20), -- 'successful', 'partial', 'failed'
  failure_reason TEXT,
  next_action TEXT
);
```

---

### 2.7 Communication Issues

#### EDGE-018: Unresponsive Worker
**Required Changes:**
1. Track contact attempts with timestamps
2. Escalation ladder: phone → email → SMS → registered mail
3. Auto-generate "unable to contact" notifications
4. Timeout after X days with documented attempts

---

#### EDGE-019: Interpreter Required
**Required Changes:**
1. Store worker language preference
2. Flag cases requiring interpreter
3. Integrate TIS booking (future)
4. Track which documents have been translated

---

## Part 3: Email Matching Service

### 3.1 Matching Algorithm Results

| Scenario | Test Result | Confidence | Action |
|----------|-------------|------------|--------|
| Ticket reference in subject | ✅ Match | 95% | Auto-attach |
| Worker name + employer match | ✅ Match | 70-85% | Review required |
| Worker name only | ⚠️ Uncertain | 70% | Review required |
| No identifiable info | ❌ No match | - | Alert admin |
| Common name (multiple matches) | ⚠️ Uncertain | - | Admin selects |

### 3.2 Required Enhancements

1. **Improve name extraction** - Handle more patterns
2. **Domain matching** - Use email domain to infer employer
3. **Thread detection** - Check if email is reply to existing thread
4. **Content analysis** - Detect when email content doesn't match case

---

## Part 4: Priority Implementation Order

### Phase 1: Critical (Week 1-2)
1. ✅ Workflow stage field & parsing
2. Certificate expiry monitoring
3. Lodgement deadline tracking
4. Date conflict detection

### Phase 2: Important (Week 3-4)
5. Document upload validation
6. Duplicate worker detection
7. Missing document tracking
8. Email matcher improvements

### Phase 3: Nice-to-Have (Month 2)
9. OCR quality scoring
10. RTW attempt tracking
11. Language/interpreter flags
12. Contact attempt logging

---

## Appendix A: Test Data Reference

### Freshdesk Ticket IDs

**Standard Cases:** FD-47129 to FD-47178  
**Edge Cases:** FD-47179 to FD-47198 (estimated)

### Test Tags

- `test-data` - All generated test cases
- `edge-case` - Edge case scenarios
- Case types: `injury`, `new_starter`, `exit`, `preventative`, `mental_health`
- Stages: `intake`, `assessment`, `medical_review`, etc.

---

*Document generated: 28 February 2026*  
*Next review: After Phase 1 implementation*
