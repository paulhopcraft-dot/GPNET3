# GPNET3 — Full Suite

**Build date:** 2025-11-01T10:10:55.306913

This package extends your repo with the following modules:

- AI-Aware Ticket Summary (notes → embed → case advice)
- Compliance & Case-Intelligence (Claude skills wrappers)
- Recovery Timeline component
- Voice GP placeholder route
- Manager Dashboard widgets (basic)
- RAG helpers (doc ingestion scaffolding)
- `.env.example` for environment variables

## Quick Start

1. Duplicate `.env.example` → `.env` and fill in keys.
2. Install dependencies in both folders (if not already):
   ```bash
   cd server && npm install && cd ../client && npm install
   ```
3. Run dev (example):
   ```bash
   cd .. && npm run dev
   ```

## Endpoints

- `POST /api/case/update` — save note, embed, reanalyse (added)
- `GET  /api/cases` — sample list for dashboard (placeholder)
- `POST /api/voice` — Voice GP placeholder (no external calls)

## New Code Map

- `server/src/db/caseNotes.ts`
- `server/src/routes/caseUpdate.ts`
- `server/src/routes/voice.ts`
- `server/src/routes/cases.ts`
- `server/src/ai/skills/claudeSkillCaller.ts`
- `server/src/ai/skills/claudeComplianceSkill.ts`
- `server/src/ai/rag_docs.ts`
- `server/src/ai/interrogate_sub.ts`

- `client/src/components/TicketSummaryBox.tsx`
- `client/src/components/RecoveryChart.tsx`
- `client/src/components/ManagerRiskBadge.tsx`

Integrate UI components where appropriate in your pages.
