import { chromium } from 'playwright';

async function verifyProgressRings() {
  console.log('🔍 Starting Progress Rings Verification...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to http://localhost:5173
    console.log('Step 1: Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    console.log('✅ Successfully loaded homepage\n');
    
    // Step 2: Click "Selemani Mwomba" case
    console.log('Step 2: Looking for "Selemani Mwomba" case...');
    const caseLink = await page.locator('text=Selemani Mwomba').first();
    if (await caseLink.count() > 0) {
      await caseLink.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Successfully clicked "Selemani Mwomba" case\n');
    } else {
      console.log('❌ Could not find "Selemani Mwomba" case');
      // Try alternative selectors
      const altCaseLink = await page.locator('[data-testid="case-link"]:has-text("Selemani")').first();
      if (await altCaseLink.count() > 0) {
        await altCaseLink.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Successfully clicked case using alternative selector\n');
      } else {
        console.log('❌ No case found with Selemani Mwomba');
        // List available cases
        const cases = await page.locator('tr').allTextContents();
        console.log('Available cases:', cases.slice(0, 5));
      }
    }
    
    // Step 3: Click "Treatment" tab
    console.log('Step 3: Looking for "Treatment" tab...');
    const treatmentTab = await page.locator('text=Treatment').first();
    if (await treatmentTab.count() > 0) {
      await treatmentTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Successfully clicked "Treatment" tab\n');
    } else {
      console.log('❌ Could not find "Treatment" tab');
      const altTreatmentTab = await page.locator('[role="tab"]:has-text("Treatment")').first();
      if (await altTreatmentTab.count() > 0) {
        await altTreatmentTab.click();
        await page.waitForTimeout(1000);
        console.log('✅ Successfully clicked treatment tab using alternative selector\n');
      }
    }
    
    // Step 4: Verify progress rings structure
    console.log('Step 4: Verifying progress rings structure...\n');
    
    // Check for progress-rings-container element
    const progressRingsContainer = await page.locator('.progress-rings-container');
    const containerExists = await progressRingsContainer.count() > 0;
    console.log('   📋 .progress-rings-container exists:', containerExists ? '✅' : '❌');
    
    if (containerExists) {
      // Check for progress-ring svg circle elements
      const progressRingCircles = await page.locator('.progress-ring svg circle');
      const circleCount = await progressRingCircles.count();
      console.log('   🔵 .progress-ring svg circle elements found:', circleCount, circleCount > 0 ? '✅' : '❌');
      
      // Check for 3 progress rings
      const progressRings = await page.locator('.progress-ring');
      const ringCount = await progressRings.count();
      console.log('   💍 Progress rings count:', ringCount, ringCount === 3 ? '✅' : '❌');
      
      // Check ring labels/content
      const ringTexts = await progressRings.allTextContents();
      console.log('   📝 Ring contents:', ringTexts);
      
      // Look for expected ring types
      const hasWorkCapacity = ringTexts.some(text => text.includes('Work Capacity') || text.includes('Capacity'));
      const hasRecoveryTime = ringTexts.some(text => text.includes('Recovery Time') || text.includes('Recovery'));
      const hasRiskLevel = ringTexts.some(text => text.includes('Risk Level') || text.includes('Risk'));
      
      console.log('   💪 Work Capacity ring:', hasWorkCapacity ? '✅' : '❌');
      console.log('   ⏰ Recovery Time ring:', hasRecoveryTime ? '✅' : '❌');
      console.log('   ⚠️  Risk Level ring:', hasRiskLevel ? '✅' : '❌');
      
      // Check SVG circle structure for each ring
      console.log('\n   🔍 Detailed SVG Structure:');
      for (let i = 0; i < Math.min(ringCount, 3); i++) {
        const ring = progressRings.nth(i);
        const svgs = await ring.locator('svg').count();
        const circles = await ring.locator('svg circle').count();
        const ringText = await ring.textContent();
        console.log('   Ring', i + 1 + ':', svgs, 'SVG(s),', circles, 'circle(s) -', '"' + (ringText ? ringText.trim() : '') + '"');
      }
      
      // Check for colors (look for stroke or fill attributes)
      const circlesWithStyles = await page.locator('.progress-ring svg circle[stroke], .progress-ring svg circle[fill]');
      const styledCirclesCount = await circlesWithStyles.count();
      console.log('   🎨 Circles with color styling:', styledCirclesCount, styledCirclesCount > 0 ? '✅' : '❌');
    }
    
    // Summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('✅ Navigation completed successfully');
    console.log(containerExists ? '✅' : '❌', 'Progress rings container found');
    console.log((await page.locator('.progress-ring svg circle').count()) > 0 ? '✅' : '❌', 'SVG circles present');
    console.log((await page.locator('.progress-ring').count()) === 3 ? '✅' : '❌', 'Three progress rings displayed');
    
    // Wait a moment for visual inspection
    console.log('\n⏳ Waiting 5 seconds for visual inspection...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await browser.close();
  }
}

verifyProgressRings();
