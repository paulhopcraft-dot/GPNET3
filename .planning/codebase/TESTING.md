# Testing Strategy & Framework Guide - GPNet3

## Overview

GPNet3 uses a multi-layered testing approach:
- **Unit Tests**: Vitest + Vitest DOM for isolated logic testing
- **Component Tests**: React Testing Library for component behavior
- **E2E Tests**: Playwright for full user flows
- **170+ Test Files**: Comprehensive coverage across codebase

---

## 1. Test Framework Setup

### Configuration Files

**Main Config** (`/c/dev/gpnet3/vitest.config.ts`):
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "server/**/*.test.ts",      // Backend unit tests
      "server/**/*.spec.ts",      // Backend integration tests
      "shared/**/*.spec.ts",      // Shared type validation
      "client/**/*.test.ts",      // Utilities/hooks
      "client/**/*.test.tsx",     // React components
    ],
    // Default to node for server tests
    environment: "node",
    // Use jsdom for React component tests
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "jsdom"],
      ["client/**/*.test.ts", "jsdom"],
    ],
    globals: true,               // Import describe/it/expect implicitly
    setupFiles: ["./vitest.setup.ts"],
    reporters: ["basic"],         // Avoid EPIPE errors on Windows
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
```

**Setup File** (`/c/dev/gpnet3/vitest.setup.ts`):
```typescript
import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest with jest-dom matchers
expect.extend(matchers);

// Handle EPIPE errors on Windows (pipes closing unexpectedly)
if (typeof process !== "undefined") {
  const handlePipeError = (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED") {
      return; // Ignore EPIPE
    }
    throw err;
  };

  process.stdout?.on?.("error", handlePipeError);
  process.stderr?.on?.("error", handlePipeError);
}
```

**Playwright Config** (`/c/dev/gpnet3/playwright.config.ts`):
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60 * 1000,           // 60 second timeout per test
  retries: 0,                    // No automatic retries (track all failures)
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5000",
    trace: "on-first-retry",     // Capture traces on failures
  },
  webServer: {
    command: "npm run dev",      // Start dev server for tests
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,         // 2 minute startup timeout
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

### Dependencies

From `/c/dev/gpnet3/package.json`:
```json
{
  "devDependencies": {
    "vitest": "^1.5.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^14.6.1",
    "@playwright/test": "^1.46.1",
    "happy-dom": "^20.0.11",
    "supertest": "^7.1.4"
  }
}
```

---

## 2. Unit Testing Pattern

### Backend Unit Tests

**Authentication Tests** (`/c/dev/gpnet3/server/controllers/auth.test.ts`):

Password validation test structure:
```typescript
import { describe, it, expect } from "vitest";
import { validatePassword, type PasswordValidationResult } from "../lib/passwordValidation";

