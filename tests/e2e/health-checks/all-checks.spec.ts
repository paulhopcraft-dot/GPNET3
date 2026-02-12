/**
 * Health Check Forms E2E Tests
 *
 * Tests navigation, form rendering, section navigation, field interaction,
 * and submission for all 7 health check types:
 * 1. Pre-Employment (New Starter)
 * 2. Prevention
 * 3. Injury
 * 4. Comprehensive RTW
 * 5. General Wellness
 * 6. Mental Health
 * 7. Exit Health Check
 *
 * @critical
 */

import { test, expect } from '../fixtures/auth.fixture';
import { TEST_TIMEOUTS } from '../fixtures/test-data';

// ─────────────────────────────────────────────────────────
// Helper: Navigate to Checks page and click a tab
// ─────────────────────────────────────────────────────────
async function navigateToChecksTab(page: import('@playwright/test').Page, tabName: string): Promise<void> {
  await page.goto('/checks');
  await page.waitForLoadState('networkidle');
  // shadcn Tabs renders triggers as buttons, not tab role
  const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') });
  await tab.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.medium });
  await tab.click();
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────
// 1. CHECKS PAGE NAVIGATION
// ─────────────────────────────────────────────────────────

test.describe('Checks Page @critical', () => {
  test('loads checks page with all 6 tabs', async ({ authenticatedPage: page }) => {
    await page.goto('/checks');
    await page.waitForLoadState('networkidle');

    // Verify all 6 tabs are present (rendered as buttons by shadcn)
    const tabs = ['Pre-Employment', 'Prevention', 'Injury', 'Wellness', 'Mental Health', 'Exit'];
    for (const tabName of tabs) {
      const tab = page.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') });
      await expect(tab).toBeVisible({ timeout: TEST_TIMEOUTS.short });
    }
  });

  test('pre-employment tab has new assessment link', async ({ authenticatedPage: page }) => {
    await navigateToChecksTab(page, 'Pre-Employment');
    const link = page.getByRole('link', { name: /new assessment/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/pre-employment-form');
  });

  test('prevention tab has new assessment link', async ({ authenticatedPage: page }) => {
    await navigateToChecksTab(page, 'Prevention');
    const link = page.getByRole('link', { name: /new assessment/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/prevention-assessment-form');
  });

  test('injury tab has new injury report link', async ({ authenticatedPage: page }) => {
    await navigateToChecksTab(page, 'Injury');
    const injuryLink = page.getByRole('link', { name: /new injury report/i });
    await expect(injuryLink).toBeVisible();
    await expect(injuryLink).toHaveAttribute('href', '/injury-assessment-form');
  });

  test('injury tab has new RTW assessment link', async ({ authenticatedPage: page }) => {
    await navigateToChecksTab(page, 'Injury');
    const rtwLink = page.getByRole('link', { name: /new rtw assessment/i });
    await expect(rtwLink).toBeVisible();
    await expect(rtwLink).toHaveAttribute('href', '/comprehensive-rtw-form');
  });

  test('wellness tab has new wellness assessment link', async ({ authenticatedPage: page }) => {
    await navigateToChecksTab(page, 'Wellness');
    const link = page.getByRole('link', { name: /new wellness assessment/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/wellness-form');
  });

  test('mental health tab has new MH assessment link', async ({ authenticatedPage: page }) => {
    await navigateToChecksTab(page, 'Mental Health');
    const link = page.getByRole('link', { name: /new mh assessment/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/mental-health-form');
  });

  test('exit tab has new exit health check link', async ({ authenticatedPage: page }) => {
    await navigateToChecksTab(page, 'Exit');
    const link = page.getByRole('link', { name: /new exit health check/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/exit-health-check-form');
  });
});

// ─────────────────────────────────────────────────────────
// 2. PRE-EMPLOYMENT FORM
// ─────────────────────────────────────────────────────────

test.describe('Pre-Employment Form @critical', () => {
  test('loads and shows step 1', async ({ authenticatedPage: page }) => {
    await page.goto('/pre-employment-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Pre-Employment Health Assessment' })).toBeVisible({ timeout: TEST_TIMEOUTS.medium });
    await expect(page.getByText('Step 1 of')).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
  });

  test('navigates between steps', async ({ authenticatedPage: page }) => {
    await page.goto('/pre-employment-form');
    await page.waitForLoadState('networkidle');

    // Fill all required fields on step 1 to pass validation
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).first().fill('test@example.com');
    await page.getByLabel(/company name/i).fill('Test Co');
    await page.getByLabel(/age/i).fill('30');
    await page.getByRole('radio', { name: 'Man', exact: true }).click();
    await page.getByLabel(/role applied for/i).fill('Tester');

    // Click Next to go to step 2
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();

    // Click Previous to go back
    await page.getByRole('button', { name: /previous/i }).click();
    await expect(page.getByText('Step 1 of')).toBeVisible();
  });

  test('fills personal info and advances', async ({ authenticatedPage: page }) => {
    await page.goto('/pre-employment-form');
    await page.waitForLoadState('networkidle');

    // Fill all required step 1 fields
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).first().fill('test@example.com');
    await page.getByLabel(/company name/i).fill('Test Co');
    await page.getByLabel(/age/i).fill('30');
    await page.getByRole('radio', { name: 'Man', exact: true }).click();
    await page.getByLabel(/role applied for/i).fill('Tester');

    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText('Step 2 of')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────
// 3. PREVENTION FORM
// ─────────────────────────────────────────────────────────

test.describe('Prevention Assessment Form @critical', () => {
  test('loads and shows section 1', async ({ authenticatedPage: page }) => {
    await page.goto('/prevention-assessment-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Prevention Health Assessment')).toBeVisible({ timeout: TEST_TIMEOUTS.medium });
    await expect(page.getByText('Section 1 of 6')).toBeVisible();
    await expect(page.getByLabel(/company name/i)).toBeVisible();
  });

  test('navigates all 6 sections', async ({ authenticatedPage: page }) => {
    await page.goto('/prevention-assessment-form');
    await page.waitForLoadState('networkidle');

    for (let section = 1; section <= 5; section++) {
      await expect(page.getByText(`Section ${section} of 6`)).toBeVisible();
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText('Section 6 of 6')).toBeVisible();
    // Submit button should be visible on last section
    await expect(page.getByRole('button', { name: /submit assessment/i })).toBeVisible();
  });

  test('submit button is disabled without confirmation', async ({ authenticatedPage: page }) => {
    await page.goto('/prevention-assessment-form');
    await page.waitForLoadState('networkidle');

    // Navigate to last section
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(200);
    }

    const submitBtn = page.getByRole('button', { name: /submit assessment/i });
    await expect(submitBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────
// 4. INJURY FORM
// ─────────────────────────────────────────────────────────

test.describe('Injury Assessment Form @critical', () => {
  test('loads and shows section 1', async ({ authenticatedPage: page }) => {
    await page.goto('/injury-assessment-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Injury Assessment' })).toBeVisible({ timeout: TEST_TIMEOUTS.medium });
    await expect(page.getByText('Section 1 of')).toBeVisible();
  });

  test('navigates all sections', async ({ authenticatedPage: page }) => {
    await page.goto('/injury-assessment-form');
    await page.waitForLoadState('networkidle');

    // Count how many next clicks until we see submit
    let section = 1;
    while (section < 10) {
      const nextBtn = page.getByRole('button', { name: /next/i });
      const submitBtn = page.getByRole('button', { name: /submit/i });

      if (await submitBtn.isVisible().catch(() => false)) {
        break;
      }
      await nextBtn.click();
      await page.waitForTimeout(300);
      section++;
    }
    // Verify we got to the last section with submit button
    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────
// 5. COMPREHENSIVE RTW FORM
// ─────────────────────────────────────────────────────────

test.describe('Comprehensive RTW Form @critical', () => {
  test('loads and shows section 1 with progress indicator', async ({ authenticatedPage: page }) => {
    await page.goto('/comprehensive-rtw-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'RTW Assessment' })).toBeVisible({ timeout: TEST_TIMEOUTS.medium });
    await expect(page.getByText('Section 1 of 9')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Worker Details' })).toBeVisible();
  });

  test('navigates through all 9 sections', async ({ authenticatedPage: page }) => {
    await page.goto('/comprehensive-rtw-form');
    await page.waitForLoadState('networkidle');

    const sectionNames = [
      'Worker Details', 'Injury / Condition', 'Medical Status',
      'Functional Capacity', 'Treatment & Recovery', 'Workplace Assessment',
      'RTW Plan', 'Employer Input', 'Completion'
    ];

    for (let i = 0; i < 8; i++) {
      await expect(page.getByText(`Section ${i + 1} of 9`)).toBeVisible();
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText('Section 9 of 9')).toBeVisible();
    await expect(page.getByRole('button', { name: /submit rtw assessment/i })).toBeVisible();
  });

  test('section 4 shows functional capacity radio groups', async ({ authenticatedPage: page }) => {
    await page.goto('/comprehensive-rtw-form');
    await page.waitForLoadState('networkidle');

    // Navigate to section 4
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(200);
    }

    await expect(page.getByRole('heading', { name: /Functional Capacity/ })).toBeVisible();
    await expect(page.getByText('Sitting')).toBeVisible();
    await expect(page.getByText('Can perform without restriction').first()).toBeVisible();
  });

  test('submit disabled without signatures and confirmation', async ({ authenticatedPage: page }) => {
    await page.goto('/comprehensive-rtw-form');
    await page.waitForLoadState('networkidle');

    // Navigate to last section
    for (let i = 0; i < 8; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(200);
    }

    const submitBtn = page.getByRole('button', { name: /submit rtw assessment/i });
    await expect(submitBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────
// 6. GENERAL WELLNESS FORM
// ─────────────────────────────────────────────────────────

test.describe('General Wellness Form @critical', () => {
  test('loads and shows section 1', async ({ authenticatedPage: page }) => {
    await page.goto('/wellness-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('General Health & Wellbeing Assessment')).toBeVisible({ timeout: TEST_TIMEOUTS.medium });
    await expect(page.getByText('Section 1 of 3')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'General Health Status' })).toBeVisible();
  });

  test('section 1 shows SF-36 overall health question', async ({ authenticatedPage: page }) => {
    await page.goto('/wellness-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/in general.*would you say your health is/i)).toBeVisible();
    // Should see 5 options: Excellent, Very good, Good, Fair, Poor
    await expect(page.getByLabel('Excellent')).toBeVisible();
    await expect(page.getByLabel('Poor')).toBeVisible();
  });

  test('navigates all 3 sections', async ({ authenticatedPage: page }) => {
    await page.goto('/wellness-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Section 1 of 3')).toBeVisible();
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Section 2 of 3')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Functional Limitations/ })).toBeVisible();
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Section 3 of 3')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mental Wellbeing/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit wellness assessment/i })).toBeVisible();
  });

  test('submit disabled without confirmation', async ({ authenticatedPage: page }) => {
    await page.goto('/wellness-form');
    await page.waitForLoadState('networkidle');

    // Navigate to last section
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(200);

    const submitBtn = page.getByRole('button', { name: /submit wellness assessment/i });
    await expect(submitBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────
// 7. MENTAL HEALTH FORM
// ─────────────────────────────────────────────────────────

test.describe('Mental Health Form @critical', () => {
  test('loads and shows confidentiality notice', async ({ authenticatedPage: page }) => {
    await page.goto('/mental-health-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Mental Health & Wellbeing Assessment')).toBeVisible({ timeout: TEST_TIMEOUTS.medium });
    await expect(page.getByText('Section 1 of 4')).toBeVisible();
    await expect(page.getByText(/this assessment is confidential/i)).toBeVisible();
    await expect(page.getByText(/lifeline/i)).toBeVisible();
  });

  test('section 2 shows PHQ-9 and GAD-7 screening', async ({ authenticatedPage: page }) => {
    await page.goto('/mental-health-form');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Section 2 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Psychological Wellbeing' })).toBeVisible();
    await expect(page.getByText(/PHQ-9/i)).toBeVisible();
    await expect(page.getByText(/GAD-7/i)).toBeVisible();
    await expect(page.getByText(/little interest or pleasure/i)).toBeVisible();
  });

  test('section 3 shows workplace psychosocial factors', async ({ authenticatedPage: page }) => {
    await page.goto('/mental-health-form');
    await page.waitForLoadState('networkidle');

    // Navigate to section 3
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Section 3 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Workplace Psychosocial Factors' })).toBeVisible();
    await expect(page.getByText(/workload stress/i)).toBeVisible();
    await expect(page.getByText(/bullying/i)).toBeVisible();
  });

  test('navigates all 4 sections', async ({ authenticatedPage: page }) => {
    await page.goto('/mental-health-form');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await expect(page.getByText(`Section ${i + 1} of 4`)).toBeVisible();
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText('Section 4 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Coping & Support' })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit assessment/i })).toBeVisible();
  });

  test('submit disabled without confirmation', async ({ authenticatedPage: page }) => {
    await page.goto('/mental-health-form');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(200);
    }

    const submitBtn = page.getByRole('button', { name: /submit assessment/i });
    await expect(submitBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────
// 8. EXIT HEALTH CHECK FORM
// ─────────────────────────────────────────────────────────

test.describe('Exit Health Check Form @critical', () => {
  test('loads and shows section 1', async ({ authenticatedPage: page }) => {
    await page.goto('/exit-health-check-form');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Exit Health Check Assessment')).toBeVisible({ timeout: TEST_TIMEOUTS.medium });
    await expect(page.getByText('Section 1 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Employee & Exit Details' })).toBeVisible();
    await expect(page.getByLabel(/last working day/i)).toBeVisible();
  });

  test('section 2 shows health baseline questions', async ({ authenticatedPage: page }) => {
    await page.goto('/exit-health-check-form');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Section 2 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Health Baseline at Exit' })).toBeVisible();
    await expect(page.getByText(/overall health at time of exit/i)).toBeVisible();
    await expect(page.getByText(/workers.*compensation claim/i)).toBeVisible();
  });

  test('section 3 shows occupational exposure history', async ({ authenticatedPage: page }) => {
    await page.goto('/exit-health-check-form');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Section 3 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Occupational Exposure/ })).toBeVisible();
    await expect(page.getByText(/workplace hazards/i)).toBeVisible();
  });

  test('navigates all 4 sections', async ({ authenticatedPage: page }) => {
    await page.goto('/exit-health-check-form');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await expect(page.getByText(`Section ${i + 1} of 4`)).toBeVisible();
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(300);
    }
    await expect(page.getByText('Section 4 of 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Functional Status/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit exit health check/i })).toBeVisible();
  });

  test('submit disabled without signatures and confirmation', async ({ authenticatedPage: page }) => {
    await page.goto('/exit-health-check-form');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(200);
    }

    const submitBtn = page.getByRole('button', { name: /submit exit health check/i });
    await expect(submitBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────
// 9. FORM SUBMISSION E2E (smoke test for one form)
// ─────────────────────────────────────────────────────────

test.describe('Form Submission E2E @regression', () => {
  test('prevention form end-to-end submission', async ({ authenticatedPage: page }) => {
    await page.goto('/prevention-assessment-form');
    await page.waitForLoadState('networkidle');

    // Section 1: Fill required fields
    await page.getByLabel(/company name/i).fill('Test Company');
    await page.getByLabel(/employer email/i).fill('employer@test.com');
    await page.getByLabel(/first name/i).fill('Jane');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/your email/i).fill('jane@test.com');
    await page.getByLabel(/job title/i).fill('Tester');

    // Navigate through sections 2-6 (5 clicks to reach section 6)
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(300);
    }

    // Section 6: Completion
    await expect(page.getByText('Section 6 of 6')).toBeVisible();

    // Check confirmation checkbox and fill signature
    await page.locator('#confirmation').click();
    await page.locator('#signature').fill('Jane Doe');

    // Submit
    const submitBtn = page.getByRole('button', { name: /submit assessment/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Should redirect to checks page with success message
    await page.waitForURL(/\/checks/, { timeout: TEST_TIMEOUTS.medium });
  });
});
