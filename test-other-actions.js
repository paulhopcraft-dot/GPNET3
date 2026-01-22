// Test for other potentially stale certificate actions
import 'dotenv/config';
import { storage } from './server/storage.ts';
import { getCaseCompliance } from './server/services/certificateCompliance.ts';

async function findOtherStaleActions() {
  console.log('Finding other potential stale certificate actions...\n');

  const overdueActions = await storage.getOverdueActions('org-alpha');
  const certificateActions = overdueActions.filter(action =>
    action.type === 'chase_certificate' && action.workerName
  );

  console.log(`Found ${certificateActions.length} certificate actions to check:\n`);

  let staleCount = 0;
  for (const action of certificateActions.slice(0, 10)) {
    try {
      const compliance = await getCaseCompliance(storage, action.caseId, action.organizationId);
      const shouldBeObsolete = compliance.status === 'compliant' || compliance.activeCertificate;

      if (shouldBeObsolete) staleCount++;

      console.log(`${action.workerName}`);
      console.log(`   Action: ${action.description || 'Obtain certificate'}`);
      console.log(`   Due: ${action.dueDate}`);
      console.log(`   Compliance: ${compliance.status}`);
      console.log(`   Should auto-complete: ${shouldBeObsolete ? 'YES' : 'NO'}`);
      console.log('');
    } catch (error) {
      console.log(`${action.workerName}: ERROR - ${error.message}`);
    }
  }

  console.log(`\nSummary: ${staleCount} stale actions found out of ${Math.min(10, certificateActions.length)} checked`);
}

findOtherStaleActions().then(() => process.exit(0)).catch(console.error);