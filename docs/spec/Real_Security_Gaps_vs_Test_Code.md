# Real Security Gaps vs Test Code

## Executive Summary

This document identifies **12 critical security vulnerabilities** in the GPNet3 production codebase that must be addressed before deployment. These are NOT test code gaps - they are actual production security issues that could lead to data breaches, unauthorized access, and regulatory non-compliance.

---

## Critical Security Gaps (Production)

### 1. Open Registration Without Invite System ⚠️ CRITICAL

**File**: `server/controllers/auth.ts:24-118`

**Problem**:
```typescript
export async function register(req: Request, res: Response) {
  const { email, password, role, companyId, insurerId } = req.body;

  // NO validation of invite tokens
  // NO verification that user belongs to the organization
  // Anyone can register with ANY companyId/insurerId
```

**Risk**:
- Attackers can create accounts for any organization
- No access control during onboarding
- Violates multi-tenancy security model

**Impact**: **CRITICAL** - Complete bypass of organization isolation

**Fix Required**: Implement `user_invites` table and token validation (Migration 0003)

---

### 2. No Organization-Level Data Isolation ⚠️ CRITICAL

**File**: `shared/schema.ts:446-478`

**Problem**:
```typescript
export const workerCases = pgTable("worker_cases", {
  id: varchar("id").primaryKey(),
  workerName: text("worker_name").notNull(),
  company: text("company").notNull(), // Just a string, not a FK
  // NO organizationId column
  // NO foreign key constraint
```

**Risk**:
- Users can access worker cases from ANY organization
- No database-level enforcement of multi-tenancy
- SQL injection or API bugs could expose all data

**Impact**: **CRITICAL** - GDPR/privacy violation, Worksafe Victoria non-compliance

**Fix Required**:
- Add `organizationId` column to all sensitive tables
- Add NOT NULL constraint
- Add indexes for performance
- Update all queries to filter by organizationId

---

### 3. JWT Secret Has No Validation ⚠️ HIGH

**File**: `server/middleware/auth.ts:45-50`

**Problem**:
```typescript
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set");
  return res.status(500).json({ error: "Server configuration error" });
}
```

**Risk**:
- No startup validation of JWT_SECRET
- Server could start without JWT_SECRET and crash on first auth request
- No enforcement of secret complexity or length

**Impact**: **HIGH** - Service unavailability, potential security misconfiguration

**Fix Required**:
- Validate JWT_SECRET at server startup
- Enforce minimum length (256 bits / 32 characters)
- Document secret rotation procedure

---

### 4. No Webhook Authentication ⚠️ CRITICAL

**Current State**: No webhook endpoints implemented yet

**Risk**:
- Future Freshdesk webhook integration will be vulnerable
- Attackers could send fake webhook events
- No HMAC signature verification
- No replay attack prevention

**Impact**: **CRITICAL** - Data manipulation, unauthorized case updates

**Fix Required**:
- Implement webhook signature verification (HMAC-SHA256)
- Store webhook secrets per organization
- Add replay attack prevention (timestamp + nonce)
- Rate limit webhook endpoints

---

### 5. No CSRF Protection ⚠️ HIGH

**File**: `server/index.ts` (middleware configuration)

**Problem**:
- No CSRF tokens for state-changing operations
- POST/PUT/DELETE requests not protected
- SameSite cookie attribute not configured

**Risk**:
- Cross-site request forgery attacks
- Attackers can trick users into performing unwanted actions
- Session hijacking via malicious websites

**Impact**: **HIGH** - Unauthorized data modification, account takeover

**Fix Required**:
- Implement CSRF token middleware (csurf or custom)
- Add SameSite=Strict cookie attribute
- Validate CSRF tokens on all state-changing requests

---

### 6. No Rate Limiting ⚠️ HIGH

**File**: Authentication endpoints lack rate limiting

**Problem**:
```typescript
router.post("/login", login); // No rate limiting
router.post("/register", register); // No rate limiting
```

**Risk**:
- Brute force password attacks
- Account enumeration
- Denial of service
- API abuse

**Impact**: **HIGH** - Account compromise, service degradation

**Fix Required**:
- Implement rate limiting per IP/email
- Add exponential backoff for failed logins
- Track failed attempts in database
- Auto-lock accounts after threshold

---

### 7. Weak Password Policy ⚠️ MEDIUM

**File**: `server/controllers/auth.ts:59-60`

**Problem**:
```typescript
// No password complexity validation
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
```

**Risk**:
- Users can set weak passwords ("password123")
- No minimum length enforcement
- No complexity requirements
- No password breach checking

**Impact**: **MEDIUM** - Increased account compromise risk

**Fix Required**:
- Enforce minimum 12 characters
- Require uppercase, lowercase, number, special char
- Check against Have I Been Pwned database
- Prevent common passwords

---

### 8. No Email Verification ⚠️ MEDIUM

**File**: `server/controllers/auth.ts:62-81`

**Problem**:
```typescript
// User is created immediately without email verification
const newUser = await db.insert(users).values({
  email,
  password: hashedPassword,
  // No email_verified flag
  // No verification token
});
```

**Risk**:
- Users can register with fake/typo emails
- Account takeover via email typos
- Spam account creation

**Impact**: **MEDIUM** - Account security, data integrity

