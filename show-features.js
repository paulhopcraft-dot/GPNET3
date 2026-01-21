import { chromium } from 'playwright';

async function showFeatures() {
  console.log('🔍 Finding and showing ultra-modern features...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 2000,  // Go very slow so we can see
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Navigate and login
    console.log('📍 Going to http://localhost:5000...');
    await page.goto('http://localhost:5000');

    console.log('🔐 Logging in...');
    await page.fill('input[type="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');

    // Wait for cases to load
    console.log('⏳ Waiting for cases...');
    await page.waitForSelector('text=Selemani Mwomba', { timeout: 15000 });

    console.log('🏥 Clicking Selemani Mwomba case...');
    await page.click('text=Selemani Mwomba');
    await page.waitForTimeout(3000);

    console.log('📸 Taking screenshot of current view...');
    await page.screenshot({ path: 'current-view.png', fullPage: true });

    // Look for any tabs or navigation
    console.log('🔍 Looking for tabs or navigation...');

    // Try to find any clickable tabs
    const possibleTabs = await page.$$eval('button, [role="tab"], div[data-value], a', elements =>
      elements.map((el, idx) => ({
        index: idx,
        text: el.textContent?.trim() || '',
        tagName: el.tagName,
        dataValue: el.getAttribute('data-value'),
        className: el.className,
        id: el.id
      })).filter(el =>
        el.text.toLowerCase().includes('treatment') ||
        el.text.toLowerCase().includes('recovery') ||
        el.text.toLowerCase().includes('timeline') ||
        el.dataValue === 'treatment' ||
        el.className.includes('tab')
      )
    );

    console.log('🎯 Found possible tabs:');
    possibleTabs.forEach(tab => {
      console.log(`  - "${tab.text}" (${tab.tagName}) data-value=${tab.dataValue}`);
    });

    // Try clicking on Treatment tab if found
    if (possibleTabs.length > 0) {
      console.log('📊 Trying to click on Treatment/Recovery tab...');
      const treatmentTab = possibleTabs.find(tab =>
        tab.text.toLowerCase().includes('treatment') ||
        tab.dataValue === 'treatment'
      );

      if (treatmentTab) {
        console.log(`🎯 Clicking on: "${treatmentTab.text}"`);
        // Click using the index
        await page.locator(`button, [role="tab"], div[data-value], a`).nth(treatmentTab.index).click();
        await page.waitForTimeout(4000);

        console.log('📸 Taking screenshot after clicking Treatment tab...');
        await page.screenshot({ path: 'treatment-view.png', fullPage: true });
      }
    }

    // Look for ultra-modern features
    console.log('🌟 Checking for ultra-modern features...');

    const featureChecks = [
      { name: 'Glassmorphism panels', selector: '.glass-panel, [style*="backdrop-filter"]' },
      { name: 'Gradient backgrounds', selector: '.gradient-mesh-background, [style*="gradient"]' },
      { name: 'Pulse animations', selector: '.animate-pulse-slow, .confidence-indicator' },
      { name: 'Framer Motion hero', selector: '.hero-motion-container' },
      { name: 'Particle animations', selector: '.particle-container, .particle-dot' },
      { name: 'Progress rings', selector: '.progress-ring, svg circle' }
    ];

    for (const feature of featureChecks) {
      const elements = await page.$$(feature.selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} ${feature.name} elements`);

        // Highlight the first element
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            element.style.border = '3px solid red';
            element.style.boxShadow = '0 0 10px red';
            console.log('🔴 Highlighted:', selector);
          }
        }, feature.selector);
      } else {
        console.log(`❌ No ${feature.name} found`);
      }
    }

    console.log('📸 Taking final screenshot with highlighted features...');
    await page.screenshot({ path: 'features-highlighted.png', fullPage: true });

    console.log('\n🎉 Screenshots saved:');
    console.log('  📄 current-view.png - What you see now');
    console.log('  📊 treatment-view.png - After clicking Treatment tab');
    console.log('  🌟 features-highlighted.png - With features highlighted in red');

    console.log('\n⏰ Browser staying open for manual inspection...');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'error-view.png' });
  }
}

showFeatures().catch(console.error);