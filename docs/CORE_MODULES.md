# GPNet Core Modules & AI Layer

This file describes every major module and its behaviour so a team can rebuild the whole product.

---

## 1. Cases & Workers

### 1.1 Worker

- Represents a single human worker.
- Fields:
  - identity (name, DOB, optional IDs)
  - contact (email, phone)
  - employment (role, host site, org)
- Design:
  - A worker can have multiple Cases over time.

### 1.2 Case

- Represents a single health/work issue episode.
- Types:
  - injury
  - mental_health
  - general_health
  - pre_employment
  - exit
- Status:
  - open, monitoring, paused, closed, escalated
- Contains:
  - Link to worker
  - Link to organisation (multi-tenant)
  - Risk level
  - Termination process link (if applicable)

**Case Detail Panel (frontend)**

Tabs / sections:

- Overview (summary, key dates, compliance flags)
- Timeline (unified events)
- Certificates
- Documents
- Notes / Discussion
- Actions
- People (consultants, host contacts)
- (Later) RTW Plan

---

## 2. Timeline Engine

### 2.1 Purpose

- Provide a single chronological view of everything that happened in the case.

### 2.2 Model

`TimelineEvent`:

- id
- caseId
- eventType:
  - `certificate_added`
  - `discussion_note`
  - `attachment_uploaded`
  - `termination_milestone`
  - `case_status_change`
  - `case_created`
  - (future) `compliance_changed`, `action_created`, `summary_generated`
- title
- description
- timestamp
- severity: `info | warning | critical`
- meta: JSONB (source-specific context)

`TimelineResponse`:

- caseId
- events: TimelineEvent[]
- totalEvents

### 2.3 Backend

- Route: `GET /api/cases/:id/timeline`
- Storage: `DbStorage.getCaseTimeline(caseId, { limit })`
  - Gathers events from:
    - certificates
    - discussion notes
    - attachments
    - termination process steps
    - case creation / status changes
  - Normalises to TimelineEvent[]
  - Sorts by timestamp DESC
  - Applies limit (default 50; optional `?limit=` param)

### 2.4 Frontend

**TimelineCard component**

- Props: `caseId`
- Fetches `/api/cases/:id/timeline` via React Query
- Shows:
  - vertical timeline
  - icon per eventType
  - severity-coded colours
  - title, timestamp, description
- States:
  - loading spinner
  - error message (card-level only)
  - empty state "No timeline events yet"

---

## 3. Certificate Engine v1

### 3.1 Purpose

- Centralise all medical certificates.
- Drive compliance, RTW decisions, and action generation.

### 3.2 Model

`Certificate`:

- id
- caseId, workerId
- source: email | upload | webhook
- issueDate
- startDate
- endDate
- reviewDate (optional)
- capacity: `fit | restricted | unfit | unknown`
- restrictionsText (free text)
- parsedFields (JSONB)
- documentId (FK → Document)
- createdAt, updatedAt

### 3.3 Backend

**Core endpoints:**

- `GET /api/cases/:id/certificates`
  - returns array of certificates for a case
- `POST /api/cases/:id/certificates`
  - creates certificate from parsed form
- Optional later:
  - `PATCH /api/certificates/:id`
  - `DELETE /api/certificates/:id` (soft delete)

**Certificate ingestion**

- Ingestion sources:
  - Freshdesk attachments
  - JotForm uploads
  - Manual upload in portal
- Sequence:
  - Save Document record
  - Run classification/extraction service
  - Create Certificate
  - Timeline event: `certificate_added` with descriptive text

---

## 4. Certificate UI (Case Detail)

### 4.1 CertificateCard

- Location: CaseDetailPanel, near Timeline and Documents.
- Behaviour:
  - Fetches `/api/cases/:id/certificates`
  - Displays a list with:
    - Issue date
    - From → To dates
    - Review date (if any)
    - Capacity (badge: Fit / Restricted / Unfit / Unknown)
    - Restrictions (short text; expand-on-click if long)
    - Status badge:
      - Active
      - Expiring soon (<= X days)
      - Expired

- Sorting: newest certificate first.

- Empty state:
  - "No certificates uploaded yet."
  - Optional CTA: "Add certificate" (future manual entry).

---

## 5. Compliance Engine v1 (Certificates Only)

### 5.1 Purpose

First version focuses solely on **certificate compliance**:

- "Does this case have an appropriate certificate right now?"

### 5.2 Rules

Per Case:

1. **no_certificate**
   - No certificates exist.

2. **certificate_valid**
   - At least one certificate where:
     - `startDate <= now <= endDate`

3. **certificate_expiring_soon**
   - There is an active certificate, and:
     - `endDate - now <= N days` (e.g. 7 days)
   - Use `N` as configurable per org.

4. **certificate_expired**
   - Latest certificate exists, but:
     - `endDate < now` and no active cert.

These become:

- `certificate_status`:
  - `none | valid | expiring_soon | expired`
- `has_certificate` (bool)

### 5.3 Implementation

- Either:
  - Computed on the fly in `getCaseCompliance(caseId)` OR
  - Denormalised into a `case_compliance` table

Minimal design:

- Add a method in storage/service:
  - `getCaseCompliance(caseId)` → { certificateStatus, hasCertificate }

Expose via:

- `GET /api/cases/:id/compliance`
  - OR embed into `GET /api/cases/:id` response as a nested field.

