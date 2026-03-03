/**
 * Pre-employment workflow — step-by-step screenshot walkthrough
 * Tests: login, create (text only), create (file upload), send, worker form, submit, list view
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import path from "path";
import fs from "fs";

const BASE = "http://localhost:5000";
const DIR = "/tmp/pe-shots";
fs.mkdirSync(DIR, { recursive: true });
// clean old shots
fs.readdirSync(DIR).forEach(f => fs.unlinkSync(path.join(DIR, f)));

let idx = 0;
async function shot(page: Page, label: string) {
  const file = path.join(DIR, `${String(++idx).padStart(2, "0")}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${String(idx).padStart(2, "0")} ${label}`);
  return file;
}

async function section(title: string) {
  console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`);
}

async function getCsrf(page: Page): Promise<string> {
  const res = await page.request.get(`${BASE}/api/csrf-token`);
  const json = await res.json();
  return json.data.csrfToken;
}

async function loginAs(ctx: BrowserContext, email: string, password: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  return page;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // ══════════════════════════════════════════════════════════════════════
  // 1. LOGIN
  // ══════════════════════════════════════════════════════════════════════
  await section("1. LOGIN");
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await shot(page, "login-empty");

  // fill email only
  await page.fill('input[type="email"]', "admin@gpnet.local");
  await shot(page, "login-email-entered");

  // fill password
  await page.fill('input[type="password"]', "ChangeMe123!");
  await shot(page, "login-ready-to-submit");

  // submit
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await shot(page, "dashboard-after-login");

  // ══════════════════════════════════════════════════════════════════════
  // 2. NAVIGATE TO CHECKS
  // ══════════════════════════════════════════════════════════════════════
  await section("2. NAVIGATE TO HEALTH CHECKS");
  await page.goto(`${BASE}/checks`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await shot(page, "checks-overview");

  // hover New Assessment button
  await page.hover('text=New Assessment');
  await shot(page, "checks-hover-new-assessment");

  // ══════════════════════════════════════════════════════════════════════
  // 3. TEST A — VALIDATION: submit empty form
  // ══════════════════════════════════════════════════════════════════════
  await section("3. TEST A — Validation: empty form rejected");
  await page.goto(`${BASE}/assessments/new`);
  await page.waitForLoadState("networkidle");
  await shot(page, "testA-form-empty");

  // try submitting with nothing filled
  await page.click('button[type="submit"]');
  await page.waitForTimeout(400);
  await shot(page, "testA-html5-validation");

  // fill name + email + role but NO job description → should get client error
  await page.fill("#candidateName", "No JD Test");
  await page.fill("#candidateEmail", "nojd@test.com");
  await page.fill("#positionTitle", "Admin Assistant");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  await shot(page, "testA-missing-job-description-error");

  // ══════════════════════════════════════════════════════════════════════
  // 4. TEST B — Text description only
  // ══════════════════════════════════════════════════════════════════════
  await section("4. TEST B — Create with text description only");
  await page.reload();
  await page.waitForLoadState("networkidle");

  await page.fill("#candidateName", "Michael Chen");
  await page.fill("#candidateEmail", "michael.chen@testco.com");
  await page.fill("#positionTitle", "Forklift Operator");
  await shot(page, "testB-basic-fields-filled");

  await page.fill("#jobDescription", "Operates forklift in warehouse environment. Requires lifting up to 30kg, standing for extended periods (6-8hrs), operating machinery in confined spaces. Must have valid forklift licence.");
  await shot(page, "testB-with-job-description");

  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Ready to send", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await shot(page, "testB-assessment-created");

  // send
  await page.click("text=Send to Worker");
  await page.waitForSelector("text=Questionnaire sent", { timeout: 10000 });
  await shot(page, "testB-questionnaire-sent");

  // get token for Michael
  const csrfB = await getCsrf(page);
  const listB = await page.request.get(`${BASE}/api/assessments`, { headers: { "X-CSRF-Token": csrfB } });
  const jsonB = await listB.json();
  const assessmentsB = (jsonB.assessments ?? []).sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latestB = assessmentsB[0];
  const detailB = await page.request.get(`${BASE}/api/assessments/${latestB.id}`, { headers: { "X-CSRF-Token": csrfB } });
  const tokenB = (await detailB.json()).assessment?.accessToken;
  console.log(`  Token for Michael: ${tokenB?.slice(0, 16)}...`);

  // ══════════════════════════════════════════════════════════════════════
  // 5. TEST C — File upload (PDF)
  // ══════════════════════════════════════════════════════════════════════
  await section("5. TEST C — Create with PDF file upload");
  await page.goto(`${BASE}/assessments/new`);
  await page.waitForLoadState("networkidle");

  await page.fill("#candidateName", "Priya Sharma");
  await page.fill("#candidateEmail", "priya.sharma@nursing.com");
  await page.fill("#positionTitle", "Registered Nurse");
  await shot(page, "testC-fields-filled");

  // upload a fake PDF via filechooser event
  const pdfContent = Buffer.from(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /MediaBox [0 0 612 792] /Parent 2 0 R >> endobj
trailer << /Size 4 /Root 1 0 R >> startxref 0 %%EOF`);

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.click("text=Attach document"),
  ]);
  await fileChooser.setFiles({
    name: "nurse-job-description.pdf",
    mimeType: "application/pdf",
    buffer: pdfContent,
  });
  await page.waitForTimeout(500);
  await shot(page, "testC-pdf-attached");

  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Ready to send", { timeout: 10000 });
  await shot(page, "testC-created-with-file");

  await page.click("text=Send to Worker");
  await page.waitForSelector("text=Questionnaire sent", { timeout: 10000 });
  await shot(page, "testC-sent");

  // ══════════════════════════════════════════════════════════════════════
  // 6. TEST D — Worker fills out questionnaire (Michael Chen)
  // ══════════════════════════════════════════════════════════════════════
  await section("6. TEST D — Worker fills out questionnaire");
  if (tokenB) {
    const workerPage = await ctx.newPage();
    await workerPage.goto(`${BASE}/check/${tokenB}`);
    await workerPage.waitForLoadState("networkidle");
    await workerPage.screenshot({ path: path.join(DIR, `${String(++idx).padStart(2,"0")}-testD-worker-lands-on-form.png`), fullPage: false });
    console.log(`  📸 ${idx} testD-worker-lands-on-form`);

    // Answer Q1: general health → "Excellent"
    await workerPage.click('button:has-text("Excellent")');
    await workerPage.waitForTimeout(200);
    await workerPage.screenshot({ path: path.join(DIR, `${String(++idx).padStart(2,"0")}-testD-answered-q1-excellent.png`), fullPage: false });
    console.log(`  📸 ${idx} testD-answered-q1-excellent`);

    // Answer Q2: current conditions → "No"
    const noButtons = await workerPage.locator('button:has-text("No")').all();
    for (const btn of noButtons) await btn.click().catch(() => {});
    await workerPage.waitForTimeout(200);

    // Answer mental health → "Good"
    const goodButtons = await workerPage.locator('button:has-text("Good")').all();
    for (const btn of goodButtons) await btn.click().catch(() => {});
    await workerPage.waitForTimeout(200);

    // scroll down to see all answers
    await workerPage.evaluate(() => window.scrollTo(0, 600));
    await workerPage.screenshot({ path: path.join(DIR, `${String(++idx).padStart(2,"0")}-testD-all-answered-ready-to-submit.png`), fullPage: false });
    console.log(`  📸 ${idx} testD-all-answered-ready-to-submit`);

    // submit
    await workerPage.click("text=Submit Health Questionnaire");
    await workerPage.waitForSelector("text=Thank You", { timeout: 10000 });
    await workerPage.screenshot({ path: path.join(DIR, `${String(++idx).padStart(2,"0")}-testD-submitted-thank-you.png`), fullPage: false });
    console.log(`  📸 ${idx} testD-submitted-thank-you`);

    // test: try to resubmit (should be blocked)
    const resubmit = await ctx.newPage();
    await resubmit.goto(`${BASE}/check/${tokenB}`);
    await resubmit.waitForLoadState("networkidle");
    await resubmit.waitForTimeout(600);
    await resubmit.screenshot({ path: path.join(DIR, `${String(++idx).padStart(2,"0")}-testD-resubmit-blocked.png`), fullPage: false });
    console.log(`  📸 ${idx} testD-resubmit-blocked`);
    await resubmit.close();
    await workerPage.close();
  }

  // ══════════════════════════════════════════════════════════════════════
  // 7. TEST E — Invalid token
  // ══════════════════════════════════════════════════════════════════════
  await section("7. TEST E — Invalid / expired token");
  const badPage = await ctx.newPage();
  await badPage.goto(`${BASE}/check/thisisaninvalidtoken123456`);
  await badPage.waitForLoadState("networkidle");
  await badPage.waitForTimeout(800);
  await badPage.screenshot({ path: path.join(DIR, `${String(++idx).padStart(2,"0")}-testE-invalid-token.png`), fullPage: false });
  console.log(`  📸 ${idx} testE-invalid-token`);
  await badPage.close();

  // ══════════════════════════════════════════════════════════════════════
  // 8. CHECKS LIST — final state
  // ══════════════════════════════════════════════════════════════════════
  await section("8. FINAL STATE — checks list");
  await page.goto(`${BASE}/checks`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await shot(page, "final-checks-list-top");

  // scroll down to see more
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  await shot(page, "final-checks-list-scrolled");

  await browser.close();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ✅ All done — ${idx} screenshots in ${DIR}/`);
  console.log(`${"═".repeat(60)}\n`);
  const files = fs.readdirSync(DIR).filter(f => f.endsWith(".png")).sort();
  files.forEach(f => console.log(`     ${f}`));
})();
