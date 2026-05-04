import "dotenv/config";
import { db, pool } from "../server/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import {
  organizations,
  users,
  partnerUserOrganizations,
  workerCases,
} from "@shared/schema";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../server/controllers/auth";

/**
 * End-to-end verification of partner-tier Slice 1 against the live dev DB.
 * Quotes evidence for each step in the plan's verification list.
 *
 * Usage:
 *   node --import tsx/esm scripts/verify-partner-tier.ts
 */

const PARTNER_ORG_ID = "org-workbetter";
const ALPINE_HEALTH_ID = "org-alpine-health";
const ALPINE_MDF_ID = "org-alpine-mdf";

const PRIMARY_EMAIL = "workbetter@workbetter.com.au";
const SCOPED_EMAIL = "workbetter-scoped@workbetter.com.au";
const PASSWORD = "workbetter123";

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:5000";

function quote(label: string, value: unknown): void {
  console.log(`  ${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

async function fetchWithToken(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.token) {
    headers.set("Cookie", `accessToken=${init.token}`);
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
}

async function step(num: number, label: string, fn: () => Promise<boolean | void>): Promise<boolean> {
  console.log(`\n[Step ${num}] ${label}`);
  try {
    const result = await fn();
    const ok = result !== false;
    console.log(`  → ${ok ? "PASS" : "FAIL"}`);
    return ok;
  } catch (err) {
    console.log(`  → FAIL (${err instanceof Error ? err.message : String(err)})`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Partner-tier verification — quoting evidence for each plan step.\n");

  const results: Array<{ num: number; pass: boolean }> = [];

  // Step 1: schema sanity (tables exist with new columns)
  results.push({
    num: 0,
    pass: await step(0, "Schema sanity: organizations.kind, worker_cases.claim_number, partner_user_organizations exist", async () => {
      const cols = await db.execute(sql`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE (table_name = 'organizations' AND column_name = 'kind')
           OR (table_name = 'worker_cases' AND column_name = 'claim_number')
        ORDER BY table_name, column_name
      `);
      const t = await db.execute(sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_name = 'partner_user_organizations'
      `);
      quote("columns", cols.rows);
      quote("tables", t.rows);
      return cols.rows.length === 2 && t.rows.length === 1;
    }),
  });

  // Step 2: seed counts
  results.push({
    num: 1,
    pass: await step(1, "Seed: 3 partner-tier orgs + 2 partner users + 3 access grants + ≥2 cases per Alpine company", async () => {
      const orgs = await db.select().from(organizations).where(
        inArray(organizations.id, [PARTNER_ORG_ID, ALPINE_HEALTH_ID, ALPINE_MDF_ID])
      );
      const partners = await db.select().from(users).where(eq(users.role, "partner"));
      const grants = await db.select().from(partnerUserOrganizations);
      const ahCases = await db.select().from(workerCases).where(eq(workerCases.organizationId, ALPINE_HEALTH_ID));
      const mdfCases = await db.select().from(workerCases).where(eq(workerCases.organizationId, ALPINE_MDF_ID));
      quote("orgs", orgs.map((o) => `${o.id}:${o.kind}`));
      quote("partner users", partners.map((p) => p.email));
      quote("grants", grants.map((g) => `${g.userId}→${g.organizationId}`));
      quote("alpine-health cases", ahCases.length);
      quote("alpine-mdf cases", mdfCases.length);
      return orgs.length === 3 && partners.length === 2 && grants.length === 3 && ahCases.length >= 2 && mdfCases.length >= 2;
    }),
  });

  // Mint live JWTs for the API tests via login.
  let primaryToken = "";
  let primaryUserId = "";
  let scopedToken = "";

  await step(2, "Login (POST /api/auth/login) — partner user gets JWT and message indicates partner redirect path", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: PRIMARY_EMAIL, password: PASSWORD }),
    });
    quote("status", res.status);
    if (!res.ok) {
      const body = await res.text();
      quote("body", body);
      return false;
    }
    const body = await res.json();
    quote("user.role", body.data?.user?.role);
    const cookie = res.headers.get("set-cookie") ?? "";
    const match = cookie.match(/accessToken=([^;]+)/);
    if (match) {
      primaryToken = match[1];
      primaryUserId = body.data?.user?.id ?? "";
      quote("accessToken length", primaryToken.length);
    }
    return body.data?.user?.role === "partner" && primaryToken.length > 0;
  });

  // Login the scoped user too.
  await step(3, "Login scoped partner user", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: SCOPED_EMAIL, password: PASSWORD }),
    });
    if (!res.ok) {
      quote("status", res.status);
      return false;
    }
    const cookie = res.headers.get("set-cookie") ?? "";
    const match = cookie.match(/accessToken=([^;]+)/);
    if (match) scopedToken = match[1];
    quote("status", res.status);
    return scopedToken.length > 0;
  });

  // Verification step 1: /api/partner/clients shows scoped user only Alpine Health.
  results.push({
    num: 5,
    pass: await step(5, "Verification #5 — Scoped user GET /api/partner/clients returns Alpine Health only (no Alpine MDF)", async () => {
      const res = await fetchWithToken("/api/partner/clients", { token: scopedToken });
      quote("status", res.status);
      const body = await res.json();
      quote("clients", body.clients?.map((c: any) => `${c.id}:${c.name}`));
      const ids = (body.clients ?? []).map((c: any) => c.id);
      return res.ok && ids.includes(ALPINE_HEALTH_ID) && !ids.includes(ALPINE_MDF_ID);
    }),
  });

  // Primary user should see both clients.
  results.push({
    num: 1,
    pass: await step(1.5, "Verification #1 — Primary user GET /api/partner/clients returns BOTH clients", async () => {
      const res = await fetchWithToken("/api/partner/clients", { token: primaryToken });
      quote("status", res.status);
      const body = await res.json();
      quote("clients", body.clients?.map((c: any) => `${c.id}:${c.name}:open=${c.openCaseCount}`));
      const ids = (body.clients ?? []).map((c: any) => c.id);
      return res.ok && ids.includes(ALPINE_HEALTH_ID) && ids.includes(ALPINE_MDF_ID);
    }),
  });

  // Verification step 5 (negative): scoped user POST active-org with Alpine MDF id → 403
  results.push({
    num: 5,
    pass: await step(5, "Verification #5 (negative) — Scoped user POST /api/partner/active-org with Alpine MDF id → 403", async () => {
      // Need CSRF token for state-changing endpoints — fetch one first.
      const csrfRes = await fetchWithToken("/api/csrf-token", { token: scopedToken });
      const csrfBody = await csrfRes.json();
      const csrfToken = csrfBody.csrfToken;
      const cookie = `accessToken=${scopedToken}`;
      const res = await fetch(`${BASE_URL}/api/partner/active-org`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
          Cookie: cookie + (csrfRes.headers.get("set-cookie") ? `; ${csrfRes.headers.get("set-cookie")}` : ""),
        },
        body: JSON.stringify({ organizationId: ALPINE_MDF_ID }),
      });
      quote("status", res.status);
      const body = await res.text();
      quote("body", body.slice(0, 200));
      return res.status === 403;
    }),
  });

  // Verification step 6: case-write endpoint with no activeOrganizationId → 403
  // For partner role with activeOrganizationId=null, requireActiveOrganization should 403.
  // Use a route that uses requireActiveOrganization in partner.ts: /api/partner/me works either way (returns null activeOrg).
  // But cases endpoint should reject. Try /api/gpnet2/cases instead.
  results.push({
    num: 6,
    pass: await step(6, "Verification #6 — Partner with no active org GET /api/gpnet2/cases → 403", async () => {
      // Mint a partner token with activeOrganizationId=null
      const noActiveToken = generateAccessToken({
        id: primaryUserId,
        email: PRIMARY_EMAIL,
        role: "partner" as const,
        organizationId: PARTNER_ORG_ID,
      } as any, null);
      const res = await fetchWithToken("/api/gpnet2/cases", { token: noActiveToken });
      quote("status", res.status);
      const body = await res.text();
      quote("body", body.slice(0, 200));
      return res.status === 403;
    }),
  });

  // Verification step 4: after picking Alpine Health, /api/gpnet2/cases returns Alpine Health cases only.
  results.push({
    num: 4,
    pass: await step(4, "Verification #4 — Partner with active=Alpine Health GET /api/gpnet2/cases scoped to Alpine Health", async () => {
      const activeToken = generateAccessToken({
        id: primaryUserId,
        email: PRIMARY_EMAIL,
        role: "partner" as const,
        organizationId: PARTNER_ORG_ID,
      } as any, ALPINE_HEALTH_ID);
      const res = await fetchWithToken("/api/gpnet2/cases", { token: activeToken });
      quote("status", res.status);
      if (!res.ok) {
        const body = await res.text();
        quote("body", body.slice(0, 200));
        return false;
      }
      const body = await res.json();
      const cases = Array.isArray(body) ? body : body.cases ?? body.data ?? [];
      const orgIds = new Set(cases.map((c: any) => c.organizationId));
      quote("count", cases.length);
      quote("distinct organizationIds in response", Array.from(orgIds));
      return cases.length > 0 && orgIds.size === 1 && orgIds.has(ALPINE_HEALTH_ID);
    }),
  });

  // Verification step 11: change-password works.
  results.push({
    num: 11,
    pass: await step(11, "Verification #11 — POST /api/auth/change-password rotates password (then reverted)", async () => {
      const csrfRes = await fetchWithToken("/api/csrf-token", { token: primaryToken });
      const csrfBody = await csrfRes.json();
      const csrfToken = csrfBody.csrfToken;
      const cookieFromCsrf = csrfRes.headers.get("set-cookie");
      const cookie = `accessToken=${primaryToken}` + (cookieFromCsrf ? `; ${cookieFromCsrf}` : "");
      const newPassword = "WorkBetter456!";
      const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
          Cookie: cookie,
        },
        body: JSON.stringify({ currentPassword: PASSWORD, newPassword }),
      });
      quote("change status", res.status);
      if (!res.ok) {
        const body = await res.text();
        quote("body", body.slice(0, 200));
        return false;
      }
      // Try logging in with new password.
      const loginNew = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: PRIMARY_EMAIL, password: newPassword }),
      });
      quote("login-with-new", loginNew.status);
      // Try old password — should fail.
      const loginOld = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: PRIMARY_EMAIL, password: PASSWORD }),
      });
      quote("login-with-old", loginOld.status);
      // Restore original via direct DB update so other steps and re-runs continue working.
      const newHash = await bcrypt.hash(PASSWORD, 10);
      await db.update(users).set({ password: newHash }).where(eq(users.email, PRIMARY_EMAIL));
      console.log("  (password reverted via direct DB update for re-runnability)");
      return loginNew.ok && loginOld.status === 401;
    }),
  });

  // Verification step 8: existing GPNet employer login still works.
  results.push({
    num: 8,
    pass: await step(8, "Verification #8 — Existing GPNet employer login unaffected", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "employer@symmetry.local", password: "ChangeMe123!" }),
      });
      quote("status", res.status);
      if (!res.ok) {
        // Maybe seed not run; that's fine — this is a regression check, fail soft.
        const body = await res.text();
        quote("body (likely needs `npm run seed`)", body.slice(0, 200));
        return false;
      }
      const body = await res.json();
      quote("role", body.data?.user?.role);
      return body.data?.user?.role === "employer";
    }),
  });

  console.log("\n=== Summary ===");
  const passed = results.filter((r) => r.pass).length;
  console.log(`Passed: ${passed}/${results.length}`);
  if (passed < results.length) process.exitCode = 1;
}

main()
  .then(async () => {
    await pool.end();
    process.exit(process.exitCode ?? 0);
  })
  .catch(async (err) => {
    console.error("Verification failed:", err);
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  });
