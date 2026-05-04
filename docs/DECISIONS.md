# Architecture Decision Records

This document tracks key architectural decisions for the Preventli project.

---

## 2026-01-19 - AI Summary Storage Strategy

**Status:** Accepted | **Confidence:** 75%

### Context

The case summary feature generates AI-powered summaries using Claude API. The question arose whether to store these summaries in the database or generate them on-demand.

Current fields stored on `worker_cases`:
- `aiSummary` (text) - Full markdown summary
- `aiSummaryGeneratedAt` (timestamp) - When generated
- `aiSummaryModel` (text) - Model used (e.g., claude-sonnet-4-20250514)
- `aiWorkStatusClassification` (text) - Extracted work status

### Decision

**Keep the current hybrid approach:**

1. **KEEP storing cached summaries** - API calls take 10-60 seconds and cost money
2. **KEEP metadata fields** - For freshness checks and audit trail
3. **KEEP extracting structured data** - Work status classification, action items to `case_actions`
4. **Consider future extraction** - Risk register items, key dates, financial figures could be normalized

### Rationale

| Approach | Latency | Cost | Freshness | Query-ability |
|----------|---------|------|-----------|---------------|
| On-demand only | 10-60s | High | Always fresh | None |
| Cache + refresh | <100ms | Low | Good (refresh on data change) | Partial |
| Structured JSON | <100ms | Low | Good | Full |

The current approach balances UX (fast display) with cost (cached reduces API calls) and maintainability (refresh mechanism via `needsSummaryRefresh`).

### Alternatives Considered

1. **Generate on-demand only** - Rejected due to 10-60s latency per page load
2. **Store as structured JSON instead of markdown** - Deferred; requires parsing logic and migration
3. **Extract all fields to normalized tables** - Partial adoption; action items already extracted

### Consequences

- Summaries may be slightly stale (acceptable for case management)
- Full-text search of summary content not efficient (would need separate search index)
- Action items are queryable via `case_actions` table

### Related Issues

- Model updated from `claude-3-5-sonnet-20241022` to `claude-sonnet-4-20250514` (2026-01-19)
- API credit balance required for summary generation

### Revisit

Revisit if:
- Users report stale summaries as a problem
- Need to query/filter by summary contents
- Storage costs become significant

---

## 2026-05-04 - Partner-Tier Tenancy Model (WorkBetter)

**Status:** Accepted | **Confidence:** 80%

### Context

A real prospective customer (WorkBetter, an HR consultancy) wants to use Preventli to manage cases on behalf of *their* clients (employer organisations). WorkBetter's clients themselves do not log in. WorkBetter staff need to log in once and access many client orgs, switching between them.

The current data model (`shared/schema.ts:1037`) supports four roles — `admin | employer | clinician | insurer` — and pins each user to exactly one organisation via the NOT NULL `users.organizationId`. There is no concept of a user with access to multiple organisations and no organisation-switcher.

The first WorkBetter slice is the foundation; later slices add white-label email branding, partner-client self-service intake (WIS-style form), custom domains, and a partner-admin UI. The data model chosen now must accommodate those without rework.

### Decision

**Adopt a partner role + many-to-many access table model, with a `kind` discriminator on `organizations`.**

1. **New role:** add `partner` to `UserRole` (`admin | employer | clinician | insurer | partner`).
2. **Discriminator:** add `kind: 'partner' | 'employer'` to `organizations`. WorkBetter is itself a row in `organizations` with `kind = 'partner'`. Their clients remain `kind = 'employer'`. Existing employer orgs default to `kind = 'employer'` in migration.
3. **Partner users belong to the partner org:** a WorkBetter staff member has `users.role = 'partner'` and `users.organizationId = workbetter.id`. The NOT NULL invariant is preserved.
4. **Access table:** new `partner_user_organizations(user_id, organization_id, granted_at, granted_by)` enumerates which client orgs each partner user can act on.
5. **Active org in session:** session/JWT carries `activeOrganizationId`. On partner-user login the user is redirected to a client picker; selecting a client sets `activeOrganizationId`. All existing employer-scoped routes already filter by `organizationId` and continue to work unchanged once `activeOrganizationId` is in scope.
6. **Brand surface:** reuse the existing `organizations.name` and `organizations.logoUrl` columns for the partner brand shown in the portal header. No new columns required for MVP.

