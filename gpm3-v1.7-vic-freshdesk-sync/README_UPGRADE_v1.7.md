# GPM3 v1.7 (VIC) — Freshdesk → Case Sync

This upgrade layers automatic Freshdesk syncing onto v1.6. It fetches tickets from
**gpnet.freshdesk.com**, merges them into the DB as **cases** and **case_progress**,
and adjusts **risk/compliance** heuristics from ticket notes.

## What's included
- `server/src/integrations/freshdesk.ts` — Freshdesk API client (fetch tickets + contacts)
- `server/src/sync/freshdeskSync.ts` — Sync engine (tickets → cases + progress)
- `server/src/routes-sync.ts` — Manual trigger endpoint `POST /api/sync/freshdesk`
- `server/src/index.ts` — registers new route + starts 10‑min scheduler
- `server/.env.example` — adds Freshdesk env vars for gpnet.freshdesk.com

## Env (.env)
```
FRESHDESK_DOMAIN=gpnet.freshdesk.com
FRESHDESK_API_KEY=YOUR_KEY
FRESHDESK_SYNC_INTERVAL_MIN=10
```

## Run
```bash
# server
npm run dev

# optional manual trigger
curl -X POST http://localhost:5000/api/sync/freshdesk
```
The scheduler runs every `FRESHDESK_SYNC_INTERVAL_MIN` minutes (default 10).
