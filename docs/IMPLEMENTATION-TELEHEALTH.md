# Preventli Telehealth Implementation Spec

**For: Claude Code / Coding Agent**
**System: gpnet3 (React + Express + PostgreSQL)**

---

## Overview

Implement telehealth booking and AI-assisted health assessments across the Preventli platform.

---

## 1. Global Header Buttons

### Task
Add two persistent buttons to the app header, visible on every screen.

### Location
`client/src/components/Layout.tsx` or `Header.tsx`

### Implementation

```tsx
// Add to header (top right)
<div className="flex items-center gap-3">
  <Button variant="outline" onClick={() => setChatOpen(true)}>
    <MessageCircle className="w-4 h-4 mr-2" />
    Chat
  </Button>
  <Button variant="primary" onClick={() => setBookingOpen(true)}>
    <Phone className="w-4 h-4 mr-2" />
    Book Telehealth
  </Button>
</div>
```

### State Management
- `chatOpen: boolean` — controls AI chat panel visibility
- `bookingOpen: boolean` — controls booking modal visibility
- Store in global context or zustand store

---

## 2. AI Chat Panel

### Task
Slide-in panel for AI health assistant conversation.

### New Files
- `client/src/components/ChatPanel.tsx`
- `client/src/hooks/useChat.ts`
- `server/routes/chat.ts`

### ChatPanel.tsx Structure

```tsx
interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  context?: {
    caseId?: string;
    workerId?: string;
    assessmentType?: string;
  };
}

// Slide-in from right
// Chat history display
// Input field at bottom
// Send button
// Shows AI persona name/avatar
```

### API Endpoint

```typescript
// server/routes/chat.ts

POST /api/chat/message
Body: {
  message: string;
  sessionId: string;
  context?: {
    caseId?: string;
    workerId?: string;
    assessmentType?: string;
  };
}
Response: {
  reply: string;
  sessionId: string;
}
```

### AI System Prompt

```typescript
const systemPrompt = `You are Dr. Sarah Chen, a telehealth health assistant with Preventli.

You are: warm, professional, reassuring. You speak like a real doctor — clear, calm, human.

Your role:
- Help users with health assessment questions
- Gather health information through natural conversation
- Answer questions about Preventli services
- Book appointments when requested

${context.caseId ? `Current case: ${caseId}` : ''}
${context.workerId ? `Worker: ${workerName}` : ''}

You do NOT diagnose conditions or prescribe medication. You gather information that a real doctor will review.`;
```

---

## 3. Telehealth Booking Modal

### Task
Modal for booking telehealth appointments with context-aware auto-fill.

### New Files
- `client/src/components/BookingModal.tsx`
- `server/routes/bookings.ts`

### BookingModal.tsx Structure

```tsx
interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  context?: {
    caseId?: string;
    workerId?: string;
    workerName?: string;
    workerEmail?: string;
    assessmentType?: string;
    employerName?: string;
  };
}

// Form fields:
// - Worker name (auto-filled if context, else editable)
// - Worker email (auto-filled if context, else editable)
// - Case reference (auto-filled if context, read-only)
// - Appointment type: Radio [Video Call | Face-to-Face]
// - Preferred times: Multi-select checkboxes (generate next 5 business days slots)
// - Custom time: DateTime picker
// - Notes for doctor: Textarea
// - Submit button
```

### Context Detection

```typescript
// In pages that have case context, pass it to BookingModal
// Example: CaseDetailPage.tsx

const { caseId } = useParams();
const { data: caseData } = useQuery(['case', caseId], () => fetchCase(caseId));

<BookingModal
  open={bookingOpen}
  onClose={() => setBookingOpen(false)}
  context={{
    caseId: caseData?.id,
    workerId: caseData?.worker_id,
    workerName: caseData?.worker_name,
    workerEmail: caseData?.worker_email,
    assessmentType: caseData?.assessment_type,
    employerName: caseData?.employer_name,
  }}
/>
```

### Database Schema

```sql
CREATE TABLE telehealth_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(50) REFERENCES cases(id),
  worker_id UUID,
  worker_name TEXT NOT NULL,
  worker_email TEXT NOT NULL,
  employer_name TEXT,
  assessment_type TEXT,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('video', 'face_to_face')),
  preferred_times JSONB NOT NULL, -- array of ISO timestamps
  custom_time TIMESTAMP,
  notes_for_doctor TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  assigned_doctor_id UUID,
  assigned_doctor_name TEXT,
  confirmed_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_status ON telehealth_bookings(status);
CREATE INDEX idx_bookings_case ON telehealth_bookings(case_id);
```

### API Endpoints

```typescript
// server/routes/bookings.ts

// Create booking
POST /api/bookings
Body: {
  caseId?: string;
  workerId?: string;
  workerName: string;
  workerEmail: string;
  employerName?: string;
  assessmentType?: string;
  appointmentType: 'video' | 'face_to_face';
  preferredTimes: string[]; // ISO timestamps
  customTime?: string;
  notesForDoctor?: string;
}
Response: { id: string; status: 'pending' }

// Get bookings (staff view)
GET /api/bookings?status=pending
Response: BookingWithDetails[]

// Confirm booking (after doctor claims)
PATCH /api/bookings/:id/confirm
Body: {
  doctorId: string;
  doctorName: string;
  confirmedTime: string;
}
Response: { id: string; status: 'confirmed' }

// Get booking by case
GET /api/bookings/case/:caseId
Response: Booking[]
```

