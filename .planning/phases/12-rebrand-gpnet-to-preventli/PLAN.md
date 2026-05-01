# Phase 12 — Rebrand: gpnet → preventli (structural)

**Status:** Plan written. Tier 1 (cosmetic) already shipped in commit `0e34d14`.
**Owner:** next session
**Estimate:** 2–3 sessions of focused work, atomic commits per tier.

---

## Goal

Eliminate `gpnet` / `GPNET` / `GPNet` from the Preventli codebase wherever it represents the *brand* (not the external Freshdesk tenant). After this phase: only `gpnet` left in code is the Freshdesk tenant identifier and `gpnet.au` email infrastructure (separate concern, mid-flight in master task #1 Phase C).

## What's already done (Tier 1, commit `0e34d14`)

- Logger header comment
- Routes inline comments
- Seed console message + demo file URLs
- Auto-generated contact "company" string
- Two intelligence-agent LLM prompt strings (`integrationOrchestrationAgent`, `businessIntelligenceAgent`)

## Out of scope (do not touch)

| Item | Reason |
|---|---|
| `FRESHDESK_DOMAIN: "gpnet"` in `render.yaml` | External Freshdesk tenant subdomain; renaming requires Freshdesk admin action |
| Anything under `attached_assets/GPNET3-main/**` | Frozen historical import |
| `gpnet.au` email infrastructure (Smartlead, Netregistry DNS, mailbox accounts) | Separate system, master task #1 Phase C is in flight |
| `structure.txt` | Auto-generated tree dump |

---

## Tier 2 — Frontend filenames + imports + internal API names

**Risk:** build-time only. No runtime behavior change. No DB or API contract change.
**Single atomic commit.**

### Files to rename

| From | To |
|---|---|
| `client/src/pages/GPNet2Dashboard.tsx` | `client/src/pages/PreventliDashboard.tsx` (or `CasesDashboard.tsx` — see decision) |

### Symbols to rename (project-wide)

| From | To |
|---|---|
| `GPNet2Dashboard` (component name) | `PreventliDashboard` |
| `getGPNet2CasesPaginated()` (storage method) | `getCasesPaginated()` |
| `getGPNet2Cases()` (storage method) | `getCases()` |
| (any other `GPNet2*` symbol) | drop the `GPNet2` prefix |

### Cookie / storage keys (Tier 2 because frontend-only impact)

| From | To | Migration |
|---|---|---|
| `localStorage` key `"gpnet-ui-theme"` (in `theme-provider.tsx`) | `"preventli-ui-theme"` | Users see default theme once (one-time reset) |

### Decision: route file or page name?

`GPNet2Dashboard` is the *RTW coordinator dashboard*. Rename to **`CasesDashboard.tsx`** — drops the brand entirely (matches the "drop brand from API path" decision below). Future-proof.

### Verification

- `npm run build` passes
- `npm run typecheck` (or `tsc --noEmit`) passes
- All imports resolve

---

## Tier 3 — API routes + auth cookies (BREAKING)

**Risk:** breaks any external API consumer. Must commit server + client together.
**Single atomic commit.**

### API route prefix

`/api/gpnet2/*` → `/api/cases/*`

Drop the brand from the URL path entirely (advisor-recommended: future-proof against any further rebranding).

### Server changes

- `server/routes.ts` — change route registrations (1 definition, several call sites)
- Audit for hardcoded paths in services, schedulers, integrations

### Frontend changes (must ship in same commit)

- All `queryKey: ["/api/gpnet2/cases"]` → `["/api/cases"]`
- All `fetch("/api/gpnet2/cases", ...)` → `fetch("/api/cases", ...)`
- Approximately 20 call sites across `client/src/pages/*` and `client/src/components/*`

### Auth cookies

| From | To |
|---|---|
| `gpnet_auth` | `preventli_auth` |
| `gpnet_refresh` | `preventli_refresh` |

**Impact:** all existing sessions invalidate on deploy. Users will be logged out and need to log in again. Acceptable.

Files: `server/controllers/auth.ts` (constants `COOKIE_NAME`, `REFRESH_COOKIE_NAME`, line ~640 cookie read).

### Verification

- `curl https://gpnet3.onrender.com/api/cases` returns 200 (or 401 — depending on auth) but **not** 404
- Login flow works end-to-end on staging/Render
- Logout flow clears the new cookie names

### Risk mitigation

Dual-route option (recommended): register both `/api/cases/*` AND `/api/gpnet2/*` for one release cycle. Add deprecation log on the old path. Remove old path in a follow-up commit after a week. Trades atomicity for safety. Decision: **do dual-route.**

---

## Tier 4 — Seed users + DB-stored enum values

**Risk:** breaks the working test logins. Requires DB migration for stored enum values.
**Single atomic commit per concern (split into 4a and 4b).**

### Tier 4a — Seed users

| From | To |
|---|---|
| `admin@gpnet.local` | `admin@preventli.local` |
| `employer@symmetry.local` | unchanged (org name, not brand) |
| `doctor@harborclinic.local` | unchanged |
| `natalie@preventli.com` | unchanged |

Files: `server/seed.ts` (lines 443, 594), `scripts/api-test.ts:71`.

**Login impact:** after deploy, `admin@gpnet.local` no longer works. New admin login: `admin@preventli.local` / `ChangeMe123!`. Update `preventli_dev_auth.md` in the same commit.

**Idempotency note:** the seed has an early-exit guard (`fix: make seed idempotent`). It only seeds if no users exist. The Render deploy already has seeded users. So renaming in `seed.ts` alone won't update production. Two options:

1. **Manual rename via SQL:** add a one-time migration script (`scripts/rename-admin-email.ts`) to run via Render shell. Cleaner.
2. **Drop and re-seed:** wipe users table, let seed re-create. Lose all production data. **Don't do this.**

Recommended: option 1 — write a one-time script, document it in the commit.

### Tier 4b — Contact-type enum value

In `client/src/components/{CaseContactsPanel,ContactCard,EmailComposer}.tsx`:

```ts
{ value: "gpnet", label: "Preventli Contact" }
```

The `"gpnet"` is a stored enum value — appears in `worker_cases` or `case_contacts` table rows. Renaming requires:

1. Drizzle schema update (`shared/schema.ts`) if it's a Postgres enum type
2. Data migration: `UPDATE case_contacts SET contact_type = 'preventli' WHERE contact_type = 'gpnet'`
3. Frontend update of all 3 files in one commit

**Alternative:** rename to a generic value like `"internal"` — not brand-coupled, future-proof. **Recommended.**

### Dev auth bypass

`server/controllers/auth.ts:272` has `devpass123` bypass. Memory file `preventli_dev_auth.md` documents it. Either:
- Keep as-is (dev only), update memory file with new admin email
- Remove entirely as part of this rebrand (cleaner — but breaks "easy local login")

Decision deferred to next session.

---

## Execution order

1. **Tier 2** (filenames, internal symbols, theme key) — single commit, deploy-safe.
2. **Tier 3** (routes + cookies) — dual-route commit, deploy, verify, then a follow-up commit removing old paths after ~1 week.
3. **Tier 4a** (seed user email rename + migration script) — commit + run migration via Render shell + update `preventli_dev_auth.md`.
4. **Tier 4b** (contact-type enum) — schema migration commit + data migration + frontend update.

Verify Render deploy succeeds and login still works between each tier. Use `gpnet3.onrender.com` until DNS cuts over.

## Final state

After this phase, `grep -ri "gpnet" .` in the repo should return:
- `render.yaml` (Freshdesk tenant — intentional)
- `attached_assets/GPNET3-main/**` (historical, frozen)
- This plan doc + Tier 1 commit messages (historical record)
- Possibly `.planning/` artifacts and old phase docs

Nothing in `client/`, `server/`, `shared/`, or `scripts/` should match.

## Test gate

- `https://gpnet3.onrender.com` (or new URL after DNS) loads
- Login works with `admin@preventli.local` / `ChangeMe123!`
- Cases dashboard loads with cases
- Create case flow works end-to-end
- Existing E2E suite passes (`tests/e2e/preventli-e2e.spec.ts`)
