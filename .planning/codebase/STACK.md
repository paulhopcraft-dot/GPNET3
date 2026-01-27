# Technology Stack - GPNet3

## Project Overview
**Name:** GPNet3 / Preventli
**Type:** Full-stack TypeScript monorepo (Node.js + React)
**Version:** 1.0.0
**Package Manager:** npm with pnpm lock file
**Build System:** Vite + esbuild

---

## Runtime & Languages

### Server Runtime
- **Node.js** (v18+)
- **TypeScript 5.6.3** (`/c/dev/gpnet3/tsconfig.json`)
  - Strict mode enabled
  - Target: ESNext
  - Module: ESNext

### Client Runtime
- **Browser** (Chromium/Chrome based)
- **React 18.3.1** - UI framework
- **TypeScript 5.6.3** - Static typing
- **JSX** support via Vite + React plugin

---

## Core Frameworks

### Server-Side
- **Express.js 4.21.2** (`/c/dev/gpnet3/server/index.ts`)
  - API server on port 5000
  - CORS enabled with cookie support
  - Request/response logging middleware
  - Rate limiting (100 req/15min general, 5 req/15min for auth)
  - CSRF token generation and protection
  - Security headers via Helmet

- **Drizzle ORM 0.39.1** - Database access layer
  - Schema definitions in `/c/dev/gpnet3/shared/schema.ts` (1546 lines)
  - Configured in `/c/dev/gpnet3/drizzle.config.ts`
  - PostgreSQL dialect
  - Type-safe schema with Zod validation

### Client-Side
- **React Router DOM 7.9.5** - Client-side routing
- **React Hook Form 7.55.0** - Form state management
- **React Query (TanStack) 5.90.6** - Server state/caching
- **Vite 5.4.20** (`/c/dev/gpnet3/vite.config.ts`)
  - Dev server on port 5173
  - Code splitting with manual chunks strategy
  - React plugin enabled

---

## Database

### PostgreSQL
- **Version:** Managed via environment variable `DATABASE_URL`
- **Connection Pool:** `pg 8.13.1` (native driver)
- **Serverless:** Neon Database support via `@neondatabase/serverless 1.0.2`

### Schema Tables
Located in `/c/dev/gpnet3/shared/schema.ts`:
- `workerCases` - Primary case tracking
- `medicalCertificates` - Medical document storage
- `caseActions` - Action queue system
- `caseComplianceChecks` - Compliance evaluation results
- `complianceRules` - Rule definitions (WIRC Act 2013, WorkSafe)
- `webhookFormMappings` - JotForm webhook configuration
- `notifications` - Notification queue
- `caseDiscussionNotes` - Clinical case notes
- `companyWorkersLinks` - Company-worker associations
- Other supporting tables for users, organizations, sessions

### Migrations
- **Tool:** Drizzle Kit (`drizzle-kit 0.31.7`)
- **Location:** `/c/dev/gpnet3/migrations/`
- **Commands:**
  - `npm run drizzle:generate` - Generate migration files
  - `npm run drizzle:migrate` - Apply migrations
  - `npm run db:push` - Push schema to database

---

## UI Components & Styling

### Component Library
- **Radix UI** (v1.x) - Unstyled accessible components
  - `@radix-ui/react-avatar 1.1.10`
  - `@radix-ui/react-checkbox 1.3.3`
  - `@radix-ui/react-dialog 1.1.15`
  - `@radix-ui/react-select 2.2.6`
  - `@radix-ui/react-toast 1.2.15`
  - Plus 8+ additional Radix UI primitives

- **Lucide React 0.453.0** - Icon library (450+ icons)

### Styling
- **Tailwind CSS 3.4.17** (`/c/dev/gpnet3/tailwind.config.ts`)
  - PostCSS 8.x integration
  - Autoprefixer support
  - Custom configuration for design system

- **Tailwindcss Animate 1.0.7** - Animation utilities
- **Class Variance Authority 0.7.1** - Component variant system
- **Tailwind Merge 2.6.0** - Utility class merging
- **Tailwindcss Typography 0.5.19** - Prose styling for rich text

