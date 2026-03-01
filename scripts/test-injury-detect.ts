import "dotenv/config";
import { Pool } from "pg";
import { extractInjuryType } from "../server/services/recoveryEstimator";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main(): Promise<void> {
  const caseIds = ["FD-46933", "FD-44620", "FD-43714"];

  for (const id of caseIds) {
    const r = await pool.query(
      "SELECT id, worker_name, summary, ai_summary FROM worker_cases WHERE id = $1",
      [id]
    );
    if (r.rows.length > 0) {
      const row = r.rows[0];
      const summaryOnly = extractInjuryType(row.summary || "");
      const aiSummaryResult = extractInjuryType(row.ai_summary || "");
      const combined = extractInjuryType((row.ai_summary || "") + " " + (row.summary || ""));

      console.log(`\n=== ${row.worker_name} (${row.id}) ===`);
      console.log(`  summary field detection:    ${summaryOnly}`);
      console.log(`  aiSummary field detection:  ${aiSummaryResult}`);
      console.log(`  combined detection:         ${combined}`);
    }
  }

  await pool.end();
}

main().catch(console.error);