### Rationale

| Approach | Migration cost | Reversibility | Fits existing tenant isolation | Brand surface |
|----------|----------------|---------------|--------------------------------|---------------|
| **Access table + discriminator (chosen)** | Additive only (new column, new role, new table) | High — feature-flag the role, no existing user affected | Yes — `organizationId` filtering unchanged | Reuses `organizations.name`/`logoUrl` |
| Parent/child orgs (employers nest under partner) | Force-migrate every existing employer org to nest under a synthetic parent | Low — schema-wide change | Requires recursive scoping in every query | Same |
| Make `users.organizationId` nullable for partners | Touches a NOT NULL invariant relied on across the codebase | Medium — but ripples through anything assuming a value | Some queries break | Same |

The access-table model is purely additive — no existing user, organisation, or query is affected. If the partner concept is dropped or restructured later, the `partner` role and the access table can be removed without touching any existing data.

### Alternatives Considered

1. **Parent/child organisations** (option 2 above) — rejected. Forces a global migration of every employer org and adds recursive joins to common queries. Disproportionate cost for an additive feature.
2. **Nullable `users.organizationId`** (option 3 above) — rejected. Removing the NOT NULL invariant ripples through middleware, services, and views that assume a value.
3. **No `kind` discriminator, just access table** — considered. The discriminator is technically redundant (presence in `partner_user_organizations` implies "this user acts on this org"), but the discriminator on `organizations` makes intent obvious in queries, prevents accidentally creating a partner-as-employer ambiguity, and gives a natural home for partner-only fields if they're ever needed (e.g. `partner_settings_json`).
4. **Per-partner `users.partner_id` foreign key instead of access table** — rejected. Partners typically have multiple staff users — that maps cleanly to `users.organizationId = partner.id`. The access table is for the *client → partner-user* mapping, which is genuinely many-to-many.

### Stated Assumptions (flag if wrong before execution)

- **Worker-facing email branding stays "Preventli" in MVP.** The partner brand shows in the portal that the partner *uses*, not in emails sent to injured workers. White-label of worker-facing comms is a deferred slice (per-partner SPF/DKIM, custom from-address, template overrides — non-trivial).
- **WorkBetter's clients do not log in directly.** They have no employer-role users of their own. Only WorkBetter staff act on their behalf. Self-service intake is a deferred slice.
- **Existing GPNet direct clients stay on the existing employer flow** (`organizations.kind = 'employer'`, no partner involved). They continue to email `support@gpnet.au` as today; nothing changes for them.
- **Single partner at MVP** — WorkBetter only. The model supports many partners but the seed/test path covers one.

### Consequences

- A partner-role user logged in without an `activeOrganizationId` cannot perform any case action; they must pick a client first. The picker is mandatory.
- The middleware that resolves "current organisation" for case queries must read `activeOrganizationId` for partner users and `users.organizationId` for everyone else.
- New audit fields (`acting_as_partner_user_id` on case writes) become possible later — useful for "WorkBetter staff member X did Y on behalf of client Z" trails. Out of scope for MVP, but the data is available.
- If a partner user loses access to a client mid-session, the next request with the now-revoked `activeOrganizationId` must 403 cleanly.

### Revisit

Revisit if:
- A partner needs to be a client of another partner (chained relationships) — current model doesn't support this.
- Per-org-per-user permission scoping is needed (e.g. read-only on Client A, full on Client B) — current access table is binary.
- A second partner onboards and `organizations.name` proves insufficient for branding (e.g. needs a separate display name vs. legal name).

### Related

- Plan: `.planning/partner-tier/PLAN.md`
- Schema: `shared/schema.ts:1037` (UserRole), `shared/schema.ts:1730` (organizations)

---
