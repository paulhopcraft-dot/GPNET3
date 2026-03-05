# Preventli — Production Readiness Report

**Generated:** 2026-03-05
**Status:** Ready for staging deployment, production checklist complete

---

## 1. Deployment Architecture

```
Internet
   │
   ▼
┌─────────────────────────────────────────────────┐
│  Nginx / Caddy  (TLS termination + proxy)       │
│  - HTTPS on 443, redirects HTTP→HTTPS           │
│  - Proxies /api/* and / to app:5000             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Preventli App Container  (Node 20-alpine)      │
│  - PORT 5000                                    │
│  - Express API + pre-built React SPA            │
│  - Background schedulers (node-cron)            │
│  - Health: GET /api/system/health               │
└──────┬──────────────────────────────────────────┘
       │
       ├──────────────────────────────────────────┐
       │                                          │
       ▼                                          ▼
┌────────────────┐   ┌──────────────┐   ┌────────────────┐
│  PostgreSQL    │   │  OpenRouter  │   │  S3 / R2       │
│  (managed or   │   │  (LLM calls) │   │  (file uploads)│
│   container)   │   └──────────────┘   └────────────────┘
└────────────────┘
       │
       ▼
┌──────────────────────┐   ┌──────────────────────┐
│  SMTP (Resend)       │   │  Sentry              │
│  (transactional mail)│   │  (error monitoring)  │
└──────────────────────┘   └──────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single container | Serves API + SPA; simpler ops, one healthcheck |
| No Redis | Rate limiting is in-memory; add Redis if multi-instance |
| memoryStorage (multer) | Files streamed to S3/R2; no local disk dependency |
| JWT + httpOnly cookies | Stateless auth; safe to restart |
| node-cron schedulers | In-process; only enable on one instance when scaling |

---

## 2. Required Environment Variables

### Critical (app will not start without these)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32 chars, used to sign auth tokens |
| `SESSION_SECRET` | Min 32 chars, used for CSRF cookies |

### AI Provider

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `openrouter` (recommended) or `anthropic` |
| `OPENROUTER_API_KEY` | Required when `LLM_PROVIDER=openrouter` |
| `ANTHROPIC_API_KEY` | Required when `LLM_PROVIDER=anthropic` |
| `LLM_MODEL` | Optional model override |

### Storage

| Variable | Description |
|----------|-------------|
| `STORAGE_PROVIDER` | `s3` for production, `local` for dev only |
| `AWS_S3_BUCKET` | S3 or R2 bucket name |
| `AWS_S3_REGION` | AWS region or `auto` for R2 |
| `AWS_ACCESS_KEY_ID` | IAM or R2 access key |
| `AWS_SECRET_ACCESS_KEY` | IAM or R2 secret key |
| `AWS_S3_ENDPOINT` | R2 endpoint URL (omit for AWS S3) |
| `AWS_S3_PUBLIC_URL` | Optional CDN URL prefix |

### Email

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP relay hostname |
| `SMTP_PORT` | Usually 587 (STARTTLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or API key |
| `SMTP_FROM` | Sender address |

### Monitoring & Alerting

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry project DSN |
| `SENTRY_TRACES_SAMPLE_RATE` | 0.1 for prod, 1.0 for staging |
| `ALERT_SLACK_WEBHOOK` | Slack incoming webhook for ops alerts |
| `ALERT_TELEGRAM_WEBHOOK` | Telegram bot webhook for ops alerts |
| `LOG_LEVEL` | `info` for prod, `debug` for staging |

---

## 3. External Services

| Service | Purpose | Required | Fallback |
|---------|---------|----------|---------|
| PostgreSQL | Primary data store | Yes | None — app won't start |
| OpenRouter / Anthropic | LLM inference | Yes (for AI features) | LLM features disabled |
| S3 / Cloudflare R2 | File uploads | Yes in production | Local disk in dev |
| SMTP relay | Transactional email | Recommended | Emails logged to console |
| Sentry | Error monitoring | Recommended | Errors log to console |
| Freshdesk | Case ingestion | Optional | Manual case entry only |

---

## 4. Alerting Configuration

The `alertService.ts` module sends operational alerts when critical systems fail.

### Alert Types

| Type | Trigger |
|------|---------|
| `database_failure` | DB unreachable on health check |
| `ai_provider_failure` | LLM API unreachable on health check |
| `storage_failure` | S3/R2 unreachable on health check |
| `email_failure` | SMTP send failure |
| `agent_failure_rate` | >30% of agent jobs failing in a window |
| `health_check_degraded` | Health endpoint returns degraded status |

### Alert Channels

1. **Console** — always active, structured JSON log entry
2. **Slack** — set `ALERT_SLACK_WEBHOOK` to a Slack incoming webhook URL
3. **Telegram** — set `ALERT_TELEGRAM_WEBHOOK` to a Telegram Bot API URL

Alerts are stored in-memory (last 100) and visible in the Control Tower at `/admin/control-tower`.

---

## 5. Integration Test Coverage

**Script:** `scripts/test-staging.sh`

| Section | Tests | Notes |
|---------|-------|-------|
| Infrastructure | Health check, all subsystem fields | Fails deployment if degraded |
| Authentication | Login, bad-creds rejection, unauth rejection | |
| Core Data | Cases, workers, notifications, agent jobs | |
| Control Tower | All 6 `/api/control/*` endpoints + field validation | 403 accepted for non-admin |
| Agent Execution | Trigger + poll completion (30s timeout) | |
| AI Provider | Health field + `/api/control/ai` metrics | |
| Storage | Health field + `/api/control/uploads` metrics | |
| Email | Health `email` field check | Unconfigured = skip (non-fatal) |

**Total test count:** ~30 assertions across 8 sections

---

## 6. Control Tower Monitoring

Access: `/admin/control-tower` (admin users only)

| Panel | Refresh | Data Source |
|-------|---------|-------------|
| Overview | 30s | Live DB counts |
| AI Agents | 30s | `agent_jobs` table (24h / 7d) |
| AI / LLM | 30s | Completed job durations |
| File Uploads | 30s | `case_attachments` table |
| System Alerts | 30s | In-memory alert ring buffer |
| Authentication | 30s | `audit_events` table |

### Recommended Daily Checks

1. Open Control Tower — verify no red alert panels
2. Check `Agent Failures (24h)` — should be < 10% of total
3. Check `Login Failures (24h)` — spike may indicate brute-force attempt
4. Check Sentry — review any new errors since last check
5. Verify health endpoint: `curl /api/system/health | jq .`

---

## 7. Deployment Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate-env.sh` | Validate all env vars before any deploy |
| `scripts/deploy-staging.sh` | Full staging deploy: validate → build → start → migrate → test |
| `scripts/deploy-production.sh` | Production deploy with rollback tagging and confirmation prompt |
| `scripts/test-staging.sh` | ~30-assertion integration test suite |

### Typical Workflow

```bash
# Staging
./scripts/deploy-staging.sh

# After manual verification on staging:
./scripts/deploy-production.sh
```

### Rollback

```bash
# List rollback tags
docker images preventli

# Rollback to a specific tag
docker tag preventli:backup-20260305-143022 preventli:latest
docker compose -f docker-compose.production.yml up -d --no-deps app
```

---

## 8. Security Posture

| Control | Status |
|---------|--------|
| Helmet security headers | Enabled |
| CSP `unsafe-eval` | Dev-only |
| JWT expiry | 15 minutes |
| Auth rate limiter | 5 attempts / 15 min per IP |
| General rate limiter | 200 req / 15 min per IP |
| CSRF double-submit | Enabled on all mutations |
| SVG upload blocked | XSS risk — excluded from allowed types |
| SQL injection | Protected via Drizzle parameterized queries |
| Sentry error capture | Enabled when `SENTRY_DSN` set |
| Admin endpoints | Require `role=admin` via `authorize(["admin"])` |
| Webhook endpoints | HMAC signature verification |

---

## 9. Known Gaps / Recommended Next Steps

| Priority | Item |
|----------|------|
| High | Managed PostgreSQL (Neon/RDS) — current docker postgres has no automated backup |
| High | Redis for rate limiter state — current in-memory state resets on restart |
| Medium | Refresh token rotation — current JWT is short-lived but no refresh token cleanup cron |
| Medium | CDN in front of Nginx — static assets currently served by Express |
| Low | Multi-region S3 replication for upload resilience |
| Low | Prometheus/Grafana metrics — Control Tower is good for ops; add structured metrics for SLO tracking |
