---
phase: quick
plan: 001
title: "Fix Smoke Test Failures"
subsystem: testing
tags: [playwright, e2e, smoke-tests, routes, auth]

requires:
  - Phase 11 test infrastructure

provides:
  - All 17 smoke tests passing
  - /employer and /logout routes working
  - Reliable test assertions

affects:
  - Phase 11 verification (now unblocked)

tech-stack:
  added: []
  patterns:
    - LogoutRedirect component pattern for auth flow
    - Playwright .or() locator composition

key-files:
  created: []
  modified:
    - client/src/App.tsx
    - tests/e2e/smoke/auth.spec.ts
    - tests/e2e/smoke/navigation.spec.ts

decisions:
  - name: "LogoutRedirect waits for auth state"
    rationale: "Prevents race condition where LoginPage redirects back to / before logout completes"
    commit: 8537862

metrics:
  duration: "~12 minutes"
  completed: "2026-01-28"
  tests-fixed: 5
  tests-total: 17
---

# Quick Task 001: Fix Smoke Test Failures Summary

**Fixed 5 failing smoke tests to unblock Phase 11 verification - all 17 tests now pass**

## What Was Done

### Root Cause Analysis

The 5 failing smoke tests had these root causes:

1. **logout redirect (auth.spec.ts:58)** - No `/logout` route existed
2. **protected route redirect (auth.spec.ts:78)** - No `/employer` route existed
3. **special characters (auth.spec.ts:86)** - Test checking full HTML for "500" was fragile
4. **cases timeout (navigation.spec.ts:19)** - `networkidle` wait too slow + locator syntax error
5. **employer 500 (navigation.spec.ts:28)** - Missing `/employer` route + HTML content checks

### Fixes Applied

| Issue | Root Cause | Fix |
|-------|------------|-----|
| logout redirect | No /logout route | Added LogoutRedirect component with auth state handling |
| protected route | No /employer route | Added /employer route with EmployerDashboardPage |
| special chars | HTML content check | Changed to innerText check, regex pattern for 500 |
| cases timeout | networkidle + locator | Changed to domcontentloaded, fixed .or() locator |
| employer 500 | Missing route | Fixed by /employer route addition |

### Key Implementation Details

**LogoutRedirect Component:**
```tsx
function LogoutRedirect() {
  const { logout, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);

  // Wait for auth state to settle before redirecting
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <PageLoader />; // Still logging out
}
```

This prevents a race condition where:
1. User visits /logout
2. LogoutRedirect calls logout() which navigates to /login
3. LoginPage sees user as still authenticated and redirects to /
4. User ends up at / instead of /login

**Locator Fix:**
```typescript
// Before (broken - "i, table" parsed as regex flags)
page.locator('text=/cases|worker/i, table')

// After (correct - use .or() for multiple locators)
page.locator('text=/cases|worker/i').or(page.locator('table'))
```

## Commits

| Hash | Description |
|------|-------------|
| eda9216 | Add /employer and /logout routes to App.tsx |
| d5e5539 | Improve smoke test reliability and assertions |
| 8537862 | Fix logout race condition and locator syntax |

## Test Results

```
17 passed (3.7m)

Health Check:
  - server responds to root URL
  - login page renders
  - API health endpoint responds
  - static assets load correctly

Authentication:
  - login succeeds with valid credentials
  - login fails gracefully with invalid credentials
  - 401 error does not cause infinite loop
  - logout works correctly
  - protected route redirects to login when not authenticated
  - login page does not crash with special characters

Navigation:
  - dashboard is accessible after login
  - cases page is accessible
  - employer portal routes work
  - sidebar/nav links are present
  - page titles update on navigation
  - back navigation works
  - direct URL access works for known routes
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Race condition in LogoutRedirect**
- **Found during:** Task 1 verification
- **Issue:** Initial LogoutRedirect always rendered `<Navigate to="/login">` which caused race with LoginPage's auth redirect
- **Fix:** Wait for `isAuthenticated` to become false before navigating
- **Commit:** 8537862

**2. [Rule 1 - Bug] Locator syntax error in cases test**
- **Found during:** Task 3 test run
- **Issue:** `text=/cases|worker/i, table` was parsed as regex with invalid flags
- **Fix:** Use `.or()` method to combine locators
- **Commit:** 8537862

## Next Phase Readiness

Phase 11 verification is now unblocked:
- All smoke tests pass (17/17)
- User can proceed with full test suite verification
- No blockers remaining

## Files Modified

- `client/src/App.tsx` - Added /employer route, /logout route with LogoutRedirect
- `tests/e2e/smoke/auth.spec.ts` - Improved special characters assertion
- `tests/e2e/smoke/navigation.spec.ts` - Fixed locator, improved wait strategies
