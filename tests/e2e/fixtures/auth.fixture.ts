/**
 * Auth Fixture for Playwright E2E Tests
 *
 * Provides reusable authenticatedPage fixture that handles login flow.
 * Import { test, expect } from this file instead of @playwright/test
 * to get a pre-authenticated page.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth.fixture';
 *
 *   test('my test', async ({ authenticatedPage }) => {
 *     // Page is already logged in
 *     await authenticatedPage.goto('/employer/case/s25wf307549');
 *   });
 */

import { test as base, expect, Page } from '@playwright/test';
import {
  EMPLOYER_CREDENTIALS,
  TEST_TIMEOUTS,
  URL_PATTERNS,
} from './test-data';

// Type definition for extended fixtures
type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Performs login and waits for dashboard to load.
 * Handles both fresh login and already-authenticated states.
 */
async function performLogin(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Check if already logged in by looking for dashboard indicators
  const dashboardIndicators = [
    page.locator('h1:has-text("Preventli")'),
    page.getByRole('heading', { name: /cases/i }),
    page.locator('text=cases loaded'),
  ];

  for (const indicator of dashboardIndicators) {
    if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Already authenticated, no need to login
      return;
    }
  }

  // Perform login
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  // Wait for login form to be ready
  await emailInput.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.medium });

  // Fill credentials
  await emailInput.fill(EMPLOYER_CREDENTIALS.email);
  await passwordInput.fill(EMPLOYER_CREDENTIALS.password);
  await submitButton.click();

  // Wait for successful authentication
  // Try multiple indicators for robustness
  try {
    await page.waitForURL(URL_PATTERNS.dashboard, { timeout: TEST_TIMEOUTS.medium });
  } catch {
    // URL pattern might not match, check for dashboard content instead
    const dashboardLoaded = await page.locator('h1:has-text("Preventli")').isVisible({ timeout: TEST_TIMEOUTS.medium }).catch(() => false);
    if (!dashboardLoaded) {
      // Check for error messages
      const errorMessage = await page.getByText(/error|failed|invalid/i).first().textContent().catch(() => null);
      if (errorMessage) {
        throw new Error(`Login failed: ${errorMessage}`);
      }
      throw new Error('Login timeout: Dashboard did not load. Check database and user credentials.');
    }
  }
}

/**
 * Extended test with authenticatedPage fixture.
 *
 * The fixture logs in before yielding the page to the test.
 * State is isolated per test - each test gets a fresh login.
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Perform login before test
    await performLogin(page);

    // Yield the authenticated page to the test
    await use(page);

    // Cleanup after test (optional - could add logout here)
  },
});

// Re-export expect for convenience
export { expect };

// Re-export Page type for type annotations
export type { Page };
