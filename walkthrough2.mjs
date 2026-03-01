import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = '/tmp/gpnet3-walkthrough';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// All routes from App.tsx
const ROUTES = [
  '/',
  '/cases',
  '/workspace', 
  '/lifecycle',
  '/settings',
  '/sessions',
  '/pre-employment-form',
  '/prevention-assessment-form',
  '/injury-assessment-form',
  '/comprehensive-rtw-form',
  '/wellness-form',
  '/mental-health-form',
  '/exit-health-check-form',
  '/employer/new-case',
  '/reports',
  '/audit',
];

async function walkthrough() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  
  const screens = [];
  let screenNum = 1;
  
  async function capture(name, notes = '') {
    const filename = `${String(screenNum).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/${filename}`, fullPage: false });
    
    // Get page title and any visible headers
    const title = await page.title();
    const h1 = await page.$eval('h1', el => el.textContent).catch(() => '');
    
    screens.push({ num: screenNum, name, filename, url: page.url(), title, h1, notes });
    console.log(`[${screenNum}] ${name}: ${page.url()} - "${h1 || title}"`);
    screenNum++;
  }
  
  try {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await capture('01-login-page');
    
    await page.fill('input[type="email"], input[name="email"]', 'admin@gpnet.local');
    await page.fill('input[type="password"], input[name="password"]', 'ChangeMe123!');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Visit each route
    for (const route of ROUTES) {
      try {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        
        const routeName = route === '/' ? 'dashboard' : route.replace(/\//g, '-').replace(/^-/, '');
        await capture(routeName, `Route: ${route}`);
        
        // For cases page, try to click on a case to see detail
        if (route === '/cases') {
          const caseLink = await page.$('table tbody tr a, [data-testid="case-row"], .case-item');
          if (caseLink) {
            await caseLink.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            await capture('case-detail', 'Individual case view');
          }
        }
        
      } catch (e) {
        console.log(`Error visiting ${route}: ${e.message}`);
      }
    }
    
    // Summary
    console.log('\n=== WALKTHROUGH COMPLETE ===');
    console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
    console.log(`\nAll Screens:`);
    screens.forEach(s => {
      console.log(`  ${s.num}. ${s.name}`);
      console.log(`     URL: ${s.url}`);
      console.log(`     Header: ${s.h1 || s.title || '(none)'}`);
    });
    
    // Write summary JSON
    fs.writeFileSync(`${SCREENSHOTS_DIR}/summary.json`, JSON.stringify(screens, null, 2));
    
  } finally {
    await browser.close();
  }
}

walkthrough();