### Content Rendering
- **React Markdown 10.1.0** - Markdown to React
- **Remark GFM 4.0.1** - GitHub Flavored Markdown support

### Animation
- **Framer Motion 11.13.1** - Animation library (component transitions, page effects)

### Charts & Visualization
- **Recharts 2.15.2** - React charting library (used in dashboards)

---

## Data Validation & Serialization

- **Zod 3.25.76** - Schema validation library
  - Integrated with Drizzle via `drizzle-zod 0.7.0`
  - Validates forms, API requests, environment variables

- **JSON/JSONB** - PostgreSQL native JSON types in schema

---

## Authentication & Security

### Session Management
- **Express-Session 1.18.1** - Session middleware
- **Connect-PG-Simple 10.0.0** - PostgreSQL session store
- **Cookie-Parser 1.4.7** - Cookie parsing

### Password & Auth
- **Bcrypt 6.0.0** - Password hashing
  - `@types/bcrypt 6.0.0` for TypeScript

- **JWT (jsonwebtoken 9.0.2)** - Token-based auth
  - `@types/jsonwebtoken 9.0.10`

### CSRF Protection
- **CSRF-CSRF 4.0.3** - CSRF token generation and validation
- Configured in `/c/dev/gpnet3/server/middleware/security.ts`

### Security Headers
- **Helmet 8.1.0** - HTTP security headers
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options

---

## Logging & Error Handling

### Logger
- **Custom logger module** in `/c/dev/gpnet3/server/lib/logger.ts`
  - Categories: api, auth, webhook, freshdesk, email, notification, etc.
  - Structured logging with context objects

---

## External API Integrations

### AI Services
- **Anthropic SDK 0.68.0** (`@anthropic-ai/sdk`)
  - Claude API for AI-powered summaries
  - Used in `/c/dev/gpnet3/server/routes/caseChat.ts`
  - Used in `/c/dev/gpnet3/server/routes/employer-dashboard.ts`
  - Used in `/c/dev/gpnet3/server/services/smartSummary.ts`

- **OpenAI SDK 6.7.0** (legacy/alternative AI)

### Case Management Integration
- **Freshdesk API** (custom integration)
  - Service: `/c/dev/gpnet3/server/services/freshdesk.ts` (42KB)
  - Domain: `FRESHDESK_DOMAIN` env var
  - API Key: `FRESHDESK_API_KEY` env var
  - Handles: Tickets, companies, contacts, attachments
  - Sync scheduler in `/c/dev/gpnet3/server/services/syncScheduler.ts`

### Form Submissions
- **JotForm Webhook Integration**
  - Handler: `/c/dev/gpnet3/server/controllers/webhooks.ts`
  - Form types: worker_injury, medical_certificate, return_to_work
  - Webhook security in `/c/dev/gpnet3/server/webhookSecurity.ts`

### Vector Database (Optional)
- **Pinecone 6.1.3** (`@pinecone-database/pinecone`)
  - Optional vector search capability

---

## Email & Notifications

### SMTP Configuration
- **Nodemailer 7.0.12** - Email sending library
- **Optional SMTP** configuration:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
  - Fallback: Logs emails to console in development

### Email Services
- `/c/dev/gpnet3/server/services/emailService.ts` - Core email sending
- `/c/dev/gpnet3/server/services/emailDraftService.ts` - Draft generation with AI
- `/c/dev/gpnet3/server/services/notificationService.ts` - Notification queue system

### Scheduled Tasks
- **Node-Cron 4.2.1** - Job scheduling
  - Notification scheduler: `/c/dev/gpnet3/server/services/notificationScheduler.ts`
  - Compliance scheduler: `/c/dev/gpnet3/server/services/complianceScheduler.ts`
  - Sync scheduler: `/c/dev/gpnet3/server/services/syncScheduler.ts`

---

## File Handling

