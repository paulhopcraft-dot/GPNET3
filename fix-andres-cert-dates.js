// Fix Andres Nieto's future certificate dates
import 'dotenv/config';
import { storage } from './server/storage.ts';

async function fixAndresCertDates() {
  console.log('🔧 Fixing Andres Nieto certificate dates (FD-43714)...\n');

  try {
    const certificates = await storage.getCertificatesByCase('FD-43714', 'org-alpha');
    console.log(`Found ${certificates.length} certificates to review:\n`);

    const now = new Date();
    const fixedCertificates = [];

    for (const cert of certificates) {
      const startDate = new Date(cert.startDate);
      const endDate = new Date(cert.endDate);
      const daysDiff = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Certificate ${cert.id}:`);
      console.log(`  Original Start: ${startDate.toLocaleDateString()}`);
      console.log(`  Original End: ${endDate.toLocaleDateString()}`);
      console.log(`  Days from now: ${daysDiff} days`);

      // Check if this certificate has future dates (> 30 days in future)
      if (daysDiff > 30) {
        console.log(`  ⚠️  FUTURE DATE DETECTED - needs fixing`);

        // Fix strategy: Move to past dates
        let fixedStartDate, fixedEndDate;

        if (startDate.getFullYear() === 2026 && startDate.getMonth() === 6) {
          // July 2026 -> July 2025
          fixedStartDate = new Date(2025, 6, startDate.getDate());
          fixedEndDate = new Date(2025, 6, endDate.getDate());
        } else if (startDate.getFullYear() === 2026 && startDate.getMonth() === 3) {
          // April 2026 -> April 2025
          fixedStartDate = new Date(2025, 3, startDate.getDate());
          fixedEndDate = new Date(2025, 3, endDate.getDate());
        } else {
          // General fix: subtract 1 year
          fixedStartDate = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
          fixedEndDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        }

        console.log(`  ✅ Fixed Start: ${fixedStartDate.toLocaleDateString()}`);
        console.log(`  ✅ Fixed End: ${fixedEndDate.toLocaleDateString()}`);

        // Update the certificate in the database
        try {
          await storage.updateCertificate(cert.id, 'org-alpha', {
            startDate: fixedStartDate,
            endDate: fixedEndDate
          });
          console.log(`  💾 Updated certificate ${cert.id} in database`);
          fixedCertificates.push(cert.id);
        } catch (error) {
          console.log(`  ❌ Failed to update certificate ${cert.id}: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Date is valid (no changes needed)`);
      }
      console.log('');
    }

    if (fixedCertificates.length > 0) {
      console.log(`🎉 Successfully fixed ${fixedCertificates.length} certificate(s): ${fixedCertificates.join(', ')}`);
      console.log('✅ Andres Nieto\'s recovery timeline should now display correctly!');
    } else {
      console.log('ℹ️  No certificates needed fixing.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

fixAndresCertDates().then(() => process.exit(0)).catch(console.error);