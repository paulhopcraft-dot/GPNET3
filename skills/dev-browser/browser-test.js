#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { program } = require('commander');

// Configuration constants
const TIMEOUT = 30000;
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 };

async function createBrowser(options = {}) {
  const noSandbox = options.noSandbox || process.platform === 'linux';
  const launchOptions = {
    headless: options.headless !== false, // Default to headless
    args: noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
    ...options.browserOptions
  };

  return await puppeteer.launch(launchOptions);
}

async function createPage(browser, url, options = {}) {
  const page = await browser.newPage();
  await page.setViewport(options.viewport || DEFAULT_VIEWPORT);

  // Set timeout for all operations
  page.setDefaultTimeout(options.timeout || TIMEOUT);

  if (url) {
    await page.goto(url, {
      waitUntil: options.waitUntil || 'domcontentloaded',
      timeout: options.timeout || TIMEOUT
    });
  }

  return page;
}

// Command: Take screenshot
async function takeScreenshot(url, filename = 'screenshot.png', options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);
    await page.screenshot({
      path: filename,
      fullPage: options.fullPage || true
    });
    console.log(`✅ Screenshot saved: ${filename}`);
  } finally {
    await browser.close();
  }
}

// Command: Check if element exists
async function checkExists(url, selector, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      console.log(`✅ Element exists: ${selector}`);
      return true;
    } catch (error) {
      console.log(`❌ Element not found: ${selector}`);
      if (options.verbose) {
        console.log(`Error: ${error.message}`);
      }
      return false;
    }
  } finally {
    await browser.close();
  }
}

// Command: Get element text
async function getText(url, selector, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    await page.waitForSelector(selector, { timeout: 5000 });
    const text = await page.$eval(selector, el => el.textContent.trim());
    console.log(text);
    return text;
  } finally {
    await browser.close();
  }
}

// Command: Get select options
async function getOptions(url, selector, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    await page.waitForSelector(selector, { timeout: 5000 });
    const optionTexts = await page.$$eval(
      `${selector} option`,
      opts => opts.map(o => o.textContent.trim())
    );
    console.log(JSON.stringify(optionTexts, null, 2));
    return optionTexts;
  } finally {
    await browser.close();
  }
}

// Command: Click element
async function clickElement(url, selector, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    await page.waitForSelector(selector, { timeout: 5000 });
    await page.click(selector);

    // Wait for potential navigation or changes
    if (options.waitAfter) {
      await page.waitForTimeout(options.waitAfter);
    }

    console.log(`✅ Clicked: ${selector}`);
  } finally {
    await browser.close();
  }
}

// Command: Fill form field
async function fillField(url, selector, value, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    await page.waitForSelector(selector, { timeout: 5000 });

    // Clear existing content first
    await page.click(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');

    // Type new content
    await page.type(selector, value);

    console.log(`✅ Filled ${selector} with: ${value}`);
  } finally {
    await browser.close();
  }
}

// Command: Wait for text content
async function waitForText(url, selector, expectedText, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    await page.waitForFunction(
      (sel, text) => {
        const element = document.querySelector(sel);
        return element && element.textContent.includes(text);
      },
      { timeout: options.timeout || TIMEOUT },
      selector,
      expectedText
    );

    console.log(`✅ Found text "${expectedText}" in ${selector}`);
    return true;
  } catch (error) {
    console.log(`❌ Text "${expectedText}" not found in ${selector}`);
    return false;
  } finally {
    await browser.close();
  }
}

// Command: Check URL contains text
async function checkUrl(url, expectedPart, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    const currentUrl = page.url();
    const contains = currentUrl.includes(expectedPart);

    if (contains) {
      console.log(`✅ URL contains "${expectedPart}": ${currentUrl}`);
    } else {
      console.log(`❌ URL does not contain "${expectedPart}": ${currentUrl}`);
    }

    return contains;
  } finally {
    await browser.close();
  }
}

// Command: Execute custom JavaScript
async function executeScript(url, script, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, url, options);

    const result = await page.evaluate(script);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    await browser.close();
  }
}

// Command: Health check - verify server is running
async function healthCheck(url, options = {}) {
  const browser = await createBrowser(options);
  try {
    const page = await createPage(browser, null, options);

    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: options.timeout || 10000
    });

    if (response.ok()) {
      console.log(`✅ Server healthy at ${url} (${response.status()})`);
      return true;
    } else {
      console.log(`❌ Server error at ${url} (${response.status()})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot reach server at ${url}: ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}

// CLI Setup
program
  .name('browser-test')
  .description('Browser automation tool for Ralph autonomous execution')
  .version('1.0.0');

program
  .command('screenshot <url> [filename]')
  .description('Take screenshot of page')
  .argument('[filename]', 'Output filename (default: screenshot.png)', 'screenshot.png')
  .option('--full-page', 'Take full page screenshot')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .action(async (url, filename, options) => {
    await takeScreenshot(url, filename, options);
  });

program
  .command('exists <url> <selector>')
  .description('Check if element exists on page')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .option('--verbose', 'Show detailed error messages')
  .action(async (url, selector, options) => {
    const exists = await checkExists(url, selector, options);
    process.exit(exists ? 0 : 1);
  });

program
  .command('text <url> <selector>')
  .description('Get text content of element')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .action(async (url, selector, options) => {
    await getText(url, selector, options);
  });

program
  .command('options <url> <selector>')
  .description('Get options from select element')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .action(async (url, selector, options) => {
    await getOptions(url, selector, options);
  });

program
  .command('click <url> <selector>')
  .description('Click element on page')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .option('--wait-after <ms>', 'Wait time after click', parseInt)
  .action(async (url, selector, options) => {
    await clickElement(url, selector, options);
  });

program
  .command('fill <url> <selector> <value>')
  .description('Fill form field with value')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .action(async (url, selector, value, options) => {
    await fillField(url, selector, value, options);
  });

program
  .command('wait-text <url> <selector> <text>')
  .description('Wait for text to appear in element')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .option('--timeout <ms>', 'Timeout in milliseconds', parseInt)
  .action(async (url, selector, text, options) => {
    const found = await waitForText(url, selector, text, options);
    process.exit(found ? 0 : 1);
  });

program
  .command('url-contains <url> <text>')
  .description('Check if current URL contains text')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .action(async (url, text, options) => {
    const contains = await checkUrl(url, text, options);
    process.exit(contains ? 0 : 1);
  });

program
  .command('script <url> <javascript>')
  .description('Execute JavaScript on page')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .action(async (url, script, options) => {
    await executeScript(url, script, options);
  });

program
  .command('health <url>')
  .description('Check if server is running and responsive')
  .option('--no-sandbox', 'Disable sandbox for Linux environments')
  .option('--timeout <ms>', 'Timeout in milliseconds', parseInt)
  .action(async (url, options) => {
    const healthy = await healthCheck(url, options);
    process.exit(healthy ? 0 : 1);
  });

// Parse arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}