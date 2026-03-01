# Phase 11: System-Wide Testing - Research

**Researched:** 2026-01-28
**Domain:** End-to-End Testing, Performance Testing, Database Integrity
**Confidence:** HIGH

## Summary

This research covers comprehensive testing of the GPNet system, focusing on employer portal functionality, case management, and API integrations. The codebase already has a solid foundation with Playwright for E2E tests, Vitest for unit tests, and existing audit scripts that serve as templates for expanded coverage.

The testing strategy should follow a wave-based approach: Wave 1 tests critical authentication and navigation paths, Wave 2 covers core business workflows (case management, tabs), and Wave 3 validates performance targets and edge cases. This prioritization ensures the most important user journeys are verified first while building toward comprehensive coverage.

**Primary recommendation:** Use Playwright with test tagging (@smoke, @critical, @regression) for organized E2E coverage, with performance metrics captured via Node.js performance hooks and Artillery for load testing.

## Standard Stack

### Core Testing Tools (Already in Project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | 1.58.0 | E2E browser testing | Industry standard, built-in auto-wait, excellent debugging |
| Vitest | 1.5.0 | Unit/integration testing | Vite-native, fast, compatible with existing setup |
| @testing-library/react | 16.3.0 | Component testing | User-centric testing approach, RTL best practices |

### Performance Testing (Recommended Additions)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Artillery | 2.x | Load testing, API performance | Testing API response time targets (<5s) |
| perf_hooks (Node.js) | built-in | Performance measurement | Server-side timing, metric collection |

### Supporting (Already Available)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supertest | 7.1.4 | API endpoint testing | Integration tests without browser |
| happy-dom | 20.0.11 | Fast DOM simulation | Unit tests for React components |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Artillery | k6 | k6 has better scripting but Artillery is JS-native |
| Playwright | Cypress | Playwright faster, better multi-tab support |

**Installation (Performance testing additions only):**
```bash
npm install -D artillery@latest
```

## Architecture Patterns

### Recommended Test Directory Structure
```
tests/
├── e2e/                           # Playwright E2E tests
│   ├── auth/                      # Authentication flows
│   │   ├── employer-login.spec.ts
│   │   └── session-management.spec.ts
│   ├── cases/                     # Case management
│   │   ├── case-list.spec.ts
│   │   ├── case-detail-tabs.spec.ts
│   │   └── new-case-flow.spec.ts
│   ├── employer/                  # Employer portal
│   │   ├── dashboard.spec.ts
│   │   └── rtw-planner.spec.ts
│   └── fixtures/                  # Shared test utilities
│       ├── auth.fixture.ts        # Login helper
│       └── test-data.ts           # Test constants
├── integration/                   # API integration tests
│   ├── api/
│   │   ├── employer-dashboard.test.ts
│   │   └── case-endpoints.test.ts
│   └── performance/
│       └── response-times.test.ts
└── unit/                          # Unit tests
    ├── client/                    # React component tests
    └── server/                    # Service/utility tests
```

### Pattern 1: Test Tagging for Wave-Based Execution

**What:** Organize tests with tags for prioritized execution
**When to use:** Always - enables running critical tests first in CI/CD

```typescript
// Source: Playwright documentation - test tagging
import { test, expect } from '@playwright/test';

// Wave 1: Critical path tests (@smoke, @critical)
test.describe('Authentication', { tag: ['@smoke', @critical'] }, () => {
  test('employer can login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'employer@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/employer|\/cases/);
  });
});

// Wave 2: Business flow tests (@regression)
test.describe('Case Detail Tabs', { tag: '@regression' }, () => {
  test('all 7 tabs render with real data', { tag: '@critical' }, async ({ page }) => {
    // Test implementation
  });
});

// Wave 3: Performance validation (@performance)
test.describe('API Performance', { tag: '@performance' }, () => {
  test('dashboard loads within 5s target', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/employer');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
});
```

**Run by wave:**
```bash
# Wave 1: Smoke tests (run first, fast feedback)
npx playwright test --grep "@smoke"

# Wave 2: Critical + Regression tests
npx playwright test --grep "@critical|@regression"

# Wave 3: Full suite including performance
npx playwright test
```

