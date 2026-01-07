/**
 * Check employer account setup and case visibility
 */

import "dotenv/config";
import { db } from '../server/db';
import { users, workerCases } from '../shared/schema';
import { eq, ilike } from 'drizzle-orm';

async function checkSetup() {
  console.log('\n🔍 Checking employer setup...\n');

  // Check employer user
  const [employer] = await db.select()
    .from(users)
    .where(eq(users.email, 'employer@test.com'))
    .limit(1);

  if (!employer) {
    console.error('❌ Employer user not found');
    process.exit(1);
  }

  console.log('👤 Employer Account:');
  console.log(`   Email: ${employer.email}`);
  console.log(`   Role: ${employer.role}`);
  console.log(`   Organization: ${employer.organizationId}\n`);

  // Check Jacob Gunn cases
  const jacobCases = await db.select()
    .from(workerCases)
    .where(ilike(workerCases.workerName, '%Jacob Gunn%'));

  console.log(`📋 Jacob Gunn Cases (${jacobCases.length}):`);
  jacobCases.forEach(c => {
    console.log(`   - ${c.workerName} (${c.company || 'N/A'}) - Org: ${c.organizationId}`);
  });

  // Check all cases for employer's organization
  const orgCases = await db.select()
    .from(workerCases)
    .where(eq(workerCases.organizationId, employer.organizationId));

  console.log(`\n📊 All Cases for ${employer.organizationId} (${orgCases.length} total):`);
  orgCases.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.workerName} (${c.company || 'N/A'})`);
  });

  process.exit(0);
}

checkSetup().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
