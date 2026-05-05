# Partner-Tier — Slice 2: Self-service client setup

**Worktree:** TBD (new worktree off `origin/main` — Slice 1 already merged)
**Branch:** `wip-partner-client-setup` (suggested)
**Driving customer:** WorkBetter (need to onboard their own clients without us)
**Predecessor:** Slice 1 (PR #33 merged 2026-05-04) — partner login, picker, header context strip
**Vocabulary:** [`CONTEXT.md`](../../CONTEXT.md)

---

## Why this exists

Slice 1 shipped with WorkBetter's two clients (Alpine Health, Alpine MDF) hard-coded in `server/seed-workbetter.ts`. Adding a third client today requires an engineer: edit the seed, redeploy, hope the boot script does the right thing. That doesn't scale past the demo.

Slice 2 lets a logged-in partner user create a new client org from the UI, capturing enough information up-front that the operations team can actually run a case for that client (insurer, policy number, RTW coordinator, notification emails, address). Editing an existing client is the same form.

This is also the first slice where partner users **write** organisation-level data, so the access checks in `server/middleware/partnerAuth.ts` (or wherever Slice 1 landed them) need to be confirmed as enforcing on writes, not just reads.

---

## Slice plan recap

| # | Slice | Status |
|---|-------|--------|
| **1** | Partner login + client picker | **Shipped** (PR #33, commit `7a53e97`) |
| **2** | **Partner self-service client setup (this PLAN)** | **Planned, not built** |
| 3 | Worker-facing email branding | Deferred |
| 4 | Partner-client self-service intake | Deferred |
| 5 | Partner-admin UI (manage which staff see which clients) | Deferred |
| 6 | Custom subdomain / domain | Already in flight via Render rename → `app.preventli.ai` (handoff in `claude-progress-current.txt`) |

---

## Goal

A logged-in WorkBetter user can:

1. Click **"+ Add client"** on the client picker page (`/partner/clients`).
2. Fill in a single form capturing identity, location, insurer, key contacts, notification emails, and operational metadata.
3. Submit → new `organizations` row created with `kind = 'employer'`, automatically linked into `partner_user_organizations` for the calling user, and the picker refreshes to show it.
4. Click **"Edit"** on any client tile → same form pre-filled → save updates.
5. Pick the new client and immediately use it (cases tab is empty but functional).

GPNet direct-employer flow is unchanged — they don't see the Add/Edit affordances because they're scoped to a single org.

---

## Stated assumptions (flag if wrong before executing)

1. **Single creator, no team-share yet.** A client created by partner user `A` is only visible to user `A` until Slice 5 ships partner-admin UI. WorkBetter currently has 1 active partner user (`workbetter@workbetter.com.au`), so this is fine. The scoping-test user (`workbetter-scoped@…`) won't see clients created by the primary user. Document this clearly in the PR description.
2. **No "claim existing org".** If WorkBetter accidentally creates an Alpine Health duplicate, we'll merge in the DB. Don't build de-dup UI in this slice.
3. **No invite-first-user flow.** Slice 2 doesn't email anyone. No employer-role login is created for the new org (per Slice 1 assumption #3 — partner-clients have no employer-role users of their own yet).
4. **Insurer is a dropdown from existing `insurers` table.** Adding new insurers is admin-only and out of scope. If WorkBetter needs an insurer that isn't seeded, they ping us — we add it manually.
5. **Address is flat columns**, not JSON. Australian-only fields (`state` constrained to AU states). No multi-site / multi-address support — that's Slice 5+ if it ever happens.
6. **Notification emails as comma-separated string**, not a related table. Cheap to ship; refactor if a multi-recipient feature later needs structured rows.
7. **Audit logging uses the existing `audit_events` table.** Don't invent a new audit channel.
8. **No file uploads.** Logo URL stays as a text input pointing at an existing asset path. Logo upload UI is still deferred (Slice 1 carried it forward; Slice 2 doesn't change that).

---

## Tasks

### A. Schema (additive, all nullable)

A1. Extend `organizations` in `shared/schema.ts:1731`. Every new column is **nullable** so existing rows are valid without backfill:

```typescript
// Identity & legal
abn: varchar("abn", { length: 11 }),                                // 11-digit AU Business Number
worksafeState: text("worksafe_state").$type<'VIC'|'NSW'|'QLD'|'WA'|'SA'|'TAS'|'ACT'|'NT'>(),
policyNumber: text("policy_number"),
wicCode: varchar("wic_code", { length: 20 }),                       // WorkSafe Industry Classification

// Location (flat, AU-only)
addressLine1: text("address_line_1"),
addressLine2: text("address_line_2"),
suburb: text("suburb"),
state: text("state").$type<'VIC'|'NSW'|'QLD'|'WA'|'SA'|'TAS'|'ACT'|'NT'>(),
postcode: varchar("postcode", { length: 4 }),

// Insurer extension (insurerId already exists at line 1740)
insurerClaimContactEmail: text("insurer_claim_contact_email"),

// People (contactName/Phone/Email at 1737–1739 stay as 'primary contact')
rtwCoordinatorName: text("rtw_coordinator_name"),
rtwCoordinatorEmail: text("rtw_coordinator_email"),
rtwCoordinatorPhone: varchar("rtw_coordinator_phone", { length: 50 }),
hrContactName: text("hr_contact_name"),
hrContactEmail: text("hr_contact_email"),
hrContactPhone: varchar("hr_contact_phone", { length: 50 }),

// Notifications (comma-separated; trimmed + lowercased on write)
notificationEmails: text("notification_emails"),

// Operational metadata
employeeCount: text("employee_count").$type<'1-10'|'11-50'|'51-200'|'201-500'|'500+'>(),
notes: text("notes"),
```

A2. Generate migration: `npm run drizzle:generate`. Confirm the SQL is purely `ALTER TABLE organizations ADD COLUMN ... NULL` with no DROP / NOT NULL / type changes.

A3. **Inline the migration SQL into `server/seed-workbetter.ts`** (same pattern as Slice 1's `PARTNER_TIER_MIGRATION_SQL`) — Render's Dockerfile still doesn't copy `migrations/` or `scripts/`, and we still don't have a real migration runner. The next slice that adds another migration is the right place to fix the runner; not this one.

A4. Apply locally: `npm run db:push`.

**Verification gate before A5:** read the generated migration, confirm additive only, run on a scratch DB, confirm no existing rows are mutated.

A5. Commit schema + generated migration.

### B. Backend — endpoints

B1. **`POST /api/partner/clients`** — body validated by Zod schema mirroring the new columns. Behaviour:
- Auth-only-partner middleware (reuse Slice 1 partner check; a partner user is the only role that can create a partner-client org).
- Generate `slug` from `name` (kebab-case; append `-2`, `-3` if collision).
- `kind = 'employer'` (always — partners only create employer-tier clients).
- `isActive = true`.
- Insert in a transaction with `partner_user_organizations` row linking the calling user.
- Audit event: `audit_events` row, `event_type = 'partner_client_created'`, actor = `req.user.id`, target = new org id, payload = the inserted row (PII-light: drop email/phone fields from the payload, keep name + state).
- Return the new org row (full).
- Error cases: 400 on Zod failure, 409 on slug collision after retry, 500 otherwise.

B2. **`PATCH /api/partner/clients/:id`** — same Zod schema (all fields optional). Behaviour:
- Auth-only-partner middleware.
- 403 if `:id` is not in `partner_user_organizations` for this user (use the same check Slice 1 already enforces on read).
- 404 if the org doesn't exist or isn't `kind = 'employer'`.
- Update the row (only fields present in the body; partial update).
- Audit event: `event_type = 'partner_client_updated'`, payload = field-level diff (changed fields only, name + state, drop email/phone).
- Return updated row.

B3. **`GET /api/partner/clients/:id`** — single org, full detail. Used by the edit form to pre-fill. Same access check as PATCH.

B4. **Update existing `GET /api/partner/clients`** (Slice 1) to include the new flat fields. The picker only renders `name` + `logoUrl` + open case count today, so the response payload growing is fine — front-end only consumes what it needs.

B5. **Zod schema** lives in `shared/zod/partnerClient.ts` (new file) so both backend route handlers and frontend form share it. Field-level rules:
- `name`: required, ≥ 2 chars
- `abn`: optional, 11 digits, fail validation if non-digit characters
- `state` / `worksafeState`: enum of 8 AU codes
- `postcode`: optional, 4 digits
- All emails: standard email pattern via `z.string().email()`
- `notificationEmails`: optional string; `.transform()` splits on comma, trims each, validates each as email, rejoins with `, `; max 10 entries
- `employeeCount`: enum of bands listed in A1
- `notes`: max 2000 chars

### C. Frontend — list + add affordance

C1. On `client/src/pages/PartnerClientPicker.tsx`:
- Add a **"+ Add client"** button (top-right of the client list).
- Add an **"Edit"** affordance per client tile (small icon button or hover affordance — match existing patterns; don't invent design).

C2. Click "+ Add client" → opens a `ClientSetupForm` (modal or sheet — pick whichever shadcn component the codebase already uses for similar create flows; don't introduce a new pattern).

C3. Click "Edit" → opens the same form, pre-fetched from `GET /api/partner/clients/:id`.

C4. On successful save: close form, invalidate the picker query, toast confirmation.

### D. Frontend — form

D1. New component `client/src/components/partner/ClientSetupForm.tsx`:
- `react-hook-form` + the shared Zod schema from B5.
- Sections (visual grouping, NOT separate pages — keep it one scrollable form):
  1. **Identity** — name, ABN, employee count
  2. **Address** — line 1, line 2, suburb, state (dropdown), postcode
  3. **Insurer & policy** — insurer (existing dropdown from `/api/insurers`), worksafe state, policy number, WIC code, claim contact email
  4. **Primary contact** — name, email, phone (these reuse the existing `contactName/Email/Phone` columns — they're the day-to-day contact)
  5. **RTW coordinator** — name, email, phone
  6. **HR contact** — name, email, phone
  7. **Notifications** — notification emails (comma-separated, with helper text "Comma-separated, used for case alerts")
  8. **Notes** — free text, multi-line
- Required fields: only `name`. Everything else optional, but show inline hints ("Required for WorkSafe submission" on `policy_number` etc.) so partners know what to fill.
- Submit button disabled while `isSubmitting`.
- On error (network or validation from the server), show the error inline and don't close the form.

D2. Empty/short field rendering: if a field is null on display (in the picker tooltip or future detail pages), render `—` not empty string.

### E. Seed update (small)

E1. Update `server/seed-workbetter.ts` to populate the new columns for Alpine Health and Alpine MDF with realistic test data. This is only for local-dev sanity — Render's seeded data is the source of truth in prod and won't be re-seeded (Slice 1 PR #35 fixed boot-time wiping).

E2. Add one **new** test client to the local seed that exercises edge cases: empty insurer, no policy number, multiple notification emails. Call it `Alpine Test Empty` so it's obvious it's a test fixture.

### F. Tests

F1. Vitest: `server/routes/__tests__/partnerClients.test.ts`:
- Create as partner → 200, returns row, audit event written.
- Create with malformed ABN → 400.
- Create as non-partner role → 403.
- PATCH a client the user has access to → 200.
- PATCH a client the user does NOT have access to → 403.
- PATCH a non-existent id → 404.
- GET single client → enforces access check.

F2. Existing test suite must still pass (`npm test`). Slice 1's 307/308 baseline stays.

---

## Verification (closure criterion)

Quote evidence in the build session's verification message — don't claim done from inference.

1. **Login as `workbetter@workbetter.com.au`** → land on `/partner/clients`. Existing 2 clients still listed.
2. **Click "+ Add client"** → form opens. Submit with name only → 200, picker now shows 3 clients.
3. **Click the new client** → header reads `"WorkBetter | <new name>"`, cases tab loads (empty list, no errors).
4. **Click "Edit" on the new client** → form opens pre-filled with the row I just created. Add an insurer + policy number + notification emails → save → form closes, picker re-fetches.
5. **Re-open Edit** → confirm the values persisted.
6. **Submit invalid ABN** ("12345") → form shows inline error, no network request fired.
7. **Submit invalid notification emails** ("not-an-email, also-bad") → inline error.
8. **As `workbetter-scoped@workbetter.com.au`** (Alpine Health-only) → confirm the newly-created client is NOT visible in their picker (assumption #1 documented). PATCH attempt against the new client's id → 403.
9. **Audit log:** query `audit_events WHERE event_type IN ('partner_client_created','partner_client_updated')` → see the rows from steps 2 and 4.
10. **`npm run build` passes.** TypeScript clean.
11. **`npm test` passes.** All Slice 2 tests green; baseline maintained.
12. **GPNet direct-employer regression:** log in as an existing GPNet employer-role user → no Add/Edit buttons (they're partner-tier-only). Their dashboard is unchanged.

If any of 1–12 fails, the slice is not done.

---

## Out of scope (do not build)

- **Inviting an employer-role user** for the new client. (Slice 2 just creates the org row; no logins for that org.)
- **Logo upload.**
- **Multi-site / multi-address per org.**
- **Sharing a created client with another partner user** (visible-to-team UI). That's Slice 5.
- **Importing clients from CSV / Freshdesk / Xero.**
- **Soft-delete or archive UI.** A partner can mark `isActive = false` via PATCH if desperate, but no dedicated UI.
- **De-dup / "claim this existing org"** flow.
- **Adding new insurers** (admin-only).
- **PII redaction in audit payload beyond name + state.** Good enough for now; revisit if compliance flags it.
- **Per-field permissions** (e.g. only some partner users can edit insurer info). Binary access today.

If any of these gets added during execution, stop and either expand the slice contract or defer.

---

## Estimated execution effort

- A. Schema: **S** (~5%) — additive, but ~17 columns means a careful migration read
- B. Backend: **M** (~12%) — three new endpoints + one update + Zod schema in shared/
- C. Frontend list: **S** (~5%)
- D. Frontend form: **M** (~12%) — biggest chunk; lots of fields, grouping, validation wiring
- E. Seed: **S** (~3%)
- F. Tests: **S** (~5%)

**Total: ~42% projected context.** Fits in one execution session if the form work doesn't sprawl. If the form's design polish blows out, ship A–C+E+F first (functional but ugly), then F polish in a second session.

---

## Resume instructions for the build session

1. Create a new worktree off `origin/main` (Slice 1 is merged so main is the right base).
2. Read this PLAN, Slice 1's `PLAN.md`, and `claude-progress-current.txt` for the live render env state.
3. Confirm assumptions 1–8 with Paul before writing code. Especially #1 (single-creator visibility) and #6 (notification emails as string) — those are reversible-but-annoying to flip later.
4. Execute A → F in order. Don't skip the schema verification gate.
5. Run all 12 verification steps. Quote evidence.
6. Commit per task (conventional commits, `feat(partner): ...` prefix).
7. Push, open PR against `main`. PR description must call out assumption #1 explicitly so Paul/team know that team-share is deferred.
8. After merge: Render auto-deploys; the inlined migration in seed-workbetter runs on boot once and is idempotent. Verify the new columns exist in prod by hitting `GET /api/partner/clients/:id` against the live Alpine Health row.
