import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main(): Promise<void> {
  const r = await pool.query(
    "SELECT ai_summary FROM worker_cases WHERE id = 'FD-43714'"
  );
  if (r.rows.length > 0) {
    console.log(r.rows[0].ai_summary);
  }
  await pool.end();
}

main().catch(console.error);
