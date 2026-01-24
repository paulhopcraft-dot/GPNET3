const { chromium } = require('playwright');

async function loginAsEmployer() {
  console.log('🚀 Starting browser and logging in as employer...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000  // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Fill in employer credentials
    console.log('🔐 Logging in as employer...');
    await page.fill('input[type="email"]', 'employer@symmetry.local');
    await page.fill('input[type="password"]', 'ChangeMe123!');

    // Click login
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Wait for redirect to cases page (employer routing)
    console.log('🏠 Waiting for employer dashboard...');
    await page.waitForURL('**/cases');
    await page.waitForLoadState('networkidle');

    console.log('✅ Logged in as employer successfully!');
    console.log('📊 You should now see the Cases page with Symmetry workers');
    console.log('🎯 Click on "Selemani Mwomba" to see the ultra-modern dashboard');

    // Navigate to Andres Nieto case to show the ultra-modern dashboard
    console.log('🚀 Navigating to Andres Nieto case...');
    await page.click('text=Andres Nieto');
    await page.waitForLoadState('networkidle');

    // Click on Treatment tab to show ultra-modern features
    console.log('🎨 Opening Treatment tab to show ultra-modern dashboard...');
    await page.click('button:has-text("Treatment")');
    await page.waitForLoadState('networkidle');

    console.log('✨ Ultra-modern dashboard with glassmorphism effects should now be visible!');
    console.log('🎭 Features to look for:');
    console.log('  - Glassmorphism glass panels with backdrop blur');
    console.log('  - Gradient backgrounds and mesh effects');
    console.log('  - Progress rings with stroke animations');
    console.log('  - Particle animations following recovery curves');
    console.log('  - Floating and pulse effects');

    // Keep browser open for user to see
    console.log('🔄 Browser will stay open for you to explore...');

  } catch (error) {
    console.error('❌ Error during login process:', error);
    await page.screenshot({ path: 'login-error.png' });
    console.log('📸 Screenshot saved as login-error.png');
  }
}

loginAsEmployer().catch(console.error);