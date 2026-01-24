const { chromium } = require('playwright');

async function loginAsEmployer() {
  console.log('🚀 Starting browser and logging in as employer...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down for visibility
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

    // Wait for any redirect (don't assume specific URL)
    console.log('🏠 Waiting for post-login redirect...');
    await page.waitForLoadState('networkidle');

    // Give it a moment and check current URL
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log('📍 Current URL after login:', currentUrl);

    // Take a screenshot to see what we have
    await page.screenshot({ path: 'employer-dashboard.png' });
    console.log('📸 Dashboard screenshot saved as employer-dashboard.png');

    // Try to navigate to cases if we're not there
    if (!currentUrl.includes('/cases')) {
      console.log('🔄 Navigating to cases page...');
      await page.goto('http://localhost:5173/cases');
      await page.waitForLoadState('networkidle');
    }

    // Look for Andres Nieto in the page
    console.log('🔍 Looking for Andres Nieto...');

    // Wait for the cases table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Try different selectors for Andres Nieto
    let andresToClick = null;

    // Try exact text match
    try {
      andresToClick = await page.locator('text=Andres Nieto').first();
      if (await andresToClick.count() > 0) {
        console.log('✅ Found Andres Nieto by exact text match');
      }
    } catch (e) {
      console.log('⚠️ Exact text match failed, trying partial match...');
    }

    // Try partial match
    if (!andresToClick || await andresToClick.count() === 0) {
      try {
        andresToClick = await page.locator('text=/.*Andres.*Nieto.*/i').first();
        if (await andresToClick.count() > 0) {
          console.log('✅ Found Andres Nieto by partial match');
        }
      } catch (e) {
        console.log('⚠️ Partial match failed');
      }
    }

    // Try clicking on table row containing Andres
    if (!andresToClick || await andresToClick.count() === 0) {
      try {
        andresToClick = await page.locator('tr:has-text("Andres")').first();
        if (await andresToClick.count() > 0) {
          console.log('✅ Found Andres Nieto in table row');
        }
      } catch (e) {
        console.log('⚠️ Table row search failed');
      }
    }

    if (andresToClick && await andresToClick.count() > 0) {
      console.log('🚀 Clicking on Andres Nieto case...');
      await andresToClick.click();
      await page.waitForLoadState('networkidle');

      // Wait for case detail page
      await page.waitForTimeout(2000);

      // Try to click Treatment tab
      console.log('🎨 Looking for Treatment tab...');
      const treatmentTab = page.locator('button:has-text("Treatment")');

      if (await treatmentTab.count() > 0) {
        console.log('🎨 Clicking Treatment tab...');
        await treatmentTab.click();
        await page.waitForLoadState('networkidle');

        console.log('✨ Ultra-modern dashboard should now be visible!');
        console.log('🎭 Look for these features:');
        console.log('  - Glassmorphism glass panels with backdrop blur');
        console.log('  - Gradient backgrounds and animations');
        console.log('  - Progress rings with stroke animations');
        console.log('  - Particle animations following curves');

        await page.screenshot({ path: 'andres-treatment-dashboard.png' });
        console.log('📸 Treatment dashboard screenshot saved');
      } else {
        console.log('⚠️ Treatment tab not found, checking available tabs...');
        const tabs = await page.locator('button[role="tab"]').allTextContents();
        console.log('📋 Available tabs:', tabs);
      }
    } else {
      console.log('❌ Could not find Andres Nieto in the cases list');

      // Show what cases are available
      const caseNames = await page.locator('table tbody tr').allTextContents();
      console.log('📋 Available cases:');
      caseNames.forEach((name, i) => console.log(`  ${i + 1}. ${name.substring(0, 100)}...`));
    }

    console.log('🔄 Browser will stay open for you to explore...');
    console.log('💡 You can manually navigate to see the ultra-modern dashboard features!');

  } catch (error) {
    console.error('❌ Error during process:', error);
    await page.screenshot({ path: 'process-error.png' });
    console.log('📸 Error screenshot saved as process-error.png');
  }
}

loginAsEmployer().catch(console.error);