# Preventli (GPNet3) Architecture Documentation

## System Overview

Preventli is a full-stack workers compensation management platform built with Express.js, React, TypeScript, Vite, and PostgreSQL. The system manages injury cases, recovery timelines, treatment plans, compliance tracking, and multi-stakeholder workflows for workers compensation insurers and employers.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router
- **Backend:** Express.js + TypeScript + Node.js
- **Database:** PostgreSQL + Drizzle ORM
- **Testing:** Vitest (unit), Playwright (E2E)
- **AI Integration:** Anthropic Claude API, OpenAI API
- **External APIs:** Freshdesk (ticket integration), Pinecone (vector search)

---

## Architectural Layers

### 1. Presentation Layer (Client)

**Location:** `./client/src/`

**Responsibilities:**
- User interface rendering with role-based access (Insurer, Employer, Admin)
- Case management dashboards and detail views
- Treatment plan visualization and interaction
- Certificate and compliance reporting
- Real-time notifications and alerts

**Key Entry Points:**
- `./client/src/main.tsx` - React application bootstrap
- `./client/src/App.tsx` - Main router and auth guard setup
- `./client/src/pages/` - Route-level page components (28+ pages)

**Component Organization:**
```
client/src/
├── pages/                      # Route-level page components
│   ├── admin/                 # Admin-only pages
│   ├── CasesPage.tsx          # Case list and filtering
│   ├── CaseSummaryPage.tsx    # Case detail view
│   ├── RTWPlannerPage.tsx     # Return-to-work planning
│   ├── PredictionsPage.tsx    # AI predictions dashboard
│   └── EmployerCaseDetailPage.tsx
├── components/                # Reusable UI components (70+ files)
│   ├── admin/                 # Admin-specific components
│   ├── ui/                    # Base shadcn/ui components
│   ├── CaseDetailPanel.tsx    # Case metadata display
│   ├── ComplianceDashboardWidget.tsx
│   ├── DynamicRecoveryTimeline.tsx
│   └── ...
├── contexts/                  # React Context API
│   └── AuthContext.tsx        # Authentication state + role management
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts             # Auth context consumer
│   └── use-toast.ts           # Toast notification hook
├── lib/                       # Client utilities
│   ├── queryClient.ts         # TanStack Query (React Query) setup + CSRF
│   ├── dateUtils.ts           # Date manipulation helpers
│   └── utils.ts               # General utilities
└── assets/                    # Static files (icons, logos)
```

**Styling:** Tailwind CSS + custom CSS, configured in `./client/tailwind.config.ts`

**Key Features:**
- Lazy-loaded pages with React.lazy() for code splitting
- TanStack Query for server state management
- React Hook Form for form validation
- React Router v7 for client-side routing
- CSRF token management via queryClient initialization

---

### 2. API Gateway & Routing Layer

**Location:** `./server/index.ts`, `./server/routes.ts`, `./server/routes/*.ts`

**Responsibilities:**
- HTTP request handling and response serialization
- Route registration and middleware composition
- CORS, security headers (Helmet), rate limiting
- CSRF protection with token generation
- Request logging and error handling

**Architecture Pattern:** Modular route handlers organized by domain

**Security Middleware Stack (in order):**
1. Helmet (security headers)
2. CORS (cross-origin requests)
3. Express.json() with rawBody capture (webhook verification)
4. Cookie parser (CSRF token management)
5. Rate limiting (100 req/15min general, 5 req/15min auth-disabled for testing)
6. CSRF token endpoint `/api/csrf-token`
7. CSRF protection (conditional - skips login, register, webhooks)
8. Request logging middleware
9. Route handlers
10. CSRF error handler
11. Global error handler

