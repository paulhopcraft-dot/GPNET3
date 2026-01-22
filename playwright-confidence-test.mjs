#!/usr/bin/env node
import { chromium } from 'playwright';

async function testConfidenceIndicatorPulse() {
  console.log('🎭 PLAYWRIGHT LIVE BROWSER TEST');
  console.log('='.repeat(50));
  console.log('Story 26: indicator-pulse-animations');
  console.log('Target: .confidence-indicator.animate-pulse-slow');
  console.log('');

  const browser = await chromium.launch({
    headless: false, // Show the browser so you can see it!
    slowMo: 1000     // Slow down actions so we can observe
  });

  try {
    const page = await browser.newPage();

    console.log('🌐 Navigating to http://localhost:5000...');
    await page.goto('http://localhost:5000');

    console.log('🔑 Logging in...');
    // Auto-login (we can see from logs user is already logged in)
    await page.waitForTimeout(2000);

    console.log('👤 Looking for Selemani Mwomba...');
    // Look for the case link
    await page.waitForSelector('text=Selemani Mwomba', { timeout: 10000 });
    await page.click('text=Selemani Mwomba');

    console.log('🏥 Clicking Treatment tab...');
    await page.waitForTimeout(2000);
    // Look for Treatment button/tab
    const treatmentSelector = '[data-value="treatment"], button:has-text("Treatment"), .tab-treatment, [role="tab"]:has-text("Treatment")';
    await page.waitForSelector(treatmentSelector, { timeout: 10000 });
    await page.click(treatmentSelector);

    console.log('🔍 Checking for confidence indicator...');
    await page.waitForTimeout(3000); // Give time for content to load

    // Check for the confidence indicator with pulse animation
    const confidenceIndicator = await page.locator('.confidence-indicator.animate-pulse-slow').first();
    const exists = await confidenceIndicator.count() > 0;

    if (exists) {
      console.log('✅ SUCCESS: .confidence-indicator.animate-pulse-slow found!');
      console.log('🎯 Animation classes detected');

      // Get the text content to verify it shows confidence %
      const text = await confidenceIndicator.textContent();
      console.log(`📊 Confidence text: "${text}"`);

      // Check if the element has the animate-pulse-slow class
      const hasAnimation = await confidenceIndicator.evaluate(el =>
        el.classList.contains('animate-pulse-slow')
      );

      if (hasAnimation) {
        console.log('🎨 PULSE ANIMATION CONFIRMED!');
        console.log('');
        console.log('🎉 STORY 26 VERIFICATION: COMPLETE ✅');
        return true;
      } else {
        console.log('❌ Animation class not found');
        return false;
      }
    } else {
      console.log('❌ FAILED: .confidence-indicator.animate-pulse-slow NOT found');
      console.log('🔍 Looking for alternative selectors...');

      // Check what confidence indicators exist
      const allConfidence = await page.locator('[class*="confidence"], [class*="Confidence"]').count();
      console.log(`Found ${allConfidence} confidence-related elements`);

      return false;
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 10 seconds for visual inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testConfidenceIndicatorPulse().then(success => {
  if (success) {
    console.log('');
    console.log('🎊 CONFIDENCE PULSE ANIMATION WORKING!');
    console.log('Ready for next story implementation...');
    process.exit(0);
  } else {
    console.log('');
    console.log('🚨 CONFIDENCE PULSE ANIMATION NEEDS DEBUGGING');
    process.exit(1);
  }
});