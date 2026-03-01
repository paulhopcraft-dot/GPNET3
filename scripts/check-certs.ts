import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main(): Promise<void> {
  const caseId = process.argv[2] || "FD-46933";
  console.log(`\nCertificates for case ${caseId}:\n`);

  const rows = await db.execute(
    sql`SELECT id, capacity, issue_date, start_date, end_date, source_reference, treating_practitioner
        FROM medical_certificates
        WHERE case_id = ${caseId}
        ORDER BY issue_date ASC`
  );

  for (const r of rows.rows as any[]) {
    const fmt = (d: any) => d ? new Date(d).toISOString().substring(0, 10) : "null";
    console.log(
      `  ${fmt(r.issue_date)} | ${fmt(r.start_date)} - ${fmt(r.end_date)} | ${String(r.capacity).padEnd(8)} | ${r.source_reference?.padEnd(15) || "N/A"} | ${r.treating_practitioner?.substring(0, 30) || "N/A"}`
    );
  }
  console.log(`\nTotal: ${rows.rows.length} certificates`);

  // Also show the case's date_of_injury
  const caseRows = await db.execute(
    sql`SELECT date_of_injury, worker_name FROM worker_cases WHERE id = ${caseId}`
  );
  if (caseRows.rows.length > 0) {
    const c = caseRows.rows[0] as any;
    console.log(`\nCase: ${c.worker_name}, Date of Injury: ${c.date_of_injury}`);
  }

  await pool.end();
}

main().catch(console.error);
