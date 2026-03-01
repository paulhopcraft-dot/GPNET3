import { Router } from 'express';
import { casesStore } from './store.js';
import { vicRules } from './vic.js';

export const router = Router();

// Simple list
router.get('/cases', (_req, res) => {
  res.json(casesStore.list());
});

// Get by id
router.get('/cases/:id', (req, res) => {
  const c = casesStore.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

// Compliance placeholder (VIC-only flavor)
router.get('/cases/:id/compliance', (req, res) => {
  const c = casesStore.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const compliance = {
    level: c.risk === 'High' ? 'Low' : 'Medium',
    rationale: 'Placeholder VIC compliance logic — wire to Claude skill later.',
    references: vicRules.references
  };
  res.json(compliance);
});

// Upsert (for demo only)
router.post('/cases', (req, res) => {
  const saved = casesStore.upsert(req.body);
  res.json(saved);
});
