import "dotenv/config";
import { db } from "../server/db";
import { medicalCertificates, workerCases } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkCertificates() {
  console.log("\n=== Checking Medical Certificates ===\n");

  // Get all certificates
  const allCerts = await db.select().from(medicalCertificates);
  console.log(`Total medical certificates in database: ${allCerts.length}`);

  if (allCerts.length > 0) {
    console.log("\nSample certificates:");
    allCerts.slice(0, 5).forEach(cert => {
      console.log(`  - Case ${cert.caseId}: ${cert.startDate} to ${cert.endDate}, capacity: ${cert.capacity}`);
    });

    // Check which cases have certificates
    const casesWithCerts = new Set(allCerts.map(c => c.caseId));
    console.log(`\nNumber of cases with certificates: ${casesWithCerts.size}`);
  } else {
    console.log("\nNo medical certificates found in database.");
    console.log("Recovery timeline graphs require medical certificate data to display.");
  }

  // Check a few cases to see if they have recovery timeline data
  const cases = await db.select({
    id: workerCases.id,
    workerName: workerCases.workerName,
    hasCertificate: workerCases.hasCertificate,
  })
  .from(workerCases)
  .limit(10);

  console.log("\nSample cases and certificate status:");
  cases.forEach(c => {
    console.log(`  - ${c.workerName}: hasCertificate = ${c.hasCertificate}`);
  });

  process.exit(0);
}

checkCertificates().catch(console.error);
