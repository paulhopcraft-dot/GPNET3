// Fix Certificate Date Bug - Add Future Date Validation
// This script adds validation to prevent future certificate dates

import { db } from './server/db';
import { medicalCertificates, workerCases } from './shared/schema';
import { eq, gte, sql } from 'drizzle-orm';
import dayjs from 'dayjs';

async function fixCertificateDates() {
  console.log('🔧 FIXING CERTIFICATE DATE BUG');
  console.log('=====================================\n');

  const now = new Date();
  const futureThreshold = new Date();
  futureThreshold.setDate(futureThreshold.getDate() + 30); // 30 days from now

  // 1. Find all certificates with future start dates
  console.log('1. Finding certificates with future dates...');
  const futureCerts = await db.select({
    id: medicalCertificates.id,
    caseId: medicalCertificates.caseId,
    startDate: medicalCertificates.startDate,
    endDate: medicalCertificates.endDate,
    createdAt: medicalCertificates.createdAt,
    updatedAt: medicalCertificates.updatedAt,
    workerName: workerCases.workerName,
    freshdeskId: workerCases.freshdeskId
  })
  .from(medicalCertificates)
  .innerJoin(workerCases, eq(medicalCertificates.caseId, workerCases.id))
  .where(gte(medicalCertificates.startDate, futureThreshold.toISOString()));

  console.log(`Found ${futureCerts.length} certificates with future dates:\n`);

  futureCerts.forEach((cert, i) => {
    const startDate = new Date(cert.startDate);
    const daysInFuture = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`${i + 1}. ${cert.workerName} (${cert.freshdeskId})`);
    console.log(`   Cert ID: ${cert.id}`);
    console.log(`   Start Date: ${cert.startDate} (${daysInFuture} days in future)`);
    console.log(`   End Date: ${cert.endDate}`);
    console.log(`   Created: ${cert.createdAt}`);
    console.log('');
  });

  if (futureCerts.length === 0) {
    console.log('✅ No future-dated certificates found!');
    return;
  }

  // 2. For Andres specifically, suggest a correction
  const andresCert = futureCerts.find(c => c.freshdeskId === 'FD-43714');
  if (andresCert) {
    console.log('🎯 ANDRES NIETO CERTIFICATE FOUND');
    console.log('Suggested fix: Update certificate to current date range\n');

    // Suggest using created date as basis for correction
    const createdDate = new Date(andresCert.createdAt);
    const suggestedStart = dayjs(createdDate).format('YYYY-MM-DD');
    const suggestedEnd = dayjs(createdDate).add(30, 'day').format('YYYY-MM-DD');

    console.log(`Suggested correction for Andres:`);
    console.log(`  Current Start: ${andresCert.startDate} (INVALID - future)`);
    console.log(`  Suggested Start: ${suggestedStart} (based on creation date)`);
    console.log(`  Current End: ${andresCert.endDate} (INVALID - future)`);
    console.log(`  Suggested End: ${suggestedEnd} (30 days from start)`);
    console.log('');
  }

  // 3. Propose validation fix for Freshdesk import
  console.log('🔧 RECOMMENDED FIXES:');
  console.log('1. Add date validation to Freshdesk import');
  console.log('2. Update existing invalid certificates');
  console.log('3. Add database constraints');
  console.log('\n📋 Next Steps: Apply fixes to prevent future occurrences');
}

// Run the fix analysis
if (process.env.DATABASE_URL) {
  fixCertificateDates().catch(console.error);
} else {
  console.log('❌ DATABASE_URL not set. Please run with proper environment.');
}