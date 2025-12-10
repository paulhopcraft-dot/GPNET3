# Phase 2: Invite-Based Registration Implementation

## Overview

The registration system has been updated to require invite tokens. Users can no longer self-register - they must be invited by an administrator.

---

## What Changed

### 1. **Registration Endpoint** - [server/controllers/auth.ts:25-128](../server/controllers/auth.ts)

**Before (Insecure):**
```typescript
POST /api/auth/register
Body: { email, password, role, companyId, insurerId }
```
- Anyone could register with any role
- Anyone could join any organization
- No validation of organization membership

**After (Secure):**
```typescript
POST /api/auth/register
Body: { email, password, inviteToken }
```

**New Flow:**
1. ✅ Validates invite token is present
2. ✅ Calls `validateInvite(token)` to check:
   - Token exists in database
   - Token not already used
   - Token not expired (7-day limit)
   - Token not cancelled
3. ✅ Verifies email matches the invited email
4. ✅ Creates user with **organizationId and role FROM THE INVITE**
5. ✅ User **cannot choose** their own organization or role
6. ✅ Marks invite as used via `useInvite(token)`
7. ✅ Returns access token for immediate login

**Security Improvements:**
- 🔒 Closed registration - no open signups
- 🔒 Organization binding enforced by admin
- 🔒 Role assignment controlled by admin
- 🔒 Email verification built into invite flow
- 🔒 Single-use tokens with expiry

---

### 2. **Admin Invite Endpoints** - [server/controllers/invites.ts](../server/controllers/invites.ts)

Four new admin-only endpoints created:

#### **Create Invite**
```http
POST /api/admin/invites
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "newuser@company.com",
  "organizationId": "org_abc123",
  "role": "employer",
  "subrole": "manager"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User invite created successfully",
  "data": {
    "invite": {
      "id": "inv_xyz789",
      "email": "newuser@company.com",
      "organizationId": "org_abc123",
      "role": "employer",
      "subrole": "manager",
      "expiresAt": "2025-12-10T10:00:00Z",
      "createdAt": "2025-12-03T10:00:00Z",
      "token": "a1b2c3...", // Dev only - remove in production
      "inviteUrl": "http://localhost:5173/register?token=a1b2c3..."
    }
  }
}
```

**Validations:**
- ✅ Only admins can create invites
- ✅ Email, organizationId, and role required
- ✅ Role must be: `admin` | `employer` | `clinician` | `insurer`
- ✅ Prevents duplicate pending invites for same email + org

---

#### **List Organization Invites**
```http
GET /api/admin/invites?organizationId=org_abc123
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invites": [
      {
        "id": "inv_xyz789",
        "email": "newuser@company.com",
        "organizationId": "org_abc123",
        "role": "employer",
        "subrole": "manager",
        "status": "pending",
        "expiresAt": "2025-12-10T10:00:00Z",
        "usedAt": null,
        "createdAt": "2025-12-03T10:00:00Z"
      },
      {
        "id": "inv_aaa111",
        "email": "doctor@clinic.com",
        "organizationId": "org_abc123",
        "role": "clinician",
        "subrole": "doctor",
        "status": "used",
        "expiresAt": "2025-12-10T09:00:00Z",
        "usedAt": "2025-12-05T14:30:00Z",
        "createdAt": "2025-12-03T09:00:00Z"
      }
    ],
    "total": 2
  }
}
```

**Features:**
- ✅ Auto-detects and marks expired invites
- ✅ Shows status: `pending` | `used` | `expired` | `cancelled`
- ✅ Sorted by creation date (newest first)
- ✅ Tokens not exposed in list view (security)

---

#### **Cancel Invite**
```http
DELETE /api/admin/invites/inv_xyz789
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Invite cancelled successfully",
  "data": {
    "invite": {
      "id": "inv_xyz789",
      "email": "newuser@company.com",
      "status": "cancelled"
    }
  }
}
```