### File Upload
- **Multer 2.0.2** - File upload middleware
  - `@types/multer 2.0.0`
  - Configured in `/c/dev/gpnet3/server/services/fileUpload.ts`

### Image Processing
- **Sharp 0.34.5** - Image manipulation (thumbnails, resizing)

### PDF Processing
- **Puppeteer 24.35.0** - Headless browser for PDF generation
  - Service: `/c/dev/gpnet3/server/services/pdfProcessor.ts`

---

## Utility Libraries

### Date/Time
- **Date-FNS 4.1.0** - Functional date utilities
- **Dayjs 1.11.19** - Lightweight date library (dayjs plugins for UTC)

### HTTP/Network
- **CORS 2.8.5** - Cross-Origin Resource Sharing
- **Body-Parser 1.20.3** - Request body parsing (built into Express)
- **WebSockets (ws 8.18.3)** - Real-time communication support

### Rate Limiting
- **Express-Rate-Limit 8.2.1** - API rate limiting middleware

### Utility Helpers
- **CLSX 2.1.1** - Conditional className utility
- **Dotenv 17.2.3** - Environment variable loading

---

## Build & Development

### Build Tools
- **Vite 5.4.20** - Frontend build tool
  - Config: `/c/dev/gpnet3/vite.config.ts`
  - Rollup-based bundler
  - Optimized chunk splitting strategy

- **TypeScript Compiler (tsc)** - Server build
  - Compiles TypeScript to JavaScript
  - Config: `/c/dev/gpnet3/tsconfig.server.json`

- **TSX 3.12.7** - TypeScript executor (Node.js runtime)
  - Used for: npm run dev, npm run seed, npm run db:push, etc.

- **Rollup** - Bundler (via Vite)

### Development Server
- **Vite Dev Server** - Frontend (port 5173)
  - Proxy to API: `/api` → `http://localhost:3001`
  - Hot Module Replacement (HMR)

- **Express Dev Server** - Backend (port 5000)
  - File watching via tsx

---

## Testing

### Unit Testing
- **Vitest 1.5.0** (`/c/dev/gpnet3/vitest.config.ts`)
  - Config file: `/c/dev/gpnet3/vitest.config.ts`
  - Test files: `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`
  - Environment: Node (server), jsdom (client components)
  - Globals enabled (describe, it, expect)
  - Setup file: `/c/dev/gpnet3/vitest.setup.ts`

### React Testing
- **@testing-library/react 16.3.0** - React component testing
- **@testing-library/jest-dom 6.9.1** - DOM matchers
- **@testing-library/user-event 14.6.1** - User interaction simulation

### E2E Testing
- **Playwright 1.57.0** (`/c/dev/gpnet3/playwright.config.ts`)
  - Config file: `/c/dev/gpnet3/playwright.config.ts`
  - Test directory: `/c/dev/gpnet3/tests/e2e/`
  - Browser: Chromium
  - Base URL: `http://localhost:5000` (default)
  - Trace recording on first retry

### API Testing
- **Supertest 7.1.4** - HTTP assertion library
  - `@types/supertest 6.0.3`

### Test DOM
- **Happy-DOM 20.0.11** - Lightweight DOM implementation for testing

---

## Environment Configuration

### Configuration Files
- `.env.example` (`/c/dev/gpnet3/.env.example`) - Template with all variables
- `.env` - Local environment (git-ignored)
- `components.json` - shadcn/ui component configuration
- `toolkit-config.yaml` - Custom project config

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key (min 32 chars)
- `SESSION_SECRET` - Session secret (min 32 chars)
- `ANTHROPIC_API_KEY` - Claude API key
- `FRESHDESK_DOMAIN` - Freshdesk subdomain
- `FRESHDESK_API_KEY` - Freshdesk API key

