# Preventli Infrastructure Setup Guide

**Production-ready deployment to Neon + Railway + Vercel**

This guide walks you through setting up real infrastructure for Preventli's production environment.

---

## Architecture Overview

**Frontend:** Vercel (Vite static site)  
**Backend:** Railway (Express API)  
**Database:** Neon Postgres (serverless)  
**Storage:** Cloudflare R2 (S3-compatible)  
**Email:** Resend (transactional email)  
**AI:** OpenRouter (LLM gateway)

---

## Prerequisites

- GitHub account with access to GPNET3 repository
- Node.js 20+ installed locally
- Command-line access (Terminal, PowerShell, or WSL)

---

## 1. Neon Postgres Database

### 1.1 Create Neon Account

1. Visit: https://neon.tech
2. Sign up with GitHub
3. Create a new project: **"Preventli Production"**
4. Select region: **US East** (or closest to your users)

### 1.2 Get Database URL

1. In Neon dashboard, go to **Connection Details**
2. Copy the **Connection String** (looks like: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)
3. Save this as `DATABASE_URL` — you'll need it for Railway and local migrations

### 1.3 Configure Database

Neon creates the database automatically. No manual setup required.

---

## 2. Railway Backend Deployment

### 2.1 Create Railway Account

1. Visit: https://railway.app
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose `GPNET3` repository

### 2.2 Configure Build & Start

Railway auto-detects Node.js. Verify these settings:

- **Build Command:** `npm install && npm run build` (or leave default)
- **Start Command:** `npm start`
- **Root Directory:** `/` (leave blank)

### 2.3 Add Environment Variables

Click **"Variables"** tab and add:

```bash
# Database
DATABASE_URL=<paste-neon-connection-string>

# Security
NODE_ENV=production
JWT_SECRET=<generate-random-32-char-string>
SESSION_SECRET=<generate-random-32-char-string>

# Server
PORT=10000

# AI Provider
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=<get-from-openrouter.ai>

# Storage (Cloudflare R2)
STORAGE_PROVIDER=s3
S3_BUCKET=preventli-uploads
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY=<from-cloudflare-r2>
S3_SECRET_KEY=<from-cloudflare-r2>

# Email (Resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=<from-resend.com>
EMAIL_FROM=noreply@preventli.au

# Monitoring (Optional)
SENTRY_DSN=<from-sentry.io>
```

**How to generate secrets:**

```bash
# On macOS/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 2.4 Deploy

Click **"Deploy"** — Railway will build and deploy your backend.

You'll get a URL like: `https://preventli-api.up.railway.app`

---

## 3. Cloudflare R2 Storage (Optional)

### 3.1 Create R2 Bucket

1. Visit: https://dash.cloudflare.com
2. Go to **R2 Object Storage**
3. Click **"Create bucket"**
4. Name: `preventli-uploads`
5. Location: **Automatic** (for lowest latency)

### 3.2 Generate API Credentials

1. In R2 dashboard, click **"Manage R2 API Tokens"**
2. Create token with:
   - **Type:** Edit
   - **Permissions:** Read & Write
   - **Bucket:** `preventli-uploads`
3. Copy:
   - `Access Key ID` → `S3_ACCESS_KEY`
   - `Secret Access Key` → `S3_SECRET_KEY`
   - `Account ID` → use in `S3_ENDPOINT`

### 3.3 Configure CORS (if frontend uploads directly)

In R2 bucket settings → CORS → Add rule:

```json
{
  "AllowedOrigins": ["https://gpnet3.vercel.app"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

---

## 4. Resend Email Provider

### 4.1 Create Resend Account

1. Visit: https://resend.com
2. Sign up (free tier: 100 emails/day, 3,000/month)
3. Verify your domain (or use `onboarding@resend.dev` for testing)

### 4.2 Generate API Key

1. Go to **API Keys**
2. Click **"Create API Key"**
3. Name: `Preventli Production`
4. Copy the key → `RESEND_API_KEY` in Railway

### 4.3 Add Sending Domain (Production)

1. Go to **Domains**
2. Click **"Add Domain"**
3. Enter: `preventli.au` (or your domain)
4. Add DNS records as shown (MX, TXT, CNAME)
5. Wait for verification (~5 minutes)

Once verified, update `EMAIL_FROM` to use your domain:

```
EMAIL_FROM=notifications@preventli.au
```

---

## 5. OpenRouter AI Provider

### 5.1 Create OpenRouter Account

1. Visit: https://openrouter.ai
2. Sign in with GitHub or email
3. Add credits (minimum $5)

### 5.2 Generate API Key

1. Go to **Keys** page
2. Click **"Create Key"**
3. Name: `Preventli Production`
4. Copy key → `OPENROUTER_API_KEY` in Railway

### 5.3 Configure Model

In your app, OpenRouter will use models specified in requests (e.g., `anthropic/claude-3.5-sonnet`).

Default model is configured in `server/services/llm.ts`:

```typescript
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";
```

---

## 6. Vercel Frontend Configuration

### 6.1 Import Project to Vercel

1. Visit: https://vercel.com
2. Click **"Add New Project"**
3. Import `GPNET3` from GitHub
4. **Framework Preset:** Vite
5. **Root Directory:** `./`
6. **Build Command:** `npm run build`
7. **Output Directory:** `dist`

### 6.2 Add Environment Variable

Click **"Environment Variables"** and add:

```bash
VITE_API_URL=https://preventli-api.up.railway.app
```

*(Use your Railway backend URL)*

### 6.3 Deploy

Click **"Deploy"** — Vercel will build and host your frontend.

You'll get: `https://gpnet3.vercel.app`

