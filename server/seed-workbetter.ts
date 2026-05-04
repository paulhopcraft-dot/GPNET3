import "dotenv/config";
import bcrypt from "bcrypt";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "./db";
import {
  organizations,
  users,
  partnerUserOrganizations,
  workerCases,
} from "@shared/schema";

/**
 * Inline migration SQL — equivalent to migrations/0011_add_partner_tier.sql.
 * Embedded here so seed-workbetter is self-contained and survives Docker
 * builds that don't copy migrations/. Idempotent (uses IF NOT EXISTS).
 */
const PARTNER_TIER_MIGRATION_SQL = `
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'employer' NOT NULL;

ALTER TABLE "worker_cases"
  ADD COLUMN IF NOT EXISTS "claim_number" text;

CREATE TABLE IF NOT EXISTS "partner_user_organizations" (
  "user_id" varchar NOT NULL,
  "organization_id" varchar NOT NULL,
  "granted_at" timestamp DEFAULT now() NOT NULL,
  "granted_by" varchar,
  CONSTRAINT "partner_user_organizations_user_id_organization_id_pk" PRIMARY KEY ("user_id", "organization_id"),
  CONSTRAINT "partner_user_organizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "partner_user_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "partner_user_organizations_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "partner_user_organizations_user_id_idx"
  ON "partner_user_organizations" USING btree ("user_id");
`;

/**
 * Inline migration SQL — equivalent to migrations/0012_partner_client_setup.sql.
 * Slice 2: rich client metadata (insurer, address, contacts, notification emails)
 * so partner users can self-onboard new clients without engineering. All columns
 * nullable. Idempotent.
 */
const PARTNER_CLIENT_SETUP_MIGRATION_SQL = `
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "abn" varchar(11),
  ADD COLUMN IF NOT EXISTS "worksafe_state" text,
  ADD COLUMN IF NOT EXISTS "policy_number" text,
  ADD COLUMN IF NOT EXISTS "wic_code" varchar(20),
  ADD COLUMN IF NOT EXISTS "address_line_1" text,
  ADD COLUMN IF NOT EXISTS "address_line_2" text,
  ADD COLUMN IF NOT EXISTS "suburb" text,
  ADD COLUMN IF NOT EXISTS "state" text,
  ADD COLUMN IF NOT EXISTS "postcode" varchar(4),
  ADD COLUMN IF NOT EXISTS "insurer_claim_contact_email" text,
  ADD COLUMN IF NOT EXISTS "rtw_coordinator_name" text,
  ADD COLUMN IF NOT EXISTS "rtw_coordinator_email" text,
  ADD COLUMN IF NOT EXISTS "rtw_coordinator_phone" varchar(50),
  ADD COLUMN IF NOT EXISTS "hr_contact_name" text,
  ADD COLUMN IF NOT EXISTS "hr_contact_email" text,
  ADD COLUMN IF NOT EXISTS "hr_contact_phone" varchar(50),
  ADD COLUMN IF NOT EXISTS "notification_emails" text,
  ADD COLUMN IF NOT EXISTS "employee_count" text,
  ADD COLUMN IF NOT EXISTS "notes" text;
`;

/**
 * WorkBetter partner-tier seed (Tasks F + G in PLAN.md).
 *
 * Creates:
 *   - WorkBetter (kind=partner)
 *   - Alpine Health (kind=employer)
 *   - Alpine MDF (kind=employer)
 *   - workbetter@workbetter.com.au           — primary partner user, access to BOTH clients
 *   - workbetter-scoped@workbetter.com.au    — scoped partner user, access to Alpine Health only
 *   - 1 smoke case per Alpine company        (Task F minimal)
 *   - 5 demo workers per Alpine company across pre-employment / injury / preventative tracks (Task G)
 *
 * Idempotent: deletes prior partner-tier seed rows by stable IDs before re-inserting.
 *
 * Usage:
 *   npm run seed:workbetter            # full seed (F + G)
 *   npm run seed:workbetter -- --minimal   # F only (skip demo workers)
 */

const PARTNER_ORG_ID = "org-workbetter";
const ALPINE_HEALTH_ID = "org-alpine-health";
const ALPINE_MDF_ID = "org-alpine-mdf";

const PRIMARY_PARTNER_USER_ID = "user-workbetter-primary";
const SCOPED_PARTNER_USER_ID = "user-workbetter-scoped";

const ALPINE_COMPANIES = [
  { id: ALPINE_HEALTH_ID, name: "Alpine Health" },
  { id: ALPINE_MDF_ID, name: "Alpine MDF" },
] as const;

interface DemoCase {
  id: string;
  organizationId: string;
  workerName: string;
  company: string;
  track: "pre-employment" | "injury" | "preventative";
  claimNumber: string | null;
  daysAgo: number;
  riskLevel: "High" | "Medium" | "Low";
  workStatus: "At work" | "Off work";
  currentStatus: string;
  nextStep: string;
}

