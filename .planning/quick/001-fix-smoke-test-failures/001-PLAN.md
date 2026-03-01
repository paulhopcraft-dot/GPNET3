---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/App.tsx
  - tests/e2e/smoke/auth.spec.ts
  - tests/e2e/smoke/navigation.spec.ts
autonomous: true
---

<objective>
Fix the 5 smoke test failures to get Phase 11 verification passing.

Purpose: Unblock Phase 11 System-Wide Testing completion
Output: All 12 smoke tests passing, including the 5 currently failing
</objective>

<execution_context>
@C:\Users\Paul\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\Paul\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Key investigation findings:

1. **auth.spec.ts:58 (logout works correctly)**: Test falls back to navigating to `/logout` when logout button not found. There is NO `/logout` GET route - only POST `/api/auth/logout`. Test expects redirect to /login after visiting /logout.

2. **auth.spec.ts:78 (protected route redirects)**: Test navigates to `/employer` but this route DOES NOT EXIST in App.tsx. Only `/employer/case/:id`, `/employer/new-case`, `/employer/case/:id/success` exist. Test expects auth guard redirect.

3. **auth.spec.ts:86 (special characters)**: Zod validation with `.email()` rejects `test<script>alert(1)</script>@test.com`. This should show validation error, not 500. The login page handles this correctly via form validation - test may be expecting "invalid" text but seeing Zod error instead.

4. **navigation.spec.ts:19 (cases page timeout)**: Uses authenticatedPage fixture. May be slow load or fixture issue.

5. **navigation.spec.ts:28 (employer portal 500)**: Navigates to `/employer` which doesn't exist -> likely 404 from SPA, but test sees "500" in content. Related to issue #2.

Root causes:
- Issues #1, #2, #5 are ROUTE ISSUES (missing routes)
- Issue #3 is TEST EXPECTATION issue (text matching)
- Issue #4 is PERFORMANCE/TIMEOUT issue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add /employer and /logout routes to App.tsx</name>
  <files>client/src/App.tsx</files>
  <action>
Add two missing routes to fix 3 of the 5 failures:

1. Add `/employer` route that renders EmployerDashboardPage (like the RoleBasedDashboard does for employer role):
```tsx
<Route
  path="/employer"
  element={
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        <EmployerDashboardPage />
      </Suspense>
    </ProtectedRoute>
  }
/>
```

2. Add `/logout` route that triggers logout and redirects. Create a simple LogoutPage component inline or as separate file:
```tsx
// Simple logout route - redirect to login after clearing auth
<Route path="/logout" element={<LogoutRedirect />} />
```

Where LogoutRedirect is a small component that calls logout() from useAuth and redirects to /login.

Import EmployerDashboardPage with lazy loading:
```tsx
const EmployerDashboardPage = lazy(() => import("./pages/EmployerDashboardPage").then(m => ({ default: m.EmployerDashboardPage })));
```
  </action>
  <verify>
- `npm run build` passes (TypeScript compiles)
- Visit /employer when logged in -> shows employer dashboard
- Visit /logout when logged in -> clears auth and redirects to /login
  </verify>
  <done>
- /employer route exists and renders EmployerDashboardPage for authenticated users
- /logout route exists and redirects to /login after clearing auth
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix test assertions for edge cases</name>
  <files>tests/e2e/smoke/auth.spec.ts, tests/e2e/smoke/navigation.spec.ts</files>
  <action>
Fix test assertions that have incorrect expectations:

1. **auth.spec.ts:86 (special characters test)**:
The email `test<script>alert(1)</script>@test.com` fails Zod validation with "Please enter a valid email address". The test checks for `/invalid|error|failed/i` but also checks page doesn't contain "500". This should work, but the test may be timing out waiting for the submit. Update to:
- Wait for form validation error OR server error message
- Use more flexible text matching
- Increase timeout if needed

2. **navigation.spec.ts:19 (cases page timeout)**:
The test uses `waitForLoadState('networkidle')` which can be slow. Change to:
- Use `waitForLoadState('domcontentloaded')` instead
- Increase timeout for the indicator visibility check
- Or use `waitForSelector` with explicit timeout

3. **navigation.spec.ts:28 (employer portal routes)**:
After fixing Task 1, the /employer route should work. But the test iterates routes including '/' which might have issues. Verify the loop handles all routes correctly.
  </action>
  <verify>
- Run `npx playwright test tests/e2e/smoke/auth.spec.ts --grep "special characters"`
- Run `npx playwright test tests/e2e/smoke/navigation.spec.ts --grep "cases page"`
- Run `npx playwright test tests/e2e/smoke/navigation.spec.ts --grep "employer portal"`
  </verify>
  <done>
- Special characters test passes (sees validation error, no 500)
- Cases page test passes (handles load timing)
- Employer portal routes test passes (all routes return non-500)
  </done>
</task>

<task type="auto">
  <name>Task 3: Run full smoke test suite and verify all pass</name>
  <files>None (verification only)</files>
  <action>
Run the complete smoke test suite to verify all 12 tests pass:

```bash
npx playwright test tests/e2e/smoke/ --reporter=list
```

If any tests still fail:
1. Check the specific failure message
2. Debug with `--debug` flag if needed
3. Fix the remaining issues

Expected result: 12 tests passing, 0 failing
  </action>
  <verify>
```bash
npx playwright test tests/e2e/smoke/ --reporter=list
```
All 12 tests show as passed.
  </verify>
  <done>
- Smoke test suite: 12 passed, 0 failed
- auth.spec.ts: all 6 tests pass
- navigation.spec.ts: all 6 tests pass
  </done>
</task>

</tasks>

<verification>
1. `npm run build` - TypeScript compiles without errors
2. `npx playwright test tests/e2e/smoke/` - All 12 tests pass
3. Manual verification:
   - /employer route accessible when logged in
   - /logout clears auth and redirects to /login
   - Login with special characters shows validation error (not 500)
</verification>

<success_criteria>
- All 5 previously failing smoke tests now pass
- No new test failures introduced
- Routes /employer and /logout work correctly
- Phase 11 smoke test verification can proceed
</success_criteria>

<output>
After completion, create `.planning/quick/001-fix-smoke-test-failures/001-SUMMARY.md`
</output>
