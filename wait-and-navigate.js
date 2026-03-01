import { chromium } from 'playwright';

async function waitAndNavigate() {
  console.log('🚀 Launching browser to wait for data and navigate to Treatment tab...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to http://localhost:5000...');
    await page.goto('http://localhost:5000');

    // Login
    console.log('🔐 Logging in...');
    await page.fill('input[type="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for cases to load...');
    // Wait for the loading to finish and cases to appear
    await page.waitForSelector('text=Selemani Mwomba', { timeout: 30000 });

    console.log('✅ Cases loaded! Clicking on Selemani Mwomba...');
    await page.click('text=Selemani Mwomba');
    await page.waitForTimeout(2000);

    console.log('🔍 Looking for Treatment tab/button...');

    // Wait for case details to load, then look for Treatment tab
    await page.waitForTimeout(3000);

    // Try multiple approaches to find and click Treatment tab
    const treatmentClickOptions = [
      { selector: 'button[data-value="treatment"]', name: 'data-value button' },
      { selector: '[data-value="treatment"]', name: 'data-value element' },
      { selector: 'button:has-text("Treatment")', name: 'button with Treatment text' },
      { selector: '[role="tab"]:has-text("Treatment")', name: 'tab with Treatment text' },
      { selector: '.tabs-list button:nth-child(2)', name: 'second tab button' },
      { selector: 'div[data-state="inactive"][data-value="treatment"]', name: 'inactive treatment tab' }
    ];

    let foundTreatmentTab = false;
    for (const option of treatmentClickOptions) {
      try {
        const element = await page.$(option.selector);
        if (element) {
          console.log(`📊 Found Treatment tab using: ${option.name}`);
          await page.click(option.selector);
          await page.waitForTimeout(3000);
          foundTreatmentTab = true;
          break;
        }
      } catch (e) {
        console.log(`❌ ${option.name} failed: ${e.message}`);
      }
    }

    if (!foundTreatmentTab) {
      console.log('🔍 Trying to find tabs in page...');
      // Get all clickable elements that might be tabs
      const allTabs = await page.$$eval('button, [role="tab"], div[data-value]', elements =>
        elements.map(el => ({
          text: el.textContent?.trim() || '',
          tagName: el.tagName,
          dataValue: el.getAttribute('data-value'),
          role: el.getAttribute('role'),
          className: el.className
        }))
      );

      console.log('Available tabs/buttons:');
      allTabs.forEach((tab, idx) => {
        if (tab.text.toLowerCase().includes('treatment') || tab.text.toLowerCase().includes('tab') || tab.dataValue) {
          console.log(`  ${idx}: ${tab.text} (${tab.tagName}) data-value=${tab.dataValue} role=${tab.role}`);
        }
      });
    }

    console.log('📸 Taking screenshot of current state...');
    await page.screenshot({ path: 'treatment-search-state.png', fullPage: true });

    console.log('🎯 Checking for ultra-modern features in current view...');

    // Look for our implemented features
    const features = [
      { selector: '.glass-panel', name: 'Glassmorphism panels', description: 'Backdrop blur effects' },
      { selector: '.gradient-mesh-background', name: 'Gradient mesh background', description: 'Animated gradient backgrounds' },
      { selector: '.animate-pulse-slow', name: 'Pulse animations', description: 'Confidence indicators with pulse' },
      { selector: '.hero-motion-container', name: 'Framer Motion hero container', description: 'Motion wrapper for hero section' },
      { selector: '.particle-container', name: 'Particle animations', description: 'Animated particles on charts' },
      { selector: '.progress-ring', name: 'Progress rings', description: 'SVG progress rings with animations' },
      { selector: '[style*="backdrop-filter"]', name: 'Backdrop filter elements', description: 'CSS backdrop-filter for glassmorphism' },
      { selector: '[style*="gradient"]', name: 'Gradient elements', description: 'CSS gradients' },
      { selector: '.confidence-indicator', name: 'Confidence indicators', description: 'Treatment plan confidence scores' }
    ];

    let foundFeatures = 0;
    for (const feature of features) {
      const element = await page.$(feature.selector);
      if (element) {
        console.log(`✅ Found: ${feature.name} - ${feature.description}`);
        foundFeatures++;
      } else {
        console.log(`❌ Missing: ${feature.name} - ${feature.description}`);
      }
    }

    console.log(`\n🎉 Ultra-modern dashboard scan complete!`);
    console.log(`📊 Found ${foundFeatures}/${features.length} ultra-modern features`);
    console.log(`📄 Screenshot saved: treatment-search-state.png`);

    if (foundFeatures > 0) {
      console.log('✨ Some ultra-modern features are visible in the current view!');
    } else {
      console.log('🔍 Ultra-modern features may be in the Treatment tab - need to navigate there');
    }

    // Keep browser open for manual inspection
    console.log('\n⏰ Browser will stay open for manual navigation...');
    console.log('💡 Try manually clicking on tabs to find the Treatment section');
    console.log('🎯 Look for: glassmorphism panels, gradient backgrounds, pulse animations');

    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'navigation-error.png' });
  }
}

waitAndNavigate().catch(console.error);