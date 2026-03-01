const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function uploadCertificateImage(workerName, imagePath) {
  try {
    // Find the worker's case
    const casesResult = await pool.query(`
      SELECT id, worker_name
      FROM worker_cases
      WHERE worker_name ILIKE $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [`%${workerName}%`]);

    if (casesResult.rows.length === 0) {
      console.error(`No case found for worker: ${workerName}`);
      return null;
    }

    const caseId = casesResult.rows[0].id;
    console.log(`Found case ${caseId} for ${casesResult.rows[0].worker_name}`);

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.png' ? 'image/png' :
                     ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';

    const base64Data = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Find certificates without document_url for this case
    const certsResult = await pool.query(`
      SELECT id, issue_date, start_date, end_date, capacity, document_url
      FROM medical_certificates
      WHERE case_id = $1
      ORDER BY start_date DESC
    `, [caseId]);

    console.log(`\nFound ${certsResult.rows.length} certificates for case ${caseId}:`);
    certsResult.rows.forEach(cert => {
      const hasUrl = cert.document_url ? 'HAS URL' : 'NO URL';
      console.log(`  ${cert.id} | ${cert.start_date?.toISOString().split('T')[0]} - ${cert.end_date?.toISOString().split('T')[0]} | ${cert.capacity} | ${hasUrl}`);
    });

    // Find the first certificate without a document_url
    const certToUpdate = certsResult.rows.find(c => !c.document_url);

    if (!certToUpdate) {
      console.log('\nNo certificates without document_url found. Creating new certificate...');

      // Create a new certificate
      const today = new Date();
      const insertResult = await pool.query(`
        INSERT INTO medical_certificates (case_id, issue_date, start_date, end_date, capacity, source, document_url, certificate_type)
        VALUES ($1, $2, $2, $3, 'Partial capacity', 'google_drive', $4, 'certificate_of_capacity')
        RETURNING id
      `, [caseId, today, new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), base64Data]);

      console.log(`Created new certificate: ${insertResult.rows[0].id}`);
      return insertResult.rows[0].id;
    }

    // Update the certificate with the image
    await pool.query(`
      UPDATE medical_certificates
      SET document_url = $1, updated_at = NOW()
      WHERE id = $2
    `, [base64Data, certToUpdate.id]);

    console.log(`\nUpdated certificate ${certToUpdate.id} with image`);
    return certToUpdate.id;

  } catch (err) {
    console.error('Error:', err.message);
    return null;
  }
}

async function main() {
  const workerName = process.argv[2] || 'Jacob Gunn';
  const imagePath = process.argv[3] || '.playwright-mcp/1000105111.jpg';

  if (!fs.existsSync(imagePath)) {
    console.error(`Image file not found: ${imagePath}`);
    process.exit(1);
  }

  console.log(`Uploading certificate for ${workerName} from ${imagePath}`);
  await uploadCertificateImage(workerName, imagePath);
  await pool.end();
}

main();
