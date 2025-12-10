# Phase 3: Webhook Security Implementation

## Overview

Webhook endpoints now require authentication to prevent unauthorized form submissions. The system uses password-based verification and **fail-closed security** (errors block requests rather than allowing them through).

---

## Security Vulnerabilities Fixed

### **Before (Critical Vulnerability):**
```
❌ Anyone could submit fake form data
❌ No authentication on webhook endpoints
❌ Users could specify their own organizationId
❌ Errors allowed requests to pass through (fail-open)
```

### **After (Secure):**
```
✅ Password-protected webhooks
✅ Form ID mapped to organization (admin-controlled)
✅ organizationId from database mapping, NOT user input
✅ Fail-closed security (errors block requests)
✅ Rate limiting (60 requests/minute per IP)
✅ Timing-safe password comparison
```

---

## What Changed

### **1. Database Schema** - [shared/schema.ts:640-650](../shared/schema.ts)

New `webhook_form_mappings` table:

```typescript
export const webhookFormMappings = pgTable("webhook_form_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: text("form_id").notNull().unique(), // JotForm form ID
  organizationId: varchar("organization_id").notNull(),
  formType: text("form_type").notNull(), // "worker_injury", "medical_certificate", etc.
  webhookPassword: text("webhook_password").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Purpose:**
- Maps JotForm form IDs to organizations
- Stores webhook passwords per form
- Allows admins to disable forms without deleting data
- Prevents users from choosing organizationId in form submissions

---

### **2. Webhook Security Middleware** - [server/webhookSecurity.ts](../server/webhookSecurity.ts)

Three security middlewares created:

#### **A. Password Verification (Fail-Closed)**

```typescript
verifyWebhookPassword(formIdParam = "formID")
```

**How It Works:**
1. Extracts form ID from request body/params
2. Extracts password from query param (`?webhook_password=xxx`) OR header (`x-webhook-password`)
3. Looks up form mapping in database
4. Verifies password using **constant-time comparison** (prevents timing attacks)
5. Attaches form mapping (including organizationId) to request

**Security Features:**
- ✅ **Fail-closed**: Any error returns 503 (NOT allowing request through)
- ✅ **Timing-safe comparison**: `crypto.timingSafeEqual()` prevents timing attacks
- ✅ **Detailed error responses**: 400/401/403/404/503 with specific messages
- ✅ **Logging**: Failed attempts logged with IP and user agent

**Error Responses:**
- `400` - Missing form ID
- `401` - Missing or invalid password
- `403` - Form mapping disabled
- `404` - Form not registered
- `503` - Database error (fail-closed)

---

#### **B. Rate Limiting**

```typescript
webhookRateLimit(maxRequestsPerMinute = 60)
```

**How It Works:**
- Tracks requests per IP address
- Resets counter every minute
- Returns `429 Too Many Requests` when limit exceeded

**Protection:**
- ✅ Prevents brute-force password attacks
- ✅ Prevents DoS attacks
- ✅ Default: 60 requests/minute per IP

---

#### **C. HMAC Signature Verification (Placeholder)**

```typescript
verifyWebhookSignature(serviceName)
```

**Status:** Not yet implemented (returns 501)
**Purpose:** Future support for Freshdesk/Stripe webhooks with HMAC signatures
**Features:** Replay attack prevention with timestamp validation

---

### **3. Webhook Handlers** - [server/controllers/webhooks.ts](../server/controllers/webhooks.ts)

#### **JotForm Webhook Handler**

```typescript
POST /api/webhooks/jotform?webhook_password=xxx
```

**Flow:**
1. Rate limiter checks request count
2. Password verifier:
   - Validates password
   - Loads form mapping from database
   - Attaches organizationId to request
3. Handler processes form based on `formType`:
   - `worker_injury` → Creates worker case
   - `medical_certificate` → Uploads certificate
   - `return_to_work` → Updates RTW plan

**Critical Security:**
```typescript
// ✅ organizationId from database mapping (NOT from form data)
const { organizationId, formType } = req.webhookFormMapping;

