// Direct test of action validation logic
import 'dotenv/config';
import { storage } from './server/storage.ts';
import { generatePendingNotifications } from './server/services/notificationService.ts';

async function testActionValidation() {
  console.log('🔍 Testing action validation for Andres Nieto...');

  try {
    // Get overdue actions for org-alpha (Symmetry)
    const overdueActions = await storage.getOverdueActions('org-alpha');
    console.log(`\n📊 Found ${overdueActions.length} overdue actions total`);

    // Find Andres Nieto's action
    const andresActions = overdueActions.filter(action =>
      action.workerName && action.workerName.toLowerCase().includes('andres')
    );

    if (andresActions.length === 0) {
      console.log('❌ No overdue actions found for Andres Nieto');
      return;
    }

    console.log(`\n👤 Found ${andresActions.length} overdue action(s) for Andres Nieto:`);

    for (const action of andresActions) {
      console.log(`\n🎯 Action Details:`);
      console.log(`   ID: ${action.id}`);
      console.log(`   Type: ${action.type}`);
      console.log(`   Worker: ${action.workerName}`);
      console.log(`   Case: ${action.caseId}`);
      console.log(`   Due Date: ${action.dueDate}`);
      console.log(`   Description: ${action.description}`);
      console.log(`   Status: ${action.status}`);

      // Test certificate compliance
      console.log(`\n📋 Checking certificate compliance for case ${action.caseId}...`);
      const { getCaseCompliance } = await import('./server/services/certificateCompliance.ts');
      const compliance = await getCaseCompliance(storage, action.caseId, action.organizationId);

      console.log(`\n✅ Compliance Status:`);
      console.log(`   Status: ${compliance.status}`);
      console.log(`   Active Certificate: ${!!compliance.activeCertificate}`);
      console.log(`   Newest Certificate: ${!!compliance.newestCertificate}`);

      if (compliance.newestCertificate) {
        console.log(`   Newest Cert Date: ${compliance.newestCertificate.createdAt}`);
        console.log(`   Newest Cert Valid Until: ${compliance.newestCertificate.endDate}`);
      }

      if (compliance.activeCertificate) {
        console.log(`   Active Cert Date: ${compliance.activeCertificate.createdAt}`);
        console.log(`   Active Cert Valid Until: ${compliance.activeCertificate.endDate}`);
      }

      // Calculate if this action should be obsolete
      const shouldBeObsolete =
        compliance.status === "compliant" ||
        compliance.activeCertificate !== null;

      console.log(`\n🤖 Action Analysis:`);
      console.log(`   Should be obsolete: ${shouldBeObsolete}`);
      console.log(`   Reason: ${shouldBeObsolete ? 'Valid certificate exists' : 'No valid certificate'}`);

      // Test the action validation function directly
      console.log(`\n🧪 Testing validation function...`);
      // Need to import the private function - let's trigger generation instead
    }

    console.log(`\n🚀 Triggering notification generation to test validation...`);
    const result = await generatePendingNotifications(storage, 'org-alpha');
    console.log(`✅ Generation completed: ${result} notifications generated`);

    // Check actions again after generation
    console.log(`\n🔄 Checking actions after generation...`);
    const updatedActions = await storage.getOverdueActions('org-alpha');
    const updatedAndresActions = updatedActions.filter(action =>
      action.workerName && action.workerName.toLowerCase().includes('andres')
    );

    console.log(`\n📈 Results:`);
    console.log(`   Actions before: ${andresActions.length}`);
    console.log(`   Actions after: ${updatedAndresActions.length}`);
    console.log(`   Auto-completed: ${andresActions.length - updatedAndresActions.length}`);

    if (updatedAndresActions.length < andresActions.length) {
      console.log('🎉 SUCCESS: Action validation worked! Obsolete actions were auto-completed.');
    } else {
      console.log('⚠️  No actions were auto-completed. Check the debug logs above.');
    }

  } catch (error) {
    console.error('💥 Error during test:', error);
  }
}

// Run the test
testActionValidation().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});