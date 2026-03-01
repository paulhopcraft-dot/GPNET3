const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Navigating to application...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('🔍 Looking for Selemani Mwomba case...');
    const caseLink = await page.locator('text=Selemani Mwomba').first();
    if (await caseLink.count() === 0) {
      console.log('❌ Selemani Mwomba case not found on dashboard');
      return;
    }

    console.log('🔍 Clicking on Selemani Mwomba case...');
    await caseLink.click();
    await page.waitForLoadState('networkidle');

    console.log('🔍 Looking for Treatment tab...');
    const treatmentTab = await page.locator('text=Treatment').or(page.locator('[data-tab="treatment"]'));
    if (await treatmentTab.count() === 0) {
      console.log('❌ Treatment tab not found');
      return;
    }

    console.log('🔍 Clicking Treatment tab...');
    await treatmentTab.click();
    await page.waitForTimeout(1000);

    console.log('🔍 Verifying progress rings structure...');
    
    const progressContainer = await page.locator('.progress-rings-container');
    const containerExists = await progressContainer.count() > 0;
    console.log(containerExists ? '✅ .progress-rings-container element exists' : '❌ .progress-rings-container element missing');

    const svgCircles = await page.locator('.progress-ring svg circle');
    const circleCount = await svgCircles.count();
    console.log(circleCount > 0 ? '✅ .progress-ring svg circle elements exist (found ' + circleCount + ')' : '❌ .progress-ring svg circle elements missing');

    const progressRings = await page.locator('.progress-ring');
    const ringCount = await progressRings.count();
    console.log(ringCount === 3 ? '✅ 3 progress rings displayed (found ' + ringCount + ')' : '❌ Expected 3 progress rings, found ' + ringCount);

    const workCapacityLabel = await page.locator('text=Work Capacity').count() > 0;
    const recoveryTimeLabel = await page.locator('text=Recovery Time').count() > 0;
    const riskLevelLabel = await page.locator('text=Risk Level').count() > 0;

    console.log(workCapacityLabel ? '✅ Work Capacity ring found' : '❌ Work Capacity ring missing');
    console.log(recoveryTimeLabel ? '✅ Recovery Time ring found' : '❌ Recovery Time ring missing');
    console.log(riskLevelLabel ? '✅ Risk Level ring found' : '❌ Risk Level ring missing');

    if (circleCount > 0) {
      console.log('✅ SVG circle structure exists');
      const firstCircle = await svgCircles.first();
      const stroke = await firstCircle.getAttribute('stroke');
      const fill = await firstCircle.getAttribute('fill');
      console.log('🔍 Circle attributes - stroke: ' + stroke + ', fill: ' + fill);
    }

    console.log('\n📋 Verification Summary:');
    console.log('- Container exists: ' + containerExists);
    console.log('- SVG circles found: ' + circleCount);
    console.log('- Progress rings count: ' + ringCount);
    console.log('- All labels present: ' + (workCapacityLabel && recoveryTimeLabel && riskLevelLabel));

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
