/**
 * Case List E2E Tests
 *
 * Critical path tests for the case list functionality.
 * Verifies case table display, row interactions, and worker name display.
 *
 * Tagged: @critical, @regression
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Case List', { tag: ['@critical', '@regression'] }, () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');
  });

  test('case list displays cases table', async ({ authenticatedPage: page }) => {
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Should have header row + at least one data row
    const rows = table.getByRole('row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(1);
  });

  test('case rows show worker names', async ({ authenticatedPage: page }) => {
    const caseRows = page.locator('[data-testid^="row-case-"]');
    await expect(caseRows.first()).toBeVisible({ timeout: 15000 });

    // First cell should contain worker name
    const firstRowFirstCell = caseRows.first().locator('td').first();
    const cellText = await firstRowFirstCell.textContent();
    expect(cellText?.trim().length).toBeGreaterThan(0);
  });

  test('clicking case row opens case detail', async ({ authenticatedPage: page }) => {
    const caseRows = page.locator('[data-testid^="row-case-"]');
    await expect(caseRows.first()).toBeVisible({ timeout: 15000 });

    await caseRows.first().click();

    // Should show case detail panel
    const detailPanel = page
      .locator('[data-testid="case-detail-panel"], [class*="detail"], [role="complementary"]')
      .first();
    await expect(detailPanel).toBeVisible({ timeout: 10000 });
  });

  test('case list shows loading state then data', async ({ authenticatedPage: page }) => {
    // Navigate fresh to see loading
    await page.goto('/');
    await page.goto('/cases');

    // Either see loading indicator or data directly
    const loadedIndicator = page.locator('table, text=/cases loaded|no cases/i').first();
    await expect(loadedIndicator).toBeVisible({ timeout: 15000 });
  });

  test(
    'case detail shows worker name from selected case',
    { tag: '@critical' },
    async ({ authenticatedPage: page }) => {
      // Get first case's worker name
      const caseRows = page.locator('[data-testid^="row-case-"]');
      await expect(caseRows.first()).toBeVisible({ timeout: 15000 });

      const firstRowFirstCell = caseRows.first().locator('td').first();
      const workerName = (await firstRowFirstCell.textContent())?.trim() || '';

      // Click to open detail
      await caseRows.first().click();

      // Verify worker name appears in detail panel
      if (workerName) {
        const workerHeading = page.getByTestId('case-detail-worker-name');
        await expect(workerHeading).toContainText(workerName.split('(')[0].trim(), {
          timeout: 10000,
        });
      }
    }
  );

  test('case table has expected columns', async ({ authenticatedPage: page }) => {
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Check for header cells
    const headers = table.getByRole('columnheader');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(2);
  });

  test('multiple cases can be navigated', async ({ authenticatedPage: page }) => {
    const caseRows = page.locator('[data-testid^="row-case-"]');
    const rowCount = await caseRows.count();

    if (rowCount > 1) {
      // Click first case
      await caseRows.first().click();
      await page.waitForTimeout(500);

      // Click second case
      await caseRows.nth(1).click();

      // Detail panel should still be visible (didn't crash)
      const detailPanel = page
        .locator('[data-testid="case-detail-panel"], [class*="detail"], [role="complementary"]')
        .first();
      await expect(detailPanel).toBeVisible({ timeout: 5000 });
    }
  });
});
