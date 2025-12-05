# GPNet Architecture & Security

## 1. Technology Stack

### 1.1 Backend

- Language: TypeScript
- Runtime: Node.js
- Framework: Express
- ORM / DB Layer: Drizzle (or Prisma-style; relational abstraction)
- Database: PostgreSQL
- Testing: Vitest + supertest (backend), plus React Testing Library for frontend
- Job processing (future): simple in-process queue; can be upgraded to real queue

### 1.2 Frontend

- Framework: React (with Vite)
- Language: TypeScript
- State & Data:
  - React Query (for API calls)
  - React Context (for Auth)
- Styling: Tailwind + shadcn/ui style components (clean, dark theme)
- Routing: React Router or equivalent

### 1.3 Infrastructure

- Environments: Local / Dev / Staging / Prod
- Config via environment variables:
  - DATABASE_URL
  - JWT_SECRET
  - CSRF_SECRET / SESSION_SECRET
  - SMTP_* (for future email sending)
  - FRESHDESK_* (for integration)
  - JOTFORM_* or generic webhook secrets
- Migrations: `drizzle:migrate`
- Dev commands:
  - `npm run dev` → backend + frontend
  - `npm run dev:server`, `npm run dev:client` if split
  - `npm run test` → all tests

---

## 2. Backend Architecture

### 2.1 Layering

- `server/index.ts` – Express bootstrapping
- `server/routes.ts` – registers routes
- `server/controllers/*` – HTTP handlers
- `server/storage.ts` – DbStorage implementing IStorage interface
- `shared/schema.ts` – Drizzle schema & TS types
- `server/middleware/*` – auth, security, logging
- `server/services/*` – domain logic (e.g. certificates, compliance, Freshdesk, etc.)

### 2.2 Data Model – Core Entities

**Organisation**

- id
- name, ABN
- default timezone / region
- data retention policy (link to data_retention_policy)

**User**

- id, email, password_hash
- role: admin | employer | clinician | insurer | consultant
- organization_id (FK)
- createdAt, updatedAt

**UserInvite**

- id
- email
- organization_id
- role
- token (secure, random string)
- expiresAt
- usedAt

**Worker**

- id
- firstName, lastName
- dateOfBirth (optional)
- contact details (email, phone)
- employment details (position, host site, etc.)
- organization_id

**Case (WorkerCase)**

- id
- worker_id (FK)
- organization_id
- type: injury | mental_health | general | pre_employment | exit
- status: open | monitoring | closed | paused | escalated
- risk_level: low | medium | high
- createdAt, updatedAt
- termination_process_id (optional)

**Certificate**

- id
- case_id, worker_id
- source: email | upload | webhook
- issueDate
- startDate
- endDate
- reviewDate (optional)
- capacity: fit | restricted | unfit | unknown
- restrictions_text (free text)
- parsed_fields (JSONB – structured extraction)
- document_id (FK to Document)

**Document / Attachment**

- id
- case_id, worker_id
- filename, mimetype, size
- storage_location (e.g. S3 path)
- type: certificate | clinical_report | form | other
- createdAt

**EmailMessage / Ticket**

- id
- case_id (nullable if not yet linked)
- from, to, subject
- body (or text-only storage)
- provider: freshdesk | direct
- provider_message_id
- createdAt
- is_inbound (boolean)

**TimelineEvent**

- id
- case_id
- eventType: certificate_added | discussion_note | attachment_uploaded | termination_milestone | case_status_change | case_created | (future: compliance_changed, action_created, summary_generated)
- title
- description
- timestamp
- severity: info | warning | critical
- meta (JSONB)

**Action**

- id
- case_id
- type: chase_certificate | worker_checkin | host_followup | investigation | other
- status: pending | done | cancelled
- dueDate
- priority: low | normal | high
- createdAt, updatedAt

**ComplianceSnapshot / Flags**

- case_id
- has_certificate (bool)
- certificate_status: none | valid | expiring_soon | expired
- last_checked_at
- (can be computed on the fly or persisted)

**WebhookFormMapping**

- formId
- organization_id
- form_type (worker_injury, etc.)
- webhookPassword (hashed or encrypted)
- active (bool)
- createdAt

**Security & Audit**

- `security_audit_log` – records critical security events
- `failed_login_attempts` – per IP/email tracking
- `refresh_tokens` – for future token rotation
- `webhook_secrets`, `data_retention_policy` – config tables

---

## 3. Authentication & Identity

### 3.1 Auth Flow

- Login: `POST /api/auth/login`
  - Body: `{ email, password }`
  - On success:
    - `{ success, message, data: { user, accessToken } }`
    - accessToken = JWT (HS256) with ~15min expiry
