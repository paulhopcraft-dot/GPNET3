# External Integrations - GPNet3

## Overview
GPNet3 integrates with multiple external services for case management, AI processing, file uploads, webhooks, and email notifications. All integrations are configured via environment variables for security and flexibility.

---

## AI Services

### Anthropic Claude API
**Service:** Claude AI LLM
**SDK Package:** `@anthropic-ai/sdk 0.68.0`
**API Version:** Latest (v1)

**Configuration:**
- **Environment Variable:** `ANTHROPIC_API_KEY`
- **Format:** `sk-ant-api03-xxxxx`
- **Obtain:** https://console.anthropic.com/

**Use Cases:**

1. **Case Chat Assistant** - `/c/dev/gpnet3/server/routes/caseChat.ts`
   - Real-time chat interface for discussing case details
   - API Endpoint: `POST /api/cases/{caseId}/chat`
   - Model: Claude (latest)
   - Context: Case history, clinical notes, certificates

2. **Smart Case Summaries** - `/c/dev/gpnet3/server/services/smartSummary.ts`
   - Generate AI-powered case summaries
   - Analyzes medical records, certificates, treatment plans
   - Output: Structured summary with key insights
   - Error handling for missing API key

3. **Email Draft Generation** - `/c/dev/gpnet3/server/services/emailDraftService.ts`
   - Auto-generate professional email drafts
   - Context: Case information, action items
   - Used for: Care provider communication, employer updates

4. **Employer Dashboard Insights** - `/c/dev/gpnet3/server/routes/employer-dashboard.ts`
   - Generate case summaries for employer view
   - Summarize recovery timelines and workforce impact
   - Simplified language for HR managers

**Integration Points:**
- `/c/dev/gpnet3/server/routes/caseChat.ts` (lines: stream-based chat)
- `/c/dev/gpnet3/server/routes/smartSummary.ts` (structured output)
- `/c/dev/gpnet3/server/routes/emailDrafts.ts` (draft generation)
- `/c/dev/gpnet3/server/routes/employer-dashboard.ts` (insights)

**Error Handling:**
- Graceful fallback if `ANTHROPIC_API_KEY` not set
- Comprehensive error logging in logger.error()
- User-friendly error messages in responses

---

### OpenAI API (Legacy)
**SDK Package:** `openai 6.7.0`
**Status:** Legacy integration (may be replaced by Anthropic)

**Configuration:**
- May be configured via `OPENAI_API_KEY`
- Used for: Text summarization, text generation
- Service: `/c/dev/gpnet3/server/services/llamaSummary.ts`

---

## Case Management

### Freshdesk Integration
**Service:** Freshdesk Help Desk
**API Version:** v2
**Base URL:** `https://{domain}.freshdesk.com/api/v2/`

**Configuration:**
```
FRESHDESK_DOMAIN=your-subdomain     # e.g., "company" from company.freshdesk.com
FRESHDESK_API_KEY=your-api-key      # From Profile Settings > API Key
```

**Service Location:** `/c/dev/gpnet3/server/services/freshdesk.ts` (42KB)

**Capabilities:**

1. **Ticket Management**
   - Create/read/update tickets
   - Track case status changes
   - Attach documents and notes
   - Custom fields for case data

2. **Company Management**
   - Retrieve company information
   - Link companies to cases
   - Company contact details

3. **Contact Management**
   - Worker contact information
   - Communication history
   - Email templates and communication logs

4. **Attachment Handling**
   - Download medical certificates
   - Fetch medical records
   - Parse document metadata
   - Content type validation

**Data Models:**
```typescript
// From freshdesk.ts
interface FreshdeskTicket {
  id: number;
  subject: string;
  description_text: string;
  status: number;
  priority: number;
  custom_fields: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
  attachments?: FreshdeskAttachment[];
}

interface FreshdeskCompany {
  id: number;
  name: string;
}

interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
}
```

**Integration Points:**

