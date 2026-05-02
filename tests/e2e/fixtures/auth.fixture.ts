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

async function waitThroughRenderWake(page: Page, targetPath: string): Promise<void> {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    const isRenderWakePage = await page
      .getByText(/Application loading|Service waking up|Allocating compute resources/i)
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    if (!isRenderWakePage) return;

    await page.waitForTimeout(5000);
    await page.goto(targetPath, { waitUntil: "commit" }).catch(() => undefined);
    await page.waitForLoadState("domcontentloaded", { timeout: TEST_TIMEOUTS.medium }).catch(() => undefined);
  }
}

function isAtTargetPath(page: Page, targetPath: string): boolean {
  try {
    return new URL(page.url()).pathname === targetPath;
  } catch {
    return false;
  }
}

async function gotoWithRetry(page: Page, targetPath: string): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(targetPath, { waitUntil: 'commit', timeout: TEST_TIMEOUTS.long });
      await page.waitForLoadState('domcontentloaded', { timeout: TEST_TIMEOUTS.medium }).catch(() => undefined);
      return;
    } catch (error) {
      if (isAtTargetPath(page, targetPath)) return;
      lastError = error;
      await page.waitForTimeout(1000);
    }
  }

  throw lastError;
}

/**
 * Performs login and waits for dashboard to load.
 * Handles both fresh login and already-authenticated states.
 */
async function performLogin(page: Page): Promise<void> {
  await gotoWithRetry(page, '/login');
  await waitThroughRenderWake(page, '/login');

  const alreadyAuthenticated = await page.getByRole('button', { name: /log out/i }).isVisible({ timeout: 2000 }).catch(() => false);
  if (alreadyAuthenticated) return;

  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  // Wait for login form to be ready
  await emailInput.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.medium });

  // Fill credentials
  await emailInput.fill(EMPLOYER_CREDENTIALS.email);
  await passwordInput.fill(EMPLOYER_CREDENTIALS.password);
  await submitButton.click({ timeout: TEST_TIMEOUTS.short }).catch(async () => {
    await passwordInput.press('Enter');
  });

  // Wait for successful authentication — check for any dashboard indicator
  // Admin redirects to /, employer/RTW user to /employer. Both show stat cards.
  const dashboardIndicatorsAfterLogin = [
    page.getByText(/cases loaded/i),
    page.getByText(/Total Cases/i),
    page.getByTestId('stat-card'),
    page.getByText(/Off Work/i),
    page.getByRole('button', { name: /log out/i }),
    page.locator('nav, [role="navigation"]'),
  ];

  let dashboardLoaded = false;
  const deadline = Date.now() + TEST_TIMEOUTS.medium;

  while (Date.now() < deadline && !dashboardLoaded) {
    for (const indicator of dashboardIndicatorsAfterLogin) {
      if (await indicator.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        dashboardLoaded = true;
        break;
      }
    }
    if (!dashboardLoaded) await page.waitForTimeout(500);
  }

  if (!dashboardLoaded) {
    const errorMessage = await page.getByText(/invalid.*credential|incorrect.*password|login.*failed/i).first().textContent().catch(() => null);
    if (errorMessage) {
      throw new Error(`Login failed: ${errorMessage}`);
    }
    throw new Error('Login timeout: Dashboard did not load. Check database and user credentials.');
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
