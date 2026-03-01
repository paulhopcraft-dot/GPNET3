# New Starter (Pre-Employment) Workflow Specification

## Overview
Pre-employment health check for new workers before they start. Self-reported questionnaire, reviewed by telehealth doctor, report sent to employer within 24 hours.

---

## Global UI Elements (Every Screen)

**Persistent header buttons (top right, always visible):**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [PREVENTLI LOGO]              [ 💬 Chat ]  [ 📞 Book Telehealth ] │
└─────────────────────────────────────────────────────────────────────┘
```

| Button | Action |
|--------|--------|
| 💬 Chat | Opens AI assistant panel — ask questions, get help, take actions via conversation |
| 📞 Book Telehealth | Opens telehealth booking — schedule appointment with national doctor network |

### Telehealth Booking Flow

**When clicked from a Case page:**
1. Modal opens with worker/case details auto-populated:
   - Worker name, DOB, contact
   - Employer, role
   - Case ID, type
2. User selects preferred date/time slots
3. Optional: add notes for doctor
4. Confirm → appointment created

**What doctor receives:**
- Full worker profile
- Complete questionnaire responses
- AI pre-analysis and flags
- Employer notes
- Role requirements
- One-click access to sign-off

**Context-aware behavior:**
| Page | Book Telehealth Behavior |
|------|-------------------------|
| Case detail | Pre-fills all case/worker info |
| Dashboard | Opens case selector first, then booking |
| Worker questionnaire | Pre-fills current worker |

These appear on EVERY screen:
- Dashboard
- Assessment create/detail
- Worker questionnaire (public)
- Case management
- Reports
- Settings

**Telehealth value prop:**
- National network of telehealth doctors
- System auto-routes to next available doctor
- Reviews completed within 24 hours
- Doctor-signed reports for compliance

---

## Entry Points

### Path A: Email from Employer
```
Employer emails Preventli:
"New starter John Smith, forklift driver, starting March 1, email: john@example.com"
```
- System parses email (or staff manually enters)
- Creates case record
- Triggers workflow

### Path B: Employer Portal
```
Employer logs into Preventli → Checks → New Starter → Fill form
```
- Case created directly
- Triggers workflow

---

## Required Information (from Employer)

| Field | Required | Notes |
|-------|----------|-------|
| Worker name | ✅ | First + Last |
| Worker email | ✅ | For sending questionnaire link |
| Employer/Company | ✅ | Auto-filled if employer logged in |
| Job title/Role | ✅ | e.g., "Forklift Driver" |
| Job description | Optional | Physical demands, helps with assessment |
| Start date | ✅ | Deadline reference |

---

## Workflow Stages

```
CREATED → SENT → COMPLETED → REPORT GENERATED → EMPLOYER NOTIFIED
   │        │         │              │                  │
   ▼        ▼         ▼              ▼                  ▼
 Case     Email     Worker        AI creates        Email sent
 record   sent to   submits       report + PDF      to employer
 created  worker    form                            with result
```

### Stage 1: CREATED
**Trigger:** Staff creates case (from email or portal entry)
**System does:**
- Create `pre_employment_assessments` record
- Status: `pending`
- Generate unique token for worker link
- Store: worker name, email, employer, role, job description, start date

### Stage 2: SENT
**Trigger:** Staff clicks "Send to Worker" (or auto-send on create)
**System does:**
- Send email to worker with:
  - Explanation of what this is
  - Link to questionnaire: `/check/{token}`
  - Due date (start date - 2 days?)
- Update status: `sent`
- Record: `sent_at` timestamp

**Email template:**
```
Subject: Pre-Employment Health Check - {Employer Name}

Hi {Worker First Name},

You're about to start work at {Employer Name} as a {Role}.

Please complete your pre-employment health questionnaire:
{LINK}

This takes about 10-15 minutes. Your responses help ensure 
a safe working environment.

Please complete by: {Due Date}

Questions? Reply to this email.

— Preventli
```

### Stage 3: COMPLETED
**Trigger:** Worker submits questionnaire
**System does:**
- Save all responses to database
- Calculate risk score (existing logic)
- Determine clearance level:
  - `cleared` — no concerns
  - `cleared_conditional` — minor flags, may need accommodations
  - `requires_review` — significant flags, needs human review
  - `not_cleared` — major concerns
- Update status: `completed`
- Record: `completed_at` timestamp

### Stage 4: DOCTOR REVIEW
**Trigger:** Questionnaire submitted
**System does:**
- AI pre-analyzes responses, flags concerns
- Auto-routes to next available telehealth doctor from national network
- Doctor reviews questionnaire + AI analysis
- Doctor adds notes, confirms clearance level
- Doctor signs off

**SLA:** Within 24 hours (most same-day)

### Stage 5: REPORT GENERATED
**Trigger:** Doctor signs off
**System does:**
- Generate report containing:
  - Summary of responses
  - Doctor's assessment
  - Clearance recommendation (doctor-approved)
  - Any flags/concerns
  - Recommended accommodations (if conditional)
- Include doctor's name and sign-off
- Generate PDF version
- Store report in database
- Update status: `report_generated`

**AI Report Prompt:**
```
You are generating a pre-employment health report.

Worker: {name}
Role: {role}
Job Description: {job_description}

Questionnaire Responses:
{responses}

Risk Score: {risk_score}/10
Calculated Clearance: {clearance_level}

Generate a professional report with:
1. Executive Summary (2-3 sentences)
2. Health Assessment Summary
3. Fitness for Role Assessment
4. Flags/Concerns (if any)
5. Recommendations
6. Clearance Decision: [CLEARED / CLEARED WITH CONDITIONS / REQUIRES REVIEW / NOT CLEARED]

