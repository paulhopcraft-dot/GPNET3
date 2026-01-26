# Code Conventions & Patterns - GPNet3

## Overview

This document defines the coding conventions, style guidelines, and architectural patterns used throughout the GPNet3 codebase (preventli). The project uses TypeScript across a full-stack React + Express + Drizzle ORM architecture.

---

## 1. TypeScript Configuration & Strictness

### Compiler Settings

**Base Configuration** (`/c/dev/gpnet3/tsconfig.json`):
- **Module System**: ESNext with bundler resolution
- **Strict Mode**: `strict: true` (enforced)
- **Target**: ESNext (server), ES2022 (client)
- **JSX**: React 18 with `react-jsx` runtime
- **Path Aliases**:
  - `@/*` → `client/src/*` (client components/utils)
  - `@shared/*` → `shared/*` (shared types/schema)

**Client-specific** (`/c/dev/gpnet3/client/tsconfig.app.json`):
- Strict mode enabled
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedSideEffectImports: true`

**Server-specific** (`/c/dev/gpnet3/tsconfig.server.json`):
- Extends root config
- Excludes client code and test files from build

### Type Safety Best Practices

1. **Always use explicit return types** on functions:
   ```typescript
   // ✅ Good
   function setAuthCookie(res: Response, token: string): void {
     res.cookie("gpnet_auth", token, { ... });
   }

   // ❌ Avoid
   function setAuthCookie(res, token) {
     // implicit any
   }
   ```

2. **Use interfaces for object shapes**, especially props:
   ```typescript
   // From /c/dev/gpnet3/client/src/components/CasesTable.tsx
   interface CasesTableProps {
     cases: WorkerCase[];
     selectedCaseId?: string | null;
     onCaseClick?: (caseId: string) => void;
   }
   ```

3. **Union types for discriminated states**:
   ```typescript
   // From /c/dev/gpnet3/shared/schema.ts
   export type RTWPlanStatus =
     | "not_planned"
     | "planned_not_started"
     | "in_progress"
     | "working_well"
     | "failing"
     | "on_hold"
     | "completed";
   ```

---

## 2. Project Structure

```
/c/dev/gpnet3/
├── client/              # React frontend (Vite)
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── contexts/    # React Context providers
│       ├── hooks/       # Custom hooks
│       └── lib/         # Client utilities (queryClient, etc.)
├── server/              # Express backend
│   ├── controllers/     # Request handlers (auth, invites, webhooks)
│   ├── routes/          # API route definitions
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic (compliance, email, etc.)
│   ├── lib/             # Utilities (logger, validation, etc.)
│   ├── scripts/         # CLI scripts (database operations)
│   └── index.ts         # Server entry point
├── shared/              # Shared types & schema
│   ├── schema.ts        # Drizzle ORM tables + Zod schemas
│   └── complianceColors.ts
└── tests/
    └── e2e/             # Playwright end-to-end tests
