import { chromium } from 'playwright';

async function navigateToTreatment() {
  console.log('🚀 Connecting to existing browser or launching new one...');

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('✅ Connected to existing browser');
  } catch (e) {
    console.log('🚀 Launching new browser...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 1000,
      args: ['--start-maximized', '--remote-debugging-port=9222']
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Navigating to http://localhost:5000...');
    await page.goto('http://localhost:5000');
    await page.waitForTimeout(2000);

    // Login if needed
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('🔐 Logging in...');
      await page.fill('input[type="email"]', 'admin@gpnet.local');
      await page.fill('input[type="password"]', 'ChangeMe123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    console.log('🏥 Looking for Selemani Mwomba case...');

    // Click on Selemani Mwomba case
    try {
      await page.click('text=Selemani Mwomba', { timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log('✅ Selemani Mwomba case selected');
    } catch (e) {
      console.log('Selemani already selected or not found, continuing...');
    }

    console.log('🔍 Looking for Treatment tab...');

    // Try multiple selectors for Treatment tab
    const treatmentSelectors = [
      'button[data-value="treatment"]',
      '[data-value="treatment"]',
      'button:has-text("Treatment")',
      '[role="tab"]:has-text("Treatment")',
      'div[data-value="treatment"]',
      '.tab-treatment',
      'text=Treatment'
    ];

    let foundTab = false;
    for (const selector of treatmentSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`📊 Found Treatment tab with selector: ${selector}`);
          await page.click(selector);
          await page.waitForTimeout(3000);
          foundTab = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!foundTab) {
      console.log('🔍 Treatment tab not found with common selectors, taking screenshot for debugging...');
      await page.screenshot({ path: 'treatment-tab-debug.png', fullPage: true });
    }

    console.log('📸 Taking screenshot of current state...');
    await page.screenshot({ path: 'current-dashboard-state.png', fullPage: true });

    console.log('🎯 Looking for ultra-modern features...');

    // Check for our implemented features
    const features = [
      { selector: '.glass-panel', name: 'Glassmorphism panels' },
      { selector: '.gradient-mesh-background', name: 'Gradient mesh background' },
      { selector: '.animate-pulse-slow', name: 'Pulse animations' },
      { selector: '.hero-motion-container', name: 'Framer Motion hero container' },
      { selector: '.particle-container', name: 'Particle animations' },
      { selector: '.progress-ring', name: 'Progress rings' }
    ];

    for (const feature of features) {
      const element = await page.$(feature.selector);
      if (element) {
        console.log(`✅ Found: ${feature.name}`);
      } else {
        console.log(`❌ Missing: ${feature.name}`);
      }
    }

    console.log('\n🎉 Dashboard ready for inspection!');
    console.log('Screenshots saved:');
    console.log('  📄 current-dashboard-state.png');
    if (!foundTab) {
      console.log('  🐛 treatment-tab-debug.png (for troubleshooting)');
    }

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'navigation-error.png' });
  }
}

navigateToTreatment().catch(console.error);