describe("Password Validation (Security: Strong Password Policy)", () => {
  describe("Length Requirements", () => {
    it("should reject password shorter than 8 characters", () => {
      const result = validatePassword("Short1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should accept password with exactly 8 characters", () => {
      const result = validatePassword("Pass1!ab");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Character Type Requirements", () => {
    it("should reject password without uppercase letter", () => {
      const result = validatePassword("password1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    // More tests...
  });

  describe("Multiple Errors", () => {
    it("should return multiple errors when multiple requirements fail", () => {
      const result = validatePassword("short");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
```

**Key patterns**:
- `describe()` blocks for organizing test suites by feature
- Clear "should/should NOT" naming for test cases
- Test both happy path AND error cases
- Use specific error message assertions

### Service Unit Tests

**Compliance Engine Tests** (`/c/dev/gpnet3/server/services/complianceEngine.test.ts`):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluateCase, getLatestComplianceReport } from './complianceEngine';
import { db } from '../db';
import { storage } from '../storage';

// Mock external dependencies
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../storage', () => ({
  storage: {
    upsertAction: vi.fn(),
  }
}));

const mockDb = db as any;
const mockStorage = storage as any;

describe('Compliance Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset mocks before each test
  });

  describe('Certificate Current Rule (CERT_CURRENT)', () => {
    it('should be compliant when worker is at work', async () => {
      const mockCase = {
        id: 'case-1',
        workerName: 'Test Worker',
        workStatus: 'At work',
        currentStatus: 'At work',
        dateOfInjury: new Date('2024-01-01'),
      };

      const mockRules = [
        {
          id: 'rule-1',
          ruleCode: 'CERT_CURRENT',
          name: 'Certificate must be current',
          severity: 'high',
        }
      ];

      // Set up mock chain
      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockImplementation(() => Promise.resolve(mockRules));

      // Run test
      // Assert behavior...
    });
  });
});
```

**Mocking patterns**:
- Use `vi.mock()` for external dependencies (database, storage)
- Create `mockDb` and `mockStorage` references typed as `any` for flexibility
- `vi.clearAllMocks()` in `beforeEach()` to prevent test pollution
- Mock return values that match the real API structure

### Recovery Timeline Tests

**Example from** `/c/dev/gpnet3/server/services/recoveryEstimator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateRecoveryTimeline,
  extractInjuryType,
  type InjuryContext,
} from "./recoveryEstimator";

describe("Recovery Timeline Estimator", () => {
  describe("extractInjuryType", () => {
    it("should extract fracture injuries from summary", () => {
      const result = extractInjuryType(
        "Worker sustained a fracture to the left wrist on 2024-01-15"
      );
      expect(result).toBe("fracture_upper_limb");
    });

    it("should extract back strain from summary", () => {
      const result = extractInjuryType(
        "Lower back strain from lifting heavy boxes"
      );
      expect(result).toBe("back_strain");
    });

    it("should default to unknown for unrecognized injuries", () => {
      const result = extractInjuryType("Some unusual medical condition");
      expect(result).toBe("unknown");
    });

    it("should handle empty or null summaries", () => {
      expect(extractInjuryType("")).toBe("unknown");
      expect(extractInjuryType(null as any)).toBe("unknown");
    });
  });

  describe("calculateRecoveryTimeline", () => {
    const baseContext: InjuryContext = {
      dateOfInjury: "2024-01-01T00:00:00.000Z",
      summary: "Worker sustained a soft tissue sprain",
      riskLevel: "Low",
      clinicalFlags: [],
    };

    it("should return estimated status for valid injury data", () => {
      const result = calculateRecoveryTimeline(baseContext);
      expect(result.status).toBe("estimated");
      expect(result.estimatedWeeks).toBeGreaterThan(0);
      expect(result.estimatedCompletionDate).toBeDefined();
    });

    it("should return baseline of 6 weeks for soft tissue sprain", () => {
      const result = calculateRecoveryTimeline(baseContext);
      expect(result.estimatedWeeks).toBe(6);
      expect(result.baselineWeeks).toBe(6);
    });
  });
});
```

**Pattern**:
- Test edge cases (empty, null, invalid input)
- Use specific assertions (`toBeGreaterThan`, `toBeDefined`, etc.)
- Group related tests in `describe()` blocks

---

## 3. Component Testing Pattern

### React Component Tests

**Using React Testing Library** (`@testing-library/react`):

```typescript
// Example pattern (not all components have tests, but pattern is consistent)
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render button with correct label', () => {
    render(<MyComponent />);

    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalled();
  });

  it('should handle async operations', async () => {
    render(<MyComponent />);
    const button = screen.getByRole('button', { name: /load/i });

    fireEvent.click(button);

    // Use findBy for async queries (waits for element)
    const result = await screen.findByText(/loaded/i);
    expect(result).toBeInTheDocument();
  });
});
```

**Best practices**:
- Use semantic queries: `getByRole`, `getByLabelText`, not `getByTestId`
- `getByX` for elements that must exist immediately
- `findByX` for async elements (returns Promise)
- `queryByX` only when testing absence

### Testing Component Props

```typescript
interface ComponentProps {
  cases: WorkerCase[];
  selectedCaseId?: string | null;
  onCaseClick?: (caseId: string) => void;
}

describe('ComponentWithProps', () => {
  it('should accept array of cases', () => {
    const cases = [
      { id: '1', workerName: 'John', company: 'Acme' },
      { id: '2', workerName: 'Jane', company: 'TechCorp' },
    ];

    render(<Component cases={cases} />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('should call onCaseClick with correct case ID', async () => {
    const handleClick = vi.fn();
    const cases = [{ id: 'case-1', workerName: 'Test' }];

    render(<Component cases={cases} onCaseClick={handleClick} />);

    const row = screen.getByRole('row', { name: /test/i });
    fireEvent.click(row);

    expect(handleClick).toHaveBeenCalledWith('case-1');
  });
});
```

---

## 4. RTW State Machine Tests

**Example from** `/c/dev/gpnet3/server/routes/rtw.test.ts`:

Testing valid state transitions:
```typescript
import type { RTWPlanStatus } from "@shared/schema";

// Valid RTW plan status transitions
const VALID_TRANSITIONS: Record<RTWPlanStatus, RTWPlanStatus[]> = {
  not_planned: ["planned_not_started"],
  planned_not_started: ["in_progress", "on_hold", "not_planned"],
  in_progress: ["working_well", "failing", "on_hold", "completed"],
  working_well: ["in_progress", "completed", "on_hold"],
  failing: ["in_progress", "on_hold", "not_planned"],
  on_hold: ["planned_not_started", "in_progress", "not_planned"],
  completed: [], // Terminal state
};

function isValidTransition(from: RTWPlanStatus | undefined, to: RTWPlanStatus): boolean {
  const currentStatus: RTWPlanStatus = from || "not_planned";
  if (currentStatus === to) return true;
  return VALID_TRANSITIONS[currentStatus]?.includes(to) ?? false;
}

describe("RTW State Transitions (PRD-3.2.3)", () => {
  describe("from not_planned", () => {
    it("should allow transition to planned_not_started", () => {
      expect(isValidTransition("not_planned", "planned_not_started")).toBe(true);
    });

    it("should NOT allow direct transition to in_progress", () => {
      expect(isValidTransition("not_planned", "in_progress")).toBe(false);
    });

    it("should allow transition from undefined (defaults to not_planned)", () => {
      expect(isValidTransition(undefined, "planned_not_started")).toBe(true);
    });
  });

  describe("from in_progress", () => {
    it("should allow transition to working_well", () => {
      expect(isValidTransition("in_progress", "working_well")).toBe(true);
    });

    it("should allow transition to failing", () => {
      expect(isValidTransition("in_progress", "failing")).toBe(true);
    });

    it("should allow transition to completed", () => {
      expect(isValidTransition("in_progress", "completed")).toBe(true);
    });

    it("should NOT allow transition back to not_planned", () => {
      expect(isValidTransition("in_progress", "not_planned")).toBe(false);
    });
  });

  describe("completed state", () => {
    it("should be terminal - no transitions allowed", () => {
      expect(isValidTransition("completed", "in_progress")).toBe(false);
      expect(isValidTransition("completed", "not_planned")).toBe(false);
    });
  });
});
```

**Pattern**:
- Document valid state transitions as data structure
- Test each state's allowed transitions
- Test invalid transitions explicitly (using `NOT`)
- Document terminal states

---

## 5. End-to-End Testing with Playwright

### E2E Test Structure

**Located in** `/c/dev/gpnet3/tests/e2e/`:
- `auth-password-reset.spec.ts`
- `auth-sessions.spec.ts`
- `gpnet-dashboard.spec.ts`
- `injury-date-review.spec.ts`
- `treatment-tab-comprehensive.spec.ts`

### Password Reset E2E Test

**From** `/c/dev/gpnet3/tests/e2e/auth-password-reset.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Password Reset Flow", () => {
  const testEmail = "test@example.com";
  const newPassword = "NewSecurePass123!";

  test("should complete full password reset flow successfully", async ({ page }) => {
    // Navigate to forgot password page
    await page.goto("/forgot-password");

    // Should show forgot password form
    const heading = page.getByRole("heading", { name: /forgot password/i });
    await expect(heading).toBeVisible();

    // Enter email address
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill(testEmail);

    // Submit form
    const submitButton = page.getByRole("button", { name: /send reset link/i });
    await submitButton.click();

    // Should show success message
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test("should show error for non-existent email", async ({ page }) => {
    await page.goto("/forgot-password");

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("nonexistent@example.com");

    const submitButton = page.getByRole("button", { name: /send reset link/i });
    await submitButton.click();

    // Security: don't reveal if email exists
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/forgot-password");

    const emailInput = page.getByLabel(/email/i);
    const submitButton = page.getByRole("button", { name: /send reset link/i });

    // HTML5 validation should prevent submission
    await emailInput.fill("invalid-email");
    await submitButton.click();

    // Page should still be on forgot-password
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(submitButton).toBeVisible();
  });

  test("should validate password strength on reset page", async ({ page }) => {
    await page.goto("/reset-password?token=test-token");

    const passwordInput = page.getByLabel(/^new password$/i);
    const confirmInput = page.getByLabel(/confirm password/i);
    const submitButton = page.getByRole("button", { name: /reset password/i });

    // Try weak password
    await passwordInput.fill("weak");
    await confirmInput.fill("weak");
    await submitButton.click();

    // Should show validation error
    const errorMessage = page.getByText(/must be at least 8 characters/i);
    await expect(errorMessage).toBeVisible();
  });

  test("should navigate to reset password page with valid token", async ({ page }) => {
    await page.goto("/reset-password?token=test-token");

    const heading = page.getByRole("heading", { name: /reset password/i });
    await expect(heading).toBeVisible();

    // Should have password input fields
    const passwordInput = page.getByLabel(/^new password$/i);
    await expect(passwordInput).toBeVisible();

    const confirmInput = page.getByLabel(/confirm password/i);
    await expect(confirmInput).toBeVisible();
  });
});
```

### Playwright Best Practices

**Locators (role-based preferred)**:
```typescript
// ✅ Preferred - semantic and accessible
page.getByRole('button', { name: /submit/i })
page.getByLabel(/email/i)
page.getByRole('heading', { name: /reset password/i })

// ✅ OK - placeholder text
page.getByPlaceholder(/search/i)

// ⚠️ Last resort - CSS selectors
page.locator('.submit-button')

// ❌ Avoid - brittle test IDs
page.getByTestId('btn-submit')
```

**Async operations**:
```typescript
// Wait for element to appear
await expect(page.getByText(/success/i)).toBeVisible({ timeout: 10000 });

// Find element that appears after async action
const result = await page.findByText(/loaded/i);

// Wait for URL change
await expect(page).toHaveURL(/\/dashboard/);
```

**Security testing patterns**:
```typescript
// Don't reveal email existence (security requirement)
test("should show same message for existing and non-existing emails", async ({ page }) => {
  // Both cases show same response
  await expect(page.getByText(/check your email/i)).toBeVisible();
});
```

---

## 6. Running Tests

### NPM Scripts

```bash
# Unit tests (Vitest)
npm test

# Unit tests in watch mode
npm test -- --watch

# E2E tests (Playwright)
npm run test:e2e

# E2E tests in headed mode (browser visible)
npm run test:e2e:headed

# Full build + tests
npm run build
npm test
npm run test:e2e
```

### Test Filtering

```bash
# Run specific test file
npm test server/controllers/auth.test.ts

# Run tests matching pattern
npm test -- --grep "Password Validation"

# Run only E2E tests
npm run test:e2e -- --grep "Password Reset"
```

---

## 7. Mocking & Fixtures

### Mocking Dependencies

**Pattern used throughout**:
```typescript
import { vi } from 'vitest';

// Mock external module
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  }
}));

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Verify function was called with args
expect(mockFn).toHaveBeenCalledWith(expectedArgs);
```

### Fixture Data Patterns

```typescript
// Reusable test data
const mockCase = {
  id: 'case-1',
  workerName: 'Test Worker',
  company: 'Test Company',
  dateOfInjury: new Date('2024-01-01'),
};

const mockCertificate = {
  id: 'cert-1',
  caseId: 'case-1',
  issuedDate: new Date('2024-01-01'),
  expiryDate: new Date('2025-01-01'),
};

// Create variations
const expiredCert = { ...mockCertificate, expiryDate: new Date('2023-01-01') };
const upcomingExpiryCert = { ...mockCertificate, expiryDate: new Date('2024-02-01') };
```

---

## 8. Test Coverage Goals

### Current Coverage

- **170+ test files** across codebase
- **Server**: Controllers, routes, services, middleware
- **Client**: Component behavior, hook tests (limited)
- **E2E**: User flows, authentication, compliance actions

### Recommended Coverage Areas

1. **Authentication (100% coverage)**
   - Password validation
   - Token generation
   - Session management
   - Middleware authorization

2. **Business Logic (80%+ coverage)**
   - Compliance rule evaluation
   - Recovery timeline calculation
   - RTW state transitions
   - Action obligation determination

3. **API Endpoints (70%+ coverage)**
   - Success cases
   - Error handling
   - Input validation
   - Permission checks

4. **Components (50%+ coverage)**
   - Critical user flows
   - Form handling
   - Error states
   - Loading states

5. **E2E Workflows (Critical paths)**
   - User login/logout
   - Case management CRUD
   - Compliance actions
   - Report generation

---

## 9. Common Testing Patterns

### Testing Error Responses

```typescript
describe("API Endpoints - Error Handling", () => {
  it("should return 401 when not authenticated", async () => {
    const response = await request(app)
      .post("/api/protected-endpoint")
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Unauthorized");
  });

  it("should return 403 when user lacks permission", async () => {
    const response = await request(app)
      .post("/api/admin/create-user")
      .set("Authorization", `Bearer ${userToken}`) // Regular user
      .send({ email: "new@example.com" });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden");
  });

  it("should return 400 with validation errors", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ email: "invalid-email" });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });
});
```

### Testing State Transitions

```typescript
describe("State Transitions", () => {
  it("should only allow valid transitions", () => {
    const validTransitions = {
      "draft": ["submitted", "archived"],
      "submitted": ["approved", "rejected", "draft"],
      "approved": ["completed", "draft"],
    };

    const currentState = "draft";
    const nextState = "submitted";

    const isValid = validTransitions[currentState]?.includes(nextState) ?? false;
    expect(isValid).toBe(true);
  });

  it("should reject invalid transitions", () => {
    const isValid = validTransitions["draft"]?.includes("completed") ?? false;
    expect(isValid).toBe(false);
  });
});
```

### Testing Async Operations

```typescript
describe("Async Operations", () => {
  it("should handle promise resolution", async () => {
    const result = await service.fetchData();

    expect(result).toBeDefined();
    expect(result.id).toBe('test-id');
  });

  it("should handle promise rejection", async () => {
    vi.mocked(api.fetch).mockRejectedValueOnce(new Error("Network error"));

    await expect(service.fetchData()).rejects.toThrow("Network error");
  });

  it("should timeout after specified duration", async () => {
    vi.useFakeTimers();

    const promise = new Promise((resolve) => {
      setTimeout(() => resolve("done"), 5000);
    });

    vi.advanceTimersByTime(6000);
    await expect(promise).resolves.toBe("done");

    vi.useRealTimers();
  });
});
```

---

## 10. Debugging Tests

### Playwright Debug Mode

```bash
# Run with inspector
npx playwright test --debug

# Run with head (browser visible)
npx playwright test --headed

# Trace on failure (generates trace file)
npx playwright test --trace on
```

### Vitest Debug

```bash
# Run in inspect mode
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Watch mode for quick iteration
npm test -- --watch
```

### Console Logging in Tests

```typescript
// Print to stdout during test
console.log('Debug info:', data);

// Use logger in backend tests
import { logger } from '../lib/logger';
logger.api.info('Test message', { data });

// Screen in component tests
import { render, screen } from '@testing-library/react';
render(<Component />);
screen.debug(); // Prints DOM tree
```

---

## Summary

GPNet3's testing strategy:

1. **Vitest for unit tests** - Fast, TypeScript-native, watch mode
2. **React Testing Library for components** - User-centric assertions
3. **Playwright for E2E** - Real browser, user workflows
4. **Comprehensive mocking** - Isolate units under test
5. **Semantic locators** - Tests follow accessibility standards
6. **170+ test files** - Broad coverage of critical paths
7. **Security testing** - Verify permission checks, validation
8. **State machine tests** - Validate allowed transitions

Test files show practical patterns for:
- Password validation with multiple requirements
- RTW state machine transitions
- Recovery timeline estimation
- Compliance rule evaluation
- Authentication flows
- Database operations with mocks
- React component rendering

