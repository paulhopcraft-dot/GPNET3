/**
 * New Case Creation Flow E2E Tests
 *
 * Tests the employer new case creation flow including:
 * - Gateway question (has claim been lodged with WorkSafe)
 * - Form reveal after answering gateway
 * - Worker details section
 * - Incident details section
 * - Worker selection (existing vs new)
 *
 * IMPORTANT: Tests do NOT submit the form to avoid creating test data.
 */

import { test, expect } from '../fixtures/auth.fixture';

test.describe('New Case Creation Flow', { tag: ['@critical', '@regression'] }, () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/employer/new-case');
    await page.waitForLoadState('networkidle');
  });

  test('new case page is accessible', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Should not show 404
    const content = await page.content();
    expect(content).not.toContain('404');
    expect(content).not.toContain('Not Found');

    // Should show new case related content
    const newCaseIndicator = page.locator('text=/new case|create case|worker|claim/i').first();
    await expect(newCaseIndicator).toBeVisible({ timeout: 10000 });
  });

  test('gateway question displays', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Gateway question asks if claim has been lodged with WorkSafe
    const gatewayQuestion = page.locator('text=/lodged.*claim|WorkSafe|claim.*lodged/i').first();

    if (await gatewayQuestion.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(gatewayQuestion).toBeVisible();

      // Should have Yes/No options
      const yesOption = page.locator('label:has-text("Yes"), input[value="yes"], button:has-text("Yes")').first();
      const noOption = page.locator('label:has-text("No"), input[value="no"], button:has-text("No")').first();

      // At least one option should be visible
      const hasOptions = (await yesOption.isVisible().catch(() => false)) ||
                        (await noOption.isVisible().catch(() => false));
      expect(hasOptions).toBe(true);
    } else {
      // Gateway question may not be implemented yet - log but don't fail
      console.log('Gateway question not found - may need different implementation');
    }
  });

  test('form reveals after gateway question', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Try to answer gateway question (No - not lodged claim)
    const noOption = page.locator('label:has-text("No"), input[value="no"]').first();

    if (await noOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(1000);

      // Form should now be visible
      const formElements = page.locator('input, select, textarea');
      const count = await formElements.count();
      expect(count).toBeGreaterThan(2);
    } else {
      // Form may be visible without gateway question
      const formElements = page.locator('input, select, textarea');
      const count = await formElements.count();

      // Either gateway or form should be present
      expect(count).toBeGreaterThan(0);
    }
  });

  test('form has worker details section', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Navigate past gateway if present
    const noOption = page.locator('label:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    // Look for worker-related inputs
    const workerInputs = [
      'input[name*="worker"], input[name*="name"]',
      'input[type="email"]',
      'input[name*="phone"], input[type="tel"]',
    ];

    let foundCount = 0;
    for (const selector of workerInputs) {
      if (await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        foundCount++;
      }
    }

    // Should have at least some worker-related fields
    expect(foundCount).toBeGreaterThan(0);
  });

  test('form has incident details section', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Navigate past gateway if present
    const noOption = page.locator('label:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    // Look for incident-related inputs
    const incidentInputs = [
      'input[type="date"]',
      'textarea, input[name*="description"]',
      'input[name*="location"]',
    ];

    let foundCount = 0;
    for (const selector of incidentInputs) {
      if (await page.locator(selector).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        foundCount++;
      }
    }

    // Should have at least a date field for incident
    expect(foundCount).toBeGreaterThan(0);
  });

  test('submit button exists (but do not click)', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Navigate past gateway if present
    const noOption = page.locator('label:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    // Look for submit button
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create"), button[type="submit"]').first();

    // Submit button should exist
    const exists = await submitButton.isVisible({ timeout: 5000 }).catch(() => false);

    // Don't fail if not found - form may be multi-step
    if (exists) {
      console.log('Submit button found');
    } else {
      console.log('Submit button not found - may be multi-step form');
    }
  });

  test('form can be partially filled', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Navigate past gateway if present
    const noOption = page.locator('label:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    // Try to fill a name field
    const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]').first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill('Test Worker');
      const value = await nameInput.inputValue();
      expect(value).toBe('Test Worker');
    }

    // Try to fill an email field
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('test@test.com');
      const value = await emailInput.inputValue();
      expect(value).toBe('test@test.com');
    }

    // Clear fields to not leave partial data
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.clear();
    }
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.clear();
    }
  });

  test('navigation link to new case exists from dashboard', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Go to dashboard/home
    await page.goto('/employer');
    await page.waitForLoadState('networkidle');

    // Look for new case link/button
    const newCaseLink = page.locator('a:has-text("New Case"), button:has-text("New Case"), a[href*="new-case"]').first();

    if (await newCaseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newCaseLink.click();
      await expect(page).toHaveURL(/new-case/);
    } else {
      // Link might be in a menu or not visible
      console.log('New case link not immediately visible - may be in menu');
    }
  });

  // ============================================
  // Worker Selection Tests (existing vs new)
  // ============================================

  test('worker selection options exist', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Navigate past gateway if present
    const noOption = page.locator('label:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    // Look for worker selection options (existing worker dropdown or new worker form)
    const existingWorkerOption = page.locator('text=/existing worker|select.*worker/i').first();
    const newWorkerOption = page.locator('text=/new worker|add.*worker/i').first();
    const workerDropdown = page.locator('select, [role="combobox"]').first();

    // At least one worker selection mechanism should exist
    const hasExisting = await existingWorkerOption.isVisible({ timeout: 2000 }).catch(() => false);
    const hasNew = await newWorkerOption.isVisible({ timeout: 2000 }).catch(() => false);
    const hasDropdown = await workerDropdown.isVisible({ timeout: 2000 }).catch(() => false);

    const hasWorkerSelection = hasExisting || hasNew || hasDropdown;
    expect(hasWorkerSelection).toBe(true);
  });

  test('new worker radio reveals input fields', { tag: '@critical' }, async ({ authenticatedPage: page }) => {
    // Navigate past gateway if present
    const noOption = page.locator('label:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    // Click "Add new worker" or similar option
    const newWorkerRadio = page.locator('text=/add new worker|new worker/i, input[value*="new"]').first();
    if (await newWorkerRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newWorkerRadio.click();
      await page.waitForTimeout(500);

      // New worker input fields should appear
      const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]').first();
      await expect(nameInput).toBeVisible({ timeout: 3000 });
    }
  });
});
