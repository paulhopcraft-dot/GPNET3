# Preventli — Deployment Architecture

## Overview

Preventli is a containerised Node.js + React application that runs as a single Express process serving both the API and the pre-built frontend. External services are accessed via API (LLM, S3, SMTP).

## Production Architecture

```
                    ┌─────────────────────────────┐
  Browser ─────────▶│  Nginx / Caddy (TLS + proxy) │
                    └────────────┬────────────────┘
                                 │ proxy_pass /api → app:5000
                                 │ static /        → dist/public/
                    ┌────────────▼────────────────┐
                    │  Preventli App Container     │
                    │  (Node.js 20-alpine)         │
                    │  PORT 5000                   │
                    │                              │
                    │  Express + React SPA         │
                    │  Background schedulers        │
                    └──────┬───────────────────────┘
                           │
          ┌────────────────┼──────────────────────────────────┐
          │                │                                  │
  ┌───────▼──────┐  ┌──────▼──────────────┐  ┌──────────────▼──────┐
  │  PostgreSQL  │  │  LLM API             │  │  S3 / R2             │
  │  (container  │  │  (OpenRouter or      │  │  (file uploads:      │
  │   or managed)│  │   Anthropic)         │  │   logos, JD files)   │
  └──────────────┘  └─────────────────────┘  └─────────────────────┘
          │
  ┌───────▼──────┐
  │  Sentry      │
  │  (errors)    │
  └──────────────┘
```

## Service Responsibilities

| Service | Role | Notes |
|---|---|---|
| Nginx / Caddy | TLS termination, static serving, reverse proxy | Optional — can expose app directly on 443 |
| Preventli App | API + SPA serving + background jobs | Single container |
| PostgreSQL | Primary data store | Use managed DB (Neon, RDS, Supabase) for production |
| OpenRouter / Anthropic | LLM inference | Set `LLM_PROVIDER` env var |
| S3 / Cloudflare R2 | File uploads (logos, job descriptions) | Set `STORAGE_PROVIDER=s3` |
| SMTP (Resend / Postmark) | Transactional email | Required for invites, notifications |
| Sentry | Error monitoring | Set `SENTRY_DSN` |

## Key Design Decisions

### Single Container
The app serves both the API (`/api/*`) and the frontend (static `dist/public/`). No separate frontend container or CDN is required, though a CDN in front of Nginx is recommended.

### No Redis Required
Rate limiting is in-memory (adequate for single-instance deployment). Add Redis + `rate-limit-redis` if running multiple instances.

### Stateless Application
No session state in memory. JWT + httpOnly cookies for auth. Safe to restart without session loss.

### Background Schedulers
All schedulers (notifications, sync, compliance, agents) run as in-process `node-cron` jobs. They start conditionally based on feature flag env vars. Only enable them on one instance if horizontally scaling.

## Environment Variable Reference

See `.env.example` for the complete list with descriptions.

### Critical (app won't start without these)
- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`

### Required for AI features
- `LLM_PROVIDER` + `OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`)

### Required for file uploads in production
- `STORAGE_PROVIDER=s3`
- `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Required for email
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Health Check

```
GET /api/system/health
```

Returns:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "ok",
  "ai": { "provider": "openrouter", "model": "anthropic/claude-sonnet-4-5" },
  "storage": { "provider": "s3" }
}
```

Returns HTTP 503 with `"status": "degraded"` if any subsystem is unhealthy.

## Ports

| Service | Port | Notes |
|---|---|---|
| App | 5000 | Internal — expose via Nginx |
| PostgreSQL | 5432 | Internal only — do not expose |
