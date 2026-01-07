import "dotenv/config";
import { db } from '../server/db';
import { complianceDocuments } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function listComplianceDocs() {
  console.log('📚 Compliance Documents in Database\n');

  // Get all documents
  const docs = await db.select()
    .from(complianceDocuments)
    .orderBy(complianceDocuments.source, complianceDocuments.sectionId);

  // Group by source
  const grouped = docs.reduce((acc, doc) => {
    if (!acc[doc.source]) {
      acc[doc.source] = [];
    }
    acc[doc.source].push(doc);
    return acc;
  }, {} as Record<string, typeof docs>);

  for (const [source, sourceDocs] of Object.entries(grouped)) {
    console.log(`\n${source.toUpperCase()} (${sourceDocs.length} documents):`);
    console.log('='.repeat(60));
    for (const doc of sourceDocs) {
      console.log(`  ${doc.sectionId}: ${doc.title}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${docs.length} documents`);
}

listComplianceDocs()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