---

## 4. Doctor Network Email Broadcast

### Task
When booking created, email all doctors in network. First to reply YES gets it.

### New Files
- `server/services/doctorMatching.ts`
- `server/routes/doctorWebhook.ts`

### Database Schema

```sql
CREATE TABLE telehealth_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  specialties TEXT[], -- ['general', 'mental_health', 'injury', 'physio']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE doctor_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES telehealth_bookings(id),
  doctor_id UUID REFERENCES telehealth_doctors(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  response TEXT, -- 'yes', 'no', null (no response)
  responded_at TIMESTAMP
);
```

### doctorMatching.ts

```typescript
export async function broadcastToNetwork(bookingId: string) {
  const booking = await getBooking(bookingId);
  const doctors = await getActiveDoctors();
  
  // Email all doctors
  for (const doctor of doctors) {
    await sendEmail({
      to: doctor.email,
      subject: `Telehealth Request: ${booking.workerName}`,
      body: `
New telehealth booking request:

Worker: ${booking.workerName}
Type: ${booking.assessmentType || 'General'}
Appointment: ${booking.appointmentType === 'video' ? 'Video Call' : 'Face-to-Face'}
Preferred times: ${formatTimes(booking.preferredTimes)}

Reply YES to claim this case.

Case details will be provided upon confirmation.
      `,
    });
    
    // Record notification
    await db.insert('doctor_notifications', {
      booking_id: bookingId,
      doctor_id: doctor.id,
    });
  }
}

export async function handleDoctorResponse(
  doctorEmail: string, 
  bookingId: string, 
  response: 'yes' | 'no'
) {
  if (response !== 'yes') return;
  
  const booking = await getBooking(bookingId);
  
  // Check if already claimed
  if (booking.status !== 'pending') {
    await sendEmail({
      to: doctorEmail,
      subject: 'Case Already Claimed',
      body: 'This case has already been assigned to another doctor.',
    });
    return;
  }
  
  const doctor = await getDoctorByEmail(doctorEmail);
  
  // Claim it
  await db.update('telehealth_bookings', bookingId, {
    status: 'confirmed',
    assigned_doctor_id: doctor.id,
    assigned_doctor_name: doctor.name,
    confirmed_time: booking.preferredTimes[0], // First preferred time
  });
  
  // Update notification record
  await db.update('doctor_notifications', { booking_id: bookingId, doctor_id: doctor.id }, {
    response: 'yes',
    responded_at: new Date(),
  });
  
  // Notify other doctors it's taken
  await notifyOtherDoctors(bookingId, doctor.id);
  
  // Send confirmation to worker
  await sendWorkerConfirmation(booking, doctor);
  
  // Send case details to doctor
  await sendDoctorCaseDetails(booking, doctor);
}
```

---

## 5. Doctor Review Dashboard

### Task
Dashboard for doctors to see their assigned cases and sign off.

### New Files
- `client/src/pages/DoctorDashboard.tsx`
- `client/src/pages/DoctorCaseReview.tsx`

### DoctorDashboard.tsx

```tsx
// Route: /doctor/dashboard
// Shows:
// - Pending reviews (cases waiting for sign-off)
// - Today's appointments
// - Completed reviews

// Each case card shows:
// - Worker name
// - Assessment type
// - Time since assigned
// - Click to open review
```

### DoctorCaseReview.tsx

```tsx
// Route: /doctor/case/:caseId
// Shows:
// - Worker info (name, DOB, contact)
// - Employer info
// - Full questionnaire responses
// - AI pre-analysis and flags
// - Risk score
// - Employer notes
// 
// Actions:
// - Add clinical notes (textarea)
// - Clearance decision (dropdown: Cleared, Cleared with Conditions, Requires Follow-up, Not Cleared)
// - Conditions/notes (if conditional)
// - Sign Off button

interface DoctorSignOff {
  caseId: string;
  doctorId: string;
  clinicalNotes: string;
  clearanceDecision: 'cleared' | 'cleared_conditional' | 'requires_followup' | 'not_cleared';
  conditions?: string;
  signedAt: Date;
}
```

### API Endpoints

```typescript
// Doctor reviews case
POST /api/doctor/cases/:caseId/signoff
Body: {
  clinicalNotes: string;
  clearanceDecision: string;
  conditions?: string;
}
Response: { success: true; reportId: string }

// Triggers:
// 1. Generate report with doctor's sign-off
// 2. Generate PDF
// 3. Send to employer
```

---

## 6. Assessment Types Expansion

### Task
Support 5 assessment types, not just pre-employment.

### Database Changes

```sql
-- Add assessment_type enum or check constraint
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assessment_type TEXT 
  CHECK (assessment_type IN (
    'pre_employment',
    'injury_prevention', 
    'mental_health',
    'exit_assessment',
    'general_wellbeing'
  ));

-- Default existing to pre_employment
UPDATE cases SET assessment_type = 'pre_employment' WHERE assessment_type IS NULL;
```

