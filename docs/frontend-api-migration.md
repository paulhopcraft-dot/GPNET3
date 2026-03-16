# Frontend API Migration Guide

**Status:** Optional — existing code works fine with current setup

The frontend currently uses **relative API paths** (e.g., `/api/cases`), which works perfectly in both dev and production:

- **Development:** Vite dev server proxy routes `/api/*` → `http://localhost:5000/api/*`
- **Production:** Frontend is served by same Express server, so relative paths work

## When to Use `apiUrl()` Helper

The new `client/src/config/api.ts` helper is **optional** but recommended for:

1. **Split deployments** (frontend on Vercel, backend on Railway)
2. **Explicit API URL configuration** (clearer intent in code)
3. **Future-proofing** (easier to migrate to microservices later)

## Migration Examples

### Before (current code):

```typescript
const response = await fetch('/api/cases', {
  credentials: 'include',
});
```

### After (optional improvement):

```typescript
import { apiFetch } from '@/config/api';

const response = await apiFetch('/api/cases');
```

Or using the URL builder:

```typescript
import { apiUrl } from '@/config/api';

const response = await fetch(apiUrl('/api/cases'), {
  credentials: 'include',
});
```

## Do You Need to Migrate?

**No.** The existing code works fine.

**When to migrate:**
- You're deploying frontend and backend separately (Vercel + Railway)
- You want clearer separation of concerns
- You're refactoring a component anyway

## Vercel Environment Variable

For **split deployments**, add this to Vercel:

```
VITE_API_URL=https://preventli-api.up.railway.app
```

The `apiUrl()` helper automatically uses this in production.

## Current State

All existing fetch calls use **relative paths** and will continue to work:

- ✅ Works in development (Vite proxy)
- ✅ Works in production (same origin)
- ✅ Works in split deployment (with `VITE_API_URL` set in Vercel)

**No migration required.**
