/**
 * Google Drive Certificate Scanner
 * Scans local Google Drive folder for medical certificates, runs OCR, and stores in database
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../server/db';
import { medicalCertificates, workerCases } from '../shared/schema';
import { eq, ilike, or, sql } from 'drizzle-orm';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Google Drive base path
const GDRIVE_BASE = 'G:/My Drive/GPNet/Clients';

interface CertificateFile {
  filePath: string;
  workerName: string;
  companyName: string;
  fileName: string;
}

interface ExtractedCertData {
  issueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  practitionerName: string | null;
  practitionerType: string | null;
  capacity: 'fit' | 'partial' | 'unfit' | 'unknown';
  restrictions: string[];
  notes: string | null;
  rawText: string;
  confidence: number;
  isMedicalCertificate: boolean;
}

/**
 * Fuzzy match worker names
 * "Andres Fabian Gutierrez Nieto" should match "Andres Nieto"
 */
function fuzzyMatchWorkerName(folderName: string, dbName: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const folderNorm = normalize(folderName);
  const dbNorm = normalize(dbName);

  // Exact match
  if (folderNorm === dbNorm) return true;

  // Check if all words in dbName exist in folderName
  const dbWords = dbNorm.split(/\s+/).filter(w => w.length > 2);
  const folderWords = folderNorm.split(/\s+/);

  const matchCount = dbWords.filter(dbWord =>
    folderWords.some(fw => fw.includes(dbWord) || dbWord.includes(fw))
  ).length;

  // Match if at least 2 words match (first + last name typically)
  if (matchCount >= 2) return true;

  // Check if folder contains db name or vice versa
  if (folderNorm.includes(dbNorm) || dbNorm.includes(folderNorm)) return true;

  return false;
}

/**
 * Find all certificate files in a company folder
 */
function findCertificateFiles(companyPath: string, companyName: string): CertificateFile[] {
  const files: CertificateFile[] = [];

  if (!fs.existsSync(companyPath)) return files;

  const workerDirs = fs.readdirSync(companyPath, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'desktop.ini');

  for (const workerDir of workerDirs) {
    const workerPath = path.join(companyPath, workerDir.name);
    const workerName = workerDir.name;

    // Skip non-worker directories
    if (['Closed cases', 'Occupational Rehab', 'Summary of the meeting', 'Symmetry documents',
         'Symmetry Inspector visit', 'Symmetry Manuals'].includes(workerName)) {
      continue;
    }

    // Recursively find certificate files
    const searchDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.isFile()) {
          const lower = entry.name.toLowerCase();
          const ext = path.extname(lower);

          // Check if it's a certificate file
          const isCertFile = (
            (lower.includes('coc') || lower.includes('capacity') || lower.includes('certificate')) &&
            ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)
          );

          // Also check if it's in a certificate folder
          const inCertFolder = fullPath.toLowerCase().includes('certificate') ||
                              fullPath.toLowerCase().includes('coc');

          if (isCertFile || (inCertFolder && ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext))) {
            files.push({
              filePath: fullPath,
              workerName,
              companyName,
              fileName: entry.name
            });
          }
        }
      }
    };

    searchDir(workerPath);
  }

  return files;
}

/**
 * Run OCR on a certificate file
 */
async function runOCR(filePath: string): Promise<ExtractedCertData> {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();

  let mediaType: 'application/pdf' | 'image/png' | 'image/jpeg';
  if (ext === '.pdf') mediaType = 'application/pdf';
  else if (ext === '.png') mediaType = 'image/png';
  else mediaType = 'image/jpeg';

  const contentBlocks: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

  if (mediaType === 'application/pdf') {
    contentBlocks.push({
      type: 'document' as const,
      source: { type: 'base64' as const, media_type: mediaType, data: base64 }
    } as Anthropic.DocumentBlockParam);
  } else {
    contentBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 }
    });
  }

  contentBlocks.push({
    type: 'text',
    text: `Analyze this document. Determine if it's a medical certificate (Certificate of Capacity, fitness for work certificate, doctor's certificate).

If it IS a medical certificate, extract:
1. Issue Date (when signed/issued)
2. Start Date (when restrictions begin)
3. End Date (when certificate expires/valid until)
4. Practitioner Name
5. Practitioner Type (gp/specialist/physiotherapist/psychologist/other)
6. Capacity (fit/partial/unfit/unknown)
7. Restrictions (list)
8. Notes (any other relevant info)

Respond ONLY with JSON:
{
  "isMedicalCertificate": true/false,
  "issueDate": "YYYY-MM-DD" or null,
  "startDate": "YYYY-MM-DD" or null,
  "endDate": "YYYY-MM-DD" or null,
  "practitionerName": "Dr Name" or null,
  "practitionerType": "gp|specialist|physiotherapist|psychologist|other" or null,
  "capacity": "fit|partial|unfit|unknown",
  "restrictions": ["restriction1", "restriction2"],
  "notes": "any notes",
  "rawText": "key text from document",
  "confidence": 0.0-1.0
}`
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: contentBlocks }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);

  return JSON.parse(jsonStr.trim());
}

