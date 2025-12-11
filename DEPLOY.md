# GPNet3 Deployment Guide

## Overview

GPNet3 is a B2B SaaS platform for worker injury case management. This guide covers deployment procedures for development, staging, and production environments.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (for containerized deployment)
- Access to required API keys (Anthropic, Freshdesk)

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/gpnet3

# Authentication
JWT_SECRET=your-secure-jwt-secret-min-32-chars

# AI Services (optional)
ANTHROPIC_API_KEY=sk-ant-...

# Freshdesk Integration (optional)
FRESHDESK_DOMAIN=your-domain.freshdesk.com
FRESHDESK_API_KEY=your-api-key
```

## Local Development

### Option 1: Direct (recommended for development)

```bash
# Install dependencies
npm install

# Start PostgreSQL (via Docker)
docker compose up postgres -d

# Run migrations
npm run db:push

# Seed demo data
npm run seed

# Start development server
npm run dev
```

### Option 2: Docker Compose

```bash
# Start all services in dev mode
docker compose --profile dev up

# Or production mode
docker compose --profile prod up
```

## Database Management

```bash
# Push schema changes
npm run db:push

# Generate migration files
npm run db:generate

# Seed demo data
npm run seed

# Open Drizzle Studio (DB GUI)
npm run db:studio
```

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires server running)
npx playwright test

# E2E tests with UI
npx playwright test --ui
```

## Building for Production

```bash
# Build application
npm run build

# Start production server
npm start
```

## Docker Deployment

### Build Image

```bash
docker build -t gpnet3:latest .
```

### Run Container

```bash
docker run -d \
  --name gpnet3 \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  gpnet3:latest
```

### Docker Compose (Production)

```bash
docker compose --profile prod up -d
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) provides:

1. **Lint & Type Check** - Code quality validation
2. **Unit Tests** - Service-level testing
3. **E2E Tests** - Full integration testing with Playwright
4. **Docker Build** - Container image creation
5. **Deploy Staging** - Auto-deploy on `develop` branch
6. **Deploy Production** - Auto-deploy on `main` branch

### Branch Strategy

- `main` - Production releases
- `develop` - Staging/integration
- `feature/*` - Feature branches

## Health Checks

The application exposes health check endpoints:

- `GET /api/diagnostics/env` - Environment status (non-sensitive)

## Rollback Procedure

### Docker

```bash
# List available images
docker images gpnet3

# Rollback to previous version
docker stop gpnet3
docker rm gpnet3
docker run -d --name gpnet3 gpnet3:previous-tag
```

### Database

```bash
# Backup before migration
pg_dump gpnet3 > backup_$(date +%Y%m%d).sql

# Restore if needed
psql gpnet3 < backup_20241210.sql
```

## Monitoring & Logging

### Application Logs

```bash
# Docker logs
docker logs -f gpnet3

# Docker Compose logs
docker compose logs -f app
```

### Database Monitoring

```bash
# Connect to PostgreSQL
docker exec -it gpnet-postgres psql -U postgres -d gpnet3

# Check active connections
SELECT * FROM pg_stat_activity WHERE datname = 'gpnet3';
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Verify `DATABASE_URL` is correct
   - Check PostgreSQL is running: `docker compose ps`
   - Verify network connectivity

2. **Port already in use**
   - Check for existing processes: `lsof -i :5000`
   - Kill process or use different port

3. **Migration errors**
   - Check database exists
   - Verify schema compatibility
   - Review migration logs

4. **Build failures**
   - Clear node_modules: `rm -rf node_modules && npm ci`
   - Check Node.js version: `node --version`

### Support

For issues, check:
- GitHub Issues
- Application logs
- Database connectivity
- Environment variable configuration
