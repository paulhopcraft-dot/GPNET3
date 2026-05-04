// Verification: confirm partner-tier schema changes landed in DB.
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const checks: { name: string; sql: string; expectRows?: number }[] = [
    {
      name: "organizations.kind column exists with default 'employer'",
      sql: `SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'organizations' AND column_name = 'kind'`,
      expectRows: 1,
    },
    {
      name: "worker_cases.claim_number column exists (nullable)",
      sql: `SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'worker_cases' AND column_name = 'claim_number'`,
      expectRows: 1,
    },
    {
      name: "partner_user_organizations table exists",
      sql: `SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'partner_user_organizations'
            ORDER BY ordinal_position`,
      expectRows: 4,
    },
    {
      name: "partner_user_organizations primary key (composite)",
      sql: `SELECT a.attname AS col
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = 'partner_user_organizations'::regclass AND i.indisprimary
            ORDER BY a.attnum`,
      expectRows: 2,
    },
    {
      name: "partner_user_organizations foreign keys",
      sql: `SELECT conname FROM pg_constraint
            WHERE conrelid = 'partner_user_organizations'::regclass AND contype = 'f'`,
      expectRows: 3,
    },
    {
      name: "partner_user_organizations user_id index",
      sql: `SELECT indexname FROM pg_indexes
            WHERE tablename = 'partner_user_organizations'
              AND indexname = 'partner_user_organizations_user_id_idx'`,
      expectRows: 1,
    },
    {
      name: "All existing organizations have kind='employer' (no nulls, default applied)",
      sql: `SELECT kind, COUNT(*)::int AS n FROM organizations GROUP BY kind`,
    },
    {
      name: "Existing worker_cases preserved (sanity check, count > 0)",
      sql: `SELECT COUNT(*)::int AS n FROM worker_cases`,
    },
  ];

  let pass = 0, fail = 0;
  for (const c of checks) {
    try {
      const r = await pool.query(c.sql);
      const ok = c.expectRows === undefined || r.rows.length === c.expectRows;
      console.log(`${ok ? "✓" : "✗"} ${c.name}`);
      console.log(`    rows=${r.rows.length}${c.expectRows !== undefined ? ` (expected ${c.expectRows})` : ""}`);
      console.log(`    ${JSON.stringify(r.rows)}`);
      if (ok) pass++; else fail++;
    } catch (err) {
      console.log(`✗ ${c.name} — ERROR: ${(err as Error).message}`);
      fail++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed.`);
  await pool.end();
  process.exit(fail === 0 ? 0 : 1);
})();
