# GPM3 — v1.5 (VIC‑only)

Monorepo scaffold for the **GPM 3** project, version **1.5**, scoped to **Victoria (AU)**.

## Stack
- **Server:** Node.js + Express + TypeScript
- **Client:** Vite + React + TypeScript + TailwindCSS + Recharts
- **Auth/AI:** Placeholders for Claude/OpenAI skills (wire in later)
- **Data:** Simple JSON store for local dev; swap to Postgres/Drizzle when ready

## Quickstart

### 1) Server
```bash
cd server
npm i
npm run dev
```

Server runs on http://localhost:5000 (configurable via `PORT`).

### 2) Client
```bash
cd client
npm i
npm run dev
```

Client runs on http://localhost:5173 and proxies API calls to the server.

## ENV
Copy `.env.example` to `.env` under **server** with real keys when ready.

## Notes
- This scaffold is **VIC-only**: Worksafe VIC references and basic constants included.
- Includes the **Anticipated Recovery Timeline** line chart on Case Detail.
- Tables are **sortable** and **filterable** (status, risk, WorkCover flag).
- Replace the JSON data layer with Postgres/Drizzle when you connect Freshdesk and other sources.
