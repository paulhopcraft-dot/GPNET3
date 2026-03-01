/**
 * Page Load Time Performance Tests
 *
 * Tests that pages load within the 5 second target.
 * Uses Playwright for browser-based performance testing.
 * Measures actual user-perceived load times including JavaScript execution.
 *
 * Run: npm run test:e2e:performance
 */

import { test, expect } from '../fixtures/auth.fixture';
import { PERFORMANCE_TARGETS } from '../fixtures/test-data';

test.describe('Page Load Times', { tag: '@performance' }, () => {
  const TARGET_MS = PERFORMANCE_TARGETS?.dashboard || 5000;

  test('dashboard loads within target', async ({ authenticatedPage: page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for actual content (not just initial HTML)
    await page.waitForSelector('text=/cases|dashboard|employer/i', { timeout: TARGET_MS });

    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms (target: ${TARGET_MS}ms)`);

    expect(loadTime).toBeLessThan(TARGET_MS);
  });

  test('cases page loads within target', async ({ authenticatedPage: page }) => {
    const startTime = Date.now();

    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');

    // Wait for table to appear
    await page.waitForSelector('table, [data-testid^="row-case-"]', { timeout: TARGET_MS });

    const loadTime = Date.now() - startTime;
    console.log(`Cases page load time: ${loadTime}ms (target: ${TARGET_MS}ms)`);

    expect(loadTime).toBeLessThan(TARGET_MS);
  });

  test('case detail loads within target', async ({ authenticatedPage: page }) => {
    // Navigate to cases first
    await page.goto('/cases');
    await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 });

    // Time the case detail load
    const startTime = Date.now();
    await page.locator('[data-testid^="row-case-"]').first().click();
    await page.waitForSelector('[data-testid="case-detail-panel"], [role="tablist"]', { timeout: TARGET_MS });

    const loadTime = Date.now() - startTime;
    console.log(`Case detail load time: ${loadTime}ms (target: ${TARGET_MS}ms)`);

    expect(loadTime).toBeLessThan(TARGET_MS);
  });

  test('employer portal loads within target', async ({ authenticatedPage: page }) => {
    const startTime = Date.now();

    await page.goto('/employer');
    await page.waitForLoadState('domcontentloaded');

    // Wait for dashboard content
    await page.waitForSelector('text=/Symmetry|employer|dashboard/i', { timeout: TARGET_MS });

    const loadTime = Date.now() - startTime;
    console.log(`Employer portal load time: ${loadTime}ms (target: ${TARGET_MS}ms)`);

    expect(loadTime).toBeLessThan(TARGET_MS);
  });

  test('page load times summary', async ({ authenticatedPage: page }) => {
    const timings: { page: string; time: number }[] = [];

    const pages = [
      { path: '/', name: 'Home' },
      { path: '/cases', name: 'Cases' },
      { path: '/employer', name: 'Employer' },
    ];

    for (const { path, name } of pages) {
      const startTime = Date.now();
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      timings.push({ page: name, time: loadTime });
    }

    console.log('\n=== Page Load Times Summary ===');
    for (const { page: pageName, time } of timings) {
      const status = time < TARGET_MS ? 'PASS' : 'FAIL';
      console.log(`${pageName}: ${time}ms [${status}]`);
    }
    console.log('================================\n');

    // All pages should be under target
    const allUnderTarget = timings.every(t => t.time < TARGET_MS);
    expect(allUnderTarget).toBe(true);
  });
});
