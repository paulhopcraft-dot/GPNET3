# GPM3 v1.6 (VIC) — Upgrade Pack
This pack upgrades **v1.5** to **v1.6** by adding **Drizzle ORM + Postgres** with migrations and seeding.
Apply these files over the existing repo.

## What this adds
- **Drizzle ORM + pg** wired to `DATABASE_URL`
- **Schema**: `cases` + `case_progress`
- **Migrations**: `migrations/0001_init.sql`
- **Seed** script: populates Jacob Gunn + Stuart Barkley
- **Routes updated** to read from DB instead of in-memory store

## Install & migrate
```bash
# From repo root
cd server
npm i drizzle-orm pg
npm i -D drizzle-kit

# Set env
cp .env.example .env
# Edit DATABASE_URL with your Postgres connection string, e.g.:
# DATABASE_URL=postgres://user:pass@localhost:5432/gpm3

# Run migration
npm run db:migrate

# Seed demo data (optional)
npm run db:seed

# Start
npm run dev
```

## Notes
- Existing in-memory `store.ts` remains for reference but is no longer used by routes.
- If you already have data, skip seeding or adapt the seed script.
