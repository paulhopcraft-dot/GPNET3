import { db } from './server/db.js';
import { workerCases, caseDiscussionNotes } from './shared/schema.js';
import { eq, desc } from 'drizzle-orm';

async function checkAndresState() {
  console.log('🔍 Checking current state of Andres Nieto (FD-43714)...\n');

  // Check main case data
  const cases = await db.select()
    .from(workerCases)
    .where(eq(workerCases.id, 'FD-43714'))
    .limit(1);

  if (cases.length === 0) {
    console.log('❌ Case FD-43714 not found in database');
    return;
  }

  const andreasCase = cases[0];
  console.log('📄 Current Case Data:');
  console.log(`- Worker Name: ${andreasCase.workerName}`);
  console.log(`- Summary: ${andreasCase.summary?.substring(0, 100)}...`);
  console.log(`- Work Status: ${andreasCase.workStatus}`);
  console.log(`- Current Status: ${andreasCase.currentStatus}`);
  console.log(`- Next Step: ${andreasCase.nextStep}`);
  console.log(`- AI Summary Length: ${andreasCase.aiSummary ? andreasCase.aiSummary.length : 0} characters`);
  console.log(`- AI Summary Generated At: ${andreasCase.aiSummaryGeneratedAt}`);
  console.log(`- Ticket Last Updated At: ${andreasCase.ticketLastUpdatedAt}`);
  console.log(`- Treating GP: ${andreasCase.treatingGp}`);
  console.log(`- Physiotherapist: ${andreasCase.physiotherapist}`);
  console.log(`- ORP: ${andreasCase.orp}`);
  console.log(`- Case Manager: ${andreasCase.caseManager}`);

  // Check discussion notes
  console.log('\n💬 Discussion Notes:');
  const notes = await db.select()
    .from(caseDiscussionNotes)
    .where(eq(caseDiscussionNotes.caseId, 'FD-43714'))
    .orderBy(desc(caseDiscussionNotes.createdAt))
    .limit(5);

  if (notes.length === 0) {
    console.log('❌ No discussion notes found for case FD-43714');
  } else {
    notes.forEach((note, index) => {
      console.log(`${index + 1}. ${note.createdAt}: ${note.notes?.substring(0, 150)}...`);
    });
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Clear cached AI summary to force regeneration');
  console.log('2. Ensure Freshdesk conversation sync is working');
  console.log('3. Test forced summary regeneration');
}

checkAndresState().catch(console.error);