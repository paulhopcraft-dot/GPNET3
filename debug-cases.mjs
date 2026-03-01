import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Navigating to application...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('🔍 Checking available cases on dashboard...');
    
    // Look for any case rows
    const caseRows = await page.locator('tbody tr').count();
    console.log('Found ' + caseRows + ' case rows');
    
    // Check for specific case names
    const pageText = await page.textContent('body');
    console.log('Page contains Selemani:', pageText.includes('Selemani'));
    console.log('Page contains Mwomba:', pageText.includes('Mwomba'));
    
    // Look for any clickable case elements
    const caseLinks = await page.locator('tr').count();
    console.log('Found ' + caseLinks + ' table rows');
    
    // Try to find the first case and click it
    const firstCaseRow = await page.locator('tbody tr').first();
    if (await firstCaseRow.count() > 0) {
      console.log('🔍 Clicking first available case...');
      await firstCaseRow.click();
      await page.waitForLoadState('networkidle');
      
      console.log('🔍 Looking for Treatment tab...');
      const treatmentTab = await page.locator('text=Treatment').first();
      if (await treatmentTab.count() > 0) {
        console.log('🔍 Found Treatment tab, clicking...');
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
      } else {
        console.log('❌ Treatment tab not found');
      }
    } else {
      console.log('❌ No case rows found');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
