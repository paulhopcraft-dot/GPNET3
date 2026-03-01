#!/usr/bin/env node
import { chromium } from 'playwright';

async function findTestElements() {
  console.log('🔍 FINDING CONFIDENCE TEST ELEMENTS');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false, // Show browser
    slowMo: 1000
  });

  const page = await browser.newPage();

  try {
    console.log('🌐 Loading http://localhost:5000...');
    await page.goto('http://localhost:5000');
    await page.waitForTimeout(3000);

    console.log('📋 Page title:', await page.title());
    console.log('📍 Current URL:', page.url());

    // Check for our test elements
    console.log('\n🎯 LOOKING FOR TEST ELEMENTS:');

    // 1. Check for the main dashboard test box
    const dashboardTestBox = await page.locator('.confidence-indicator:has-text("PULSE TEST")').count();
    console.log(`📊 Dashboard test box: ${dashboardTestBox > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);

    if (dashboardTestBox > 0) {
      const testText = await page.locator('.confidence-indicator:has-text("PULSE TEST")').first().textContent();
      console.log(`   Text: "${testText}"`);

      // Check if it has animation class
      const hasAnimation = await page.locator('.confidence-indicator.animate-pulse-slow').count();
      console.log(`   Animation class: ${hasAnimation > 0 ? '✅ YES' : '❌ NO'}`);
    }

    // 2. Check for any confidence indicators
    const allConfidenceElements = await page.locator('.confidence-indicator').count();
    console.log(`🎯 Total confidence indicators: ${allConfidenceElements}`);

    // 3. Check for any animate-pulse-slow elements
    const pulseElements = await page.locator('.animate-pulse-slow').count();
    console.log(`💓 Total pulsing elements: ${pulseElements}`);

    // 4. Screenshot the current state
    await page.screenshot({ path: 'dashboard-screenshot.png', fullPage: false });
    console.log('📸 Screenshot saved as dashboard-screenshot.png');

    // 5. Try to find any worker cases to click
    const workerLinks = await page.locator('tr, [data-case-id], a:has-text("Selemani"), a:has-text("Andres"), a:has-text("Jacob")').count();
    console.log(`👥 Potential worker case links: ${workerLinks}`);

    if (workerLinks > 0) {
      console.log('\n🏥 TRYING TO NAVIGATE TO TREATMENT TAB:');

      // Try clicking the first case
      try {
        await page.locator('tr').first().click();
        await page.waitForTimeout(2000);
        console.log('✅ Clicked on first case');

        // Look for treatment tab
        const treatmentTab = await page.locator('[data-value="treatment"], button:has-text("Treatment"), .tab-treatment').count();
        console.log(`🏥 Treatment tab found: ${treatmentTab > 0 ? '✅ YES' : '❌ NO'}`);

        if (treatmentTab > 0) {
          await page.locator('[data-value="treatment"], button:has-text("Treatment")').first().click();
          await page.waitForTimeout(3000);
          console.log('✅ Clicked Treatment tab');

          // Check for treatment test box
          const treatmentTestBox = await page.locator('.confidence-indicator:has-text("WATCH ME")').count();
          console.log(`🧪 Treatment test box: ${treatmentTestBox > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);

          // Screenshot treatment tab
          await page.screenshot({ path: 'treatment-screenshot.png', fullPage: false });
          console.log('📸 Treatment screenshot saved as treatment-screenshot.png');
        }
      } catch (error) {
        console.log('❌ Error navigating:', error.message);
      }
    }

    console.log('\n🎬 Browser will stay open for 15 seconds for visual inspection...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

findTestElements();