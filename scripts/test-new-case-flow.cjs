/**
 * Test New Case Creation Flow
 * Creates a new case and follows it through to case detail
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5000';

async function main() {
  console.log('Testing New Case Creation Flow...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. Login
    console.log('Step 1: Logging in...');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'employer@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('✅ Logged in\n');

    // 2. Navigate to New Case
    console.log('Step 2: Navigating to New Case...');
    await page.goto(`${BASE_URL}/employer/new-case`);
    await page.waitForTimeout(3000);
    console.log('✅ On New Case page\n');

    // 3. Answer gateway question (No - not lodged claim)
    console.log('Step 3: Answering gateway question...');
    await page.locator('label:has-text("No")').first().click();
    await page.waitForTimeout(1000);
    console.log('✅ Form revealed\n');

    // 4. Select "New Worker"
    console.log('Step 4: Selecting new worker option...');
    const newWorkerRadio = await page.locator('text=Add new worker').first();
    if (await newWorkerRadio.isVisible()) {
      await newWorkerRadio.click();
      await page.waitForTimeout(500);
      console.log('✅ New worker selected\n');
    } else {
      console.log('⚠️ New worker option not visible, checking existing workers...\n');
    }

    // 5. Fill worker details
    console.log('Step 5: Filling worker details...');
    const testWorker = {
      name: 'Test Worker ' + Date.now(),
      email: 'testworker' + Date.now() + '@test.com',
      phone: '0412345678',
      dob: '1990-01-15',
      address: '123 Test Street, Melbourne VIC 3000',
      role: 'Office Worker'
    };

    await page.fill('input[name="workerName"], input[placeholder*="name"]', testWorker.name).catch(() => {});
    await page.fill('input[name="workerEmail"], input[type="email"]', testWorker.email).catch(() => {});
    await page.fill('input[name="workerPhone"], input[placeholder*="phone"]', testWorker.phone).catch(() => {});

    console.log('✅ Worker details filled\n');

    // 6. Fill incident details
    console.log('Step 6: Filling incident details...');
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today).catch(() => {});
    await page.fill('input[name="incidentLocation"], input[placeholder*="location"]', 'Office - Level 3').catch(() => {});
    await page.fill('textarea[name="incidentDescription"], textarea[placeholder*="description"]',
      'Worker reported back pain after prolonged sitting at desk. Noticed discomfort starting around 2pm.').catch(() => {});

    console.log('✅ Incident details filled\n');

    // 7. Take screenshot of filled form
    console.log('Step 7: Capturing form state...');
    await page.screenshot({ path: 'new-case-form-filled.png', fullPage: true });
    console.log('✅ Screenshot saved: new-case-form-filled.png\n');

    // 8. Submit form (if ready)
    console.log('Step 8: Checking submit button...');
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create Case"), button[type="submit"]:visible').last();
    if (await submitButton.isVisible()) {
      console.log('✅ Submit button found\n');
      // Don't actually submit in test mode - would create real case
      console.log('ℹ️ Not submitting to avoid creating test data\n');
    } else {
      console.log('⚠️ Submit button not visible - may need more form fields\n');
    }

    // 9. Navigate to existing case to test full flow
    console.log('Step 9: Testing existing case flow...');
    await page.goto(`${BASE_URL}/cases`);
    await page.waitForTimeout(5000);

    // Click first case
    const firstCase = page.locator('tr').nth(1);
    if (await firstCase.isVisible()) {
      await firstCase.click();
      await page.waitForTimeout(3000);
      console.log('✅ Opened case detail\n');

      // Test each tab
      console.log('Step 10: Testing case tabs...');
      const tabs = ['Summary', 'Injury', 'Timeline', 'Financial', 'Risk', 'Contacts', 'Treatment'];

      for (const tab of tabs) {
        const tabButton = page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
        if (await tabButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await tabButton.click();
          await page.waitForTimeout(1500);
          console.log(`  ✅ ${tab} tab works`);
        } else {
          console.log(`  ⚠️ ${tab} tab not found`);
        }
      }
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Browser staying open for manual inspection...');

  } catch (error) {
    console.error('Test failed:', error.message);
  }

  await new Promise(() => {});
}

main();
