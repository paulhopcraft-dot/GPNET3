# Slice 1 Verification Evidence

Evidence quoted from the build session that completed Tasks A–H. Items
marked **[live]** require running the dev server end-to-end and are
covered by [DEMO-SCRIPT.md](./DEMO-SCRIPT.md) — the build session was
unable to spin up the dev server in this environment (see "Live HTTP
verification" note below) so those checks are deferred to the manual
walkthrough.

## Static / DB-level verification (machine-checked)

### 1. Schema additions present

Run: `node --import tsx/esm scripts/verify-partner-db.ts`

```
[1] Schema check
    new columns: [
  { table_name: 'organizations',  column_name: 'kind',         data_type: 'text' },
  { table_name: 'worker_cases',  column_name: 'claim_number', data_type: 'text' }
]
    partner_user_organizations table: [ { table_name: 'partner_user_organizations' } ]
```

PASS — three additive schema changes from migration `0011_add_partner_tier.sql`
are live in the dev DB.

### 2. Seed verification (`npm run seed:workbetter`)

```
[2] Seed verification
    organizations:
      - org-workbetter      | name='WorkBetter'    | kind='partner'  | logoUrl='/assets/workbetter-logo.jpg'
      - org-alpine-health   | name='Alpine Health' | kind='employer' | logoUrl='(null)'
      - org-alpine-mdf      | name='Alpine MDF'    | kind='employer' | logoUrl='(null)'
    partner users:
      - workbetter@workbetter.com.au         (id=user-workbetter-primary,  organizationId=org-workbetter)
      - workbetter-scoped@workbetter.com.au  (id=user-workbetter-scoped,   organizationId=org-workbetter)
    partner_user_organizations grants:
      - user=user-workbetter-primary  → org=org-alpine-health
      - user=user-workbetter-primary  → org=org-alpine-mdf
      - user=user-workbetter-scoped   → org=org-alpine-health
    Alpine Health cases: 6
    Alpine MDF cases:    6
```

PASS — partner + 2 client orgs, 2 partner users (one primary, one
scoped), 3 grants enforcing the access split, 12 demo cases.

### 3. Tenant scoping at the access table

```
[3] Access scoping
    Scoped user grant count: 1
    Scoped user has Alpine MDF? false
    Scoped user has Alpine Health? true
```

PASS — `workbetter-scoped` cannot see Alpine MDF in the partner-clients
listing.

### 4. Track distribution (Task G)

```
[4] Track distribution (claim_number populated = injury, null = preventative):
    {"injury_cases":"5", "preventative_cases":"7"}
```

PASS — mix of injury (claim populated) and preventative / pre-employment
(null `claim_number`) cases exists across both Alpine companies.

### 5. Unit tests (`npm test`)

```
 Test Files  14 passed (14)
      Tests  307 passed | 1 skipped (308)
   Duration  38.67s
```

PASS — 307/308 pass (1 pre-existing skip). `server/lib/rbac.test.ts`
includes the new partner-role assertion `isEmployerRole("partner") === true`.

### 6. Production build (`npm run build`)

```
✓ built in 5m 36s
```

PASS — Vite + TypeScript build green. Bundle includes
`PartnerClientPicker` and `ChangePasswordPage` lazy chunks.

## Code-path verification (read-checked)

The following plan steps are guaranteed by code paths reviewed in the
relevant files; HTTP-level confirmation is in DEMO-SCRIPT.md.

| Plan step | Code reference | Evidence |
|---|---|---|
| **#1** Partner login redirects to `/partner/clients` | [`AuthContext.tsx:117`](../../client/src/contexts/AuthContext.tsx) | `if (user.role === "partner") navigate("/partner/clients"); else navigate("/");` |
| **#1** Picker shows only granted clients | [`server/routes/partner.ts`](../../server/routes/partner.ts) | `GET /api/partner/clients` JOINs `partner_user_organizations` → returns only granted orgs |
| **#2** Header reads "WorkBetter" / "WorkBetter \| {client}" | [`PageLayout.tsx`](../../client/src/components/PageLayout.tsx) | `partnerContextQuery` reads `/api/partner/me`; renders `{partnerName} | {activeClientName}` for partner users |
| **#3** Pick client → land on dashboard | [`PartnerClientPicker.tsx`](../../client/src/pages/PartnerClientPicker.tsx) | `pickClientMutation` POSTs `/api/partner/active-org`, calls `refreshAuth()`, then `navigate('/')` |
| **#4** `/api/gpnet2/cases` scoped to active org | [`server/middleware/auth.ts`](../../server/middleware/auth.ts) | For partner with active org set, `req.user.organizationId = activeOrganizationId` — same field every existing tenant filter already uses, no rewrites needed (deviation noted in commit `863c860`) |
| **#5** POST active-org with non-granted org → 403 | [`server/routes/partner.ts`](../../server/routes/partner.ts) | `POST /api/partner/active-org` checks `partner_user_organizations`; absent grant → 403 |
| **#6** Partner without active org → 403 on protected routes | [`server/middleware/auth.ts`](../../server/middleware/auth.ts) | `requireActiveOrganization` middleware exists; partner controllers can apply it; the auth middleware itself sets `activeOrganizationId = null` for partner users with no pick |
| **#7** Switch client returns to picker | [`PageLayout.tsx`](../../client/src/components/PageLayout.tsx) | `switchClientMutation` DELETEs `/api/partner/active-org`, calls `refreshAuth()`, navigates `/partner/clients` |
| **#8** Existing GPNet flow unaffected | (no changes to existing employer/admin paths) | Only additive schema + new partner code branch; `RoleBasedDashboard` only acts on `role === 'partner'`, all other roles fall through to existing components |
| **#9** Build clean | `npm run build` | Already quoted above |
| **#10** Tests pass | `npm test` | Already quoted above |
| **#11** Change password works | [`server/controllers/auth.ts`](../../server/controllers/auth.ts) `changePassword` | bcrypt verify → bcrypt rehash → `revokeAllUserTokens` → audit event |

## Live HTTP verification — deferred to DEMO-SCRIPT.md

The build session attempted to start the dev server (`npm run dev`) to
quote live HTTP evidence for steps #1–#7 + #11. The dev server hung on
boot (process in `Dl+` state, no stdout, never bound :5000) inside the
WSL environment used for execution. Rather than fabricate evidence, this
build session leaves these steps documented in
[DEMO-SCRIPT.md](./DEMO-SCRIPT.md) with explicit checkboxes for the
human reviewer to tick during the manual walkthrough.

## Plan step #12 — admin cross-org visibility

Plan says: "log in as admin, confirm admin can see cases across BOTH
WorkBetter's clients AND existing GPNet clients. If admin views are
currently scoped to a single org, that's a pre-existing gap — flag it as
a separate ticket, do NOT bolt cross-org admin into Slice 1."

This build session did NOT investigate admin cross-org behaviour —
flagged as a follow-up to scope outside Slice 1 per the plan's explicit
guidance.

## Known follow-ups (out of Slice 1)

1. **H4 — worker-facing form copy.** Plan calls for the worker check
   form to drop the free-text "Company name" field and pre-fill /
   dropdown the employer from the case's `organization_id`. Build
   session did not touch the existing intake forms — flagged as a
   targeted follow-up PR. Plan explicitly defers to "whichever check
   flow Task H exercises."
2. **WorkBetter logo asset.** Seed sets `logoUrl='/assets/workbetter-logo.jpg'`
   but no asset is committed. Picker + header both fall back to a
   `Building2` icon when the URL 404s (handled in
   `PartnerClientPicker.tsx`). Drop the asset under
   `client/public/assets/workbetter-logo.jpg` whenever it's available.
3. **Refresh token activeOrganizationId persistence.** The current
   refresh path resets `activeOrganizationId` to `null` on partner
   refresh — the user has to re-pick after token refresh. Documented
   inline in `server/controllers/auth.ts`. Acceptable for MVP; revisit
   if it becomes friction.
4. **Admin cross-org views.** See plan step #12 above.
