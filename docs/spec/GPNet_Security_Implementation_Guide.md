# GPNet3 Security Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the security hardening measures identified in `Real_Security_Gaps_vs_Test_Code.md`. The implementation is divided into 4 phases to minimize risk and ensure systematic deployment.

---

## Phase 1: Database Foundation (IMMEDIATE)

**Goal**: Establish secure multi-tenancy foundation

**Duration**: 2-3 days

**Status**: Migration created ✅

### 1.1 Run Migration 0003

```bash
# Development environment
npm run drizzle:migrate

# Production environment (after testing)
# Ensure backup is taken first
DATABASE_URL=postgres://prod npm run drizzle:migrate
```

**Migration includes**:
- `user_invites` table
- `security_audit_log` table
- `refresh_tokens` table
- `webhook_secrets` table
- `data_retention_policy` table
- `failed_login_attempts` table
- `organizationId` columns (nullable initially)
- Security indexes

### 1.2 Backfill Organization Data

**CRITICAL**: Before setting NOT NULL constraints

```sql
-- Example: Assign all existing users to a default organization
UPDATE users
SET organization_id = 'org_default_migration'
WHERE organization_id IS NULL;

-- Example: Assign all worker_cases to organizations based on company field
UPDATE worker_cases wc
SET organization_id = u.organization_id
FROM users u
WHERE wc.company = u.company_id
  AND wc.organization_id IS NULL;
```

### 1.3 Enable NOT NULL Constraints

After backfilling, uncomment in migration:

```sql
ALTER TABLE "users"
  ALTER COLUMN "organization_id" SET NOT NULL;

ALTER TABLE "worker_cases"
  ALTER COLUMN "organization_id" SET NOT NULL;
```

---

## Phase 2: Authentication & Authorization (HIGH PRIORITY)

**Goal**: Secure user registration and access control

**Duration**: 3-5 days

### 2.1 Implement Invite System

**File**: `server/controllers/invites.ts` (NEW)

```typescript
import { randomBytes } from "crypto";
import { db } from "../db";
import { userInvites } from "@shared/schema";

export async function createInvite(
  email: string,
  organizationId: string,
  role: string,
  invitedByUserId: string
) {
  // Generate secure token
  const token = randomBytes(32).toString("hex");

  // 7-day expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(userInvites).values({
    email,
    organizationId,
    role,
    invitedByUserId,
    token,
    expiresAt,
  });

  // Send invite email
  await sendInviteEmail(email, token);

  return { token, expiresAt };
}
```

### 2.2 Update Registration Endpoint

**File**: `server/controllers/auth.ts`

```typescript
export async function register(req: Request, res: Response) {
  const { email, password, inviteToken } = req.body;

  // ✅ Validate invite token
  const invite = await db
    .select()
    .from(userInvites)
    .where(eq(userInvites.token, inviteToken))
    .where(eq(userInvites.email, email))
    .where(isNull(userInvites.acceptedAt))
    .limit(1);

  if (invite.length === 0) {
    return res.status(403).json({
      error: "Invalid or expired invite",
    });
  }

  const inviteData = invite[0];

  // ✅ Check expiry
  if (new Date() > inviteData.expiresAt) {
    return res.status(403).json({
      error: "Invite has expired",
    });
  }

  // ✅ Create user with invite's organizationId
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await db.insert(users).values({
    email: inviteData.email,
    password: hashedPassword,
    role: inviteData.role,
    organizationId: inviteData.organizationId, // ✅ From invite
  });

  // ✅ Mark invite as accepted
  await db
    .update(userInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(userInvites.id, inviteData.id));

  // ✅ Log security event
  await logSecurityEvent("invite_accepted", newUser[0].id, inviteData.organizationId);

  // Return success + token
}
```

### 2.3 Add Organization Filtering to All Queries

**Example**: Update `getCaseById` in `storage.ts`

```typescript
// ❌ OLD (INSECURE)
async getGPNet2CaseById(caseId: string) {
  return await db.select()
    .from(workerCases)
    .where(eq(workerCases.id, caseId))
    .limit(1);
}

// ✅ NEW (SECURE)
async getGPNet2CaseById(caseId: string, organizationId: string) {
  return await db.select()
    .from(workerCases)
    .where(
      and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId) // ✅ Critical
      )
    )
    .limit(1);
}
```