1. **Sync Scheduler** - `/c/dev/gpnet3/server/services/syncScheduler.ts`
   - Periodic sync of Freshdesk data
   - Updates case status
   - Syncs new certificates and attachments
   - Scheduled background job

2. **Certificate Source** - `/c/dev/gpnet3/server/routes/actions.ts`, `/c/dev/gpnet3/server/routes/timeline.ts`
   - Certificates marked as `source: "freshdesk"`
   - Distinguishes from manual data entry
   - Default source when not overridden

3. **Webhook Compatibility**
   - Can receive Freshdesk webhooks (future integration)
   - Action triggers based on ticket updates

4. **Logging**
   - Dedicated logger: `logger.freshdesk`
   - Structured logging of all API calls
   - Error tracking and retry logic

**Error Handling:**
- Invalid API credentials raise errors on service initialization
- Network timeouts handled gracefully
- Failed syncs logged but don't block case operations
- Retry logic for transient failures

**Authentication:**
- HTTP Basic Auth (API Key encoded in Authorization header)
- No token refresh needed (stateless)

---

## Form Submissions & Webhooks

### JotForm Integration
**Service:** JotForm (online form builder)
**Webhook Type:** Form submission notifications
**Method:** POST

**Configuration:**
```
WEBHOOK_PASSWORD=secure-password    # Validation password for webhook (in database)
```

**Webhook Handler:** `/c/dev/gpnet3/server/controllers/webhooks.ts`

**Security Layer:** `/c/dev/gpnet3/server/webhookSecurity.ts`

**Supported Form Types:**

1. **Worker Injury Form** - `worker_injury`
   - Submitter information
   - Injury details
   - Date of injury
   - Medical history
   - Maps to: `POST /api/webhooks/jotform`

2. **Medical Certificate Form** - `medical_certificate`
   - Certificate type (medical, psychology, physiotherapy)
   - Work capacity assessment
   - Restrictions/modifications
   - Validity period
   - Attachment: PDF certificate

3. **Return to Work Form** - `return_to_work`
   - RTW date
   - Job role modifications
   - Graduated return schedule
   - Employer confirmation

**Webhook Processing:**
```typescript
// From webhooks.ts
export async function handleJotFormWebhook(req: WebhookRequest, res: Response) {
  const { organizationId, formType } = req.webhookFormMapping;
  const formData = req.body;

  switch (formType) {
    case "worker_injury":
      await handleWorkerInjuryForm(formData, organizationId);
      break;
    case "medical_certificate":
      await handleMedicalCertificateForm(formData, organizationId);
      break;
    case "return_to_work":
      await handleReturnToWorkForm(formData, organizationId);
      break;
  }
}
```

**Security Features:**

1. **Form Mapping Database** - `webhookFormMappings` table
   - Store form ID, password, organization, form type
   - Prevents users from submitting to other organizations
   - Active/inactive status control

2. **Password Validation**
   - Middleware verifies webhook password
   - Only valid form mappings processed
   - Prevents unauthorized submissions

3. **Organization Isolation**
   - organizationId extracted from database (not user input)
   - Each organization has separate webhook URLs
   - Multi-tenant security

**Webhook Flow:**
```
1. Form submitted on JotForm
2. POST to /api/webhooks/jotform
3. Middleware validates:
   - Form ID exists in database
   - Password matches stored value
   - Webhook active flag is true
4. Attach organizationId to request
5. Process form data based on type
6. Update case in database
7. Return success/error response
```

**Webhook Format:**
```
POST /api/webhooks/jotform
Content-Type: application/x-www-form-urlencoded

submissionID=12345&rawRequest={...}&formID=67890&data=...
```

---

## Database & Infrastructure

### PostgreSQL Database
**Type:** Relational Database
**Service:** Self-managed or Neon Database (serverless)
**Connection Method:** Environment variable `DATABASE_URL`

