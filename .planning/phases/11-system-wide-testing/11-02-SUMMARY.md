---
phase: 11-system-wide-testing
plan: 02
subsystem: smoke-tests
tags: [playwright, e2e, smoke, authentication, navigation]

dependency-graph:
  requires:
    - 11-01 (auth fixture, test-data constants)
  provides:
    - health-smoke-tests
    - auth-smoke-tests
    - navigation-smoke-tests
  affects:
    - 11-03 (critical path tests build on smoke foundation)
    - CI/CD pipeline (smoke tests run first)

tech-stack:
  added: []
  patterns:
    - playwright-describe-tags
    - 401-infinite-loop-detection
    - auth-fixture-reuse

key-files:
  created:
    - tests/e2e/smoke/health.spec.ts
    - tests/e2e/smoke/auth.spec.ts
    - tests/e2e/smoke/navigation.spec.ts
  modified: []

decisions:
  - id: smoke-directory
    summary: Organize smoke tests in dedicated tests/e2e/smoke/ directory
    rationale: Clear separation from other test types, easy to run with glob patterns

  - id: 401-loop-detection
    summary: Include explicit 401 infinite loop detection test
    rationale: Critical regression from research findings - auth errors must not cause loops

metrics:
  duration: ~4 minutes
  completed: 2026-01-28
---

# Phase 11 Plan 02: Smoke Tests Summary

**One-liner:** Health, auth, and navigation smoke tests with @smoke tags for fast CI feedback and 401 infinite loop detection.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create health check smoke test | c486876 | tests/e2e/smoke/health.spec.ts |
| 2 | Create authentication smoke tests | 4f081c2 | tests/e2e/smoke/auth.spec.ts |
| 3 | Create navigation smoke tests | 7baf889 | tests/e2e/smoke/navigation.spec.ts |

## What Was Built

### 1. Health Check Smoke Tests (`tests/e2e/smoke/health.spec.ts`)

Fundamental server health verification:

- **server responds to root URL** - Verifies server returns non-500 status
- **login page renders** - Checks email, password inputs, and submit button visible
- **API health endpoint responds** - Tests /api/health or root responds OK
- **static assets load correctly** - Verifies JS/CSS load and page has content

### 2. Authentication Smoke Tests (`tests/e2e/smoke/auth.spec.ts`)

Core authentication flow verification:

- **login succeeds with valid credentials** - Uses EMPLOYER_CREDENTIALS from test-data.ts
- **login fails gracefully with invalid credentials** - Shows error, stays on login page
- **401 error does not cause infinite loop** - CRITICAL: Intercepts /api/auth/me with 401, verifies < 50 requests
- **logout works correctly** - Login then logout, returns to login page
- **protected route redirects to login** - Unauthenticated access to /employer redirects
- **special characters handled safely** - XSS and SQL injection payloads don't crash page

### 3. Navigation Smoke Tests (`tests/e2e/smoke/navigation.spec.ts`)

Post-login navigation verification using auth fixture:

- **dashboard is accessible after login** - Uses authenticatedPage fixture
- **cases page is accessible** - Navigates to /cases, sees cases content
- **employer portal routes work** - Tests /, /cases, /employer don't 404/500
- **sidebar/nav links are present** - At least one nav link exists
- **page titles update on navigation** - Titles are non-empty
- **back navigation works** - Browser back button returns to previous page
- **direct URL access works** - Direct URL to /employer loads content

## Test Count

| File | Tests |
|------|-------|
| health.spec.ts | 4 |
| auth.spec.ts | 6 |
| navigation.spec.ts | 7 |
| **Total** | **17** |

## Running Smoke Tests

```bash
# Run all smoke tests
npm run test:e2e:smoke

# Or directly with Playwright
npx playwright test --grep @smoke
```

Expected runtime: ~2 minutes (before full regression suite).

## Verification Results

- [x] 3 smoke test files exist in tests/e2e/smoke/
- [x] All tests tagged with @smoke
- [x] Health checks verify server responds
- [x] Auth tests include 401 infinite loop detection
- [x] Navigation tests use auth fixture
- [x] TypeScript compiles (npm run build)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

1. **401 Infinite Loop Detection**: Uses `context.route()` to intercept /api/auth/me and return 401, then counts requests over 2 seconds. If > 50 requests, indicates a loop.

2. **Auth Fixture Reuse**: Navigation tests import from `../fixtures/auth.fixture` to get pre-authenticated `authenticatedPage`.

3. **XSS/SQL Injection Test**: Added security test for special characters in login form - verifies no 500 error or raw error display.

## Next Phase Readiness

Phase 11-03 (Critical Path Tests) can now build on this foundation:
- Smoke tests provide baseline health verification
- Auth fixture pattern established
- Wave-based execution ready (`npm run test:e2e:smoke` runs first)
