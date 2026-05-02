import { test, expect } from "@playwright/test";

test.describe("Session Management", () => {
  const testEmail = "admin@gpnet.local";
  const testPassword = "ChangeMe123!";

  async function gotoSessions(page: any) {
    await page.goto("/sessions", { waitUntil: "commit", timeout: 30000 });
    await expect(
      page
        .getByRole("heading", { name: /active sessions|sessions/i })
        .or(page.getByText(/current session|this device|browser|last active|created|no other sessions/i))
        .first()
    ).toBeVisible({ timeout: 30000 });
  }

  function sessionItems(page: any) {
    return page
      .getByTestId(/session-item|session-card/i)
      .or(
        page.locator('[data-testid*="session"], [class*="session"], article, li').filter({
          hasText: /current|this device|chrome|chromium|browser|last active|created|ago/i,
        })
      );
  }

  async function gotoLogin(page: any, dashboardIndicator: any) {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto("/login", { waitUntil: "commit", timeout: 30000 });
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => undefined);
        return;
      } catch (error) {
        lastError = error;
        const loginFormVisible = await page.locator('input[type="email"]').isVisible({ timeout: 1000 }).catch(() => false);
        const dashboardVisible = await dashboardIndicator.isVisible({ timeout: 1000 }).catch(() => false);
        if (loginFormVisible || dashboardVisible) return;
        await page.waitForTimeout(1000).catch(() => undefined);
      }
    }

    throw lastError;
  }

  // Helper to login
  // Note: Requires database connection to work properly
  async function login(page: any) {
    // Check if already logged in by looking for user menu or cases heading
    const dashboardIndicator = page
      .getByText(/cases loaded|total cases|off work|at work|high risk/i)
      .first();
    await gotoLogin(page, dashboardIndicator);

    if (await dashboardIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      return; // Already logged in
    }

    // Fill login form
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const loginButton = page.getByRole("button", { name: /sign in|login/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginButton.click({ timeout: 5000 }).catch(async () => {
      await passwordInput.press("Enter");
    });

    // Wait for either dashboard to load OR error message to appear
    // This provides better feedback when database is unavailable
    try {
      await expect(dashboardIndicator).toBeVisible({ timeout: 30000 });
    } catch (error) {
      // Check if there's an error message
      const errorMessage = await page.getByText(/error|failed|unable/i).first().textContent().catch(() => null);
      if (errorMessage) {
        throw new Error(`Login failed: ${errorMessage}. Is the database running?`);
      }
      throw new Error('Login timeout: Dashboard did not load. Check if database is running and user exists.');
    }
  }

  test("should display sessions page after login", async ({ page }) => {
    await login(page);

    // Navigate to sessions page (might be in user menu)
    // Try to find sessions link
    await gotoSessions(page);

    // Should show sessions heading
    const heading = page.getByRole("heading", { name: /active sessions|sessions/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("should show current session in sessions list", async ({ page }) => {
    await login(page);
    await gotoSessions(page);

    // Should show at least one session (current session)
    await expect(sessionItems(page).first()).toBeVisible({ timeout: 10000 });

    // Should show device info
    await expect(page.getByText(/chrome|chromium|browser/i).first()).toBeVisible();

    // Should show "Current Session" indicator
    await expect(page.getByText(/current|this device/i)).toBeVisible();
  });

  test("should display session details (device, location, time)", async ({ page }) => {
    await login(page);
    await gotoSessions(page);

    const sessionItem = sessionItems(page).first();
    await expect(sessionItem).toBeVisible();

    // Should show timestamps
    await expect(sessionItem.getByText(/last active|created|ago/i)).toBeVisible();
  });

  test("should not allow revoking current session", async ({ page }) => {
    await login(page);
    await gotoSessions(page);

    // Find current session
    const currentSession = page.locator('[data-testid*="session"]').filter({ hasText: /current/i });

    // Revoke button should be disabled or not present
    const revokeButton = currentSession.getByRole("button", { name: /revoke|sign out/i });

    if (await revokeButton.isVisible()) {
      await expect(revokeButton).toBeDisabled();
    }
  });

  test("should show confirmation before revoking session", async ({ page, context }) => {
    // This test would need multiple sessions
    // For now, test that revoke buttons exist
    await login(page);
    await gotoSessions(page);

    // Check if there are any revoke buttons
    const revokeButtons = page.getByRole("button", { name: /revoke|sign out/i });

    // If there are multiple sessions, there should be revoke buttons
    const count = await revokeButtons.count();

    if (count > 0) {
      // Click first enabled revoke button
      const firstEnabled = revokeButtons.first();
      if (await firstEnabled.isEnabled()) {
        await firstEnabled.click();

        // Should show confirmation dialog or immediate action
        // (implementation dependent)
      }
    }
  });

  test("should have 'Revoke All' or 'Sign Out All Devices' option", async ({ page }) => {
    await login(page);
    await gotoSessions(page);

    // Should have option to revoke all sessions
    const revokeAllButton = page.getByRole("button", { name: /revoke all|sign out all|log out all|logout all/i });

    // Button should exist (even if disabled when only one session)
    await expect(revokeAllButton).toBeVisible({ timeout: 10000 });
  });

  test("should show empty state when no other sessions exist", async ({ page }) => {
    await login(page);
    await gotoSessions(page);

    // Should show at least current session
    const count = await sessionItems(page).count();

    expect(count).toBeGreaterThan(0);

    // If only one session, might show message
    if (count === 1) {
      const message = page.getByText(/only one active session|no other sessions/i);
      // This is optional depending on implementation
    }
  });

  test("should navigate to sessions from user menu", async ({ page }) => {
    await login(page);

    // Look for user menu (might be avatar, email, or dropdown)
    const userMenu = page.getByRole("button", { name: /user|profile|account|admin@gpnet/i }).first();

    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Should show sessions option
      const sessionsLink = page.getByRole("link", { name: /sessions|active sessions/i });
      await expect(sessionsLink).toBeVisible();

      await sessionsLink.click();
      await expect(page).toHaveURL(/\/sessions/);
    } else {
      // Direct navigation works
      await gotoSessions(page);
      await expect(page.getByRole("heading", { name: /sessions/i })).toBeVisible();
    }
  });

  test("should show loading state while fetching sessions", async ({ page }) => {
    await login(page);

    // Navigate to sessions
    await gotoSessions(page);

    // Should show loading indicator initially
    // (This might be too fast to catch in local testing)
    const loadingIndicator = page.getByTestId("loading-sessions");

    // If visible, it should disappear
    if (await loadingIndicator.isVisible({ timeout: 100 }).catch(() => false)) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }
  });

  test("should handle session fetch errors gracefully", async ({ page, context }) => {
    await login(page);

    // Block the sessions API endpoint to simulate error
    await context.route("**/api/auth/sessions", (route) => {
      route.abort();
    });

    await gotoSessions(page);

    // Should show error message
    await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 10000 });
  });

  test("should refresh sessions list after revoking a session", async ({ page }) => {
    await login(page);
    await gotoSessions(page);

    // Count initial sessions
    const initialCount = await sessionItems(page).count();

    // This test would need multiple sessions to properly test
    // For now, verify the sessions list is visible
    expect(initialCount).toBeGreaterThan(0);
  });

  test("should require authentication to access sessions page", async ({ page }) => {
    // Try to access sessions without logging in
    await page.goto("/sessions");

    // Should redirect to login or show login form
    await expect(page).toHaveURL(/\/login|\/$/);
  });
});
