import { test, expect } from "@playwright/test";

test("dashboard loads and shows at least one case", async ({ page }) => {
  await page.goto("/");

  // Wait for main heading
  const heading = page.getByRole("heading", { name: /cases/i });
  await heading.waitFor({ timeout: 15000 });

  // Find table
  const table = page.getByRole("table");
  await expect(table).toBeVisible();

  // Ensure more than one row
  const rows = table.getByRole("row");
  const count = await rows.count();
  expect(count).toBeGreaterThan(1);

  // Open the first case to reveal the detail panel
  const firstCaseRow = page.locator('[data-testid^="row-case-"]').first();
  await firstCaseRow.click();

  const discussionCard = page.getByTestId("card-discussion-notes");
  await expect(discussionCard).toBeVisible();
  await expect(discussionCard).toContainText(/latest discussion notes/i);
  // At least show empty state or notes text
  await expect(
    discussionCard.locator("text=/No transcript discussions|Transcript Risk Insights/i"),
  ).toBeVisible();
});
