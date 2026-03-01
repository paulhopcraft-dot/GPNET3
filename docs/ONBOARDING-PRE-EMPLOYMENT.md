# Pre-Employment Check: Visual Walkthrough

## Overview
This guide walks through the complete pre-employment health check workflow with screen mockups.

---

## Step 1: Create New Assessment

**Location:** Checks → Pre-Employment Tab → "New Assessment" button

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back                    New Pre-Employment Assessment            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WORKER INFORMATION                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐   │
│  │ First Name *               │ │ Last Name *                 │   │
│  │ John                       │ │ Smith                       │   │
│  └─────────────────────────────┘ └─────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Email Address *                                             │   │
│  │ john.smith@email.com                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Phone (optional)                                            │   │
│  │ 0412 345 678                                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  POSITION DETAILS                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Employer/Company *                                          │   │
│  │ Acme Corporation                               ▼            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐   │
│  │ Role/Position *            │ │ Start Date *                │   │
│  │ Forklift Driver            │ │ 📅 March 1, 2026            │   │
│  └─────────────────────────────┘ └─────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Job Description (optional)                                  │   │
│  │ Operating forklift in warehouse environment. Requires       │   │
│  │ lifting up to 20kg, standing for extended periods,          │   │
│  │ and working in varying temperatures.                        │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐     │
│  │   Save Draft    │  │  ✉️  Save & Send to Worker           │     │
│  └─────────────────┘  └──────────────────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**What happens when you click "Save & Send to Worker":**
1. Assessment record created in database
2. Unique access link generated
3. Email sent to worker immediately
4. You see confirmation toast: "Questionnaire sent to john.smith@email.com"

---

## Step 2: Worker Receives Email

**Email sent to worker:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ From: Preventli <noreply@preventli.com.au>                         │
│ To: john.smith@email.com                                           │
│ Subject: Pre-Employment Health Check - Acme Corporation            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [PREVENTLI LOGO]                                                   │
│                                                                     │
│  Hi John,                                                           │
│                                                                     │
│  Congratulations on your new role as Forklift Driver at            │
│  Acme Corporation!                                                  │
│                                                                     │
│  Before you start, please complete a quick health questionnaire.   │
│  This helps ensure we can support a safe working environment       │
│  for you.                                                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │              [ Complete Health Check → ]                    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ⏱️ Takes about 10-15 minutes                                      │
│  📅 Please complete by: February 27, 2026                          │
│                                                                     │
│  Your responses are confidential and will only be used to          │
│  assess your fitness for the role.                                 │
│                                                                     │
│  Questions? Reply to this email.                                   │
│                                                                     │
│  — The Preventli Team                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 3: Worker Completes Questionnaire

**Worker clicks link → Opens questionnaire (no login required)**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [PREVENTLI LOGO]        Pre-Employment Health Assessment          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Position: Forklift Driver at Acme Corporation                     │
│  Start Date: March 1, 2026                                         │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 25% Complete      │
│                                                                     │
│  Step 2 of 8: Work History                                         │
│                                                                     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                  │
│  │ ✓ │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │ │ 8 │                  │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                  │
│  Info   Work  Occ.  Med.  Func. Psych Family  Life                │
│         Hist. Health Cond. Cap.  Well. Vacc.  style                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PREVIOUS EMPLOYMENT                                                │
│                                                                     │
│  Position 1                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Job Title                                                   │   │
│  │ Warehouse Assistant                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Common Tasks Performed                                      │   │
│  │ Picking and packing, loading trucks, inventory management   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────┐ ┌─────────────────────────┐           │
│  │ Duration               │ │ Year                    │           │
│  │ 2 years                │ │ 2024                    │           │
│  └─────────────────────────┘ └─────────────────────────┘           │
│                                                                     │
│  [+ Add Another Position]                                           │
│                                                                     │
│  ┌─────────────┐                              ┌─────────────────┐  │
│  │  ← Back     │                              │     Next →      │  │
│  └─────────────┘                              └─────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**8 Steps worker completes:**

