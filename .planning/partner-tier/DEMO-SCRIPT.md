# Partner-Tier Demo Script (Slice 1)

End-to-end runbook for demoing the WorkBetter partner-tier flow against
the local dev DB seeded by `npm run seed:workbetter`.

## Prerequisites

```bash
# Apply migration if you haven't already
node --import tsx/esm scripts/apply-migration.ts migrations/0011_add_partner_tier.sql

# Seed WorkBetter + Alpine Health/MDF + 2 partner users + 12 cases (2 smoke + 10 demo)
npm run seed:workbetter

# Start dev server
npm run dev
```

Open `http://localhost:5000` (or whichever port the dev server reports).

## Credentials

| User | Email | Password | Access |
|---|---|---|---|
| Partner — full | `workbetter@workbetter.com.au` | `workbetter123` | Alpine Health + Alpine MDF |
| Partner — scoped | `workbetter-scoped@workbetter.com.au` | `workbetter123` | Alpine Health only |

## Walkthrough

### 1. Partner login lands on client picker
- [ ] Visit `/login`, enter `workbetter@workbetter.com.au` / `workbetter123`
- [ ] Browser navigates to `/partner/clients` (not `/`)
- [ ] Top bar shows "WorkBetter — Partner portal"
- [ ] Two client cards visible: **Alpine Health** and **Alpine MDF**
- [ ] Each card shows an open-case count badge (≥ 1)

### 2. Pick a client → land in dashboard
- [ ] Click the **Alpine Health** card
- [ ] Brief "Switching client…" loader, then navigate to `/`
- [ ] Header strip reads `WorkBetter | Alpine Health`
- [ ] Case dashboard lists Alpine Health cases only — Alpine MDF cases not visible

### 3. Open a case
- [ ] Click any Alpine Health case (e.g. "Alpine Health Injured Worker A")
- [ ] Case detail loads cleanly. Cases come from Alpine Health's `organization_id` only.

### 4. Switch client via header
- [ ] Click **Switch client** button in header
- [ ] Returns to `/partner/clients`
- [ ] Click **Alpine MDF**
- [ ] Header now reads `WorkBetter | Alpine MDF`
- [ ] Dashboard shows Alpine MDF cases only

### 5. Scoped user proves access enforcement
- [ ] Sign out
- [ ] Log in as `workbetter-scoped@workbetter.com.au` / `workbetter123`
- [ ] Picker shows **Alpine Health ONLY**. No Alpine MDF card.
- [ ] Try to POST `/api/partner/active-org` with Alpine MDF id directly — expect 403.

### 6. Change password
- [ ] As `workbetter@workbetter.com.au`, click sidebar **Change password**
- [ ] Submit current `workbetter123`, new `WorkBetter456!` (twice)
- [ ] Success state shows; click "Back to dashboard"
- [ ] Sign out
- [ ] Try old password — fails ("Invalid email or password")
- [ ] Try new password — succeeds, lands on `/partner/clients`
- [ ] Reset for re-runs: `npm run seed:workbetter` restores `workbetter123`

### 7. Worker check (optional — depends on email infra)

> Email infra not validated in this build session. The build script
> exercises the partner-tier API surface end-to-end (verification doc in
> [`VERIFICATION.md`](./VERIFICATION.md)); the worker-side mailto flow
> remains a manual step.

- [ ] As partner user on an Alpine Health worker, initiate a pre-employment
      or general-wellness check from the case detail page.
- [ ] If SMTP/SES is wired in dev, the worker (`paul.hopcraft@gmail.com`)
      receives an email with a tokenised link.
- [ ] If not wired, the link is logged to the dev server console — copy
      and paste it into a browser to play the worker side.
- [ ] Worker form: per H4 of the plan, the "Company name" free-text field
      should be replaced with a pre-filled / dropdown employer field
      sourced from the case's `organization_id`. **This polish is queued
      as a follow-up** (see PR description).

### 8. Existing GPNet flow unaffected (regression check)
- [ ] Log out, log in as any existing GPNet employer-role seed account
      (e.g. `employer@symmetry.local` / `ChangeMe123!`)
- [ ] Header behaves exactly as before — no partner strip, no Switch
      Client button.
- [ ] Routes navigate to the existing employer dashboard; no errors.

## Reset

```bash
npm run seed:workbetter   # idempotent — wipes + re-inserts partner-tier rows only
```

The full GPNet seed (`npm run seed`) is not affected by `seed:workbetter`.
