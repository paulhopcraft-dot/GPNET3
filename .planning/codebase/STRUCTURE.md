# Preventli (GPNet3) Codebase Structure

## Directory Organization

```
gpnet3/
├── client/                          # React frontend application
│   ├── src/
│   │   ├── App.tsx                 # Main router + auth guard
│   │   ├── main.tsx                # React app bootstrap
│   │   ├── App.css                 # Main app styles
│   │   ├── index.css               # Global styles (13KB)
│   │   │
│   │   ├── pages/                  # Route-level components (28 pages)
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── CompanyList.tsx
│   │   │   │   └── CompanyForm.tsx
│   │   │   ├── CasesPage.tsx               # Case list + filtering
│   │   │   ├── CaseSummaryPage.tsx        # Case detail view
│   │   │   ├── CheckInsPage.tsx           # Progress updates
│   │   │   ├── CompanySettings.tsx        # Org settings
│   │   │   ├── CertificateReviewPage.tsx  # Certificate validation
│   │   │   ├── EmployerCaseDetailPage.tsx # Employer perspective
│   │   │   ├── EmployerDashboard.tsx      # Employer overview
│   │   │   ├── EmployerNewCasePage.tsx    # New claim intake
│   │   │   ├── FinancialsPage.tsx         # Cost tracking
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── InjuryDateReviewPage.tsx
│   │   │   ├── LoginPage.tsx              # Auth entry point
│   │   │   ├── NewClaimPage.tsx           # Case creation
│   │   │   ├── PredictionsPage.tsx        # AI timeline predictions
│   │   │   ├── ReportsPage.tsx            # Reporting interface
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   ├── RiskDashboardPage.tsx      # Risk assessment
│   │   │   ├── RTWPlannerPage.tsx         # RTW plan interface
│   │   │   ├── SessionsPage.tsx           # User sessions
│   │   │   ├── GPNet2Dashboard.tsx        # Deprecated dashboard
│   │   │   └── AuditLogPage.tsx           # Audit trail view
│   │   │
│   │   ├── components/              # Reusable components (70+ files)
│   │   │   ├── admin/
│   │   │   │   ├── AdminLayout.tsx
│   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   └── ...
│   │   │   ├── ui/                 # shadcn/ui base components
│   │   │   │   ├── toaster.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   └── ... (30+ shadcn components)
│   │   │   ├── ActionQueueCard.tsx           # Action display card
│   │   │   ├── CaseActionPlanCard.tsx       # Action plan component
│   │   │   ├── CaseChatPanel.tsx            # Discussion thread
│   │   │   ├── CaseContactsPanel.tsx        # Contact management
│   │   │   ├── CaseDetailPanel.tsx          # Case metadata
│   │   │   ├── CasesTable.tsx               # Data grid with sorting
│   │   │   ├── CertificateCard.tsx          # Cert display
│   │   │   ├── ComplianceDashboardWidget.tsx # Compliance heatmap
│   │   │   ├── ComplianceReportCard.tsx     # Compliance report
│   │   │   ├── DynamicRecoveryTimeline.tsx  # RTW progress visual
│   │   │   ├── EmailComposer.tsx            # Email draft editor
│   │   │   ├── EmailDraftModal.tsx          # Email template modal
│   │   │   ├── CompanyNav.tsx               # Org navigation
│   │   │   ├── RoleBasedDashboard.tsx       # Role router
│   │   │   ├── ProtectedRoute.tsx           # Auth guard
│   │   │   ├── AdminRoute.tsx               # Admin guard
│   │   │   ├── ai-assistant.tsx             # AI chat interface
│   │   │   ├── app-sidebar.tsx              # Main navigation
│   │   │   ├── dashboard-stats.tsx          # KPI cards
│   │   │   ├── DateQualityBadge.tsx         # Date validation indicator
│   │   │   └── ... (more specialized components)
│   │   │
│   │   ├── contexts/                # React Context API
│   │   │   └── AuthContext.tsx      # Auth state + role management
│   │   │
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.ts           # Auth context consumer
│   │   │   ├── use-mobile.tsx       # Responsive design detection
│   │   │   └── use-toast.ts         # Toast notification
│   │   │
│   │   ├── lib/                     # Client utilities
│   │   │   ├── queryClient.ts       # TanStack Query + CSRF setup
│   │   │   ├── dateUtils.ts         # Date helpers
│   │   │   └── utils.ts             # General utilities
│   │   │
│   │   ├── styles/                  # Additional stylesheets
│   │   └── assets/                  # Static files (logos, icons)
│   │
│   ├── dist/                        # Build output (generated)
│   ├── public/                      # Public static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts              # Vite config (local dev)
│   ├── tailwind.config.ts          # Tailwind CSS config
│   ├── eslint.config.js
│   └── index.html                  # HTML entry point
│
├── server/                          # Express.js backend
│   ├── index.ts                    # Entry point (173 lines)
│   │                               # - Middleware setup
│   │                               # - Route registration
│   │                               # - Scheduler startup
│   │                               # - Graceful shutdown
│   │
│   ├── routes.ts                   # Route registration hub (1408 lines)
│   │                               # - Main route aggregator
│   │                               # - API endpoint mapping
│   │                               # - Custom endpoints
│   │
│   ├── routes/                     # Domain-specific route handlers
│   │   ├── auth.ts                 # Login, register, password reset
│   │   ├── actions.ts              # Action queue CRUD
│   │   ├── admin/
│   │   │   ├── organizations.ts    # Org management
│   │   │   └── insurers.ts         # Insurer management
│   │   ├── certificates.ts         # Certificate lifecycle
│   │   ├── caseChat.ts             # Case discussions
│   │   ├── contacts.ts             # Contact management
│   │   ├── compliance-dashboard.ts # Compliance metrics
│   │   ├── emailDrafts.ts          # Email generation
│   │   ├── employer-dashboard.ts   # Employer views
│   │   ├── invites.ts              # Invite workflows
│   │   ├── notifications.ts        # Notification management
│   │   ├── organization.ts         # Self-service org API
│   │   ├── predictions.ts          # AI predictions
│   │   ├── rtw.ts                  # RTW plan CRUD
│   │   ├── smartSummary.ts         # Case summaries
│   │   ├── termination.ts          # Termination workflows
│   │   ├── timeline.ts             # Recovery timeline
│   │   ├── treatmentPlan.ts        # Treatment plan generation
│   │   ├── voice.ts                # Voice integration
│   │   ├── webhooks.ts             # Freshdesk webhooks
│   │   └── rtw.test.ts             # RTW route tests
│   │
│   ├── controllers/                # Request handlers
│   │   ├── auth.ts                 # Auth business logic
│   │   ├── invites.ts              # Invite logic
│   │   ├── webhooks.ts             # Webhook processing
│   │   ├── auth.test.ts            # Auth tests
│   │
│   ├── middleware/                 # Express middleware
│   │   ├── security.ts             # CSRF, Helmet, rate limiting (1000+ lines)
│   │   ├── auth.ts                 # JWT verification
│   │   ├── caseOwnership.ts        # Case access control
│   │   └── security.ts (test)      # Security tests
│   │
│   ├── services/                   # Business logic layer (39 files, 600KB)
│   │
│   │   ├── AI & Summarization
│   │   │   ├── summary.ts          # Dynamic case summaries (28KB)
│   │   │   ├── smartSummary.ts     # Hybrid approach (18KB)
│   │   │   ├── llamaSummary.ts     # Llama model fallback (8KB)
│   │   │   ├── hybridSummary.ts    # Hybrid service wrapper (5KB)
│   │   │   └── templateSummary.ts  # Template-based summaries (7KB)
│   │   │
│   │   ├── Treatment & Plans
│   │   │   ├── treatmentPlanService.ts    # Plan generation (14KB)
│   │   │   ├── recoveryEstimator.ts       # Timeline prediction (59KB)
│   │   │   ├── injuryDateExtraction.ts    # Date extraction (17KB)
│   │   │   └── aiInjuryDateService.ts     # AI-based date extraction (9KB)
│   │   │
│   │   ├── Compliance & Evidence
│   │   │   ├── complianceEngine.ts        # Rules evaluation (25KB)
│   │   │   ├── clinicalEvidence.ts        # Evidence assessment (8KB)
│   │   │   ├── clinicalActions.ts         # Action recommendations (5KB)
│   │   │   ├── certificateService.ts      # Cert management (10KB)
│   │   │   ├── certificatePipeline.ts     # Multi-step cert processing (6KB)
│   │   │   ├── certificateCompliance.ts   # Cert validation (8KB)
│   │   │   ├── complianceScheduler.ts     # Daily compliance checks (8KB)
│   │   │   └── rtwCompliance.ts           # RTW validation (6KB)
│   │   │
│   │   ├── Notifications & Communication
│   │   │   ├── notificationScheduler.ts   # Scheduler orchestration (7KB)
│   │   │   ├── notificationService.ts     # Multi-channel notifications (33KB)
│   │   │   ├── emailService.ts            # Email sending (8KB)
│   │   │   ├── emailDraftService.ts       # AI email generation (12KB)
│   │   │   └── syncScheduler.ts           # Freshdesk sync scheduling (8KB)
│   │   │
│   │   ├── Integrations
│   │   │   ├── freshdesk.ts               # Freshdesk API sync (42KB)
│   │   │   └── transcripts/               # Transcript ingestion
│   │   │
│   │   ├── Predictions & Analysis
│   │   │   ├── predictionEngine.ts        # Outcome predictions (8KB)
│   │   │   └── ...test.ts files           # Test suites
│   │   │
│   │   ├── Data & Utilities
│   │   │   ├── auditLogger.ts             # Audit trail tracking (3KB)
│   │   │   ├── passwordResetService.ts    # Password reset flow (6KB)
│   │   │   ├── refreshTokenService.ts     # JWT refresh (10KB)
│   │   │   ├── fileUpload.ts              # File upload handling (2KB)
│   │   │   ├── termination.ts             # Termination workflows (22KB)
│   │   │   └── pdfProcessor.ts            # PDF handling (3KB)
│   │   │
│   │   └── tests/
│   │       ├── complianceEngine.test.ts
│   │       ├── treatmentPlanService.test.ts
│   │       ├── injuryDateExtraction.test.ts
│   │       └── ... (8 test files)
│   │
│   ├── lib/                        # Utility functions
│   │   ├── logger.ts               # Logging service (structured logs)
│   │   ├── dateValidation.ts       # Date validation rules
│   │   └── passwordValidation.ts   # Password strength checks
│   │
│   ├── db.ts                       # Database connection
│   │                               # - Pool configuration
│   │                               # - Drizzle ORM setup
│   │
│   ├── storage.ts                  # Data access layer (2436 lines)
│   │                               # - In-memory cache
│   │                               # - CRUD operations (100+ methods)
│   │                               # - Query optimization
│   │                               # - Type-safe DB access
│   │
│   ├── vite.ts                     # Vite middleware integration
│   ├── inviteService.ts            # Invite workflow service
│   ├── webhookSecurity.ts          # Webhook authentication
│   ├── seed.ts                     # Database seeding (19KB)
│   ├── scripts/
│   │   └── inspectDb.ts            # Database inspection tool
│   │
│   └── (controllers, middleware files also in root)
│
├── shared/                          # Shared types & constants
│   ├── schema.ts                   # Database schema + types (1546 lines)
│   │                               # - Drizzle pgTable definitions
│   │                               # - TypeScript interfaces
│   │                               # - Zod validators
│   │                               # - Enum definitions
│   └── complianceColors.ts         # UI color mappings
│
├── migrations/                      # Database migrations
│   └── (auto-generated by Drizzle Kit)
│
├── tests/                          # E2E tests
│   └── (Playwright test files)
│
├── public/                         # Static assets (root level)
│   └── uploads/                    # User-uploaded files
│
├── .planning/                      # Planning & architecture docs
│   └── codebase/                   # (This documentation)
│       ├── ARCHITECTURE.md         # Architectural patterns
│       └── STRUCTURE.md            # (This file)
│
├── .git/                           # Git repository
├── .github/                        # GitHub workflows
│   └── workflows/
│
├── Configuration Files
│   ├── package.json                # npm dependencies + scripts
│   ├── tsconfig.json               # TypeScript config (root)
│   ├── tsconfig.server.json        # Server-specific TypeScript
│   ├── vite.config.ts              # Vite bundler config
│   ├── drizzle.config.ts           # Drizzle ORM config
│   ├── tailwind.config.ts          # Tailwind CSS config
│   ├── playwright.config.ts        # Playwright E2E config
│   ├── vitest.config.ts            # Vitest unit test config
│   ├── vitest.setup.ts             # Test environment setup
│   ├── .env                        # Environment variables (local)
│   ├── .env.example                # Env template
│   ├── .env.local                  # Client env (dev)
│   ├── .gitignore                  # Git ignore rules
│   ├── .pre-commit-config.yaml     # Pre-commit hooks
│   ├── .replit                     # Replit config
│   │
│   └── (Root level config files)
│
└── Documentation
    ├── README.md                   # Getting started
    ├── CHANGELOG.md                # Version history
    ├── design_guidelines.md        # UI/UX standards
    ├── CONTRIBUTING.md             # Contribution guide
    └── (Various domain-specific docs)
```

