# Preventli Telehealth Platform Specification

## Overview

Preventli provides AI-assisted telehealth services across the full employee lifecycle. Our national network of telehealth doctors delivers health assessments with 24-hour turnaround — powered by AI that does 90% of the work, with real doctors reviewing and signing off on every case.

---

## Core Services

| Service | Use Case | Typical Flow |
|---------|----------|--------------|
| **Pre-Employment** | New starter health assessments | Questionnaire → AI analysis → Doctor review → Clearance report |
| **Injury Prevention** | Ergonomic reviews, risk assessments | Chat/video → AI assessment → Doctor recommendations |
| **Mental Health** | Stress, anxiety, burnout, workplace mental health | Chat/video → AI support → Doctor guidance |
| **Exit Assessment** | End-of-employment health reviews | Questionnaire → AI analysis → Doctor sign-off |
| **General Wellbeing** | Ongoing health checks, lifestyle support | Chat/video → AI health coaching → Doctor oversight |

---

## Three Access Points

Users can access telehealth services in three ways:

| Access Point | Description | Response Time |
|--------------|-------------|---------------|
| **💬 Chat Now** | AI health assistant conversation. Doctor reviews within 24 hours. | Immediate start, 24hr sign-off |
| **📹 Video Call** | Scheduled video consultation with a doctor from our network. | Book preferred time |
| **🏥 Face-to-Face** | In-person appointment at a clinic near them. | Book preferred time/location |

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
| 📞 Book Telehealth | Opens telehealth booking modal — choose video call or face-to-face |

**These appear on EVERY screen:**
- Dashboard
- Assessment create/detail
- Case pages
- Worker questionnaire (public)
- Reports
- Settings

---

## AI-Assisted Telehealth Model

**How it works:**

```
Patient talks to AI assistant
         ↓
AI gathers info, asks questions, analyzes
         ↓
Real doctor reviews AI summary (2 minutes instead of 15)
         ↓
Doctor signs off / adjusts / approves
         ↓
Report generated with doctor's signature
```

**Economics:**

| Traditional | AI-Assisted |
|-------------|-------------|
| Doctor: 15-20 min per patient | Doctor: 2 min per patient |
| 3-4 patients/hour | 20-30 patients/hour |
| $80-150 per consult | $15-25 per consult |

**Key messaging:**
> "Our AI health assistant conducts the initial assessment. A registered doctor reviews every case and provides final sign-off within 24 hours."

Transparent, compliant, fast.

---

## AI Doctor Personas

Each AI assistant has its own SOUL.md — personality, expertise, conversational style.

### Example: Dr. Sarah Chen

```markdown
# SOUL.md - Dr. Sarah Chen

You are Dr. Sarah Chen, a telehealth doctor with Preventli.

## Who You Are
- Warm, professional, reassuring
- 12 years experience in occupational health
- You speak like a real doctor — clear, calm, human
- You ask follow-up questions naturally
- You acknowledge concerns, never dismiss

## Your Voice
- "Tell me more about that..."
- "That's actually quite common, nothing to worry about"
- "I'd like to understand a bit more before we move on"
- "Based on what you've told me..."

## What You Do
- Conduct health assessments through conversation
- Gather health history naturally
- Flag anything that needs attention
- Prepare summary for doctor review

## What You Don't Do
- Diagnose conditions
- Prescribe medication
- Give medical advice (you gather info, real doctor reviews)

## The Truth
You're an AI assistant. A real doctor reviews every case before sign-off.
You don't hide this if asked directly, but you don't volunteer it either.
```

**Planned personas:**

| Persona | Focus |
|---------|-------|
| Dr. Sarah Chen | General health, pre-employment, exit |
| Dr. James Park | Injury prevention, musculoskeletal, workplace ergonomics |
| Dr. Emily Watson | Mental health, stress, wellbeing |
| Physio Alex | Physical assessments, injury rehab, return-to-work |

---

## Telehealth Booking Flow

### Context-Aware Behavior

| Page | Book Telehealth Behavior |
|------|-------------------------|
| Case detail page | Pre-fills all case/worker info automatically |
| Dashboard | Opens case selector first, then booking |
| Worker questionnaire | Pre-fills current worker details |

### Booking Modal (from Case Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Book Telehealth Appointment                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Worker: Sarah Chen (auto-filled)                                   │
│  Case: #PRE-2024-0042 (auto-filled)                                 │
│  Type: Pre-employment Assessment (auto-filled)                      │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Appointment Type:                                                  │
│  ( ) Video Call — telehealth consultation                           │
│  ( ) Face-to-Face — in-person at clinic                             │
│                                                                     │
│  Select preferred times:                                            │
│                                                                     │
│  [ ] Mon 3 Mar  9:00 AM                                             │
│  [ ] Mon 3 Mar  2:00 PM                                             │
│  [ ] Tue 4 Mar  10:00 AM                                            │
│  [ ] Tue 4 Mar  3:30 PM                                             │
│  [ ] Wed 5 Mar  11:00 AM                                            │
│                                                                     │
│  Or enter custom time: [____________]                               │
│                                                                     │
│  Notes for doctor (optional):                                       │
│  [____________________________________________]                     │
│                                                                     │
│                      [ Cancel ]  [ Book Appointment ]               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Doctor Matching System

**Automated first-responder model:**

