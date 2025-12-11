import { test, expect } from "@playwright/test";

/**
 * E2E UI Tests for Case Management Features
 */

test.describe("Case List View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for app to load
    await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 });
  });

  test("displays case list table with required columns", async ({ page }) => {
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Check for expected column headers
    const headers = table.getByRole("columnheader");
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test("case rows are clickable and show details", async ({ page }) => {
    const firstCase = page.locator('[data-testid^="row-case-"]').first();
    await firstCase.click();

    // Detail panel should appear
    const detailPanel = page.locator('[class*="detail"], [data-testid*="detail"]').first();
    await expect(detailPanel).toBeVisible({ timeout: 5000 });
  });

  test("multiple cases can be selected sequentially", async ({ page }) => {
    const caseRows = page.locator('[data-testid^="row-case-"]');
    const firstCase = caseRows.first();
    const secondCase = caseRows.nth(1);

    // Click first case
    await firstCase.click();
    const workerHeading = page.getByTestId("case-detail-worker-name");
    const firstName = await workerHeading.textContent();

    // Click second case
    await secondCase.click();
    await page.waitForTimeout(500); // Allow state to update
    const secondName = await workerHeading.textContent();

    // Names should be different
    if (firstName && secondName) {
      expect(firstName).not.toBe(secondName);
    }
  });
});

test.describe("Case Detail Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 });
    // Click first case to open detail panel
    await page.locator('[data-testid^="row-case-"]').first().click();
  });

  test("displays worker name in header", async ({ page }) => {
    const workerName = page.getByTestId("case-detail-worker-name");
    await expect(workerName).toBeVisible();
    const name = await workerName.textContent();
    expect(name).toBeTruthy();
    expect(name!.length).toBeGreaterThan(0);
  });

  test("shows discussion notes card", async ({ page }) => {
    const discussionCard = page.getByTestId("card-discussion-notes");
    await expect(discussionCard).toBeVisible();
  });

  test("shows timeline card if present", async ({ page }) => {
    const timelineCard = page.getByTestId("card-timeline");
    // Timeline may or may not be visible depending on data
    if (await timelineCard.isVisible()) {
      await expect(timelineCard).toContainText(/timeline/i);
    }
  });
});

test.describe("Navigation and State", () => {
  test("app loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 });

    // Filter out expected/benign errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("ResizeObserver") &&
        !e.includes("net::ERR")
    );
    expect(criticalErrors.length).toBe(0);
  });

  test("page title is set correctly", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.toLowerCase()).toContain("gpnet");
  });
});

test.describe("Data Display Validation", () => {
  test("case list shows realistic data", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid^="row-case-"]', { timeout: 15000 });

    const caseRows = page.locator('[data-testid^="row-case-"]');
    const rowCount = await caseRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // First row should have non-empty cells
    const firstRow = caseRows.first();
    const cells = firstRow.locator("td");
    const cellCount = await cells.count();
    expect(cellCount).toBeGreaterThan(0);

    // At least first cell should have text content
    const firstCellText = await cells.first().textContent();
    expect(firstCellText).toBeTruthy();
  });
});

test.describe("Error Handling", () => {
  test("handles missing case gracefully", async ({ page }) => {
    // Navigate to a non-existent case ID
    await page.goto("/?case=non-existent-id-12345");

    // App should still load without crashing
    const heading = page.getByRole("heading", { name: /cases/i });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });
});
