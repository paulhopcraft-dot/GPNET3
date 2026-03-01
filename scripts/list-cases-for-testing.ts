/**
 * List available cases for testing summaries
 */

import "dotenv/config";
import { storage } from '../server/storage';

// Default to org-alpha (Symmetry Manufacturing) or pass org ID as argument
const orgId = process.argv[2] || 'org-alpha';

async function listCases() {
  console.log(`📋 Available Cases for Testing (${orgId}):\n`);

  try {
    const cases = await storage.getGPNet2Cases(orgId);

    console.log(`Total cases: ${cases.length}\n`);

    cases.slice(0, 20).forEach((c, i) => {
      console.log(`${i + 1}. ${c.workerName}`);
      console.log(`   Company: ${c.company || 'N/A'}`);
      console.log(`   Status: ${c.currentStatus || 'N/A'}`);
      console.log(`   Has Summary: ${c.aiGeneratedSummary ? 'Yes' : 'No'}`);
      console.log('');
    });

    if (cases.length > 20) {
      console.log(`... and ${cases.length - 20} more cases`);
    }

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

listCases()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