// ❌ NEVER do this:
// const organizationId = req.body.organizationId; // User input!
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "submissionId": "123456",
    "organizationId": "org_abc123", // Confirms which org received the data
    "formType": "worker_injury"
  }
}
```

---

### **4. Admin Endpoints** - [server/controllers/webhooks.ts](../server/controllers/webhooks.ts)

Three admin-only endpoints for managing webhook forms:

#### **Register Webhook Form**

```http
POST /api/webhooks/forms
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "formId": "240112345678",
  "organizationId": "org_abc123",
  "formType": "worker_injury",
  "webhookPassword": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook form registered successfully",
  "data": {
    "mapping": {
      "id": "map_xyz789",
      "formId": "240112345678",
      "organizationId": "org_abc123",
      "formType": "worker_injury",
      "isActive": true,
      "createdAt": "2025-12-03T10:00:00Z",
      "webhookPassword": "SecurePassword123!",
      "webhookUrl": "http://localhost:5000/api/webhooks/jotform?webhook_password=SecurePassword123!"
    }
  }
}
```

**Validations:**
- ✅ Only admins can register forms
- ✅ Form types: `worker_injury` | `medical_certificate` | `return_to_work`
- ✅ Unique form ID constraint (prevents duplicates)

---

#### **List Webhook Forms**

```http
GET /api/webhooks/forms?organizationId=org_abc123
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mappings": [
      {
        "id": "map_xyz789",
        "formId": "240112345678",
        "organizationId": "org_abc123",
        "formType": "worker_injury",
        "isActive": true,
        "createdAt": "2025-12-03T10:00:00Z"
        // Password NOT exposed in list view
      }
    ],
    "total": 1
  }
}
```

---

#### **Deactivate Webhook Form**

```http
DELETE /api/webhooks/forms/map_xyz789
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook form deactivated successfully",
  "data": {
    "mapping": {
      "id": "map_xyz789",
      "formId": "240112345678",
      "isActive": false
    }
  }
}
```

**Note:** Deactivates (doesn't delete) so historical data is preserved

---

## Webhook Flow Diagram

### **Before (Insecure):**
```
1. User submits JotForm
2. JotForm sends webhook → POST /api/webhooks/jotform
   Body: { formID: "123", organizationId: "org_hacker", ... }
3. ❌ No authentication
4. ❌ Server creates case with organizationId from body
5. ❌ Hacker's data injected into victim's organization
```

### **After (Secure):**
```
1. Admin registers form:
   POST /api/webhooks/forms
   {
     "formId": "240112345678",
     "organizationId": "org_abc123",
     "formType": "worker_injury",
     "webhookPassword": "SecurePass123"
   }

2. Admin configures JotForm:
   - Webhook URL: https://api.gpnet.com/api/webhooks/jotform?webhook_password=SecurePass123
   - (Or sets header: x-webhook-password: SecurePass123)

3. User submits JotForm:
   - Form ID: 240112345678
   - Form data: { workerName: "John Doe", ... }

4. JotForm sends webhook:
   POST /api/webhooks/jotform?webhook_password=SecurePass123
   Body: { formID: "240112345678", ... }

5. ✅ Rate limiter: Check IP (60/min limit)

6. ✅ Password verifier:
   - Look up formID "240112345678" in database
   - Find mapping: { organizationId: "org_abc123", webhookPassword: "SecurePass123" }
   - Verify password matches (timing-safe comparison)
   - Attach mapping to request

7. ✅ Webhook handler:
   - Extract organizationId from req.webhookFormMapping (NOT from body)
   - Create worker case with organizationId "org_abc123"
   - Return success

8. ✅ Data isolated to correct organization
```

---

## Fail-Closed Security

### **What is Fail-Closed?**

When errors occur, the system **blocks the request** rather than allowing it through.

### **Before (Fail-Open - Dangerous):**
```typescript
try {
  // Verify password
  if (!isValid) {
    return res.status(401).json({ error: "Invalid password" });
  }
  next(); // Allow request
} catch (error) {
  console.error(error);
  next(); // ❌ DANGER: Error allows request through
}
```

### **After (Fail-Closed - Secure):**
```typescript
try {
  // Verify password
  if (!isValid) {
    return res.status(401).json({ error: "Invalid password" });
  }
  next(); // Allow request
} catch (error) {
  console.error(error);
  return res.status(503).json({ // ✅ SECURE: Error blocks request
    error: "Service Unavailable",
    message: "Webhook authentication system error"
  });
}
```

**Why Fail-Closed?**
- Database down? Block requests (don't allow unverified data)
- Password check crashes? Block requests (don't risk security)
- Unknown error? Block requests (default to security)

---

## JotForm Configuration

### **Step 1: Register Form (Admin)**

```bash
curl -X POST http://localhost:5000/api/webhooks/forms \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "240112345678",
    "organizationId": "org_abc123",
    "formType": "worker_injury",
    "webhookPassword": "MySecurePassword123!"
  }'
```

**Save the response:**
- `webhookUrl`: Use this in JotForm settings
- `webhookPassword`: Keep secret, use for authentication

---

### **Step 2: Configure JotForm Webhook**

1. Go to JotForm → Form Settings → Integrations → Webhooks
2. Add new webhook:
   - **URL**: `https://api.gpnet.com/api/webhooks/jotform?webhook_password=MySecurePassword123!`
   - **Method**: POST
   - **Content-Type**: application/json

**Alternative (Header-based):**
- **URL**: `https://api.gpnet.com/api/webhooks/jotform`
- **Headers**: Add `x-webhook-password: MySecurePassword123!`

---

### **Step 3: Test Webhook**

