# Preventli Domain Vocabulary

Shared definitions for terms that surface across the codebase. Add a term when it's used in two places with possible ambiguity, or when it's used in conversation with non-obvious meaning. Keep entries short.

---

## Tenancy & Roles

### Organisation
A row in the `organizations` table. The unit of tenant isolation — every case, certificate, action, etc. has an `organizationId` and is scoped to it. Has a `kind` discriminator: `'employer'` (the default and historical case) or `'partner'`.

### Employer (organisation kind)
An organisation whose workers are the subject of cases. Owns its own cases. The historical and default `organizations.kind`. Examples: every existing Preventli customer org.

### Partner (organisation kind)
An organisation that manages cases on behalf of *other* (employer) organisations. Has staff users who log in once and act across many client employers. Example: WorkBetter (HR consultancy).

### Partner-client
The employer organisation that a partner serves. From the platform's perspective it's an ordinary `organizations` row with `kind = 'employer'`. The "partner-client" framing only exists in the partner's own UI ("which of my clients am I working on?"). Partner-client orgs may or may not have their own employer-role users — for the WorkBetter MVP they don't.

### User
A row in the `users` table. Belongs to exactly one organisation via `users.organizationId` (NOT NULL). Has one `role`: `admin | employer | clinician | insurer | partner`.

### Partner user
A user with `role = 'partner'` whose `users.organizationId` points to a partner-kind org. Can be granted access to one or more partner-client orgs via the `partner_user_organizations` access table.

### Active organisation (`activeOrganizationId`)
A session/JWT-scoped value that determines which organisation a *partner user* is currently acting on. For non-partner users this is just `users.organizationId` (no switching). For partner users it must be one of the orgs in their access table; without it they can view the client picker but cannot act on any case.

### Client picker
The page a partner user lands on after login. Lists the partner-client orgs they have access to (sidebar). Selecting one sets `activeOrganizationId` and drops them into that client's case dashboard.

---

## Brands & Surfaces

### Brand name (partner)
The display name a partner shows in the portal they use. Reuses `organizations.name` on partner-kind orgs. Example: "WorkBetter".

### White-label
Showing the partner's brand instead of "Preventli" on user-facing surfaces. **MVP scope:** the portal that the partner *uses* shows the partner brand. **Deferred:** worker-facing emails/SMS, custom domain, custom favicon, hiding "Preventli" entirely.

### Worker-facing surfaces
Anything an injured worker (claimant) sees: emails, SMS, the upload-certificate page they hit from a link in those emails. **For MVP these stay branded "Preventli" regardless of which partner is acting on the case** — deferred slice.

---

## Existing terms (non-partner)

### GPNet
The original Preventli operation: Paul + Natalie's direct clients. These remain on the existing employer flow (`organizations.kind = 'employer'`, no partner involved). They continue to email `support@gpnet.au`. The partner-tier work does not change anything for GPNet clients.

### Worker case
A row in `worker_cases`. Owned by an organisation. The central object the partner-tier scoping ultimately gates access to.