**Connection String Format:**
```
postgresql://user:password@host:port/database
```

**Drivers:**
- **pg** 8.13.1 - Native Node.js driver
- **@neondatabase/serverless** 1.0.2 - Serverless PostgreSQL (optional)

**ORM:** Drizzle ORM 0.39.1 (type-safe schema)

**Key Tables:**
- `workerCases` - Case master records
- `medicalCertificates` - Medical document tracking
- `caseActions` - Action queue and tracking
- `caseComplianceChecks` - Compliance evaluation results
- `complianceRules` - WIRC Act rules
- `webhookFormMappings` - JotForm webhook config
- `notifications` - Notification queue
- `caseDiscussionNotes` - Clinical notes
- `users`, `organizations`, `sessions` - Auth/multi-tenancy

**Connection Pool:**
- Managed by `pg.Pool` from `/c/dev/gpnet3/server/db.ts`
- Environment-based connection string
- Connection pooling for performance

---

## Email & SMTP

### Email Service
**Service:** SMTP-based email sending
**Library:** Nodemailer 7.0.12
**Default Behavior:** Log to console if SMTP not configured

**Configuration:**
```
SMTP_HOST=smtp.example.com          # SMTP server hostname
SMTP_PORT=587                        # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-username              # SMTP username
SMTP_PASS=your-password              # SMTP password
SMTP_SECURE=false                    # Use TLS (true) or STARTTLS (false)
SMTP_FROM=noreply@example.com       # Sender email address
```

**Service Location:** `/c/dev/gpnet3/server/services/emailService.ts`

**Capabilities:**

1. **Email Sending**
   - Support for HTML and plain text
   - Recipient validation
   - Fallback logging in development

2. **Draft Generation**
   - AI-powered email drafts (with Anthropic)
   - Service: `/c/dev/gpnet3/server/services/emailDraftService.ts`

3. **Notification Queue**
   - Service: `/c/dev/gpnet3/server/services/notificationService.ts` (33KB)
   - Queues notifications for processing
   - Scheduler sends at specified times

4. **Certificate Expiry Alerts**
   - Automatic notifications when certificates expire
   - Configurable time windows (7, 14, 30 days before)
   - Action creation for follow-up

5. **Overdue Action Reminders**
   - Automatic reminders for overdue actions
   - Configurable frequency
   - Auto-completion of obsolete actions

**Email Templates:** Dynamically generated based on context

