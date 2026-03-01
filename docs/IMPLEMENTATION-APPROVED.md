# Preventli Implementation Spec — APPROVED

**For: Claude Code**
**System: gpnet3 (React + Express + PostgreSQL/Drizzle)**
**Date: 1 March 2026**

---

## Overview

Build a fully self-service telehealth platform for workplace health assessments. Employers submit requests via email or portal, workers complete questionnaires without login, AI generates reports, and everything is stored in PostgreSQL.

---

## 1. Global Header Buttons

### Requirement
Add two persistent buttons to the top-right of the app header, visible on every screen.

### Buttons
- **💬 Chat with Doctor** — opens AI chat panel
- **📞 Book Telehealth** — opens booking modal

### Implementation
```tsx
// In Header.tsx or Layout.tsx (top right)
<div className="flex items-center gap-3">
  <Button variant="outline" onClick={() => setChatOpen(true)}>
    <MessageCircle className="w-4 h-4 mr-2" />
    Chat with Doctor
  </Button>
  <Button variant="primary" onClick={() => setBookingOpen(true)}>
    <Phone className="w-4 h-4 mr-2" />
    Book Telehealth
  </Button>
</div>
```

---

## 2. AI Chat Panel

### Requirement
Slide-in panel from right side for AI health assistant.

### UI
```
┌─────────────────────────────────────────┐
│  💬 Chat with Dr. Sarah                │
│  AI Health Assistant                    │  ← transparency subtitle
├─────────────────────────────────────────┤
│                                         │
│  "Hi! I'm here to help with your       │
│   health questions. A doctor reviews    │
│   our conversation within 24 hours."    │
│                                         │
│  [Chat messages here]                   │
│                                         │
├─────────────────────────────────────────┤
│  [Type a message...        ] [Send]    │
└─────────────────────────────────────────┘
```

### Features
- Warm, professional, doctor-like persona
- Context-aware (knows current case/worker if on case page)
- Clear it's AI-assisted, doctor reviews

### API Endpoint
```typescript
// POST /api/chat/message
{
  message: string;
  sessionId: string;
  context?: { caseId?: string; workerId?: string; }
}

// Response
{ reply: string; sessionId: string; }
```

### System Prompt
```
You are Dr. Sarah Chen, an AI health assistant with Preventli.
You are warm, professional, and reassuring.
Help users with health questions and booking appointments.
A real doctor reviews all conversations within 24 hours.
You do NOT diagnose or prescribe — you gather information.
```

---

## 3. Telehealth Booking Modal

### Requirement
Modal for requesting telehealth appointments. Context-aware, shows worker/case summary.

### UI
```
┌─────────────────────────────────────────────────────────────────────┐
│                     Book Telehealth Appointment                     │
│           🩺 All doctors AHPRA registered • 24hr response          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SERVICE TYPE                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Pre-Emp │ │ Injury  │ │ Mental  │ │  Exit   │ │Wellbeing│       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                                     │
│  WORKER SUMMARY (auto-filled from case)                            │
│  Name: Sarah Chen • 2 years service • Site Supervisor              │
│  Case: Lower back strain • RTW planning                            │
│  📄 2 reports attached                                              │
│                                                                     │
│  APPOINTMENT TYPE                                                   │
│  ( ) 📹 Video Call   ( ) 🏥 Face-to-Face                           │
│                                                                     │
│  YOUR NOTES FOR THE DOCTOR                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ E.g., performance concerns, barriers to return, questions   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  💡 NEED A REFERRAL?                                                │
│  Our doctors can issue referrals for blood tests, scans, or        │
│  specialist appointments. Referrals billed separately (flat fee).  │
│                                                                     │
│  [ ] Request referral capability for this appointment              │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│                      [ Cancel ]  [ Request Booking ]                │
│                                                                     │
│  ✓ We'll contact you within 24 hours to confirm time & pricing    │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow
1. User clicks "Book Telehealth"
2. Modal shows worker/case summary (auto-filled if on case page)
3. User selects service type, appointment type
4. User adds notes for doctor
5. User clicks "Request Booking"
6. System saves booking (status: pending)
7. Shows confirmation: "We'll contact you within 24 hours"
8. Preventli staff handles provider matching, scheduling, pricing manually

### Database
```sql
CREATE TABLE telehealth_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(50),
  worker_id UUID,
  worker_name TEXT NOT NULL,
  worker_email TEXT,
  employer_name TEXT,
  service_type TEXT, -- pre_employment, injury, mental_health, exit, wellbeing
  appointment_type TEXT NOT NULL, -- video, face_to_face
  employer_notes TEXT,
  request_referral BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Pre-Employment Workflow (End-to-End)

### Entry Point A: Email
Employer emails checks@preventli.ai with:
- Worker name, email
- Role
- Job description
- Start date

AI parses email → creates assessment → sends questionnaire automatically.

### Entry Point B: Employer Portal
Employer logs in → Checks → New Pre-Employment

