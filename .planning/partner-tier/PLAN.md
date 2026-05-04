# Partner-Tier Implementation Plan

**Worktree:** `wip-partner-tier`
**Branch:** `wip-partner-tier` (off `origin/main`)
**Driving customer:** WorkBetter (HR consultancy)
**Decision record:** [`docs/DECISIONS.md` — 2026-05-04 entry](../../docs/DECISIONS.md)
**Vocabulary:** [`CONTEXT.md`](../../CONTEXT.md)

---

## Why this exists

WorkBetter is a real HR consultancy that wants to use Preventli to manage cases on behalf of their own client employers. WorkBetter's clients themselves do not log in. WorkBetter staff need to log in once and switch between many client orgs. Today the platform supports exactly one organisation per user. This plan adds the partner tier without touching any existing tenant isolation logic.

Read the decision record before executing — it explains the data-model trade-off.

---

## Slice plan (build order)

| # | Slice | What it delivers | Status |
|---|-------|------------------|--------|
| **1** | **Partner login + client picker (this PLAN)** | WorkBetter staff log in, pick a client, manage cases for that client with full employer-equivalent RBAC. Partner brand name + (optional) logo in header. | **Planned, not built** |
| 2 | Worker-facing email branding | Emails to injured workers come from the partner brand instead of "Preventli". Per-partner SPF/DKIM, custom from-address, template overrides. | Deferred |
| 3 | Partner-client self-service intake | WorkBetter's clients log in (limited) to lodge cases via a standardised WIS-style form, replacing their current ad-hoc emails. | Deferred |
| 4 | Custom subdomain / domain | `workbetter.preventli.app` or `portal.workbetter.com.au`. | Deferred |
| 5 | Partner-admin UI | WorkBetter manages which of their staff users see which clients, without engineering. | Deferred |

Slices 2–5 are listed so the data model in Slice 1 can accommodate them. Each will get its own plan when prioritised.

---

## Slice 1 — Detailed plan

### Goal

A WorkBetter staff member can log in to Preventli, see "WorkBetter" branding in the header, see a sidebar list of the client orgs they have access to, click a client, and manage that client's cases as if they were that client's employer-role user. Existing GPNet direct-employer flow is unchanged.

### Stated assumptions (flag if wrong before executing)

1. **Worker-facing emails stay "Preventli" in this slice.** White-label of worker-facing comms is Slice 2. If WorkBetter requires worker-facing branding before going live, stop and re-plan.
2. **Single partner (WorkBetter only).** The data model supports many; the seed/test path covers one.
3. **Partner-client orgs have no employer-role users of their own.** Only the WorkBetter user acts on them.
4. **Brand name uses existing `organizations.name`.** No new brand columns needed for this slice.
5. **Logo upload is out of scope.** Header shows brand name as text. `organizations.logoUrl` exists but the upload UI is deferred.
6. **GPNet/`support@gpnet.au` flow is untouched.** Existing employer-role users continue to work as today.

### Tasks

#### A. Schema (additive only)

