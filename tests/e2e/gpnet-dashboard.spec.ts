import { test, expect } from "@playwright/test";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("dashboard loads, shows discussion notes, and keeps summaries per case", async ({ page }) => {
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

  const caseRows = page.locator('[data-testid^="row-case-"]');
  const firstCaseRow = caseRows.first();
  const secondCaseRow = caseRows.nth(1);
  const firstWorkerName = (await firstCaseRow.locator("td").first().innerText()).trim();
  const secondWorkerName = (await secondCaseRow.locator("td").first().innerText()).trim();

  await firstCaseRow.click();

  const discussionCard = page.getByTestId("card-discussion-notes");
  await expect(discussionCard).toBeVisible();
  await expect(discussionCard).toContainText(/latest discussion notes/i);
  // At least show empty state or notes text
  await expect(
    discussionCard.locator("text=/No transcript discussions|Transcript Risk Insights/i"),
  ).toBeVisible();

  const workerHeading = page.getByTestId("case-detail-worker-name");
  if (firstWorkerName) {
    await expect(workerHeading).toHaveText(new RegExp(escapeRegExp(firstWorkerName), "i"));
  }

  const summaryCard = page.getByTestId("card-ai-summary");
  if ((await summaryCard.count()) > 0 && firstWorkerName) {
    await expect(summaryCard).toContainText(new RegExp(escapeRegExp(firstWorkerName), "i"));
  }

  await secondCaseRow.click();
  if (secondWorkerName) {
    await expect(workerHeading).toHaveText(new RegExp(escapeRegExp(secondWorkerName), "i"));
  }
  if ((await summaryCard.count()) > 0 && secondWorkerName) {
    await expect(summaryCard).toContainText(new RegExp(escapeRegExp(secondWorkerName), "i"));
    if (firstWorkerName) {
      await expect(summaryCard).not.toContainText(new RegExp(escapeRegExp(firstWorkerName), "i"));
    }
  }
});
