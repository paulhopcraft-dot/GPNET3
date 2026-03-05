# Preventli v1 Feature Scope

**Decision date:** 5 March 2026
**Launch target:** 13 April 2026
**Audience:** Preventli staff only (case managers, clinical, admin)

---

## What ships in v1

### Case Management (Case Managers)
- Cases dashboard — all cases, search, filters, risk scoring
- Case summary — 8 tabs: Summary, Injury, Timeline, RTW Plan, Financial, Risk, Contacts, Recovery
- Medical certificate tracking + review queue
- Compliance engine — deadlines, breach detection, 6 rule types
- Action queue — pending/overdue actions with AI rationale
- Injury date review queue
- Case timeline
- Risk dashboard
- Dispute tracking + multi-claim / related claims (mental health flag)
- Termination workflow — risk checks, documentation package generation
- Contacts tab (treating providers, employer contacts)
- Notifications
- Contextual help system + first-time guided tour

### Return to Work
- RTW planning wizard + pathway selection
- Worker consent capture
- RTW plan detail page
- Functional capacity assessment inputs

### AI & Reporting
- AI case chat (Claude Haiku)
- AI smart summary per case
- AI-generated email drafts
- Reports page + CSV export

### Clinical Assessment Suite
- Injury assessment form
- Mental health assessment
- Functional capacity / restrictions
- Pre-employment assessment
- Prevention assessment
- General wellness check-in
- Exit health check

### Admin (Preventli internal)
- Organisation / company management
- User invite system + RBAC roles
- RTW roles + duties library
- Audit log

### Integrations
- Freshdesk sync (tickets → cases, inbound only)
- Webhook receiver
- Email draft generation (AI)

---

## v1.1 — Employer Portal (next release)
- Employer dashboard (priority action feed — critical/urgent/routine)
- Employer case detail view (RBAC-filtered, no dispute data)
- Submit new case (employer-initiated)
- Workers list
- HR Decisions page
- First-time guided tour (employer variant)

---

## Deferred / Not in scope
| Feature | Reason |
|---------|--------|
| Financials / PIAWE engine | Schema incomplete (spec 23) |
| AI Predictions page | Needs more data and validation |
| Autonomous AI Agents page | Early-stage, not client-ready |
| Insurer portal | Separate product — post-growth |
| Public worker questionnaire | Post-v1.1 |
| Checks / Check-ins module | Not core to v1 use case |
| Sessions management page | Admin-only, low priority |
| Discord analytics | Broken, not relevant to clients |

---

## Feature completeness notes

| Area | Status | Notes |
|------|--------|-------|
| Case management | ✅ Complete | All 12 remediation phases done |
| Compliance engine | ✅ Complete | Needs seed script run (Windows) |
| RTW system | ✅ Complete | Needs db:push for pathway fields (Windows) |
| Termination | ✅ Complete | Documentation package included |
| Certificates | ✅ Complete | |
| Assessment suite | ✅ Complete | All 6 form types built |
| AI / Chat | ✅ Complete | Migrated to portable LLM client |
| Admin | ✅ Complete | |
| Employer portal | ✅ Built | Shipping in v1.1, not v1 |
| Financials | ⚠️ Partial | PIAWE calc not built — deferred |
| Production infra | ✅ Complete | Docker, S3, Sentry, rate limiting |

---

## Pending before v1 launch
1. `db:push` from Windows — applies RTW pathway schema fields
2. `npx tsx server/seed-compliance-rules.ts` from Windows — seeds 6 compliance rules
3. Internal platform testing (Week 2 task)
4. Fix any bugs found during beta testing (Week 3)