Keep it concise and professional. Focus on job-relevant findings.
```

### Stage 5: EMPLOYER NOTIFIED
**Trigger:** Report generated (automatic, unless requires_review)
**System does:**
- Send email to employer with:
  - Clearance result
  - Summary
  - PDF report attached
- Update status: `employer_notified`
- Record: `employer_notified_at` timestamp

**If `requires_review`:**
- Flag for Preventli staff review first
- Staff reviews, may adjust clearance
- Then manually trigger employer notification

**Email template:**
```
Subject: Pre-Employment Report Ready - {Worker Name}

Hi,

The pre-employment health check for {Worker Name} ({Role}) is complete.

Result: {CLEARANCE_LEVEL}

{If CLEARED}
{Worker Name} is cleared to commence work.

{If CLEARED_CONDITIONAL}
{Worker Name} is cleared with the following considerations:
{conditions}

{If NOT_CLEARED}
{Worker Name} has not been cleared. Please contact us to discuss.

Full report attached.

— Preventli
```

---

## Timeline Visualization

```
NEW STARTER: John Smith · Acme Corp · Forklift Driver
Start date: March 1                          Status: CLEARED ✅

●━━━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━━○
│          │             │             │         │
CREATED    SENT          COMPLETED     REPORT    START
Feb 15     Feb 15        Feb 18        Feb 18    Mar 1
           (same day)    (3 days)      (auto)

Timeline Events:
├── Feb 15 09:00 — Case created (via employer email)
├── Feb 15 09:05 — Questionnaire sent to john@example.com
├── Feb 18 14:30 — Worker submitted questionnaire
├── Feb 18 14:31 — Report generated (Risk: 2/10, Cleared)
└── Feb 18 14:32 — Employer notified with PDF
```

---

## Database Changes

### New fields on `pre_employment_assessments`:
```sql
ALTER TABLE pre_employment_assessments ADD COLUMN IF NOT EXISTS
  worker_email TEXT,
  job_description TEXT,
  start_date DATE,
  access_token VARCHAR(64) UNIQUE, -- for public link
  sent_at TIMESTAMP,
  employer_notified_at TIMESTAMP,
  report_json JSONB, -- AI-generated report
  report_pdf_url TEXT;
```

### New table for timeline events:
```sql
CREATE TABLE IF NOT EXISTS assessment_events (
  id SERIAL PRIMARY KEY,
  assessment_id VARCHAR(50) REFERENCES pre_employment_assessments(id),
  event_type VARCHAR(50) NOT NULL,
  event_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

---

## API Changes

### New endpoints:

```typescript
// Public route - no auth required (token-based access)
GET /api/public/check/:token
// Returns: assessment info + form fields to fill

POST /api/public/check/:token/submit
// Body: questionnaire responses
// Returns: confirmation

// Staff routes
POST /api/pre-employment/assessments/:id/send
// Sends questionnaire email to worker

POST /api/pre-employment/assessments/:id/notify-employer
// Manually triggers employer notification (for requires_review cases)
```

---

## UI Changes

### 1. Staff: Create New Starter Form
Location: Checks → Pre-Employment → New Assessment

Fields:
- Worker First Name *
- Worker Last Name *
- Worker Email *
- Employer (dropdown or auto-filled) *
- Role/Position *
- Job Description (textarea, optional)
- Start Date *

Buttons:
- "Save Draft" — creates case but doesn't send
- "Save & Send to Worker" — creates case and sends email immediately

### 2. Worker: Public Questionnaire
Location: `/check/{token}` (no login required)

- Shows existing 8-step form
- Pre-fills: name, employer, role (read-only)
- Worker completes health questions
- Submit → thank you page

### 3. Staff: Assessment Detail View
Shows:
- Assessment info
- Timeline (visual)
- Current status
- Worker responses (once completed)
- Generated report (once available)
- Actions: Resend email, Download PDF, Notify employer

---

## Alerts & Notifications

| Condition | Alert To | Channel |
|-----------|----------|---------|
| Worker hasn't completed after 3 days | Staff | Dashboard + email |
| Start date in < 3 days, not completed | Staff | Dashboard (urgent) |
| Requires review case submitted | Staff | Dashboard + email |
| Completed (any) | Staff | Dashboard |

---

## Testing Checklist

- [ ] Create assessment via staff form
- [ ] Email sent to worker (check email delivery)
- [ ] Worker can access form via token link (no login)
- [ ] Worker can complete and submit form
- [ ] Risk score calculated correctly
- [ ] AI report generated
- [ ] PDF generated
- [ ] Employer email sent with PDF
- [ ] Timeline shows all events
- [ ] Alerts trigger correctly
- [ ] Edge case: worker email bounces
- [ ] Edge case: token expires handling
- [ ] Edge case: requires_review workflow

---

## Implementation Priority

1. **Database changes** — add new columns, events table
2. **Access token generation** — on assessment create
3. **Public route** — `/check/:token` → questionnaire
4. **Email sending** — worker notification
5. **AI report generation** — on submit
6. **PDF generation** — from report
7. **Employer notification** — email with PDF
8. **Timeline events** — log all steps
9. **UI updates** — create form, detail view
10. **Alerts** — overdue, requires review

---

## Open Questions

1. **Token expiry:** Should links expire? After how long?
2. **Reminder emails:** Auto-remind worker if not completed in X days?
3. **Employer access:** Can employer see report in portal, or email only?
4. **Review workflow:** For `requires_review`, what's the staff process?