---

## File Naming Conventions

### TypeScript/React Files
- **Pages:** PascalCase + "Page" suffix
  - `LoginPage.tsx`, `CasesPage.tsx`, `RTWPlannerPage.tsx`
- **Components:** PascalCase
  - `ActionQueueCard.tsx`, `CaseDetailPanel.tsx`, `EmailDraftModal.tsx`
- **Utilities/Hooks:** camelCase or kebab-case
  - `useAuth.ts`, `use-mobile.tsx`, `queryClient.ts`, `dateUtils.ts`
- **Services:** camelCase + "Service" suffix
  - `treatmentPlanService.ts`, `notificationService.ts`, `freshdesk.ts`
- **Middleware:** camelCase + "middleware" suffix or domain name
  - `auth.ts`, `security.ts`, `caseOwnership.ts`
- **Controllers:** domain + "Controller" pattern
  - `auth.ts`, `invites.ts`, `webhooks.ts`
- **Tests:** Matching file + `.test.ts` suffix
  - `complianceEngine.test.ts`, `recoveryEstimator.test.ts`

### Database/Schema
- **Tables:** camelCase (Drizzle conventions)
  - users, cases, treatmentPlans, rtwPlans, certificates
- **Enum Types:** PascalCase
  - RiskLevel, ComplianceStatus, RTWPlanStatus

