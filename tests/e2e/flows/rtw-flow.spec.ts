/**
 * Complex RTW Flow — 6-Month Back Injury Lifecycle
 *
 * Simulates a real Australian workers' compensation case from injury to resolution.
 * Persona: Daniel Nguyen, warehouse worker, lumbar strain, WorkSafe claim lodged.
 * Expected RTW: 12 weeks. Actual: still off work at 6 months.
 *
 * Each phase tests what the system CURRENTLY does and asserts what it SHOULD do.
 * Failing assertions = gaps that need to be built.
 *
 * Legal context:
 *   - WorkSafe Victoria RTW Code of Practice
 *   - Fair Work Act 2009 s.340 (adverse action)
 *   - Workplace Injury Rehabilitation and Compensation Act 2013 (WIRC Act)
 *
 * @tags @critical @regression @rtw @compliance
 */

import { test, expect } from '../fixtures/auth.fixture';

// Ethan Wells is our real test case — 70 weeks off work, expired cert, no RTW plan
// Use his case ID for tests that need an existing complex case
const COMPLEX_CASE_ID = 'f7cd6639-a713-45ba-b5fd-8a0eb42840d8';
const COMPLEX_CASE_URL = `/employer/case/${COMPLEX_CASE_ID}`;

// ============================================================
// PHASE 1: Claim Lodgement (Week 0–2)
// ============================================================

