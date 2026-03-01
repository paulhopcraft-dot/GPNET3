import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { router as api } from './routes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, name: 'gpm3-server', version: '1.6.0' }));
app.use('/api', api);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
app.listen(PORT, () => console.log(`[gpm3] server listening on :${PORT}`));