### Route Files
- Organized by domain under `server/routes/`
- Main hub: `server/routes.ts`
- Sub-routes: `server/routes/{domain}.ts`
- Admin routes: `server/routes/admin/{domain}.ts`

---

## Key File Locations & Purposes

### Entry Points
| File | Purpose |
|------|---------|
| `./client/src/main.tsx` | React app bootstrap |
| `./client/src/App.tsx` | Main router + auth |
| `./server/index.ts` | Express app + schedulers |

### Configuration
| File | Purpose |
|------|---------|
| `./package.json` | Dependencies + scripts |
| `./tsconfig.json` | TypeScript compiler (root) |
| `./tsconfig.server.json` | Server TypeScript config |
| `./drizzle.config.ts` | ORM configuration |
| `./vite.config.ts` | Client bundler config |
| `./tailwind.config.ts` | Styling framework |

### Database
| File | Purpose |
|------|---------|
| `./shared/schema.ts` | All database tables + types |
| `./server/db.ts` | Connection pool setup |
| `./server/storage.ts` | Data access layer |
| `./migrations/` | SQL migration files |
| `./server/seed.ts` | Initial data population |

### Security
| File | Purpose |
|------|---------|
| `./server/middleware/security.ts` | CSRF, Helmet, rate limiting |
| `./server/middleware/auth.ts` | JWT verification |
| `./server/webhookSecurity.ts` | Webhook auth |

