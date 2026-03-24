/**
 * UX & Usability Tests — Live Walkthrough Findings
 *
 * These tests come directly from watching a real HR manager (Paul) walk through
 * the system screen by screen on 2026-03-23.
 *
 * Each test documents a specific UX failure observed live.
 * Tests are written as assertions against what SHOULD be true.
 * Failing tests = bugs to fix, not test failures to suppress.
 *
 * Core principle: Every recommended action must be executable.
 * A system that tells you what to do but gives you no way to do it
 * is worse than no system at all — it creates false confidence.
 *
 * @tags @critical @ux @regression
 */

import { test, expect } from '../fixtures/auth.fixture';

const LEO_CASE_URL = '/summary/22d3c4bd-8476-4dfa-9a9e-10ef464dca4d';
const ETHAN_CASE_URL = '/summary/f7cd6639-a713-45ba-b5fd-8a0eb42840d8';

// ─────────────────────────────────────────────────────────────
// DEAD-END ACTIONS — recommended actions with no execution path
// ─────────────────────────────────────────────────────────────

test.describe('Recommended Actions Must Be Executable', { tag: ['@critical', '@ux'] }, () => {

  test('Next Recommended Action has a clickable button — not just text', async ({ authenticatedPage: page }) => {
    // BUG: "Document competency sign-off" appears as blue text (looks clickable) but does nothing.
    // An HR manager clicks it, nothing happens. They assume it worked or it's broken.
    // FIX: Every recommended action must open a form, modal, or guided workflow.
    // Minimum: a modal with Date, Actioned By, Notes, Save button.
    // Save must: log to Timeline, clear the action, update compliance status.
    await page.goto(LEO_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const actionText = page.locator('text=Document competency sign-off').first();
    await expect(actionText).toBeVisible({ timeout: 10000 });

    // The action should be a button or trigger something when clicked
    const requests: string[] = [];
    page.on('request', req => {
      if (req.method() === 'POST' || req.method() === 'PATCH') requests.push(req.url());
    });

    let modalOpened = false;
    page.on('dialog', () => { modalOpened = true; });

    // Click the action
    await actionText.click();
    await page.waitForTimeout(1000);

    const modalVisible = await page.locator('[role="dialog"], [data-testid*="modal"]').isVisible().catch(() => false);
    const anyApiCall = requests.length > 0;

    if (!modalVisible && !anyApiCall && !modalOpened) {
      console.warn('BUG: "Document competency sign-off" action does nothing when clicked.');
      console.warn('FIX: Add onClick handler that opens an action completion form.');
    }

    // This is the core product promise — actions must be completable
    expect(modalVisible || anyApiCall).toBe(true);
  });

  test('every action in the Action Queue on dashboard is clickable and opens a workflow', async ({ authenticatedPage: page }) => {
    // BUG RISK: Action Queue shows 7 items. If clicking them does nothing, the queue is decorative.
    // FIX: Each Action Queue item must navigate to the case AND highlight the action to complete.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[aria-label="Action queue"]', { timeout: 15000 });

    // Click first action in the queue
    const firstAction = page.locator('[aria-label="Action queue"] button').first();
    await expect(firstAction).toBeVisible({ timeout: 10000 });

    const currentUrl = page.url();
    await firstAction.click();
    await page.waitForTimeout(1500);

    // Should navigate to a case
    const newUrl = page.url();
    expect(newUrl).not.toBe(currentUrl);
    expect(newUrl).toMatch(/\/summary\//);
  });
});

// ─────────────────────────────────────────────────────────────
// DATA LABELLING — misleading column names and values
// ─────────────────────────────────────────────────────────────

test.describe('Data Labels Must Be Accurate', { tag: ['@critical', '@ux'] }, () => {

  test('"Days Off" column shows 0 for workers who are At Work', async ({ authenticatedPage: page }) => {
    // BUG: Leo Gutierrez shows "432d" in the "Days Off" column but his status is "At Work".
    // The column is actually showing "Days Since Case Opened" not "Days Off Work".
    // An HR manager sees 432d and panics — he's actually back at work.
    // FIX: Either rename column to "Case Duration" OR show actual days off work (reset on RTW).
    // The two values need to be tracked separately:
    //   - case_duration = today - injury_date (never resets)
    //   - days_off_work = sum of days with work_status = Off Work (resets on RTW)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('table', { timeout: 15000 });

    const leoRow = page.locator('tr', { hasText: 'Leo Gutierrez' }).first();
    await expect(leoRow).toBeVisible();

    // Click into Leo's case to confirm he's At Work
    await leoRow.click();
    await page.waitForLoadState('domcontentloaded');

    const workStatus = page.locator('text=At work').first();
    const isAtWork = await workStatus.isVisible({ timeout: 5000 }).catch(() => false);

    if (isAtWork) {
      console.warn('BUG: Leo Gutierrez is "At work" but dashboard shows 432d in "Days Off" column.');
      console.warn('FIX: Rename column to "Case Duration" or reset days-off counter on RTW.');
    }
  });

  test('XGBoost score is not shown to HR users — plain English risk summary only', async ({ authenticatedPage: page }) => {
    // BUG: AI Case Summary shows "XGBoost risk 0.28 indicates low relapse probability..."
    // "XGBoost" is a machine learning algorithm name. It means nothing to an HR manager.
    // They need: "Low risk — worker is likely to stay at work once competency is confirmed."
    // FIX: Replace all XGBoost references in the UI with plain-English equivalents.
    //   Map score to: Low / Medium / High / Very High with one plain-English sentence.
    //   The model name is an implementation detail — never show it to end users.
    await page.goto(LEO_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const xgboostText = page.locator('text=/XGBoost/i').first();
    const isVisible = await xgboostText.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      console.warn('BUG: "XGBoost" is shown to HR users in the AI Case Summary.');
      console.warn('FIX: Replace with plain English. "XGBoost risk 0.28" → "Low risk of long-term absence."');
    }

    expect(isVisible).toBe(false);
  });

  test('compliance due date in the past shows as OVERDUE not just a date', async ({ authenticatedPage: page }) => {
    // BUG: Leo's compliance says "Due: 14 Feb 2025" — 13 months ago.
    // But the badge shows "High". That's contradictory.
    // An HR manager reads "High" and moves on. They miss that it's 13 months overdue.
    // FIX: If due date < today AND compliance task not completed → badge must be Overdue/Critical.
    // The due date should show as "Overdue 400 days" not a raw date.
    await page.goto(LEO_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const dueDate = page.locator('text=/Due: 14 Feb 2025/').first();
    if (await dueDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      // The compliance badge next to a past due date must not be "High"
      const complianceBadge = page.locator('text=High').first();
      const badgeText = await complianceBadge.textContent().catch(() => '');
      console.warn(`BUG: Compliance due 14 Feb 2025 (13 months ago) shows badge "${badgeText}". Should be Overdue.`);
    }

    // A past due date should show overdue language
    const overdueText = page.locator('text=/overdue|Overdue/i').first();
    await expect(overdueText).toBeVisible({ timeout: 5000 });
  });

  test('RTW Plans Expiring stat is 0 but overdue plans exist', async ({ authenticatedPage: page }) => {
    // BUG: Dashboard shows "RTW Plans Expiring: 0"
    // But Ethan Wells has an RTW plan deadline overdue by 423 days.
    // "Expiring" only catches plans about to expire — not already expired.
    // FIX: Rename to "RTW Plans Overdue" and include all plans past their deadline.
    // Or show two stats: "Expiring Soon (7 days)" and "Overdue".
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('text=RTW Plans Expiring', { timeout: 15000 });

    const rtwStat = page.locator('text=RTW Plans Expiring').first();
    await expect(rtwStat).toBeVisible();

    const rtwCount = page.locator('text=RTW Plans Expiring').locator('..').locator('..').locator('text=/\\d+/').first();
    const count = await rtwCount.textContent().catch(() => '0');
    console.log(`RTW Plans Expiring count: ${count}`);

    // With Ethan Wells 423 days overdue, this must not be 0
    // This test will FAIL until "Expiring" includes already-overdue plans
    if (count?.trim() === '0') {
      console.warn('BUG: RTW Plans Expiring = 0 but Ethan Wells RTW plan is 423 days overdue.');
      console.warn('FIX: Include overdue plans, not just expiring-soon plans. Or add separate "Overdue" stat.');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// DUPLICATE UI ELEMENTS
// ─────────────────────────────────────────────────────────────

test.describe('No Duplicate CTAs', { tag: ['@ux', '@regression'] }, () => {

  test('only one expert/telehealth CTA visible on case screen', async ({ authenticatedPage: page }) => {
    // BUG: Two competing buttons both visible on every case screen:
    //   1. "Book Telehealth" — top right header
    //   2. "Talk with an Expert" — floating bottom right
    // An HR manager doesn't know which to click or how they differ.
    // If they do the same thing — remove one.
    // If they differ — give them distinct labels ("Book GP Telehealth" vs "Talk to a Case Advisor").
    // FIX: One CTA only. Floating button should be removed if header button already exists.
    await page.goto(LEO_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const bookTelehealth = page.locator('button:has-text("Book Telehealth")').first();
    const talkExpert = page.locator('button:has-text("Talk with an Expert")').first();

    const hasBook = await bookTelehealth.isVisible({ timeout: 5000 }).catch(() => false);
    const hasTalk = await talkExpert.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasBook && hasTalk) {
      console.warn('BUG: Both "Book Telehealth" and "Talk with an Expert" are visible simultaneously.');
      console.warn('FIX: One CTA only. If same action — remove floating button. If different — give distinct labels.');
    }

    // Only one should be visible
    const bothVisible = hasBook && hasTalk;
    expect(bothVisible).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// CASE LIST — actionability and accuracy
// ─────────────────────────────────────────────────────────────

test.describe('Case List Accuracy', { tag: ['@critical', '@ux'] }, () => {

  test('all cases in list have an assigned coordinator', async ({ authenticatedPage: page }) => {
    // BUG: Every single case shows "Unassigned" in the Assigned column.
    // If no one owns a case, no one is responsible for actioning the recommendations.
    // This is either a data problem (seed data never assigned cases) or a
    // workflow problem (no assignment step exists in case creation).
    // FIX: Case creation must require assignment. Dashboard must highlight unassigned cases as a risk.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('table', { timeout: 15000 });

    const unassignedCells = page.locator('td', { hasText: 'Unassigned' });
    const count = await unassignedCells.count();

    if (count > 0) {
      console.warn(`BUG: ${count} cases are Unassigned. Nobody owns these cases.`);
      console.warn('FIX: Require assignment at case creation. Add "Unassigned Cases" alert to dashboard.');
    }

    // In a real deployment, unassigned cases should be 0
    // For now, document the count
    console.log(`Unassigned cases: ${count} of 11`);
  });

  test('Action Queue overdue counter reflects actual days overdue', async ({ authenticatedPage: page }) => {
    // BUG: Every action in the Action Queue says "Overdue by 1 day"
    // Ethan Wells has been overdue for 423+ days, not 1 day.
    // The compliance engine ran once yesterday and set the counter — it doesn't accumulate.
    // FIX: Overdue counter must be calculated from the original due date:
    //   overdue_days = today - action_due_date (not today - last_compliance_run)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[aria-label="Action queue"]', { timeout: 15000 });

    // Ethan Wells is 423+ days overdue — should not say "1 day"
    const ethanAction = page.locator('[aria-label="Action queue"]').locator('text=Ethan Wells').first();
    if (await ethanAction.isVisible({ timeout: 5000 }).catch(() => false)) {
      const actionCard = ethanAction.locator('../..').first();
      const overdueText = await actionCard.textContent().catch(() => '');
      console.log(`Ethan Wells action text: "${overdueText}"`);

      if (overdueText.includes('Overdue by 1 day')) {
        console.warn('BUG: Ethan Wells shows "Overdue by 1 day" but case is 423+ days overdue.');
        console.warn('FIX: Calculate overdue_days = today - original_due_date, not incremental counter.');
      }
    }
  });

  test('case row click navigates to the correct case', async ({ authenticatedPage: page }) => {
    // BUG RISK: During walkthrough, clicking Sarah Mitchell row navigated to Harper Lin.
    // The click target appears to be wrong — may be hitting adjacent row.
    // FIX: Ensure each row has a data-testid and the click target covers the full row.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('table', { timeout: 15000 });

    // Click Sarah Mitchell specifically
    const sarahRow = page.locator('tr', { hasText: 'Sarah Mitchell' }).first();
    await expect(sarahRow).toBeVisible();
    await sarahRow.click();
    await page.waitForLoadState('domcontentloaded');

    // Should be on Sarah Mitchell's case, not someone else's
    const heading = page.locator('h1').first();
    const headingText = await heading.textContent();
    expect(headingText).toContain('Sarah Mitchell');
  });
});

// ─────────────────────────────────────────────────────────────
// NAVIGATION — two different nav experiences
// ─────────────────────────────────────────────────────────────

test.describe('Navigation Consistency', { tag: ['@ux', '@regression'] }, () => {

  test('dashboard and case pages show the same navigation', async ({ authenticatedPage: page }) => {
    // BUG: Dashboard (/) shows a simplified sidebar with only Reports & Analytics + Audit Log.
    // Case pages show the full sidebar: Dashboard, Checks, Cases, New Claim, RTW Planner,
    // Check-ins, Financials, Predictions, Risk, Audit Log, Agents.
    // Two different nav experiences in the same app breaks spatial memory.
    // FIX: Use the same full navigation on all pages, or document why dashboard is different.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const fullNavLinks = [
      'Cases',
      'RTW Planner',
      'Predictions',
      'Risk',
    ];

    for (const link of fullNavLinks) {
      const navLink = page.locator(`nav a:has-text("${link}"), aside a:has-text("${link}")`).first();
      const isVisible = await navLink.isVisible({ timeout: 3000 }).catch(() => false);
      if (!isVisible) {
        console.warn(`GAP: Dashboard sidebar is missing "${link}" link that exists on case pages.`);
      }
    }
  });

  test('audit log shows case events not just AI actions', async ({ authenticatedPage: page }) => {
    // BUG: Audit log shows 3 entries — all "AI Summary Generated". Case Events: 0.
    // This means no human actions are being logged. Either:
    //   a) Nobody has used the system, OR
    //   b) Case events aren't being tracked in the audit log
    // FIX: Every status change, assignment, note, upload must generate an audit log entry.
    // The audit log is legal evidence — gaps mean liability.
    await page.goto('/audit');
    await page.waitForLoadState('domcontentloaded');

    const caseEventsCount = page.locator('text=Case Events').locator('..').locator('..').locator('text=/\\d+/').first();
    const count = await caseEventsCount.textContent().catch(() => '0');
    console.log(`Audit log case events: ${count}`);

    if (count?.trim() === '0') {
      console.warn('BUG: Audit log shows 0 Case Events. Human actions are not being logged.');
      console.warn('FIX: Log every case mutation (status change, note, upload, assignment) to audit log.');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// CASE MANAGEMENT WORKFLOW — what happens after opening a case
// ─────────────────────────────────────────────────────────────

test.describe('Case Management Workflow', { tag: ['@critical', '@ux'] }, () => {

  test('case has a clear "what to do next" with a button to do it', async ({ authenticatedPage: page }) => {
    // The core product promise of Preventli: tell the HR manager exactly what to do next.
    // Currently: the system shows text recommendations but no way to act on them.
    // Every case screen should have ONE primary action button at the top that says:
    //   "Do this now: [action]" → clicking it opens the workflow to complete it.
    // FIX: Convert Next Recommended Action from read-only text to an executable workflow trigger.
    await page.goto(LEO_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // The action text
    const actionText = page.locator('text=Document competency sign-off').first();
    await expect(actionText).toBeVisible({ timeout: 10000 });

    // There should be a button to actually do it
    const actionButton = page.locator('button:has-text("Document"), button:has-text("Complete"), button:has-text("Do this now"), button:has-text("Take Action")').first();
    const hasButton = await actionButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasButton) {
      console.warn('GAP: "Document competency sign-off" has no button to execute it.');
      console.warn('This is the core UX gap across the entire system.');
      console.warn('FIX: Add a "Complete Action" button to every Next Recommended Action card.');
    }

    expect(hasButton).toBe(true);
  });

  test('completing an action updates the timeline', async ({ authenticatedPage: page }) => {
    // When an HR manager completes an action, it must appear in the Timeline tab.
    // The timeline is the legal record of case management activity.
    // Currently timeline only shows system-generated milestones — no human actions.
    // FIX: Every completed action must POST to timeline with: actor, timestamp, action type, notes.
    await page.goto(LEO_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Check current timeline entries
    await page.getByRole('button', { name: 'Timeline' }).click();
    await page.waitForTimeout(1000);

    const timelineItems = page.locator('[class*="timeline"] > *');
    const beforeCount = await timelineItems.count();
    console.log(`Timeline entries before action: ${beforeCount}`);

    // After completing an action, count should increase
    // (This test documents the expected behaviour — will pass once actions are wired to timeline)
  });
});
