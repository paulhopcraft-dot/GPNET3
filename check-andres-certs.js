// Check Andres Nieto's certificates specifically
import 'dotenv/config';
import { storage } from './server/storage.ts';

async function checkAndresCerts() {
  console.log('Checking Andres Nieto specifically (FD-43714)...\n');

  try {
    const certificates = await storage.getCertificatesByCase('FD-43714', 'org-alpha');
    console.log(`Found ${certificates.length} certificates:\n`);

    const now = new Date();

    certificates.forEach((cert, index) => {
      const endDate = new Date(cert.endDate);
      const startDate = new Date(cert.startDate);
      const daysDiff = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Certificate #${index + 1}:`);
      console.log(`  Start: ${startDate.toLocaleDateString()}`);
      console.log(`  End: ${endDate.toLocaleDateString()}`);
      console.log(`  Created: ${cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : 'Unknown'}`);
      console.log(`  Duration: ${durationDays} days`);
      console.log(`  Days from now: ${daysDiff} days`);
      console.log(`  Capacity: ${cert.capacity}`);
      console.log(`  Suspicious (>180 days): ${daysDiff > 180 ? 'YES' : 'NO'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAndresCerts().then(() => process.exit(0)).catch(console.error);