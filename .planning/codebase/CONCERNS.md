# GPNet3 Technical Debt & Concerns Assessment

## Overview
This document identifies technical debt, known issues, security concerns, performance gaps, and fragile areas in the GPNet3 codebase as of 2026-01-25.

---

## CRITICAL ISSUES

### 1. Incomplete Storage Interface Implementation
**Severity:** HIGH | **Type:** Architecture | **Files Affected:** Multiple

**Problem:**
Multiple TODO comments in codebase indicate IStorage interface doesn't have critical query methods:

- `server/routes.ts:1121` - Commented-out query for injury date review queue
- `server/routes.ts:1187` - SQL query attempt for case filtering
- `server/routes.ts:1282` - Query operation for case list
- `server/routes.ts:1358` - Additional query operation
- `server/services/notificationService.ts:867` - Worker email lookup query fails

**Impact:**
- Fallback returns null values instead of proper data
- Features may silently fail without error visibility
- Data queries not using proper ORM abstractions

**Fix Required:**
- Implement query methods on IStorage interface in `server/storage.ts`
- Replace commented-out SQL with proper Drizzle ORM queries
- Add integration tests for storage layer

---

## TYPE SAFETY ISSUES

### 2. Excessive Use of TypeScript Escape Patterns
**Severity:** MEDIUM | **Type:** Code Quality | **Impact:** Maintenance

**Statistics:**
- 403 instances of `any` type usage across server codebase
- Indicates ~7-8% of type annotations are unsafe
- Concentrated in:
  - `server/webhookSecurity.ts` - Express middleware types
  - `server/services/` - Multiple service files
  - `server/routes/` - Route handlers and controllers

**Examples:**
- `server/index.ts` - Error handler uses `err: any`
- `server/controllers/webhooks.ts` - Parameter typing incomplete
- `server/services/certificatePipeline.ts` - Mixed type safety

**Consequences:**
- Loss of compile-time type checking
- Harder to refactor safely
- Runtime type errors not caught before production
- Difficult debugging in complex flows

**Remediation:**
- Enable `noImplicitAny: true` in strict TypeScript config
- Gradually replace `any` with proper type definitions
- Create shared types for common patterns (Express Request/Response wrappers)

---

## SCHEMA & DATA INTEGRITY ISSUES

### 3. Property Mismatch in CaseCompliance Type
**Severity:** HIGH | **Type:** Data Consistency | **File:** `server/services/templateSummary.ts:112`

**Problem:**
Comment indicates properties don't exist on CaseCompliance type:
```typescript
// TODO: Fix compliance structure - these properties don't exist on CaseCompliance type
```

**Current Implementation:**
- `server/services/templateSummary.ts:131` - Attempts to use targetDate and planType from separate fields
- Schema definition in `shared/schema.ts` may be incomplete

**Risk:**
- Compliance data not properly serialized/deserialized
- Type mismatches between API responses and storage
- Silent data loss when compliance info updated

**Required Actions:**
1. Audit CaseCompliance interface in `shared/schema.ts`
2. Verify all properties exist in database schema
3. Update template service to use correct property names
4. Add property mapping layer if schema/API mismatch

---

### 4. Clinical Status JSON Field Structure Unclear
**Severity:** MEDIUM | **Type:** Schema | **File:** `shared/schema.ts:138-150`

**Problem:**
CaseClinicalStatus contains nested objects (MedicalConstraints, FunctionalCapacity, etc.) stored as JSONB in PostgreSQL:
- `medicalConstraints?` - Complex nested object
- `functionalCapacity?` - Multiple duration/capacity fields
- `rtwPlanStatus?` - String enum
- `treatmentPlan?` - Large nested object with history array
- `treatmentPlanHistory?` - Array of treatment plans

**Risks:**
- Partial updates may corrupt nested data
- Query filtering on JSONB fields inefficient
- No database-level validation of JSONB structure
- Migrations difficult when changing structure

**Current Schema Definition Location:**
- `shared/schema.ts` - Type definitions
- `migrations/` - SQL migrations show incremental JSONB additions

**Recommendations:**
- Consider normalizing CaseClinicalStatus into separate tables for:
  - treatment_plans (1-to-many relationship)
  - medical_constraints
  - functional_capacity
