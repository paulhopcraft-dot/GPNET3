import { chromium } from 'playwright';

async function loginAndView() {
  console.log('🚀 Launching browser with correct credentials...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: ['--start-maximized', '--disable-web-security']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to http://localhost:5000...');
    await page.goto('http://localhost:5000');
    await page.waitForTimeout(2000);

    console.log('🔐 Logging in with correct credentials...');
    await page.fill('input[type="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForTimeout(3000);

    console.log('🏥 Looking for case data in dashboard...');

    // Try to find and click on Selemani Mwomba case
    try {
      await page.click('text=Selemani Mwomba', { timeout: 10000 });
      console.log('✅ Found Selemani Mwomba case, clicking...');
      await page.waitForTimeout(2000);

      console.log('📊 Navigating to Treatment tab to see ultra-modern dashboard...');
      // Try different selectors for the Treatment tab
      await page.click('[data-value="treatment"], button:has-text("Treatment")', { timeout: 5000 });
      await page.waitForTimeout(3000);

      console.log('📸 Taking screenshot of ultra-modern dashboard...');
      await page.screenshot({ path: 'ultra-modern-dashboard.png', fullPage: true });
      console.log('✅ Screenshot saved as: ultra-modern-dashboard.png');

    } catch (e) {
      console.log('Could not find specific case or treatment tab, taking general screenshot...');
      await page.screenshot({ path: 'dashboard-general.png', fullPage: true });
    }

    console.log('🔍 Browser ready for manual inspection!');
    console.log('📋 Check for:');
    console.log('   ✨ Glassmorphism effects on panels');
    console.log('   🌈 Gradient backgrounds');
    console.log('   💓 Pulse animations on confidence indicators (story 26)');
    console.log('   🎭 Framer Motion hero wrapper (story 27)');
    console.log('   ⚡ Particle animations on charts');
    console.log('   🎯 Progress rings with animations');

    // Keep browser open for inspection
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'error-state.png' });
  }
}

loginAndView().catch(console.error);