| Step | Section | What's Asked |
|------|---------|--------------|
| 1 | Personal Info | Name, age, gender (pre-filled where possible) |
| 2 | Work History | Previous 3 jobs, tasks performed |
| 3 | Occupational Health | Work injuries, hazard exposure, WorkCover claims |
| 4 | Medical Conditions | Current conditions by category |
| 5 | Functional Capacity | Pain levels, lifting capacity, mobility |
| 6 | Psychological Wellbeing | Mental health screening (K10-style) |
| 7 | Family & Vaccination | Family history, immunizations |
| 8 | Lifestyle & Review | Smoking, alcohol, final review |

---

## Step 4: Worker Submits → System Processes

**Submission confirmation (what worker sees):**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [PREVENTLI LOGO]                                                   │
│                                                                     │
│                          ✅                                         │
│                                                                     │
│              Thank You, John!                                       │
│                                                                     │
│     Your health assessment has been submitted successfully.        │
│                                                                     │
│     What happens next:                                              │
│     • We'll review your responses                                   │
│     • A report will be sent to Acme Corporation                    │
│     • You'll start work on March 1, 2026                           │
│                                                                     │
│     If there are any concerns, we'll be in touch.                  │
│                                                                     │
│     ─────────────────────────────────────────────                  │
│                                                                     │
│     Questions? Contact us at support@preventli.com.au              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Behind the scenes (automatic):**
1. Responses saved to database
2. Risk score calculated (0-10)
3. AI generates report
4. PDF created
5. Clearance level determined

---

## Step 5: AI Generates Report

**Sample generated report:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [PREVENTLI LOGO]           PRE-EMPLOYMENT HEALTH REPORT           │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  Candidate: John Smith                                              │
│  Position: Forklift Driver                                          │
│  Employer: Acme Corporation                                         │
│  Assessment Date: February 18, 2026                                 │
│  Report ID: PE-2026-00142                                           │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │   CLEARANCE STATUS:  ✅ CLEARED                             │   │
│  │                                                             │   │
│  │   Risk Score: 2/10 (Low)                                    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  EXECUTIVE SUMMARY                                                  │
│  ─────────────────                                                  │
│  John Smith is fit to commence work as a Forklift Driver.          │
│  No significant health concerns identified. The candidate has      │
│  relevant warehouse experience and demonstrates adequate           │
│  functional capacity for the physical demands of the role.         │
│                                                                     │
│  HEALTH ASSESSMENT SUMMARY                                          │
│  ─────────────────────────                                          │
│  • No current medical conditions reported                          │
│  • No previous WorkCover claims                                    │
│  • No hazardous substance exposure history                         │
│  • Functional capacity meets role requirements                     │
│  • Psychological wellbeing within normal range                     │
│                                                                     │
│  FITNESS FOR ROLE                                                   │
│  ────────────────                                                   │
│  Role Requirement              Assessment              Status       │
│  ──────────────────────────────────────────────────────────────    │
│  Lifting up to 20kg            25kg capacity           ✅ PASS     │
│  Extended standing             No limitations          ✅ PASS     │
│  Forklift operation            No contraindications    ✅ PASS     │
│  Temperature variation         No concerns             ✅ PASS     │
│                                                                     │
│  RECOMMENDATIONS                                                    │
│  ───────────────                                                    │
│  • Standard workplace induction                                     │
│  • Forklift certification verification                              │
│  • No special accommodations required                               │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  This assessment is based on self-reported information provided    │
│  by the candidate. Preventli recommends standard workplace          │
│  health and safety protocols.                                       │
│                                                                     │
│  Assessment conducted by: Preventli AI Assessment System           │
│  Report generated: February 18, 2026 at 2:31 PM AEDT               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 6: Employer Receives Result

**Email to employer:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ From: Preventli <noreply@preventli.com.au>                         │
│ To: hr@acmecorp.com.au                                             │
│ Subject: ✅ Pre-Employment Report Ready - John Smith               │
│ Attachment: PE-2026-00142-John-Smith.pdf                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [PREVENTLI LOGO]                                                   │
│                                                                     │
│  Pre-Employment Health Report                                       │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  Candidate: John Smith                                              │
│  Position: Forklift Driver                                          │
│  Start Date: March 1, 2026                                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │   Result:  ✅ CLEARED FOR EMPLOYMENT                        │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Summary:                                                           │
│  John Smith has completed the pre-employment health assessment     │
│  and is cleared to commence work as scheduled. No health           │
│  concerns or restrictions identified.                               │
│                                                                     │
│  📎 Full report attached                                           │
│                                                                     │
│  ─────────────────────────────────────────────                     │
│                                                                     │
│  Questions about this assessment?                                   │
│  Reply to this email or call 1300 XXX XXX                          │
│                                                                     │
│  — The Preventli Team                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Staff View: Assessment Timeline

