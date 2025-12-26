# GPNet3 Project Instructions

## Toolkit Version: v3.0 (Context-Optimized Mode)

**Status**: ACTIVE ✓

When v3.0 is active, use the template-based command generation system:
- Read `.claude/v3/context-strategy.json` at session start
- Use templates from `.claude/v3/templates/` instead of individual commands
- Apply meta-prompting with RAG for specialized command generation
- Cache generated commands in `.claude/v3/cache/` for session reuse

**Fallback**: If v3.0 files not found, use v2.4 commands from `.claude/commands/`

---

## Project Overview

GPNet3 is a claims, compliance, and return-to-work (RTW) management system for WorkSafe Victoria compliance. It aggregates Freshdesk tickets into worker cases, tracks medical certificates, and surfaces compliance indicators for clinicians, employers, and insurers.

## Technology Stack

- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React 18 + Vite + TanStack Query
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** JWT + bcrypt + CSRF protection
- **AI Integration:** Anthropic Claude API
- **Testing:** Vitest (unit), Playwright (E2E)
- **UI:** Tailwind CSS + Radix UI + shadcn/ui

## Workflow

1. **Read code** - Understand existing patterns before making changes
2. **Check domain memory** - Review `.claude/domain_memory.json` for feature status
3. **Pick feature** - Select from pending features or user request
4. **Implement** - Follow existing patterns, keep changes focused
5. **Verify** - Run tests, check TypeScript, verify acceptance criteria
6. **Update memory** - Mark features complete in domain_memory.json
7. **Commit** - Use conventional commits, never commit secrets

## Verification Loop

Before completing any task:
- [ ] `npm run build` passes (TypeScript checks)
- [ ] `npm test` passes (unit tests)
- [ ] `npm run test:e2e` passes (E2E tests, if applicable)
- [ ] Manual API test if new endpoint added
- [ ] Acceptance criteria from domain_memory.json met

## Git Discipline

- **Branch naming:** `wip-gpnet-<feature>` (e.g., `wip-gpnet-claims`)
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- **Never commit:** `.env`, `.env.local`, credentials, API keys, tokens
- **Small commits:** One logical change per commit

## Context Management

- Use `/clear` between unrelated tasks to free context
- Reference domain_memory.json for feature dependencies
- Read existing code before suggesting modifications
- Check docs/spec/ for detailed requirements

## Key Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Database schema (source of truth) |
| `server/routes.ts` | API route registration |
| `server/storage.ts` | Database operations |
| `client/src/App.tsx` | React app entry point |
| `server/index.ts` | Express server entry point |

## API Route Structure

```
/api/auth/*          - Authentication (login, register, logout)
/api/gpnet2/cases    - Worker cases (main dashboard data)
/api/cases/:id/*     - Case details, timeline, summary
/api/certificates/*  - Medical certificate management
/api/actions/*       - Case action queue
/api/termination/*   - Termination process workflow
/api/notifications/* - Notification management
/api/webhooks/*      - External webhook handlers
/api/freshdesk/sync  - Freshdesk ticket synchronization
```

## Database Tables

Core tables in `shared/schema.ts`:
- `worker_cases` - Main case records
- `medical_certificates` - Certificate tracking
- `case_actions` - Action queue items
- `termination_processes` - Termination workflow
- `users` - Authentication
- `user_invites` - Invite registration
- `email_drafts` - AI-generated emails
- `notifications` - Alert system
- `audit_events` - Activity logging

## Security Considerations

- All state-changing endpoints require CSRF token
- JWT tokens expire in 15 minutes
- Rate limiting on auth endpoints (5 attempts/15 min)
- Helmet middleware for security headers
- Input validation with Zod schemas