### API Routes
| File | Purpose |
|------|---------|
| `./server/routes.ts` | Route aggregation hub |
| `./server/routes/auth.ts` | Login/register/password |
| `./server/routes/actions.ts` | Action queue API |
| `./server/routes/smartSummary.ts` | Case summary API |
| `./server/routes/rtw.ts` | RTW plan API |
| `./server/routes/predictions.ts` | AI prediction API |
| `./server/routes/treatmentPlan.ts` | Treatment plan API |

### Business Logic
| File | Purpose |
|------|---------|
| `./server/services/summary.ts` | Case summarization |
| `./server/services/treatmentPlanService.ts` | Plan generation |
| `./server/services/complianceEngine.ts` | Compliance rules |
| `./server/services/recoveryEstimator.ts` | Timeline prediction |
| `./server/services/notificationService.ts` | Multi-channel alerts |
| `./server/services/freshdesk.ts` | Ticket sync |

### Testing
| File | Purpose |
|------|---------|
| `./playwright.config.ts` | E2E test config |
| `./vitest.config.ts` | Unit test config |
| `./tests/` | E2E test suites |
| `./server/services/*.test.ts` | Unit tests |

### UI Components
| File | Purpose |
|------|---------|
| `./client/src/pages/` | Route-level pages (28+) |
| `./client/src/components/` | Reusable components (70+) |
| `./client/src/components/ui/` | shadcn/ui base components |
| `./client/src/components/admin/` | Admin-specific UI |

