# Implementation Priority — Phase 1

**Focus:** Get pre-employment workflow working + add chat/telehealth booking UI

---

## Priority 1: Pre-Employment Workflow (End-to-End)

### Current State
- Form exists at `/checks` 
- 8-step questionnaire exists
- Missing: email sending, public worker link, report generation, employer notification

### Tasks

#### 1.1 Database: Add missing fields
```sql
ALTER TABLE pre_employment_assessments ADD COLUMN IF NOT EXISTS
  worker_email TEXT,
  access_token VARCHAR(64) UNIQUE,
  sent_at TIMESTAMP,
  employer_notified_at TIMESTAMP,
  report_json JSONB,
  report_pdf_url TEXT;
```

#### 1.2 Generate access token on create
```typescript
// server/routes/preEmployment.ts — on POST /assessments
import { randomBytes } from 'crypto';

const accessToken = randomBytes(32).toString('hex');
// Save with assessment
```

#### 1.3 Public worker route (no auth)
```typescript
// server/routes/public.ts

// Get assessment info for worker to fill
GET /api/public/check/:token
// Returns: { workerName, employerName, role, formFields }

// Submit completed questionnaire  
POST /api/public/check/:token/submit
// Body: { responses }
// Returns: { success: true }
```

#### 1.4 Public questionnaire page
```tsx
// client/src/pages/PublicQuestionnaire.tsx
// Route: /check/:token (no auth required)

// 1. Fetch assessment info via token
// 2. Show existing 8-step form (PreEmploymentForm.tsx)
// 3. On submit, POST to /api/public/check/:token/submit
// 4. Show thank you message
```

#### 1.5 Send email to worker
```typescript
// server/services/email.ts

export async function sendWorkerQuestionnaire(assessment: Assessment) {
  const link = `${process.env.APP_URL}/check/${assessment.access_token}`;
  
  await sendEmail({
    to: assessment.worker_email,
    subject: `Pre-Employment Health Check - ${assessment.employer_name}`,
    body: `
Hi ${assessment.worker_name},

Please complete your pre-employment health questionnaire:
${link}

This takes about 10-15 minutes.

— Preventli
    `,
  });
  
  // Update sent_at
  await db.update('pre_employment_assessments', assessment.id, {
    sent_at: new Date(),
    status: 'sent',
  });
}
```

#### 1.6 "Send to Worker" button
```tsx
// client/src/pages/ChecksPage.tsx or AssessmentDetail.tsx

// Add button that calls:
POST /api/pre-employment/assessments/:id/send

// Backend triggers sendWorkerQuestionnaire()
```

#### 1.7 Generate report on submit
```typescript
// server/routes/public.ts — in POST /check/:token/submit

// After saving responses:
const report = await generateReport({
  workerName: assessment.worker_name,
  role: assessment.role,
  responses: req.body.responses,
  riskScore: calculateRiskScore(req.body.responses),
});

await db.update('pre_employment_assessments', assessment.id, {
  status: 'completed',
  completed_at: new Date(),
  report_json: report,
});

// Generate PDF
const pdfUrl = await generatePDF(report);
await db.update('pre_employment_assessments', assessment.id, {
  report_pdf_url: pdfUrl,
});

// Notify employer
await sendEmployerNotification(assessment, pdfUrl);
```

#### 1.8 Employer notification email
```typescript
export async function sendEmployerNotification(assessment: Assessment, pdfUrl: string) {
  await sendEmail({
    to: assessment.employer_email,
    subject: `Pre-Employment Report Ready - ${assessment.worker_name}`,
    body: `
The pre-employment health check for ${assessment.worker_name} is complete.

Result: ${assessment.clearance_level}

Full report attached.

— Preventli
    `,
    attachments: [{ url: pdfUrl, filename: 'report.pdf' }],
  });
  
  await db.update('pre_employment_assessments', assessment.id, {
    employer_notified_at: new Date(),
    status: 'employer_notified',
  });
}
```

### Testing Checklist — Priority 1
- [ ] Create assessment with worker email
- [ ] Access token generated
- [ ] "Send to Worker" button works
- [ ] Email sent to worker
- [ ] Worker can access /check/:token (no login)
- [ ] Worker can complete questionnaire
- [ ] Report generated on submit
- [ ] PDF generated
- [ ] Employer receives email with PDF
- [ ] Status updates at each stage

---

## Priority 2: Chat + Telehealth Booking UI

### Tasks

#### 2.1 Global header buttons
```tsx
// client/src/components/Header.tsx or Layout.tsx

// Add to top-right of header:
<div className="flex items-center gap-3">
  <Button variant="outline" onClick={() => setChatOpen(true)}>
    <MessageCircle className="w-4 h-4 mr-2" />
    Chat
  </Button>
  <Button onClick={() => setBookingOpen(true)}>
    <Phone className="w-4 h-4 mr-2" />
    Book Telehealth
  </Button>
</div>

// State in context or zustand:
const [chatOpen, setChatOpen] = useState(false);
const [bookingOpen, setBookingOpen] = useState(false);
```