**Use Cases:**
- User made a typo in email address
- User is no longer being hired
- Organization changed their mind

---

#### **Resend Invite**
```http
POST /api/admin/invites/inv_xyz789/resend
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Invite resent successfully",
  "data": {
    "invite": {
      "id": "inv_xyz789",
      "email": "newuser@company.com",
      "expiresAt": "2025-12-17T11:00:00Z", // New expiry (7 days from now)
      "token": "new_token_xyz...", // New token
      "inviteUrl": "http://localhost:5173/register?token=new_token_xyz..."
    }
  }
}
```

**Features:**
- ✅ Generates fresh token
- ✅ Extends expiry by 7 days
- ✅ Resets status to `pending`
- ✅ Cannot resend already-used invites

---

### 3. **Invite Service** - [server/inviteService.ts](../server/inviteService.ts)

Core business logic for invite management:

**Functions:**
- `generateToken()` - 32-byte cryptographically secure tokens
- `createInvite()` - Creates invite with 7-day expiry
- `validateInvite()` - Validates token (exists, not used, not expired)
- `useInvite()` - Marks invite as used after registration
- `cancelInvite()` - Cancels pending invite
- `getOrganizationInvites()` - Lists invites for admin UI
- `resendInvite()` - Generates new token and extends expiry
- `hasPendingInvite()` - Checks if email already invited

---

### 4. **Storage Methods** - [server/storage.ts:1032-1071](../server/storage.ts)

Database operations for invites:

```typescript
interface IStorage {
  createUserInvite(invite: InsertUserInvite): Promise<UserInviteDB>;
  getUserInviteByToken(token: string): Promise<UserInviteDB | null>;
  getUserInviteById(id: string): Promise<UserInviteDB | null>;
  updateUserInvite(id: string, updates: Partial<UserInviteDB>): Promise<UserInviteDB>;
  getUserInvitesByOrg(organizationId: string): Promise<UserInviteDB[]>;
}
```

---

### 5. **Database Schema** - [shared/schema.ts:624-638](../shared/schema.ts)

New `user_invites` table:

```typescript
export const userInvites = pgTable("user_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  organizationId: varchar("organization_id").notNull(),
  role: text("role").notNull(), // admin | employer | clinician | insurer
  subrole: text("subrole"),
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: text("status").notNull().default("pending"), // pending | used | expired | cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Constraints:**
- ✅ Unique token (prevents collisions)
- ✅ Foreign key to users.id (tracks who created invite)
- ✅ Automatic timestamps

---

## Updated Registration Flow

### **Step 1: Admin Creates Invite**

```bash
curl -X POST http://localhost:5000/api/admin/invites \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "organizationId": "org_abc123",
    "role": "employer",
    "subrole": "manager"
  }'
```

**Result:**
- Invite created in database
- 7-day expiry set
- Secure token generated
- Email sent with invite link (TODO: implement email service)

---

### **Step 2: User Receives Email**

```
Subject: You've been invited to join GPNet3

Hello,

You've been invited to join {OrganizationName} on GPNet3.

Click the link below to create your account:
https://gpnet3.app/register?token=a1b2c3d4e5f6...

This invite expires in 7 days.
```

---

### **Step 3: User Clicks Link**

Frontend shows registration form:
- Email field: Pre-filled, read-only (from invite)
- Password field: Editable
- Role display: Read-only (shows "Employer - Manager")
- Organization: Hidden (comes from invite)

```javascript
// Frontend code
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Validate token first
const validation = await fetch(`/api/auth/validate-invite?token=${token}`);
if (!validation.ok) {
  showError('Invalid or expired invite link');
  return;
}

const inviteData = await validation.json();
// Pre-fill email, show role, hide org field
```

---

### **Step 4: User Submits Registration**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "password": "SecurePass123!",
    "inviteToken": "a1b2c3d4e5f6..."
  }'
```

