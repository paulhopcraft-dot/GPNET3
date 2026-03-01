import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main(): Promise<void> {
  const caseIds = ["FD-46933", "FD-44620", "FD-43714"];

  for (const id of caseIds) {
    const r = await pool.query(
      "SELECT id, worker_name, summary, ai_summary, clinical_status_json FROM worker_cases WHERE id = $1",
      [id]
    );
    if (r.rows.length > 0) {
      const row = r.rows[0];
      console.log(`\n=== ${row.worker_name} (${row.id}) ===`);
      console.log(`  summary: ${(row.summary || "NULL").substring(0, 120)}`);
      console.log(`  ai_summary: ${(row.ai_summary || "NULL").substring(0, 200)}`);
      const clinical = row.clinical_status_json;
      if (clinical) {
        console.log(`  clinical diagnosis: ${JSON.stringify(clinical).substring(0, 200)}`);
      } else {
        console.log(`  clinical_status_json: NULL`);
      }
    }
  }

  await pool.end();
}

main().catch(console.error);
