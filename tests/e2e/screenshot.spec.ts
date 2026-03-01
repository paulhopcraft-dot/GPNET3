import { test } from '@playwright/test';

test('capture dashboard screenshot', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173');
  await page.fill('input[type="email"]', 'admin@gpnet.local');
  await page.fill('input[type="password"]', 'ChangeMe123!');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await page.waitForSelector('h1', { timeout: 10000 });
  await page.waitForTimeout(2000); // Let everything settle

  // Take full page screenshot
  await page.screenshot({
    path: 'dashboard-screenshot.png',
    fullPage: true
  });

  console.log('Screenshot saved to: dashboard-screenshot.png');
});
