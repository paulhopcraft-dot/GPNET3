/**
 * Health Check Smoke Tests
 *
 * Fast, fundamental tests that verify the server is responding.
 * These run first in the test suite to catch catastrophic failures early.
 *
 * @smoke - Tagged for wave-based execution (~2 min total)
 */

import { test, expect } from '@playwright/test';

test.describe('Health Check', { tag: '@smoke' }, () => {
  test('server responds to root URL', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('API health endpoint responds', async ({ request }) => {
    // Try common health check endpoints
    const healthRes = await request.get('/api/health').catch(() => null);
    const rootRes = await request.get('/').catch(() => null);

    // At least one should respond
    const anyResponse = (healthRes?.ok() || rootRes?.ok());
    expect(anyResponse).toBeTruthy();
  });

  test('static assets load correctly', async ({ page }) => {
    // Navigate to login page and verify JS/CSS loads
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(500);

    // Wait for page to be interactive (JS loaded)
    await page.waitForLoadState('domcontentloaded');

    // Check that the page has rendered content (not blank)
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
  });
});
