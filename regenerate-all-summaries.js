// Regenerate all AI summaries with new Sonnet model and improved prompt
import 'dotenv/config';
import { storage } from './server/storage.ts';
import { summaryService } from './server/services/summary.ts';

async function regenerateAllSummaries() {
  console.log('🔄 Starting summary regeneration for all cases...\n');

  try {
    // Get all cases using pagination (admin mode: organizationId = undefined)
    const limit = 1000;
    const result = await storage.getGPNet2CasesPaginated(undefined, 1, limit);
    const cases = result.cases;
    console.log(`📋 Found ${cases.length} cases to process (${result.total} total)\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < cases.length; i++) {
      const workerCase = cases[i];
      const progress = `[${i + 1}/${cases.length}]`;

      console.log(`${progress} Processing: ${workerCase.workerName} (${workerCase.id})`);

      try {
        // Check if case has any discussion notes or content to summarize
        if (!workerCase.summary || workerCase.summary.length < 50) {
          console.log(`  ⏭️  Skipped - insufficient data`);
          skippedCount++;
          continue;
        }

        // Generate new summary
        const result = await summaryService.generateCaseSummary(workerCase);

        // Store in database
        await storage.updateAISummary(
          workerCase.id,
          workerCase.organizationId,
          result.summary,
          summaryService.model,
          result.workStatusClassification
        );

        // Note: Not creating action items in bulk regeneration to avoid duplicates
        // Action items will be created when users view the case next time

        console.log(`  ✅ Generated (${result.actionItems.length} actions identified)`);
        successCount++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary Regeneration Complete');
    console.log('='.repeat(60));
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors:  ${errorCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`📝 Total:   ${cases.length}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  }
}

// Run the regeneration
regenerateAllSummaries()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Unexpected error:', err);
    process.exit(1);
  });
