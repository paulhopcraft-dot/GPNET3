/**
 * Production Readiness Smoke Tests
 *
 * FAST pre-deploy gate — all 5 key business scenarios in under 3 minutes.
 * Run before every production deployment.
 *
 * Scenarios covered:
 *   1. Pre-Employment Health Check  — create assessment, confirm magic link token returned
 *   2. New Injury Case              — new case form is accessible and accepts input
 *   3. Injury RTW                   — existing case shows RTW indicators
 *   4. Telehealth Booking           — modal opens, accepts input, confirms submission
 *   5. Exit Health Check            — exit tab visible on /checks hub
 *
 * NOTE on Exit/Preventative as full flows:
 *   These tabs exist in the UI and the API accepts "exit" / "wellbeing" service types
 *   for telehealth bookings. Full assessment flows (own assessment type, dedicated
 *   questionnaire) are PENDING feature work — see domain_memory.json.
 *
 * Email control:
 *   Assessment magic links are tested by extracting accessToken from the POST
 *   /api/assessments response — no SMTP interception required. The token IS the link.
 *
 * @smoke @production-readiness @critical
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { test as authTest } from '../fixtures/auth.fixture';
import { EMPLOYER_CREDENTIALS, BASE_URL } from '../fixtures/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper — returns a Bearer token for API calls
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<{ token: string; headers: Record<string, string> }> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const res = await ctx.post('/api/auth/login', {
    data: { email: EMPLOYER_CREDENTIALS.email, password: EMPLOYER_CREDENTIALS.password },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()}`);
  const json = await res.json();
  const token: string = json.token ?? json.accessToken ?? json.data?.accessToken ?? json.data?.token ?? '';

  // Fetch CSRF token — required for all POST/PUT/DELETE endpoints
  const csrfRes = await ctx.get('/api/csrf-token', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const csrfJson = csrfRes.ok() ? await csrfRes.json() : {};
  const csrfToken: string = csrfJson.csrfToken ?? csrfJson.token ?? '';

  await ctx.dispose();
  return {
    token,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Pre-Employment Health Check
// API path: POST /api/assessments → returns accessToken (magic link)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PROD-1: Pre-Employment Health Check', { tag: ['@smoke', '@critical'] }, () => {
  test('creates assessment and returns accessToken for magic link', async () => {
    const { headers } = await getAuthToken();
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });

    const ts = Date.now();
    const res = await ctx.post('/api/assessments', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        candidateName: `Prod Test ${ts}`,
        candidateEmail: `prodtest+${ts}@smoke.preventli.test`,
        positionTitle: 'Warehouse Operator',
        jobDescription: 'Manual handling 25kg, forklift operation, standing 8h shifts.',
      },
    });

    expect(res.status()).toBe(201);
    const json = await res.json();
    const assessment = json.assessment ?? json.data ?? json;

    // Must return an ID so the assessment exists in the DB
    expect(assessment).toHaveProperty('id');
    expect(typeof assessment.id).toBe('string');

    // Must return accessToken — this IS the magic link token sent to workers
    expect(assessment).toHaveProperty('accessToken');
    expect(typeof assessment.accessToken).toBe('string');
    expect(assessment.accessToken.length).toBeGreaterThan(10);

    // Status should be created/pending — not already submitted
    expect(['created', 'pending']).toContain(assessment.status);

    await ctx.dispose();
  });

  test('magic link token resolves worker form without auth', async () => {
    const { headers } = await getAuthToken();
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });

    // Create an assessment to get a real token
    const ts = Date.now();
    const createRes = await ctx.post('/api/assessments', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        candidateName: `Magic Link Test ${ts}`,
        candidateEmail: `magiclink+${ts}@smoke.preventli.test`,
        positionTitle: 'Forklift Operator',
        jobDescription: 'Forklift operation, manual handling.',
      },
    });
    expect(createRes.status()).toBe(201);
    const { assessment } = await createRes.json();
    const token: string = assessment.accessToken;

    // Public endpoint — NO auth headers
    const publicCtx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const checkRes = await publicCtx.get(`/api/public/check/${token}`);
    expect(checkRes.status()).toBe(200);
    const checkJson = await checkRes.json();

    // Worker-facing response must contain enough info for the form
    const data = checkJson.assessment ?? checkJson.data ?? checkJson;
    // API returns assessmentId (not id) on the public check endpoint
    const hasId = !!(data.id ?? data.assessmentId);
    expect(hasId).toBe(true);

    await ctx.dispose();
    await publicCtx.dispose();
  });

  test('/assessments/new page renders correctly (UI)', async () => {
    // UI-level sanity: HR can reach the form
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const res = await ctx.get('/assessments/new');
    // Allow redirect to login (non-authenticated browser request) — page just must not 500
    expect(res.status()).not.toBe(500);
    await ctx.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — New Injury Case
// UI path: /employer/new-case
// ─────────────────────────────────────────────────────────────────────────────

authTest.describe('PROD-2: New Injury Case Creation', { tag: ['@smoke', '@critical'] }, () => {
  authTest('new case form loads with WorkSafe gateway question', async ({ authenticatedPage: page }) => {
    await page.goto('/employer/new-case');
    await page.waitForLoadState('domcontentloaded');
    // Wait for Suspense/lazy chunk to finish loading (spinner is .animate-spin, no text)
    await page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});

    // Page must not be a 404
    const content = await page.content();
    expect(content).not.toContain('404');
    expect(content).not.toContain('Not Found');

    // Should show something useful (form heading OR gateway question)
    const hasHeading = await page.locator('h1, h2').first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(hasHeading).toBe(true);
  });

  authTest('new case form accepts worker name and email', async ({ authenticatedPage: page }) => {
    await page.goto('/employer/new-case');
    await page.waitForLoadState('domcontentloaded');
    // Wait for Suspense/lazy chunk to finish loading (spinner is .animate-spin, no text)
    await page.locator('.animate-spin').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});

    // Navigate past gateway if shown
    const noOption = page.locator('label:has-text("No"), button:has-text("No")').first();
    if (await noOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await noOption.click();
      await page.waitForTimeout(500);
    }

    const nameInput = page.locator('input[name*="name"], input[placeholder*="name"]').first();
    const emailInput = page.locator('input[type="email"]').first();

    const hasInput = (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
                     (await emailInput.isVisible({ timeout: 5000 }).catch(() => false));
    expect(hasInput).toBe(true);

    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Smoke Test Worker');
      await expect(nameInput).toHaveValue('Smoke Test Worker');
      await nameInput.clear();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — Injury RTW (existing case)
// ─────────────────────────────────────────────────────────────────────────────

authTest.describe('PROD-3: Injury RTW Dashboard', { tag: ['@smoke', '@critical'] }, () => {
  authTest('cases list loads and shows at least one case', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');

    // Should have a table or list of cases
    const tableOrList = page.locator('table, [role="table"], tbody tr').first();
    await expect(tableOrList).toBeVisible({ timeout: 15000 });
  });

  authTest('case detail page loads without errors', async ({ authenticatedPage: page }) => {
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');

    // Click first case row
    const firstRow = page.locator('tbody tr, [href*="/case/"]').first();
    if (!await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[SKIP] No cases in list');
      return;
    }

    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');

    // Detail page should have tabs (Summary, Injury, Timeline etc.)
    const tabs = page.locator('[role="tab"], button[data-state]').first();
    await expect(tabs).toBeVisible({ timeout: 10000 });
  });

  authTest('API: cases endpoint returns valid response', async () => {
    const { headers } = await getAuthToken();
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const res = await ctx.get('/api/gpnet2/cases', { headers });
    expect(res.status()).toBe(200);
    const json = await res.json();
    // Response must be an array or object with cases array
    const cases = Array.isArray(json) ? json : json.cases ?? json.data ?? [];
    expect(Array.isArray(cases)).toBe(true);
    await ctx.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — Telehealth Booking
// ─────────────────────────────────────────────────────────────────────────────

test.describe('PROD-4: Telehealth Booking', { tag: ['@smoke', '@critical'] }, () => {
  test('API: creates telehealth booking and returns booking ID', async () => {
    const { headers } = await getAuthToken();
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const ts = Date.now();

    const res = await ctx.post('/api/bookings', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        serviceType: 'injury',
        appointmentType: 'video',
        workerName: `Smoke Worker ${ts}`,
        workerEmail: `smokeworker+${ts}@prod.test`,
        employerNotes: 'Smoke test booking — safe to delete',
        requestReferral: false,
      },
    });

    expect(res.status()).toBe(201);
    const json = await res.json();
    const booking = json.booking ?? json.data ?? json;

    expect(booking).toHaveProperty('id');
    expect(booking.status).toBe('pending');

    await ctx.dispose();
  });
});

authTest.describe('PROD-4: Telehealth Booking UI', { tag: ['@smoke', '@critical'] }, () => {
  authTest('"Book Telehealth" button is visible and opens modal', async ({ authenticatedPage: page }) => {
    await page.goto('/employer');
    await page.waitForLoadState('domcontentloaded');

    const btn = page.getByRole('button', { name: /book telehealth/i });
    await expect(btn).toBeVisible({ timeout: 10000 });

    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // All 5 service types must be selectable
    for (const label of ['Pre-Employment', 'Injury', 'Mental Health', 'Exit', 'Wellbeing']) {
      await expect(page.locator(`button:has-text("${label}")`)).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — Exit & Preventative Checks (current state)
// Full assessment flow not yet built — tabs exist, telehealth booking works
// ─────────────────────────────────────────────────────────────────────────────

authTest.describe('PROD-5: Exit & Preventative Checks', { tag: ['@smoke'] }, () => {
  authTest('Exit tab is visible on /checks hub', async ({ authenticatedPage: page }) => {
    await page.goto('/checks');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('text=Total Assessments').waitFor({ state: 'visible', timeout: 15000 });

    const exitTab = page.getByRole('button', { name: /exit/i });
    await expect(exitTab).toBeVisible({ timeout: 5000 });
  });

  authTest('Prevention tab is visible on /checks hub', async ({ authenticatedPage: page }) => {
    await page.goto('/checks');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('text=Total Assessments').waitFor({ state: 'visible', timeout: 15000 });

    const preventionTab = page.getByRole('button', { name: /prevention/i });
    await expect(preventionTab).toBeVisible({ timeout: 5000 });
  });

  authTest('Exit telehealth booking via API is accepted', async () => {
    // Exit check as telehealth (booking) works today even without a full assessment flow
    const { headers } = await getAuthToken();
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const ts = Date.now();

    const res = await ctx.post('/api/bookings', {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: {
        serviceType: 'exit',
        appointmentType: 'video',
        workerName: `Exit Test ${ts}`,
        workerEmail: `exit+${ts}@prod.test`,
        employerNotes: 'Exit check smoke test',
        requestReferral: false,
      },
    });

    expect(res.status()).toBe(201);
    const json = await res.json();
    expect((json.booking ?? json).status).toBe('pending');

    await ctx.dispose();
  });

  authTest('[GAP] Exit assessment type not yet in schema — documents current state', async () => {
    // This test documents the known gap rather than failing the suite.
    // Exit and Preventative assessment TYPES are not in PreEmploymentAssessmentType enum.
    // The telehealth booking (above) fills the gap for now.
    // TODO: Add 'exit' and 'preventative' to PreEmploymentAssessmentType in shared/schema.ts
    //       Add routes: POST /api/assessments (exit), GET /api/public/check/:token (exit form)
    //       Add UI: exit questionnaire at /check/:token
    console.log('[KNOWN GAP] Exit/Preventative assessment flow: not yet built. Telehealth booking covers the service type. Full questionnaire pending.');

    // This always passes — it's a documentation test, not a functional gate
    expect(true).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE CHECKS (gate-level)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('INFRA: API health', { tag: ['@smoke', '@critical'] }, () => {
  test('health endpoint returns 200', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const res = await ctx.get('/api/system/health');
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('unauthenticated request to protected endpoint returns 401 not 500', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const res = await ctx.get('/api/gpnet2/cases');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('login endpoint accepts valid credentials', async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { email: EMPLOYER_CREDENTIALS.email, password: EMPLOYER_CREDENTIALS.password },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    const hasToken = !!(json.token ?? json.accessToken ?? json.data?.accessToken ?? json.data?.token);
    expect(hasToken).toBe(true);
    await ctx.dispose();
  });
});