Submit test form data:
```bash
curl -X POST "http://localhost:5000/api/webhooks/jotform?webhook_password=MySecurePassword123!" \
  -H "Content-Type: application/json" \
  -d '{
    "formID": "240112345678",
    "submissionID": "test123",
    "q3_workerName": "John Doe",
    "q4_company": "ACME Corp",
    "q5_dateOfInjury": "2025-12-01",
    "q6_injuryType": "Back strain"
  }'
```

**Expected:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "submissionId": "test123",
    "organizationId": "org_abc123",
    "formType": "worker_injury"
  }
}
```

---

## Error Scenarios

### **Test 1: Missing Password**
```bash
curl -X POST http://localhost:5000/api/webhooks/jotform \
  -d '{"formID":"240112345678"}'

# Expected: 401 Unauthorized
# "Webhook password is required"
```

### **Test 2: Invalid Password**
```bash
curl -X POST "http://localhost:5000/api/webhooks/jotform?webhook_password=WrongPass" \
  -d '{"formID":"240112345678"}'

# Expected: 401 Unauthorized
# "Invalid webhook password"
```

### **Test 3: Unregistered Form**
```bash
curl -X POST "http://localhost:5000/api/webhooks/jotform?webhook_password=AnyPass" \
  -d '{"formID":"999999999"}'

# Expected: 404 Not Found
# "Form not registered for webhook processing"
```

### **Test 4: Deactivated Form**
```bash
# First, deactivate form
curl -X DELETE http://localhost:5000/api/webhooks/forms/map_xyz789 \
  -H "Authorization: Bearer {admin_token}"

# Then try to submit
curl -X POST "http://localhost:5000/api/webhooks/jotform?webhook_password=MySecurePassword123!" \
  -d '{"formID":"240112345678"}'

# Expected: 403 Forbidden
# "Webhook processing is disabled for this form"
```

### **Test 5: Rate Limiting**
```bash
# Send 61 requests in 1 minute
for i in {1..61}; do
  curl -X POST "http://localhost:5000/api/webhooks/jotform?webhook_password=MySecurePassword123!" \
    -d '{"formID":"240112345678"}'
done

# Expected for request 61: 429 Too Many Requests
# "Rate limit exceeded. Maximum 60 requests per minute."
```

---

## Security Improvements Summary

| Vulnerability | Before | After |
|---------------|--------|-------|
| **Webhook Auth** | ❌ None | ✅ Password-protected |
| **Organization Binding** | ❌ User input | ✅ Database mapping |
| **Error Handling** | ❌ Fail-open | ✅ Fail-closed |
| **Rate Limiting** | ❌ None | ✅ 60/min per IP |
| **Timing Attacks** | ❌ Vulnerable | ✅ Constant-time comparison |
| **Form Deactivation** | ❌ N/A | ✅ Soft delete support |
| **Audit Logging** | ❌ None | ✅ Failed attempts logged |

---

## Files Created/Modified

### **Created:**
- ✅ [server/webhookSecurity.ts](../server/webhookSecurity.ts) (227 lines) - Middleware
- ✅ [server/controllers/webhooks.ts](../server/controllers/webhooks.ts) (286 lines) - Handlers
- ✅ [server/routes/webhooks.ts](../server/routes/webhooks.ts) (35 lines) - Routes

### **Modified:**
- ✅ [shared/schema.ts:640-650](../shared/schema.ts) - Added webhookFormMappings table
- ✅ [shared/schema.ts:674-678,688-689](../shared/schema.ts) - Added types
- ✅ [server/routes.ts:9,24](../server/routes.ts) - Mounted webhook routes

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/webhooks/jotform` | Password | Submit form data (JotForm) |
| POST | `/api/webhooks/forms` | Admin | Register new form |
| GET | `/api/webhooks/forms` | Admin | List form mappings |
| DELETE | `/api/webhooks/forms/:id` | Admin | Deactivate form |

---

## Next Steps

### **Immediate (After Migration):**
1. ✅ Apply migration to create `webhook_form_mappings` table
2. ✅ Register first JotForm via admin API
3. ✅ Configure JotForm webhook URL with password
4. ✅ Test webhook submission
5. ✅ Verify data appears in correct organization

### **Before Production:**
1. ⏳ Implement email notifications for failed webhook attempts
2. ⏳ Add webhook retry mechanism for transient failures
3. ⏳ Build admin UI for webhook form management
4. ⏳ Document field mappings for each form type
5. ⏳ Set up monitoring/alerting for webhook failures

---

## Migration Notes

**After migration 0003 is applied**, update worker case creation to use `organizationId`:

```typescript
// In server/controllers/webhooks.ts
// Current (temporary):
await db.insert(workerCases).values({
  // ...
  companyId: organizationId, // Temporary storage
});

// After migration:
await db.insert(workerCases).values({
  // ...
  organizationId: organizationId, // ✅ Proper column
});
```

---

**Phase 3 Complete** ✅

Webhooks are now password-protected with fail-closed security, preventing unauthorized form submissions and ensuring data isolation.