**Fix Required**:
- Add email_verified boolean column
- Send verification email on registration
- Require verification before full access
- Resend verification flow

---

### 9. No Session Management ⚠️ HIGH

**File**: `server/controllers/auth.ts:159` (login generates token only)

**Problem**:
```typescript
// Only access token, no refresh token
const accessToken = generateAccessToken(user.id, user.email, user.role);
```

**Risk**:
- No way to revoke tokens before expiry
- User must re-login every 15 minutes
- No device/session tracking
- No "logout all devices" functionality

**Impact**: **HIGH** - Poor UX, limited security controls

**Fix Required**:
- Implement refresh token rotation
- Store refresh tokens in database
- Add session management (view/revoke active sessions)
- Implement "logout all devices"

---

### 10. Missing Security Headers ⚠️ MEDIUM

**File**: `server/index.ts` (missing helmet middleware)

**Problem**:
- No Content-Security-Policy header
- No X-Frame-Options header
- No X-Content-Type-Options header
- No Strict-Transport-Security header

**Risk**:
- Clickjacking attacks
- XSS vulnerabilities
- MIME sniffing attacks
- Insecure HTTP connections

**Impact**: **MEDIUM** - Various web-based attacks

**Fix Required**:
- Add helmet middleware
- Configure CSP policy
- Enforce HTTPS in production
- Add security.txt file

---

### 11. No Audit Logging ⚠️ HIGH

**Current State**: Basic `audit_events` table exists but not used for security

**Problem**:
- No logging of authentication events
- No logging of sensitive data access
- No logging of permission changes
- Cannot investigate security incidents

**Risk**:
- Cannot detect breaches
- Cannot investigate unauthorized access
- Non-compliance with audit requirements
- No forensic capability

**Impact**: **HIGH** - Regulatory non-compliance, incident response failure

**Fix Required**:
- Log all authentication events (success/failure)
- Log sensitive data access (case views, downloads)
- Log administrative actions
- Implement log retention policy
- Create security dashboard

---

### 12. Insecure Data Exposure in API ⚠️ MEDIUM

**File**: `server/routes.ts` (various endpoints)

**Problem**:
```typescript
// Returns sensitive diagnostic information
app.get("/api/diagnostics/env", (_req, res) => {
  res.json({
    DATABASE_URL: !!process.env.DATABASE_URL,
    FRESHDESK_DOMAIN: !!process.env.FRESHDESK_DOMAIN,
    // Exposes environment configuration
  });
});
```

**Risk**:
- Information disclosure
- Aids attackers in reconnaissance
- Exposes internal architecture

**Impact**: **MEDIUM** - Information leakage

**Fix Required**:
- Remove diagnostic endpoints in production
- Require admin authentication for diagnostics
- Sanitize error messages (no stack traces)
- Implement proper error handling

---

## Summary Table

| # | Vulnerability | Severity | Files Affected | Fix Priority |
|---|--------------|----------|----------------|--------------|
| 1 | Open Registration | CRITICAL | auth.ts | 1 - IMMEDIATE |
| 2 | No Organization Isolation | CRITICAL | schema.ts, all routes | 1 - IMMEDIATE |
| 3 | JWT Secret Validation | HIGH | auth middleware | 2 - HIGH |
| 4 | No Webhook Auth | CRITICAL | Future webhooks | 1 - IMMEDIATE |
| 5 | No CSRF Protection | HIGH | All POST/PUT/DELETE | 2 - HIGH |
| 6 | No Rate Limiting | HIGH | Auth endpoints | 2 - HIGH |
| 7 | Weak Password Policy | MEDIUM | auth.ts | 3 - MEDIUM |
| 8 | No Email Verification | MEDIUM | auth.ts | 3 - MEDIUM |
| 9 | No Session Management | HIGH | auth.ts | 2 - HIGH |
| 10 | Missing Security Headers | MEDIUM | index.ts | 3 - MEDIUM |
| 11 | No Audit Logging | HIGH | All endpoints | 2 - HIGH |
| 12 | Insecure API Exposure | MEDIUM | routes.ts | 3 - MEDIUM |

---

## Implementation Priority

### Phase 1 (IMMEDIATE - Before Beta):
- ✅ Migration 0003: Add security constraints
- ❌ Implement invite-only registration
- ❌ Add organizationId to all queries
- ❌ Implement webhook authentication

### Phase 2 (Before Production):
- ❌ Add CSRF protection
- ❌ Implement rate limiting
- ❌ Add audit logging
- ❌ Session management with refresh tokens

### Phase 3 (Production Hardening):
- ❌ Password policy enforcement
- ❌ Email verification
- ❌ Security headers
- ❌ Remove diagnostic endpoints

---

## Compliance Impact

These gaps affect:
- **GDPR** - No data isolation, no audit trail
- **Worksafe Victoria** - No access control to injury data
- **Privacy Act** - Cross-organization data leakage
- **ISO 27001** - No security controls, logging, or monitoring

---

## Next Steps

1. Review and approve Migration 0003
2. Run migration in development environment
3. Update application code to use new security constraints
4. Implement invite system
5. Add organization filtering to all queries
6. Set up security testing (OWASP ZAP, penetration testing)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-03
**Author**: Security Audit
**Status**: **URGENT ACTION REQUIRED**
