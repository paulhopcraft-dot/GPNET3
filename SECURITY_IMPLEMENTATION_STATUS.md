# GPNet3 Security Implementation Status

**Date:** 2025-12-15
**Issue:** Multi-Tenant Isolation Security Fix
**Status:** 80% Complete - Critical Foundation Done

---

## ✅ COMPLETED PHASES

### Phase 1: Schema Sync ✅
**Files Modified:**
- `shared/schema.ts`
  - Added `organizationId` to `User` interface (line 662)
  - Added `organizationId` to `users` table (line 676)
  - Added `organizationId` to `WorkerCase` interface (line 379)
  - Added `organizationId` to `workerCases` table (line 478)

**Status:** ✅ COMPLETE - TypeScript now matches database state

### Phase 2: Migration + Schema Updates ✅
**Files Created:**
- `migrations/0009_add_organization_to_remaining_tables.sql`

**Files Modified:**
- `shared/schema.ts`
  - Added `organizationId` to `caseActions` (line 833)
  - Added `organizationId` to `emailDrafts` (line 949)
  - Added `organizationId` to `notifications` (line 1018)
  - Added `organizationId` to `terminationProcesses` (line 513)
  - Added `organizationId` to `caseDiscussionNotes` (line 612)
  - Added `organizationId` to `caseAttachments` (line 603)

**Status:** ✅ COMPLETE - All tables have organizationId

### Phase 3: Auth Middleware ✅
**Files Modified:**
- `server/middleware/auth.ts`
  - Updated Request interface to include `organizationId`
  - Updated `AuthRequest` interface
  - Updated `JWTPayload` interface
  - Added backwards compatibility for `companyId`

- `server/controllers/auth.ts`
  - Updated `generateAccessToken()` to use organizationId
  - Updated `register()` to use organizationId
  - Updated `login()` to use organizationId

**Status:** ✅ COMPLETE - JWT tokens now include organizationId

### Phase 4: Case Ownership Middleware ✅
**Files Created:**
- `server/middleware/caseOwnership.ts`
  - Implements `requireCaseOwnership()` middleware
  - Checks org ownership before granting access
  - Logs access denials to audit log
  - Returns 404 (not 403) to prevent information disclosure

**Status:** ✅ COMPLETE - Middleware ready to apply to routes

### Phase 6: Audit Logger ✅
**Files Created:**
- `server/services/auditLogger.ts`
  - Implements `logAuditEvent()` function
  - Defines comprehensive audit event types
  - Never throws - failures logged but don't block operations
  - Helper `getRequestMetadata()` for IP/user-agent capture

**Status:** ✅ COMPLETE - Ready for integration into routes

---

## 🔄 IN PROGRESS

### Phase 5: Storage Layer Updates 🔄
**Files Modified:**
- `server/storage.ts`
  - ✅ IStorage interface updated with organizationId parameters
  - ⏳ Method implementations need updating

**Status:** 50% COMPLETE - Interface done, implementations pending

#### What's Done:
- ✅ Interface updated for case methods (lines 325-342)
- ✅ Interface updated for action methods (lines 368-379)
- ✅ Interface updated for email/notification methods (lines 381-397)

#### What Remains:
Need to update these method implementations to filter by organizationId:

**Critical Methods (MUST UPDATE):**
1. `getGPNet2Cases(organizationId)` - line 401
   ```typescript
   // CURRENT (line 402):
   const dbCases = await db.select().from(workerCases);

   // NEEDED:
   const dbCases = await db
     .select()
     .from(workerCases)
     .where(eq(workerCases.organizationId, organizationId));
   ```

2. `getGPNet2CaseById(id, organizationId)` - line 512
   ```typescript
   // CURRENT (line 513-516):
   const dbCase = await db
     .select()
     .from(workerCases)
     .where(eq(workerCases.id, id))
     .limit(1);

   // NEEDED:
   const dbCase = await db
     .select()
     .from(workerCases)
     .where(and(
       eq(workerCases.id, id),
       eq(workerCases.organizationId, organizationId)
     ))
     .limit(1);
   ```

