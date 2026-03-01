import { Router } from 'express';
import { db } from './db/client.js';
import { cases, caseProgress } from './db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { vicRules } from './vic.js';

export const router = Router();

router.get('/cases', async (_req, res) => {
  const rows = await db.select().from(cases);
  res.json(rows.map(r => ({
    id: r.id,
    workerName: r.workerName,
    employer: r.employer,
    injuryDate: r.injuryDate,
    workStatus: r.workStatus,
    risk: r.risk,
    isWorkCover: r.isWorkCover,
    expectedRecoveryDate: r.expectedRecoveryDate
  })));
});

router.get('/cases/:id', async (req, res) => {
  const id = req.params.id;
  const row = (await db.select().from(cases).where(eq(cases.id, id))).at(0);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const progress = await db.select().from(caseProgress).where(eq(caseProgress.caseId, id)).orderBy(asc(caseProgress.date));
  res.json({
    ...row,
    progress: progress.map(p => ({ date: p.date, capacity: p.capacity }))
  });
});

router.get('/cases/:id/compliance', async (req, res) => {
  const id = req.params.id;
  const row = (await db.select().from(cases).where(eq(cases.id, id))).at(0);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const compliance = {
    level: row.risk === 'High' ? 'Low' : 'Medium',
    rationale: 'Placeholder VIC compliance logic — to be replaced by Claude skill.',
    references: vicRules.references
  };
  res.json(compliance);
});

router.post('/cases', async (req, res) => {
  const body = req.body;
  await db.insert(cases).values({
    id: body.id,
    workerName: body.workerName,
    employer: body.employer,
    injuryDate: body.injuryDate,
    workStatus: body.workStatus,
    risk: body.risk,
    isWorkCover: body.isWorkCover,
    expectedRecoveryDate: body.expectedRecoveryDate
  }).onConflictDoUpdate({
    target: cases.id,
    set: {
      workerName: body.workerName,
      employer: body.employer,
      injuryDate: body.injuryDate,
      workStatus: body.workStatus,
      risk: body.risk,
      isWorkCover: body.isWorkCover,
      expectedRecoveryDate: body.expectedRecoveryDate
    }
  });
  res.json({ ok: true });
});