### Utilities & Hooks
| File | Purpose |
|------|---------|
| `./client/src/lib/queryClient.ts` | React Query + CSRF |
| `./client/src/lib/dateUtils.ts` | Date helpers |
| `./client/src/hooks/useAuth.ts` | Auth context consumer |
| `./client/src/contexts/AuthContext.tsx` | Auth state provider |

---

## Import Path Aliases

**Configured in `tsconfig.json`:**
```json
{
  "paths": {
    "@/*": ["./client/src/*"],
    "@shared/*": ["./shared/*"]
  }
}
```

**Usage Examples:**
```typescript
import { useAuth } from "@/hooks/useAuth";
import type { CaseDetail } from "@shared/schema";
import { storage } from "@/lib/storage"; // Note: from perspective
```

---

## Module Organization Patterns

### Service Layer Pattern
```typescript
// Location: server/services/{domain}.ts
export class {DomainName}Service {
  async method1() { /* business logic */ }
  async method2() { /* business logic */ }
}

// Usage in routes:
import { {DomainName}Service } from "../services/{domain}";
const service = new {DomainName}Service();
```

### Storage Layer Pattern
```typescript
// Location: server/storage.ts (export const namespace)
export const storage = {
  users: {
    create: async () => {},
    getById: async () => {},
    update: async () => {},
    delete: async () => {}
  },
  cases: {
    // ... CRUD operations
  }
  // ... more entities
}

// Usage:
const caseData = await storage.cases.getById(caseId);
```

### Route Handler Pattern
```typescript
// Location: server/routes/{domain}.ts
import { Router } from "express";
import { authorize } from "../middleware/auth";

const router = Router();

router.get("/:id", authorize, async (req, res) => {
  // Implementation
});

export default router;
```

### React Component Pattern
```typescript
// Location: client/src/components/{Component}.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function MyComponent({ prop1 }: Props) {
  // Hooks
  const { user } = useAuth();

  // State
  const [state, setState] = useState();

  // Effects
  useEffect(() => {}, []);

  // Render
  return <div>{/* JSX */}</div>;
}
```

