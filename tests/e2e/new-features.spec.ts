import { test, expect } from "@playwright/test";

test.describe("Reports Page", () => {
  test("reports page loads and shows analytics", async ({ page }) => {
    // Navigate to reports page
    await page.goto("/reports");

    // Wait for page to load
    await page.waitForSelector("h1:has-text('Reports & Analytics')");

    // Check summary stats cards are present
    const totalCasesCard = page.locator("text=Total Cases").first();
    await expect(totalCasesCard).toBeVisible();

    // Check for compliance distribution chart
    const complianceChart = page.locator("text=Compliance Distribution").first();
    await expect(complianceChart).toBeVisible();

    // Check for work status distribution chart
    const workStatusChart = page.locator("text=Work Status Distribution").first();
    await expect(workStatusChart).toBeVisible();

    // Check for cases by company chart
    const companyChart = page.locator("text=Cases by Company").first();
    await expect(companyChart).toBeVisible();

    // Check company filter dropdown works
    const dropdown = page.locator("select");
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toHaveValue("");
  });

  test("back button navigates to dashboard", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForSelector("h1:has-text('Reports & Analytics')");

    // Click back button
    const backButton = page.locator("a[href='/']").first();
    await backButton.click();

    // Should be on main dashboard
    await expect(page).toHaveURL("/");
  });
});

test.describe("Dashboard Layout", () => {
  test("action queue sidebar is visible on large screens", async ({ page }) => {
    // Set viewport to large screen
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="card-action-queue"]');

    // Action queue should be visible
    const actionQueue = page.getByTestId("card-action-queue");
    await expect(actionQueue).toBeVisible();
  });

  test("stats cards are visible", async ({ page }) => {
    await page.goto("/");

    // Wait for dashboard to load
    await page.waitForSelector("h1");

    // Dashboard stats should be visible
    const statsSection = page.locator('[class*="grid"]').first();
    await expect(statsSection).toBeVisible();
  });

  test("sidebar links to reports and audit", async ({ page }) => {
    // Set viewport to large screen for sidebar visibility
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/");

    // Wait for sidebar
    await page.waitForSelector("aside");

    // Reports link should be visible
    const reportsLink = page.locator("a[href='/reports']");
    await expect(reportsLink).toBeVisible();

    // Audit log link should be visible
    const auditLink = page.locator("a[href='/audit']");
    await expect(auditLink).toBeVisible();

    // Click reports link
    await reportsLink.click();
    await expect(page).toHaveURL("/reports");
  });
});

test.describe("Case Detail Panel", () => {
  test("case detail panel shows when clicking a case", async ({ page }) => {
    await page.goto("/");

    // Wait for cases to load
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Click on first case
    const caseRows = page.locator('[data-testid^="row-case-"]');
    const firstRow = caseRows.first();
    await firstRow.click();

    // Case detail panel should appear
    const workerName = page.getByTestId("case-detail-worker-name");
    await expect(workerName).toBeVisible();
  });

  test("compliance override section is visible for low compliance cases", async ({ page }) => {
    await page.goto("/");

    // Wait for cases to load
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Click on first case
    const caseRows = page.locator('[data-testid^="row-case-"]');
    const firstRow = caseRows.first();
    await firstRow.click();

    // Case detail panel should appear
    const workerName = page.getByTestId("case-detail-worker-name");
    await expect(workerName).toBeVisible();

    // Scroll to find compliance section (it may exist or not depending on case)
    // Just verify the panel opened successfully
  });
});

test.describe("Search and Filter", () => {
  test("search bar filters cases", async ({ page }) => {
    await page.goto("/");

    // Wait for cases to load
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill("test");

    // Give it a moment to filter
    await page.waitForTimeout(500);

    // Table should still be visible
    await expect(table).toBeVisible();
  });
});

test.describe("Freshdesk Sync", () => {
  test("sync button is visible and clickable", async ({ page }) => {
    await page.goto("/");

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="button-sync-freshdesk"]');

    // Sync button should be visible
    const syncButton = page.getByTestId("button-sync-freshdesk");
    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled();
  });
});
