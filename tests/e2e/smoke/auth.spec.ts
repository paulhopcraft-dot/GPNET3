/**
 * Authentication Smoke Tests
 *
 * Verifies core authentication flows work correctly.
 * Critical: Includes 401 infinite loop detection from research findings.
 *
 * @smoke - Tagged for wave-based execution (~2 min total)
 */

import { test, expect } from '@playwright/test';
import { EMPLOYER_CREDENTIALS } from '../fixtures/test-data';

test.describe('Authentication', { tag: '@smoke' }, () => {
  test('login succeeds with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', EMPLOYER_CREDENTIALS.email);
    await page.fill('input[type="password"]', EMPLOYER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Should redirect away from login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Should see some dashboard content
    await expect(page.locator('body')).not.toContainText('Invalid credentials');
  });

  test('login fails gracefully with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error, not hang or loop
    await expect(page.locator('text=/invalid|error|failed/i')).toBeVisible({ timeout: 10000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('401 error does not cause infinite loop', async ({ page, context }) => {
    // Intercept auth check to simulate session expiry
    await context.route('**/api/auth/me', route => route.fulfill({ status: 401 }));

    await page.goto('/cases');

    // Should redirect to login, not loop
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Verify no excessive network requests (detect infinite loop)
    // Count requests made - should be small number, not hundreds
    let requestCount = 0;
    page.on('request', () => requestCount++);
    await page.waitForTimeout(2000);

    expect(requestCount).toBeLessThan(50);
  });

  test('logout works correctly', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', EMPLOYER_CREDENTIALS.email);
    await page.fill('input[type="password"]', EMPLOYER_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    // Find and click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")').first();
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/);
    } else {
      // Logout via direct navigation if button not found
      await page.goto('/logout');
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    // Try to access protected route without being logged in
    await page.goto('/employer');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('login page does not crash with special characters', async ({ page }) => {
    await page.goto('/login');

    // Try special characters that might cause issues
    await page.fill('input[type="email"]', 'test<script>alert(1)</script>@test.com');
    await page.fill('input[type="password"]', "password'--DROP TABLE users");
    await page.click('button[type="submit"]');

    // Page should handle gracefully, not crash or show raw error
    await expect(page.locator('body')).toBeVisible();

    // Should show validation error or invalid credentials, not 500 error
    const pageContent = await page.content();
    expect(pageContent).not.toContain('500');
    expect(pageContent).not.toContain('Internal Server Error');
  });
});