/**
 * Find matching case in database using fuzzy name matching
 */
async function findMatchingCase(workerName: string, companyName: string): Promise<string | null> {
  // First try exact company match
  const cases = await db.select()
    .from(workerCases)
    .where(ilike(workerCases.company, `%${companyName}%`));

  // Fuzzy match worker name
  for (const c of cases) {
    if (c.workerName && fuzzyMatchWorkerName(workerName, c.workerName)) {
      return c.id;
    }
  }

  // Try without company filter
  const allCases = await db.select().from(workerCases);
  for (const c of allCases) {
    if (c.workerName && fuzzyMatchWorkerName(workerName, c.workerName)) {
      return c.id;
    }
  }

  return null;
}

/**
 * Check if certificate already exists
 */
async function certificateExists(caseId: string, filePath: string): Promise<boolean> {
  const existing = await db.select()
    .from(medicalCertificates)
    .where(eq(medicalCertificates.sourceReference, `gdrive:${filePath}`))
    .limit(1);

  return existing.length > 0;
}

async function main() {
  const companyFilter = process.argv[2] || 'Symmetry';
  const companyPath = path.join(GDRIVE_BASE, companyFilter);

  console.log(`\n=== Google Drive Certificate Scanner ===`);
  console.log(`Company: ${companyFilter}`);
  console.log(`Path: ${companyPath}\n`);

  // Find all certificate files
  console.log('Scanning for certificate files...');
  const certFiles = findCertificateFiles(companyPath, companyFilter);
  console.log(`Found ${certFiles.length} certificate files\n`);

  let processed = 0;
  let matched = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < certFiles.length; i++) {
    const cert = certFiles[i];
    console.log(`[${i + 1}/${certFiles.length}] ${cert.workerName} - ${cert.fileName}`);

    try {
      // Find matching case
      const caseId = await findMatchingCase(cert.workerName, cert.companyName);

      if (!caseId) {
        console.log(`  ! No matching case found for "${cert.workerName}"`);
        skipped++;
        continue;
      }

      matched++;
      console.log(`  > Matched to case: ${caseId}`);

      // Check if already processed
      if (await certificateExists(caseId, cert.filePath)) {
        console.log(`  - Already processed, skipping`);
        skipped++;
        continue;
      }

      // Run OCR
      console.log(`  > Running OCR...`);
      const extracted = await runOCR(cert.filePath);
      processed++;

      console.log(`  > Is certificate: ${extracted.isMedicalCertificate}, Confidence: ${extracted.confidence}`);

      if (!extracted.isMedicalCertificate || extracted.confidence < 0.5) {
        console.log(`  - Skipped (not a certificate or low confidence)\n`);
        continue;
      }

      // Parse dates
      const issueDate = extracted.issueDate ? new Date(extracted.issueDate) : new Date();
      const startDate = extracted.startDate ? new Date(extracted.startDate) : issueDate;
      const endDate = extracted.endDate ? new Date(extracted.endDate) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      // Store in database
      await db.insert(medicalCertificates).values({
        caseId,
        issueDate,
        startDate,
        endDate,
        capacity: extracted.capacity || 'unknown',
        treatingPractitioner: extracted.practitionerName,
        practitionerType: extracted.practitionerType as any,
        restrictions: extracted.restrictions || [],
        notes: extracted.notes,
        source: 'google_drive',
        sourceReference: `gdrive:${cert.filePath}`,
        documentUrl: `file:///${cert.filePath.replace(/\\/g, '/')}`,
        fileName: cert.fileName,
        fileUrl: cert.filePath,
        rawExtractedData: extracted as any,
        extractionConfidence: String(extracted.confidence),
        requiresReview: extracted.confidence < 0.8,
      });

      created++;
      console.log(`  + Certificate saved!`);
      console.log(`    Issue: ${extracted.issueDate}, Valid until: ${extracted.endDate}`);
      console.log(`    Capacity: ${extracted.capacity}, Practitioner: ${extracted.practitionerName}\n`);

      // Rate limit
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      errors++;
      console.log(`  X Error: ${(err as Error).message}\n`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Files found: ${certFiles.length}`);
  console.log(`Cases matched: ${matched}`);
  console.log(`OCR processed: ${processed}`);
  console.log(`Certificates created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
