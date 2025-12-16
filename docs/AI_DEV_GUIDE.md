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
- **Retry behaviour:** If a transcript arrives before its worker case exists (or fuzzy matching can’t find a confident candidate), the file remains pending and is retried on the next poll/watch cycle. As soon as a matching worker case is available the notes will ingest automatically—no need to re-upload the file.

**Manual test:** while `npm run dev` is running, drop a transcript file such as `transcripts/jane-smith-weekly.txt`. Within a few seconds the server logs `[Transcripts] Ingested ...`, `/api/cases/:id/discussion-notes` returns the new note + insights, and the Case Detail panel shows the latest summary + badges.

## Admin Portal

The Admin Portal (`/admin`) provides system administrators with tools to manage organizations (companies) and insurers. Access requires `admin` role.

### Features
- **Organization Management:** Create, edit, and delete organizations. Assign workers compensation insurers.
- **Insurer Management:** Maintain the list of available insurers (DXC, Gallagher Bassett, EML, Allianz).
- **Role-based Redirect:** After login, admin users are redirected to `/admin`, employers to `/`.

### API Routes (Admin Only)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/organizations` | List all organizations |
| POST | `/api/admin/organizations` | Create new organization |
| GET | `/api/admin/organizations/:id` | Get organization details |
| PUT | `/api/admin/organizations/:id` | Update organization |
| DELETE | `/api/admin/organizations/:id` | Delete organization |
| GET | `/api/admin/insurers` | List all insurers |
| POST | `/api/admin/insurers` | Create new insurer |
| PUT | `/api/admin/insurers/:id` | Update insurer |
| DELETE | `/api/admin/insurers/:id` | Delete insurer |

### Frontend Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | `AdminDashboard` | Admin home with stats |
| `/admin/companies` | `CompanyList` | List all companies |
| `/admin/companies/new` | `CompanyForm` | Create company |
| `/admin/companies/:id` | `CompanyForm` | Edit company |

## Company Self-Service

Employers can manage their own organization profile at `/settings`.

### Features
- View organization details
- Update contact name and phone number
- View assigned insurer (read-only)

### API Routes
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/organization/profile` | Get own organization profile |
| PUT | `/api/organization/profile` | Update contact name/phone |
| POST | `/api/organization/logo` | Upload company logo |

## Logo Upload

Companies and admins can upload logos for organizations. Logos are stored locally in `public/uploads/logos/`.

### Supported Formats
- JPEG, PNG, GIF, WebP, SVG
- Maximum file size: 5MB

### Admin Logo Upload
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/organizations/:id/logo` | Upload logo for any organization |
| DELETE | `/api/admin/organizations/:id/logo` | Remove logo from organization |

### Company Self-Service Logo Upload
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/organization/logo` | Upload logo for own organization |

**Request:** Multipart form data with `logo` field containing the image file.

**Response:** `{ "success": true, "message": "Logo uploaded successfully", "data": { "logoUrl": "/uploads/logos/uuid.png" } }`

## Case Chat (AI Query)

The Case Chat feature allows users to ask natural language questions about individual cases. When viewing a case, click the "Ask AI" button to open the chat panel.

### Quick Queries
The chat panel provides quick-query buttons for common questions:
- **Date of injury** — "What is the date of injury?"
- **Certificates** — "Show me the first and last medical certificates"
- **Recovery trend** — "Is the person recovering, getting worse, or stabilized?"
- **RTW plan** — "What is the current return to work plan status?"
- **Compliance** — "Is the worker compliant with the RTW process?"
- **Next steps** — "What are the recommended next steps for this case?"

### How It Works
1. User asks a question about the case
2. Backend gathers all case context (case info, certificates, timeline, discussion notes)
3. Context is sent to Claude Sonnet 4 with the user's question
4. AI response is displayed in the chat panel

### API Route
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/cases/:id/chat` | Send message, get AI response |

**Request body:** `{ "message": "What is the date of injury?" }`

**Response:** `{ "success": true, "data": { "response": "...", "model": "claude-sonnet-4-...", "usage": {...} } }`

### Context Provided to AI
- Case information (worker name, company, injury type, work status, risk level, compliance indicator)
- Clinical status (RTW plan status, compliance status, specialist status)
- Medical certificates with recovery trend analysis (Improving/Declining/Stable)
- Recent timeline events
- Discussion notes with risk flags
- Previously generated AI summary
