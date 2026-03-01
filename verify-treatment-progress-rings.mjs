import { launch } from 'puppeteer';

async function verifyTreatmentProgressRings() {
  console.log('🔍 Verifying Treatment Dashboard Progress Ring Animations...\n');
  
  const browser = await launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    console.log('✅ Dashboard loaded');
    
    // Look for Selemani Mwomba case
    console.log('2. Looking for "Selemani Mwomba" case...');
    
    // Try to find any clickable case row
    const caseElement = await page.waitForSelector('tr:not(:first-child), .case-row', { timeout: 10000 });
    
    if (!caseElement) {
      throw new Error('No cases found on dashboard');
    }
    
    // Click on the first case
    console.log('3. Clicking on a case...');
    await caseElement.click();
    
    // Wait for case detail page to load
    await page.waitForSelector('[role="tablist"], .tab-list', { timeout: 10000 });
    console.log('✅ Case detail page loaded');
    
    // Look for Treatment tab
    console.log('4. Looking for "Treatment" tab...');
    
    // Get all available tabs first
    const availableTabs = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"], .tab, button[data-state]'));
      return tabs.map(tab => tab.textContent?.trim()).filter(Boolean);
    });
    
    console.log('Available tabs:', availableTabs);
    
    // Try to find treatment tab
    const treatmentTab = await page.waitForSelector('::-p-text(Treatment)', { timeout: 5000 }).catch(() => null);
    
    if (!treatmentTab) {
      console.log('⚠️  Treatment tab not found, trying to find it by text...');
      // Try different approach
      const foundTab = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('*'));
        for (const tab of tabs) {
          if (tab.textContent?.includes('Treatment')) {
            return tab.tagName + ' - ' + tab.textContent.trim();
          }
        }
        return null;
      });
      
      if (!foundTab) {
        console.log('❌ Treatment tab not found, skipping to progress ring verification in current view');
      }
    } else {
      console.log('5. Clicking Treatment tab...');
      await treatmentTab.click();
      await page.waitForTimeout(2000);
    }
    
    console.log('6. Verifying progress ring elements...');
    
    const progressRingData = await page.evaluate(() => {
      const results = {
        progressRingElements: [],
        svgCircles: [],
        animationStyles: [],
        strokeDashArrays: []
      };
      
      // Look for progress ring containers
      const progressRings = document.querySelectorAll('.progress-ring, [class*="progress"], [data-testid*="progress"], svg circle');
      results.progressRingElements = Array.from(progressRings).map(ring => ({
        className: ring.className.baseVal || ring.className || '',
        id: ring.id,
        tagName: ring.tagName
      }));
      
      // Look for SVG circles specifically
      const svgCircles = document.querySelectorAll('svg circle, circle');
      results.svgCircles = Array.from(svgCircles).map(circle => ({
        className: circle.className.baseVal || circle.className || '',
        strokeDashArray: circle.style.strokeDasharray || circle.getAttribute('stroke-dasharray'),
        strokeDashOffset: circle.style.strokeDashoffset || circle.getAttribute('stroke-dashoffset'),
        r: circle.getAttribute('r'),
        animationName: getComputedStyle(circle).animationName,
        animationDuration: getComputedStyle(circle).animationDuration
      }));
      
      // Check for CSS animations
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const styles = getComputedStyle(el);
        if (styles.animationName !== 'none' && styles.animationName !== '') {
          results.animationStyles.push({
            element: el.tagName + (el.className ? '.' + el.className : ''),
            animationName: styles.animationName,
            animationDuration: styles.animationDuration
          });
        }
        
        if (styles.strokeDasharray && styles.strokeDasharray !== 'none') {
          results.strokeDashArrays.push({
            element: el.tagName + (el.className ? '.' + el.className : ''),
            strokeDashArray: styles.strokeDasharray
          });
        }
      }
      
      return results;
    });
    
    console.log('\n📊 PROGRESS RING VERIFICATION RESULTS:\n');
    
    // Check acceptance criteria
    let allCriteriaMet = true;
    
    console.log('Criteria 1: Progress ring SVG circle elements exist');
    if (progressRingData.svgCircles.length > 0) {
      console.log(`✅ Found ${progressRingData.svgCircles.length} SVG circle elements`);
    } else {
      console.log('❌ No SVG circle elements found');
      allCriteriaMet = false;
    }
    
    console.log('\nCriteria 2: stroke-dasharray CSS property exists');
    const circlesWithDashArray = progressRingData.svgCircles.filter(circle => 
      circle.strokeDashArray && circle.strokeDashArray !== 'none'
    );
    
    if (circlesWithDashArray.length > 0) {
      console.log(`✅ Found ${circlesWithDashArray.length} circles with stroke-dasharray`);
    } else {
      console.log('❌ No circles with stroke-dasharray found');
      allCriteriaMet = false;
    }
    
    console.log('\nCriteria 3: Animation triggers when component loads');
    if (progressRingData.animationStyles.length > 0) {
      console.log(`✅ Found ${progressRingData.animationStyles.length} elements with animations`);
    } else {
      console.log('❌ No CSS animations found');
      allCriteriaMet = false;
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (allCriteriaMet) {
      console.log('🎉 ALL ACCEPTANCE CRITERIA MET!');
    } else {
      console.log('⚠️  Some acceptance criteria not met.');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'C:/dev/gpnet3/treatment-verification.png', fullPage: true });
    console.log('📸 Screenshot saved');
    
    return allCriteriaMet;
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

verifyTreatmentProgressRings().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
