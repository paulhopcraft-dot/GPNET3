const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Get all Jacob Gunn cases and their certificates
    const result = await pool.query(`
      SELECT wc.id as case_id, wc.worker_name, wc.date_of_injury,
             mc.id as cert_id, mc.start_date, mc.end_date, mc.capacity,
             CASE WHEN mc.document_url IS NOT NULL AND mc.document_url != '' THEN 'HAS_IMAGE' ELSE 'NO_IMAGE' END as has_image
      FROM worker_cases wc
      LEFT JOIN medical_certificates mc ON wc.id = mc.case_id
      WHERE wc.worker_name ILIKE '%jacob%gunn%'
      ORDER BY wc.date_of_injury DESC, mc.start_date DESC
    `);

    console.log('Jacob Gunn cases and certificates:');
    let currentCase = '';
    result.rows.forEach(r => {
      if (r.case_id !== currentCase) {
        currentCase = r.case_id;
        const injuryDate = r.date_of_injury ? r.date_of_injury.toISOString().split('T')[0] : 'unknown';
        console.log(`\n${r.case_id} - ${r.worker_name} (injury: ${injuryDate})`);
      }
      if (r.cert_id) {
        const startDate = r.start_date ? r.start_date.toISOString().split('T')[0] : 'null';
        const endDate = r.end_date ? r.end_date.toISOString().split('T')[0] : 'null';
        console.log(`  Cert: ${startDate} - ${endDate} | ${r.capacity} | ${r.has_image}`);
      } else {
        console.log('  No certificates');
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
