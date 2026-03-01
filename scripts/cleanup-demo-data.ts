/**
 * Clean up demo scenario data from the database.
 * Run with: npx tsx scripts/cleanup-demo-data.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function cleanup(): Promise<void> {
  console.log("Cleaning up demo scenario data...");

  // Delete email attachments (cascades from case_emails, but be safe)
  const attResult = await db.execute(sql`DELETE FROM email_attachments`);
  console.log(`  Deleted email attachments`);

  // Delete case emails
  const emailResult = await db.execute(sql`DELETE FROM case_emails`);
  console.log(`  Deleted case emails`);

  // Delete discussion notes created from emails
  const noteResult = await db.execute(
    sql`DELETE FROM case_discussion_notes WHERE id LIKE 'email-%'`
  );
  console.log(`  Deleted email-generated discussion notes`);

  // Delete medical certificates created from emails
  const certResult = await db.execute(
    sql`DELETE FROM medical_certificates WHERE source_reference = 'inbound-email'`
  );
  console.log(`  Deleted email-generated certificates`);

  // Delete cases created from demo emails
  const caseResult = await db.execute(
    sql`DELETE FROM worker_cases WHERE summary LIKE 'Created from email:%'`
  );
  console.log(`  Deleted demo-created cases`);

  console.log("\n✅ Cleanup complete!");
  await pool.end();
}

cleanup().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