**Main Route Groups:**
```typescript
// server/routes.ts defines:
/api/auth              -> authentication flows
/api/termination       -> employee termination workflows
/api/admin/invites     -> admin invite management
/api/admin/organizations -> org admin features
/api/admin/insurers    -> insurer management
/api/organization      -> self-service org settings
/api/webhooks          -> password-protected Freshdesk sync
/api/certificates      -> certificate engine v1
/api/actions           -> action queue v1
/api/cases             -> smart summary, case chat, RTW, predictions, contacts
/api/rtw               -> return-to-work plan routes
/api/predictions       -> AI prediction engine
/api/employer          -> employer dashboard
/api/compliance/dashboard -> compliance reporting
/api/notifications     -> notification scheduler (admin)
/api/emailDrafts       -> email draft generation
```

**Core Route Files:**
- `./server/routes/auth.ts` - Login, register, password reset (JWT-based)
- `./server/routes/smartSummary.ts` - Dynamic case summaries (AI + rules-based)
- `./server/routes/actions.ts` - Action queue management
- `./server/routes/rtw.ts` - Return-to-work plan CRUD + compliance
- `./server/routes/predictions.ts` - Recovery timeline predictions
- `./server/routes/timeline.ts` - Recovery estimator
- `./server/routes/treatmentPlan.ts` - Treatment plan generation
- `./server/routes/certificates.ts` - Work capacity certificate processing
- `./server/routes/compliance-dashboard.ts` - Compliance metrics reporting
- `./server/routes/employer-dashboard.ts` - Employer-specific views
- `./server/routes/caseChat.ts` - Case discussion/notes
- `./server/routes/contacts.ts` - Case contact management
- `./server/routes/emailDrafts.ts` - AI-generated email templates

---

### 3. Middleware Layer

**Location:** `./server/middleware/`

**Components:**

1. **`./server/middleware/security.ts`** (1000+ lines)
   - CSRF protection with token generation/validation
   - Helmet configuration
   - Rate limiters (general + auth-specific)
   - Security environment validation
   - Cookie parser setup
   - CSRF error handler

2. **`./server/middleware/auth.ts`**
   - JWT token verification
   - Session validation
   - Exports `authorize()` middleware factory
   - Integrates with database for user lookup

3. **`./server/middleware/caseOwnership.ts`**
   - Case ownership verification
   - Ensures user can access specific case data
   - Works with JWT auth context

---

### 4. Service Layer (Business Logic)

**Location:** `./server/services/` (39 service files, 600+ KB)

**Core Services:**

1. **AI & Intelligence Engine**
   - `summary.ts` - Dynamic case summaries (multi-model strategy)
   - `smartSummary.ts` - Hybrid summary generation (rule + AI)
   - `llamaSummary.ts` - Llama model integration
   - `hybridSummary.ts` - Hybrid summary service wrapper
   - `treatmentPlanService.ts` - AI-generated treatment plans
   - `recoveryEstimator.ts` (59KB) - Timeline predictions using injury data
   - `predictionEngine.ts` - Recovery outcome predictions
   - `aiInjuryDateService.ts` - Injury date extraction from documents
   - `injuryDateExtraction.ts` - Advanced injury date parsing

2. **Compliance & Evidence**
   - `complianceEngine.ts` (25KB) - Compliance rules evaluation
   - `clinicalEvidence.ts` - Evidence assessment
   - `clinicalActions.ts` - Action recommendations
   - `certificateCompliance.ts` - Certificate validation
   - `certificateService.ts` - Certificate pipeline
   - `certificatePipeline.ts` - Multi-step certificate processing
   - `complianceScheduler.ts` - Daily compliance checks (cron-based)

3. **Notifications & Communication**
   - `notificationScheduler.ts` - Scheduler orchestration
   - `notificationService.ts` (33KB) - Multi-channel notifications
   - `emailService.ts` - Email sending
   - `emailDraftService.ts` - AI-generated email templates
   - `syncScheduler.ts` - Scheduled Freshdesk syncs

4. **External Integrations**
   - `freshdesk.ts` (42KB) - Freshdesk API sync
   - `transcripts/` - Transcript ingestion module

5. **Data Management**
   - `auditLogger.ts` - Audit trail tracking
   - `passwordResetService.ts` - Password reset flows
   - `refreshTokenService.ts` - JWT refresh token management
   - `fileUpload.ts` - File upload handling