### Pattern 2: Authentication Fixture for Reusability

**What:** Shared authentication setup to avoid login repetition
**When to use:** All tests requiring authenticated state

```typescript
// tests/e2e/fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';

// Test credentials from existing scripts
const EMPLOYER_CREDENTIALS = {
  email: 'employer@test.com',
  password: 'password123'
};

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', EMPLOYER_CREDENTIALS.email);
    await page.fill('input[type="password"]', EMPLOYER_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/employer|\/cases/, { timeout: 15000 });
    await use(page);
  },
});

export { expect };
```

### Pattern 3: API Performance Testing with Timing

**What:** Measure and assert API response times
**When to use:** Verifying performance targets (<5s responses)

```typescript
// tests/integration/performance/response-times.test.ts
import { describe, it, expect } from 'vitest';

const API_BASE = 'http://localhost:5000/api';
const PERFORMANCE_TARGET_MS = 5000;

describe('API Performance', () => {
  it('employer dashboard responds within target', async () => {
    // Login first to get auth token
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employer@test.com', password: 'password123' })
    });
    const cookies = loginRes.headers.get('set-cookie');

    // Time the dashboard request
    const startTime = performance.now();
    const res = await fetch(`${API_BASE}/employer/dashboard`, {
      headers: { Cookie: cookies || '' }
    });
    const responseTime = performance.now() - startTime;

    expect(res.status).toBe(200);
    expect(responseTime).toBeLessThan(PERFORMANCE_TARGET_MS);
    console.log(`Dashboard response time: ${responseTime.toFixed(0)}ms`);
  });
});
```

### Anti-Patterns to Avoid

- **Hardcoded waits:** Use Playwright's auto-wait and `waitForSelector` instead of `waitForTimeout`
- **Shared test state:** Each test should start fresh; use authentication fixtures properly
- **Testing implementation details:** Focus on user-visible behavior, not internal state
- **Ignoring flaky tests:** Fix flakiness with better selectors or explicit waits

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom Puppeteer wrapper | Playwright built-in API | Auto-wait, better debugging, cross-browser |
| Test assertions | Custom matchers | @playwright/test expect + jest-dom | Comprehensive, maintained |
| Performance metrics | Manual timing code | Node.js performance hooks | Accurate, consistent, built-in |
| Load testing | DIY concurrent requests | Artillery | Handles ramp-up, reporting, analysis |
| Test data management | Inline fixtures | Shared fixture files | DRY, maintainable |

**Key insight:** Testing infrastructure benefits enormously from mature tools that handle edge cases (retries, timeouts, reporting) that are tedious to implement correctly.

## Common Pitfalls

### Pitfall 1: Infinite Loop on 401 Errors

**What goes wrong:** Application retries failed auth requests indefinitely
**Why it happens:** Missing error handling, automatic retry logic without backoff
**How to avoid:** Test explicitly for 401 handling - verify app shows login page, not spinning/looping
**Warning signs:** Test timeouts, browser memory usage spikes

```typescript
test('handles 401 without infinite loop', async ({ page }) => {
  // Intercept auth to force 401
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401 }));

  await page.goto('/cases');

  // Should redirect to login, not loop
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

  // Verify no excessive network requests
  const requests = await page.evaluate(() => performance.getEntriesByType('resource').length);
  expect(requests).toBeLessThan(50); // Reasonable threshold
});
```

### Pitfall 2: Slow API Responses Not Caught Early

**What goes wrong:** Performance degradation discovered in production
**Why it happens:** No performance assertions in tests, only functional checks
**How to avoid:** Add timing assertions to critical endpoint tests
**Warning signs:** Tests pass but users report slowness

### Pitfall 3: Test Data Dependency Issues

**What goes wrong:** Tests fail because expected data doesn't exist
**Why it happens:** Assuming seed data is present, no data setup in tests
**How to avoid:** Use fixtures that ensure required data exists OR explicitly create test data
**Warning signs:** Tests pass locally but fail in CI

