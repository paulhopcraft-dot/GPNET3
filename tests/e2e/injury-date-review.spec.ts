/**
 * End-to-End Tests for Injury Date Review Workflow
 *
 * Tests the complete user journey:
 * 1. Admin navigates to review queue
 * 2. Views cases requiring review
 * 3. Accepts or corrects injury dates
 * 4. Verifies audit trail
 */

import { test, expect, type Page } from '@playwright/test';

// Test data setup
const mockReviewCase = {
  id: 'test-case-001',
  caseId: 'test-case-001',
  workerName: 'John Doe',
  company: 'Test Company',
  currentDate: '2025-01-15',
  confidence: 'low',
  source: 'extracted',
  extractionMethod: 'regex',
  sourceText: 'Worker mentioned incident in description',
  aiReasoning: 'AI detected possible injury date from contextual clues'
};

// Helper function to setup test environment
async function setupTestEnvironment(page: Page) {
  // Mock API endpoints for testing
  await page.route('/api/injury-dates/review-queue', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [mockReviewCase]
      })
    });
  });

  await page.route('/api/injury-dates/stats', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          totalCases: 100,
          pendingReviews: 5,
          highConfidence: 80,
          mediumConfidence: 15,
          lowConfidence: 5,
          aiExtractions: 20,
          reviewedCases: 95
        }
      })
    });
  });
}

