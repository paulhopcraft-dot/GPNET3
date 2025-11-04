import 'dotenv/config';
import { db } from '../db/client.js';
import { cases, caseProgress } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function upsertCase(id: string, data: any) {
  const existing = await db.select().from(cases).where(eq(cases.id, id));
  if (existing.length) {
    await db.delete(caseProgress).where(eq(caseProgress.caseId, id));
    await db.update(cases).set(data).where(eq(cases.id, id));
  } else {
    await db.insert(cases).values({ id, ...data });
  }
}

async function main() {
  await upsertCase('JACOB-GUNN', {
    workerName: 'Jacob Gunn',
    employer: 'Symmetry HR (Group P/L)',
    injuryDate: '2025-09-11',
    workStatus: 'Suitable duties',
    risk: 'High',
    isWorkCover: true,
    expectedRecoveryDate: '2026-01-20'
  });

  await db.insert(caseProgress).values([
    { caseId: 'JACOB-GUNN', date: '2025-09-18', capacity: 10 },
    { caseId: 'JACOB-GUNN', date: '2025-10-01', capacity: 20 },
    { caseId: 'JACOB-GUNN', date: '2025-10-15', capacity: 30 },
    { caseId: 'JACOB-GUNN', date: '2025-11-01', capacity: 35 },
  ]);

  await upsertCase('STUART-BARKLEY', {
    workerName: 'Stuart Barkley',
    employer: 'DXC Claims Management',
    injuryDate: '2025-09-11',
    workStatus: 'Not working',
    risk: 'High',
    isWorkCover: true,
    expectedRecoveryDate: '2026-03-01'
  });

  await db.insert(caseProgress).values([
    { caseId: 'STUART-BARKLEY', date: '2025-09-20', capacity: 0 },
    { caseId: 'STUART-BARKLEY', date: '2025-10-10', capacity: 0 },
    { caseId: 'STUART-BARKLEY', date: '2025-11-01', capacity: 5 },
  ]);

  console.log('[gpm3] seed complete');
  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
