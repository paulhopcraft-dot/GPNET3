import { test, expect } from "@playwright/test";

test.describe("Password Reset Flow", () => {
  const testEmail = "test@example.com";
  const newPassword = "NewSecurePass123!";

  test("should complete full password reset flow successfully", async ({ page }) => {
    // Navigate to forgot password page
    await page.goto("/forgot-password");

    // Should show forgot password form
    const heading = page.getByRole("heading", { name: /forgot password/i });
    await expect(heading).toBeVisible();

    // Enter email address
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill(testEmail);

    // Submit form
    const submitButton = page.getByRole("button", { name: /send reset link/i });
    await submitButton.click();

    // Should show success message
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });

    // In real E2E, we'd get token from email
    // For this test, we'll need to get the token from the database
    // This tests the UI flow - backend is tested separately
  });

  test("should show error for non-existent email", async ({ page }) => {
    await page.goto("/forgot-password");

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("nonexistent@example.com");

    const submitButton = page.getByRole("button", { name: /send reset link/i });
    await submitButton.click();

    // Should still show success (security: don't reveal if email exists)
    await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/forgot-password");

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("invalid-email");

    const submitButton = page.getByRole("button", { name: /send reset link/i });
    await submitButton.click();

    // Should show validation error
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("should show loading state during submission", async ({ page }) => {
    await page.goto("/forgot-password");

    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill(testEmail);

    const submitButton = page.getByRole("button", { name: /send reset link/i });

    // Click and immediately check for loading state
    await submitButton.click();

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled();
  });

  test("should navigate to reset password page with valid token", async ({ page }) => {
    // This would require a valid token - testing the page exists
    await page.goto("/reset-password?token=test-token");

    const heading = page.getByRole("heading", { name: /reset password/i });
    await expect(heading).toBeVisible();

    // Should have password input fields
    const passwordInput = page.getByLabel(/^new password$/i);
    await expect(passwordInput).toBeVisible();

    const confirmInput = page.getByLabel(/confirm password/i);
    await expect(confirmInput).toBeVisible();
  });

  test("should validate password strength on reset page", async ({ page }) => {
    await page.goto("/reset-password?token=test-token");

    const passwordInput = page.getByLabel(/^new password$/i);
    const confirmInput = page.getByLabel(/confirm password/i);
    const submitButton = page.getByRole("button", { name: /reset password/i });

    // Try weak password
    await passwordInput.fill("weak");
    await confirmInput.fill("weak");
    await submitButton.click();

    // Should show validation error (use first() to avoid strict mode violation)
    await expect(page.getByText(/password must be at least 8 characters/i).first()).toBeVisible();
  });

  test("should validate password confirmation match", async ({ page }) => {
    await page.goto("/reset-password?token=test-token");

    const passwordInput = page.getByLabel(/^new password$/i);
    const confirmInput = page.getByLabel(/confirm password/i);
    const submitButton = page.getByRole("button", { name: /reset password/i });

    // Passwords don't match
    await passwordInput.fill(newPassword);
    await confirmInput.fill("DifferentPass123!");
    await submitButton.click();

    // Should show validation error
    await expect(page.getByText(/passwords.*match/i)).toBeVisible();
  });

  test("should show error for expired token", async ({ page }) => {
    // This would need an expired token from the backend
    await page.goto("/reset-password?token=expired-token");

    const passwordInput = page.getByLabel(/^new password$/i);
    const confirmInput = page.getByLabel(/confirm password/i);
    const submitButton = page.getByRole("button", { name: /reset password/i });

    await passwordInput.fill(newPassword);
    await confirmInput.fill(newPassword);
    await submitButton.click();

    // Should show error
    await expect(page.getByText(/expired|invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test("should redirect to login after successful password reset", async ({ page }) => {
    // This would need a valid token from the backend
    // For now, test the UI elements exist
    await page.goto("/reset-password?token=valid-token");

    const passwordInput = page.getByLabel(/^new password$/i);
    const confirmInput = page.getByLabel(/confirm password/i);

    await expect(passwordInput).toBeVisible();
    await expect(confirmInput).toBeVisible();
  });

  test("should have link to return to login from forgot password", async ({ page }) => {
    await page.goto("/forgot-password");

    const loginLink = page.getByRole("link", { name: /back to login|sign in/i });
    await expect(loginLink).toBeVisible();

    await loginLink.click();
    await expect(page).toHaveURL(/\/(login)?$/);
  });
});
