# Preventli Production Deployment Workflow

**Comprehensive guide to deploying and maintaining Preventli in production**

---

## Table of Contents

1. [Overview](#overview)
2. [Initial Deployment](#initial-deployment)
3. [Continuous Deployment](#continuous-deployment)
4. [Rolling Back](#rolling-back)
5. [Database Migrations](#database-migrations)
6. [Environment Updates](#environment-updates)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Preventli uses a **split deployment** architecture:

- **Frontend:** Vercel (auto-deploys from `main` branch)
- **Backend:** Railway (auto-deploys from `main` branch)
- **Database:** Neon Postgres (managed, always-on)

**Deployment flow:**
1. Push code to GitHub `main` branch
2. Vercel + Railway auto-detect changes and deploy
3. Run database migrations if schema changed
4. Verify deployment with automated checks

---

## Initial Deployment

### Prerequisites

- [ ] GitHub repository with GPNET3 code
- [ ] Neon account with database created
- [ ] Railway account with project created
- [ ] Vercel account with project created
- [ ] All environment variables configured

### Step-by-Step

1. **Run setup script:**

   ```bash
   ./scripts/setup-production-infra.sh
   ```

   This interactive script walks you through:
   - Creating Neon database
   - Configuring Railway backend
   - Deploying to Vercel
   - Running initial migrations

2. **Verify deployment:**

   ```bash
   BACKEND_URL=https://your-backend.up.railway.app ./scripts/verify-production.sh
   ```

3. **Check Control Tower:**

   Visit: `https://your-backend.up.railway.app/control`
   
   Verify:
   - All metrics showing
   - No errors in logs
   - Database queries working

4. **Test frontend:**

   Visit: `https://gpnet3.vercel.app` (or your custom domain)
   
   - Create test account
   - Log in
   - Create test case
   - Upload certificate
   - Generate RTW plan (if AI enabled)

---

## Continuous Deployment

### Automatic Deployments

Both Vercel and Railway auto-deploy when you push to `main`:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

**Timeline:**
- **Vercel:** ~2-3 minutes (frontend build + deploy)
- **Railway:** ~3-5 minutes (backend build + deploy)

### Deployment Notifications

**Railway:**
- Dashboard → Settings → Notifications
- Enable Slack/Discord/email notifications

**Vercel:**
- Project → Settings → Git
- Enable deployment notifications

### Preview Deployments

**Vercel:**
- Automatically creates preview deployments for PRs
- URL format: `gpnet3-git-branch-name.vercel.app`

**Railway:**
- Create a separate "staging" service
- Deploy `develop` or `staging` branch
- Useful for testing before merging to `main`

---

## Rolling Back

### Frontend (Vercel)

1. Go to Vercel dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"
4. Confirm rollback

**Via CLI:**

```bash
# Install Vercel CLI
npm i -g vercel

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Backend (Railway)

1. Go to Railway dashboard → Deployments
2. Find the last working deployment
3. Click "Redeploy"
4. Confirm

**Via CLI:**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Rollback (redeploy previous deployment)
railway rollback
```

### Database (Schema Changes)

**⚠️ Database rollbacks are tricky.**

If a migration broke things:

1. **Restore from backup:**

   Neon → Backups → Restore to specific point-in-time

2. **Revert migration manually:**

   ```bash
   # Connect to database
   psql $DATABASE_URL
   
   # Drop new tables/columns
   DROP TABLE new_table;
   ALTER TABLE existing_table DROP COLUMN new_column;
   ```

3. **Roll forward (preferred):**

   Fix the issue with a new migration instead of reverting.

---

## Database Migrations

### When Schema Changes

Anytime you modify `server/db/schema.ts`, you need to push the changes:

```bash
# Push schema changes to production database
DATABASE_URL=<neon-url> npm run db:push
```

**Best practices:**

1. **Test locally first:**

   ```bash
   # Use local PostgreSQL or Neon test database
   DATABASE_URL=<local-db-url> npm run db:push
   ```

2. **Backup before migration:**

   Neon auto-backups, but you can create manual snapshot:
   
   Neon dashboard → Backups → Create Snapshot

3. **Run during low-traffic hours:**

   Migrations can lock tables briefly.

4. **Never drop columns in production:**

   Use this pattern instead:
   
   ```typescript
   // Bad: immediate drop
   // ❌ DROP COLUMN old_field
   
   // Good: deprecate → migrate → drop
   // 1. Mark column as deprecated (add comment)
   // 2. Update code to not use it
   // 3. Deploy code
   // 4. Wait 1 week
   // 5. Then drop column
   ```

### Seed Data

After running migrations, seed essential data:

```bash
DATABASE_URL=<neon-url> npm run seed
```

This creates:
- Compliance rules (7 WorkCover rules)
- Default user roles
- System settings

---

## Environment Updates

### Adding New Variables

1. **Update `.env.railway.example`:**

   Document the new variable with comments.

2. **Add to Railway:**

   Dashboard → Variables → Add Variable

3. **Add to Vercel (if frontend needs it):**

   Dashboard → Settings → Environment Variables

4. **Redeploy:**

   Railway/Vercel auto-redeploy when env vars change.

### Rotating Secrets

**JWT_SECRET or SESSION_SECRET:**

⚠️ **Warning:** Rotating these invalidates all user sessions.

1. Generate new secret:

   ```bash
   openssl rand -base64 32
   ```

2. Update in Railway environment variables

3. Users will be logged out and need to sign in again

**API Keys (OpenRouter, Resend, etc.):**

1. Generate new key in provider dashboard
2. Update in Railway environment variables
3. Test with verification script
4. Revoke old key in provider dashboard

---

## Monitoring & Alerts

### Health Checks

**Automated monitoring:**

Set up external uptime monitoring:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor:
- `https://your-backend.up.railway.app/health` (every 5 minutes)
- `https://gpnet3.vercel.app` (every 5 minutes)

### Error Tracking (Sentry)

If `SENTRY_DSN` is configured:

1. Go to https://sentry.io
2. View errors in real-time
3. Get email/Slack alerts for new errors

**Recommended alerts:**
- New error types
- Error rate >10/minute
- Unhandled exceptions

### Performance Monitoring

**Railway:**
- Dashboard → Metrics
- Watch CPU, memory, response times

**Vercel:**
- Dashboard → Analytics
- Core Web Vitals, page load times

**Database (Neon):**
- Dashboard → Metrics
- Watch connection count, query latency

### Log Aggregation

**Railway logs:**
```bash
railway logs --tail
```

**Vercel logs:**
```bash
vercel logs --follow
```

---

## Troubleshooting

### Frontend can't connect to backend

**Symptoms:**
- Browser console: `Failed to fetch`
- Network errors in DevTools

**Fixes:**

1. Check `VITE_API_URL` in Vercel:

   Should be: `https://your-backend.up.railway.app`

2. Check CORS in backend:

   `server/index.ts` should allow Vercel domain:
   
   ```typescript
   cors({
     origin: [
       'https://gpnet3.vercel.app',
       'https://app.preventli.au'
     ],
     credentials: true
   })
   ```

3. Verify backend is actually running:

   ```bash
   curl https://your-backend.up.railway.app/health
   ```

### Database connection fails

**Symptoms:**
- "Connection timeout"
- "SSL required"
- "Connection refused"

**Fixes:**

1. Check `DATABASE_URL` format:

   Must include `?sslmode=require` for Neon:
   
   ```
   postgresql://user:pass@host.neon.tech/db?sslmode=require
   ```

2. Test connection:

   ```bash
   DATABASE_URL=<your-url> ./scripts/setup-database.sh
   ```

3. Check Neon dashboard for connection limits

### AI features not working

**Symptoms:**
- "AI unavailable" error
- 401 Unauthorized from OpenRouter

**Fixes:**

1. Verify API key:

   ```bash
   curl https://openrouter.ai/api/v1/auth/key \
     -H "Authorization: Bearer $OPENROUTER_API_KEY"
   ```

2. Check OpenRouter credits:

   Dashboard → Billing

3. Verify `LLM_PROVIDER` in Railway:

   Should be: `openrouter` (or `anthropic` / `openai`)

### Uploads failing

**Symptoms:**
- "Upload failed" error
- 500 error when uploading files

**Fixes:**

1. Check storage provider config:

   ```bash
   echo $STORAGE_PROVIDER  # should be: s3
   echo $S3_BUCKET         # should be set
   ```

2. Test S3 credentials (if using R2/S3)

3. Check upload size limit:

   `MAX_UPLOAD_SIZE_MB` in Railway (default: 10MB)

### Email not sending

**Symptoms:**
- No emails received
- Silent failures in logs

**Fixes:**

1. Check Resend API key:

   Dashboard → API Keys → verify key is active

2. Check `EMAIL_FROM` domain:

   Must be verified in Resend

3. Test email manually:

   ```bash
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "noreply@preventli.au",
       "to": "test@example.com",
       "subject": "Test",
       "html": "<p>Test</p>"
     }'
   ```

---

## Production Checklist

Before launching to real users:

- [ ] Custom domain configured (app.preventli.au)
- [ ] SSL certificates active (auto via Vercel + Railway)
- [ ] Database backups enabled (Neon auto-backups daily)
- [ ] Error monitoring active (Sentry)
- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] Rate limiting enabled (`ENABLE_RATE_LIMITING=true`)
- [ ] Security headers configured (check `server/middleware/security.ts`)
- [ ] Email domain verified (Resend)
- [ ] Admin users created
- [ ] Terms of Service deployed
- [ ] Privacy Policy deployed
- [ ] Compliance rules seeded (7 WorkCover rules)
- [ ] Test cases created and verified
- [ ] Performance benchmarks run
- [ ] Load testing completed (optional)

---

## Support & Resources

- **Infrastructure guide:** `docs/infrastructure-setup.md`
- **Environment template:** `.env.railway.example`
- **Validation script:** `scripts/validate-env.sh`
- **Verification script:** `scripts/verify-production.sh`
- **Setup script:** `scripts/setup-production-infra.sh`

**Need help?**
- Check Railway docs: https://docs.railway.app
- Check Vercel docs: https://vercel.com/docs
- Check Neon docs: https://neon.tech/docs

---

**Last updated:** March 2026