**Notification Queue Table:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  type TEXT,              -- 'certificate_expiry', 'action_overdue', etc.
  priority TEXT,          -- 'critical', 'high', 'medium', 'low'
  organizationId TEXT,
  recipientEmail TEXT,
  subject TEXT,
  bodyHtml TEXT,
  status TEXT,            -- 'pending', 'sent', 'failed'
  createdAt TIMESTAMP,
  sentAt TIMESTAMP
);
```

**Notification Scheduler:** `/c/dev/gpnet3/server/services/notificationScheduler.ts`
- Runs on configurable schedule
- Feature flag: `ENABLE_NOTIFICATIONS` (default: false)
- Default organization: `DEFAULT_ORGANIZATION_ID`

---

## File Storage & Processing

### File Upload
**Middleware:** Multer 2.0.2
**Storage:** Local filesystem in `/c/dev/gpnet3/public/uploads/`
**Configuration:** `/c/dev/gpnet3/server/services/fileUpload.ts`

**Supported Files:**
- PDFs (medical certificates, reports)
- Images (company logos, certificates)
- Documents (medical records, correspondence)

**Processing:**
1. **Image Processing** - Sharp 0.34.5
   - Thumbnail generation
   - Resizing
   - Format conversion
   - Metadata extraction

2. **PDF Processing** - Puppeteer 24.35.0
   - PDF generation from HTML
   - Used for: Report exports, certificate formatting
   - Service: `/c/dev/gpnet3/server/services/pdfProcessor.ts`

**Endpoints:**
```
POST /api/upload               # Upload file
GET /uploads/{filename}        # Download file
```

---

## Real-Time Communication

### WebSockets
**Package:** ws 8.18.3
**Use Cases:**
- Live updates to case status
- Real-time chat notifications
- Dashboard refresh triggers
- Notification push events

**Configuration:**
- Integrated with Express server
- Supported on port 5000 (same as API)
- Message routing by case ID or organization

---

## Rate Limiting & DDoS Protection

### Express Rate Limiter
**Package:** express-rate-limit 8.2.1

**Configuration:**

1. **General API Rate Limit**
   - 100 requests per 15 minutes
   - Applied to `/api/*` routes
   - Excludes: login, register, webhooks, health checks
   - From: `/c/dev/gpnet3/server/index.ts` line 64

2. **Authentication Rate Limit** (Currently Disabled for Testing)
   - 5 attempts per 15 minutes (when enabled)
   - Applied to: `/api/auth/login`, `/api/auth/register`
   - Note: Disabled in `/c/dev/gpnet3/server/index.ts` lines 67-69
   - Reason: Compliance system testing

**Headers:**
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Reset timestamp

---

## Security & Compliance

### Helmet Security Headers
**Package:** helmet 8.1.0

**Headers Set:**
- Content-Security-Policy
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Strict-Transport-Security (HSTS)
- X-XSS-Protection
- Referrer-Policy

**Configuration:** `/c/dev/gpnet3/server/middleware/security.ts`

### CORS (Cross-Origin Resource Sharing)
**Package:** cors 2.8.5
**Configuration:**
```javascript
cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,  // Allow cookies
})
```
**Allowed Origins:**
- Default: `http://localhost:5173` (dev frontend)
- Production: `CLIENT_URL` environment variable

### CSRF Protection
**Package:** csrf-csrf 4.0.3
**Implementation:** Token-based CSRF protection
- Endpoint: `GET /api/csrf-token` (returns token)
- Required for: POST, PUT, DELETE requests
- Skipped for: Login, register, webhooks, health checks
- From: `/c/dev/gpnet3/server/middleware/security.ts`

---

## Authentication & Authorization

### Session Management
**Framework:** Express-Session 1.18.1
**Store:** PostgreSQL (via connect-pg-simple 10.0.0)

**Session Configuration:**
- Cookie-based sessions
- PostgreSQL session persistence
- Secure cookies in production
- HTTP-only flag enabled

**Session Table:**
```sql
CREATE TABLE session (
  sid VARCHAR PRIMARY KEY,
  sess JSONB,
  expire TIMESTAMP
);
```

### JWT (JSON Web Tokens)
**Package:** jsonwebtoken 9.0.2
**Use Case:** Optional token-based auth for API clients
**Configuration:**
```
JWT_SECRET=your-secret-key (min 32 characters)
```

### Password Security
**Package:** bcrypt 6.0.0
**Configuration:**
- Salt rounds: 10 (default)
- Used for: User password hashing
- From: `/c/dev/gpnet3/server/controllers/auth.ts`

---

## Data Validation

### Zod Schema Validation
**Package:** zod 3.25.76
**Integration:** drizzle-zod 0.7.0

**Validation Layers:**
1. **Database Schema** - `/c/dev/gpnet3/shared/schema.ts`
   - Drizzle schemas define table structure
   - Auto-generate Zod validators
   - Type-safe database queries

2. **API Request Validation**
   - Validate incoming JSON payloads
   - Middleware validates forms
   - Error responses for invalid data

3. **Environment Variables**
   - Validate `.env` on startup
   - Fail-closed if required vars missing
   - From: `/c/dev/gpnet3/server/middleware/security.ts`

**Type Safety:**
- Full TypeScript integration
- Compile-time type checking
- Runtime schema validation

---

## Logging & Monitoring

### Structured Logging
**Service:** `/c/dev/gpnet3/server/lib/logger.ts`

**Logger Categories:**
- `logger.api` - API request/response logs
- `logger.auth` - Authentication events
- `logger.webhook` - Webhook processing
- `logger.freshdesk` - Freshdesk API calls
- `logger.email` - Email sending logs
- `logger.notification` - Notification service
- `logger.compliance` - Compliance checks
- `logger.error` - Error tracking

**Log Levels:**
- debug - Detailed debugging
- info - General information
- warn - Warning conditions
- error - Error conditions

**Structured Context:**
- Timestamp
- User ID
- Organization ID
- Case ID
- Request ID
- Error stack traces

---

## Data Processing & Extraction

### Injury Date Extraction
**Service:** `/c/dev/gpnet3/server/services/injuryDateExtraction.ts` (17KB)
**Purpose:** Extract injury dates from medical records
**AI Integration:** Uses Anthropic Claude for document analysis

### Treatment Plan Generation
**Service:** `/c/dev/gpnet3/server/services/treatmentPlanService.ts`
**Features:**
- AI-powered treatment plan generation
- Clinical milestone tracking
- Recovery timeline estimation
- Success criteria definition

### Compliance Engine
**Service:** `/c/dev/gpnet3/server/services/complianceEngine.ts` (25KB)
**Features:**
- Evaluate cases against WIRC Act rules
- WorkSafe Claims Manual compliance
- Generate compliance reports
- Rule-based scoring system

---

## Scheduling & Background Jobs

### Node-Cron
**Package:** node-cron 4.2.1

**Scheduled Tasks:**

1. **Notification Scheduler**
   - Service: `/c/dev/gpnet3/server/services/notificationScheduler.ts`
   - Frequency: Configurable (default: daily)
   - Tasks: Send certificate alerts, action reminders
   - Control: `ENABLE_NOTIFICATIONS` flag

2. **Sync Scheduler**
   - Service: `/c/dev/gpnet3/server/services/syncScheduler.ts`
   - Frequency: Periodic sync
   - Tasks: Sync Freshdesk data, update case status
   - Handles: Tickets, companies, contacts, attachments

3. **Compliance Scheduler**
   - Service: `/c/dev/gpnet3/server/services/complianceScheduler.ts`
   - Frequency: Configurable
   - Tasks: Evaluate cases, generate compliance reports
   - Stores: Results in caseComplianceChecks table

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/csrf-token` | GET | Get CSRF token |
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/cases` | GET/POST | List/create cases |
| `/api/cases/{id}` | GET/PUT/DELETE | Case operations |
| `/api/cases/{id}/chat` | POST | Chat with AI assistant |
| `/api/cases/{id}/summary` | GET/POST | Case summaries |
| `/api/cases/{id}/timeline` | GET | Treatment timeline |
| `/api/certificates` | GET/POST | Certificate management |
| `/api/actions` | GET/POST | Action queue |
| `/api/compliance` | GET | Compliance reports |
| `/api/webhooks/jotform` | POST | JotForm submissions |
| `/api/email/drafts` | POST | Generate email drafts |
| `/api/notifications` | GET/POST | Notification management |

---

## Environment Checklist for Production

- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `ANTHROPIC_API_KEY` - Claude API key
- [ ] `FRESHDESK_DOMAIN` - Freshdesk subdomain
- [ ] `FRESHDESK_API_KEY` - Freshdesk API key
- [ ] `JWT_SECRET` - JWT signing key (32+ chars)
- [ ] `SESSION_SECRET` - Session secret (32+ chars)
- [ ] `CLIENT_URL` - Frontend domain
- [ ] `API_URL` - API domain for webhooks
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- [ ] `SMTP_FROM` - Sender email address
- [ ] `ENABLE_NOTIFICATIONS` - Feature flag for notifications
- [ ] `NODE_ENV=production` - Production mode

---

**Last Updated:** January 25, 2026
**Integration Analysis:** Complete external service audit