### UI Changes

**New Assessment Form** (`client/src/pages/NewAssessment.tsx`):

```tsx
// Step 1: Select assessment type
const assessmentTypes = [
  { value: 'pre_employment', label: 'Pre-Employment', icon: '📋', desc: 'New starter health check' },
  { value: 'injury_prevention', label: 'Injury Prevention', icon: '🦺', desc: 'Ergonomic & risk assessment' },
  { value: 'mental_health', label: 'Mental Health', icon: '🧠', desc: 'Wellbeing support' },
  { value: 'exit_assessment', label: 'Exit Assessment', icon: '🚪', desc: 'End of employment review' },
  { value: 'general_wellbeing', label: 'General Wellbeing', icon: '💚', desc: 'Health check' },
];

// Step 2: Enter worker details (same as now)
// Step 3: Review & send
```

### Questionnaire Branching

Different assessment types may need different questions. For MVP:
- Use same base questionnaire
- Add `assessment_type` to context
- AI analysis considers the type when generating report

Future: type-specific questionnaire forms.

---

## 7. Report Generation with Doctor Sign-off

### Task
Update report generation to include doctor's name and sign-off.

### Update `server/services/reportGenerator.ts`

```typescript
interface ReportInput {
  caseId: string;
  workerName: string;
  assessmentType: string;
  questionnaireResponses: Record<string, any>;
  riskScore: number;
  doctorSignOff: {
    doctorName: string;
    clinicalNotes: string;
    clearanceDecision: string;
    conditions?: string;
    signedAt: Date;
  };
}

export async function generateReport(input: ReportInput): Promise<string> {
  const prompt = `
Generate a professional health assessment report.

ASSESSMENT TYPE: ${input.assessmentType}
WORKER: ${input.workerName}

QUESTIONNAIRE RESPONSES:
${JSON.stringify(input.questionnaireResponses, null, 2)}

RISK SCORE: ${input.riskScore}/10

DOCTOR'S CLINICAL NOTES:
${input.doctorSignOff.clinicalNotes}

CLEARANCE DECISION: ${input.doctorSignOff.clearanceDecision}
${input.doctorSignOff.conditions ? `CONDITIONS: ${input.doctorSignOff.conditions}` : ''}

Generate a report with:
1. Executive Summary
2. Health Assessment Findings
3. Doctor's Assessment
4. Clearance Recommendation
5. Conditions/Accommodations (if any)

Include the following sign-off block at the end:

---
This report has been reviewed and approved by:
Dr. ${input.doctorSignOff.doctorName}
Date: ${format(input.doctorSignOff.signedAt, 'dd MMMM yyyy')}
Preventli Telehealth Network
---
`;

  const report = await generateWithLLM(prompt);
  return report;
}
```

---

## 8. File Structure Summary

### New Files to Create

```
client/src/
├── components/
│   ├── ChatPanel.tsx           # AI chat slide-in panel
│   ├── BookingModal.tsx        # Telehealth booking modal
│   └── AssessmentTypeSelector.tsx
├── pages/
│   ├── DoctorDashboard.tsx     # Doctor's case queue
│   ├── DoctorCaseReview.tsx    # Individual case review
│   └── NewAssessment.tsx       # Updated with type selection
└── hooks/
    └── useChat.ts              # Chat state management

server/
├── routes/
│   ├── chat.ts                 # Chat API
│   ├── bookings.ts             # Booking CRUD
│   └── doctor.ts               # Doctor dashboard APIs
└── services/
    ├── doctorMatching.ts       # Network broadcast + claim
    └── reportGenerator.ts      # Updated with doctor sign-off
```

### Database Migrations

```
migrations/
├── 001_add_telehealth_bookings.sql
├── 002_add_telehealth_doctors.sql
├── 003_add_doctor_notifications.sql
├── 004_add_assessment_type.sql
└── 005_add_doctor_signoff_fields.sql
```

---

## Implementation Order

1. **Database migrations** — run all schema changes
2. **Global header buttons** — add Chat + Book Telehealth to header
3. **Booking modal** — form + API + context detection
4. **Assessment type selector** — update new assessment flow
5. **Chat panel** — basic AI chat (can be simple initially)
6. **Doctor dashboard** — list pending reviews
7. **Doctor case review** — full context + sign-off
8. **Report generation** — update to include doctor sign-off
9. **Doctor matching** — email broadcast system
10. **PDF generation** — update templates

---

## Testing Checklist

- [ ] Header buttons visible on all pages
- [ ] Chat panel opens/closes
- [ ] Chat sends/receives messages
- [ ] Booking modal opens with correct context
- [ ] Booking modal auto-fills from case page
- [ ] Booking created in database
- [ ] All 5 assessment types selectable
- [ ] Doctor dashboard shows pending cases
- [ ] Doctor can view full case details
- [ ] Doctor can add notes and sign off
- [ ] Report generates with doctor's name
- [ ] PDF includes sign-off block
- [ ] Employer receives email with PDF
