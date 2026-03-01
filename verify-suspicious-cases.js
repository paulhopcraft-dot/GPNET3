/**
 * Verify Suspicious Cases
 * Checks the 2 suspicious cases identified in date quality analysis
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Whc@0102030405@localhost:5432/gpnet'
});

async function verifySuspiciousCases() {
  await client.connect();
  console.log('🔍 Verifying suspicious cases...\n');

  try {
    const suspiciousCaseIds = ['FD-46945', 'FD-46944'];

    for (const caseId of suspiciousCaseIds) {
      const result = await client.query(
        'SELECT * FROM worker_cases WHERE id = $1',
        [caseId]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Case ${caseId} not found\n`);
        continue;
      }

      const c = result.rows[0];
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Case ID: ${c.id}`);
      console.log(`Worker: ${c.worker_name}`);
      console.log(`Employer: ${c.employer_company || 'N/A'}`);
      console.log(`Date of Injury: ${c.date_of_injury}`);
      console.log(`Created: ${c.created_at}`);
      console.log(`Updated: ${c.updated_at}`);
      console.log(`Status: ${c.case_status || 'N/A'}`);
      console.log(`Work Status: ${c.work_status || 'N/A'}`);
      console.log(`Tickets: ${c.ticket_ids ? c.ticket_ids.join(', ') : 'none'}`);
      console.log('\nCase Summary:');
      console.log(c.case_summary ? c.case_summary.substring(0, 300) + '...' : 'No summary');

      // Check if this looks like a legitimate case
      const isLegitimate = c.worker_name &&
                          c.worker_name !== 'Work Period' &&
                          c.worker_name !== 'Adjustment Request' &&
                          c.employer_company;

      console.log(`\n${isLegitimate ? '✅ Appears legitimate' : '⚠️  May not be a worker injury case'}`);
      console.log('═══════════════════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

verifySuspiciousCases();
