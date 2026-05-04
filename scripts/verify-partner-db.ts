import "dotenv/config";
import { db, pool } from "../server/db";
import { eq, sql, inArray } from "drizzle-orm";
import {
  organizations,
  users,
  partnerUserOrganizations,
  workerCases,
} from "@shared/schema";

/**
 * DB-only verification of partner-tier Slice 1 — does not require dev server.
 * Quotes evidence from schema + seed data.
 */

async function main(): Promise<void> {
  console.log("=== Partner-tier DB verification ===\n");

  // 1. Schema additions present
  console.log("[1] Schema check");
  const cols = await db.execute(sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE (table_name = 'organizations' AND column_name = 'kind')
       OR (table_name = 'worker_cases' AND column_name = 'claim_number')
    ORDER BY table_name, column_name
  `);
  console.log("    new columns:", cols.rows);
  const tbl = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name = 'partner_user_organizations'
  `);
  console.log("    partner_user_organizations table:", tbl.rows);

  // 2. Seed data
  console.log("\n[2] Seed verification");
  const orgs = await db.select().from(organizations).where(
    inArray(organizations.id, ["org-workbetter", "org-alpine-health", "org-alpine-mdf"])
  );
  console.log("    organizations:");
  for (const o of orgs) {
    console.log(`      - ${o.id} | name='${o.name}' | kind='${o.kind}' | logoUrl='${o.logoUrl ?? "(null)"}'`);
  }

  const partners = await db.select().from(users).where(eq(users.role, "partner"));
  console.log("    partner users:");
  for (const u of partners) {
    console.log(`      - ${u.email} (id=${u.id}, organizationId=${u.organizationId})`);
  }

  const grants = await db.select().from(partnerUserOrganizations);
  console.log("    partner_user_organizations grants:");
  for (const g of grants) {
    console.log(`      - user=${g.userId} → org=${g.organizationId}`);
  }

  const ahCases = await db.select().from(workerCases).where(eq(workerCases.organizationId, "org-alpine-health"));
  const mdfCases = await db.select().from(workerCases).where(eq(workerCases.organizationId, "org-alpine-mdf"));
  console.log(`    Alpine Health cases: ${ahCases.length}`);
  console.log(`      sample: ${ahCases.slice(0, 3).map((c) => `${c.workerName}:claim=${c.claimNumber ?? "(null)"}`).join(", ")}`);
  console.log(`    Alpine MDF cases:    ${mdfCases.length}`);
  console.log(`      sample: ${mdfCases.slice(0, 3).map((c) => `${c.workerName}:claim=${c.claimNumber ?? "(null)"}`).join(", ")}`);

  // 3. Tenant isolation: confirm scoped user does NOT have grant for Alpine MDF
  console.log("\n[3] Access scoping");
  const scopedGrants = await db.select().from(partnerUserOrganizations).where(
    eq(partnerUserOrganizations.userId, "user-workbetter-scoped")
  );
  console.log(`    Scoped user grant count: ${scopedGrants.length}`);
  console.log(`    Scoped user has Alpine MDF? ${scopedGrants.some((g) => g.organizationId === "org-alpine-mdf")}`);
  console.log(`    Scoped user has Alpine Health? ${scopedGrants.some((g) => g.organizationId === "org-alpine-health")}`);

  // 4. Mix of injury vs preventative cases (claimNumber populated vs null)
  const claimCases = await db.select({ count: sql<number>`count(*)` }).from(workerCases).where(
    inArray(workerCases.organizationId, ["org-alpine-health", "org-alpine-mdf"])
  );
  const withClaim = await db.execute(sql`
    SELECT COUNT(*) FILTER (WHERE claim_number IS NOT NULL) AS injury_cases,
           COUNT(*) FILTER (WHERE claim_number IS NULL) AS preventative_cases
    FROM worker_cases
    WHERE organization_id IN ('org-alpine-health', 'org-alpine-mdf')
  `);
  console.log(`\n[4] Track distribution (claim_number populated = injury, null = preventative):`);
  console.log(`    ${JSON.stringify(withClaim.rows[0])}`);

  await pool.end();
}

main().catch(async (err) => {
  console.error("Verification error:", err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