### 6.4 Custom Domain (Optional)

1. In Vercel project settings → **Domains**
2. Add: `app.preventli.au`
3. Configure DNS:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`
4. Wait for propagation (~5-10 minutes)

---

## 7. Database Migrations

After Railway backend is deployed, run migrations from your local machine:

```bash
# Set DATABASE_URL to your Neon connection string
export DATABASE_URL="postgresql://user:pass@host.neon.tech/dbname?sslmode=require"

# Run migrations
npm run db:push

# Seed initial data (compliance rules, etc.)
npm run seed
```

Verify in Neon dashboard that tables were created.

---

## 8. Verification Checklist

After deployment, verify everything works:

- [ ] Backend health endpoint responds: `https://preventli-api.up.railway.app/health`
- [ ] Frontend loads: `https://gpnet3.vercel.app`
- [ ] Login works (creates session, stores in database)
- [ ] Database queries work (view cases, workers, etc.)
- [ ] AI features work (generate RTW plan, smart summary)
- [ ] Email sending works (test via forgot password or invite flow)
- [ ] File uploads work (certificates, documents)

---

## 9. Monitoring & Observability

### 9.1 Railway Logs

- Railway dashboard → **Deployments** → **Logs**
- Watch for errors, database connection issues, API failures

### 9.2 Sentry (Optional)

1. Visit: https://sentry.io
2. Create project: **"Preventli Backend"**
3. Copy DSN → `SENTRY_DSN` in Railway
4. Restart backend deployment

Sentry will capture errors automatically via the existing integration in `server/index.ts`.

### 9.3 Vercel Analytics

Vercel provides free analytics:
- Project → **Analytics** tab
- View page views, performance metrics, Core Web Vitals

---

## 10. Troubleshooting

### Backend won't start

**Check Railway logs:**
```
npm start
Error: Missing environment variable: DATABASE_URL
```

**Fix:** Add missing environment variables in Railway dashboard.

### Database connection fails

**Error:** `Connection timeout` or `SSL required`

**Fix:** Ensure `DATABASE_URL` includes `?sslmode=require` at the end.

### Frontend can't reach backend

**Error in browser console:** `Failed to fetch`

**Fix:** 
1. Check `VITE_API_URL` in Vercel environment variables
2. Verify Railway backend is deployed and healthy
3. Check CORS settings in `server/index.ts` allow Vercel domain

### AI requests fail

**Error:** `401 Unauthorized` or `Insufficient credits`

**Fix:**
1. Verify `OPENROUTER_API_KEY` is correct
2. Check OpenRouter account has credits
3. Test API key: `curl https://openrouter.ai/api/v1/auth/key -H "Authorization: Bearer $OPENROUTER_API_KEY"`

---

## 11. Production Checklist

Before launching to users:

- [ ] Custom domain configured (app.preventli.au)
- [ ] SSL certificates active (auto via Vercel + Railway)
- [ ] Database backups enabled (Neon auto-backups)
- [ ] Rate limiting configured (check `server/middleware/rateLimiter.ts`)
- [ ] Security headers enabled (check `server/middleware/security.ts`)
- [ ] Error monitoring active (Sentry)
- [ ] Email domain verified (Resend)
- [ ] Admin users created in database
- [ ] Terms of Service + Privacy Policy deployed
- [ ] Compliance rules seeded (7 WorkCover rules)

---

## 12. Cost Estimates (Monthly)

**Free Tier Usage (Development/Small Scale):**
- Neon: Free up to 10GB storage, 100 hours compute
- Railway: $5/month with $5 free credit (first month free)
- Vercel: Free for hobby projects (unlimited bandwidth)
- Resend: Free up to 3,000 emails/month
- Cloudflare R2: Free up to 10GB storage, 1M reads
- OpenRouter: Pay-per-use (~$0.50-5 depending on AI usage)

**Estimated total:** $5-10/month for low-traffic production

**Scaling (100+ active users):**
- Neon: $20-50/month (auto-scales compute)
- Railway: $20-50/month (scales with usage)
- Vercel: Free (stays free for most use cases)
- Resend: $20/month (50K emails)
- R2: $5-15/month (storage + bandwidth)
- OpenRouter: $50-200/month (depends on AI usage)

**Estimated total:** $115-335/month at scale

---

## Next Steps

1. Run `scripts/setup-database.sh` to verify database connectivity
2. Run `scripts/verify-production.sh` to check all systems
3. Review `docs/deployment-workflow.md` for ongoing deployment process

---

**Questions?** Check the troubleshooting section above or run:

```bash
npm run doctor
```

This will diagnose common issues automatically.