- Frontend:
  - Stores token in memory + localStorage
  - Attaches `Authorization: Bearer <token>` header on all protected API calls

### 3.2 /me

- `GET /api/auth/me`
  - Requires `Authorization: Bearer <token>`
  - Returns `{ success, data: { user } }`
  - Used on app startup to restore session

### 3.3 Logout

- `POST /api/auth/logout`
  - Stateless (client discards token)
  - Future: may track invalidated tokens if needed

### 3.4 Invite-Based Registration

- No open registration.

**Invite creation**

- `POST /api/admin/invites`
  - Auth: admin
  - Body: `{ email, role, organizationId }`
  - Stores record with secure token & expiry
  - Returns token in response (in prod: only emailed)

**Registration**

- `POST /api/auth/register`
  - Body: `{ email, password, inviteToken }`
  - Validates:
    - invite exists and not expired
    - invite matches email
  - Creates user:
    - organization_id and role from invite (NOT from request body)
  - Returns user + accessToken

**Guarantees**

- No way to register without a valid invite.
- No path to inject own organization_id or role.
- All invites created by authenticated admins.

---

## 4. Security Model

### 4.1 CSRF Protection

Backend:

- Middleware: `csrf-csrf` (double submit cookie pattern)
- Cookie: `x-csrf-token` (httpOnly, SameSite=strict)
- Header: `X-CSRF-Token` (case-insensitive)
- Token endpoint:
  - `GET /api/csrf-token` → `{ success: true, data: { csrfToken } }`
- CSRF-protected routes:
  - All state-changing routes (POST/PUT/PATCH/DELETE) except:
    - `/api/auth/login`
    - `/api/auth/register`
    - `/api/webhooks/*`
    - `/api/health`, `/health`
    - `/api/csrf-token`

Frontend:

- On app start (or before first mutation):
  - Fetch `/api/csrf-token` with `credentials: 'include'`
  - Store token in a CSRF helper / React context
- For all mutating requests:
  - Add header: `X-CSRF-Token: <csrfToken>`

### 4.2 Rate Limiting

- Library: `express-rate-limit`
- General API:
  - 100 requests per 15 minutes per IP
- Auth endpoints:
  - 5 failed attempts per 15 minutes per IP
  - `skipSuccessfulRequests: true`
- Webhooks:
  - `/api/webhooks/jotform` → 60 requests per minute per IP
- Health endpoints:
  - Excluded from limiting

Responses when exceeded:

- `429 Too Many Requests`
- JSON body: `{ error: "Too Many Requests", message, retryAfter }`
- Headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### 4.3 Webhook Authentication (JotForm etc.)

- Endpoint: `POST /api/webhooks/jotform`
- Requirements:
  - `formID` in body
  - password in:
    - `?webhook_password=` query param OR
    - `x-webhook-password` header
- Flow:
  - Look up form mapping in `webhook_form_mappings` by `formId`
  - If no mapping → 404
  - Compare provided password with stored secret using `crypto.timingSafeEqual`
  - If mismatch → 401
  - If mapping inactive → 403
  - If DB error → 503 (fail-closed)
- On success:
  - Derive `organizationId` from mapping (NOT from request body)
  - Parse JotForm submission and create/update worker + case

All unexpected errors return 503, blocking unauthenticated requests.

### 4.4 HTTP Security Headers

- Implemented via `helmet` with:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-DNS-Prefetch-Control: off`
  - `Content-Security-Policy`: locked to `'self'` in prod
    - In dev, allows `ws://localhost:*` + `http://localhost:*` for Vite

### 4.5 Dev Bypasses

- No `NODE_ENV === 'development'` auth bypasses
- No fake user injection
- No fail-open error handling
- Only dev-specific config is CSP relaxations for Vite websocket.

---

## 5. Observability & Audit

### 5.1 Logging

- Application logs for:
  - Auth failures
  - Webhook validation failures
  - CSRF errors
  - Rate limiting hits
  - Processing pipeline errors

### 5.2 Security Audit Log

- `security_audit_log` table persists:
  - Key security events (failed logins, invite creation, webhook anomalies)
  - Who did it, IP, user agent, timestamp

### 5.3 Metrics (future)

- Endpoint `/metrics` (for Prometheus or similar):
  - Number of open cases
  - Webhook processing counts
  - Error rates
  - Job queue depth

---

## 6. Deployment & Environments

### 6.1 Configuration

- `.env` (local), env vars in hosting platform for non-local.
- Separate DBs per environment.

### 6.2 Build & Run

- `npm run build` → builds frontend + backend
- `npm run start` → production server

### 6.3 Backups & DR

- Nightly PG dump
- Restore tested on staging
- Documented procedure: `DB_BACKUP_RESTORE.md`

This file gives a dev team everything they need about GPNet's architecture & security posture.