```

### Key Architectural Decisions

1. **Monorepo Structure**: Single TypeScript project with client/server separation
2. **Type Sharing**: `@shared/schema.ts` is the single source of truth for:
   - Database schema (Drizzle ORM)
   - TypeScript types (derived from schema)
   - Validation schemas (Zod)
3. **Database-First Types**: Drizzle provides type inference from tables

---

## 3. Naming Conventions

### Files & Directories

- **Components**: PascalCase, `.tsx` extension
  ```
  ✅ client/src/components/CasesTable.tsx
  ✅ client/src/components/admin/AdminLayout.tsx
  ```

- **Pages**: PascalCase, `.tsx` extension
  ```
  ✅ client/src/pages/LoginPage.tsx
  ✅ client/src/pages/CaseSummaryPage.tsx
  ```

- **Utilities & services**: camelCase, `.ts` extension
  ```
  ✅ server/services/complianceEngine.ts
  ✅ server/lib/logger.ts
  ```

- **Tests**: Same name as file being tested + `.test.ts` or `.spec.ts`
  ```
  ✅ server/controllers/auth.test.ts
  ✅ server/routes/rtw.test.ts
  ```

### Variables & Functions

- **Constants**: UPPER_SNAKE_CASE
  ```typescript
  // From /c/dev/gpnet3/server/controllers/auth.ts
  const SALT_ROUNDS = 10;
  const JWT_EXPIRES_IN = "15m";
  const COOKIE_NAME = "gpnet_auth";
  ```

- **Functions**: camelCase, descriptive verbs
  ```typescript
  ✅ generateAccessToken()
  ✅ validatePassword()
  ✅ isValidTransition()
  ✅ getRequestMetadata()
  ```

- **React Components**: PascalCase (file name matches function)
  ```typescript
  // ProtectedRoute.tsx
  export function ProtectedRoute({ children }: ProtectedRouteProps) { ... }
  ```

- **Type/Interface names**: PascalCase
  ```typescript
  interface ProtectedRouteProps { ... }
  type RTWPlanStatus = "not_planned" | ...
  interface InjuryContext { ... }
  ```

---

## 4. Error Handling & Logging

### Structured Logging

**Logger Implementation** (`/c/dev/gpnet3/server/lib/logger.ts`):
- Service-based logger pattern with pre-configured instances
- Log levels: `debug`, `info`, `warn`, `error`
- JSON format in production, pretty-print in development

```typescript
// Usage
import { logger } from "../lib/logger";

logger.auth.info("User login successful", { userId, email });
logger.auth.error("Authentication failed", { attempt }, error);
logger.compliance.warn("Certificate expired", { caseId, certDate });
```

**Pre-configured loggers**:
```typescript
logger.auth        // Authentication events
logger.api         // API requests
logger.db          // Database operations
logger.compliance  // Compliance checks
logger.email       // Email service
logger.audit       // Audit trail
```

### Try-Catch Pattern

**Standard error handling in controllers** (from `/c/dev/gpnet3/server/controllers/invites.ts`):
```typescript
export async function createUserInvite(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only admins can create invites",
      });
    }

    // Business logic...
    const invite = await createInvite({ ... });

    return res.status(201).json(invite);
  } catch (error) {
    logger.auth.error("Failed to create invite", { userId: req.user?.id }, error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create invite",
    });
  }
}
```

**Error Response Format**:
```typescript
{
  error: "ErrorType" | "Unauthorized" | "Forbidden" | "NotFound" | "BadRequest",
  message: "Human-readable error description"
}
```

### Password Validation Error Handling

From `/c/dev/gpnet3/server/lib/passwordValidation.ts`:
```typescript
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// Returns array of validation errors for UI display
const result = validatePassword("weak");
// { valid: false, errors: ["Password must be at least 8 characters..."] }
```

---

## 5. Frontend Conventions

### React Component Structure

**Functional components with hooks** (React 18+):
```typescript
// From /c/dev/gpnet3/client/src/components/CasesTable.tsx
interface CasesTableProps {
  cases: WorkerCase[];
  selectedCaseId?: string | null;
  onCaseClick?: (caseId: string) => void;
}

export function CasesTable({ cases, selectedCaseId, onCaseClick }: CasesTableProps) {
  const [workStatusFilter, setWorkStatusFilter] = useState<WorkStatus | "All">("All");

  const filteredCases = cases.filter((c) =>
    workStatusFilter === "All" || c.workStatus === workStatusFilter
  );

  return (
    <div className="flex-1 min-h-[480px] overflow-auto bg-card rounded-xl border border-border">
      {/* JSX */}
    </div>
  );
}
```

### Styling with Tailwind + shadcn/ui

**Utility-first Tailwind classes** with semantic tokens:
```typescript
// Color tokens
className="bg-card border-border text-muted-foreground bg-primary/10 dark:bg-primary/20"

// Layout utilities
className="flex-1 min-h-[480px] overflow-auto p-4"

// Interactive states
className="cursor-pointer transition-colors hover-elevate"
```

**Responsive design**:
```typescript
className="px-4 py-3 md:px-6 md:py-4 lg:px-8"
```

**Component composition** (shadcn/ui):
```typescript
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

