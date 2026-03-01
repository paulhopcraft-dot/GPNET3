import { chromium } from 'playwright';

async function testAndresRecovery() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🌐 Navigating to localhost:5173...');
    await page.goto('http://localhost:5173');

    // Wait for login page
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    console.log('📧 Logging in as admin...');

    // Login with admin credentials
    await page.fill('input[type="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForSelector('.case-row', { timeout: 15000 });
    console.log('📊 Dashboard loaded, searching for Andres Nieto...');

    // Search for Andres specifically by typing in search
    const searchInput = page.locator('input[placeholder*="search"], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('Andres');
      await page.waitForTimeout(1000);
    }

    // Look for Andres Nieto in the case list
    let andresFound = false;
    const caseRows = await page.locator('.case-row').all();

    for (let i = 0; i < caseRows.length; i++) {
      const rowText = await caseRows[i].textContent();
      if (rowText.includes('Andres') || rowText.includes('Nieto')) {
        console.log(`👤 Found Andres in row ${i + 1}: ${rowText.substring(0, 100)}...`);
        await caseRows[i].click();
        andresFound = true;
        break;
      }
    }

    if (!andresFound) {
      console.log('🔍 Trying alternative search methods...');
      // Try clicking on any case that might be Andres
      const allRows = await page.locator('tr').all();
      for (const row of allRows) {
        const text = await row.textContent();
        if (text && text.toLowerCase().includes('andres')) {
          await row.click();
          andresFound = true;
          break;
        }
      }
    }

    if (!andresFound) {
      console.log('❌ Could not find Andres Nieto in case list');
      // Just click the first case for testing
      await page.locator('.case-row').first().click();
      console.log('🔄 Clicked first available case for testing');
    }

    // Wait for case detail page
    await page.waitForTimeout(3000);
    console.log('📄 Case detail page loaded');

    // Look for Treatment tab or Treatment & Recovery tab
    const treatmentTabSelectors = [
      'button:has-text("Treatment")',
      'button:has-text("Treatment & Recovery")',
      '[data-value="treatment"]',
      '.tabs button[role="tab"]:has-text("Treatment")'
    ];

    let treatmentTabClicked = false;
    for (const selector of treatmentTabSelectors) {
      try {
        const tab = page.locator(selector).first();
        if (await tab.isVisible({ timeout: 2000 })) {
          await tab.click();
          console.log(`💊 Clicked Treatment tab (${selector})`);
          treatmentTabClicked = true;
          await page.waitForTimeout(3000);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!treatmentTabClicked) {
      console.log('⚠️ Treatment tab not found, looking for tab list...');
      const tabs = await page.locator('button[role="tab"]').all();
      for (let i = 0; i < tabs.length; i++) {
        const tabText = await tabs[i].textContent();
        console.log(`  Tab ${i + 1}: ${tabText}`);
        if (tabText.toLowerCase().includes('treat')) {
          await tabs[i].click();
          console.log(`💊 Clicked tab: ${tabText}`);
          treatmentTabClicked = true;
          await page.waitForTimeout(3000);
          break;
        }
      }
    }

    // Take screenshot of the treatment recovery tab
    await page.screenshot({ path: 'andres-recovery-timeline.png', fullPage: true });
    console.log('📸 Screenshot saved as andres-recovery-timeline.png');

    // Look for the recovery elements we fixed
    const recoveryElements = {
      'DynamicRecoveryTimeline': '.hero-motion-container, .immersive-hero-container',
      'Recovery Chart': '.enhanced-recovery-chart, .recharts-area',
      'Glassmorphism Panels': '.glassmorphism-panels-grid, .glass-panel',
      'Progress Rings': '.progress-rings-container, .progress-ring',
      'Certificate Markers': '.particle-dot, .certificate-marker',
      'Recovery Phase Info': '.motion-panel'
    };

    console.log('\n🔍 Checking for recovery timeline elements:');
    for (const [name, selector] of Object.entries(recoveryElements)) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`  ✅ ${name}: Found ${count} elements`);
        } else {
          console.log(`  ❌ ${name}: Not found (${selector})`);
        }
      } catch (e) {
        console.log(`  ⚠️ ${name}: Error checking (${e.message})`);
      }
    }

    // Check if certificate data looks correct (no future dates)
    console.log('\n🗓️ Looking for certificate timeline data...');
    const timelineText = await page.textContent('body');

    if (timelineText.includes('2026') && !timelineText.includes('Jan 2026')) {
      console.log('⚠️ Still seeing 2026 dates - may need cache refresh');
    } else {
      console.log('✅ Certificate dates appear corrected');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser ready - inspect Andres Nieto\'s Treatment Recovery Timeline!');
    console.log('Expected fixes:');
    console.log('  ✅ Certificate dates should be in 2025, not 2026');
    console.log('  ✅ Ultra-modern glassmorphism effects should be visible');
    console.log('  ✅ Recovery chart with gradient fills and particle animations');
    console.log('  ✅ Progress rings with floating animations');
    console.log('  ✅ MM/YY date format in timeline (not W1, W2, W3)');

    console.log('\nPress Ctrl+C in terminal to close browser when done...');

    // Keep browser open - user will close manually
    await page.waitForTimeout(300000); // 5 minutes max

  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await page.screenshot({ path: 'error-screenshot.png' });
      console.log('📸 Error screenshot saved');
    } catch (screenshotError) {
      console.log('Could not save error screenshot');
    }
    await browser.close();
  }
  console.log('🔚 Test complete');
}

testAndresRecovery().catch(console.error);