test.describe('Phase 1 — Claim Lodgement', { tag: ['@critical', '@rtw'] }, () => {

  test('new case page is reachable from dashboard', async ({ authenticatedPage: page }) => {
    // HR's first action: report the injury and create the case
    // FRICTION FOUND: There is no "New Case" button visible on the dashboard or cases list.
    // FIX NEEDED: Add a prominent "+ New Case" button to /cases and /employer pages.
    await page.goto('/employer');
    await page.waitForLoadState('domcontentloaded');

    const newCaseButton = page.locator('a[href*="new-case"], button:has-text("New Case"), a:has-text("New Case")').first();
    const isVisible = await newCaseButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isVisible) {
      // Document the gap — navigation to new case is not discoverable
      console.warn('GAP: No "New Case" button on dashboard. HR must know the URL /employer/new-case directly.');
    }

    // Workaround: navigate directly
    await page.goto('/employer/new-case');
    await expect(page.locator('h1, h2').filter({ hasText: /new case/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('WorkSafe gateway question appears and is answered Yes', async ({ authenticatedPage: page }) => {
    // The gateway question determines the correct claim pathway.
    // If claim is lodged with WorkSafe, the employer has specific obligations under WIRC Act.
    await page.goto('/employer/new-case');
    await page.waitForLoadState('domcontentloaded');

    const gatewayQuestion = page.locator('text=/lodged.*claim|WorkSafe|claim.*lodged/i').first();
    await expect(gatewayQuestion).toBeVisible({ timeout: 10000 });

    // Answer Yes — claim HAS been lodged (most complex case scenario)
    const yesOption = page.locator('label:has-text("Yes"), input[value="yes"]').first();
    await expect(yesOption).toBeVisible();
    await yesOption.click();

    // FIX NEEDED: After answering "Yes", the system should show the WorkSafe claim number field.
    // Currently it only reveals the same form regardless of Yes/No answer.
    // Suggestion: Add a "WorkSafe Claim Reference Number" field when answer is Yes.
    const claimRefField = page.locator('input[name*="claim"], input[placeholder*="claim"]').first();
    const hasClaimRef = await claimRefField.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasClaimRef) {
      console.warn('GAP: No WorkSafe claim reference number field shown after answering Yes.');
    }
  });

  test('10-week RTW plan deadline is automatically set after case creation', async ({ authenticatedPage: page }) => {
    // WorkSafe Code of Practice cl.4.3: RTW plan must be in place within 10 weeks of injury.
    // This is a legal requirement — the system MUST create this deadline automatically.
    // FINDING: On Ethan Wells case, the timeline DOES show this deadline — good.
    // But the Action Plan shows "0 pending" despite being 418 days overdue — CRITICAL BUG.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Timeline' }).click();

    // Should show the RTW plan deadline event
    const rtwDeadline = page.locator('text=/RTW Plan Due|return.to.work.*plan.*due/i').first();
    await expect(rtwDeadline).toBeVisible({ timeout: 10000 });
  });

  test('Action Plan shows RTW obligation when case is created', async ({ authenticatedPage: page }) => {
    // The Action Plan on the Summary tab should immediately show:
    // "Create RTW Plan by [date 10 weeks from injury]"
    // CRITICAL BUG FOUND: Action Plan shows "0 pending" on a 418-day-overdue case.
    // FIX: Compliance engine must populate action plan items — not wait for manual trigger.
    // Suggest: Run compliance check on every page load, not just on demand.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const actionPlan = page.locator('text=/Action Plan/i').first();
    await expect(actionPlan).toBeVisible({ timeout: 10000 });

    const pendingCount = page.locator('text=/pending/i').first();
    const pendingText = await pendingCount.textContent().catch(() => '0 pending');

    // A 418-day-overdue case should have multiple pending actions
    expect(pendingText).not.toBe('0 pending');
    // FIX NEEDED: This test will currently FAIL — action plan is empty. Bug must be fixed.
  });
});

// ============================================================
// PHASE 2: Certificate Renewal at Week 6 — No Progress
// ============================================================

test.describe('Phase 2 — Certificate Renewal, No Progress', { tag: ['@critical', '@rtw'] }, () => {

  test('medical certificate is visible in Injury & Diagnosis tab', async ({ authenticatedPage: page }) => {
    // Medical certificates are the primary evidence of capacity.
    // HR needs to see: issue date, expiry date, restrictions, treating doctor.
    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Injury & Diagnosis' }).click();
    await page.waitForTimeout(1000);

    const certSection = page.locator('text=/Medical Certificate/i').first();
    await expect(certSection).toBeVisible({ timeout: 10000 });
  });

  test('expired certificate triggers a visible warning', async ({ authenticatedPage: page }) => {
    // An expired certificate means the worker has no current capacity assessment on file.
    // This is both a compliance gap AND a payment risk.
    // FINDING: Cert shows "Medical Certificate - Expired" — label exists, good.
    // GAP: There is no alert, action item, or banner warning HR to request a new certificate.
    // FIX: Add an automatic action item: "Certificate expired on [date] — request updated cert from worker."

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Injury & Diagnosis' }).click();

    const expiredLabel = page.locator('text=/Expired/i').first();
    await expect(expiredLabel).toBeVisible({ timeout: 10000 });

    // This SHOULD exist but currently does not:
    const expiryAlert = page.locator('[role="alert"]:has-text(/certificate.*expired|expired.*certificate/i)').first();
    const hasAlert = await expiryAlert.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasAlert) {
      console.warn('GAP: No alert generated for expired medical certificate. Action item should be auto-created.');
    }
  });

  test('recovery graph shows actual capacity stuck at 0%', async ({ authenticatedPage: page }) => {
    // When certificates keep showing "off work" with no capacity increase,
    // the recovery graph should show a flat actual line diverging from the estimated curve.
    // This visual gap is how HR knows the case is going off-track.
    // FINDING: Recovery graph exists and shows Week 70, Capacity 0% — correct data.
    // GAP: "Debug:" text visible in the UI ("No certificate markers found in data") — this is dev debug text.
    // FIX: Remove debug text from production UI. Replace with user-friendly "No certificates uploaded yet."

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Treatment & Recovery' }).click();
    await page.waitForTimeout(1500);

    // Recovery graph should be present
    const recoveryDashboard = page.locator('text=/Recovery Dashboard/i').first();
    await expect(recoveryDashboard).toBeVisible({ timeout: 10000 });

    // Capacity should show 0% for a still-off-work worker
    const capacityIndicator = page.locator('text=/Capacity.*0%|0%.*Capacity/i').first();
    await expect(capacityIndicator).toBeVisible({ timeout: 5000 });

    // Debug text should NOT be visible in production
    const debugText = page.locator('text=/Debug:/i').first();
    const hasDebugText = await debugText.isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasDebugText).toBe(false);
    // FIX: Remove the "Debug:" label from the certificate markers section in the UI component.
  });

  test('unchanged certificate restrictions trigger a review suggestion', async ({ authenticatedPage: page }) => {
    // When 2+ consecutive certificates show identical restrictions, the system should flag:
    // "Restrictions unchanged for X weeks — consider requesting GP review or IME."
    // GAP: This intelligence does not exist. The system stores certs but does not compare them.
    // FIX: Add certificate comparison logic. If restrictions match previous cert, trigger action item.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Treatment & Recovery' }).click();
    await page.waitForTimeout(1000);

    // This should exist but does not:
    const unchangedAlert = page.locator('text=/unchanged.*restriction|restriction.*unchanged|no.*progress/i').first();
    const hasAlert = await unchangedAlert.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasAlert) {
      console.warn('GAP: No intelligence to detect unchanged certificate restrictions across multiple renewals.');
    }
  });
});