test.describe('Injury Date Review Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication (adjust based on your auth system)
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@test.com');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    // Wait for successful login
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    await setupTestEnvironment(page);
  });

  test('should display review queue with pending cases', async ({ page }) => {
    await page.goto('/injury-dates/review');

    // Verify page loads correctly
    await expect(page.locator('h1')).toContainText('Injury Date Review');
    await expect(page.locator('text=Review injury dates with uncertain extraction confidence')).toBeVisible();

    // Verify stats cards
    await expect(page.locator('text=Pending Review')).toBeVisible();
    await expect(page.locator('text=1')).toBeVisible(); // Should show 1 pending case

    await expect(page.locator('text=Avg Confidence')).toBeVisible();
    await expect(page.locator('text=Review Queue Status')).toBeVisible();
    await expect(page.locator('text=Active')).toBeVisible();
  });

  test('should display case details correctly', async ({ page }) => {
    await page.goto('/injury-dates/review');

    // Wait for cases to load
    await expect(page.locator(`text=${mockReviewCase.workerName}`)).toBeVisible();

    // Verify case information is displayed
    await expect(page.locator(`text=${mockReviewCase.company}`)).toBeVisible();
    await expect(page.locator('text=Low Confidence')).toBeVisible();
    await expect(page.locator('text=Text Extraction (Regex)')).toBeVisible();

    // Verify source text is displayed
    await expect(page.locator(`text=${mockReviewCase.sourceText}`)).toBeVisible();

    // Verify AI reasoning is displayed
    await expect(page.locator(`text=${mockReviewCase.aiReasoning}`)).toBeVisible();
  });

  test('should allow accepting injury date', async ({ page }) => {
    // Mock the accept API call
    await page.route(`/api/injury-dates/${mockReviewCase.caseId}/accept`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Injury date accepted and marked as reviewed'
        })
      });
    });

    await page.goto('/injury-dates/review');

    // Click Accept button
    await page.click('button:has-text("Accept")');

    // Verify dialog opens
    await expect(page.locator('text=Accept Injury Date')).toBeVisible();
    await expect(page.locator('text=Confirm that the extracted injury date is correct')).toBeVisible();

    // Verify case details are shown in dialog
    await expect(page.locator(`text=Worker: ${mockReviewCase.workerName}`)).toBeVisible();
    await expect(page.locator(`text=Company: ${mockReviewCase.company}`)).toBeVisible();

    // Click Accept Date button
    await page.click('button:has-text("Accept Date")');

    // Verify success toast appears
    await expect(page.locator('text=Date accepted')).toBeVisible();
  });

  test('should allow correcting injury date', async ({ page }) => {
    const correctionDate = '2025-01-10';
    const correctionReason = 'Found actual injury date in email attachment from worker';

    // Mock the correct API call
    await page.route(`/api/injury-dates/${mockReviewCase.caseId}/correct`, async route => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Verify correct data is sent
      expect(postData.newDate).toBe(correctionDate);
      expect(postData.reason).toBe(correctionReason);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Injury date corrected successfully'
        })
      });
    });

    await page.goto('/injury-dates/review');

    // Click Correct button
    await page.click('button:has-text("Correct")');

    // Verify dialog opens with correction form
    await expect(page.locator('text=Correct Injury Date')).toBeVisible();
    await expect(page.locator('text=Update the injury date with the correct information')).toBeVisible();

    // Fill in the correction form
    await page.fill('[data-testid="new-date"], input[type="date"]', correctionDate);
    await page.fill('textarea', correctionReason);

    // Submit correction
    await page.click('button:has-text("Save Correction")');

    // Verify success toast appears
    await expect(page.locator('text=Date corrected')).toBeVisible();
  });

  test('should validate correction form inputs', async ({ page }) => {
    await page.goto('/injury-dates/review');

    // Click Correct button
    await page.click('button:has-text("Correct")');

    // Try to submit without filling required fields
    await page.click('button:has-text("Save Correction")');

    // Should show validation errors
    await expect(page.locator('text=Date required')).toBeVisible();

    // Fill date but not reason
    await page.fill('input[type="date"]', '2025-01-10');
    await page.click('button:has-text("Save Correction")');

    // Should show reason validation error
    await expect(page.locator('text=Reason required')).toBeVisible();
  });

  test('should handle empty review queue', async ({ page }) => {
    // Mock empty queue
    await page.route('/api/injury-dates/review-queue', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.goto('/injury-dates/review');

    // Verify empty state message
    await expect(page.locator('text=No injury dates pending review')).toBeVisible();
    await expect(page.locator('text=All extractions have been verified')).toBeVisible();
    await expect(page.locator('text=0')).toBeVisible(); // Pending count should be 0
    await expect(page.locator('text=Clear')).toBeVisible(); // Queue status should be Clear
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/injury-dates/review-queue', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          details: 'Database connection failed'
        })
      });
    });

    await page.goto('/injury-dates/review');

    // Should show error state or loading indicator
    // Adjust based on your error handling implementation
    await expect(page.locator('text=Loading...')).toBeVisible();
  });

  test('should show loading states during API calls', async ({ page }) => {
    let resolveAccept: () => void;
    const acceptPromise = new Promise<void>(resolve => {
      resolveAccept = resolve;
    });

    // Mock slow API call
    await page.route(`/api/injury-dates/${mockReviewCase.caseId}/accept`, async route => {
      await acceptPromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Accepted'
        })
      });
    });

    await page.goto('/injury-dates/review');

    // Click Accept button
    await page.click('button:has-text("Accept")');
    await page.click('button:has-text("Accept Date")');

    // Should show loading state
    await expect(page.locator('.animate-spin')).toBeVisible();

    // Resolve the API call
    resolveAccept!();

    // Loading should disappear
    await expect(page.locator('.animate-spin')).not.toBeVisible();
  });

  test('should navigate between review cases', async ({ page }) => {
    // Mock multiple cases
    const multipleCases = [
      mockReviewCase,
      {
        ...mockReviewCase,
        id: 'test-case-002',
        caseId: 'test-case-002',
        workerName: 'Jane Smith',
        company: 'Another Company'
      }
    ];

    await page.route('/api/injury-dates/review-queue', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: multipleCases
        })
      });
    });

    await page.goto('/injury-dates/review');

    // Verify both cases are displayed
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();

    // Should be able to interact with both cases
    const correctButtons = page.locator('button:has-text("Correct")');
    await expect(correctButtons).toHaveCount(2);
  });

  test('should preserve dialog state when switching between accept and correct', async ({ page }) => {
    await page.goto('/injury-dates/review');

    // Open accept dialog
    await page.click('button:has-text("Accept")');
    await expect(page.locator('text=Accept Injury Date')).toBeVisible();

    // Close dialog
    await page.click('button:has-text("Cancel")');

    // Open correct dialog
    await page.click('button:has-text("Correct")');
    await expect(page.locator('text=Correct Injury Date')).toBeVisible();

    // Form should be clean/empty
    const dateInput = page.locator('input[type="date"]');
    const textArea = page.locator('textarea');

    await expect(dateInput).toHaveValue(mockReviewCase.currentDate);
    await expect(textArea).toHaveValue('');
  });
});

test.describe('Integration with Dashboard', () => {
  test('should show review queue alerts in main dashboard', async ({ page }) => {
    // This would test integration with StatusHeader or dashboard alerts
    // Implementation depends on your dashboard structure

    await page.goto('/');

    // Mock cases requiring review
    await expect(page.locator('text=5 dates need review')).toBeVisible();

    // Clicking should navigate to review queue
    await page.click('text=5 dates need review');
    await expect(page).toHaveURL('/injury-dates/review');
  });

  test('should update dashboard stats after processing reviews', async ({ page }) => {
    // Test that dashboard reflects changes after review workflow completion
    // This would require more complex state management testing
  });
});

test.describe('Performance Tests', () => {
  test('should handle large review queues efficiently', async ({ page }) => {
    // Generate large dataset
    const largeCaseList = Array.from({ length: 100 }, (_, i) => ({
      ...mockReviewCase,
      id: `case-${i}`,
      caseId: `case-${i}`,
      workerName: `Worker ${i}`,
      company: `Company ${i % 10}`
    }));

    await page.route('/api/injury-dates/review-queue', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: largeCaseList
        })
      });
    });

    const startTime = Date.now();
    await page.goto('/injury-dates/review');

    // Page should load within reasonable time
    await expect(page.locator('text=Worker 0')).toBeVisible();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
  });
});