// Semantic structure
<Card>
  <CardHeader>
    <CardTitle>Case Details</CardTitle>
  </CardHeader>
  <CardContent>
    <Badge variant="outline">Active</Badge>
    <Button onClick={handleSave}>Save</Button>
  </CardContent>
</Card>
```

### Route Protection

**Pattern for protected routes** (`/c/dev/gpnet3/client/src/components/ProtectedRoute.tsx`):
```typescript
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

---

## 6. Backend API Conventions

### Controller Pattern

**Request handling** (from `/c/dev/gpnet3/server/controllers/auth.ts`):
- One controller file per resource type
- Export named async functions matching HTTP operations
- Use `AuthRequest` interface for authenticated endpoints
- Always include error handling with logging

```typescript
export async function login(req: Request, res: Response) {
  try {
    // Validate input
    // Authenticate user
    // Generate tokens
    // Set cookies
    // Log audit event
    return res.status(200).json({ ... });
  } catch (error) {
    logger.auth.error("Login failed", { ... }, error);
    return res.status(500).json({ error: "...", message: "..." });
  }
}
```

### Middleware Architecture

**Auth middleware** (from `/c/dev/gpnet3/server/middleware/auth.ts`):
```typescript
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
}

export function authorize(allowedRoles?: UserRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Extract token from cookie (primary) or Authorization header (fallback)
      let token: string | undefined;
      if (req.cookies && req.cookies[COOKIE_NAME]) {
        token = req.cookies[COOKIE_NAME];
      } else {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify token and attach user to request
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      req.user = payload;

      // Check role authorization
      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (error) {
      logger.auth.error("Authorization failed", {}, error);
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}
```

### Route Organization

**Route registration** (from `/c/dev/gpnet3/server/routes/auth.ts`):
```typescript
export function registerAuthRoutes(app: Express): void {
  // Public routes
  app.post("/api/auth/register", handleRegister);
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/forgot-password", handleForgotPassword);

  // Protected routes
  app.post("/api/auth/logout", authorize(), handleLogout);
  app.post("/api/auth/refresh", authorize(), handleRefresh);
  app.get("/api/auth/sessions", authorize(), getSessions);
}
```

---

## 7. Database & ORM Conventions

### Drizzle ORM Tables

**Schema definition** (from `/c/dev/gpnet3/shared/schema.ts`):
```typescript
import { pgTable, text, varchar, timestamp, boolean, json } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { enum: ["admin", "case_manager", "employer"] }).notNull(),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Type Inference

**Automatic types from schema**:
```typescript
import { users } from "@shared/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

type User = InferSelectModel<typeof users>;
type InsertUser = InferInsertModel<typeof users>;
```

### Validation Schemas

**Zod schemas derived from tables**:
```typescript
import { createInsertSchema } from "drizzle-zod";

export const insertUserSchema = createInsertSchema(users)
  .pick({ email: true, passwordHash: true })
  .extend({
    password: z.string().min(8),
  });

type InsertUserInput = z.infer<typeof insertUserSchema>;
```

---

## 8. Constants & Configuration

### Environment Variables

**Security-critical variables** (`/c/dev/gpnet3/server/index.ts`):
```typescript
// Validate critical variables on startup (fail-closed)
validateSecurityEnvironment();

// Used:
process.env.JWT_SECRET
process.env.DATABASE_URL
process.env.NODE_ENV
process.env.CLIENT_URL
```

### Magic Numbers & Constants

**Always extract to named constants**:
```typescript
// From /c/dev/gpnet3/server/controllers/auth.ts
const SALT_ROUNDS = 10;                              // bcrypt rounds
const JWT_EXPIRES_IN = "15m";                        // Short-lived tokens
const COOKIE_MAX_AGE = 15 * 60 * 1000;              // 15 minutes in ms
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// From /c/dev/gpnet3/server/middleware/auth.ts
const COOKIE_NAME = "gpnet_auth";
```

---

## 9. Security Best Practices

### Password Handling

**From `/c/dev/gpnet3/server/controllers/auth.ts`**:
```typescript
import bcrypt from "bcrypt";

