import { Router } from 'express';
import { syncFreshdeskOnce } from './sync/freshdeskSync.js';

export const syncRouter = Router();

syncRouter.post('/freshdesk', async (_req, res) => {
  try {
    const result = await syncFreshdeskOnce();
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});