6. **RTW & Termination**
   - `rtwCompliance.ts` - Return-to-work compliance
   - `termination.ts` (22KB) - Employee termination workflows

7. **Testing & Utilities**
   - Multiple `.test.ts` files for unit tests (Vitest)

**Data Flow for Services:**
```
Request → Route Handler → Service Layer → Storage/Database → Response
                              ↓
                        Logging + Audit
```

---

### 5. Data Access Layer

**Location:** `./server/storage.ts` (2436 lines)

**Responsibilities:**
- In-memory cache + database abstraction
- CRUD operations for all entities
- Query optimization and caching
- Type-safe database operations via Drizzle

**Key Features:**
- Drizzle ORM integration with PostgreSQL
- Export const namespace containing 100+ storage methods
- Transactional operations
- Query result caching for performance
- Full TypeScript type safety with Zod validation

**Storage Methods Categories:**
- User & authentication management
- Case lifecycle management
- Treatment plan CRUD
- Action queue management
- Certificate management
- Contact/communication management
- Notification tracking
- Compliance status updates
- RTW plan management
- Timeline/prediction storage

---

### 6. Database Layer

**Location:** `./shared/schema.ts` (1546 lines), `./migrations/`

**Database:** PostgreSQL with Drizzle ORM

**Configuration:**
- `./drizzle.config.ts` - Drizzle kit setup
- `./server/db.ts` - Database connection pool
- `./migrations/` - Generated SQL migrations

**Core Entity Tables:**
1. **Users & Sessions**
   - `users` - User accounts with roles (admin, insurer_user, employer_user, case_manager)
   - `sessions` - Session management

2. **Cases**
   - `cases` - Main case entity (work injury claim)
   - Related: work status, risk level, compliance indicator

3. **Medical & Clinical**
   - `certificates` - Work capacity certificates
   - `treatmentPlans` - AI-generated treatment plans
   - `specialistReports` - Specialist assessment summaries
   - `medicalConstraints` - Work restrictions

4. **Recovery & RTW**
   - `rtwPlans` - Return-to-work plans
   - `recoveryTimelines` - Predicted recovery stages
   - `checkIns` - Worker progress updates

5. **Actions & Workflows**
   - `actions` - Action queue for case managers
   - `actionHistory` - Audit trail

6. **Notifications & Communications**
   - `notifications` - System notifications
   - `emailDrafts` - Generated email templates
   - `caseChat` - Discussion threads

7. **Compliance & Audit**
   - `complianceReports` - Compliance status tracking
   - `auditLog` - Audit trail
   - `contacts` - Case-related contacts

8. **Organizations**
   - `organizations` - Insurer/employer organizations
   - `organizationUsers` - User-org relationships

**Schema Patterns:**
- Timestamps: `createdAt`, `updatedAt` (PostgreSQL timestamps)
- JSON fields: `jsonb` for flexible data (constraints, reports, metadata)
- Enums: TypeScript unions + Zod types
- Relations: Foreign keys with cascade rules

---

### 7. Shared Types & Validation

**Location:** `./shared/schema.ts`, `./shared/complianceColors.ts`

**Exports:**
- Database schema definitions (Drizzle pgTable)
- TypeScript interfaces for domain models
- Zod validators via `drizzle-zod`
- Enum definitions (RiskLevel, WorkStatus, ComplianceStatus, etc.)
- Type aliases for discriminated unions

**Key Interfaces:**
```typescript
// Medical
MedicalConstraints
FunctionalCapacity
TreatmentPlan
SpecialistReportSummary

// Clinical
CaseClinicalStatus
ClinicalEvidenceEvaluation
ClinicalEvidenceFlag

// RTW
RTWPlan
RTWPlanStatus (enum)

// Compliance
ComplianceStatus (enum)
ComplianceIndicator (enum)

// Actions
ClinicalActionRecommendation
ActionQueue
ActionTarget (enum)

// Case & Timeline
RecoveryTimelineSummary
CaseDetail
```

---

## Data Flow Patterns