A1. Add `kind: text("kind").$type<'employer' | 'partner'>().notNull().default('employer')` to `organizations` in `shared/schema.ts`.
A2. Add `'partner'` to the `UserRole` type union (line 1037) and update any role-narrowing helpers / Zod schemas that enumerate roles.
A2b. **Add `claimNumber: text("claim_number")` (nullable)** to `workerCases` in `shared/schema.ts:821` (per Paul, 2026-05-04). NULL = preventative case, populated = injury case with WorkCover claim. Existing rows can stay NULL (or back-populated if there's an existing signal to determine claim status). See `CONTEXT.md` → "Case Tracks" → "Preventative" for rationale.
A3. Create new table `partner_user_organizations`:
    - `userId varchar references users.id (cascade)`
    - `organizationId varchar references organizations.id (cascade)`
    - `grantedAt timestamp default now()`
    - `grantedBy varchar references users.id` (nullable — system seeds may have no granter)
    - Composite primary key on (`userId`, `organizationId`)
    - Index on `userId` for picker query
A4. Generate migration with `npm run drizzle:generate`. Verify the generated SQL is purely additive (no DROP, no ALTER on NOT NULL columns).

**Verification gate before A5:** read the generated migration, confirm additive only, run on a scratch DB, confirm no existing data is mutated.

A5. Apply with `npm run db:push` to local dev DB.

#### B. Backend session & middleware

B1. Add `activeOrganizationId: string | null` to the JWT payload and session shape. Default `null` for partner users on initial login; equals `users.organizationId` for non-partner users (so existing routes get the right value with no code changes for them).
B2. Add a middleware `resolveActiveOrganization` that runs after auth and sets `req.activeOrganizationId`:
    - Non-partner user → `users.organizationId`
    - Partner user with `activeOrganizationId` in JWT → that value, but verify it's still in `partner_user_organizations` for this user (revocation safety)
    - Partner user without active org → `null` (only the picker route is allowed)
B3. Add a route guard `requireActiveOrganization` that 403s if `req.activeOrganizationId` is null. Apply to all existing case/cert/action routes that currently filter by `req.user.organizationId`. Replace those filters with `req.activeOrganizationId`.
B4. New endpoint `POST /api/partner/active-org` — body `{ organizationId }`. Verifies the org is in the user's access table, mints a fresh JWT with `activeOrganizationId` set, returns it (or sets cookie). Use existing CSRF protection.
B5. New endpoint `GET /api/partner/clients` — returns the list of client orgs (id, name, logoUrl, basic case count) for the calling partner user. Used by the picker.

**Critical: do not change existing employer-role behaviour.** All existing routes continue to filter the same way; they just read `req.activeOrganizationId` (which equals `users.organizationId` for non-partners) instead of `req.user.organizationId`.

#### C. Auth flow

C1. Login response includes the user's role. Frontend already routes by role.
C2. Add a route `/partner/clients` (the picker page) that requires `role === 'partner'`.
C3. On successful login of a partner-role user, redirect to `/partner/clients` instead of the default employer dashboard.
C4. On selecting a client (POST `/api/partner/active-org`), reload with the new JWT and navigate to the existing case dashboard route. From here the existing employer UI works as-is.
C5. **Password change (per Paul, security baseline):** add a "Change password" page accessible from the partner header (and applicable to all roles, not partner-specific). Endpoint `POST /api/auth/change-password` — body `{ currentPassword, newPassword }`. Verify current password, hash new, invalidate other refresh tokens for this user. Reuse existing bcrypt config and the `passwordResetTokens`/`refreshTokens` infrastructure. Standard rate-limit. If a "change password" flow already exists for other roles, expose it to partner users — don't rebuild.

#### D. Frontend — client picker

D1. New page `client/src/pages/PartnerClientPicker.tsx`:
    - Fetches `GET /api/partner/clients`
    - Renders a sidebar list (client name, optional logo, open case count badge)
    - Click → POST `/api/partner/active-org`, then navigate to `/cases` (or the existing employer dashboard route)
    - Empty state: "No clients assigned. Contact your partner admin." (no admin UI yet — manual DB seed is fine for MVP)
D2. Standard shadcn/ui components, Tailwind, TanStack Query — match existing patterns. No new design system work.

#### E. Frontend — header

E1. Header component reads `organizations.name` for the *partner org* (from JWT or a new `GET /api/me/partner` endpoint) and the *active client org name* (from a new `GET /api/me/active-org` endpoint or include in JWT).
E2. For partner users: header reads `"{partnerName} | {activeClientName}"` (e.g. `"WorkBetter | Acme Pty Ltd"`).
E3. For non-partner users: header unchanged.
E4. Add a "Switch client" link in the header that returns to `/partner/clients` (clears `activeOrganizationId`).

#### F. Seed & manual smoke

F1. Add a seed script `server/seed-workbetter.ts` (gitignored env values for any secrets) that creates:
    - One partner org: `WorkBetter` (`kind = 'partner'`, `logoUrl = '/assets/workbetter-logo.png'` if the file exists at `attached_assets/workbetter-logo.png`)
    - Two client orgs: `Alpine Health` and `Alpine MDF` (`kind = 'employer'`)
    - **Primary** partner user (per Paul, dev-only credentials): login `workbetter` (email: `workbetter@workbetter.com.au` if email-based auth is required), password `workbetter123`, `role = 'partner'`, `organizationId = workbetter.id`. Access rows: BOTH `Alpine Health` AND `Alpine MDF` (demo path — both visible in picker).
    - **Scoping-test** partner user: `workbetter-scoped@workbetter.com.au` / `workbetter123`, `role = 'partner'`, `organizationId = workbetter.id`. Access row: `Alpine Health` only. Used in verification step 5 to prove the access table actually gates visibility.
    - ⚠️ These credentials are **for local dev seed only**. Do NOT commit them to any production seed script. The seed file should read from env vars in any non-dev environment, or be excluded from production builds entirely.
    - Minimal smoke-test cases: one trivial case in each client (Task G covers the realistic demo data).
F2. Run the seed against local dev DB.

#### G. Demo seed — realistic worker data (per Paul, 2026-05-04)

Goal: WorkBetter's demo lands on a portal that *looks like a real consultancy already managing real workers*, not an empty shell.

**Per company (Alpine Health and Alpine MDF), seed 5 workers across the three case tracks** (see `CONTEXT.md` → "Case Tracks"):

| Track | Count per company | What gets seeded |
|---|---|---|
| **Pre-employment** | 1–2 workers | A `workers` row + a `pre_employment_assessments` row with assessment type, status (mix of pending/in-progress/cleared), components, and a clearance level. At least one with attached health-history rows. |
| **Injury management** | 2 workers | A `workers` row + a `worker_cases` row with a claim number, at least one `medical_certificate`, at least one `case_action` open, an active RTW plan if Phase 5/6 RTW data exists, and audit events. Vary the lifecycle stage (one early, one mid-recovery). |
| **Preventative** | 1–2 workers | A `workers` row + a non-claim case representation. **Build session must confirm with Paul how preventative (non-claim) cases are stored before writing this** — see CONTEXT.md "Open question for build session". Likely `worker_cases` with no claim number; may need schema work. |

Total: **10 workers across both companies**, with roughly 3 pre-employment + 4 injury + 3 preventative split across the two companies. Realistic worker names (use any reasonable Australian-name generator), realistic injury descriptions (sprain/strain, cumulative back, mental health for injury management; common chronic conditions for preventative).

**This task is the bulk of the demo prep work.** Likely L (~20%) on its own. If Slice 1 partner code (A–F) blows budget, **G is the natural cut point** — partner-tier code can ship and be smoke-tested without the full demo seed. The full G seed can run in a follow-up session before the WorkBetter demo.

**Verification for G:**
- Login as primary WorkBetter user → pick Alpine Health → see ~5 workers across the three tracks. Pre-employment list non-empty, case list non-empty, preventative list non-empty (or wherever it surfaces in the UI).
- Pick Alpine MDF → same shape, different worker names.
- All three feature areas (pre-employment, injury management, preventative) clickable and show realistic data.

#### H. Live demo walkthrough (per Paul, 2026-05-04)

A documented end-to-end demo script that the build session leaves runnable for Paul. The script exercises the partner-tier and produces a real artifact landing in Paul's inbox so he can play the worker side.

H1. Write `.planning/partner-tier/DEMO-SCRIPT.md` with step-by-step:
    1. Log in as `workbetter@workbetter.com.au` / `workbetter123`
    2. Sidebar shows Alpine Health and Alpine MDF
    3. Click Alpine Health → land in case dashboard, header reads "WorkBetter | Alpine Health"
    4. Pick one of the Alpine Health workers (chosen during seed)
    5. Initiate the appropriate **check** (pre-employment, injury, or preventative — pick whichever flow is most polished today; pre-employment is likely the cleanest)
    6. The system sends a real email to `paul.hopcraft@gmail.com` with the worker-facing link
    7. Paul clicks the link, fills out the check as the worker, submits
    8. WorkBetter user refreshes the case → sees the submitted check, can mark complete / set clearance / etc.
    9. Switch client → Alpine MDF → header updates, only Alpine MDF data visible
    10. Change password → log out → log in with new password → success
H2. The script must run against the local dev DB with the seed data from F + G. No external dependencies beyond outbound email (already configured for Preventli — confirm SMTP/SES is wired for dev or use a dev-mode email log).
H3. If the email infra is not configured for the dev environment, the script falls back to "the link that *would* be emailed is logged to console — copy and paste it" — flag this in the script. Don't block on email infra.
H4. **Worker-facing form copy (per Paul, 2026-05-04):** when the worker opens the link from the email and fills out the check, the form should NOT ask "Company name" as a free-text field. The system already knows:
    - Which partner (WorkBetter) sent this (from the case's `organizationId` chain)
    - Which client of that partner the case belongs to (the case's `organizationId`)
    Instead, ask "Who is your employer?" and:
    - **Known worker / case already attached to a client org:** pre-fill the client org name (e.g. "Alpine Health"), worker confirms.
    - **Unknown worker / case not yet attached:** present a dropdown of the partner's client orgs ("Select your employer: Alpine Health / Alpine MDF").
    Either path, the worker NEVER types "WorkBetter" — that's the partner brand they receive the email from, not their employer. Partner identity is implicit, employer (= partner's client) is the data we capture.

    Likely touches: worker-facing intake/check form components in `client/src/pages/` (find by searching for the existing "company name" field). Small copy + pre-fill logic, not a structural change. Defer to whichever check flow Task H exercises (probably pre-employment first).

**Verification for H:**
- The build session runs the script themselves end-to-end against the local DB and quotes evidence (each step's outcome) in the build session's verification message.
- Paul receives the actual email at `paul.hopcraft@gmail.com` (or if dev email not configured, the fallback link works).
- Each step in DEMO-SCRIPT.md has a checkbox the build session ticks during their own run.

### Verification (this is the closure criterion for Slice 1)

Run all of these manually after F2. Quote the actual evidence in the build session's verification message — do not claim done from inference.

1. **Login as `paul+workbetter@preventli.test`.** Land on `/partner/clients`, NOT `/cases`. Sidebar shows Acme only (Bravo absent because no access row).
2. **Header reads "WorkBetter".**
3. **Click "Acme Pty Ltd".** Land on the existing `/cases` (or equivalent) dashboard. Header now reads `"WorkBetter | Acme Pty Ltd"`.
4. **`GET /api/gpnet2/cases`** (or whatever the dashboard's data endpoint is) returns only Acme's cases. Bravo's seed case is absent.
5. **Manually call `POST /api/partner/active-org` with `organizationId = bravo.id`** → 403 (no access row).
6. **Manually call any case-write endpoint with no `activeOrganizationId` set** → 403 (the picker is mandatory).
7. **Click "Switch client" in header** → land back on `/partner/clients`.
8. **Log in as an existing GPNet employer-role user (any seed account).** Behaviour is identical to before this change. Header is unchanged. Routes go to the existing dashboard. No regressions.
9. **`npm run build` passes.** TypeScript clean.
10. **Existing test suite passes:** `npm test`. New tests for the partner middleware + access-table scoping are nice-to-have but not required for Slice 1.
11. **Password change works:** logged in as `workbetter@workbetter.com.au`, change password from `workbetter123` to a new value, log out, fail to log in with old password, succeed with new password.
12. **Admin cross-org visibility (verification, not new code):** log in as the existing platform `admin` role (Paul's admin account). Confirm admin can see cases across BOTH WorkBetter's clients (Alpine Health, Alpine MDF) AND existing GPNet clients in whatever cross-org admin views exist today. If admin views are currently scoped to a single org, that's a pre-existing gap — flag it as a separate ticket, do NOT bolt cross-org admin into Slice 1.

If any of 1–9, 11–12 fails, the slice is not done.

### Out of scope for Slice 1 (do not build)

- Logo upload UI
- Partner-admin UI (managing access table from the app — manual DB seed is fine for MVP)
- Worker-facing email branding
- Custom domain / subdomain
- Partner-client self-service intake form
- Audit field `acting_as_partner_user_id` on case writes (data model supports it later)
- Per-org-per-user permission scoping (current access table is binary)
- Multi-partner UX polish (single-partner MVP)

If any of these get added during execution, stop and either expand the slice contract or defer.

---

## Estimated execution effort

Rough sizing for the build session(s) that follow this plan:

- A. Schema: **S** (~5%) — purely additive, low risk
- B. Backend middleware: **M** (~12%) — touches every employer-scoped route, but mechanical
- C. Auth flow: **S** (~5%)
- D. Picker page: **S** (~5%)
- E. Header: **S** (~5%)
- F. Seed + smoke: **S** (~5%)

**Total: ~37% projected context**, fits comfortably in one execution session if no scope creep.

If the executor finds the route-rewrite in B is wider than expected (e.g. lots of duplicated `req.user.organizationId` references not centralised), split B into its own session and do C–F in a follow-up.

---

## Resume instructions for next session

1. Open this worktree (`D:/dev/preventli/.claude/worktrees/wip-partner-tier`).
2. Read `docs/DECISIONS.md` (latest entry) and this PLAN.md.
3. Confirm the four assumptions in "Stated assumptions" still hold with Paul.
4. Execute tasks A → F in order. Don't skip the schema verification gate.
5. Run all 10 verification steps. Quote evidence.
6. Commit per task (conventional commits, `feat(partner): ...` prefix).
7. Push, open PR against `main`.
