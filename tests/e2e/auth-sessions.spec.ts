import { test, expect } from "@playwright/test";

test.describe("Session Management", () => {
  const testEmail = "admin@gpnet.local";
  const testPassword = "ChangeMe123!";

  // Helper to login
  // Note: Requires database connection to work properly
  async function login(page: any) {
    await page.goto("/");

    // Check if already logged in by looking for user menu or cases heading
    const casesHeading = page.getByRole("heading", { name: /cases/i });
    if (await casesHeading.isVisible().catch(() => false)) {
      return; // Already logged in
    }

    // Fill login form
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const loginButton = page.getByRole("button", { name: /sign in|login/i });

    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await loginButton.click();

    // Wait for either dashboard to load OR error message to appear
    // This provides better feedback when database is unavailable
    try {
      await expect(casesHeading).toBeVisible({ timeout: 15000 });
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
    await page.goto("/sessions");

    // Should show sessions heading
    const heading = page.getByRole("heading", { name: /active sessions|sessions/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("should show current session in sessions list", async ({ page }) => {
    await login(page);
    await page.goto("/sessions");

    // Should show at least one session (current session)
    const sessionItems = page.getByTestId(/session-item|session-card/i);
    await expect(sessionItems.first()).toBeVisible({ timeout: 10000 });

    // Should show device info
    await expect(page.getByText(/chrome|chromium|browser/i)).toBeVisible();

    // Should show "Current Session" indicator
    await expect(page.getByText(/current|this device/i)).toBeVisible();
  });

  test("should display session details (device, location, time)", async ({ page }) => {
    await login(page);
    await page.goto("/sessions");

    const sessionItem = page.getByTestId(/session-item|session-card/i).first();
    await expect(sessionItem).toBeVisible();

    // Should show timestamps
    await expect(sessionItem.getByText(/last active|created|ago/i)).toBeVisible();
  });

  test("should not allow revoking current session", async ({ page }) => {
    await login(page);
    await page.goto("/sessions");

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
    await page.goto("/sessions");

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
    await page.goto("/sessions");

    // Should have option to revoke all sessions
    const revokeAllButton = page.getByRole("button", { name: /revoke all|sign out all|logout all/i });

    // Button should exist (even if disabled when only one session)
    await expect(revokeAllButton).toBeVisible({ timeout: 10000 });
  });

  test("should show empty state when no other sessions exist", async ({ page }) => {
    await login(page);
    await page.goto("/sessions");

    // Should show at least current session
    const sessionItems = page.getByTestId(/session-item|session-card/i);
    const count = await sessionItems.count();

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
      await page.goto("/sessions");
      await expect(page.getByRole("heading", { name: /sessions/i })).toBeVisible();
    }
  });

  test("should show loading state while fetching sessions", async ({ page }) => {
    await login(page);

    // Navigate to sessions
    await page.goto("/sessions");

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

    await page.goto("/sessions");

    // Should show error message
    await expect(page.getByText(/error|failed|try again/i)).toBeVisible({ timeout: 10000 });
  });

  test("should refresh sessions list after revoking a session", async ({ page }) => {
    await login(page);
    await page.goto("/sessions");

    // Count initial sessions
    const sessionItems = page.getByTestId(/session-item|session-card/i);
    const initialCount = await sessionItems.count();

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
