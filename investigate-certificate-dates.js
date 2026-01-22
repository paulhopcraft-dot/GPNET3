// Investigate suspicious certificate dates
import 'dotenv/config';
import { storage } from './server/storage.ts';

async function investigateCertificateDates() {
  console.log('🔍 Investigating certificate date inconsistencies...\n');

  // Get cases from overdue actions to investigate
  const overdueActions = await storage.getOverdueActions('org-alpha');
  const caseMap = new Map();
  overdueActions.forEach(action => {
    if (!caseMap.has(action.caseId)) {
      caseMap.set(action.caseId, action.workerName || 'Unknown');
    }
  });
  console.log(`Found ${caseMap.size} cases to check from overdue actions\n`);

  let suspiciousCount = 0;
  let totalCertificates = 0;
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));

  const suspiciousEntries = [];

  for (const [caseId, workerName] of Array.from(caseMap.entries()).slice(0, 20)) {
    try {
      const certificates = await storage.getCertificatesByCase(caseId, 'org-alpha');
      totalCertificates += certificates.length;

      for (const cert of certificates) {
        const endDate = new Date(cert.endDate);
        const startDate = new Date(cert.startDate);
        const createdDate = cert.createdAt ? new Date(cert.createdAt) : null;

        const daysDiff = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Flag certificates more than 6 months in the future
        if (daysDiff > 180) {
          const entry = {
            worker: workerName,
            caseId: caseId,
            endDate: endDate.toLocaleDateString(),
            startDate: startDate.toLocaleDateString(),
            created: createdDate ? createdDate.toLocaleDateString() : 'Unknown',
            capacity: cert.capacity,
            daysFromNow: daysDiff,
            duration: durationDays
          };

          suspiciousEntries.push(entry);
          suspiciousCount++;
        }
      }
    } catch (error) {
      console.log(`Error checking case ${caseId}: ${error.message}`);
    }
  }

  console.log('SUSPICIOUS CERTIFICATE DATES:\n');

  suspiciousEntries.forEach(entry => {
    console.log(`⚠️  ${entry.worker}`);
    console.log(`   Case: ${entry.caseId}`);
    console.log(`   Valid: ${entry.startDate} → ${entry.endDate}`);
    console.log(`   Created: ${entry.created}`);
    console.log(`   Duration: ${entry.duration} days`);
    console.log(`   Days from now: ${entry.daysFromNow} days`);
    console.log(`   Capacity: ${entry.capacity}`);
    console.log('');
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`Total certificates checked: ${totalCertificates}`);
  console.log(`Suspicious long-duration certificates: ${suspiciousCount}`);
  console.log(`Percentage suspicious: ${((suspiciousCount / totalCertificates) * 100).toFixed(1)}%`);

  // Look for patterns
  if (suspiciousEntries.length > 0) {
    console.log(`\n🔍 PATTERNS:`);

    const capacities = suspiciousEntries.map(e => e.capacity);
    const uniqueCapacities = [...new Set(capacities)];
    console.log(`Capacity types: ${uniqueCapacities.join(', ')}`);

    const avgDuration = suspiciousEntries.reduce((sum, e) => sum + e.duration, 0) / suspiciousEntries.length;
    console.log(`Average duration: ${Math.round(avgDuration)} days`);

    const maxDuration = Math.max(...suspiciousEntries.map(e => e.duration));
    console.log(`Longest duration: ${maxDuration} days`);
  }
}

investigateCertificateDates().then(() => process.exit(0)).catch(console.error);