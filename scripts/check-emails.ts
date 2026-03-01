import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main(): Promise<void> {
  // Count emails by case
  const r1 = await pool.query(
    "SELECT case_id, COUNT(*) as cnt FROM case_emails GROUP BY case_id ORDER BY cnt DESC"
  );
  console.log("\nEmails by case_id:");
  for (const row of r1.rows) {
    console.log(`  ${row.case_id || "NULL"}: ${row.cnt} emails`);
  }

  // Show distinct subjects for emails without case_id
  const r2 = await pool.query(
    "SELECT subject, processing_status, from_email FROM case_emails WHERE case_id IS NULL LIMIT 10"
  );
  if (r2.rows.length > 0) {
    console.log("\nUnmatched emails:");
    for (const row of r2.rows) {
      console.log(`  [${row.processing_status}] ${row.from_email} - ${row.subject}`);
    }
  }

  // Show all worker cases
  const r3 = await pool.query(
    "SELECT id, worker_name, date_of_injury FROM worker_cases ORDER BY id"
  );
  console.log("\nAll worker cases:");
  for (const row of r3.rows) {
    console.log(`  ${row.id} | ${row.worker_name} | ${row.date_of_injury}`);
  }

  await pool.end();
}

main().catch(console.error);
