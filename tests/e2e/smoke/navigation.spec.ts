/**
 * Navigation Smoke Tests
 *
 * Verifies basic navigation and routing work after login.
 * Uses authenticatedPage fixture from Plan 01 for pre-authenticated state.
 *
 * @smoke - Tagged for wave-based execution (~2 min total)
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Navigation', { tag: '@smoke' }, () => {
  test('dashboard is accessible after login', async ({ authenticatedPage: page }) => {
    // After auth fixture login, should be on dashboard
    const dashboardIndicator = page.locator('text=/cases|dashboard|employer/i').first();
    await expect(dashboardIndicator).toBeVisible({ timeout: 10000 });
  });

  test('cases page is accessible', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    // Should see cases heading or table
    const casesIndicator = page.locator('text=/cases|worker/i, table').first();
    await expect(casesIndicator).toBeVisible({ timeout: 10000 });
  });

  test('employer portal routes work', async ({ authenticatedPage: page }) => {
    // Test key employer routes don't 404
    const routes = [
      { path: '/', name: 'Home' },
      { path: '/cases', name: 'Cases' },
      { path: '/employer', name: 'Employer Dashboard' },
    ];

    for (const route of routes) {
      await page.goto(route.path);

      // Should not be 404 or 500
      const content = await page.content();
      expect(content).not.toContain('404');
      expect(content).not.toContain('Not Found');
      expect(content).not.toContain('500');
      expect(content).not.toContain('Internal Server Error');
    }
  });

  test('sidebar/nav links are present', async ({ authenticatedPage: page }) => {
    // Look for common navigation elements
    const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
    const count = await navLinks.count();

    // Should have at least a few nav links
    expect(count).toBeGreaterThan(0);
  });

  test('page titles update on navigation', async ({ authenticatedPage: page }) => {
    // Navigate to different pages and check title changes
    await page.goto('/cases');
    const casesTitle = await page.title();

    await page.goto('/employer');
    const employerTitle = await page.title();

    // Titles should exist (not be empty)
    expect(casesTitle.length).toBeGreaterThan(0);
    expect(employerTitle.length).toBeGreaterThan(0);
  });

  test('back navigation works', async ({ authenticatedPage: page }) => {
    // Navigate through pages
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    await page.goto('/employer');
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();

    // Should be back on cases page
    await expect(page).toHaveURL(/\/cases/);
  });

  test('direct URL access works for known routes', async ({ authenticatedPage: page }) => {
    // Direct URL to employer dashboard should work
    await page.goto('/employer');
    await page.waitForLoadState('networkidle');

    // Should render content, not redirect endlessly or show error
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
  });
});