### 1. Case Summary Generation Flow
```
Client Request (GET /api/cases/:id/summary)
    ↓
Route Handler (smartSummary.ts)
    ↓
Service Layer
├── SmartSummaryService (hybrid approach)
├── SummaryService (AI fallback)
└── TemplateService (template fallback)
    ↓
Database Query (storage.ts)
    ↓
Cache Check + Return
    ↓
Response to Client
```

### 2. Treatment Plan Generation Flow
```
Client Request (POST /api/cases/:id/treatment-plan)
    ↓
Route Handler (treatmentPlan.ts)
    ↓
TreatmentPlanService
├── Fetch case data
├── Call Anthropic API (Claude)
├── Validate response
└── Store in database
    ↓
Response with generated plan
```

### 3. Compliance Evaluation Flow
```
Cron Job (complianceScheduler)
    ↓
ComplianceEngine.evaluateCase()
├── Check evidence (certificates, plans, etc.)
├── Apply business rules
└── Generate compliance status
    ↓
Storage.updateComplianceStatus()
    ↓
NotificationService (if status changed)
```

### 4. RTW Plan Validation Flow
```
Client Request (POST /api/cases/:id/rtw)
    ↓
Route Handler (rtw.ts)
    ↓
RTWCompliance.validatePlan()
├── Check case readiness
├── Verify medical constraints
└── Evaluate timeline
    ↓
Storage.updateRTWPlan()
    ↓
ComplianceScheduler (triggered if applicable)
    ↓
Response + notifications
```

---

## Authentication & Authorization

**Flow:**
1. User submits login credentials (email/password)
2. Server validates against bcrypt hash
3. JWT token generated (Express-session + JWT hybrid)
4. Token stored in HttpOnly cookie
5. Subsequent requests validated via `authorize()` middleware
6. Role-based access control (RBAC) applied at route level

**Token Structure:**
- JWT payload includes: `userId`, `role`, `organizationId`
- Refresh token mechanism via `refreshTokenService.ts`
- Session timeout + renewal

**Protected Routes:**
- All `/api/cases/*` require `authorize` middleware
- Admin routes (`/api/admin/*`) require admin role check
- Employer routes check organization ownership

---

## External Integrations

### 1. Freshdesk API
**Service:** `./server/services/freshdesk.ts` (42KB)

**Purpose:**
- Bidirectional sync of tickets with cases
- Ticket status -> case action tracking
- Case updates -> ticket comments

**Trigger:** Manual endpoint + `syncScheduler` cron job

### 2. Anthropic Claude API
**Services:**
- `treatmentPlanService.ts` - Treatment plan generation
- `emailDraftService.ts` - Email template generation
- `summary.ts` - Case summary generation

**Model:** claude-3.5-sonnet (configurable)

**Request Patterns:**
- System prompts with context
- Multi-turn conversations
- Structured output parsing

### 3. OpenAI API
**Service:** `llamaSummary.ts`

**Purpose:** Alternative summarization (fallback if Claude unavailable)

### 4. Pinecone Vector Database
**Package:** `@pinecone-database/pinecone`

**Purpose:** AI-powered semantic search (future feature - infrastructure ready)

---

## Scheduling & Background Jobs

**Architecture:** Node cron + Scheduler classes

**Schedulers:**
1. **NotificationScheduler** (`notificationScheduler.ts`)
   - Managed by `NotificationService`
   - Controlled via `ENABLE_NOTIFICATIONS` env var

2. **SyncScheduler** (`syncScheduler.ts`)
   - Daily Freshdesk sync
   - Cron: Configurable time (default 18:00)
   - Controlled via `DAILY_SYNC_ENABLED` env var

3. **ComplianceScheduler** (`complianceScheduler.ts`)
   - Daily compliance checks
   - Cron: Configurable time (default 06:00)
   - Controlled via `COMPLIANCE_CHECK_ENABLED` env var

4. **TranscriptIngestionModule** (`services/transcripts/`)
   - Manages transcript pipeline startup/shutdown

**Lifecycle Management:**
- Start/stop via server startup
- Graceful shutdown on SIGINT/SIGTERM
- Error handling per scheduler

---

## Key Features by Layer