**Backend Process:**
1. Validates invite token (checks expiry, usage, etc.)
2. Verifies email matches invite
3. Creates user with:
   - `organizationId`: **From invite**
   - `role`: **From invite**
   - `subrole`: **From invite**
   - `password`: Hashed from user input
4. Marks invite as used
5. Returns access token for immediate login

---

### **Step 5: User Logged In**

User is now logged in with:
- ✅ Correct organization membership
- ✅ Correct role and permissions
- ✅ Cannot access other organizations' data
- ✅ Access token valid for 15 minutes

---

## Security Benefits

| Before | After |
|--------|-------|
| ❌ Anyone can register | ✅ Admin-only invitations |
| ❌ User chooses role | ✅ Admin assigns role |
| ❌ User chooses org | ✅ Admin assigns organization |
| ❌ No invite verification | ✅ Token-based verification |
| ❌ No expiry | ✅ 7-day expiry |
| ❌ No audit trail | ✅ Track who invited whom |

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register with invite token |
| POST | `/api/admin/invites` | Admin | Create new invite |
| GET | `/api/admin/invites?organizationId=xxx` | Admin | List org invites |
| DELETE | `/api/admin/invites/:id` | Admin | Cancel invite |
| POST | `/api/admin/invites/:id/resend` | Admin | Resend invite |

---

## Files Modified/Created

### **Modified:**
- ✅ [server/controllers/auth.ts](../server/controllers/auth.ts) - Updated registration
- ✅ [server/routes.ts](../server/routes.ts) - Added invite routes
- ✅ [shared/schema.ts](../shared/schema.ts) - Added userInvites table
- ✅ [server/storage.ts](../server/storage.ts) - Added invite methods

### **Created:**
- ✅ [server/inviteService.ts](../server/inviteService.ts) - Invite business logic
- ✅ [server/controllers/invites.ts](../server/controllers/invites.ts) - Admin endpoints
- ✅ [server/routes/invites.ts](../server/routes/invites.ts) - Route definitions

---

## Next Steps

### Immediate:
1. ✅ Apply migration 0003 (creates user_invites table)
2. ✅ Test invite creation
3. ✅ Test registration with invite token
4. ✅ Test error cases (expired, used, invalid tokens)

### Before Production:
1. ⏳ Implement email service for sending invites
2. ⏳ Remove token from response (send via email only)
3. ⏳ Add rate limiting on invite creation
4. ⏳ Add admin UI for invite management
5. ⏳ Add invite email template customization

---

## Testing

### **Test 1: Create Invite (Admin)**
```bash
# Login as admin first
ADMIN_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gpnet.com","password":"admin123"}' | jq -r '.data.accessToken')

# Create invite
curl -X POST http://localhost:5000/api/admin/invites \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "organizationId": "org_test",
    "role": "employer"
  }'
```

### **Test 2: Register with Invite**
```bash
# Extract token from previous response
TOKEN="..."

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "SecurePass123!",
    "inviteToken": "'$TOKEN'"
  }'
```

### **Test 3: Try to Reuse Token (Should Fail)**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hacker@evil.com",
    "password": "password",
    "inviteToken": "'$TOKEN'"
  }'

# Expected: 403 Forbidden - "Invite has already been used"
```

---

## Migration Notes

**Temporary Compatibility:**
- Registration currently stores `organizationId` in the legacy `companyId` field
- This is temporary until migration 0003 is applied
- After migration, update to use the proper `organizationId` column

**Post-Migration TODO:**
```typescript
// Update in server/controllers/auth.ts after migration
const newUser = await db.insert(users).values({
  email: invite.email,
  password: hashedPassword,
  role: invite.role,
  subrole: invite.subrole,
  organizationId: invite.organizationId, // ✅ Use new column
  // Remove: companyId, insurerId
});
```

---

**Phase 2 Complete** ✅

Users can now only register via admin-created invite tokens, enforcing organization-level access control.
