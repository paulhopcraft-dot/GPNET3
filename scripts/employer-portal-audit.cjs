/**
 * Employer Portal Comprehensive Audit
 * Tests all flows from dashboard through case lifecycle
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5000';
const CREDENTIALS = { email: 'employer@test.com', password: 'password123' };

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(msg, type = 'info') {
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : '→';
  console.log(`${prefix} ${msg}`);
  if (type === 'pass') results.passed.push(msg);
  if (type === 'fail') results.failed.push(msg);
  if (type === 'warn') results.warnings.push(msg);
}

async function waitForLoad(page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

async function login(page) {
  log('Logging in as employer...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', CREDENTIALS.email);
  await page.fill('input[type="password"]', CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/*', { timeout: 15000 });
  await waitForLoad(page);
  log('Login successful', 'pass');
}

async function testDashboard(page) {
  log('\n=== TESTING DASHBOARD ===');
  await page.goto(BASE_URL);
  await waitForLoad(page);

  // Check for key dashboard elements
  const hasOrgName = await page.locator('text=Symmetry').first().isVisible().catch(() => false);
  if (hasOrgName) log('Organization name displayed', 'pass');
  else log('Organization name missing', 'fail');

  // Check for case count or action cards
  const hasActionCards = await page.locator('[class*="Card"]').count() > 0;
  if (hasActionCards) log('Dashboard cards present', 'pass');
  else log('No dashboard cards found', 'warn');

  // Check navigation links
  const navLinks = await page.locator('nav a').count();
  log(`Found ${navLinks} navigation links`);
}

async function testCasesList(page) {
  log('\n=== TESTING CASES LIST ===');
  await page.goto(`${BASE_URL}/cases`);
  await waitForLoad(page);

  // Check for cases table or list
  const caseRows = await page.locator('tr, [class*="case"]').count();
  if (caseRows > 0) log(`Found ${caseRows} case rows`, 'pass');
  else log('No cases displayed', 'fail');

  // Try clicking on first case
  const firstCase = page.locator('tr').nth(1);
  if (await firstCase.isVisible().catch(() => false)) {
    await firstCase.click();
    await waitForLoad(page);
    const url = page.url();
    if (url.includes('/employer/case/') || url.includes('/summary/')) {
      log('Case detail navigation works', 'pass');
      return true; // Return true to indicate we're on case detail
    }
  }
  return false;
}

async function testCaseDetailTabs(page) {
  log('\n=== TESTING CASE DETAIL TABS ===');

  const tabs = ['summary', 'injury', 'timeline', 'financial', 'risk', 'contacts', 'treatment'];

  for (const tab of tabs) {
    try {
      const tabButton = page.locator(`[value="${tab}"], button:has-text("${tab}")`).first();
      if (await tabButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tabButton.click();
        await page.waitForTimeout(500);

        // Check if tab content loaded (no error messages)
        const hasError = await page.locator('text=Error, text=failed, text=undefined').first().isVisible().catch(() => false);
        if (hasError) {
          log(`Tab "${tab}" has errors`, 'fail');
        } else {
          log(`Tab "${tab}" loads correctly`, 'pass');
        }
      } else {
        log(`Tab "${tab}" not found`, 'warn');
      }
    } catch (e) {
      log(`Tab "${tab}" error: ${e.message}`, 'fail');
    }
  }
}

async function testNewCaseFlow(page) {
  log('\n=== TESTING NEW CASE FLOW ===');
  await page.goto(`${BASE_URL}/employer/new-case`);
  await waitForLoad(page);

  // Check for gateway question
  const hasGateway = await page.locator('text=lodged a claim, text=WorkSafe').first().isVisible().catch(() => false);
  if (hasGateway) log('Gateway question displayed', 'pass');
  else log('Gateway question missing', 'warn');

  // Check for form elements
  const hasForm = await page.locator('form, input, select').first().isVisible().catch(() => false);
  if (hasForm) log('New case form present', 'pass');
  else log('New case form missing', 'fail');

  // Check for worker selection
  const hasWorkerSelect = await page.locator('text=Select a worker, text=existing worker, text=new worker').first().isVisible().catch(() => false);
  if (hasWorkerSelect) log('Worker selection available', 'pass');
}

async function testRTWPlanner(page) {
  log('\n=== TESTING RTW PLANNER ===');
  await page.goto(`${BASE_URL}/rtw-planner`);
  await waitForLoad(page);

  const pageContent = await page.content();
  if (pageContent.includes('RTW') || pageContent.includes('Return to Work') || pageContent.includes('Planner')) {
    log('RTW Planner page loads', 'pass');
  } else {
    log('RTW Planner content missing', 'warn');
  }

  // Check for 404 or error
  const has404 = await page.locator('text=404, text=Not Found').first().isVisible().catch(() => false);
  if (has404) log('RTW Planner shows 404', 'fail');
}

async function testCheckins(page) {
  log('\n=== TESTING CHECK-INS ===');
  await page.goto(`${BASE_URL}/checkins`);
  await waitForLoad(page);

  const has404 = await page.locator('text=404, text=Not Found').first().isVisible().catch(() => false);
  if (has404) {
    log('Check-ins page shows 404 - NOT IMPLEMENTED', 'fail');
  } else {
    log('Check-ins page loads', 'pass');
  }
}

async function testFinancials(page) {
  log('\n=== TESTING FINANCIALS ===');
  await page.goto(`${BASE_URL}/financials`);
  await waitForLoad(page);

  const has404 = await page.locator('text=404, text=Not Found').first().isVisible().catch(() => false);
  if (has404) {
    log('Financials page shows 404 - NOT IMPLEMENTED', 'fail');
  } else {
    log('Financials page loads', 'pass');
  }
}

async function testPredictions(page) {
  log('\n=== TESTING PREDICTIONS ===');
  await page.goto(`${BASE_URL}/predictions`);
  await waitForLoad(page);

  const has404 = await page.locator('text=404, text=Not Found').first().isVisible().catch(() => false);
  if (has404) {
    log('Predictions page shows 404 - NOT IMPLEMENTED', 'fail');
  } else {
    log('Predictions page loads', 'pass');
  }
}

async function testRiskPage(page) {
  log('\n=== TESTING RISK PAGE ===');
  await page.goto(`${BASE_URL}/risk`);
  await waitForLoad(page);

  const has404 = await page.locator('text=404, text=Not Found').first().isVisible().catch(() => false);
  if (has404) {
    log('Risk page shows 404 - NOT IMPLEMENTED', 'fail');
  } else {
    log('Risk page loads', 'pass');
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ PASSED: ${results.passed.length}`);
  console.log(`❌ FAILED: ${results.failed.length}`);
  console.log(`⚠️  WARNINGS: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed items:');
    results.failed.forEach(f => console.log(`  - ${f}`));
  }

  if (results.warnings.length > 0) {
    console.log('\nWarnings:');
    results.warnings.forEach(w => console.log(`  - ${w}`));
  }
}

async function main() {
  console.log('Starting Employer Portal Audit...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await login(page);
    await testDashboard(page);
    const onCaseDetail = await testCasesList(page);
    if (onCaseDetail) {
      await testCaseDetailTabs(page);
    }
    await testNewCaseFlow(page);
    await testRTWPlanner(page);
    await testCheckins(page);
    await testFinancials(page);
    await testPredictions(page);
    await testRiskPage(page);

    await printSummary();

  } catch (error) {
    console.error('Audit failed:', error.message);
  }

  console.log('\nBrowser will stay open for manual inspection...');
  // Keep browser open
  await new Promise(() => {});
}

main();