### Form Fields
```
Worker Name *
Worker Email *
Role/Position *
Start Date *
Job Description * (textarea)
  "Describe the role: physical demands, equipment used, 
   working conditions, hours, any hazards"
Attach Job Description PDF (optional)

[Send to Worker]
```

### Workflow Stages
```
1. CREATED
   - Assessment record created
   - Unique access token generated
   - Worker record created/linked

2. SENT
   - Email sent to worker with questionnaire link
   - Link: /check/{token} (no login required)

3. COMPLETED
   - Worker submits questionnaire
   - AI analyzes responses
   - Risk score calculated
   - Report generated (PDF)

4. NOTIFIED
   - If Cleared → auto-send to employer
   - If Requires Review → alert jacinta@preventli.ai
   - Employer receives PDF via email
```

### Worker Questionnaire (Public Route)
```
Route: /check/:token (NO authentication required)

Shows:
- "Pre-Employment Health Check for [Employer Name]"
- Worker name (read-only)
- Role (read-only)
- 8-step health questionnaire (existing)
- Submit button

On submit:
- Save responses
- Generate report
- Notify employer (or alert if flagged)
```

### Database Changes
```sql
-- Add to existing pre_employment_assessments or create assessments table
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS
  worker_id UUID REFERENCES workers(id),
  worker_email TEXT,
  access_token VARCHAR(64) UNIQUE,
  job_description TEXT,
  assessment_type TEXT DEFAULT 'pre_employment',
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  employer_notified_at TIMESTAMP,
  report_json JSONB,
  report_pdf_url TEXT,
  alert_sent BOOLEAN DEFAULT false;

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link assessments to workers
CREATE INDEX idx_assessments_worker ON assessments(worker_id);
CREATE INDEX idx_assessments_token ON assessments(access_token);
```

---

## 5. Data Architecture

### Single Source of Truth: PostgreSQL

All data lives in Preventli database. External sources (Freshdesk, email) sync INTO it.

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    Freshdesk    │      │     Email       │      │  Employer       │
│    (tickets)    │      │   (inbound)     │      │   Portal        │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         │   webhook/sync         │   parse/ingest         │   direct
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PREVENTLI DATABASE (PostgreSQL)                  │
│                                                                     │
│  workers | employers | assessments | cases | emails | documents    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ AI queries here (fast)
                                  ▼
                            [ AI Agent ]
```

### Intelligent Email Ingestion

When email comes in:
1. AI analyzes content
2. Matches to worker/case (or flags if can't)
3. Extracts relevant fields
4. Updates case status, summary
5. Attaches documents to case record

### Document Storage
```sql
CREATE TABLE case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  worker_id UUID REFERENCES workers(id),
  document_type TEXT, -- medical_certificate, physio_report, xray, etc.
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  source TEXT, -- email, portal_upload, freshdesk
  extracted_data JSONB, -- AI-extracted fields
  notes TEXT
);
```

---

## 6. Alert System

### When to Alert
| Situation | Action |
|-----------|--------|
| Can't match email to worker/case | Alert |
| Can't read/parse PDF | Alert |
| Assessment flagged "Requires Review" | Alert |
| Ambiguous — multiple matches | Alert |

### Alert Recipient
**jacinta@preventli.ai**

### Alert Email Format
```
Subject: ⚠️ Action Required — Unable to Process

Hi Jacinta,

The system couldn't automatically process:

Type: [Incoming email / PDF attachment / Assessment]
From: [sender]
Received: [timestamp]

Issue: [description]

Original content attached.

Review and resolve:
[Link to admin panel]

— Preventli System
```

### Admin Dashboard
- "Needs Attention" queue visible
- Shows all unresolved items
- Actions: assign to worker, create new record, mark resolved

---

## 7. Report Generation

### Trigger
Worker submits questionnaire → AI generates report automatically

### Report Content
- Executive Summary
- Worker Health Status
- Fitness for Role Assessment (references job description)
- Flags/Concerns (if any)
- Clearance Recommendation
  - CLEARED
  - CLEARED WITH CONDITIONS
  - REQUIRES REVIEW
  - NOT CLEARED

### Auto-Send Logic
- **CLEARED**: Auto-send to employer
- **CLEARED WITH CONDITIONS**: Auto-send to employer
- **REQUIRES REVIEW**: Alert Jacinta first, manual review
- **NOT CLEARED**: Alert Jacinta first, manual review

### PDF Generation
- Generate PDF from report
- Store in file storage (S3/local)
- Save URL in `report_pdf_url` field
- Attach to employer notification email

---

## 8. Assessment Types

### Database Field
```sql
assessment_type TEXT CHECK (assessment_type IN (
  'pre_employment',
  'injury_prevention',
  'mental_health',
  'exit_assessment',
  'general_wellbeing'
));
```

### Phase 1 Scope
- **Pre-Employment**: Fully functional
- **Other types**: Framework in place (type selector, DB field)
  - Can create assessments of any type
  - Use generic questionnaire for now
  - Type-specific questionnaires in future phase

---

## 9. API Endpoints

### Public (No Auth)
```typescript
GET  /api/public/check/:token      // Get assessment info for worker
POST /api/public/check/:token      // Submit questionnaire responses
```

### Authenticated (Employer/Admin)
```typescript
// Assessments
GET    /api/assessments                    // List all
GET    /api/assessments/:id                // Get one
POST   /api/assessments                    // Create new
POST   /api/assessments/:id/send           // Send to worker
GET    /api/assessments/:id/report         // Get report

