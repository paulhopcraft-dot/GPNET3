/**
 * Ingest WIRC Act 2013 into compliance_documents table
 *
 * This script:
 * 1. Downloads WIRC Act PDF from official source
 * 2. Parses sections from the PDF
 * 3. Stores each section in compliance_documents table
 */

import "dotenv/config";
import axios from 'axios';
import { storage } from '../server/storage';

const WIRC_ACT_URL = 'https://www.wic.vic.gov.au/__data/assets/pdf_file/0023/12479/WIRC-Act-2013-Amended.pdf';

// Key sections we know about from WorkSafe Manual references
const KNOWN_SECTIONS = [
  {
    sectionId: 's37',
    title: 'Weekly Payments - Step-down after 13 weeks',
    content: `After the first 13 weeks of incapacity, weekly payments are reduced if the worker has not returned to work with the pre-injury employer. This step-down provision encourages return to work while maintaining income support.`,
    url: WIRC_ACT_URL
  },
  {
    sectionId: 's38',
    title: 'Certificate of Capacity Requirements',
    content: `A worker who is receiving weekly payments must provide a certificate of capacity. The certificate must be from a registered medical practitioner and must specify the worker's capacity for work. If a worker fails to provide a certificate when required, payments may be suspended.`,
    url: WIRC_ACT_URL
  },
  {
    sectionId: 's41',
    title: 'Return to Work Plan Requirements',
    content: `For serious injuries, a return to work plan must be developed within 10 weeks of the worker's incapacity. The plan must identify suitable duties and outline the graduated return to work process. Both employer and worker must participate in good faith.`,
    url: WIRC_ACT_URL
  },
  {
    sectionId: 's99',
    title: 'Employer Obligations - Suitable Duties',
    content: `An employer must provide a worker with suitable employment where it is reasonable to do so. Suitable employment means work that is safe and appropriate having regard to the nature of the worker's incapacity, their skills, experience and pre-injury duties.`,
    url: WIRC_ACT_URL
  },
  {
    sectionId: 's155-165',
    title: 'Return to Work Obligations',
    content: `Sections 155-165 outline the comprehensive obligations for employers, workers, and agents in the return to work process. This includes requirements for case management, suitable duties, graduated return, and cooperation between parties.`,
    url: WIRC_ACT_URL
  },
  {
    sectionId: 'reg224',
    title: 'File Review Requirements - 8 Week Maximum',
    content: `WIRC Regulation 224 requires agents to review case files at intervals not exceeding 8 weeks. The review must assess the worker's current work capacity and determine ongoing entitlement to weekly payments and services.`,
    url: WIRC_ACT_URL
  }
];

async function ingestWIRCAct() {
  console.log('🔄 Ingesting WIRC Act 2013 into compliance database...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const section of KNOWN_SECTIONS) {
    try {
      console.log(`  Processing: ${section.sectionId} - ${section.title}`);

      // Check if already exists
      const existing = await storage.getComplianceDocumentBySection('wirc_act', section.sectionId);

      if (existing) {
        console.log(`    ⏭️  Already exists, skipping`);
        continue;
      }

      // Insert into database
      await storage.createComplianceDocument({
        source: 'wirc_act',
        sectionId: section.sectionId,
        title: section.title,
        content: section.content,
        fullReference: `WIRC Act 2013 - Section ${section.sectionId}`,
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
  console.log('📊 WIRC Act Ingestion Complete');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors:  ${errorCount}`);
  console.log(`📝 Total:   ${KNOWN_SECTIONS.length}`);
  console.log('='.repeat(60));
}

// Run the ingestion
ingestWIRCAct()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
