// One-off migration runner. Reads a SQL file and executes it on DATABASE_URL.
// Usage: tsx scripts/apply-migration.ts <relative-path-to-sql>
import "dotenv/config";
import { readFileSync } from "fs";
import { Pool } from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: tsx scripts/apply-migration.ts <sql-file>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    console.log(`[apply-migration] Running ${file} ...`);
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`[apply-migration] OK — committed.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[apply-migration] FAILED — rolled back.");
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
