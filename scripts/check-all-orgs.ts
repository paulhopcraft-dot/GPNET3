/**
 * Check all organizations and their case counts
 */

import "dotenv/config";
import { db } from '../server/db';
import { workerCases } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function checkAllOrgs() {
  console.log('\n🏢 All Organizations and Case Counts:\n');

  // Group by organization
  const orgCounts = await db.select({
    organizationId: workerCases.organizationId,
    count: sql<number>`count(*)::int`,
  })
  .from(workerCases)
  .groupBy(workerCases.organizationId);

  orgCounts.forEach(org => {
    console.log(`   ${org.organizationId}: ${org.count} cases`);
  });

  // Get total
  const total = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(workerCases);

  console.log(`\n   TOTAL: ${total[0].count} cases\n`);

  // Show Symmetry cases from all orgs
  console.log('📋 All Symmetry Company Cases:\n');
  const symmetryCases = await db.select()
    .from(workerCases)
    .where(sql`${workerCases.company} ILIKE '%symmetry%'`);

  console.log(`   Found ${symmetryCases.length} Symmetry cases across all organizations:\n`);
  symmetryCases.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.workerName} - Org: ${c.organizationId} - Company: ${c.company}`);
  });

  process.exit(0);
}

checkAllOrgs().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
