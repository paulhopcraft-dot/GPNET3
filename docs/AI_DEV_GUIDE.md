# AI Dev Guide – GPNet3

## Project purpose
GPNet is a claims, compliance, and return-to-work management system. It aggregates Freshdesk tickets into worker cases, tracks medical certificates, and surfaces compliance indicators so clinicians, employers, and insurers can stay aligned.

## Tech stack
- **Backend:** Node.js + Express, TypeScript, Vite middleware for local dev
- **Frontend:** React (Vite), TypeScript, Tailwind CSS
- **Database:** Postgres managed via Drizzle ORM (`shared/schema.ts`)
- **E2E tests:** Playwright (`npm run test:e2e`)

## Branching workflow
1. Always branch from `main`.
2. Name feature branches `wip-gpnet-<feature>` (e.g., `wip-gpnet-claims`, `wip-gpnet-playwright`).
3. Keep commits small and descriptive (`feat: add recovery timeline chart`, `chore: configure Playwright`).

## Git rules
- Never commit `.env`, `.env.local`, or any secrets. Assume credentials stay only in local `.env`.
- Before opening PRs, ensure your branch is up to date with `main`.

## Development commands
| Action | Command / Notes |
| --- | --- |
| Install deps | `npm install` |
| Start dev server (Express + Vite) | Ensure `.env` has `DATABASE_URL`, etc., then `npm run dev` (open `http://localhost:5000`) |
| Migrations | `npm run db:push` (creates tables including `medical_certificates`) |
| Seed demo data | `npm run seed` |
| Freshdesk sync | With env keys set, `POST /api/freshdesk/sync` |
| Playwright E2E | Run dev server, then `npm run test:e2e` (`npm run test:e2e:headed` for debugging) |

## Testing expectations
- **Unit/Integration:** none automated yet—rely on TypeScript checks and manual API tests.
- **Playwright:** verifies the dashboard loads and cases are visible; future tests can cover compliance badges and recovery timelines.

## Safety checklist
- `.env` should define `DATABASE_URL`, `FRESHDESK_DOMAIN`, `FRESHDESK_API_KEY`, `ANTHROPIC_API_KEY` (if AI summaries are needed).
- Never check in secrets or Postgres dumps.
- Confirm `npm run dev` prints “Server listening on http://localhost:5000” before running tests.

## Quick start for a new AI assistant
1. `git checkout -b wip-gpnet-<feature>`
2. `npm install`
3. Configure `.env` with Postgres + external API keys.
4. `npm run db:push` (and `npm run seed` for demo data)
5. `npm run dev`
6. Implement changes, keep commits focused, run `npm run test:e2e` before handing off.

## Transcript Ingestion Module
The Transcript Ingestion Module automatically watches the `transcripts/` directory (synced from Google Drive) and turns new `.txt`, `.md`, or `.vtt` files into structured `case_discussion_notes` records.

- **Watcher + Parser:** `TranscriptIngestionModule` (server/services/transcripts) creates the folder if needed, polls and watches for new files, and parses each transcript into note blocks keyed by inferred worker name. The parser cleans VTT cues, extracts timestamps, summaries, next steps, and risk flags.
- **Case Resolution:** Worker names are matched against `worker_cases` using fuzzy token scoring. When a match is found the notes are written to the `case_discussion_notes` table via Drizzle with deterministic IDs (file path + worker + timestamp hash).
- **Downstream Integration:** Storage now enriches every worker case with `latestDiscussionNotes` and `discussionInsights`, adjusts compliance/risk indicators when transcript notes contain compliance or recovery updates, and exposes `/api/cases/:id/discussion-notes` plus extra payload on the summary endpoints.
- **UI + Reasoning:** The Case Detail panel renders a “Latest Discussion Notes” card (including risk insight badges), and the AI summary prompt includes recent transcript highlights so reasoning incorporates real-world context. Compliance/risk logic receives structured flags directly from the ingested notes.
- **Task Agent Ready:** `TranscriptIngestionModule` accepts an optional `TaskNotificationAgent` so future proactive alerts can reuse the ingestion events without changing the pipeline. The default logging agent simply records events; replace this with real task/email logic in `server/services/transcripts/task-agent.ts`.
- **Testing:** Run `npm test` to execute parser + ingestion insight unit tests (`vitest`), and `npm run test:e2e` (with the dev server running) to verify the Playwright dashboard flow and Latest Discussion Notes card.
- **Sample Transcripts:** Drop `.txt/.md/.vtt` files into `transcripts/` (e.g., `transcripts/jane-smith-weekly.txt`). Within a few seconds the server logs `[Transcripts] Ingested ...`, `/api/cases/:id/discussion-notes` returns the new note + insights, and the Case Detail panel updates.

**Manual test:** while `npm run dev` is running, drop a transcript file such as `transcripts/jane-smith-weekly.txt`. Within a few seconds the server logs `[Transcripts] Ingested ...`, `/api/cases/:id/discussion-notes` returns the new note + insights, and the Case Detail panel shows the latest summary + badges.