**Apply to ALL storage methods**:
- `getGPNet2Cases` - filter by organizationId
- `getCaseRecoveryTimeline` - filter by organizationId
- `getCaseDiscussionNotes` - filter by organizationId
- `getCaseTimeline` - filter by organizationId
- etc.

### 2.4 Update Middleware to Extract Organization

**File**: `server/middleware/auth.ts`

```typescript
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    organizationId: string; // ✅ Add this
  };
}

export function authorize(allowedRoles?: UserRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // ... existing token validation ...

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // ✅ Fetch full user with organizationId
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user[0].id,
      email: user[0].email,
      role: user[0].role,
      organizationId: user[0].organizationId, // ✅ Critical
    };

    next();
  };
}
```

---

## Phase 3: Request Security (HIGH PRIORITY)

**Goal**: Protect against common web attacks

**Duration**: 2-3 days

### 3.1 Add Rate Limiting

**File**: `server/middleware/rateLimit.ts` (NEW)

```typescript
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "rate_limit:auth:",
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log failed attempt
    await db.insert(failedLoginAttempts).values({
      email: req.body.email,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.status(429).json({
      error: "Too many requests",
      message: "Please try again later",
    });
  },
});
```

**Apply to routes**:

```typescript
router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);
```

### 3.2 Add CSRF Protection

**File**: `server/middleware/csrf.ts` (NEW)

```typescript
import csurf from "csurf";

export const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});
```

**Apply globally**:

```typescript
// server/index.ts
app.use(csrfProtection);

// Add CSRF token endpoint
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Client-side**:

```typescript
// client/src/lib/api.ts
async function fetchWithCSRF(url: string, options: RequestInit = {}) {
  // Get CSRF token
  const csrfRes = await fetch("/api/csrf-token");
  const { csrfToken } = await csrfRes.json();

  // Add to headers
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "CSRF-Token": csrfToken,
    },
  });
}
```

### 3.3 Add Security Headers

**File**: `server/index.ts`

```typescript
import helmet from "helmet";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## Phase 4: Monitoring & Compliance (MEDIUM PRIORITY)

**Goal**: Audit logging and security monitoring

**Duration**: 3-4 days

### 4.1 Implement Audit Logging

**File**: `server/services/audit.ts` (NEW)

```typescript
export async function logSecurityEvent(
  eventType: string,
  userId: string | null,
  organizationId: string | null,
  req?: Request,
  details?: Record<string, any>
) {
  await db.insert(securityAuditLog).values({
    eventType,
    userId,
    organizationId,
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent"),
    details,
  });
}
```

**Apply to all sensitive operations**:

```typescript
// Login success
await logSecurityEvent("login_success", user.id, user.organizationId, req);

// Login failure
await logSecurityEvent("login_failure", null, null, req, { email });

// Case accessed
await logSecurityEvent("case_viewed", req.user.id, req.user.organizationId, req, { caseId });

// Invite sent
await logSecurityEvent("invite_sent", req.user.id, req.user.organizationId, req, { inviteEmail });
```

### 4.2 Implement Refresh Token Rotation

**File**: `server/controllers/auth.ts`

```typescript
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  // Hash the token
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

  // Find token in database
  const tokenRecord = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .where(isNull(refreshTokens.revokedAt))
    .limit(1);

  if (tokenRecord.length === 0) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const token = tokenRecord[0];

  // Check expiry
  if (new Date() > token.expiresAt) {
    return res.status(401).json({ error: "Refresh token expired" });
  }

  // ✅ Revoke old token (rotation)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, token.id));

  // ✅ Generate new access + refresh tokens
  const user = await getUserById(token.userId);
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = await generateRefreshToken(user, req);

  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
}
```

### 4.3 Add Webhook Authentication

**File**: `server/middleware/webhookAuth.ts` (NEW)

