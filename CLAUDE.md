# GPNet3 - Claude Code Configuration

<!-- Import project instructions -->
@import .claude/CLAUDE.md

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

## Existing Documentation

- `README.md` - Full setup guide
- `docs/AI_DEV_GUIDE.md` - AI assistant workflow
- `docs/spec/` - System specifications (01-29)
- `docs/SECURITY_STATUS.md` - Security implementation status
