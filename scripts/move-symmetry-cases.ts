/**
 * Move all Symmetry company cases to org-alpha
 */

import "dotenv/config";
import { db } from '../server/db';
import { workerCases } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function moveSymmetryCases() {
  console.log('\n🔄 Moving all Symmetry cases to org-alpha...\n');

  // Update all cases where company contains "Symmetry"
  const updated = await db.update(workerCases)
    .set({
      organizationId: 'org-alpha',
      company: 'Symmetry' // Also standardize company name
    })
    .where(sql`${workerCases.company} ILIKE '%symmetry%'`)
    .returning();

  console.log(`✅ Moved ${updated.length} Symmetry cases to org-alpha\n`);

  // Show summary
  console.log('📋 Updated cases:');
  updated.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.workerName}`);
  });

  console.log(`\n✨ All Symmetry cases now visible to employer@test.com!\n`);

  process.exit(0);
}

moveSymmetryCases().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
