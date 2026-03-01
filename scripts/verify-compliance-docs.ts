import "dotenv/config";
import { storage } from '../server/storage';

async function verifyComplianceDocs() {
  console.log('🔍 Verifying compliance documents...\n');

  const sections = ['s37', 's38', 's41', 's99', 's155-165', 'reg224'];

  for (const sectionId of sections) {
    const doc = await storage.getComplianceDocumentBySection('wirc_act', sectionId);
    if (doc) {
      console.log(`✅ ${doc.sectionId}: ${doc.title}`);
      console.log(`   ${doc.content.substring(0, 100)}...`);
      console.log(`   Reference: ${doc.fullReference}\n`);
    } else {
      console.log(`❌ ${sectionId}: NOT FOUND\n`);
    }
  }
}

verifyComplianceDocs()
  .then(() => {
    console.log('✨ Verification complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Error:', err);
    process.exit(1);
  });
