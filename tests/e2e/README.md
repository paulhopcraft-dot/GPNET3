# E2E Testing Guide

## Prerequisites

Before running E2E tests, ensure you have:

### 1. PostgreSQL Database Running

E2E tests require a running PostgreSQL database. The tests use the same database as development.

**Start PostgreSQL:**
- Windows: `net start postgresql-x64-15` (or use pgAdmin/Services)
- Mac: `brew services start postgresql@15`
- Linux: `sudo systemctl start postgresql`

**Verify Connection:**
```bash
psql -h localhost -p 5432 -U postgres -d gpnet
```

### 2. Database Setup

Create and setup the database:
```bash
# Create database (if not exists)
createdb -h localhost -U postgres gpnet

# Apply migrations
npm run db:push

# Seed test data (optional)
npm run seed
```

### 3. Environment Variables

Ensure your `.env` file has:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/gpnet
```

Note: Database name is `gpnet` (not `gpnet3`)

## Running E2E Tests

The Playwright config automatically starts the dev server, so you just need to run:

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/auth-password-reset.spec.ts

# Debug mode
npx playwright test --debug
```

## Test Results Summary

**Current Status (as of 2026-01-03):**
- ✅ 10/32 tests passing (31%)
- ❌ 22/32 tests failing

**Passing Tests:**
- Password reset flow (9/10 tests)
- Session authentication check (1/1 test)

**Failing Tests:**
- 1 password reset test (expired token error message)
- 11 session management tests (login helper issue)
- 10 dashboard/feature tests (database connection)

## Common Issues

### ERR_CONNECTION_REFUSED
**Problem:** Dev server not starting
**Solution:** Database not running - start PostgreSQL first

### AggregateError from pg-pool
**Problem:** Can't connect to database
**Solutions:**
1. Start PostgreSQL: `net start postgresql-x64-15`
2. Verify DATABASE_URL in .env
3. Check database exists: `psql -l | grep gpnet`
4. Create database: `createdb -U postgres gpnet`

### Tests timing out
**Problem:** Login helper can't load dashboard
**Cause:** Database connection errors prevent authentication
**Solution:** Fix database connection first

## Test Architecture

### Test Files:
- `auth-password-reset.spec.ts` - Password reset flow (10 tests)
- `auth-sessions.spec.ts` - Session management (12 tests)
- `gpnet-dashboard.spec.ts` - Dashboard functionality (1 test)
- `new-features.spec.ts` - Dashboard layout & features (9 tests)

### Helpers:
- `login()` - Authenticates test user and waits for dashboard
- Test data is seeded via `npm run seed`

## Next Steps to Fix Tests

1. **Database Connection** (CRITICAL)
   - Ensure PostgreSQL is running
   - Verify connection string
   - Apply migrations

2. **Fix Expired Token Test**
   - Add token generation helper for backend integration

3. **Fix Login Helper**
   - Debug dashboard loading timeout
   - May need to increase wait time or improve selectors

4. **Run Full Suite**
   - Verify all 32 tests pass
