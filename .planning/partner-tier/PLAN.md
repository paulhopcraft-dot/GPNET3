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
    - One partner org: `WorkBetter` (`kind = 'partner'`)
    - Two client orgs: `Acme Pty Ltd` and `Bravo Logistics` (`kind = 'employer'`)
    - One partner user: `paul+workbetter@preventli.test` with `role = 'partner'`, `organizationId = workbetter.id`
    - Two access rows: that user → Acme only (Bravo deliberately excluded to verify scoping)
    - Two seed cases: one in Acme, one in Bravo
F2. Run the seed against local dev DB.

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

If any of 1–9 fails, the slice is not done.

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
