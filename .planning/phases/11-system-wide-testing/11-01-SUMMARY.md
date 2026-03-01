---
phase: 11-system-wide-testing
plan: 01
subsystem: testing-infrastructure
tags: [playwright, e2e, fixtures, testing]

dependency-graph:
  requires: []
  provides:
    - reusable-auth-fixture
    - test-data-constants
    - wave-based-test-execution
  affects:
    - 11-02 (smoke tests will use fixture)
    - 11-03 (critical path tests will use fixture)
    - 11-04 (regression tests will use fixture)
    - 11-05 (performance tests will use fixture)
    - 11-06 (accessibility tests will use fixture)

tech-stack:
  added: []
  patterns:
    - playwright-fixtures
    - test-data-centralization
    - grep-based-filtering

key-files:
  created:
    - tests/e2e/fixtures/auth.fixture.ts
    - tests/e2e/fixtures/test-data.ts
  modified:
    - playwright.config.ts
    - package.json

decisions:
  - id: fixture-pattern
    summary: Use Playwright extended fixtures for reusable authentication
    rationale: Provides consistent login across all tests without duplication

metrics:
  duration: ~5 minutes
  completed: 2026-01-28
---

# Phase 11 Plan 01: Test Infrastructure Setup Summary

**One-liner:** Playwright auth fixture with TEST_GREP wave-based filtering for smoke/critical/regression/performance test execution.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create auth fixture for reusable login | ff437d0 | tests/e2e/fixtures/auth.fixture.ts, tests/e2e/fixtures/test-data.ts |
| 2 | Update Playwright config for wave-based tagging | a148052 | playwright.config.ts |
| 3 | Add npm scripts for wave-based test execution | e1ebc39 | package.json |

## What Was Built

### 1. Auth Fixture (`tests/e2e/fixtures/auth.fixture.ts`)

Reusable Playwright fixture that provides an already-authenticated page:

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('my test', async ({ authenticatedPage }) => {
  // Page is already logged in - no need for manual login
  await authenticatedPage.goto('/employer/case/s25wf307549');
});
```

Features:
- Exports extended `test` and `expect` from Playwright
- Provides `authenticatedPage` fixture that logs in before each test
- Handles already-authenticated state (no redundant logins)
- Includes error handling with descriptive messages

### 2. Test Data Constants (`tests/e2e/fixtures/test-data.ts`)

Centralized test data for consistency:

```typescript
export const ADMIN_CREDENTIALS = { email: 'admin@gpnet.local', password: 'ChangeMe123!' };
export const EMPLOYER_CREDENTIALS = { email: 'employer@test.com', password: 'password123' };
export const TEST_CASE_IDS = ['s25wf307549'];
export const PERFORMANCE_TARGETS = { dashboard: 5000, caseList: 5000, caseDetail: 5000 };
export const TEST_TIMEOUTS = { short: 5000, medium: 15000, long: 30000, extended: 60000 };
export const URL_PATTERNS = { login: /\/login/, dashboard: /\/employer|\/cases/, ... };
```

### 3. Wave-Based Test Execution

Playwright config now supports grep-based filtering:

```bash
# Run by wave
npm run test:e2e:smoke       # @smoke tagged tests (~2 min)
npm run test:e2e:critical    # @critical tagged tests (~10 min)
npm run test:e2e:regression  # @regression tagged tests
npm run test:e2e:performance # @performance tagged tests
npm run test:e2e:all         # All tests
npm run test:e2e:report      # Open HTML report
```

Tag tests in spec files:
```typescript
test.describe('@smoke Login Tests', () => { ... });
test('@critical should create case', async () => { ... });
```

## Verification Results

- [x] `npm run build` passes (TypeScript compiles)
- [x] Auth fixture exports `test` and `expect`
- [x] Test data exports all credential and constant types
- [x] Playwright config has grep filtering
- [x] npm scripts exist for wave-based execution

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

1. **Auth fixture pattern**: Uses `test.extend<AuthFixtures>()` to add `authenticatedPage` fixture
2. **Credential safety**: Test credentials are only for test accounts, never production
3. **Performance targets**: Set at 5000ms baseline, can be adjusted based on real performance data
4. **grep vs grepInvert**: Using `grep` only (not `grepInvert`) for simpler positive matching

## Next Phase Readiness

Phase 11-02 (Smoke Tests) can now use:
- `import { test, expect } from '../fixtures/auth.fixture'`
- `import { ADMIN_CREDENTIALS, TEST_CASE_IDS } from '../fixtures/test-data'`
- Tag tests with `@smoke` for wave-based filtering
