# Preventli Production Hardening Roadmap

**Date:** 2026-03-05
**Based on:** Full repository audit (`docs/preventli-system-audit.md`)

---

## Priority Matrix

| Priority | Count | Description |
|---|---|---|
| 🔴 Critical | 5 | Must fix before any user traffic |
| 🟠 High | 6 | Fix before commercial launch |
| 🟡 Medium | 5 | Fix in first month of operation |
| 🟢 Low | 4 | Technical debt, fix opportunistically |

---

## 🔴 Critical — Must Fix Before Launch

### C1 — Migrate AI from Claude CLI to API

**Issue:** All AI functionality (chat, agents, summaries, treatment plans) runs via `spawn("/usr/bin/claude")` authenticated to `HOME=/home/paul_clawdbot`. This is a local developer binary, not a server process.

**Impact:** Zero AI functionality in any cloud deployment. This is a complete deployment blocker.

**Fix:**
- Replace `server/lib/claude-cli.ts` with Anthropic SDK or OpenRouter calls
- Replace inline `callClaude()` in `server/routes/chat.ts` with the shared helper
- Replace `server/agents/base-agent.ts` subprocess pattern with SDK
- Add `ANTHROPIC_API_KEY` (or equivalent OpenRouter key) to required env vars
- Remove hardcoded `HOME=/home/paul_clawdbot` and `/usr/bin/claude`

**Files affected:**
- `server/lib/claude-cli.ts` (full replacement)
- `server/routes/chat.ts` (inline callClaude — consolidate to shared helper)
- `server/agents/base-agent.ts` (subprocess → SDK)
- `server/middleware/security.ts` (add AI key to validateSecurityEnvironment)

---

### C2 — Re-enable Auth Rate Limiter

**Issue:** `server/index.ts:74-75` has these lines:
```typescript
// TEMPORARILY DISABLED FOR TESTING - Natalie needs to test compliance system
// app.use("/api/auth/login", authRateLimiter);
// app.use("/api/auth/register", authRateLimiter);
```

This allows unlimited brute-force login attempts. A single bot can exhaust the user database.

**Fix:** Uncomment those two lines. Test with `authRateLimiter` (5 attempts/15min, `skipSuccessfulRequests: true`) — already correctly configured in `security.ts`.

**Files:** `server/index.ts:74-75`

---

### C3 — Fix General Rate Limiter

**Issue:** `server/middleware/security.ts:16` sets `max: 10000` per 15 minutes per IP. At this threshold the limiter provides essentially no protection.

**Fix:** Reduce to `max: 200` for general API endpoints. Tune per route category:
- General API: 200/15min
- Auth endpoints: 5/15min (already configured, just needs enabling)
- AI endpoints: 3/hour (already configured in `aiRateLimiter`)
- Webhooks: 60/min (already configured)

**Files:** `server/middleware/security.ts:16`

---

### C4 — Fix File Storage (Local Disk → Object Storage)

**Issue:** Uploaded files (logos, job descriptions) are written to `process.cwd()/public/uploads/`. In a containerised or cloud deployment this directory is ephemeral. Files are lost on restart or redeployment.

**Fix:** Integrate S3-compatible object storage (AWS S3, Cloudflare R2, DigitalOcean Spaces).

Replace Multer `diskStorage` with `multer-s3` or:
1. Accept upload via multer `memoryStorage`
2. Stream buffer to S3 with `@aws-sdk/client-s3`
3. Store S3 URL in database instead of local path

**Files:** `server/services/fileUpload.ts`

---

### C5 — Fix CSP for Production Build

**Issue:** `server/middleware/security.ts:195-197` enables `'unsafe-inline'` and `'unsafe-eval'` for `scriptSrc` unconditionally — including in production. Comments say "Required for Vite dev server" but the production build is pre-compiled and does not require these.

**Fix:** Check `NODE_ENV` and remove unsafe directives in production:
```typescript
scriptSrc: [
  "'self'",
  ...(process.env.NODE_ENV === "development" ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
  // Add specific nonces or hashes for any inline scripts if needed
],
```

**Files:** `server/middleware/security.ts:193-208`

---

## 🟠 High Priority — Fix Before Commercial Launch

### H1 — Add Production Dockerfile

Create `/mnt/d/dev/gpnet3/Dockerfile` with multi-stage build:
- Stage 1: `node:20-alpine` — install deps, build TypeScript
- Stage 2: `node:20-alpine` — runtime only (no devDeps, no source)
- Non-root user
- `EXPOSE 5000`
- `HEALTHCHECK` hitting `/api/system/health`
- No hardcoded credentials

The existing `docker/Dockerfile.node` is a generic template referencing `dist/index.js` and port 3000. Preventli uses `server/index.ts` (via tsx) and port 5000.

---

### H2 — Add Error Monitoring (Sentry)

**Issue:** Errors are logged to stdout and lost. In production there is no visibility into AI failures, email failures, compliance engine crashes, or agent errors.

**Fix:**
```bash
npm install @sentry/node
```

