#!/usr/bin/env node
import { chromium } from 'playwright';

async function debugPageContent() {
  console.log('🕵️ PLAYWRIGHT PAGE DEBUGGING');
  console.log('='.repeat(50));
  console.log('Checking what\'s actually on the page...');
  console.log('');

  const browser = await chromium.launch({
    headless: false, // Show browser
    slowMo: 500
  });

  const page = await browser.newPage();

  try {
    console.log('🌐 Loading http://localhost:5000...');
    await page.goto('http://localhost:5000');
    await page.waitForTimeout(3000);

    console.log('📋 Page title:', await page.title());
    console.log('📍 Current URL:', page.url());

    // Check if we need to login
    const loginForm = await page.locator('form, [type="password"], input[name*="password"]').count();
    if (loginForm > 0) {
      console.log('🔐 Login form detected, trying to login...');

      // Try standard login
      const emailField = page.locator('input[type="email"], input[name*="email"], input[name*="username"]').first();
      const passwordField = page.locator('input[type="password"]').first();

      if (await emailField.count() > 0 && await passwordField.count() > 0) {
        await emailField.fill('admin@example.com');
        await passwordField.fill('password123');

        const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(3000);
          console.log('✅ Login attempted');
        }
      }
    }

    // Look for any case names or worker names
    console.log('🔍 Looking for case/worker names...');
    const textContent = await page.textContent('body');

    // Look for names that might be cases
    const possibleCases = textContent.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
    console.log('👥 Possible worker names found:', possibleCases.slice(0, 5));

    // Look for any links or clickable elements
    const links = await page.locator('a, button, [role="button"], tr[onclick], .clickable').count();
    console.log(`🔗 Found ${links} clickable elements`);

    // Check if we're on the dashboard
    const isDashboard = textContent.includes('Dashboard') || textContent.includes('Cases') || textContent.includes('Workers');
    console.log('📊 Is dashboard page:', isDashboard);

    // Look for treatment-related content
    const hasTreatment = textContent.includes('Treatment') || textContent.includes('treatment');
    console.log('🏥 Has treatment content:', hasTreatment);

    // Look for confidence indicators
    const confidenceElements = await page.locator('[class*="confidence"], :has-text("confidence"), :has-text("Confidence")').count();
    console.log(`🎯 Found ${confidenceElements} confidence-related elements`);

    if (confidenceElements > 0) {
      console.log('📊 Confidence elements found! Checking for pulse animation...');
      const pulseElements = await page.locator('.animate-pulse-slow').count();
      console.log(`💓 Found ${pulseElements} elements with animate-pulse-slow`);
    }

    console.log('');
    console.log('🎬 Keeping browser open for manual inspection...');
    console.log('You can now manually navigate to test the confidence pulse animation');

    // Keep browser open for manual testing
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugPageContent();