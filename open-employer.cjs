const { chromium } = require('playwright');

async function openEmployerLogin() {
  console.log('🚀 Opening browser for employer login...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null // Use full screen
  });

  const page = await context.newPage();

  try {
    // Navigate to login page
    console.log('📍 Navigating to http://localhost:5173/login');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    console.log('🔐 Please login manually with:');
    console.log('   Email: employer@symmetry.local');
    console.log('   Password: ChangeMe123!');

    console.log('✅ Browser is now open and ready for manual login!');
    console.log('🎯 After login, navigate to a case to see the updated branding');
    console.log('📍 The page should now show "Symmetry Dashboard" instead of "WorkSafe Dashboard"');

    // Keep browser open indefinitely
    console.log('🔄 Browser will stay open - press Ctrl+C to close...');

    // Wait forever to keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'error-login.png' });
  }
}

openEmployerLogin().catch(console.error);