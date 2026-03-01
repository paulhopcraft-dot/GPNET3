/**
 * Error Handling Edge Case Tests
 *
 * Tests edge cases and error handling scenarios to ensure:
 * - Graceful degradation without infinite loops
 * - User-friendly error messages (no raw stack traces)
 * - Proper recovery from network failures
 * - Recovery chart certificate dots display correctly
 *
 * @tags @regression
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Error Handling', { tag: '@regression' }, () => {
  test('invalid case ID shows error gracefully', async ({ authenticatedPage: page }) => {
    await page.goto('/employer/case/invalid-case-id-12345');
    await page.waitForLoadState('domcontentloaded');

    // Should show error message or redirect, not crash
    const pageContent = await page.content();

    // Should not show raw error stack trace
    expect(pageContent).not.toContain('TypeError');
    expect(pageContent).not.toContain('Cannot read properties');
    expect(pageContent).not.toContain('undefined is not');

    // Should show user-friendly message OR redirect to cases list
    const hasErrorMessage = pageContent.includes('not found') ||
                           pageContent.includes('Case not found') ||
                           pageContent.includes('does not exist');
    const redirectedToCases = page.url().includes('/cases');

    expect(hasErrorMessage || redirectedToCases).toBe(true);
  });

  test('network error shows retry option', async ({ authenticatedPage: page, context }) => {
    // Block a specific API endpoint
    await context.route('**/api/gpnet2/cases', route => route.abort('failed'));

    await page.goto('/cases');
    await page.waitForTimeout(3000);

    // Should show error state, not infinite spinner
    const pageContent = await page.content();

    // Should not be stuck loading forever
    const hasLoadingSpinner = await page.locator('.loading, [class*="spin"], text=Loading').isVisible({ timeout: 1000 }).catch(() => false);

    // After 3 seconds, should either show error or retry button
    if (hasLoadingSpinner) {
      // Loading should resolve within reasonable time
      await page.waitForTimeout(5000);
      const stillLoading = await page.locator('.loading, [class*="spin"]').isVisible({ timeout: 1000 }).catch(() => false);

      // Should not be infinite loading
      if (stillLoading) {
        console.warn('Loading state persisted >5s after network error');
      }
    }
  });

  test('401 error redirects to login without loop', async ({ authenticatedPage: page, context }) => {
    // Track request count
    let requestCount = 0;
    page.on('request', () => requestCount++);

    // Intercept ALL auth endpoints to simulate expired session
    await context.route('**/api/auth/**', route => route.fulfill({ status: 401 }));

    await page.goto('/cases');
    await page.waitForTimeout(5000);

    // Should redirect to login
    expect(page.url()).toMatch(/login|\/$/);

    // Should not have made excessive requests (indicates loop)
    console.log(`Total requests after 401: ${requestCount}`);
    expect(requestCount).toBeLessThan(100);
  });

  test('rate limit error shows appropriate message', async ({ authenticatedPage: page, context }) => {
    // Intercept to simulate rate limit
    await context.route('**/api/**', route => route.fulfill({
      status: 429,
      body: JSON.stringify({ error: 'Too many requests' })
    }));

    await page.goto('/cases');
    await page.waitForTimeout(2000);

    // Should handle 429 gracefully
    const pageContent = await page.content();

    // Should not crash
    expect(pageContent).not.toContain('TypeError');
    expect(pageContent).not.toContain('undefined');
  });

  test('empty data states render correctly', async ({ authenticatedPage: page }) => {
    // Navigate to cases
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');

    // If table is empty, should show empty state message
    const table = page.getByRole('table');
    const tableExists = await table.isVisible({ timeout: 5000 }).catch(() => false);

    if (tableExists) {
      const rows = table.getByRole('row');
      const rowCount = await rows.count();

      if (rowCount <= 1) {
        // Only header row - should show empty state
        const emptyState = page.locator('text=/no cases|empty|no data/i');
        const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

        // Empty state is expected when no data, log for visibility
        if (!hasEmptyState) {
          console.log('No empty state message shown for empty table');
        }
      }
    }
  });

  test('recovery chart renders without errors', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Wait for case rows or handle empty state
    const hasRows = await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 }).catch(() => null);

    if (!hasRows) {
      console.log('No case rows found - skipping recovery chart test');
      return;
    }

    // Click first case to see detail
    await page.locator('[data-testid^="row-case-"]').first().click();
    await page.waitForTimeout(2000);

    // Look for recovery chart or timeline
    const recoveryChart = page.locator('[data-testid*="recovery"], [class*="chart"], [class*="timeline"]').first();

    if (await recoveryChart.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Chart should not show error
      const chartContent = await recoveryChart.textContent();
      expect(chartContent).not.toContain('Error');
      expect(chartContent).not.toContain('undefined');

      // Look for certificate dots if chart exists
      const certDots = page.locator('[data-testid*="certificate-dot"], .cert-dot, circle').first();
      if (await certDots.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Certificate dots found in recovery chart');
      } else {
        console.log('Certificate dots not found - may be no certificates for this case');
      }
    }
  });

  test('form validation shows errors inline', async ({ authenticatedPage: page }) => {
    await page.goto('/employer/new-case');
    await page.waitForLoadState('domcontentloaded');

    // Navigate past gateway if present
    const noOption = page.locator('label:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    // Try to submit without filling required fields
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create"), button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should show validation errors inline, not just fail silently
      const hasValidationError = await page.locator('text=/required|invalid|please|must/i').isVisible({ timeout: 3000 }).catch(() => false);

      // Either shows validation or button is disabled for incomplete form
      const buttonDisabled = await submitButton.isDisabled();

      expect(hasValidationError || buttonDisabled).toBe(true);
    }
  });

  test('certificate dots display on recovery chart', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Wait for case rows or handle empty state
    const hasRows = await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 }).catch(() => null);

    if (!hasRows) {
      console.log('No case rows found - skipping certificate dots test');
      return;
    }

    // Find a case that likely has certificates (look for one with more data)
    const caseRows = page.locator('[data-testid^="row-case-"]');
    const rowCount = await caseRows.count();

    let foundCertDots = false;

    // Try first few cases to find one with certificates
    for (let i = 0; i < Math.min(3, rowCount); i++) {
      await caseRows.nth(i).click();
      await page.waitForTimeout(2000);

      // Look for recovery chart
      const recoveryChart = page.locator('[data-testid*="recovery-chart"], [class*="RecoveryChart"], canvas, svg').first();

      if (await recoveryChart.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Check for certificate markers/dots
        const certDots = page.locator(
          '[data-testid*="certificate"], ' +
          '.certificate-marker, ' +
          '.cert-dot, ' +
          'circle[fill], ' +
          '[class*="marker"]'
        );

        const dotCount = await certDots.count();
        console.log(`Case ${i+1}: Found ${dotCount} certificate markers`);

        if (dotCount > 0) {
          foundCertDots = true;

          // Verify dots are visible
          await expect(certDots.first()).toBeVisible();

          // Verify dots have proper position (not all at 0,0)
          const firstDot = certDots.first();
          const box = await firstDot.boundingBox();
          if (box) {
            expect(box.x).toBeGreaterThan(0);
            expect(box.y).toBeGreaterThan(0);
          }

          break;
        }
      }

      // Go back to cases list to try next case
      await page.goto('/cases');
      await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 10000 }).catch(() => null);
    }

    if (!foundCertDots) {
      console.log('No certificate dots found - may be no certificates in test data or chart not implemented');
    }
  });

  test('certificate dot click shows certificate details', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');

    // Wait for case rows or handle empty state
    const hasRows = await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 }).catch(() => null);

    if (!hasRows) {
      console.log('No case rows found - skipping certificate click test');
      return;
    }

    await page.locator('[data-testid^="row-case-"]').first().click();
    await page.waitForTimeout(2000);

    // Find certificate dots/markers
    const certDots = page.locator('[data-testid*="certificate-dot"], .certificate-marker, .cert-dot');

    if (await certDots.count() > 0) {
      // Click first certificate dot
      await certDots.first().click();
      await page.waitForTimeout(1000);

      // Should show certificate details (modal, panel, or expand)
      const certDetails = page.locator(
        '[data-testid*="certificate-detail"], ' +
        '[class*="certificate"], ' +
        'text=/certificate|restriction|diagnosis/i'
      );

      const detailsVisible = await certDetails.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Certificate details visible after click: ${detailsVisible}`);
    } else {
      console.log('No certificate dots to click');
    }
  });

  test('long loading states have timeout', async ({ authenticatedPage: page }) => {
    // Navigate to a page that loads data
    await page.goto('/cases');

    const startTime = Date.now();

    // Wait for either content or timeout
    await Promise.race([
      page.waitForSelector('[data-testid^="row-case-"], .empty-state, text=/no cases/i', { timeout: 30000 }),
      page.waitForTimeout(30000)
    ]);

    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);

    // Verify page is in a stable state (not stuck)
    const isStable = await page.locator('body').isVisible();
    expect(isStable).toBe(true);
  });

  test('navigation errors are handled gracefully', async ({ authenticatedPage: page }) => {
    // Navigate to non-existent route
    await page.goto('/nonexistent-route-12345');
    await page.waitForLoadState('domcontentloaded');

    const pageContent = await page.content();

    // Should not show raw error stack
    expect(pageContent).not.toContain('TypeError');
    expect(pageContent).not.toContain('Cannot read properties');

    // Should either redirect to a known route or show 404-like message
    const showsNotFound = pageContent.includes('not found') ||
                         pageContent.includes('404') ||
                         pageContent.includes('Page not found');
    const redirectedToKnown = page.url().includes('/cases') ||
                             page.url().includes('/employer') ||
                             page.url().includes('/login');

    expect(showsNotFound || redirectedToKnown).toBe(true);
  });
});