### Frontend Features
- Multi-role dashboard (Insurer, Employer, Admin)
- Case management with advanced filtering
- Interactive treatment plan timeline
- Real-time progress rings (RTW visual indicators)
- Email draft generation with AI
- Certificate review workflow
- Compliance dashboard with heatmap
- Action queue management
- Admin tools (organization, insurer management)

### Backend Features
- AI-powered case summarization (multi-strategy fallback)
- Injury date extraction from unstructured text
- Treatment plan generation with confidence scores
- Recovery timeline prediction with confidence intervals
- Compliance rule engine with evidence tracking
- Return-to-work plan validation
- Multi-channel notification system
- Certificate lifecycle management
- Freshdesk integration with two-way sync
- Audit logging for compliance
- Role-based access control

### Database Features
- JSONB columns for flexible schema
- Full-text search on case notes
- Temporal queries (date range filtering)
- Transactional operations
- Referential integrity via foreign keys

---

## Error Handling & Logging

**Logging Strategy:**
- Service-level loggers via `createLogger()` factory
- Log levels: error, warning, info, debug
- Request/response logging in Express middleware
- Structured logging with context (duration, status, metadata)

**Logger Namespaces:**
- `server` - Server startup/shutdown
- `api` - API request/response
- `notification` - Notification system
- `sync` - Freshdesk sync
- `compliance` - Compliance checks
- Routes logger - Route-specific logging

**Error Handling:**
- Try/catch in service layer
- Status code mapping to HTTP responses
- Global error handler in Express middleware
- CSRF error handler with custom middleware
- Request validation via Zod

---

## Entry Points

### Application Bootstrap
1. **Server:** `./server/index.ts` (173 lines)
   - Express app initialization
   - Middleware registration
   - Route registration via `registerRoutes()`
   - Scheduler startup
   - Graceful shutdown handlers

2. **Client:** `./client/src/main.tsx`
   - React app mount
   - Router setup
   - Query client provider

### Configuration
- Environment variables loaded via `dotenv` (.env file)
- Drizzle Kit configuration: `./drizzle.config.ts`
- Vite configuration: `./vite.config.ts`, `./vite.config.js`
- TypeScript configuration: `./tsconfig.json`, `./tsconfig.server.json`

---

## Build & Deployment

**Development:**
```bash
npm run dev              # Start both server + client
npm run dev:server      # Server only
npm run dev:client      # Client only
```

**Production:**
```bash
npm run build           # Compile TypeScript + bundle client
npm start               # Run compiled server with production client
```

**Database:**
```bash
npm run db:push         # Apply Drizzle migrations
npm run seed            # Seed initial data
```

---

## Performance Considerations

1. **Code Splitting:** Lazy-loaded pages in React
2. **Caching:** In-memory cache in storage.ts
3. **Database:** Indexed columns for common queries
4. **Rate Limiting:** Prevents abuse and DoS
5. **CSRF Protection:** Token validation on state-changing requests
6. **Connection Pooling:** PostgreSQL pool configuration
7. **Error Recovery:** Graceful degradation + fallback strategies

---

## Security Model

**Defense Layers:**
1. HTTPS/TLS (in production)
2. CSRF token validation (double-submit pattern)
3. JWT-based authentication
4. Bcrypt password hashing
5. Rate limiting (brute force protection)
6. Security headers via Helmet
7. CORS whitelist
8. SQL injection prevention (Drizzle ORM parameterized queries)
9. XSS prevention (React escaping)
10. Audit logging

**Fail-Closed Design:**
- Critical env vars validated on startup
- Webhook authentication via password
- Missing CSRF token rejects request
- Invalid JWT rejects request

---

## Testing Strategy

**Unit Tests:** Vitest
- Service layer tests (`*.test.ts`)
- Schema validation tests
- Utility function tests

**E2E Tests:** Playwright
- `./playwright.config.ts`
- User workflow testing
- UI interaction validation

**Test Locations:**
- `./tests/` - E2E test suites
- `./server/services/*.test.ts` - Service tests
- `./server/routes/*.test.ts` - Route tests

