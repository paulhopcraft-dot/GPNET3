import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = '/tmp/gpnet3-walkthrough';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function walkthrough() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  const screens = [];
  let screenNum = 1;
  
  async function capture(name, notes = '') {
    const filename = `${String(screenNum).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${filename}`, fullPage: false });
    screens.push({ num: screenNum, name, filename, url: page.url(), notes });
    console.log(`[${screenNum}] ${name}: ${page.url()}`);
    screenNum++;
  }
  
  try {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await capture('login-page', 'Initial landing');
    
    await page.fill('input[type="email"], input[name="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"], input[name="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await capture('dashboard', 'After login');
    
    const navLinks = await page.$$('nav a, aside a, [role="navigation"] a, a[href^="/"]');
    const hrefs = new Set();
    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('/') && !href.includes('#') && href !== '/') {
        hrefs.add(href);
      }
    }
    
    console.log('Routes:', [...hrefs]);
    
    for (const href of hrefs) {
      try {
        await page.goto(`${BASE_URL}${href}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const routeName = href.replace(/\//g, '-').replace(/^-/, '') || 'home';
        await capture(routeName, `Route: ${href}`);
      } catch (e) {
        console.log(`Error: ${href} - ${e.message}`);
      }
    }
    
    console.log('\n=== SUMMARY ===');
    screens.forEach(s => console.log(`  ${s.num}. ${s.name} (${s.url})`));
    
  } finally {
    await browser.close();
  }
}

walkthrough();