- At minimum, add PostgreSQL CHECK constraints to validate JSONB structure
- Document all expected fields in each JSONB object

---

## ERROR HANDLING GAPS

### 5. Insufficient Error Context & Logging
**Severity:** MEDIUM | **Type:** Observability | **Statistics:** 37 console.log instances

**Problem:**
Production code contains direct console logging instead of structured logging:

**Files with unstructured logging:**
- `server/seed.ts` - 14 console.log calls (OK for seeding but pollutes production)
- `server/vite.ts` - 1 console.log call in middleware
- `server/lib/logger.ts` - 3 console.error calls (uses both logger and console)
- `server/routes/compliance-dashboard.ts` - 1 unlogged operation
- `server/services/hybridSummary.ts` - 4 console.log calls
- `server/services/llamaSummary.ts` - 1 console.log call
- `server/services/summary.ts` - 4 console.log calls
- `server/scripts/inspectDb.ts` - 8 console.log calls (development script)

**Impact:**
- Cannot filter/search logs in production
- No structured metadata attached to errors
- Difficult root cause analysis
- Information security risk (credentials may leak in console)

**Required Fix:**
```typescript
// BAD:
console.log("Processing case", caseId);

// GOOD:
logger.info("Processing case", { caseId, organizationId, userId });
```

**Affected Files to Audit:**
- `server/services/*.ts` - All service files
- `server/routes/*.ts` - All route handlers
- `server/controllers/*.ts` - All controllers

---

### 6. Missing Error Boundaries in Critical Operations
**Severity:** HIGH | **Type:** Reliability | **Files:** Compliance & Treatment engines

**Known Issues:**
- `server/routes.ts:1039-1050` - Compliance evaluation catches errors but minimal logging
- `server/routes.ts:1202-1215` - Clinical evidence evaluation with generic error message
- `server/services/complianceEngine.ts:44-108` - Rule evaluation loop has no per-rule error handling
- `server/services/certificatePipeline.ts` - No transaction rollback on partial failures

**Patterns:**
1. Errors logged generically without context
2. No retry logic for transient failures
3. No circuit breaker for external API calls (Anthropic, Freshdesk)
4. Rate limiting exists but no backpressure/queue

**Examples:**
```typescript
// Current pattern:
try {
  const report = await evaluateCase(caseId);
} catch (error) {
  logger.error("Failed to evaluate compliance", {});
  // Generic error response - no case/org context
}

// Should be:
try {
  const report = await evaluateCase(caseId);
} catch (error) {
  logger.error("Compliance evaluation failed", {
    caseId,
    organizationId: req.user?.organizationId,
    userId: req.user?.id,
    errorCode: error.code,
    errorMessage: error.message,
  });
}
```

---

## SECURITY CONCERNS

### 7. Rate Limiting Configuration for Production
**Severity:** MEDIUM | **Type:** Security | **File:** `server/middleware/security.ts:13-27`

**Issue:**
```typescript
// Line 15: 10000 requests per 15 minutes (DEMO MODE)
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000, // DEMO MODE - TOO LENIENT
  ...
});
```

**Problems:**
- 10,000 requests/15min = 666 req/min = 11 req/sec per IP
- DEMO MODE comment suggests this was temporary
- No per-user rate limiting (only per IP - can be bypassed with proxy)
- AI operations rate limited to 3/hour (good) but general API too loose

**Production Recommendations:**
- General API: 100 requests/15min per IP
- Auth endpoints: 5 attempts/15min per IP (already configured)
- AI operations: Keep at 3/hour per user
- Implement per-user rate limiting for authenticated endpoints

---

### 8. CSRF Configuration with IP-based Session ID
**Severity:** MEDIUM | **Type:** Security | **File:** `server/middleware/security.ts:87-88`

**Issue:**
```typescript
getSessionIdentifier: (req) => req.ip || "unknown",
```

**Problem:**
- CSRF protection uses client IP as session identifier
- Breaks for users behind NAT/proxies (shared IP)
- Multiple users behind corporate proxy = same session ID
- Users changing networks (mobile) lose CSRF token validity

**Mitigation Current:**
- JWT authentication provides additional protection
- Cookie-based CSRF works differently than traditional form-based

