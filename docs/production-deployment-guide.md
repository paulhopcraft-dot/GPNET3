# Preventli — Production Deployment Guide

## Prerequisites

- Docker + Docker Compose installed on the host
- Domain name with DNS pointing to the host
- S3 bucket or Cloudflare R2 bucket created
- OpenRouter API key (or Anthropic API key)
- SMTP provider credentials (Resend, Postmark, or SMTP)

---

## Step 1 — Generate Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET (different value)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate POSTGRES_PASSWORD
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

# Generate INBOUND_EMAIL_WEBHOOK_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 2 — Create `.env`

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
nano .env   # or your preferred editor
```

Minimum required for production:
```env
DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD>@db:5432/gpnet3
JWT_SECRET=<generated>
SESSION_SECRET=<generated>

LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...

STORAGE_PROVIDER=s3
AWS_S3_BUCKET=preventli-uploads
AWS_S3_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

CLIENT_URL=https://app.yourdomain.com
APP_URL=https://app.yourdomain.com

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM=noreply@yourdomain.com

SENTRY_DSN=https://...@o0.ingest.sentry.io/0

NODE_ENV=production
```

---

## Step 3 — Build and Start

```bash
# Build the Docker image
docker compose -f docker-compose.production.yml build

# Start services (detached)
docker compose -f docker-compose.production.yml up -d

# View logs
docker compose -f docker-compose.production.yml logs -f app
```

---

## Step 4 — Run Database Migrations

After first start, apply the database schema:

```bash
# Push schema to database
docker compose -f docker-compose.production.yml exec app npm run db:push

# (Optional) Seed demo data
# docker compose -f docker-compose.production.yml exec app npm run seed
```

---

## Step 5 — Verify Health Check

```bash
curl https://app.yourdomain.com/api/system/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 45,
  "database": "ok",
  "ai": { "provider": "openrouter", "model": "anthropic/claude-sonnet-4-5" },
  "storage": { "provider": "s3" }
}
```

If any field shows an error, check the relevant env vars and service logs.

---

## Step 6 — Configure Nginx (Recommended)

Create `/etc/nginx/sites-available/preventli`:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    # TLS — managed by Certbot or Caddy
    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    # Proxy API to Express
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;  # Allow time for AI calls
    }

    # Everything else → Express (serves pre-built React SPA)
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Deployment Workflow

### Deploy a New Version

```bash
# Pull latest code
git pull origin main

# Rebuild image
docker compose -f docker-compose.production.yml build app

# Rolling restart (zero downtime if using multiple replicas)
docker compose -f docker-compose.production.yml up -d --no-deps app

# Check health
curl http://localhost:5000/api/system/health
```

### Rollback

```bash
# Tag before deploying
docker tag preventli:latest preventli:backup-$(date +%Y%m%d)

# To rollback
docker tag preventli:backup-YYYYMMDD preventli:latest
docker compose -f docker-compose.production.yml up -d --no-deps app
```

---

## Database Backup

### Manual backup
```bash
docker compose -f docker-compose.production.yml exec db \
  pg_dump -U postgres gpnet3 | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

### Automated daily backup (cron on host)
```bash
# Add to crontab: crontab -e
0 2 * * * docker compose -f /path/to/docker-compose.production.yml exec -T db \
  pg_dump -U postgres gpnet3 | gzip > /backups/gpnet3-$(date +\%Y\%m\%d).sql.gz
```

### Recommended: Use managed PostgreSQL
For production, use a managed database service with automatic backups:
- **Neon** (serverless PostgreSQL, free tier available)
- **Supabase** (PostgreSQL with dashboard)
- **AWS RDS** (enterprise)

Set `DATABASE_URL` to the managed DB connection string and remove the `db` service from `docker-compose.production.yml`.

---

## Enable Feature Flags

Schedulers are disabled by default. Enable in `.env`:

```env
# Freshdesk daily sync at 6pm
DAILY_SYNC_ENABLED=true
DAILY_SYNC_TIME=18:00

# Compliance checks at 6am
COMPLIANCE_CHECK_ENABLED=true
COMPLIANCE_CHECK_TIME=06:00

# AI agent runs at 9am (coordinator) and 8am (cert expiry)
AGENTS_ENABLED=true
AGENT_COORDINATOR_TIME=09:00
AGENT_CERT_EXPIRY_TIME=08:00

# Email notifications
ENABLE_NOTIFICATIONS=true
```

Restart the app after changing env vars:
```bash
docker compose -f docker-compose.production.yml restart app
```

---

## Monitoring

### Sentry
Set `SENTRY_DSN` in `.env`. All unhandled Express errors, uncaught promise rejections, and agent failures will be captured.

### Logs
```bash
# Tail live logs
docker compose -f docker-compose.production.yml logs -f app

# Logs are JSON in production — pipe to jq for readability
docker compose -f docker-compose.production.yml logs app | jq .
```

### Health check automation
```bash
# Simple uptime monitor — add to crontab
*/5 * * * * curl -sf http://localhost:5000/api/system/health || \
  echo "Preventli health check FAILED at $(date)" | mail -s "Alert" admin@yourdomain.com
```

---

## Cloudflare R2 Setup (Alternative to AWS S3)

R2 is S3-compatible and has no egress fees.

1. Create a bucket in Cloudflare R2
2. Create an R2 API token with Object Read & Write permissions
3. Configure in `.env`:

```env
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=preventli-uploads
AWS_S3_REGION=auto
AWS_ACCESS_KEY_ID=<R2 Access Key ID>
AWS_SECRET_ACCESS_KEY=<R2 Secret Access Key>
AWS_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
AWS_S3_PUBLIC_URL=https://uploads.yourdomain.com  # R2 public bucket or Workers URL
```

---

## Troubleshooting

### App won't start
```bash
docker compose -f docker-compose.production.yml logs app | tail -50
```
Common causes: missing `JWT_SECRET`, `SESSION_SECRET`, `DATABASE_URL`.

### AI calls failing
Check `/api/system/health` → `ai` field. Verify `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY` is set.

### File uploads failing
Check `/api/system/health` → `storage` field. Verify S3 bucket name, region, and credentials.

### Database connection refused
Ensure `db` service is healthy: `docker compose -f docker-compose.production.yml ps`
Check `DATABASE_URL` matches the service configuration.

### Rate limit hitting too quickly
For testing/admin use, temporarily increase `DB_POOL_MAX` or adjust rate limits via env vars. Do not comment out rate limiters.
