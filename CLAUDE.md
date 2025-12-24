# GPNet3 - Claude Code Configuration

<!-- Import project instructions -->
@import .claude/CLAUDE.md

## Autonomous Mode: ENABLED

**User Preference: Operate autonomously with proactive command usage.**

### Automatic (No Permission Required):
- `/prd-check` - Before any changes (regulated healthcare project)
- `/verify` - After completing features
- `/constraints` - For complex features upfront
- Task agents - For efficiency (exploration, verification)
- `/project:status` - When resuming work

### Suggest & Execute:
- `/decide` - High-stakes decisions (announce, then execute)
- `/perspectives` - Major architectural choices (announce, then execute)
- `/project:handoff` - End of session (suggest first)

### Never Without Asking:
- Destructive operations (delete, force push)
- Major architectural changes
- Changing project structure

## Workspace Management

When a task is substantial (>2hrs estimated, >5 files affected, new API endpoints, schema changes, or high priority), create a feature branch and prompt the user to open a new Claude Code window for focused work.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Express + Vite) on port 5000 |
| `npm run db:push` | Apply Drizzle migrations |
| `npm run seed` | Seed demo data |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |

## Key Directories

- `server/` - Express backend (routes, services, middleware)
- `client/src/` - React frontend (pages, components, contexts)
- `shared/schema.ts` - Drizzle ORM schema (source of truth)
- `docs/spec/` - 29 specification documents
- `migrations/` - SQL migration files

## Environment Variables Required

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/gpnet
ANTHROPIC_API_KEY=sk-ant-...
FRESHDESK_DOMAIN=your-domain
FRESHDESK_API_KEY=your-key
JWT_SECRET=your-secret
CSRF_SECRET=your-secret
```

## Product Requirements Document (PRD)

**AUTHORITATIVE REFERENCE:** `docs/PRD/GPNet3-PRD.md` (v1.3)

This PRD is the canonical product contract. All features MUST align with PRD boundaries.

### PRD Compliance Rules

1. **Read Before Implementing**: Read relevant PRD section(s) before starting any feature
2. **Reference PRD Codes**: All commits MUST reference PRD codes (e.g., "PRD-3.5: Certificate Engine")
3. **Verify Boundaries**: Ensure features stay within PRD scope:
   - ✅ Coordination, documentation, advisory support
   - ❌ Legal/liability determinations, medical diagnosis, autonomous decisions, payments
4. **PRD is LOCKED**: Any scope change requires PRD amendment first

### PRD Section Codes

| Code | Section |
|------|---------|
| PRD-1 | Executive Summary & Vision |
| PRD-2 | Stakeholders & Personas |
| PRD-3 | Functional Requirements |
| PRD-4 | Logical Architecture |
| PRD-5 | Data Models |
| PRD-6 | Non-Functional Requirements |
| PRD-7 | Integrations |
| PRD-8 | User Journeys & Workflows |
| PRD-9 | AI & Intelligence Layer |
| PRD-10 | Success Metrics & KPIs |

## Existing Documentation

- `README.md` - Full setup guide
- `docs/AI_DEV_GUIDE.md` - AI assistant workflow
- `docs/spec/` - System specifications (01-29)
- `docs/SECURITY_STATUS.md` - Security implementation status
- `docs/PRD/GPNet3-PRD.md` - **Canonical Product Requirements (MUST READ)**
