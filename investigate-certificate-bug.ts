// Certificate Date Bug Investigation Script
import { db } from './server/db';
import { workerCases, medicalCertificates } from './shared/schema';
import { eq, sql, gte, lte } from 'drizzle-orm';

async function investigateCertificateDates() {
  console.log('🔍 CERTIFICATE DATE BUG INVESTIGATION');
  console.log('=====================================\n');

  // 1. Find Andres Nieto case
  console.log('1. Looking for Andres Nieto case (FD-43714)...');
  const andresCase = await db.select()
    .from(workerCases)
    .where(eq(workerCases.freshdeskId, 'FD-43714'))
    .limit(1);

  if (andresCase.length === 0) {
    console.log('❌ Andres case not found!');
    return;
  }

  const caseData = andresCase[0];
  console.log(`✅ Found: ${caseData.workerName} (${caseData.id})\n`);

  // 2. Get Andres certificates
  console.log('2. Examining Andres certificates...');
  const andresCerts = await db.select()
    .from(medicalCertificates)
    .where(eq(medicalCertificates.caseId, caseData.id));

  console.log(`Found ${andresCerts.length} certificates:\n`);

  andresCerts.forEach((cert, i) => {
    const startDate = new Date(cert.startDate);
    const endDate = new Date(cert.endDate);
    const now = new Date();

    console.log(`Certificate ${i + 1}:`);
    console.log(`  ID: ${cert.id}`);
    console.log(`  Start: ${cert.startDate} (${startDate.toLocaleDateString()})`);
    console.log(`  End: ${cert.endDate} (${endDate.toLocaleDateString()})`);
    console.log(`  Capacity: ${cert.workCapacity}`);
    console.log(`  Future date?: ${startDate > now ? '🚨 YES' : '✅ No'}`);
    console.log(`  Created: ${cert.createdAt}`);
    console.log(`  Updated: ${cert.updatedAt}\n`);
  });

  // 3. Check for other cases with future certificate dates
  console.log('3. Checking for other cases with future certificate dates...');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

  const futureCerts = await db.select({
    caseId: medicalCertificates.caseId,
    workerName: workerCases.workerName,
    freshdeskId: workerCases.freshdeskId,
    startDate: medicalCertificates.startDate,
    endDate: medicalCertificates.endDate,
    certId: medicalCertificates.id
  })
  .from(medicalCertificates)
  .innerJoin(workerCases, eq(medicalCertificates.caseId, workerCases.id))
  .where(gte(medicalCertificates.startDate, futureDate.toISOString()));

  console.log(`Found ${futureCerts.length} certificates with future dates:\n`);

  futureCerts.forEach((cert, i) => {
    console.log(`${i + 1}. ${cert.workerName} (${cert.freshdeskId})`);
    console.log(`   Start: ${cert.startDate}`);
    console.log(`   End: ${cert.endDate}`);
    console.log(`   Cert ID: ${cert.certId}\n`);
  });

  // 4. Check certificate parsing logic source
  console.log('4. Investigation summary:');
  console.log(`- Andres certificates: ${andresCerts.length}`);
  console.log(`- Total future certificates: ${futureCerts.length}`);
  console.log(`- Potential data integrity issue: ${futureCerts.length > 0 ? '🚨 YES' : '✅ No'}`);

  if (futureCerts.length > 0) {
    console.log('\n🚨 ACTION NEEDED: Future certificate dates detected!');
  }
}

// Run investigation
investigateCertificateDates().catch(console.error);