3. **ADD NEW METHOD:** `getGPNet2CaseByIdAdmin(id)` - for admin access
   ```typescript
   // Add after getGPNet2CaseById():
   async getGPNet2CaseByIdAdmin(id: string): Promise<WorkerCase | null> {
     // Same as getGPNet2CaseById but WITHOUT organizationId filter
     const dbCase = await db
       .select()
       .from(workerCases)
       .where(eq(workerCases.id, id))
       .limit(1);

     // ... rest of implementation same as getGPNet2CaseById
   }
   ```

4. `getCaseRecoveryTimeline(caseId, organizationId)` - Update to verify case ownership
5. `getCaseDiscussionNotes(caseId, organizationId, limit)` - Update to verify case ownership
6. `getCaseDiscussionInsights(caseId, organizationId, limit)` - Update to verify case ownership
7. `getCaseTimeline(caseId, organizationId, limit)` - Update to verify case ownership
8. `updateClinicalStatus(caseId, organizationId, status)` - Update to verify case ownership

**Action Methods:**
9. `getActionsByCase(caseId, organizationId)`
10. `getPendingActions(organizationId, limit)`
11. `getOverdueActions(organizationId, limit)`
12. `getAllActionsWithCaseInfo(organizationId, options)`

**Email/Notification Methods:**
13. `getEmailDraftsByCase(caseId, organizationId)`
14. `getPendingNotifications(organizationId, limit)`
15. `getNotificationsByCase(caseId, organizationId)`
16. `getRecentNotifications(organizationId, hours)`
17. `getNotificationStats(organizationId)`

---

## ⏳ PENDING

### Phase 7: Route Updates ⏳
**Status:** NOT STARTED

#### Files Requiring Updates:

**1. server/routes.ts** - CRITICAL
All these routes need `authorize()` + `requireCaseOwnership()`:
```typescript
// BEFORE (line 97):
app.get("/api/gpnet2/cases", async (req, res) => {
  const cases = await storage.getGPNet2Cases(); // ❌ No org filter
  res.json(cases);
});

// AFTER:
app.get("/api/gpnet2/cases", authorize(), async (req: AuthRequest, res) => {
  const organizationId = req.user!.organizationId;

  await logAuditEvent({
    userId: req.user!.id,
    organizationId,
    eventType: AuditEventTypes.CASE_LIST,
    ...getRequestMetadata(req),
  });

  const cases = await storage.getGPNet2Cases(organizationId);
  res.json(cases);
});

// Apply similar pattern to:
// - GET /api/cases/:id/recovery-timeline (line 131)
// - GET /api/cases/:id/clinical-evidence (line 174)
// - GET /api/cases/:id/discussion-notes (line 192)
// - GET /api/cases/:id/timeline (line 213)
// - GET /api/cases/:id/summary (line 240)
// - POST /api/cases/:id/summary (line 275)
```

**2. server/routes/actions.ts**
- `GET /api/actions` - add organizationId filter
- `GET /api/actions/case/:caseId` - add requireCaseOwnership()
- All other action routes

**3. server/routes/notifications.ts**
- All routes need organizationId filtering

**4. server/routes/smartSummary.ts**
- All routes need requireCaseOwnership()

**5. server/routes/emailDrafts.ts**
- All case-specific routes need requireCaseOwnership()

---

## TESTING CHECKLIST

### Before Running Migration:
- [ ] Backup database: `pg_dump gpnet > backup_$(date +%Y%m%d).sql`
- [ ] Verify migration 0003 already ran: `SELECT organization_id FROM worker_cases LIMIT 1;`

### After Running Migration:
```bash
# 1. Apply migration
npm run db:push

# 2. Verify NULL check
psql -d gpnet -c "SELECT table_name, COUNT(*) FROM (
  SELECT 'case_actions' as table_name, COUNT(*) FROM case_actions WHERE organization_id IS NULL
  UNION ALL
  SELECT 'email_drafts', COUNT(*) FROM email_drafts WHERE organization_id IS NULL
  UNION ALL
  SELECT 'notifications', COUNT(*) FROM notifications WHERE organization_id IS NULL
) t GROUP BY table_name;"

# 3. Verify indexes
psql -d gpnet -c "SELECT schemaname, tablename, indexname FROM pg_indexes
WHERE tablename IN ('case_actions', 'email_drafts', 'notifications')
AND indexname LIKE '%organization%'
ORDER BY tablename, indexname;"
```

