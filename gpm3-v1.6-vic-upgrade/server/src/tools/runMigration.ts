import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

async function main() {
  const sqlPath = join(process.cwd(), 'migrations', '0001_init.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[gpm3] migration applied');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[gpm3] migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
