import { chromium } from 'playwright';

async function seeCurrentView() {
  console.log('📸 Taking screenshot of what you\'re currently seeing...');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('🌐 Going to http://localhost:5000...');
    await page.goto('http://localhost:5000');

    // Check if we need to login
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('🔐 Logging in...');
      await page.fill('input[type="email"]', 'admin@gpnet.local');
      await page.fill('input[type="password"]', 'ChangeMe123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    // Wait for content to load
    await page.waitForTimeout(2000);

    console.log('📸 Taking screenshot of current state...');
    await page.screenshot({
      path: 'what-you-see-now.png',
      fullPage: true
    });

    // Look for Andres Nieto or any selected case
    console.log('🔍 Looking for cases and selected state...');

    // Try to find Andres Nieto
    const andresCase = await page.$('text=Andres Nieto');
    if (andresCase) {
      console.log('✅ Found Andres Nieto case, clicking...');
      await page.click('text=Andres Nieto');
      await page.waitForTimeout(2000);

      console.log('📸 Taking screenshot after clicking Andres...');
      await page.screenshot({
        path: 'andres-case-view.png',
        fullPage: true
      });

      // Look for tabs
      console.log('🔍 Looking for tabs...');
      const tabs = await page.$$eval('button, [role="tab"], div[data-value]', elements =>
        elements.map(el => ({
          text: el.textContent?.trim() || '',
          tagName: el.tagName,
          className: el.className,
          dataValue: el.getAttribute('data-value'),
          role: el.getAttribute('role')
        })).filter(el =>
          el.text.length > 0 && (
            el.text.toLowerCase().includes('treatment') ||
            el.text.toLowerCase().includes('summary') ||
            el.text.toLowerCase().includes('recovery') ||
            el.text.toLowerCase().includes('timeline') ||
            el.role === 'tab' ||
            el.className.includes('tab')
          )
        )
      );

      console.log('🎯 Found possible tabs:');
      tabs.forEach(tab => {
        console.log(`  - "${tab.text}" (${tab.tagName}) role=${tab.role} data-value=${tab.dataValue}`);
      });

      // Look for Treatment tab specifically
      const treatmentTab = tabs.find(tab =>
        tab.text.toLowerCase().includes('treatment')
      );

      if (treatmentTab) {
        console.log(`📊 Found Treatment tab: "${treatmentTab.text}", clicking...`);
        await page.click(`text=${treatmentTab.text}`);
        await page.waitForTimeout(3000);

        console.log('📸 Taking screenshot of Treatment tab...');
        await page.screenshot({
          path: 'treatment-tab-view.png',
          fullPage: true
        });
      }
    }

    console.log('\n🎉 Screenshots saved:');
    console.log('  📄 what-you-see-now.png - Current view');
    console.log('  👨‍💼 andres-case-view.png - After clicking Andres case');
    if (await page.$('text=Treatment')) {
      console.log('  📊 treatment-tab-view.png - Treatment tab with ultra-modern features');
    }

    // Close browser after taking screenshots
    await browser.close();

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
    await browser.close();
  }
}

seeCurrentView().catch(console.error);