require('dotenv').config();
const { Pool } = require('pg');

async function verify() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log('\n🔍 Verifying employer account...\n');

  // Check employer user
  const userRes = await pool.query(
    "SELECT email, role, organization_id, is_active FROM users WHERE email = 'employer@test.com'"
  );

  if (userRes.rows.length === 0) {
    console.log('❌ Employer account NOT FOUND');
    console.log('\nRun this to create: npx tsx scripts/create-employer-user.ts');
    await pool.end();
    return;
  }

  const user = userRes.rows[0];
  console.log('✅ Employer Account Found:');
  console.log('   Email:', user.email);
  console.log('   Role:', user.role);
  console.log('   Organization:', user.organization_id);
  console.log('   Active:', user.is_active);

  // Check cases for org
  const caseRes = await pool.query(
    "SELECT COUNT(*) as count FROM worker_cases WHERE organization_id = $1",
    [user.organization_id]
  );
  console.log('\n📊 Cases for', user.organization_id + ':', caseRes.rows[0].count);

  // Sample cases
  const sampleRes = await pool.query(
    "SELECT worker_name, company, work_status FROM worker_cases WHERE organization_id = $1 LIMIT 5",
    [user.organization_id]
  );
  console.log('\n📋 Sample Cases:');
  sampleRes.rows.forEach((c, i) => {
    console.log(`   ${i+1}. ${c.worker_name} (${c.company || 'N/A'}) - ${c.work_status || 'Unknown'}`);
  });

  await pool.end();
}

verify().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
