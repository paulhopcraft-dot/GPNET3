const { db } = require('../server/db.js');
const { medicalCertificates } = require('../shared/schema.js');
const { eq } = require('drizzle-orm');

async function check() {
  const certs = await db.select({
    id: medicalCertificates.id,
    documentUrl: medicalCertificates.documentUrl,
    startDate: medicalCertificates.startDate
  })
  .from(medicalCertificates)
  .where(eq(medicalCertificates.caseId, 'FD-43714'));

  console.log('Certificate URLs for Andres Nieto (FD-43714):');
  console.log('='.repeat(60));

  let localCount = 0;
  let webCount = 0;
  let noneCount = 0;

  certs.forEach(c => {
    let urlType = 'NONE';
    if (c.documentUrl) {
      if (c.documentUrl.startsWith('file://')) {
        urlType = 'LOCAL';
        localCount++;
      } else if (c.documentUrl.startsWith('http')) {
        urlType = 'WEB';
        webCount++;
      }
    } else {
      noneCount++;
    }

    const urlPreview = c.documentUrl ? c.documentUrl.substring(0, 70) + '...' : 'null';
    console.log(`[${urlType}] ${c.startDate}: ${urlPreview}`);
  });

  console.log('='.repeat(60));
  console.log(`Summary: ${webCount} WEB, ${localCount} LOCAL, ${noneCount} NONE`);
}

check().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
