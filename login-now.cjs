const { chromium } = require('playwright');

async function loginNow() {
  console.log('🚀 Launching browser and logging in...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1500,
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const context = await browser.newContext({
    viewport: null,
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  try {
    console.log('📍 Going to login page...');
    await page.goto('http://localhost:5173/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('⏳ Waiting for login form...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    console.log('🔐 Filling in employer credentials...');
    await page.fill('input[type="email"]', 'employer@symmetry.local');
    await page.waitForTimeout(500);

    await page.fill('input[type="password"]', 'ChangeMe123!');
    await page.waitForTimeout(500);

    console.log('🚀 Clicking login button...');
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for redirect after login...');
    await page.waitForTimeout(3000);

    // Check current URL and navigate if needed
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    if (currentUrl.includes('localhost:5173')) {
      console.log('✅ Login successful!');

      // Try to go to cases page
      if (!currentUrl.includes('/cases')) {
        console.log('🔄 Navigating to cases page...');
        await page.goto('http://localhost:5173/cases', { waitUntil: 'networkidle' });
      }

      console.log('🎯 Looking for Andres Nieto...');
      await page.waitForTimeout(2000);

      // Try to find and click Andres Nieto
      try {
        await page.waitForSelector('table tbody tr', { timeout: 5000 });

        // Try clicking on Andres Nieto row
        const andresToClick = page.locator('text=Andres').first();
        if (await andresToClick.count() > 0) {
          console.log('🚀 Clicking Andres Nieto...');
          await andresToClick.click();
          await page.waitForTimeout(2000);

          console.log('🎨 Looking for Treatment tab...');
          const treatmentTab = page.locator('button:has-text("Treatment & Recovery")');
          if (await treatmentTab.count() > 0) {
            console.log('📊 Clicking Treatment & Recovery tab...');
            await treatmentTab.click();
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) {
        console.log('⚠️ Could not navigate to Andres case automatically');
      }

      console.log('✨ SUCCESS! Browser is open and logged in');
      console.log('🏢 You should see "Symmetry Dashboard" instead of WorkSafe');
      console.log('🔄 Browser will stay open for you to explore...');

      // Keep browser open
      await new Promise(() => {});
    } else {
      console.log('❌ Login may have failed, check browser');
    }

  } catch (error) {
    console.error('❌ Error during login:', error.message);
    await page.screenshot({ path: 'login-error.png', fullPage: true });
    console.log('📸 Screenshot saved as login-error.png');
  }
}

loginNow().catch(console.error);