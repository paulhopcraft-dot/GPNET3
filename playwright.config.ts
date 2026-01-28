import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration
 *
 * Supports wave-based test tagging via TEST_GREP environment variable:
 *   TEST_GREP="@smoke" npx playwright test       # Fast feedback tests (~2 min)
 *   TEST_GREP="@critical" npx playwright test    # Core flow tests (~10 min)
 *   TEST_GREP="@regression" npx playwright test  # Full regression suite
 *   TEST_GREP="@performance" npx playwright test # Performance benchmarks
 *
 * Tag tests using test.describe or test annotations:
 *   test.describe('@smoke Login Tests', () => { ... });
 *   test('@critical should create case', async () => { ... });
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60 * 1000,
  retries: 0,

  // Wave-based filtering via grep
  // Use TEST_GREP env var to filter tests by tag
  grep: process.env.TEST_GREP ? new RegExp(process.env.TEST_GREP) : undefined,

  // Reporter configuration - list for console, html for reports
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5000",
    trace: "on-first-retry",
    // Screenshot on failure for debugging
    screenshot: "only-on-failure",
    // Video on failure for complex debugging
    video: "retain-on-failure",
  },

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