**Better Approach:**
- Use fingerprinting middleware to generate stable session IDs
- Consider double-submit-cookie pattern alternative
- Document CSRF limitations for API clients

---

### 9. Sensitive Data in Seed/Debug Scripts
**Severity:** MEDIUM | **Type:** Security | **Files:** Multiple

**Files with Hardcoded Test Data:**
- `server/seed.ts` - 14 console.log statements with case data
- `scripts/process-historical-injury-dates.ts` - Historical data processing
- Root directory debug scripts:
  - `check-andres-certs.js`
  - `check-andres-current-state.ts`
  - `test-andres-case.js`
  - `investigate-certificate-dates.js`

**Risk:**
- Test user credentials visible in code
- Test case data with PII exposed
- Debug logs may contain sensitive worker information
- These scripts left in production tree

**Remediation:**
- Move all debug scripts to separate `/debug` folder
- Add to `.gitignore` if they contain secrets
- Document that seed.ts is for development only
- Review for any hardcoded credentials

---

### 10. Environment Variable Validation
**Severity:** LOW-MEDIUM | **Type:** Configuration | **Files:** `server/db.ts`, `server/middleware/security.ts`

**Current Validation:**
- DATABASE_URL: Required, throws if missing ✅
- JWT_SECRET: Required, throws if missing ✅
- SESSION_SECRET: Required, throws if missing ✅
- ANTHROPIC_API_KEY: Checked at service initialization
- FRESHDESK API credentials: No validation check

**Missing Validations:**
- `server/services/aiInjuryDateService.ts:37` - No startup validation for ANTHROPIC_API_KEY
- `server/services/freshdesk.ts` - No validation that credentials are valid format
- No checks that URLs (DATABASE_URL, API_URL) are valid
- No length requirements for secrets

**Improvement:**
```typescript
// Add validation module
function validateRequiredEnvs() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'ANTHROPIC_API_KEY'
  ];

  for (const env of required) {
    if (!process.env[env]) throw new Error(`${env} required`);
    if (process.env[env]!.length < 20) throw new Error(`${env} too short`);
  }
}
```

---

## PERFORMANCE & SCALABILITY ISSUES

### 11. Missing Database Indexes
**Severity:** MEDIUM | **Type:** Performance | **Impact:** Query performance as data grows

**Likely Index Gaps** (inferred from query patterns):
- `worker_cases(organization_id)` - Filtering by org
- `worker_cases(company_id)` - Company filtering
- `case_contacts(case_id)` - Contact lookups
- `medical_certificates(case_id)` - Certificate queries
- `compliance_rules(is_active)` - Rule filtering
- `case_compliance_checks(case_id, created_at)` - Historical queries