**Optional:**
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - development/production
- `CLIENT_URL` - Frontend URL (default: http://localhost:5173)
- `APP_URL` - App URL (for invite links)
- `API_URL` - API URL (for webhook URLs)
- `ENABLE_NOTIFICATIONS` - Feature flag (true/false)
- `SMTP_*` - Email configuration
- `PLAYWRIGHT_BASE_URL` - E2E test base URL

---

## Project Structure

```
/c/dev/gpnet3/
├── client/                    # React frontend (108 files)
│   └── src/
│       ├── components/        # React components
│       ├── pages/             # Page components
│       └── App.tsx            # Root component
├── server/                    # Node.js backend (83 files)
│   ├── controllers/           # Request handlers
│   ├── routes/                # Express route definitions
│   ├── services/              # Business logic (20+ services)
│   ├── middleware/            # Express middleware
│   ├── lib/                   # Utilities (logger, validation)
│   ├── scripts/               # CLI scripts
│   └── index.ts               # Server entry point
├── shared/                    # Shared code
│   └── schema.ts              # Database schema & types (1546 lines)
├── migrations/                # Drizzle migrations
├── tests/                     # Test files
│   └── e2e/                   # Playwright tests
├── public/                    # Static assets
└── uploads/                   # User uploads (logos, files)
```

---

## Key Statistics

| Metric | Value |
|--------|-------|
| **Client Source Files** | 108 TypeScript/TSX files |
| **Server Source Files** | 83 TypeScript files |
| **Database Tables** | 15+ tables (schema.ts: 1546 lines) |
| **Services** | 20+ business logic modules |
| **Dependencies** | 45 production dependencies |
| **DevDependencies** | 15 development dependencies |
| **NPM Scripts** | 11 scripts (dev, build, test, db commands) |

---

## Configuration Files Reference

| File | Purpose |
|------|---------|
| `/c/dev/gpnet3/package.json` | Root package definition |
| `/c/dev/gpnet3/vite.config.ts` | Vite build configuration |
| `/c/dev/gpnet3/vitest.config.ts` | Vitest test runner config |
| `/c/dev/gpnet3/playwright.config.ts` | E2E test configuration |
| `/c/dev/gpnet3/tsconfig.json` | TypeScript compiler options |
| `/c/dev/gpnet3/drizzle.config.ts` | ORM schema configuration |
| `/c/dev/gpnet3/tailwind.config.ts` | Tailwind CSS customization |
| `/c/dev/gpnet3/vitest.setup.ts` | Test setup utilities |
| `/c/dev/gpnet3/.env.example` | Environment template |
| `/c/dev/gpnet3/.pre-commit-config.yaml` | Git pre-commit hooks |

---

## Development Commands

```bash
# Frontend development
npm run dev:client       # Start Vite dev server (port 5173)

# Backend development
npm run dev:server       # Start Express server (port 5000)

# Both (full development)
npm run dev             # Runs both client and server

# Build
npm run build           # Build frontend + compile server TS

# Database
npm run db:push         # Apply migrations
npm run drizzle:generate # Generate new migrations
npm run seed            # Seed database with initial data

# Testing
npm run test            # Run Vitest unit tests
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:headed # Run E2E tests in browser UI

# Production
npm run start           # Start production server
```

---

## Dependencies Summary by Category

**React Ecosystem (10 packages)**
- react, react-dom, react-router-dom, react-hook-form, react-markdown

**UI/Styling (15 packages)**
- Tailwind CSS, Radix UI components, Lucide icons, Framer Motion, Recharts

**Backend/API (8 packages)**
- Express, Drizzle ORM, pg (PostgreSQL driver), Anthropic SDK, OpenAI SDK

**Database (4 packages)**
- drizzle-orm, drizzle-zod, pg, @neondatabase/serverless

**Security (5 packages)**
- bcrypt, jsonwebtoken, helmet, cors, csrf-csrf, express-rate-limit

**File/Content (4 packages)**
- multer, sharp, puppeteer, body-parser

**Utilities (6 packages)**
- axios/fetch equivalents, dotenv, clsx, date-fns, dayjs, node-cron

**Testing (4 packages)**
- vitest, playwright, @testing-library/*, supertest

---

**Last Updated:** January 25, 2026
**Codebase Analysis:** Comprehensive tech stack survey
