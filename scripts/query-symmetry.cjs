const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const result = await pool.query(`
      SELECT worker_name, id
      FROM worker_cases
      WHERE company ILIKE '%symmetry%'
      ORDER BY worker_name
    `);

    console.log('Symmetry workers in database:');
    result.rows.forEach(row => {
      console.log(`${row.worker_name} | ${row.id}`);
    });
    console.log(`\nTotal: ${result.rows.length} workers`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
