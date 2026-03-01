import { chromium } from 'playwright';

async function viewDashboard() {
  console.log('🚀 Launching browser to view ultra-modern dashboard...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('📍 Navigating to application...');
  await page.goto('http://localhost:5000');

  // Wait for app to load
  await page.waitForTimeout(2000);

  console.log('🔐 Attempting login...');
  // Try to login if needed
  try {
    await page.fill('input[type="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('No login needed or different login flow');
  }

  console.log('🏥 Looking for case data...');
  // Try to navigate to a case
  try {
    // Look for Selemani Mwomba case (from our test data)
    await page.click('text=Selemani Mwomba', { timeout: 5000 });
    await page.waitForTimeout(1000);

    console.log('📊 Navigating to Treatment tab...');
    // Click Treatment tab to see our ultra-modern dashboard
    await page.click('button:has-text("Treatment"), [data-value="treatment"]', { timeout: 5000 });
    await page.waitForTimeout(2000);

  } catch (e) {
    console.log('Could not find specific case, showing main dashboard');
  }

  console.log('📸 Taking screenshot...');
  await page.screenshot({ path: 'dashboard-current-state.png', fullPage: true });

  console.log('✅ Browser ready! You can now see the dashboard state.');
  console.log('🖼️  Screenshot saved as: dashboard-current-state.png');
  console.log('🔍 Check for:');
  console.log('   - Glassmorphism effects on panels');
  console.log('   - Gradient backgrounds');
  console.log('   - Pulse animations on confidence indicators');
  console.log('   - Framer Motion hero wrapper (story 27)');
  console.log('   - Particle animations on charts');
  console.log('   - Progress rings with animations');

  // Keep browser open for manual inspection
  console.log('\n⏰ Browser will stay open for manual inspection...');

  // Keep the script running
  await new Promise(() => {});
}

viewDashboard().catch(console.error);