```typescript
import crypto from "crypto";

export function verifyWebhookSignature(serviceName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["x-webhook-signature"] as string;
    const timestamp = req.headers["x-webhook-timestamp"] as string;

    if (!signature || !timestamp) {
      return res.status(401).json({ error: "Missing webhook signature" });
    }

    // ✅ Replay attack prevention (5 minute window)
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({ error: "Webhook timestamp too old" });
    }

    // ✅ Get organization from request (e.g., from subdomain or header)
    const organizationId = getOrganizationFromRequest(req);

    // ✅ Get webhook secret for this organization
    const secretRecord = await db
      .select()
      .from(webhookSecrets)
      .where(eq(webhookSecrets.organizationId, organizationId))
      .where(eq(webhookSecrets.serviceName, serviceName))
      .where(eq(webhookSecrets.isActive, true))
      .limit(1);

    if (secretRecord.length === 0) {
      return res.status(401).json({ error: "Webhook not configured" });
    }

    const secret = secretRecord[0].secretKey;

    // ✅ Verify HMAC signature
    const payload = `${timestamp}.${JSON.stringify(req.body)}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    next();
  };
}
```

**Apply to webhook endpoints**:

```typescript
app.post(
  "/api/webhooks/freshdesk",
  verifyWebhookSignature("freshdesk"),
  handleFreshdeskWebhook
);
```

---

## Security Checklist

### Before Beta Launch:
- [ ] Migration 0003 applied to production
- [ ] All NULL organizationId values backfilled
- [ ] NOT NULL constraints enabled
- [ ] Invite system implemented and tested
- [ ] All storage methods updated with organizationId filtering
- [ ] Webhook authentication implemented

### Before Production Launch:
- [ ] Rate limiting on all public endpoints
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Audit logging for all sensitive operations
- [ ] Refresh token rotation implemented
- [ ] Password policy enforced
- [ ] Email verification enabled
- [ ] Security testing completed (pen test, OWASP ZAP)

### Ongoing:
- [ ] Regular security audits
- [ ] Dependency updates (npm audit)
- [ ] Log monitoring and alerting
- [ ] Incident response plan
- [ ] Data retention policy enforcement

---

## Testing Procedures

### 4.1 Test Invite Flow

```bash
# 1. Create invite as admin
curl -X POST http://localhost:5000/api/invites \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "organizationId": "org_123",
    "role": "employer"
  }'

# 2. Register with invite token
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecureP@ssw0rd123!",
    "inviteToken": "abc123..."
  }'

# 3. Verify organization isolation
curl http://localhost:5000/api/cases \
  -H "Authorization: Bearer $NEW_USER_TOKEN"
# Should only see cases for org_123
```

### 4.2 Test Rate Limiting

```bash
# Attempt 10 rapid login requests
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# Should be rate-limited after 5 attempts
```

### 4.3 Test Organization Isolation

```bash
# User in org_A tries to access case in org_B
curl http://localhost:5000/api/cases/CASE-ORG-B-123 \
  -H "Authorization: Bearer $ORG_A_TOKEN"
# Should return 404 or 403 (not found in user's organization)
```

---

## Deployment Steps

### Development Environment:

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Run migration
npm run drizzle:migrate

# 3. Verify tables created
psql $DATABASE_URL -c "\dt user_invites"
psql $DATABASE_URL -c "\dt security_audit_log"

# 4. Run tests
npm run test

# 5. Start server
npm run dev
```

### Production Environment:

```bash
# 1. Schedule maintenance window
# 2. Take full database backup
# 3. Run migration
# 4. Verify all constraints
# 5. Monitor error logs
# 6. Rollback plan ready
```

---

## Rollback Plan

If issues occur after deployment:

```sql
-- Drop new tables
DROP TABLE IF EXISTS user_invites CASCADE;
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS webhook_secrets CASCADE;
DROP TABLE IF EXISTS failed_login_attempts CASCADE;

-- Remove organization columns
ALTER TABLE users DROP COLUMN IF EXISTS organization_id;
ALTER TABLE worker_cases DROP COLUMN IF EXISTS organization_id;

-- Restore from backup
psql $DATABASE_URL < backup_20251203.sql
```

---

## Support & Resources

- **Migration File**: `migrations/0003_add_security_constraints.sql`
- **Security Gaps**: `Real_Security_Gaps_vs_Test_Code.md`
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **GDPR Compliance**: https://gdpr.eu/
- **Worksafe Victoria**: https://www.worksafe.vic.gov.au/

---

**Document Version**: 1.0
**Last Updated**: 2025-12-03
**Next Review**: After Phase 1 completion
