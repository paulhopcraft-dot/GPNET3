/**
 * Employer Dashboard E2E Tests
 *
 * Critical path tests for the employer dashboard.
 * Verifies dashboard loads, shows organization data, and has navigation.
 *
 * Tagged: @critical, @regression
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Employer Dashboard', { tag: ['@critical', '@regression'] }, () => {
  test('dashboard loads with organization name', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should display organization name (Symmetry or Preventli are known test orgs)
    const orgName = page.locator('text=/Symmetry|Preventli/i').first();
    await expect(orgName).toBeVisible({ timeout: 15000 });
  });

  test('dashboard shows case count or action cards', async ({ authenticatedPage: page }) => {
    await page.goto('/employer');
    await page.waitForLoadState('networkidle');

    // Should show either case count, action cards, or stats
    const dashboardContent = page
      .locator(
        '[class*="Card"], [class*="card"], [data-testid*="dashboard"], text=/cases|workers|actions/i'
      )
      .first();
    await expect(dashboardContent).toBeVisible({ timeout: 15000 });
  });

  test('dashboard has navigation links', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Count navigation links
    const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(2);
  });

  test('dashboard loads without JavaScript errors', async ({ authenticatedPage: page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out expected/benign errors
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('manifest') && !e.includes('net::ERR')
    );

    expect(realErrors).toHaveLength(0);
  });

  test('dashboard displays cases heading', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show a cases heading
    const casesHeading = page.getByRole('heading', { name: /cases/i });
    await expect(casesHeading).toBeVisible({ timeout: 15000 });
  });
});
