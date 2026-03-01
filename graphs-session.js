import { chromium } from 'playwright';

async function launchGraphsSession() {
  console.log('🚀 Launching Preventli application for graphs work...');

  // Launch browser in headed mode (visible)
  const browser = await chromium.launch({
    headless: false,
    devtools: true,
    slowMo: 100  // Slower for better visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  try {
    console.log('📊 Navigating to localhost:5000...');
    await page.goto('http://localhost:5000', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('✅ Application loaded successfully!');
    console.log('🎨 Ready to work on graphs together!');
    console.log('');
    console.log('Browser window is open - you can interact with it.');
    console.log('DevTools are available (F12).');
    console.log('Press Ctrl+C to close when done.');

    // Keep the session alive
    await page.waitForEvent('close');

  } catch (error) {
    console.error('❌ Error loading application:', error.message);

    // Try to show current page content for debugging
    try {
      const title = await page.title();
      const url = page.url();
      console.log(`Current page: ${title} (${url})`);
    } catch (e) {
      console.log('Could not get page info');
    }

  } finally {
    await browser.close();
  }
}

launchGraphsSession().catch(console.error);