---

## Size & Complexity Metrics

| Category | Count | Total Size |
|----------|-------|-----------|
| React Pages | 28 | ~4-5 KB avg |
| React Components | 70+ | ~3-5 KB avg |
| Server Routes | 15+ | ~2-5 KB avg |
| Services | 39 | ~600 KB total |
| Schema File | 1 | 1546 lines |
| Storage File | 1 | 2436 lines |
| Routes Hub | 1 | 1408 lines |
| Middleware | 3 | 1000+ lines total |
| Test Files | 8+ | Unit + E2E tests |

---

## Code Quality Standards

### TypeScript
- Strict mode enabled: `"strict": true`
- Explicit return types required
- No implicit `any`
- Module resolution: "bundler"

### Linting
- ESLint configuration: `./client/eslint.config.js`
- Pre-commit hooks via `.pre-commit-config.yaml`

### Testing
- Unit tests: Vitest with happy-dom
- E2E tests: Playwright headless/headed modes
- Coverage expectations: [See vitest.config.ts]

### Naming
- camelCase: functions, variables, methods
- PascalCase: components, types, classes
- SCREAMING_SNAKE_CASE: constants
- kebab-case: CSS files (some components)

---

## Branch Structure

**Main branches:**
- `main` - Production-ready code
- `gsd` - Current GSD development
- `dev` - Integration branch (historical)

**Feature branches:**
- `feature/*/` - Feature development
- `fix/*/` - Bug fixes
- `testing/*/` - Test branches
- `pr-*/` - PR staging

---

## Common Commands

```bash
# Development
npm run dev              # Start both server + client
npm run dev:server      # Server only
npm run dev:client      # Client only (Vite on 5173)

# Building
npm run build           # Production build
npm start               # Start production server

# Database
npm run db:push         # Apply migrations
npm run seed            # Seed data
npm run db:inspect      # Inspect database

# Testing
npm test                # Unit tests
npm run test:e2e        # E2E tests
npm run test:e2e:headed # E2E with browser visible

# Code Quality
npm run lint            # Linting
npm run type-check      # TypeScript check
```

---

## Key Abstraction Layers

### Presentation ↔ Business Logic
- **Boundary:** Routes `server/routes/` → Services `server/services/`
- **Communication:** Objects serialized to/from JSON

### Business Logic ↔ Data Access
- **Boundary:** Services → Storage `server/storage.ts`
- **Communication:** Type-safe objects via Drizzle + Zod

### Frontend ↔ Backend API
- **Boundary:** HTTP REST API
- **Communication:** JSON payloads + JWT auth

### Database ↔ ORM
- **Boundary:** Drizzle + Pool
- **Communication:** SQL queries (generated by Drizzle)

---

## Hot Spots & Complex Areas

### High Complexity
1. `server/services/recoveryEstimator.ts` (59 KB)
   - Complex timeline prediction logic
   - Multiple injury type patterns

2. `server/services/freshdesk.ts` (42 KB)
   - Bidirectional API sync
   - Error handling + retries

3. `server/services/notificationService.ts` (33 KB)
   - Multi-channel notification dispatch
   - Scheduling + retry logic

4. `server/services/complianceEngine.ts` (25 KB)
   - Complex business rule evaluation
   - Evidence assessment

5. `server/storage.ts` (2436 lines)
   - Large data access abstraction
   - 100+ methods across 8+ entities

### Medium Complexity
- `server/routes.ts` - Route aggregation
- `server/services/summary.ts` - Multi-strategy summarization
- `server/services/treatmentPlanService.ts` - Plan generation
- `client/src/pages/CaseSummaryPage.tsx` - Complex UI composition
- `server/middleware/security.ts` - CSRF + rate limiting

### Stable/Simple
- Route handlers (mostly thin request/response mapping)
- Component presentation layers
- Utility functions

