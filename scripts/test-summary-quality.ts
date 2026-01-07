/**
 * Test improved AI summary quality on a specific case
 */

import "dotenv/config";
import { storage } from '../server/storage';
import { SummaryService } from '../server/services/summary';

const workerName = process.argv[2] || 'Ava Thompson';
const orgId = process.argv[3] || 'org-alpha'; // Default to Symmetry Manufacturing

async function testSummaryQuality() {
  console.log(`🔍 Testing improved summary for: ${workerName} (${orgId})\n`);

  try {
    // Find the case
    const cases = await storage.getGPNet2Cases(orgId);
    const workerCase = cases.find(c => c.workerName.toLowerCase().includes(workerName.toLowerCase()));

    if (!workerCase) {
      console.error(`❌ Case not found for worker: ${workerName}`);
      process.exit(1);
    }

    console.log(`📋 Case Found:`);
    console.log(`   Worker: ${workerCase.workerName}`);
    console.log(`   Company: ${workerCase.company}`);
    console.log(`   Status: ${workerCase.currentStatus}`);
    console.log(`   Claim: ${workerCase.claimNumber || 'N/A'}`);
    console.log('');

    // Show old summary if exists
    if (workerCase.aiGeneratedSummary) {
      console.log('📝 OLD SUMMARY:');
      console.log('='.repeat(80));
      console.log(workerCase.aiGeneratedSummary);
      console.log('='.repeat(80));
      console.log('');
    }

    // Generate new summary
    console.log('⚙️  Generating NEW summary with improved prompt...\n');

    const summaryService = new SummaryService();
    const result = await summaryService.generateCaseSummary(workerCase.id);

    console.log('✅ NEW SUMMARY:');
    console.log('='.repeat(80));
    console.log(result.summary);
    console.log('='.repeat(80));
    console.log('');

    console.log('📊 Extracted Data:');
    console.log(`   Work Status Classification: ${result.workStatusClassification}`);
    console.log(`   Model Used: ${result.model}`);
    console.log(`   Action Items Extracted: ${result.actionItems?.length || 0}`);

    if (result.actionItems && result.actionItems.length > 0) {
      console.log('\n🎯 Action Items:');
      result.actionItems.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.description}`);
        if (item.assignedTo) console.log(`      WHO: ${item.assignedTo}`);
        if (item.dueDate) console.log(`      BY WHEN: ${item.dueDate}`);
      });
    }

    console.log('\n✨ Summary successfully generated and saved!');

  } catch (error) {
    const err = error as Error;
    console.error('💥 Error:', err.message);
    if (err.message.includes('ANTHROPIC_API_KEY')) {
      console.error('\n⚠️  Please set ANTHROPIC_API_KEY in your .env file');
    }
    process.exit(1);
  }
}

testSummaryQuality()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
