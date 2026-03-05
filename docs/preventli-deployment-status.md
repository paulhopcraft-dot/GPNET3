# Preventli Deployment Status

**Date:** 2026-03-05
**Status:** NOT PRODUCTION READY

---

## Current Deployment Model

**How the system runs today:** Manual process on a single WSL2 machine (Paul's dev box).

```
Developer Machine (WSL2 — Ubuntu)
├── Node.js process  →  npm start (or npm run dev)
├── PostgreSQL       →  docker-compose up (root docker-compose.yml)
│                          ↑ only postgres, no app container
├── Claude CLI       →  /usr/bin/claude (Max plan OAuth, local user)
└── File uploads     →  /mnt/d/dev/gpnet3/public/uploads/ (local disk)
```

### What runs in Docker

```yaml
# root docker-compose.yml — ONLY this service:
services:
  postgres:
    image: postgres:16
    container_name: gpnet-postgres
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
```

The application itself **does not run in Docker**. The `docker/` directory contains generic Dockerfiles (`.node`, `.go`, `.python`, `.python`) that are toolkit templates — they reference a generic app structure and are not wired to Preventli.

---

## Environment Configuration

### .env files present
| File | Purpose |
|---|---|
| `.env` | Active dev config — **contains real credentials** |
| `.env.example` | Template — safe to commit |
| `.env.local` | Local overrides |
| `client/.env` | Frontend env vars |

### .env is excluded from git
`.gitignore` explicitly lists `.env` and `.env.local`. `.env` is not in git history. ✓

### Required environment variables (from `validateSecurityEnvironment`)
```
JWT_SECRET         ✓ set
SESSION_SECRET     ✓ set
DATABASE_URL       ✓ set
```

### Additional env vars in active .env
```
FRESHDESK_DOMAIN               ✓ set
FRESHDESK_API_KEY              ✓ set
ENABLE_NOTIFICATIONS           ✓ set
DAILY_SYNC_TIME / ENABLED      ✓ set
COMPLIANCE_CHECK_TIME / ENABLED ✓ set
AGENTS_ENABLED                 ✓ set
AGENT_COORDINATOR_TIME         ✓ set
AGENT_CERT_EXPIRY_TIME         ✓ set
INBOUND_EMAIL_WEBHOOK_SECRET   ✓ set
DISCORD_WEBHOOK_URL            ✓ set

ANTHROPIC_API_KEY              ✗ NOT SET (SDK requires this)
SMTP_HOST / SMTP_USER / SMTP_PASS ✗ NOT SET (emails silently log)
CLIENT_URL                     ✗ NOT SET (defaults to localhost:5173)
APP_URL                        ✗ NOT SET (defaults to localhost:5173)
```

---

## Infrastructure Gaps

### Missing: Application Dockerfile
There is no production Dockerfile for Preventli itself.

The `docker/Dockerfile.node` is a generic toolkit template:
- References `dist/index.js` — but the server entry is `server/index.ts` (tsx)
- Health check hits `/health` — app serves `/api/system/health`
- No handling of `public/uploads/` mount
- No Claude CLI binary

### Missing: CI/CD Pipeline
No `.github/`, no GitHub Actions, no CircleCI, no any pipeline found.

Every deployment is a manual SSH + pull + restart.

### Missing: Staging Environment
There is no staging environment. All changes go directly from dev to production.

### Missing: Process Manager
No PM2, systemd, or supervisor config found. If the Node process crashes, it stays down.

### Missing: Reverse Proxy
No Nginx, Caddy, or Traefik config. The Node process is exposed directly.

### Missing: TLS/HTTPS
No certificate management. HSTS is enabled in Helmet (good intent) but there is no TLS termination configured.

### Missing: Redis
Rate limiters use in-memory storage. State is lost on restart. Across multiple instances, rate limits are not shared.

### Missing: Object Storage
File uploads go to `public/uploads/` on local disk. These are:
- Lost on container restart (ephemeral filesystem)
- Not replicated across instances
- Not backed up

---

## Environment Separation

| Environment | Status |
|---|---|
| Development | ✓ Working (WSL, manual) |
| Staging | ✗ Does not exist |
| Production | ✗ Does not exist as separate environment |

---

## Deployment Path to Production

To get from current state to production-ready:

### Step 1 — Fix AI Architecture (blocking)
The Claude CLI subprocess (`/usr/bin/claude`, OAuth to `paul_clawdbot`) cannot run in any cloud environment. Must migrate to:
- Anthropic SDK with `ANTHROPIC_API_KEY` (direct, scalable)
- Or OpenRouter / other API gateway (Paul's preference per project history)

### Step 2 — Fix Rate Limiting
- Re-enable auth rate limiter (currently commented out)
- Drop general rate limit from 10,000 to 100–200 per 15 min
- Add Redis for persistent rate limit state

### Step 3 — Build Production Dockerfile
Create a proper `Dockerfile` for the Preventli app:
- Multi-stage build: build TypeScript, run from dist
- Non-root user
- Mount point for uploads (or switch to S3)
- Correct health check path

### Step 4 — Create docker-compose.production.yml
With app + postgres + redis + nginx (TLS termination)

### Step 5 — SMTP Configuration
Configure real SMTP so emails don't silently drop to console.

### Step 6 — Error Monitoring
Add Sentry SDK — single `npm install @sentry/node` + `Sentry.init()` in index.ts.

### Step 7 — CI/CD
GitHub Actions for: test → build → docker push → deploy.

### Step 8 — Database Backup
pg_dump cron job or managed database with automated backups.