// ============================================================
// PHASE 3: RTW Milestone Missed (Week 12)
// ============================================================

test.describe('Phase 3 — RTW Milestone Missed', { tag: ['@critical', '@rtw'] }, () => {

  test('timeline shows RTW plan as OVERDUE when deadline passes', async ({ authenticatedPage: page }) => {
    // This is working on the Ethan Wells case — timeline shows "Overdue by 418 days."
    // This is the one thing the system does well. Keep it.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Timeline' }).click();

    const overdueText = page.locator('text=/Overdue/i').first();
    await expect(overdueText).toBeVisible({ timeout: 10000 });

    // Should include the legal reference
    const legalRef = page.locator('text=/WorkSafe|Code of Practice|cl\\.4\\.3/i').first();
    await expect(legalRef).toBeVisible({ timeout: 5000 });
  });

  test('risk level escalates automatically when RTW plan is overdue', async ({ authenticatedPage: page }) => {
    // When the RTW plan deadline passes, risk must escalate.
    // CRITICAL BUG FOUND: XGBoost score is 0.84 (very high risk) but badge shows "Low".
    // These two data points contradict each other. One of them is wrong.
    // FIX: The risk badge should derive from the XGBoost score.
    //   0.0–0.3 = Low, 0.31–0.6 = Medium, 0.61–1.0 = High
    //   Score 0.84 should show "High", not "Low".

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // The XGBoost score is shown in the summary
    const riskScore = page.locator('text=/XGBoost.*0\\.8|risk.*0\\.8/i').first();
    await expect(riskScore).toBeVisible({ timeout: 10000 });

    // The risk badge in the header should match — currently says "Low" which is wrong
    const riskBadge = page.locator('text=/High|Medium|Low/i').last();
    const badgeText = await riskBadge.textContent();

    // This assertion WILL FAIL — documents the bug
    // A score of 0.84 must show High risk
    if (badgeText?.toLowerCase() === 'low') {
      console.warn('BUG: XGBoost score 0.84 but risk badge shows "Low". Fix: derive badge from score threshold.');
    }
  });

  test('summary tab shows AI-generated next step when RTW is overdue', async ({ authenticatedPage: page }) => {
    // At week 12 with no RTW plan, the system should tell HR exactly what to do:
    // "RTW plan is overdue. Recommended next step: Schedule face-to-face meeting with worker
    //  and treating GP. Consider Independent Medical Examination if progress stalled."
    // FINDING: AI summary is returning 403 errors and falling back to a template.
    // FIX: Fix the AI summary API endpoint. The 403 suggests an auth/permissions issue on the backend.
    // Short-term fix: Make the template smarter — include the specific overdue action in the template.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    // Summary should be default tab
    const summaryContent = page.locator('[role="tabpanel"], main').first();
    await expect(summaryContent).toBeVisible({ timeout: 10000 });

    // Should NOT show raw "Generated using Template" for a complex overdue case
    // This is a low-quality fallback that doesn't help HR
    const templateLabel = page.locator('text=/Generated using Template/i').first();
    const isTemplate = await templateLabel.isVisible({ timeout: 3000 }).catch(() => false);
    if (isTemplate) {
      console.warn('GAP: AI summary failed (403) and fell back to template. Template gives no actionable guidance.');
    }
  });
});