### Pitfall 4: Flaky Certificate/Image Display Tests

**What goes wrong:** Recovery chart certificate dots don't display consistently
**Why it happens:** Timing issues, async data loading, image loading race conditions
**How to avoid:** Wait for specific data-testid elements, not general page load
**Warning signs:** Intermittent test failures on same test

```typescript
// Good: Wait for specific rendered content
await expect(page.getByTestId('certificate-dot-1')).toBeVisible({ timeout: 10000 });

// Bad: Wait for page then assume content
await page.waitForLoadState('networkidle');
expect(await page.locator('.cert-dot').count()).toBeGreaterThan(0);
```

### Pitfall 5: Rate Limit Misconfiguration

**What goes wrong:** Tests hit rate limits (currently at 100000, should be 10000)
**Why it happens:** Debug settings left in place, different limits in test vs prod
**How to avoid:** Verify rate limit in test setup, use separate test rate limits
**Warning signs:** Sporadic 429 errors, inconsistent test behavior

## Code Examples

### Complete E2E Test for Case Detail Tabs

```typescript
// tests/e2e/cases/case-detail-tabs.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

const TABS = ['summary', 'injury', 'timeline', 'treatment', 'contacts', 'financial', 'risk'];

test.describe('Case Detail Tabs', { tag: '@regression' }, () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to cases and open first case
    await page.goto('/cases');
    await page.waitForSelector('[data-testid^="row-case-"]');
    await page.locator('[data-testid^="row-case-"]').first().click();
    await page.waitForSelector('[data-testid="case-detail-panel"]');
  });

  for (const tab of TABS) {
    test(`${tab} tab loads without errors`, { tag: '@critical' }, async ({ authenticatedPage: page }) => {
      const tabButton = page.locator(`[value="${tab}"], button:has-text("${tab}")`).first();
      await tabButton.click();

      // Wait for tab content to load
      await page.waitForTimeout(500); // Brief wait for content transition

      // Verify no error states
      const errorVisible = await page.locator('text=/Error|Failed|undefined/i').isVisible();
      expect(errorVisible).toBe(false);

      // Verify some content loaded (not empty)
      const tabContent = page.locator('[role="tabpanel"]');
      await expect(tabContent).not.toBeEmpty();
    });
  }
});
```

### API Performance Test Suite

```typescript
// tests/integration/performance/api-benchmarks.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:5000/api';
const TIMEOUT_MS = 60000; // Match existing playwright timeout

describe('API Response Time Benchmarks', () => {
  let authCookie: string;

  beforeAll(async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employer@test.com', password: 'password123' })
    });
    authCookie = res.headers.get('set-cookie') || '';
  });

  const endpoints = [
    { path: '/employer/dashboard', target: 5000, name: 'Dashboard' },
    { path: '/gpnet2/cases', target: 5000, name: 'Cases List' },
    { path: '/employer/workers', target: 3000, name: 'Workers List' },
  ];

  for (const { path, target, name } of endpoints) {
    it(`${name} responds within ${target}ms`, async () => {
      const start = performance.now();
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Cookie: authCookie }
      });
      const elapsed = performance.now() - start;

      console.log(`${name}: ${elapsed.toFixed(0)}ms`);
      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(target);
    }, TIMEOUT_MS);
  }
});
```

### Database Integrity Verification

```typescript
// tests/integration/database/integrity.test.ts
import { describe, it, expect } from 'vitest';
import { db } from '../../../server/db';
import { workerCases, medicalCertificates, caseActions } from '../../../shared/schema';
import { sql } from 'drizzle-orm';

describe('Database Integrity', () => {
  it('all certificates reference valid cases', async () => {
    const orphanCerts = await db.execute(sql`
      SELECT mc.id, mc.case_id
      FROM medical_certificates mc
      LEFT JOIN worker_cases wc ON mc.case_id = wc.id
      WHERE wc.id IS NULL
    `);
    expect(orphanCerts.rows).toHaveLength(0);
  });

  it('all actions reference valid cases', async () => {
    const orphanActions = await db.execute(sql`
      SELECT ca.id, ca.case_id
      FROM case_actions ca
      LEFT JOIN worker_cases wc ON ca.case_id = wc.id
      WHERE wc.id IS NULL
    `);
    expect(orphanActions.rows).toHaveLength(0);
  });

  it('no duplicate case IDs exist', async () => {
    const duplicates = await db.execute(sql`
      SELECT id, COUNT(*) as count
      FROM worker_cases
      GROUP BY id
      HAVING COUNT(*) > 1
    `);
    expect(duplicates.rows).toHaveLength(0);
  });
});
```