// Workers
GET    /api/workers                        // List all
GET    /api/workers/:id                    // Get one with history
POST   /api/workers                        // Create new

// Bookings
GET    /api/bookings                       // List all
POST   /api/bookings                       // Create booking request
PATCH  /api/bookings/:id                   // Update status

// Chat
POST   /api/chat/message                   // Send message to AI

// Admin
GET    /api/admin/alerts                   // Get items needing attention
POST   /api/admin/alerts/:id/resolve       // Mark as resolved
```

---

## 10. Files to Create

### Frontend
```
client/src/
├── components/
│   ├── ChatPanel.tsx           # AI chat slide-in
│   ├── BookingModal.tsx        # Telehealth booking
│   └── AlertBadge.tsx          # Shows unresolved alert count
├── pages/
│   ├── PublicQuestionnaire.tsx # /check/:token (public)
│   ├── NewAssessment.tsx       # Create assessment form
│   ├── AssessmentDetail.tsx    # View assessment + timeline
│   ├── WorkerProfile.tsx       # Worker with all history
│   └── AdminAlerts.tsx         # Needs attention queue
└── hooks/
    ├── useChat.ts              # Chat state
    └── useBooking.ts           # Booking state
```

### Backend
```
server/
├── routes/
│   ├── public.ts               # Public questionnaire routes
│   ├── assessments.ts          # Assessment CRUD
│   ├── workers.ts              # Worker CRUD
│   ├── bookings.ts             # Booking CRUD
│   ├── chat.ts                 # AI chat
│   └── admin.ts                # Admin/alerts
├── services/
│   ├── emailParser.ts          # Parse incoming emails
│   ├── reportGenerator.ts      # AI report generation
│   ├── pdfGenerator.ts         # Generate PDFs
│   ├── alertService.ts         # Send alerts to Jacinta
│   └── emailSender.ts          # Send emails (worker, employer)
└── migrations/
    ├── add_workers_table.sql
    ├── add_assessments_fields.sql
    ├── add_bookings_table.sql
    └── add_documents_table.sql
```

---

## 11. Implementation Order

1. **Database migrations** — workers, assessments fields, bookings, documents
2. **Header buttons** — add Chat + Book Telehealth to layout
3. **Public questionnaire route** — /check/:token
4. **Assessment create flow** — form with job description
5. **Send to worker** — email with unique link
6. **Worker submits** — save responses
7. **Report generation** — AI + PDF
8. **Employer notification** — email with PDF
9. **Alert system** — flag failures, email Jacinta
10. **Chat panel** — AI chat UI + API
11. **Booking modal** — form + API
12. **Worker profiles** — view all history

---

## 12. Testing Checklist

### Pre-Employment Flow
- [ ] Create assessment with all required fields
- [ ] Access token generated
- [ ] Email sent to worker
- [ ] Worker can access /check/:token without login
- [ ] Worker completes questionnaire
- [ ] Responses saved to database
- [ ] AI report generated
- [ ] PDF created
- [ ] Worker record created/updated
- [ ] Employer receives email with PDF
- [ ] Timeline shows all events

### Chat
- [ ] Chat button visible on all pages
- [ ] Chat panel slides in
- [ ] Messages send/receive
- [ ] AI responds appropriately
- [ ] Context passed when on case page

### Booking
- [ ] Book button visible on all pages
- [ ] Modal opens
- [ ] Auto-fills from case page
- [ ] All service types selectable
- [ ] Booking saved to database
- [ ] Confirmation message shown

### Alerts
- [ ] Unmatched email triggers alert
- [ ] Unreadable PDF triggers alert
- [ ] "Requires Review" assessment triggers alert
- [ ] Email sent to jacinta@preventli.ai
- [ ] Alert appears in admin dashboard
- [ ] Can resolve alerts

---

## Summary

This spec covers:
1. ✅ Global header buttons (Chat + Book Telehealth)
2. ✅ AI chat panel (Dr. Sarah, transparent AI disclosure)
3. ✅ Telehealth booking modal (context-aware, referral option)
4. ✅ Pre-employment workflow (email or portal, self-service)
5. ✅ Data architecture (PostgreSQL as source of truth)
6. ✅ Intelligent email ingestion (AI extracts and updates)
7. ✅ Document storage (attached to cases)
8. ✅ Alert system (email Jacinta when AI can't process)
9. ✅ Report generation (AI + PDF + auto-send)
10. ✅ Assessment types (5 types, pre-employment fully built)

**Build in order listed. Test each component before moving to next.**
