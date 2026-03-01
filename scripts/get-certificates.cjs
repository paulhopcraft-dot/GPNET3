const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Get Jacob Gunn's case IDs
    const casesResult = await pool.query(`
      SELECT id, worker_name
      FROM worker_cases
      WHERE worker_name ILIKE '%jacob%gunn%'
      ORDER BY created_at DESC
    `);

    console.log('Jacob Gunn cases:');
    casesResult.rows.forEach(row => {
      console.log(`  ${row.id} - ${row.worker_name}`);
    });

    if (casesResult.rows.length > 0) {
      const caseId = casesResult.rows[0].id;

      // Get certificates for this case
      const certsResult = await pool.query(`
        SELECT id, issue_date, start_date, end_date, certificate_type, document_url, LENGTH(document_url) as url_len
        FROM medical_certificates
        WHERE case_id = $1
        ORDER BY start_date DESC
      `, [caseId]);

      console.log(`\nCertificates for case ${caseId}:`);
      certsResult.rows.forEach(row => {
        console.log(`  ${row.id} | ${row.start_date?.toISOString().split('T')[0]} - ${row.end_date?.toISOString().split('T')[0]} | ${row.certificate_type} | hasUrl: ${!!row.document_url} (len: ${row.url_len})`);
      });
      console.log(`\nTotal: ${certsResult.rows.length} certificates`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