## Testing Wave Structure

### Wave 1: Smoke Tests (Run First - ~2 min)
**Tag:** `@smoke`
**Purpose:** Catch catastrophic failures fast
**Tests:**
- [ ] Server starts and responds to health check
- [ ] Login page renders
- [ ] Authentication succeeds with valid credentials
- [ ] Main navigation works
- [ ] No 401 infinite loop on session expiry

### Wave 2: Critical Path Tests (~10 min)
**Tag:** `@critical`
**Purpose:** Verify core business functionality
**Tests:**
- [ ] Employer dashboard loads with data
- [ ] Case list displays cases
- [ ] All 7 case detail tabs render
- [ ] New case creation flow completes
- [ ] API responses return 200 status
- [ ] Certificate display works

### Wave 3: Regression Tests (~20 min)
**Tag:** `@regression`
**Purpose:** Full functional coverage
**Tests:**
- [ ] Filter and pagination on case list
- [ ] RTW Planner integration
- [ ] Smart summary generation
- [ ] Session management page
- [ ] Error handling (invalid data, network failures)
- [ ] Recovery chart certificate dots

### Wave 4: Performance Tests (~5 min)
**Tag:** `@performance`
**Purpose:** Verify response time targets
**Tests:**
- [ ] Dashboard loads <5s
- [ ] Case list API <5s
- [ ] Case detail API <5s
- [ ] No endpoints >10s (identify slow ones: 8-63s issue)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual testing scripts (CJS) | Playwright spec files | Project has both | Move to Playwright for CI integration |
| waitForTimeout | Auto-wait + explicit selectors | Playwright 1.x | More reliable, less flaky |
| Single test file | Tagged, categorized tests | Best practice | Enables wave execution |

**Deprecated/outdated:**
- `scripts/employer-portal-audit.cjs` - Manual script, good patterns but should be ported to Playwright specs
- `scripts/test-new-case-flow.cjs` - Same, port to E2E tests

## Open Questions

1. **Rate limit reset timing**
   - What we know: Currently set to 100000 (debug mode), needs reset to 10000
   - What's unclear: Should tests run with different rate limits?
   - Recommendation: Reset before Phase 11 execution, or use test-specific rate limit config

2. **Test data seed strategy**
   - What we know: Tests use `employer@test.com` / `password123`
   - What's unclear: Is this user consistently available in all environments?
   - Recommendation: Add test data seeding to playwright.config.ts setup

3. **Performance baseline**
   - What we know: Some endpoints take 8-63 seconds
   - What's unclear: Which specific endpoints, under what conditions?
   - Recommendation: First run performance tests to establish baseline, then set targets

## Sources

### Primary (HIGH confidence)
- [Playwright Documentation](https://playwright.dev/) - Test tagging, best practices, API reference
- [Vitest Documentation](https://vitest.dev/) - Test configuration, performance profiling
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Component testing patterns

### Secondary (MEDIUM confidence)
- [BrowserStack Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices) - Test organization patterns
- [Node.js Performance Hooks Documentation](https://nodejs.org/api/perf_hooks.html) - Performance measurement APIs
- [Artillery Documentation](https://www.artillery.io/docs) - Load testing configuration

### Tertiary (LOW confidence - needs validation)
- Community patterns for wave-based test execution (verify with project needs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Tools already in project, well-documented
- Architecture: HIGH - Based on existing codebase structure and Playwright best practices
- Pitfalls: MEDIUM - Based on known issues from context, may have additional undocumented issues

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable testing patterns)