function buildDemoCases(): DemoCase[] {
  const cases: DemoCase[] = [];
  for (const company of ALPINE_COMPANIES) {
    // 2 pre-employment, 2 injury, 1 preventative per company = 5 workers
    cases.push({
      id: `case-${company.id}-pre-1`,
      organizationId: company.id,
      workerName: `${company.name} Pre-Hire 1`,
      company: company.name,
      track: "pre-employment",
      claimNumber: null,
      daysAgo: 5,
      riskLevel: "Low",
      workStatus: "At work",
      currentStatus: "Pre-employment medical pending",
      nextStep: "Collect questionnaire response",
    });
    cases.push({
      id: `case-${company.id}-pre-2`,
      organizationId: company.id,
      workerName: `${company.name} Pre-Hire 2`,
      company: company.name,
      track: "pre-employment",
      claimNumber: null,
      daysAgo: 12,
      riskLevel: "Medium",
      workStatus: "At work",
      currentStatus: "GP review of pre-employment forms",
      nextStep: "Receive doctor sign-off",
    });
    cases.push({
      id: `case-${company.id}-injury-1`,
      organizationId: company.id,
      workerName: `${company.name} Injured Worker A`,
      company: company.name,
      track: "injury",
      claimNumber: `WC-${company.id.slice(-6).toUpperCase()}-001`,
      daysAgo: 30,
      riskLevel: "High",
      workStatus: "Off work",
      currentStatus: "Off work post-injury, awaiting RTW plan",
      nextStep: "Schedule occupational physician review",
    });
    cases.push({
      id: `case-${company.id}-injury-2`,
      organizationId: company.id,
      workerName: `${company.name} Injured Worker B`,
      company: company.name,
      track: "injury",
      claimNumber: `WC-${company.id.slice(-6).toUpperCase()}-002`,
      daysAgo: 60,
      riskLevel: "Medium",
      workStatus: "At work",
      currentStatus: "On modified duties — graded RTW",
      nextStep: "Review week-4 progress",
    });
    cases.push({
      id: `case-${company.id}-prev-1`,
      organizationId: company.id,
      workerName: `${company.name} Wellness Worker`,
      company: company.name,
      track: "preventative",
      claimNumber: null,
      daysAgo: 7,
      riskLevel: "Low",
      workStatus: "At work",
      currentStatus: "Annual preventative check scheduled",
      nextStep: "Worker to complete wellness questionnaire",
    });
  }
  return cases;
}

