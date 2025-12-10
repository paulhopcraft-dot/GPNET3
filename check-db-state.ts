import { db } from "./server/db";
import { users, workerCases } from "./shared/schema";
import { isNull, sql } from "drizzle-orm";

async function checkDatabaseState() {
  console.log("=== Checking Database State for Migration 0003 ===\n");

  try {
    // Check NULL organization_id in users
    const nullOrgUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(isNull(users.organizationId));

    console.log(`Users with NULL organization_id: ${nullOrgUsers[0]?.count || 0}`);

    // Check NULL organization_id in worker_cases
    const nullOrgCases = await db
      .select({ count: sql<number>`count(*)` })
      .from(workerCases)
      .where(isNull(workerCases.organizationId));

    console.log(`Worker cases with NULL organization_id: ${nullOrgCases[0]?.count || 0}`);

    // Check for duplicate emails (would violate unique constraint)
    const duplicateEmails = await db
      .select({
        email: users.email,
        count: sql<number>`count(*)`.as('count')
      })
      .from(users)
      .groupBy(users.email)
      .having(sql`count(*) > 1`);

    console.log(`\nDuplicate emails found: ${duplicateEmails.length}`);
    if (duplicateEmails.length > 0) {
      console.log("Duplicate email addresses:");
      duplicateEmails.forEach(({ email, count }) => {
        console.log(`  - ${email}: ${count} occurrences`);
      });
    }

    // Get total counts
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalCases = await db.select({ count: sql<number>`count(*)` }).from(workerCases);

    console.log(`\nTotal users: ${totalUsers[0]?.count || 0}`);
    console.log(`Total worker cases: ${totalCases[0]?.count || 0}`);

    // Check if organizationId column exists
    const columnCheck = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'organization_id'
    `);

    console.log(`\norganization_id column exists in users table: ${columnCheck.rows.length > 0 ? 'YES' : 'NO'}`);

    console.log("\n=== Database State Check Complete ===");
    process.exit(0);
  } catch (error) {
    console.error("Error checking database state:", error);
    process.exit(1);
  }
}

checkDatabaseState();