// Hash with salt rounds
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verify
const isValid = await bcrypt.compare(password, stored_hash);
```

### JWT Token Handling

**Token generation**:
```typescript
function generateAccessToken(userId: string, email: string, role: string): string {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  return jwt.sign(
    { id: userId, email, role, organizationId },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
```

**Cookie configuration**:
```typescript
function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                    // Not accessible via JS (XSS protection)
    secure: NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict",                // CSRF protection
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}
```

### CSRF Protection

**Conditional CSRF middleware** (from `/c/dev/gpnet3/server/middleware/security.ts`):
```typescript
app.use(conditionalCsrfProtection); // Protects state-changing requests

// CSRF token endpoint for SPA
app.get("/api/csrf-token", getCsrfToken);
```

---

## 10. Code Quality Guidelines

### Comments

**JSDoc for exported functions**:
```typescript
/**
 * Calculate recovery timeline based on injury context
 *
 * @param context - InjuryContext with dateOfInjury, summary, riskLevel
 * @returns TimelineEstimate with estimated weeks and completion date
 * @throws Error if dateOfInjury is invalid
 */
export function calculateRecoveryTimeline(context: InjuryContext): TimelineEstimate {
  // ...
}
```

**Inline comments for "why", not "what"**:
```typescript
// ✅ Good - explains reasoning
// Reduce by 4 weeks for high-priority treatment compliance
const adjustedWeeks = baselineWeeks - (priority === "high" ? 4 : 0);

// ❌ Avoid - obvious from code
// Add adjustment to weeks
const adjustedWeeks = baselineWeeks + adjustment;
```

### Module Organization

**Imports grouped logically**:
1. Standard library imports
2. External packages
3. Shared types (`@shared/...`)
4. Local imports
5. Blank line before declarations

```typescript
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@shared/schema";
import { logger } from "../lib/logger";

// Code...
```

### No Magic Values

```typescript
// ✅ Good
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
  lockAccount(MAX_LOCKOUT_DURATION_MS);
}

// ❌ Avoid
if (loginAttempts >= 5) {
  lockAccount(1800000);
}
```

---

## 11. Import/Export Patterns

### Named vs Default Exports

**Named exports preferred** for:
- Utility functions
- React components
- Services/controllers
- Types and interfaces

```typescript
// ✅ Preferred
export function calculateRecoveryTimeline(context: InjuryContext): TimelineEstimate { }
export interface InjuryContext { }
export type TimelineEstimate = { ... };

// Default export OK for:
// - Page components (Next.js pattern compatibility)
// - Layouts
export default function LoginPage() { }
```

### Path Aliases

**Use aliases for cleaner imports**:
```typescript
// ✅ Good
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@shared/logger";
import type { WorkerCase } from "@shared/schema";

// ❌ Avoid
import { useAuth } from "../../../hooks/useAuth";
import { logger } from "../../../../shared/logger";
```

---

## 12. File Size Guidelines

- **Components**: Keep < 300 lines (split into smaller components)
- **Services**: Keep < 500 lines (extract helper functions)
- **Types/Interfaces**: Keep in `@shared/schema.ts` when possible

If exceeding these limits, consider:
1. Extracting helper functions to separate files
2. Breaking large components into smaller ones
3. Creating a separate types file

---

## 13. TypeScript `any` Usage

**Completely avoid `any`** - use these alternatives:

```typescript
// ❌ Never
const data: any = response.data;

// ✅ Unknown for unchecked data
const data: unknown = response.data;
if (typeof data === "object" && data !== null && "id" in data) {
  // Use narrowed type
}

// ✅ Generic for flexible functions
function parse<T>(input: string): T {
  return JSON.parse(input);
}

// ✅ Union types for alternatives
type Result = { success: true; data: User } | { success: false; error: string };
```

---

## Summary

GPNet3 follows these core principles:
1. **Strict TypeScript** with explicit types everywhere
2. **Organized structure** with clear separation of concerns
3. **Comprehensive logging** with structured metadata
4. **Security-first** approach to password/token handling
5. **Readable code** with JSDoc and semantic naming
6. **Minimal magic** with named constants for all config values
7. **Functional React** with hooks and proper prop typing
8. **Database-derived types** from single source of truth in `@shared/schema.ts`

