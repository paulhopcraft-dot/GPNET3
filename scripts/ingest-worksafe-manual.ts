/**
 * Ingest WorkSafe Claims Manual into compliance_documents table
 *
 * This script:
 * 1. Scrapes key sections from WorkSafe Claims Manual
 * 2. Extracts section content and requirements
 * 3. Stores each section in compliance_documents table
 */

import "dotenv/config";
import { storage } from '../server/storage';

const BASE_URL = 'https://www1.worksafe.vic.gov.au/vwa/claimsmanual';

// WorkSafe Manual sections to scrape
const MANUAL_SECTIONS = [
  {
    sectionId: '1',
    title: 'WorkCover Scheme',
    url: `${BASE_URL}/Content/Section1.htm`,
    description: 'Overview of Victorian WorkCover Scheme, eligibility, and claim types'
  },
  {
    sectionId: '2',
    title: 'Claims Management',
    url: `${BASE_URL}/Content/Section2.htm`,
    description: 'Claim lodgement, certificates, timelines, and case management requirements'
  },
  {
    sectionId: '2.4',
    title: 'Medical Certificates',
    url: `${BASE_URL}/Content/2.4.htm`,
    description: 'Certificate of capacity requirements and validity periods'
  },
  {
    sectionId: '3',
    title: 'Weekly Payments',
    url: `${BASE_URL}/Content/Section3.htm`,
    description: 'Weekly payment calculations, entitlements, and step-down provisions'
  },
  {
    sectionId: '3.4',
    title: 'Payment Step-Down',
    url: `${BASE_URL}/Content/3.4.htm`,
    description: '13-week step-down provisions for weekly payments'
  },
  {
    sectionId: '3.5',
    title: 'Centrelink Clearance',
    url: `${BASE_URL}/Content/3.5.htm`,
    description: 'Centrelink clearance requirements before processing payments'
  },
  {
    sectionId: '4',
    title: 'Medical and Like Services',
    url: `${BASE_URL}/Content/Section4.htm`,
    description: 'Medical treatment entitlements, approvals, and provider requirements'
  },
  {
    sectionId: '5',
    title: 'Return to Work',
    url: `${BASE_URL}/Content/Section5.htm`,
    description: 'RTW obligations, suitable duties, and graduated return processes'
  },
  {
    sectionId: '5.1',
    title: 'File Reviews',
    url: `${BASE_URL}/Content/5.1.htm`,
    description: '8-week file review requirements (WIRC Regulation 224)'
  },
  {
    sectionId: '5.2',
    title: 'Suitable Duties',
    url: `${BASE_URL}/Content/5.2.htm`,
    description: 'Hierarchy of suitable duties and employer obligations'
  },
  {
    sectionId: '5.3',
    title: 'RTW Plans',
    url: `${BASE_URL}/Content/5.3.htm`,
    description: '10-week timeline for developing return to work plans'
  },
  {
    sectionId: '6',
    title: 'Specialised Payments',
    url: `${BASE_URL}/Content/Section6.htm`,
    description: 'Lump sum payments, impairment benefits, and other specialised payments'
  },
  {
    sectionId: '7',
    title: 'Dispute Resolution',
    url: `${BASE_URL}/Content/Section7.htm`,
    description: 'Conciliation, arbitration, and dispute resolution processes'
  }
];

async function ingestWorkSafeManual() {
  console.log('🔄 Ingesting WorkSafe Claims Manual into compliance database...\n');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const section of MANUAL_SECTIONS) {
    try {
      console.log(`  Processing: ${section.sectionId} - ${section.title}`);

      // Check if already exists
      const existing = await storage.getComplianceDocumentBySection('worksafe_manual', section.sectionId);

      if (existing) {
        console.log(`    ⏭️  Already exists, skipping`);
        skippedCount++;
        continue;
      }

      // For now, use placeholder content
      // In the future, we can implement actual web scraping here
      const content = section.description;

      // Insert into database
      await storage.createComplianceDocument({
        source: 'worksafe_manual',
        sectionId: section.sectionId,
        title: section.title,
        content: content,
        fullReference: `WorkSafe Claims Manual Section ${section.sectionId}`,
        url: section.url
      });

      console.log(`    ✅ Ingested successfully`);
      successCount++;

    } catch (err) {
      console.error(`    ❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 WorkSafe Manual Ingestion Complete');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors:  ${errorCount}`);
  console.log(`📝 Total:   ${MANUAL_SECTIONS.length}`);
  console.log('='.repeat(60));
  console.log('\n💡 Note: Currently using placeholder content.');
  console.log('   For full content, implement web scraping in future iteration.');
}

// Run the ingestion
ingestWorkSafeManual()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