### Security Testing:
```bash
# 1. Create test users in different orgs
# User A in Org A, User B in Org B

# 2. Test tenant isolation
TOKEN_A="<user_a_jwt>"
TOKEN_B="<user_b_jwt>"
CASE_A_ID="<case_from_org_a>"

# Should succeed:
curl -H "Authorization: Bearer $TOKEN_A" \
  http://localhost:5000/api/cases/$CASE_A_ID

# Should return 404 (NOT 403):
curl -H "Authorization: Bearer $TOKEN_B" \
  http://localhost:5000/api/cases/$CASE_A_ID

# 3. Verify audit logging
psql -d gpnet -c "SELECT * FROM audit_events
WHERE event_type = 'access.denied'
ORDER BY timestamp DESC LIMIT 10;"
```

### Admin Access Testing:
```bash
# Admin should access ANY case
TOKEN_ADMIN="<admin_jwt>"

curl -H "Authorization: Bearer $TOKEN_ADMIN" \
  http://localhost:5000/api/cases/$CASE_A_ID
# Expected: 200 OK

curl -H "Authorization: Bearer $TOKEN_ADMIN" \
  http://localhost:5000/api/cases/$CASE_B_ID
# Expected: 200 OK
```

---

## NEXT STEPS TO COMPLETE

### Step 1: Complete Storage Layer (Phase 5)
Use the patterns above to update all storage methods.

**Import needed:**
```typescript
import { and, eq, inArray, desc, asc } from "drizzle-orm";
```

**Pattern for case ownership verification:**
```typescript
// Before returning data for a caseId, verify ownership:
const caseCheck = await db
  .select({ id: workerCases.id })
  .from(workerCases)
  .where(and(
    eq(workerCases.id, caseId),
    eq(workerCases.organizationId, organizationId)
  ))
  .limit(1);

if (caseCheck.length === 0) {
  throw new Error("Case not found or access denied");
}
```

### Step 2: Update Routes (Phase 7)
Apply middleware to all routes using the patterns documented above.

**Import needed in routes.ts:**
```typescript
import { authorize } from "./middleware/auth";
import { requireCaseOwnership } from "./middleware/caseOwnership";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "./services/auditLogger";
import type { AuthRequest } from "./middleware/auth";
```

### Step 3: Run Tests
```bash
npm run build  # Should pass with new signatures
npm test       # Should pass (may need test updates)
```

### Step 4: Manual Security Verification
Follow testing checklist above to verify:
- ✅ Users can only access their org's cases
- ✅ Cross-org access returns 404
- ✅ Admin can access all orgs
- ✅ Access denials are logged

---

## KNOWN ISSUES / WARNINGS

1. **Breaking API Changes**: Storage method signatures changed - all callers must be updated
2. **JWT Tokens**: Old tokens with only `companyId` will still work (backwards compat)
3. **Migration Backfill**: Existing data backfilled from `worker_cases.organization_id`
4. **Admin Access**: Admin users bypass org filtering - ensure role assignments are correct

---

## SUCCESS CRITERIA

✅ User from Org A CANNOT access cases from Org B
✅ Admin CAN access cases from all organizations
✅ All case endpoints have authorize() middleware
✅ All case endpoints verify organizationId
✅ Audit log captures access denials
✅ `npm run build` passes
✅ `npm test` passes
✅ No TypeScript errors

---

## ROLLBACK PLAN

If issues arise:

1. **Revert Code**: `git revert <commit_hash>`
2. **Rollback Migration**:
   ```sql
   ALTER TABLE case_actions DROP COLUMN organization_id;
   ALTER TABLE email_drafts DROP COLUMN organization_id;
   ALTER TABLE notifications DROP COLUMN organization_id;
   ALTER TABLE termination_processes DROP COLUMN organization_id;
   ALTER TABLE case_discussion_notes DROP COLUMN organization_id;
   ALTER TABLE case_attachments DROP COLUMN organization_id;
   ```
3. **Revert Schema**: Restore `shared/schema.ts` from git
4. **Rebuild**: `npm run build`

---

## CONTACT / ESCALATION

For issues or questions during implementation:
1. Review this document
2. Check plan file: `C:\Users\Paul\.claude\plans\wild-snuggling-pixel.md`
3. Review audit report from initial analysis

**Last Updated:** 2025-12-15 by Claude Code Security Hardening Task
