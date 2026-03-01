import "dotenv/config";
import { storage } from "../server/storage";

async function testRecoveryTimeline() {
  console.log("\n=== Testing Recovery Timeline API ===\n");

  // Get a case that has certificates
  const cases = await storage.getGPNet2CasesPaginated(undefined, 1, 10);
  const caseWithCert = cases.cases.find(c => c.hasCertificate);

  if (!caseWithCert) {
    console.log("No cases with certificates found!");
    process.exit(1);
  }

  console.log(`Testing with case: ${caseWithCert.workerName} (${caseWithCert.id})`);
  console.log(`Has certificate: ${caseWithCert.hasCertificate}`);

  // Call the recovery timeline method
  try {
    const timeline = await storage.getCaseRecoveryTimeline(caseWithCert.id, caseWithCert.organizationId);
    console.log(`\nRecovery timeline returned ${timeline.length} points`);

    if (timeline.length > 0) {
      console.log("\nSample timeline points:");
      timeline.slice(0, 5).forEach(point => {
        console.log(`  - Date: ${point.date}, Capacity: ${point.capacity}, Status: ${point.workStatus || 'N/A'}`);
      });
    } else {
      console.log("\n❌ Recovery timeline is empty despite case having certificates!");
    }
  } catch (error) {
    console.error("\n❌ Error calling getCaseRecoveryTimeline:", error);
  }

  process.exit(0);
}

testRecoveryTimeline().catch(console.error);