#### 2.2 Chat panel (slide-in)
```tsx
// client/src/components/ChatPanel.tsx

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    // Add user message
    setMessages([...messages, { role: 'user', content: input }]);
    
    // Call API
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();
    
    // Add assistant reply
    setMessages([...messages, 
      { role: 'user', content: input },
      { role: 'assistant', content: data.reply }
    ]);
    setInput('');
  };
  
  return (
    <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Chat with Dr. Sarah</h2>
        <button onClick={onClose}>✕</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.content}
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t flex gap-2">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

#### 2.3 Chat API endpoint
```typescript
// server/routes/chat.ts

import { Router } from 'express';

const router = Router();

router.post('/message', async (req, res) => {
  const { message } = req.body;
  
  const systemPrompt = `You are Dr. Sarah Chen, a telehealth health assistant with Preventli.
You are warm, professional, and reassuring.
Help users with health questions and booking appointments.
You do NOT diagnose or prescribe — you gather information for doctor review.`;

  const reply = await generateWithLLM(systemPrompt, message);
  
  res.json({ reply });
});

export default router;
```

#### 2.4 Booking modal
```tsx
// client/src/components/BookingModal.tsx

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  context?: {
    caseId?: string;
    workerName?: string;
    workerEmail?: string;
  };
}

export function BookingModal({ open, onClose, context }: BookingModalProps) {
  const [formData, setFormData] = useState({
    workerName: context?.workerName || '',
    workerEmail: context?.workerEmail || '',
    appointmentType: 'video',
    preferredTimes: [],
    notes: '',
  });
  
  const handleSubmit = async () => {
    await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        caseId: context?.caseId,
      }),
    });
    onClose();
    // Show success toast
  };
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Book Telehealth Appointment</h2>
        
        <div className="space-y-4">
          <div>
            <label>Name</label>
            <input 
              value={formData.workerName}
              onChange={(e) => setFormData({...formData, workerName: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label>Email</label>
            <input 
              value={formData.workerEmail}
              onChange={(e) => setFormData({...formData, workerEmail: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label>Appointment Type</label>
            <div className="flex gap-4">
              <label>
                <input 
                  type="radio" 
                  value="video"
                  checked={formData.appointmentType === 'video'}
                  onChange={() => setFormData({...formData, appointmentType: 'video'})}
                />
                Video Call
              </label>
              <label>
                <input 
                  type="radio" 
                  value="face_to_face"
                  checked={formData.appointmentType === 'face_to_face'}
                  onChange={() => setFormData({...formData, appointmentType: 'face_to_face'})}
                />
                Face-to-Face
              </label>
            </div>
          </div>
          
          <div>
            <label>Notes for Doctor (optional)</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border rounded py-2">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 bg-green-500 text-white rounded py-2">Book</button>
        </div>
      </div>
    </div>
  );
}
```

#### 2.5 Bookings table
```sql
CREATE TABLE IF NOT EXISTS telehealth_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR(50),
  worker_name TEXT NOT NULL,
  worker_email TEXT NOT NULL,
  appointment_type TEXT NOT NULL,
  preferred_times JSONB,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.6 Bookings API
```typescript
// server/routes/bookings.ts

router.post('/', async (req, res) => {
  const booking = await db.insert('telehealth_bookings', req.body);
  res.json(booking);
});
```

### Testing Checklist — Priority 2
- [ ] Chat button visible in header
- [ ] Book Telehealth button visible in header
- [ ] Chat panel slides in when clicked
- [ ] Chat sends/receives messages
- [ ] Booking modal opens when clicked
- [ ] Booking modal auto-fills when opened from case page
- [ ] Booking saved to database
- [ ] Both work on all pages

---

## Implementation Order

1. **Database migration** — add fields to pre_employment_assessments + create bookings table
2. **Access token generation** — on assessment create
3. **Public routes** — GET/POST /check/:token
4. **Public questionnaire page** — /check/:token
5. **Send to Worker button** — triggers email
6. **Report generation** — on questionnaire submit
7. **Employer notification** — email with PDF
8. **Header buttons** — add Chat + Book Telehealth
9. **Chat panel** — slide-in UI + API
10. **Booking modal** — form + API

---

## Files to Create/Modify

### Create
- `server/routes/public.ts` — public questionnaire routes
- `server/routes/chat.ts` — chat API
- `server/routes/bookings.ts` — booking API
- `client/src/pages/PublicQuestionnaire.tsx` — worker form page
- `client/src/components/ChatPanel.tsx` — chat UI
- `client/src/components/BookingModal.tsx` — booking UI

### Modify
- `server/routes/preEmployment.ts` — add token generation, send endpoint
- `client/src/components/Header.tsx` or `Layout.tsx` — add buttons
- `client/src/pages/ChecksPage.tsx` — add "Send to Worker" button
