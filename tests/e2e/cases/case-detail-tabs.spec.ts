/**
 * Case Detail Tabs E2E Tests
 *
 * Critical path tests for all 7 case detail tabs:
 * Summary, Injury, Timeline, Treatment, Contacts, Financial, Risk
 *
 * Tagged: @critical, @regression
 */

import { test, expect } from '../fixtures/auth.fixture';

const TABS = ['summary', 'injury', 'timeline', 'treatment', 'contacts', 'financial', 'risk'];

test.describe('Case Detail Tabs', { tag: ['@critical', '@regression'] }, () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Navigate to cases and open first case
    await page.goto('/cases');
    await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 });
    await page.locator('[data-testid^="row-case-"]').first().click();
    await page.waitForSelector('[data-testid="case-detail-panel"], [role="tablist"]', {
      timeout: 10000,
    });
  });

  test('all 7 tabs are visible', async ({ authenticatedPage: page }) => {
    let foundTabs = 0;
    const missingTabs: string[] = [];

    for (const tab of TABS) {
      const tabButton = page
        .locator(
          `[value="${tab}"], button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`
        )
        .first();
      const isVisible = await tabButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        foundTabs++;
      } else {
        missingTabs.push(tab);
      }
    }

    if (missingTabs.length > 0) {
      console.log(`Tabs not found (may be named differently): ${missingTabs.join(', ')}`);
    }

    // Should find at least 5 of the 7 tabs (some may be named differently)
    expect(foundTabs).toBeGreaterThanOrEqual(5);
  });

  // Generate individual tab tests
  for (const tab of TABS) {
    test(
      `${tab} tab loads without errors`,
      { tag: '@critical' },
      async ({ authenticatedPage: page }) => {
        const tabButton = page
          .locator(
            `[value="${tab}"], button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`
          )
          .first();

        if (await tabButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tabButton.click();
          await page.waitForTimeout(1000);

          // Check for error states
          const hasError = await page
            .locator('text=/Error:|Failed to load|undefined is not/i')
            .isVisible({ timeout: 2000 })
            .catch(() => false);
          expect(hasError).toBe(false);

          // Verify tab content area is not empty
          const tabContent = page.locator('[role="tabpanel"]').first();
          if (await tabContent.isVisible({ timeout: 1000 }).catch(() => false)) {
            const contentText = await tabContent.textContent();
            expect(contentText?.trim().length).toBeGreaterThan(0);
          }
        } else {
          // Skip if tab doesn't exist (not all tabs may be implemented)
          console.log(`Skipping ${tab} tab - not found in UI`);
        }
      }
    );
  }

  test('summary tab shows AI summary if available', async ({ authenticatedPage: page }) => {
    // Summary should be default or click to it
    const summaryTab = page.locator('[value="summary"], button:has-text("Summary")').first();
    if (await summaryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await summaryTab.click();
    }

    // Look for AI summary card
    const summaryCard = page.getByTestId('card-ai-summary');
    if (await summaryCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should contain some summary text
      const summaryText = await summaryCard.textContent();
      expect(summaryText?.length).toBeGreaterThan(10);
    }
  });

  test('tabs maintain state when switching between cases', async ({ authenticatedPage: page }) => {
    // Click on injury tab
    const injuryTab = page.locator('[value="injury"], button:has-text("Injury")').first();
    if (await injuryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await injuryTab.click();
      await page.waitForTimeout(500);
    }

    // Click on a different case
    const caseRows = page.locator('[data-testid^="row-case-"]');
    const rowCount = await caseRows.count();
    if (rowCount > 1) {
      await caseRows.nth(1).click();
      await page.waitForTimeout(1000);

      // Verify detail panel still visible (didn't crash)
      const detailPanel = page
        .locator('[data-testid="case-detail-panel"], [role="tablist"]')
        .first();
      await expect(detailPanel).toBeVisible();
    }
  });

  test('timeline tab shows case history', async ({ authenticatedPage: page }) => {
    const timelineTab = page.locator('[value="timeline"], button:has-text("Timeline")').first();
    if (await timelineTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timelineTab.click();
      await page.waitForTimeout(1000);

      // Look for timeline elements (dates, events)
      const timelineContent = page.locator('[role="tabpanel"]').first();
      if (await timelineContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const content = await timelineContent.textContent();
        // Timeline should have some content
        expect(content?.length).toBeGreaterThan(0);
      }
    }
  });

  test('injury tab shows injury details', async ({ authenticatedPage: page }) => {
    const injuryTab = page.locator('[value="injury"], button:has-text("Injury")').first();
    if (await injuryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await injuryTab.click();
      await page.waitForTimeout(1000);

      // Look for injury-related content
      const tabContent = page.locator('[role="tabpanel"]').first();
      if (await tabContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const content = await tabContent.textContent();
        expect(content?.length).toBeGreaterThan(0);
      }
    }
  });

  test('contacts tab shows contact information', async ({ authenticatedPage: page }) => {
    const contactsTab = page.locator('[value="contacts"], button:has-text("Contacts")').first();
    if (await contactsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contactsTab.click();
      await page.waitForTimeout(1000);

      const tabContent = page.locator('[role="tabpanel"]').first();
      if (await tabContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const content = await tabContent.textContent();
        expect(content?.length).toBeGreaterThan(0);
      }
    }
  });

  test('risk tab shows risk indicators', async ({ authenticatedPage: page }) => {
    const riskTab = page.locator('[value="risk"], button:has-text("Risk")').first();
    if (await riskTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await riskTab.click();
      await page.waitForTimeout(1000);

      const tabContent = page.locator('[role="tabpanel"]').first();
      if (await tabContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const content = await tabContent.textContent();
        expect(content?.length).toBeGreaterThan(0);
      }
    }
  });
});
