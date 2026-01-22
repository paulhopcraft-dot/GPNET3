import { chromium } from 'playwright';

async function loginTo5173() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🌐 Opening Preventli on port 5173...');
    await page.goto('http://localhost:5173');

    // Wait for login page
    console.log('⏳ Waiting for login page...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    console.log('📧 Entering login credentials...');
    await page.fill('input[type="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"]', 'ChangeMe123!');

    console.log('🔑 Clicking login button...');
    await page.click('button[type="submit"]');

    // Wait a moment for any redirect or loading
    await page.waitForTimeout(3000);

    console.log('📸 Taking screenshot of current page...');
    await page.screenshot({ path: 'current-page.png', fullPage: true });

    console.log('✅ Login completed! Browser is ready.');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('  1. Navigate to the main dashboard/cases page');
    console.log('  2. Look for "Andres Nieto" in the case list');
    console.log('  3. Click on his case to open details');
    console.log('  4. Click "Treatment" or "Treatment & Recovery" tab');
    console.log('  5. Observe the corrected recovery timeline');
    console.log('');
    console.log('📋 What to look for:');
    console.log('  ✅ Certificate dots only where real certificates exist');
    console.log('  ✅ Dates in 2025 format (not future 2026)');
    console.log('  ✅ Beautiful glassmorphism design');
    console.log('  ✅ MM/YY date format instead of W1, W2, W3');

    // Keep browser open indefinitely
    console.log('\n🖥️ Browser will stay open for manual navigation');
    console.log('Press Ctrl+C to close when done');

    // Wait indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await page.screenshot({ path: 'error-login.png' });
      console.log('📸 Error screenshot saved as error-login.png');
    } catch (e) {
      console.log('Could not save screenshot');
    }
    await browser.close();
  }
}

loginTo5173().catch(console.error);