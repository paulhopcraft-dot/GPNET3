# Preventli — Production Launch Checklist

Use this checklist before every staging promotion and production release.
Check each item and record the date/owner for traceability.

---

## Pre-Launch: Secrets & Configuration

- [ ] Copy `.env.example` → `.env` on the target host
- [ ] Replace **all** `CHANGE_ME` placeholders with real values
- [ ] `DATABASE_URL` — points to a **dedicated** production database (never staging)
- [ ] `JWT_SECRET` — minimum 32 chars, generated with `crypto.randomBytes(32).toString('hex')`
- [ ] `SESSION_SECRET` — minimum 32 chars, different from `JWT_SECRET`
- [ ] `OPENROUTER_API_KEY` — valid key with sufficient credits
- [ ] `STORAGE_PROVIDER=s3` — S3/R2 bucket created, IAM key has read+write
- [ ] `SMTP_HOST`, `SMTP_PASS` — SMTP relay configured and tested
- [ ] `SENTRY_DSN` — production Sentry project DSN (separate from staging)
- [ ] `CLIENT_URL` / `APP_URL` — set to the public HTTPS domain
- [ ] `DATABASE_SSL=true` if using managed DB (Neon, RDS, Supabase)

---

## Staging Deployment

```bash
# 1. Fill in .env.staging (no CHANGE_ME values)
nano .env.staging

# 2. Deploy staging stack
./scripts/deploy-staging.sh

# 3. Run integration tests
BASE_URL=https://staging.preventli.com.au \
STAGING_EMAIL=admin@yourdomain.com \
STAGING_PASSWORD=yourpassword \
./scripts/test-staging.sh
```

- [ ] `deploy-staging.sh` completes without errors
- [ ] All 7 integration tests pass
- [ ] Health endpoint returns `{"status":"ok"}` for all subsystems
- [ ] Manual login and dashboard load tested in browser
- [ ] File upload (logo or JD) verified end-to-end
- [ ] Email delivery verified (invite or notification)

---

## Infrastructure Verification

Run after deployment to confirm all subsystems are healthy:

```bash
curl https://staging.preventli.com.au/api/system/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "database": "ok",
  "ai": { "provider": "openrouter", "model": "anthropic/claude-sonnet-4-5" },
  "storage": { "provider": "s3" },
  "email": "ok"
}
```

- [ ] `database: "ok"`
- [ ] `ai.provider` matches `LLM_PROVIDER` env var
- [ ] `storage.provider: "s3"`
- [ ] `email: "ok"` (SMTP reachable)

---

## Control Tower Verification

- [ ] Log in as admin user
- [ ] Navigate to `/admin/control-tower`
- [ ] Overview section loads (cases, users, agent job counts)
- [ ] AI section shows correct provider + model
- [ ] Storage section shows `s3` provider
- [ ] Auth section shows login event counts
- [ ] No red/error panels visible

---

## Security Checks

- [ ] `NODE_ENV=production` is set
- [ ] CSP headers are strict (no `unsafe-eval` in production)
- [ ] Rate limiter active — test: `for i in $(seq 1 250); do curl -s -o /dev/null -w "%{http_code}\n" /api/auth/login; done` — should see 429s
- [ ] Auth endpoints return 429 after 5 failed login attempts in 15 min
- [ ] No `.env` file accessible at public URL
- [ ] No source maps exposed in production build (`/static/js/*.map` → 404)
- [ ] Sentry receiving errors (trigger a test error)

---

## Production Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild image (tag for rollback)
docker tag preventli:latest preventli:backup-$(date +%Y%m%d)
docker compose -f docker-compose.production.yml build app

# Rolling restart
docker compose -f docker-compose.production.yml up -d --no-deps app

# Apply any pending migrations
docker compose -f docker-compose.production.yml exec app npm run db:push

# Final health check
curl https://app.yourdomain.com/api/system/health | jq .
```

- [ ] Image tagged for rollback before deploy
- [ ] Migration ran without errors
- [ ] Health check returns `"status":"ok"` on production URL
- [ ] Integration tests pass against production URL
- [ ] Control Tower shows live data

---

## Post-Launch Monitoring

- [ ] Sentry — error rate baseline established, alerts configured
- [ ] Control Tower — bookmark `/admin/control-tower` for daily ops review
- [ ] Health check cron active (see production-deployment-guide.md)
- [ ] Database backup running (manual or automated cron)
- [ ] Alert webhooks configured (`ALERT_SLACK_WEBHOOK` or `ALERT_TELEGRAM_WEBHOOK`)

---

## Rollback

```bash
# Rollback to previous image
docker tag preventli:backup-YYYYMMDD preventli:latest
docker compose -f docker-compose.production.yml up -d --no-deps app
```

- [ ] Rollback procedure tested on staging
- [ ] Previous image tag recorded before each deploy

---

## Sign-Off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Lead Engineer | | | |
| QA / Test | | | |
| DevOps | | | |
| Product Owner | | | |
