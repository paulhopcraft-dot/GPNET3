# GPNet Master Overview

## 1. Purpose & Product Vision

GPNet is a B2B case management and decision-support platform for employers, host sites, occupational health providers, and insurers dealing with:

- Worker injuries
- Long-term conditions
- Mental health and general health issues affecting work
- Return-to-work (RTW) and redeployment
- Compliance with certificates, legislation, and internal policies

### Core goals

- No worker "lost in the system"
- Earlier and safer RTW where appropriate
- Lower admin and email chaos for employers/insurers
- Better documentation for regulators, insurers, and disputes
- A single source of truth per worker and case
- An AI layer that *reasons over the timeline*, not just summarises raw text

---

## 2. Top-Level Product Surfaces

### 2.1 Marketing Site – `gpnet.au`

- Purpose: brand, sales, lead generation, basic product education.
- Pages:
  - Home (hero, value props, testimonials, CTA to book demo / sign up)
  - About (team, mission)
  - Contact (form + email)
  - Insights / Blog (optional later)
- Always-visible:
  - "Login" button in header → `portal.gpnet.au/login`.

### 2.2 Portal – `portal.gpnet.au`

- Purpose: secure workspace for organisations.
- Entry: `/login` → post-login `/app` or `/`.
- All `/app/*` routes require authentication.

High-level sections:

- Dashboard
- Cases
- Checks / Assessments
- Certificates (within case detail)
- Timeline (within case detail)
- Emails / Comms
- Compliance & Actions
- Reports
- Automations
- Admin

---

## 3. Personas

1. **Employer HR / WHS / RTW Coordinator**
   - Manages injured workers, liaises with host sites.
   - Wants: clarity on status, obligations, next actions.

2. **Host Site Supervisor**
   - Provides duties, monitors worker performance.
   - Wants: clear restrictions and duties, minimal admin.

3. **Insurer / Claims Manager**
   - Oversees liability, approvals, payment decisions.
   - Wants: evidence, compliance, risk and progress indicators.

4. **Internal Consultant / RTW Specialist**
   - Finds duties, works with multiple host sites.
   - Wants: structured clinical/functional info, summary, action list.

5. **Worker**
   - Interacts via emails/forms/advocacy not full portal.
   - Wants: to be heard, clear expectations, safe duties, not be abandoned.

6. **Clinical Providers (GP/Physio/IME)**
   - Provide medical info, opinions, certificates.
   - Not primary portal users, but key sources of documents/events.

---

## 4. Core Flows (End-to-End)

### 4.1 Injury / Case Creation Flow

- Source:
  - JotForm or similar injury form → webhook
  - Freshdesk ticket → ingested
  - Manual case creation in portal
- System:
  - Creates/links Worker
  - Creates Case (type: injury / mental health / general / etc.)
  - Creates initial Timeline events:
    - `case_created`
    - `attachment_uploaded` (incident form / early docs)
- Optional:
  - Triggers initial AI summary + suggested actions.

---

### 4.2 Certificate Management Flow

- Worker sees GP / specialist → gets certificate.
- Certificate enters system via:
  - Email attachment (Freshdesk or connected inbox)
  - JotForm upload
  - Manual upload in portal
- Pipeline:
  - Stored as Document
  - Classified as Certificate
  - Parsed for:
    - Dates (issue, from, to, review)
    - Capacity (fit / restricted / unfit)
    - Restrictions text
  - Linked to Case and Worker
  - New Timeline event: `certificate_added`
  - Compliance Engine:
    - Updates compliance flags (no cert / expiring / expired)
    - Creates/updates `chase_certificate` Actions accordingly.

---

### 4.3 Weekly Check-in & Welfare Monitoring

- Worker receives periodic check-in (email/SMS link or host-driven):
  - Pain / symptoms
  - Mood / stress
  - Functional capacity & difficulties
  - Work experience feedback
  - Free-text concerns
- Responses:
  - Stored as Check results + Timeline events
  - Feed into:
    - Risk scoring
    - Behaviour/sentiment engine
    - Smart Summary
    - RTW plan adjustments.

---

### 4.4 RTW & Redeployment Flow

- Using certificates + interviews + host input:
  - Generate or refine RTW Plan (phased duties/hours, restrictions)
- Consultant / employer uses GPNet to:
  - Identify suitable duties at current host
  - If none, broadcast to network (internal concept; spec-level only)
- System tracks:
  - Who is placed where and under what restrictions
  - RTW milestones and failures
  - RTW-related Timeline events.

---

### 4.5 Compliance & Action Flow

- Compliance Engine monitors:
  - Certificates (presence, expiry)
  - RTW status vs restrictions
  - Gaps in clinical evidence
  - Non-attendance / non-engagement patterns
- Outputs:
  - Compliance flags per case
  - Pending / overdue Actions
- Dashboard shows:
  - "Cases needing action"
  - Action Queue (e.g. "Chase cert", "Check in worker", "Call host")

---

### 4.6 AI Avatar & Smart Summary Flows (Future-leaning but specced)

- Worker interacts with an Avatar (LLM-based) to:
  - Tell their story
  - Answer structured questions
  - Provide context & barriers
- System:
  - Converts conversation into structured fields
  - Adds Transcript + Timeline events
  - Produces Smart Summary:
    - Situation
    - Clinical/functional state
    - RTW feasibility
    - Red flags
    - Suggested next steps (for human review)

---

## 5. Value Proposition (Why GPNet Exists)

- **For Employers / Hosts**:
  - Clear, centralised view of each worker and their case.
  - Automatic reminders for critical tasks (certs, follow-ups).
  - Evidence for regulators and insurers.

- **For Insurers**:
  - Better, more complete case files.
  - Earlier detection of risk and non-compliance.
  - Structured summaries and predictions.

- **For Workers**:
  - Someone is actually watching their case.
  - Less repetition in retelling their story.
  - More consistent communication.

- **For Consultants / Providers**:
  - Clear info on restrictions and job demands.
  - Easier to give and get accurate info.

This is the product context everything else sits on.
