# GPNet3 Claims MVP - Demo Presentation

## Overview

GPNet3 is a claims, compliance, and return-to-work (RTW) management system for WorkSafe Victoria compliance. This demo showcases the core MVP features implemented.

---

## Demo Prerequisites

### 1. Start the Application
```bash
npm run dev
```
Server runs at: http://localhost:5000

### 2. Login Credentials
- **Email:** admin@gpnet.local
- **Password:** admin123

---

## Demo Script

### Part 1: Dashboard Overview (2 min)

**Navigate to:** http://localhost:5000

1. **Login** with admin credentials
2. **Show the main dashboard:**
   - Cases summary cards (total, active, pending review)
   - Action Queue widget (pending actions with due dates)
   - Company filter sidebar

**Key Points:**
- Real-time sync with Freshdesk (151+ cases)
- Visual urgency indicators (red for overdue, amber for due soon)
- Clean, modern UI built with Tailwind CSS + shadcn/ui

---

### Part 2: Freshdesk Integration (3 min)

**Show:** Cases synced from Freshdesk

1. **Explain the sync process:**
   - Tickets ingested from Freshdesk via API
   - Grouped by worker name into unified cases
   - Certificate data extracted automatically

2. **Click on a case** to open the detail panel

3. **Show case details:**
   - Worker information
   - Linked Freshdesk ticket IDs
   - Medical certificate history
   - Timeline of events

**Key Points:**
- Bi-directional sync (updates flow back to Freshdesk)
- Multiple tickets consolidated per worker
- Audit trail for all changes

---

### Part 3: Case Detail Panel (3 min)

**Open:** Any case from the dashboard

1. **Overview Section:**
   - Worker name, company, claim status
   - Risk indicators
   - Assigned handler

2. **Medical Certificates Tab:**
   - Certificate timeline visualization
   - Capacity status (fit, unfit, modified duties)
   - Expiry tracking and alerts

3. **AI Summary (Claude Integration):**
   - Click "Generate Summary" button
   - Shows AI-generated case summary
   - Highlights key concerns and recommendations

**Key Points:**
- Comprehensive case view in one place
- AI-powered insights reduce manual review time
- Certificate expiry alerts prevent compliance gaps

---

### Part 4: Close Case Feature (2 min) ⭐ NEW

**Demo the close case workflow:**

1. **Open an active case**

2. **Click "Close Case" button** (green button with checkmark)

3. **Confirm the action** in the dialog

4. **Show the result:**
   - Case disappears from dashboard
   - Toast notification confirms closure
   - Freshdesk ticket automatically closed

5. **Verify in Freshdesk** (optional):
   - Show the ticket status changed to "Closed"

**Key Points:**
- One-click case closure from dashboard
- Automatic Freshdesk sync (no manual ticket updates)
- Closed cases filtered from active view
- Full audit trail maintained

---

### Part 5: Action Queue (2 min)

**Show:** Action Queue card on dashboard

1. **Explain action types:**
   - Chase certificate (medical cert needed)
   - Review case (requires attention)
   - Follow up (scheduled callback)

2. **Click an action** to navigate to the case

3. **Show due date indicators:**
   - Overdue (red)
   - Due today/tomorrow (amber)
   - Upcoming (gray)

**Key Points:**
- Proactive task management
- Visual prioritization
- Reduces missed deadlines

---

### Part 6: Employment Capacity Review (2 min)

**Navigate to:** Employment Capacity Review section

1. **Show the workflow stages:**
   - Initial Review
   - Medical Assessment
   - Employer Consultation
   - Final Determination

2. **Explain compliance requirements:**
   - WorkSafe Victoria guidelines
   - Documentation requirements
   - Timeline adherence

**Key Points:**
- Structured workflow for complex cases
- Compliance-first design
- Clear visibility into process status

---

## Technical Highlights

### Architecture
- **Frontend:** React 18 + Vite + TanStack Query
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** Anthropic Claude API integration

### Security
- JWT authentication with 15-min expiry
- CSRF protection on all mutations
- Rate limiting on auth endpoints
- Role-based access control

### Integrations
- **Freshdesk:** Bi-directional ticket sync
- **Claude AI:** Case summarization and insights

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Freshdesk Sync | ✅ Complete | Ingest and sync 151+ cases |
| Case Dashboard | ✅ Complete | Filter, search, view cases |
| Case Detail Panel | ✅ Complete | Full case information view |
| Medical Certificates | ✅ Complete | Track and alert on expiry |
| AI Summaries | ✅ Complete | Claude-powered case insights |
| Action Queue | ✅ Complete | Task prioritization |
| Close Case | ✅ Complete | Close with Freshdesk sync |
| Capacity Review | ✅ Complete | Structured workflow |
| Audit Logging | ✅ Complete | Full activity trail |

---

## Next Steps (Roadmap)

1. **Document Upload** - Attach files to cases
2. **Email Templates** - Send templated communications
3. **Reporting Dashboard** - Analytics and metrics
4. **Mobile Responsive** - Full mobile support
5. **Notification System** - Email/SMS alerts

---

## Q&A

Common questions:

**Q: How often does Freshdesk sync?**
A: Manual sync via admin trigger. Can be scheduled for automatic sync.

**Q: What happens if Freshdesk is unavailable?**
A: Case closes locally, Freshdesk sync retries on next manual sync.

**Q: Can we reopen a closed case?**
A: Not in current MVP. Planned for future release.

**Q: Is data encrypted?**
A: Yes, all connections use HTTPS, passwords are bcrypt hashed.

---

## Contact

For technical questions or demo requests:
- Project: GPNet3 Claims MVP
- Repository: github.com/paulhopcraft-dot/GPNET3