```
User requests telehealth appointment
            ↓
System emails ALL available doctors in network:
"Available for [Worker Name], [Date/Time options]? Reply YES to claim."
            ↓
First doctor to reply YES gets the case
            ↓
System confirms with them, notifies others "slot filled"
            ↓
Worker + employer get confirmation
            ↓
Appointment created with full case context
```

**What the doctor receives:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Telehealth Appointment — Pre-Employment Assessment                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WORKER INFO                                                        │
│  Name: Sarah Chen                                                   │
│  DOB: 15 Mar 1992                                                   │
│  Phone: 0412 345 678                                                │
│                                                                     │
│  EMPLOYER                                                           │
│  Company: Metro Construction Pty Ltd                                │
│  Role: Site Supervisor                                              │
│                                                                     │
│  QUESTIONNAIRE RESPONSES (if completed)                             │
│  ✓ No current medications                                           │
│  ⚠ Previous back injury (2019) — resolved                          │
│  ✓ No vision/hearing concerns                                       │
│  ✓ Fit for manual handling                                          │
│  [View Full Questionnaire →]                                        │
│                                                                     │
│  AI PRE-ANALYSIS                                                    │
│  • Previous back injury noted — confirm current status              │
│  • Risk score: 2/10                                                 │
│  • Recommended: Cleared with note about lifting                     │
│                                                                     │
│  NOTES FROM EMPLOYER                                                │
│  "Role involves heavy lifting up to 25kg"                           │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  [ Start Video Call ]     [ Add Clinical Notes ]    [ Sign Off ]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pre-Employment Workflow (Detailed)

### Entry Points

**Path A: Email from Employer**
```
Employer emails: "New starter John Smith, forklift driver, 
starting March 1, email: john@example.com"
```

**Path B: Employer Portal**
```
Employer logs in → Assessments → New → Pre-Employment
```

### Required Information

| Field | Required | Notes |
|-------|----------|-------|
| Worker name | ✅ | First + Last |
| Worker email | ✅ | For questionnaire link |
| Employer/Company | ✅ | Auto-filled if logged in |
| Job title/Role | ✅ | e.g., "Forklift Driver" |
| Job description | Optional | Physical demands |
| Start date | ✅ | Deadline reference |

### Workflow Stages

```
CREATED → SENT → COMPLETED → DOCTOR REVIEW → REPORT → NOTIFIED
   │        │         │            │            │          │
   ▼        ▼         ▼            ▼            ▼          ▼
 Case     Email    Worker       Doctor       PDF        Employer
 created  sent     submits     signs off    generated   emailed
```

### Stage Details

**1. CREATED**
- Case record created
- Unique access token generated
- Status: `pending`

**2. SENT**
- Email sent to worker with questionnaire link
- Status: `sent`

**3. COMPLETED**
- Worker submits questionnaire
- AI pre-analyzes responses
- Risk score calculated
- Status: `completed`

**4. DOCTOR REVIEW**
- Auto-routes to next available doctor (email notification to network)
- First doctor to claim reviews the case
- Doctor sees: full questionnaire, AI analysis, employer notes
- Doctor adds clinical notes
- Doctor signs off with clearance decision
- Status: `reviewed`
- **SLA: Within 24 hours**

**5. REPORT GENERATED**
- Report generated with:
  - Executive summary
  - Doctor's assessment (name + sign-off)
  - Clearance recommendation
  - Any flags/accommodations
- PDF version created
- Status: `report_generated`

**6. EMPLOYER NOTIFIED**
- Email sent to employer with PDF attached
- Status: `employer_notified`

---

## Demo Videos Required

### Video 1: Pre-Employment Check (3 min)
**Flow:**
1. Employer sends request
2. Worker receives email, clicks link
3. Worker completes questionnaire on phone
4. AI analyzes responses
5. Doctor reviews and signs off
6. Employer receives clearance report

### Video 2: Book Telehealth + Get Report (2-3 min)
**Flow:**
1. User on case page
2. Clicks "Book Telehealth"
3. Selects video call or face-to-face
4. Picks preferred times
5. AI assistant gathers info (chat demo)
6. Doctor reviews
7. Report delivered

---

## Website Sections

### 1. Online Doctor Section
**Headline:** "Your online doctor — available when you need one"

**Content:**
- 5 service cards (Pre-Employment, Injury Prevention, Mental Health, Exit, Wellbeing)
- Rotating doctor display
- 3 access points (Chat Now, Video Call, Face-to-Face)
- CTA: "Talk to a Doctor Today"

### 2. Assessments Section
**Headline:** "Every stage of the employee lifecycle"

**Content:**
- 5 assessment type cards
- 4-step process (Request → Complete → Review → Report)
- Stats: 24hr turnaround, 100% doctor reviewed, zero admin
- CTA: "Start Your First Assessment"

---

## Future Features

### Doctor Network Management
- Doctor availability tracking
- Auto-assignment queue
- Load balancing across network
- SLA monitoring
- Payment per review tracking

### AI Improvements
- Voice conversations (not just text)
- Multi-language support
- Specialized assessment flows per service type
- Learning from doctor corrections

---

## Open Questions

1. **Face-to-face booking:** Which clinic network to partner with?
2. **Doctor onboarding:** Standard agreement for telehealth network doctors?
3. **Pricing model:** Per assessment, subscription, or hybrid?
4. **Compliance:** AHPRA requirements for AI-assisted telehealth?