---

## 6. Action Queue v1

### 6.1 Purpose

Turn compliance state into tangible tasks.

### 6.2 Model

`Action`:

- id
- caseId
- type: `chase_certificate | worker_checkin | host_followup | other`
- status: `pending | done | cancelled`
- dueDate
- priority: `low | normal | high` (optional)
- createdAt, updatedAt

### 6.3 Behaviour

For certificates:

- On `certificate_expiring_soon`:
  - Ensure there is a `pending` `chase_certificate` action
  - Due date: endDate - 3 days (configurable)

- On `certificate_expired`:
  - `chase_certificate` action remains or becomes obviously overdue
  - Optionally escalate priority.

- On new certificate that restores `certificate_valid`:
  - Mark existing `chase_certificate` action as `done`.

### 6.4 Backend

Endpoints:

- `GET /api/actions` (with filters):
  - By org, by case, by status
- `POST /api/cases/:id/actions`:
  - Create action (for non-automated actions too)
- `PATCH /api/actions/:id`:
  - Update status, due date, etc.

### 6.5 Frontend – Dashboard Action Queue

**ActionQueueCard**

- Visible on Dashboard.
- Shows top N (e.g. 5) actions ordered by:
  - Overdue first
  - Then by nearest dueDate
- Each row:
  - Case worker name + case type
  - Action type ("Chase certificate")
  - Due / overdue label

Clicking an action focuses the case detail panel.

---

## 7. Checks / Health Assessments Module (Non-AI)

### 7.1 Types

- Pre-employment
- Prevention (early intervention)
- Injury check
- Mental health check
- General wellbeing
- Exit check

### 7.2 Model

`Check`:

- id
- caseId, workerId
- type
- status: awaiting | in_progress | completed | flagged
- fitClassification: fit | restricted | unfit | not_applicable
- summary (short)
- recommendations (bullets)
- sections: text blocks
- createdAt, completedAt

### 7.3 Behaviour

- Checks can be:
  - Started manually
  - Triggered by rules (e.g. long-running case)
- Result:
  - Stored in DB
  - Timeline event: `discussion_note` or dedicated `check_completed`

---

## 8. Emails & Communication

### 8.1 Inbound

- Freshdesk webhooks deliver tickets & messages.
- Each inbound email is:
  - Linked to a case via worker email / case token
  - Stored in EmailMessage
  - Summarised (short text) and flagged for risk keywords
  - Creates Timeline event: `discussion_note` or `attachment_uploaded` (if files)

### 8.2 Outbound

- For v1: manual replies using external system + logging.
- For v2:
  - Quick Reply templates from GPNet
  - Rules & Automations to draft messages (Suggest mode)

---

## 9. AI & Intelligence Layer

### 9.1 Smart Summary Engine

**Goal:**

For each case:

- Summarise:
  - What happened
  - Current capacity/restrictions
  - Current duties/host situation
  - Risk status
  - Key missing evidence
  - Recommended next actions

**Inputs:**

- Timeline events (all sources)
- Certificates (capacity + dates)
- Open and overdue Actions
- Compliance status
- Check results
- Worker behaviour signals

**Outputs:**

- Structured summary object:
  - narrative
  - bullet points
  - current state
  - risks
  - next steps
  - confidence notes

**Integration:**

- `GET /api/cases/:id/summary`
- CaseDetailPanel: `SummaryCard` at top.

---

### 9.2 Claims Avatar

**Purpose:**

- Collect richer narrative from worker, in their own words.
- Support structured questions to uncover risk, barriers, context.

**Behaviour:**

- Chat UI or link-based conversation, with:
  - Intro + disclaimers (not medical/legal advice)
  - Branching questions based on responses
  - Coverage:
    - injury onset
    - pain & function
    - prior conditions
    - work context
    - psychosocial factors

**Output:**

- Transcript stored as Document and/or Check
- Extracted structured fields:
  - likely diagnosis category
  - psychosocial risk markers
  - return-to-work attitudes
- Timeline events: `discussion_note` with avatar tag

---

### 9.3 Behaviour & Sentiment Engine

**Inputs:**

- Email content
- Avatar transcripts
- Check-in responses
- Attendance (missed appointments, incomplete RTW)

**Outputs:**

- Sentiment trend (improving / stable / deteriorating)
- Engagement score
- Flags:
  - withdrawal
  - frustration / anger
  - inconsistent narrative

Used as weak signals to highlight cases for review, not for punitive use.

---

### 9.4 RTW Intelligence Engine

- Works over:
  - certificates
  - job duties
  - past RTW outcomes
- Generates:
  - phased RTW plans
  - warnings if duties exceed restrictions
  - suggestions for adjusting hours/duties over time

---

### 9.5 Predictive Analytics

**Models:**

- Claim duration prediction
- Probability of successful RTW by time threshold
- Risk of long-term disability or case stagnation

**Use:**

- Sorting cases on dashboard
- Inputs to Smart Summary ("this case is high risk, reasons: …")
- Resource planning

---

## 10. Reporting & Audit

- Org-level dashboards:
  - number of open cases
  - cases with expired/expiring certs
  - RTW success metrics
  - number of actions completed vs overdue
- Export:
  - CSV/Excel exports of cases & timeline
  - Audit logs for regulator or insurer review

---

This file defines how every major module of GPNet is supposed to behave.
