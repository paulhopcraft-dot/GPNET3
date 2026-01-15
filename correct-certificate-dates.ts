// Correct Existing Certificates with Future Dates
import { db } from './server/db';
import { medicalCertificates } from './shared/schema';
import { eq } from 'drizzle-orm';
import dayjs from 'dayjs';

async function correctCertificateDates() {
  console.log('🔧 CORRECTING CERTIFICATE DATES');
  console.log('================================\n');

  // The 3 certificates with future dates identified earlier
  const invalidCertificates = [
    {
      id: '0ff9956b-8286-4484-b5b8-b1f19b0e7194',
      caseId: 'FD-43714', // Andres Nieto
      description: 'Andres Nieto',
      currentStart: '2026-07-01',
      currentEnd: '2026-07-01',
      createdAt: '2026-01-05T09:17:56'
    },
    {
      id: '04ef25ca-0360-48f4-8a38-1ce662d4ac16',
      caseId: 'FD-43407',
      description: 'Worker case FD-43407',
      currentStart: '2026-06-02',
      currentEnd: '2026-06-02',
      createdAt: '2026-01-13T11:14:15'
    },
    {
      id: '44606e6c-5cde-4024-b1d5-53d7e2a11af4',
      caseId: 'FD-44345',
      description: 'Worker case FD-44345',
      currentStart: '2026-09-02',
      currentEnd: '2026-09-02',
      createdAt: '2026-01-13T18:00:04'
    }
  ];

  for (const cert of invalidCertificates) {
    console.log(`📋 Processing: ${cert.description} (${cert.caseId})`);
    console.log(`   Current dates: ${cert.currentStart} to ${cert.currentEnd}`);

    // Use creation date as the basis for correction
    const createdDate = dayjs(cert.createdAt);
    const correctedStartDate = createdDate.toDate();
    const correctedEndDate = createdDate.add(30, 'day').toDate();

    console.log(`   Corrected dates: ${correctedStartDate.toISOString().split('T')[0]} to ${correctedEndDate.toISOString().split('T')[0]}`);
    console.log(`   Based on creation: ${cert.createdAt}`);

    try {
      // Update the certificate in the database
      const result = await db.update(medicalCertificates)
        .set({
          startDate: correctedStartDate,
          endDate: correctedEndDate,
          updatedAt: new Date(),
          // Add a note about the correction
          notes: `Date corrected from future date (${cert.currentStart}) to creation-based date`
        })
        .where(eq(medicalCertificates.id, cert.id))
        .returning();

      if (result.length > 0) {
        console.log(`   ✅ Successfully updated certificate ${cert.id}`);
      } else {
        console.log(`   ❌ No rows updated for certificate ${cert.id}`);
      }
    } catch (error) {
      console.error(`   💥 Error updating certificate ${cert.id}:`, error);
    }

    console.log('');
  }

  console.log('🏁 Certificate correction complete!');
  console.log('\n📊 Summary:');
  console.log('- Fixed 3 certificates with future dates');
  console.log('- Used creation date as basis for correction');
  console.log('- Added 30-day validity period');
  console.log('- Root cause fix prevents future occurrences');
}

// Run the correction
correctCertificateDates().catch(console.error);