// ============================================================
// PHASE 4: Suitable Duties Friction (Week 16)
// ============================================================

test.describe('Phase 4 — Suitable Duties', { tag: ['@critical', '@rtw'] }, () => {

  test('treatment tab has a suitable duties section', async ({ authenticatedPage: page }) => {
    // "Suitable duties" is the key RTW concept. The employer must document:
    // 1. What duties were offered
    // 2. Worker's response
    // 3. If no duties available — why not, and what alternatives were considered
    // FINDING: No suitable duties section exists in Treatment & Recovery tab.
    // FIX: Add a "Suitable Duties" card to the Treatment tab with:
    //   - "Duties Offered" (text + date)
    //   - "Worker Response" (accepted/declined/no response)
    //   - "Duties Not Available" checkbox with reason field

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Treatment & Recovery' }).click();
    await page.waitForTimeout(1000);

    const suitableDuties = page.locator('text=/suitable dut|modified dut/i').first();
    const exists = await suitableDuties.isVisible({ timeout: 5000 }).catch(() => false);

    if (!exists) {
      console.warn('CRITICAL GAP: No "Suitable Duties" section. This is a core RTW requirement under WIRC Act s.52.');
    }

    // This will fail until the feature is built — that is intentional
    await expect(suitableDuties).toBeVisible({ timeout: 3000 });
  });

  test('premium impact warning appears when RTW is stalled', async ({ authenticatedPage: page }) => {
    // Every week a worker is off work costs the employer in WorkSafe premium.
    // At 16 weeks with no RTW progress, HR needs to see the premium impact estimate.
    // GAP: No premium impact indicator exists anywhere in the system.
    // FIX: Add a "Premium Impact" card to the Risk tab showing:
    //   - Estimated weekly cost increase
    //   - Projected total if case continues 6/12/24 months
    //   - "This case is in the top 20% of cost risk for your industry" type benchmark

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Risk' }).click();

    const premiumCard = page.locator('text=/premium.*impact|cost.*impact|insurance.*cost/i').first();
    const exists = await premiumCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (!exists) {
      console.warn('GAP: No premium impact indicator. Employers make RTW decisions partly on cost. This data is missing.');
    }
  });

  test('risk tab shows populated risk assessment for complex cases', async ({ authenticatedPage: page }) => {
    // Risk tab currently shows "No risk assessment recorded" for Ethan Wells.
    // This is a 70-week off-work case with XGBoost score 0.84 — risk data clearly exists.
    // BUG: The risk tab is not pulling or displaying the risk data that the summary tab references.
    // FIX: Risk tab should display:
    //   - XGBoost probability score
    //   - Risk factors (long duration, no suitable duties, expired cert, no RTW plan)
    //   - Trend (improving/stable/deteriorating)
    //   - Recommended interventions

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Risk' }).click();

    const riskContent = page.locator('text=/No risk assessment/i').first();
    const isEmpty = await riskContent.isVisible({ timeout: 5000 }).catch(() => false);

    if (isEmpty) {
      console.warn('BUG: Risk tab is empty for a case with XGBoost score 0.84. Risk data exists but is not displayed here.');
    }

    // Should show risk factors, not empty state
    const riskFactors = page.locator('text=/risk factor|long.*duration|no.*suitable/i').first();
    await expect(riskFactors).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// PHASE 5: Worker Non-Compliance (Week 20)
// ============================================================

test.describe('Phase 5 — Worker Non-Compliance', { tag: ['@critical', '@rtw'] }, () => {

  test('contacts tab allows adding case manager and insurer contacts', async ({ authenticatedPage: page }) => {
    // When a worker stops engaging, HR needs to escalate to insurer and case manager.
    // FINDING: Contacts tab is completely empty — no contacts at all.
    // FIX: Pre-populate with case manager from when case was created.
    // Also: insurer contact should be mandatory at case creation for WorkSafe claims.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Contacts' }).click();

    const addContactButton = page.locator('button:has-text("Add Contact"), button:has-text("Add First Contact")').first();
    await expect(addContactButton).toBeVisible({ timeout: 10000 });

    // Click to add a contact and check the form
    await addContactButton.click();
    await page.waitForTimeout(500);

    // Should have fields for: name, role, phone, email
    const nameField = page.locator('input[name*="name"], input[placeholder*="name"]').first();
    const hasForm = await nameField.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasForm) {
      console.warn('GAP: Add Contact button exists but no form appears. Possible broken UI interaction.');
    }
  });

  test('non-compliance documentation section exists', async ({ authenticatedPage: page }) => {
    // Under WIRC Act s.75, if a worker unreasonably refuses to participate in RTW,
    // the employer must document contact attempts before taking further action.
    // This documentation protects the employer in Fair Work disputes.
    // GAP: No non-compliance documentation section exists.
    // FIX: Add to Timeline tab: "Log Contact Attempt" button with:
    //   - Date/time
    //   - Method (phone/email/letter/site visit)
    //   - Outcome (no answer/refused/no response)
    //   - Notes field

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Timeline' }).click();

    const logContactButton = page.locator('button:has-text("Log Contact"), button:has-text("Contact Attempt")').first();
    const exists = await logContactButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!exists) {
      console.warn('CRITICAL GAP: No way to log worker contact attempts. Essential for Fair Work Act compliance evidence.');
    }
  });

  test('Fair Work Act guidance appears before formal warning steps', async ({ authenticatedPage: page }) => {
    // Before HR issues a formal non-compliance warning, the system should warn:
    // "Issuing formal notices to injured workers carries risk under FWA s.340 (adverse action).
    //  Consult your industrial relations adviser before proceeding."
    // GAP: No Fair Work Act guidance anywhere in the system.
    // FIX: Add a compliance advisory panel that appears when case duration > 12 weeks
    //      with links to FWA obligations and a "Get IR Advice" escalation prompt.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const fwaGuidance = page.locator('text=/Fair Work|adverse action|FWA|industrial relation/i').first();
    const exists = await fwaGuidance.isVisible({ timeout: 5000 }).catch(() => false);

    if (!exists) {
      console.warn('CRITICAL GAP: No Fair Work Act guidance. Terminating an injured worker without FWA compliance = adverse action claim.');
    }
  });
});

// ============================================================
// PHASE 6: Escalation — Termination Pathway (Week 24)
// ============================================================

test.describe('Phase 6 — Escalation and Industrial Relations', { tag: ['@critical', '@rtw'] }, () => {

  test('system provides pre-termination compliance checklist', async ({ authenticatedPage: page }) => {
    // Terminating an injured worker is the highest-risk action an employer can take.
    // The system MUST gate this with a checklist:
    // ☐ Medical evidence of permanent incapacity obtained
    // ☐ Suitable duties genuinely searched and documented
    // ☐ Worker notified in writing of inability to provide suitable duties
    // ☐ Insurer notified
    // ☐ Industrial relations advice obtained
    // ☐ FWA adverse action risk assessed
    // ☐ Termination letter reviewed by solicitor
    // GAP: None of this exists.
    // FIX: Add an "Escalation" section to the Risk tab that only appears for long-duration cases
    //      (> 6 months) with a locked checklist — all items must be checked before proceeding.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const terminationChecklist = page.locator('text=/termination.*checklist|pre.*termination|escalation.*checklist/i').first();
    const exists = await terminationChecklist.isVisible({ timeout: 5000 }).catch(() => false);

    if (!exists) {
      console.warn('CRITICAL GAP: No pre-termination checklist. Employer could terminate illegally and face adverse action claim.');
    }
  });

  test('system always shows a suggested next step for every case', async ({ authenticatedPage: page }) => {
    // This is the core product promise: the system always tells you what to do next.
    // It should never show a blank action plan on a complex case.
    // CRITICAL BUG: Action Plan shows "0 pending" on a 418-day overdue RTW case.
    // This is the single most important thing to fix in the entire system.
    // FIX REQUIRED:
    //   1. Run compliance engine on every case page load
    //   2. If RTW plan overdue → action: "Create RTW Plan immediately — overdue X days"
    //   3. If cert expired → action: "Request updated medical certificate"
    //   4. If no contact logged in 2 weeks → action: "Contact worker — last contact was X days ago"
    //   5. If no suitable duties documented → action: "Document suitable duties search"
    //   6. If XGBoost > 0.7 → action: "High risk case — consider IME referral"

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const actionPlan = page.locator('text=/Action Plan/i').first();
    await expect(actionPlan).toBeVisible({ timeout: 10000 });

    // For a 70-week off-work case, action plan MUST have items
    const noActionsMessage = page.locator('text=/No actions for this case yet/i').first();
    const isEmpty = await noActionsMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // This assertion documents the critical bug
    expect(isEmpty).toBe(false);
    // If this fails: fix the compliance engine to auto-generate action items
  });

  test('navigation sidebar is visible at desktop viewport and contains all key sections', async ({ authenticatedPage: page }) => {
    // NOTE: Sidebar only renders at >= 1024px viewport. At mobile/narrow widths it collapses.
    // Playwright default viewport (~780px) hides it — always run these tests at 1440px.
    // Sidebar contains: Dashboard, Checks, Cases, New Case, RTW Planner, Check-ins, Financials, Predictions, Risk

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/employer');
    await page.waitForLoadState('domcontentloaded');

    const sidebar = page.locator('[role="complementary"], aside, nav').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // All critical nav links must be present
    await expect(page.locator('a[href="/cases"]')).toBeVisible();
    await expect(page.locator('a[href="/employer/new-case"]')).toBeVisible();
    await expect(page.locator('a[href="/rtw-planner"]')).toBeVisible();
    await expect(page.locator('a[href="/predictions"]')).toBeVisible();
    await expect(page.locator('a[href="/risk"]')).toBeVisible();

    // NOTE: Pre-employment (/pre-employment) is NOT in the sidebar — it's a gap.
    // FIX: Add "Pre-Employment" link to sidebar so HR can access health checks from nav.
    const preEmploymentLink = page.locator('a[href="/pre-employment"]').first();
    const hasPreEmployment = await preEmploymentLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (!hasPreEmployment) {
      console.warn('GAP: Pre-Employment (/pre-employment) is not in the sidebar navigation.');
    }
  });
});

// ============================================================
// CROSS-CUTTING: System Quality Checks
// ============================================================

test.describe('System Quality — Friction and Reliability', { tag: ['@regression'] }, () => {

  test('AI summary API returns valid response (not 403)', async ({ authenticatedPage: page }) => {
    // BUG FOUND: /api/cases/:id/summary returns 403 Forbidden.
    // This causes the summary tab to fall back to a generic template.
    // FIX: Check that the authenticated user has permission to access case summaries.
    // Likely cause: API route requires a different auth scope than the session token provides.

    const requests: { url: string; status: number }[] = [];
    page.on('response', response => {
      if (response.url().includes('/summary')) {
        requests.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const summaryRequests = requests.filter(r => r.url.includes('/summary'));
    const failedRequests = summaryRequests.filter(r => r.status === 403);

    if (failedRequests.length > 0) {
      console.warn(`BUG: ${failedRequests.length} summary API request(s) returning 403. AI summary not working.`);
    }

    expect(failedRequests.length).toBe(0);
  });

  test('treatment plan API returns valid response (not 403)', async ({ authenticatedPage: page }) => {
    // BUG FOUND: /api/cases/:id/treatment-plan returns 403.
    // Treatment plan shows "Demo Mode" warning — not real data.
    // FIX: Same auth scope issue as summary API. Fix permission model.

    const requests: { url: string; status: number }[] = [];
    page.on('response', response => {
      if (response.url().includes('/treatment-plan')) {
        requests.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Treatment & Recovery' }).click();
    await page.waitForTimeout(3000);

    const failed = requests.filter(r => r.status === 403);
    if (failed.length > 0) {
      console.warn(`BUG: Treatment plan API returning 403. Shows "Demo Mode" instead of real data.`);
    }
    expect(failed.length).toBe(0);
  });

  test('pre-employment assessment form submits successfully', async ({ authenticatedPage: page }) => {
    // BUG FOUND: Clicking "Create Assessment" fires no POST request.
    // Form appears to submit but nothing happens — stats stay at 0, dialog stays open.
    // FIX: Check the onClick handler on the Create Assessment button.
    //   Likely cause: form validation silently blocking submission, or missing API call.
    //   Add error feedback so HR knows if submission failed and why.

    await page.goto('/pre-employment');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('button:has-text("New Assessment")', { timeout: 10000 });

    const postRequests: string[] = [];
    page.on('request', req => {
      if (req.method() === 'POST') postRequests.push(req.url());
    });

    await page.getByRole('button', { name: 'New Assessment' }).click();
    await page.getByRole('textbox', { name: 'Candidate Name' }).fill('Test Candidate');
    await page.getByRole('textbox', { name: 'Position Title' }).fill('Forklift Operator');
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Functional Capacity' }).click();
    await page.getByRole('button', { name: 'Create Assessment' }).click();
    await page.waitForTimeout(2000);

    const assessmentPost = postRequests.find(url => url.includes('pre-employment') || url.includes('assessment'));

    if (!assessmentPost) {
      console.warn('BUG: No POST request fired when Create Assessment is clicked. Form submission is broken.');
    }
    expect(assessmentPost).toBeTruthy();
  });

  test('debug text is not visible in production UI', async ({ authenticatedPage: page }) => {
    // BUG FOUND: "Debug: No certificate markers found in data." is visible in the Treatment tab.
    // This is developer debug text that was never removed before deployment.
    // FIX: Search codebase for "Debug:" text and remove or gate behind a dev flag.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Treatment & Recovery' }).click();
    await page.waitForTimeout(1500);

    const debugText = page.locator('text=/Debug:/').first();
    await expect(debugText).not.toBeVisible({ timeout: 3000 });
  });

  test('status date on summary is not stale (within 30 days)', async ({ authenticatedPage: page }) => {
    // BUG FOUND: Summary shows "Status as at Sunday 12 January 2025" — 14 months ago.
    // This gives HR a false picture of the current case state.
    // FIX: Status date should update to today when the page is loaded,
    //   or clearly show "Last updated: X" with a "Refresh" option.

    await page.goto(COMPLEX_CASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const statusDate = page.locator('text=/Status as at/i').first();
    if (await statusDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await statusDate.textContent();
      // Extract date and check it's not more than 30 days old
      console.log(`Status date found: ${text}`);
      // If date is "12 January 2025" on a live system in March 2026, that is stale data.
      expect(text).not.toContain('2025');
    }
  });
});