**Current Schema Locations:**
- `migrations/` - Contains all historical index definitions
- `shared/schema.ts` - TypeScript type layer (doesn't define indexes)

**Migration Status:**
Migration files suggest indexes exist but need verification:
- `0001_stale_proemial_gods.sql` (Jan 15)
- `0003_add_security_constraints.sql` (Jan 15)
- Multiple migration files added incrementally

**Action Required:**
1. Query PostgreSQL `pg_indexes` to confirm existing indexes
2. Analyze slow query log for table scans
3. Consider covering indexes for common filters + sorts

---

### 12. N+1 Query Problem in Service Layer
**Severity:** MEDIUM | **Type:** Performance | **Files:** Multiple service files

**Identified Patterns:**
- `server/services/complianceEngine.ts:73-100` - Loop evaluating rules, each rule may query database
- `server/storage.ts` - Multiple getCase calls that may fetch related data separately
- `server/services/treatmentPlanService.ts` - Clinical evidence evaluated per case

**Example Issue:**
```typescript
// BAD: N+1 query pattern
for (const rule of rules) {
  const result = await evaluateRule(workerCase, rule); // Each iteration queries DB
  checks.push(result);
}

// BETTER: Batch load all needed data first
const allCertificates = await db.select().from(medicalCertificates).where(...);
const certificateMap = new Map(allCertificates.map(c => [c.caseId, c]));

for (const rule of rules) {
  const cert = certificateMap.get(workerCase.id);
  const result = evaluateRule(workerCase, rule, cert);
}
```

---

### 13. Clinical Evidence Evaluation Not Cached
**Severity:** MEDIUM | **Type:** Performance | **Impact:** Repeated computation

**Current Implementation:**
- `server/services/clinicalEvidence.ts` - Pure function (no caching)
- `server/storage.ts:1256` - Called every time case loaded
- `server/routes.ts:1202` - Called on demand endpoint

**Problem:**
- Clinical evidence evaluation recalculates on every case access
- Same case accessed multiple times = duplicate computation
- No cache invalidation strategy

**Solution:**
1. Cache clinical evidence in case object with TTL
2. Invalidate on cert/treatment plan changes
3. Consider edge-side caching for dashboard views

---

## TESTING GAPS

### 14. Incomplete Test Coverage
**Severity:** LOW-MEDIUM | **Type:** Quality Assurance

**Existing Tests:**
- Unit tests: 11 test files
- E2E tests: 4 spec files
- Test frameworks: Vitest + Playwright

**Coverage Gaps Identified:**
- `server/routes/*.ts` - Most route handlers not tested
- `server/services/emailService.ts` - No test file
- `server/services/fileUpload.ts` - No test file
- `server/services/notificationScheduler.ts` - No test file
- `server/services/syncScheduler.ts` - No test file
- `server/routes/compliance-dashboard.ts` - No test file
- `server/routes/employer-dashboard.ts` - No test file
- Client components - No unit tests in codebase

**Test Coverage by Component:**
- Auth: Good (controllers/auth.test.ts)
- Compliance: Partial (complianceEngine.test.ts exists)
- Clinical Evidence: Good (clinicalEvidence.test.ts)
- Treatment Plan: Partial (treatmentPlanService.test.ts)
- RTW: Minimal (rtw.test.ts)
- Notifications: Minimal (notificationService.test.ts)

**E2E Test Gaps:**
- No employer dashboard tests
- No compliance review workflow tests
- No treatment plan creation tests
- Limited auth testing

---

## DEPENDENCY & MAINTENANCE ISSUES

### 15. Security Dependencies Requiring Review
**Severity:** VARIES | **Type:** Maintenance | **File:** `package.json`

**Critical Dependencies:**
- `bcrypt@^6.0.0` - Password hashing ✅
- `helmet@^8.1.0` - Security headers ✅
- `csrf-csrf@^4.0.3` - CSRF protection ✅
- `express-rate-limit@^8.2.1` - Rate limiting ✅
- `jsonwebtoken@^9.0.2` - JWT handling ✅

**External Service Dependencies:**
- `@anthropic-ai/sdk@^0.68.0` - Claude API
- `@pinecone-database/pinecone@^6.1.3` - Vector store
- `nodemailer@^7.0.12` - Email sending
- OpenAI SDK also listed (duplication?)

**Issues:**
- Pinecone vector database integration unclear (no routes importing it)
- OpenAI SDK present but unused (check `server/services/llamaSummary.ts`)
- Multiple AI service SDKs but unclear usage strategy

**Recommendations:**
1. Remove unused dependencies (audit OpenAI SDK usage)
2. Document vector store strategy (Pinecone vs Anthropic embeddings)
3. Pin vulnerable packages if any flagged by npm audit
4. Add pre-commit hooks to prevent dependency vulnerabilities

---

### 16. Multiple Database Migration Strategies
**Severity:** LOW | **Type:** Maintenance | **Impact:** DevOps complexity

**Current Status:**
- Drizzle Kit migrations: Primary strategy
- Go-migrate backups: Legacy format preserved
- Manual SQL files: `migrations/*.sql`

**Observations:**
- Migration files show incremental development (0000-0009 + duplicates)
- Both `0001_stale_proemial_gods.sql` and `0001_termination_process.sql` exist
- Naming suggests auto-generated (Drizzle Kit names)
- No timestamp-based ordering (only numeric prefix)

**Risk:**
- Migration ordering unclear with duplicate numbers
- Rollback procedure not documented
- Go-migrate files suggest past migration issues

**Cleanup Required:**
1. Audit migration history and remove duplicates
2. Document current migration strategy (Drizzle Kit)
3. Create migration rollback procedure
4. Test disaster recovery (restore from backup)

---

## FRAGILE AREAS / POTENTIAL BREAKING POINTS

### 17. Treatment Plan Summary Property Mapping
**Severity:** MEDIUM | **Type:** Data Integrity | **File:** `server/services/templateSummary.ts:112-131`

**Issue:**
Treatment plan properties don't directly map to database schema:

```typescript
// Attempted access to properties that may not exist
const targetDate = planData.targetDate; // Doesn't exist on TreatmentPlan type
const planType = planData.planType;     // Not defined in schema
```

**Real Property Names** (from schema):
- `expectedDurationWeeks` - Not a date
- `rtwPlanTargetEndDate` - Calculated field
- `rtwPlanStartDate` - When plan activated
- `status: TreatmentPlanStatus` - Active/completed/superseded

**This Breaks:**
- Email draft generation with treatment plan data
- Dashboard summary displays
- RTW timeline calculations

**Required Fix:**
Verify actual property names in `shared/schema.ts` TreatmentPlan interface and update template service accordingly.

---

### 18. Certificate Date Validation
**Severity:** MEDIUM | **Type:** Data Quality | **Impact:** Compliance calculations

**Known Issues from Codebase:**
- Multiple files for testing cert dates:
  - `check-andres-certs.js`
  - `check-andres-current-state.ts`
  - `fix-andres-cert-dates.js`
  - `test-andres-case.js`

**Indicates:**
- Certificate date handling is problematic
- Manual fixes required in the past
- Automated validation may be insufficient

**Validation Layer Location:**
- `server/lib/dateValidation.ts` - Likely validation rules
- `server/services/certificateService.ts` - Certificate operations
- No obvious validation in medical certificate route handlers

**Risks:**
- Expired certificates not caught
- Future-dated certificates not rejected
- Gaps in coverage (no cert = compliance issue)

---

### 19. Injury Date Extraction Brittle
**Severity:** MEDIUM | **Type:** AI/Data Quality | **Files:** Multiple

**Related Files Indicate Issues:**
- `server/services/injuryDateExtraction.ts` - Primary implementation
- `server/services/injuryDateExtraction.test.ts` - Test coverage exists
- `server/services/aiInjuryDateService.ts` - AI-based extraction
- Root scripts for data cleanup:
  - `process-historical-injury-dates.ts`
  - `check-date-quality.js`
  - `DATE_QUALITY_REPORT.md`

**Known Problems:**
- AI extraction confidence varies
- Date parsing has edge cases (Australian vs ISO formats)
- Historical data quality issues (required script to fix)
- Manual review process needed for uncertain extractions

**Fragility Points:**
1. Claude API dependency - API changes break extraction
2. Format assumptions - Different certificate formats fail
3. Confidence thresholds - Arbitrary cutoffs may exclude valid data

---

### 20. Webhook Integration Fragility
**Severity:** MEDIUM-HIGH | **Type:** Integration | **File:** `server/routes/webhooks.ts`

**Issues Identified:**
- `controllers/webhooks.ts:160` - Requires either worker_name OR case_id but error doesn't indicate which is missing
- `controllers/webhooks.ts:179` - Worker lookup can fail silently
- `controllers/webhooks.ts:296` - RTW plan lookup error handling minimal
- No webhook retry logic
- No webhook delivery confirmation tracking
- Webhook payload validation basic (only form presence, not schema)

**Risk Scenarios:**
1. Freshdesk sends certificate but system can't find worker -> data lost
2. RTW plan update fails mid-processing -> inconsistent state
3. Webhook delivery timeout -> needs manual retry
4. Malformed Freshdesk payload -> generic 400 error

**Current Security:**
- Password-based webhook verification ✅
- HMAC not implemented (just password in header)
- No replay attack prevention

**Recommendations:**
1. Implement HMAC-SHA256 webhook signing (Freshdesk standard)
2. Add webhook delivery queue with retry logic
3. Log all webhook attempts (received, parsed, processed, error)
4. Implement webhook test endpoint for validation

---

## DOCUMENTATION & KNOWLEDGE GAPS

### 21. Multiple Competing Summary Engines
**Severity:** LOW | **Type:** Maintainability

**Identified Implementations:**
- `server/services/summary.ts` - Base summary service
- `server/services/templateSummary.ts` - Template-based summaries
- `server/services/smartSummary.ts` - Smart summary (routes handler)
- `server/services/hybridSummary.ts` - Hybrid approach
- `server/services/llamaSummary.ts` - Llama model integration
- `server/services/llamaSummary.ts` - References OpenAI/Llama

**Status Unclear:**
- Which is primary implementation?
- When is each used?
- Are there duplicates?
- Performance differences?

**Documentation Location:** Not found in codebase
**Recommendation:** Create `ARCHITECTURE.md` documenting:
- Summary engine selection criteria
- Performance characteristics
- When each is used
- Migration path to simplify

---

### 22. Unclear Feature Flags & Configuration
**Severity:** LOW | **Type:** Documentation

**Environment Variables Not Documented:**
- `ENABLE_NOTIFICATIONS` - Feature flag
- `DEFAULT_ORGANIZATION_ID` - System default
- `NOTIFICATION_DEFAULT_EMAIL` - System email

**Code Using Features Not Documented:**
- Employer dashboard (is it complete?)
- Compliance dashboard (is it complete?)
- Treatment plan generation (AI vs template?)
- RTW predictions (how accurate?)

**Recommendation:**
Create feature matrix in documentation:
```markdown
| Feature | Status | Performance | Stability |
|---------|--------|-------------|-----------|
| AI Summaries | Production | Slow | Experimental |
| Template Summaries | Production | Fast | Stable |
| Treatment Plans | Production | Fast | Stable |
```

---

## SUMMARY TABLE

| ID | Category | Severity | Type | Status |
|---|----------|----------|------|--------|
| 1 | Storage Layer | HIGH | Architecture | Broken |
| 2 | Type Safety | MEDIUM | Code Quality | Debt |
| 3 | Data Schema | HIGH | Consistency | Broken |
| 4 | JSONB Fields | MEDIUM | Schema | Risky |
| 5 | Error Logging | MEDIUM | Observability | Debt |
| 6 | Error Boundaries | HIGH | Reliability | Incomplete |
| 7 | Rate Limiting | MEDIUM | Security | Loose |
| 8 | CSRF Config | MEDIUM | Security | Suboptimal |
| 9 | Debug Scripts | MEDIUM | Security | Exposed |
| 10 | Env Validation | LOW-MED | Configuration | Incomplete |
| 11 | DB Indexes | MEDIUM | Performance | Unknown |
| 12 | N+1 Queries | MEDIUM | Performance | Likely |
| 13 | Caching | MEDIUM | Performance | Missing |
| 14 | Test Coverage | LOW-MED | QA | Gaps |
| 15 | Dependencies | VARIES | Maintenance | Unclear |
| 16 | Migrations | LOW | Maintenance | Messy |
| 17 | Treatment Plans | MEDIUM | Data Integrity | Broken |
| 18 | Cert Validation | MEDIUM | Data Quality | Issues |
| 19 | Date Extraction | MEDIUM | AI Quality | Fragile |
| 20 | Webhooks | MED-HIGH | Integration | Fragile |
| 21 | Summary Engines | LOW | Maintainability | Unclear |
| 22 | Feature Flags | LOW | Documentation | Missing |

---

## RECOMMENDED PRIORITY ACTIONS

### Immediate (Week 1):
1. Fix Storage layer query methods (Issue #1) - BLOCKING
2. Add error context to critical operations (Issue #6) - Reliability
3. Verify treatment plan property mapping (Issue #17) - Data integrity

### Short-term (Month 1):
4. Replace console.log with structured logging (Issue #5)
5. Audit and fix TypeScript `any` types (Issue #2)
6. Review webhook error handling (Issue #20)
7. Document and consolidate summary engines (Issue #21)

### Medium-term (Month 2):
8. Improve rate limiting config for production (Issue #7)
9. Verify database indexes exist and perform (Issue #11)
10. Add comprehensive test coverage (Issue #14)
11. Implement webhook retry logic (Issue #20)

### Long-term (Future):
12. Normalize JSONB fields into proper tables (Issue #4)
13. Implement caching strategy (Issue #13)
14. Consolidate AI service dependencies (Issue #15)

---

**Document Generated:** 2026-01-25
**Scan Coverage:** Server codebase, storage layer, migrations, security middleware
**Analysis Depth:** Architectural review, pattern matching, configuration audit
