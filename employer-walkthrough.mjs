import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = '/tmp/symmetry-walkthrough';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function walkthrough() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  let screenNum = 1;
  
  async function capture(name) {
    const filename = `${String(screenNum).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${filename}`, fullPage: false });
    const h1 = await page.$eval('h1, h2', el => el.textContent).catch(() => '');
    console.log(`[${screenNum}] ${name}: ${h1 || page.url()}`);
    screenNum++;
  }
  
  try {
    // Login as Symmetry employer
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await capture('login-page');
    
    await page.fill('input[type="email"], input[name="email"]', 'employer@symmetry.local');
    await page.fill('input[type="password"], input[name="password"]', 'ChangeMe123!');
    await capture('login-filled');
    
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await capture('post-login-landing');
    
    // Explore what employer sees
    const currentUrl = page.url();
    console.log('Landed at:', currentUrl);
    
    // Check sidebar/nav for employer-specific options
    const navItems = await page.$$eval('nav a, aside a, [role="navigation"] a', links => 
      links.map(l => ({ text: l.textContent?.trim(), href: l.getAttribute('href') }))
    );
    console.log('Nav items:', navItems);
    
    // Try common employer routes
    const employerRoutes = ['/', '/cases', '/employer/new-case', '/settings', '/reports'];
    
    for (const route of employerRoutes) {
      try {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        const routeName = route === '/' ? 'dashboard' : route.replace(/\//g, '-').replace(/^-/, '');
        await capture(routeName);
      } catch (e) {
        console.log(`Error visiting ${route}: ${e.message}`);
      }
    }
    
    // Try clicking on a case if visible
    await page.goto(`${BASE_URL}/cases`);
    await page.waitForLoadState('networkidle');
    const firstCase = await page.$('table tbody tr');
    if (firstCase) {
      await firstCase.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await capture('case-detail-employer-view');
    }
    
    console.log('\n=== EMPLOYER WALKTHROUGH COMPLETE ===');
    console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
    
  } finally {
    await browser.close();
  }
}

walkthrough();
