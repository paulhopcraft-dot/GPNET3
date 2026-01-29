const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:5000/login');

  console.log('Filling credentials...');
  await page.fill('input[type="email"]', 'employer@test.com');
  await page.fill('input[type="password"]', 'password123');

  console.log('Submitting login...');
  await page.click('button[type="submit"]');

  console.log('Waiting for redirect...');
  await page.waitForURL('**/employer**', { timeout: 15000 });

  console.log('Logged in successfully! Browser will stay open.');

  // Keep browser open indefinitely
  await new Promise(() => {});
})().catch(err => {
  console.error('Login failed:', err.message);
  process.exit(1);
});