**What staff sees in the system:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Assessments                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  John Smith                                          ✅ CLEARED     │
│  Forklift Driver at Acme Corporation                                │
│  Start Date: March 1, 2026                                          │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  TIMELINE                                                           │
│                                                                     │
│  ●━━━━━━━━●━━━━━━━━━━━━━●━━━━━━━━━━━●━━━━━━━━━━━●━━━━━━━○          │
│  │        │             │           │           │       │          │
│  CREATE   SENT          COMPLETED   REPORT      NOTIFIED START     │
│  Feb 15   Feb 15        Feb 18      Feb 18      Feb 18   Mar 1     │
│                                                                     │
│  📋 Feb 15, 9:00 AM — Assessment created                           │
│     Created by: admin@preventli.com.au                              │
│                                                                     │
│  ✉️ Feb 15, 9:02 AM — Questionnaire sent to worker                 │
│     Email: john.smith@email.com                                     │
│                                                                     │
│  ✅ Feb 18, 2:30 PM — Worker completed questionnaire               │
│     Completed in 12 minutes                                         │
│                                                                     │
│  📄 Feb 18, 2:31 PM — Report generated                             │
│     Risk Score: 2/10 | Clearance: CLEARED                          │
│     [View Report] [Download PDF]                                    │
│                                                                     │
│  📨 Feb 18, 2:32 PM — Employer notified                            │
│     Email sent to: hr@acmecorp.com.au                               │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  ACTIONS                                                            │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐  │
│  │ 📄 View Report │ │ 📥 Download PDF│ │ ✉️ Resend to Employer  │  │
│  └────────────────┘ └────────────────┘ └────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alternative Outcomes

### Cleared with Conditions

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CLEARANCE STATUS:  ⚠️ CLEARED WITH CONDITIONS                │
│                                                                 │
│   Risk Score: 4/10 (Moderate)                                   │
│                                                                 │
│   Conditions:                                                   │
│   • Previous lower back injury - recommend ergonomic           │
│     assessment of workstation                                   │
│   • Lifting capacity 15kg (role requires 20kg) - may           │
│     need task modification or buddy lifting for heavier items  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Requires Review

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CLEARANCE STATUS:  🔍 REQUIRES REVIEW                        │
│                                                                 │
│   Risk Score: 7/10 (High)                                       │
│                                                                 │
│   Flags:                                                        │
│   • Active WorkCover claim reported                            │
│   • Chronic pain rated 7/10 in lower back                      │
│   • Currently taking pain medication                            │
│                                                                 │
│   Action Required:                                              │
│   Staff must review before employer notification                │
│                                                                 │
│   [Review & Approve] [Review & Reject] [Request More Info]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Not Cleared

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CLEARANCE STATUS:  ❌ NOT CLEARED                            │
│                                                                 │
│   Risk Score: 9/10 (Very High)                                  │
│                                                                 │
│   Reasons:                                                      │
│   • Unable to meet minimum physical requirements for role      │
│   • Significant restrictions incompatible with job demands     │
│                                                                 │
│   Recommendation:                                               │
│   Contact employer to discuss alternative roles or             │
│   further medical assessment required.                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  EMPLOYER   │     │  PREVENTLI  │     │   WORKER    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  Request check    │                   │
       │──────────────────►│                   │
       │  (email/portal)   │                   │
       │                   │                   │
       │                   │  Send link        │
       │                   │──────────────────►│
       │                   │                   │
       │                   │                   │ Complete
       │                   │                   │ questionnaire
       │                   │◄──────────────────│
       │                   │  Submit           │
       │                   │                   │
       │                   │ ┌───────────────┐ │
       │                   │ │ AI generates  │ │
       │                   │ │ report + PDF  │ │
       │                   │ └───────────────┘ │
       │                   │                   │
       │  Report + result  │                   │
       │◄──────────────────│                   │
       │                   │                   │
       ▼                   ▼                   ▼
   CLEARED              DONE               DONE
```

---

## Next: Implementation Checklist

See `WORKFLOW-NEW-STARTER.md` for technical implementation details.