In `server/index.ts`:
```typescript
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
```

Add to global error handler. Set `SENTRY_DSN` as optional env var (skip if not set).

---

### H3 — Configure SMTP

**Issue:** `server/services/emailService.ts` falls back to `console.log` when SMTP is not configured. In production, email notifications, invite emails, and password resets silently fail.

**Fix:**
1. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` to `.env.example`
2. Add these to `validateSecurityEnvironment()` required list for production
3. Or use a transactional email provider SDK (Resend, Postmark, SendGrid) with simpler config

---

### H4 — Add CI/CD Pipeline

Create `.github/workflows/deploy.yml`:
```yaml
on: [push to main]
jobs:
  test:
    - npm run build (TypeScript check)
    - npm test (vitest)
    - npm run test:e2e (playwright, against staging)
  docker:
    - docker build
    - docker push to registry
  deploy:
    - SSH or platform deploy hook
```

No CI/CD exists currently. Every deploy is manual.

---

### H5 — Add Process Manager

The Node process has no supervisor. If it crashes, it stays down.

**Fix:** Choose one:
- `pm2` — run `pm2 start npm --name preventli -- start`, save config
- `systemd` service unit for the Node process
- Docker `restart: unless-stopped` (simplest if containerised)

---

### H6 — Upgrade Health Check

Current health check at `/api/system/health` returns `{"status":"ok"}` with no actual checks.

**Fix:** Add database connectivity check:
```typescript
app.get("/api/system/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", db: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});
```

Also align Dockerfile `HEALTHCHECK` to use `/api/system/health` (currently `/health`).

---

## 🟡 Medium Priority — Fix in Month 1

### M1 — Add Redis for Rate Limiter State

In-memory rate limiters reset on restart and don't share state across multiple instances. Add `ioredis` + `rate-limit-redis` store.

---

### M2 — Configure PostgreSQL Connection Pool

`server/db.ts` creates a pool with no configuration:
```typescript
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

Add production settings:
```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || "20"),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

### M3 — Remove SVG from Allowed Upload Types

`server/services/fileUpload.ts:36` allows `image/svg+xml`. SVG files can contain `<script>` tags and execute JavaScript when served. Remove SVG from `allowedTypes` for logo uploads.

---

### M4 — Add Staging Environment

Create a separate staging environment (separate DB, separate deployment, same code) to validate changes before production.

---

### M5 — Fix Migration Strategy

Current state: Mix of drizzle auto-generated files and manual SQL files with duplicate numbering. Unclear what is applied to production.

**Fix:**
- Choose one strategy: `drizzle-kit push` (dev-only) OR `drizzle-kit generate` + migration runner
- For production: use `drizzle-kit generate` to produce versioned migration files
- Apply migrations via `drizzle-kit migrate` in CI/CD before deploy
- Document current production schema state

---

## 🟢 Low Priority — Technical Debt

### L1 — Remove Unused Dependencies

- `@pinecone-database/pinecone` — installed, zero usage in server code
- Verify `openai` — minimal usage, confirm which paths actively use it
- Remove or document all unused packages

### L2 — Consolidate Duplicate `callClaude` Implementations

`server/lib/claude-cli.ts` and `server/routes/chat.ts` both implement `callClaude()`. After migrating to SDK (C1), ensure single shared implementation.

### L3 — Add Refresh Token Cleanup Job

`refresh_tokens` table grows indefinitely. Add a cron job to delete expired tokens:
```sql
DELETE FROM refresh_tokens WHERE expires_at < NOW();
```

### L4 — Add Database Backup Strategy

No backup configuration found. For a healthcare compliance system handling WorkSafe data:
- Daily `pg_dump` to S3 (minimum)
- Point-in-time recovery via managed PostgreSQL (recommended)
- Retention: 30 days minimum

---

## Recommended Deployment Architecture (Production)

```
Internet
  │
  ▼
[Cloudflare / CDN / DDoS protection]
  │
  ▼
[Nginx / Caddy] — TLS termination, static file serving
  │  /api/* → proxy_pass to Node
  │  /*      → serve dist/public/ directly
  ▼
[Preventli App — Docker container]
  │ port 5000
  │ ENV: JWT_SECRET, SESSION_SECRET, DATABASE_URL, ANTHROPIC_API_KEY, SMTP_*, SENTRY_DSN
  ▼
[PostgreSQL — managed (RDS/Neon/Supabase)]  +  [Redis — for rate limiter state]
  │
  ▼
[S3 / R2 — file uploads]          [SMTP provider — Resend/Postmark]
```

## Quick Wins (Can Do Today)

1. **Uncomment auth rate limiter** — 2 lines, 5 minutes, immediate security improvement
2. **Drop general rate limit from 10,000 to 200** — 1 line change
3. **Remove `'unsafe-eval'` from production CSP** — 3 lines, high impact
4. **Add Sentry** — `npm install @sentry/node` + 3 lines in index.ts
5. **Add DB health check** — 8 lines in routes.ts
