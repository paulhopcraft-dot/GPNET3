// Simple Certificate Date Check - Minimal query to avoid Drizzle issues
import { db } from './server/db';
import { medicalCertificates } from './shared/schema';
import { gte, sql } from 'drizzle-orm';

async function checkCertificates() {
  console.log('🔍 SIMPLE CERTIFICATE DATE CHECK');
  console.log('=================================\n');

  const today = new Date();
  console.log(`Today: ${today.toISOString()}`);

  try {
    // Simple query: all medical certificates
    console.log('1. Querying all certificates...');
    const allCerts = await db.select().from(medicalCertificates);

    console.log(`Total certificates found: ${allCerts.length}\n`);

    // Filter for future dates manually
    const futureCerts = allCerts.filter(cert => {
      const startDate = new Date(cert.startDate);
      const endDate = new Date(cert.endDate);
      return startDate > today || endDate > today;
    });

    console.log(`Certificates with future dates: ${futureCerts.length}\n`);

    // Show future certificates
    futureCerts.forEach((cert, i) => {
      const start = new Date(cert.startDate);
      const end = new Date(cert.endDate);

      console.log(`${i + 1}. Certificate ID: ${cert.id}`);
      console.log(`   Case ID: ${cert.caseId}`);
      console.log(`   Start: ${cert.startDate} (${start.toDateString()})`);
      console.log(`   End: ${cert.endDate} (${end.toDateString()})`);
      console.log(`   Created: ${cert.createdAt}`);
      console.log('');
    });

    // Find Andres specifically by looking for case ID patterns
    console.log('2. Looking for specific problematic certificates...');
    const problemCerts = futureCerts.filter(cert => {
      const start = new Date(cert.startDate);
      return start.getFullYear() === 2026;
    });

    console.log(`Certificates dated in 2026: ${problemCerts.length}`);
    problemCerts.forEach(cert => {
      console.log(`   Case: ${cert.caseId}, Start: ${cert.startDate}, End: ${cert.endDate}`);
    });

  } catch (error) {
    console.error('Database error:', error);
  }
}

// Run the check
checkCertificates().catch(console.error);