async function seed(): Promise<void> {
  const minimalOnly = process.argv.includes("--minimal");

  console.log("[seed-workbetter] Starting partner-tier seed...");
  if (minimalOnly) console.log("[seed-workbetter] --minimal mode: skipping demo workers (Task G)");

  // Step 0 — apply migrations inline so seed is self-contained.
  // Idempotent (IF NOT EXISTS); safe to run on every invocation.
  console.log("[seed-workbetter] Applying partner-tier migration 0011 (idempotent)...");
  await db.execute(sql.raw(PARTNER_TIER_MIGRATION_SQL));
  console.log("[seed-workbetter] Applying partner-client-setup migration 0012 (idempotent)...");
  await db.execute(sql.raw(PARTNER_CLIENT_SETUP_MIGRATION_SQL));
  console.log("[seed-workbetter] Migrations applied.");

  // Idempotency: clean up any prior partner-tier seed rows by stable IDs.
  // Order matters because of FKs.
  console.log("[seed-workbetter] Cleaning prior partner-tier seed rows...");
  await db.delete(workerCases).where(
    inArray(workerCases.organizationId, [ALPINE_HEALTH_ID, ALPINE_MDF_ID])
  );
  await db.delete(partnerUserOrganizations).where(
    inArray(partnerUserOrganizations.userId, [PRIMARY_PARTNER_USER_ID, SCOPED_PARTNER_USER_ID])
  );
  await db.delete(users).where(
    inArray(users.id, [PRIMARY_PARTNER_USER_ID, SCOPED_PARTNER_USER_ID])
  );
  await db.delete(organizations).where(
    inArray(organizations.id, [PARTNER_ORG_ID, ALPINE_HEALTH_ID, ALPINE_MDF_ID])
  );

  console.log("[seed-workbetter] Inserting organizations...");
  await db.insert(organizations).values([
    {
      id: PARTNER_ORG_ID,
      name: "WorkBetter",
      slug: "workbetter",
      kind: "partner",
      logoUrl: "/assets/workbetter-logo.jpg",
      contactName: "WorkBetter Admin",
      contactEmail: "admin@workbetter.com.au",
      contactPhone: "03 9000 0001",
    },
    {
      id: ALPINE_HEALTH_ID,
      name: "Alpine Health",
      slug: "alpine-health",
      kind: "employer",
      contactName: "Alpine Health HR",
      contactEmail: "hr@alpinehealth.local",
      contactPhone: "03 9000 0002",
    },
    {
      id: ALPINE_MDF_ID,
      name: "Alpine MDF",
      slug: "alpine-mdf",
      kind: "employer",
      contactName: "Alpine MDF HR",
      contactEmail: "hr@alpinemdf.local",
      contactPhone: "03 9000 0003",
    },
  ]);

  const passwordHash = await bcrypt.hash("workbetter123", 10);

  console.log("[seed-workbetter] Inserting partner users...");
  await db.insert(users).values([
    {
      id: PRIMARY_PARTNER_USER_ID,
      organizationId: PARTNER_ORG_ID,
      email: "workbetter@workbetter.com.au",
      password: passwordHash,
      role: "partner",
      subrole: null,
      companyId: null,
      insurerId: null,
    },
    {
      id: SCOPED_PARTNER_USER_ID,
      organizationId: PARTNER_ORG_ID,
      email: "workbetter-scoped@workbetter.com.au",
      password: passwordHash,
      role: "partner",
      subrole: null,
      companyId: null,
      insurerId: null,
    },
  ]);

  console.log("[seed-workbetter] Granting partner user access to client orgs...");
  await db.insert(partnerUserOrganizations).values([
    // Primary user has access to both clients.
    { userId: PRIMARY_PARTNER_USER_ID, organizationId: ALPINE_HEALTH_ID },
    { userId: PRIMARY_PARTNER_USER_ID, organizationId: ALPINE_MDF_ID },
    // Scoped user has access to Alpine Health only — proves access enforcement.
    { userId: SCOPED_PARTNER_USER_ID, organizationId: ALPINE_HEALTH_ID },
  ]);

  // Task F: minimal smoke case per company (one trivial open case).
  console.log("[seed-workbetter] Inserting smoke cases (Task F)...");
  const now = new Date();
  await db.insert(workerCases).values([
    {
      id: `case-${ALPINE_HEALTH_ID}-smoke`,
      organizationId: ALPINE_HEALTH_ID,
      workerName: "Smoke Test Alpine Health",
      company: "Alpine Health",
      dateOfInjury: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      claimNumber: "WC-SMOKE-AH-001",
      riskLevel: "Low",
      workStatus: "At work",
      complianceIndicator: "Low",
      currentStatus: "Smoke test case",
      nextStep: "Verify partner picker can see this case",
      owner: "WorkBetter",
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      summary: "Smoke test case for Alpine Health (partner-tier verification).",
    },
    {
      id: `case-${ALPINE_MDF_ID}-smoke`,
      organizationId: ALPINE_MDF_ID,
      workerName: "Smoke Test Alpine MDF",
      company: "Alpine MDF",
      dateOfInjury: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      claimNumber: null,
      riskLevel: "Low",
      workStatus: "At work",
      complianceIndicator: "Low",
      currentStatus: "Smoke test case (preventative)",
      nextStep: "Verify partner picker can see this case",
      owner: "WorkBetter",
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      summary: "Smoke test preventative case for Alpine MDF.",
    },
  ]);

  // Task G: demo cases — 5 per company across 3 tracks.
  if (!minimalOnly) {
    console.log("[seed-workbetter] Inserting demo cases (Task G)...");
    const demoCases = buildDemoCases();
    await db.insert(workerCases).values(
      demoCases.map((c) => ({
        id: c.id,
        organizationId: c.organizationId,
        workerName: c.workerName,
        company: c.company,
        dateOfInjury: new Date(now.getTime() - c.daysAgo * 24 * 60 * 60 * 1000),
        claimNumber: c.claimNumber,
        riskLevel: c.riskLevel,
        workStatus: c.workStatus,
        complianceIndicator: c.riskLevel,
        currentStatus: c.currentStatus,
        nextStep: c.nextStep,
        owner: "WorkBetter",
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        summary: `${c.track} track demo case for ${c.company}.`,
      }))
    );
  }

  // Quick read-back to confirm.
  const orgRows = await db.select().from(organizations).where(
    inArray(organizations.id, [PARTNER_ORG_ID, ALPINE_HEALTH_ID, ALPINE_MDF_ID])
  );
  const userRows = await db.select().from(users).where(eq(users.role, "partner"));
  const grantRows = await db.select().from(partnerUserOrganizations);
  const caseRows = await db.select().from(workerCases).where(
    inArray(workerCases.organizationId, [ALPINE_HEALTH_ID, ALPINE_MDF_ID])
  );

  console.log("\n[seed-workbetter] Done. Counts:");
  console.log(`  organizations (partner+clients): ${orgRows.length}`);
  console.log(`  partner users:                   ${userRows.length}`);
  console.log(`  partner_user_organizations:      ${grantRows.length}`);
  console.log(`  client cases (Alpine Health/MDF): ${caseRows.length}`);

  console.log("\n[seed-workbetter] Login credentials:");
  console.log("  workbetter@workbetter.com.au         / workbetter123  (full access)");
  console.log("  workbetter-scoped@workbetter.com.au  / workbetter123  (Alpine Health only)");
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[seed-workbetter] Failed:", err);
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  });
