# Compliance Engine Implementation Plan

**Branch:** `feature/compliance-engine`
**Status:** Ready to build
**Goal:** Build intelligent compliance checking system with WIRC Act & WorkSafe Manual rules

---

## Overview

Build a system that automatically checks each worker case against WorkSafe Victoria compliance requirements and displays clear compliance status with evidence-based citations.

**Target Output:**
```
❌ NON-COMPLIANT
  - Certificate expired 14 days ago (WIRC s99, Manual 2.4)
  - No RTW plan developed (WIRC r224, Manual 5.3)

⚠️ AT RISK
  - File review approaching (Manual 5.1 - due in 2 weeks)

✓ COMPLIANT
  - Worker engaged with case manager (WIRC s99)
```

---

## Phase 1: Database Schema (10 min)

### What we'll build:
- `compliance_rules` table - Store rule definitions
- `compliance_checks` table - Store check results
- Add WorkCover fields to `worker_cases` table

### Commands:
```bash
# 1. Update schema
# Edit: shared/schema.ts

# 2. Generate migration
npm run drizzle:generate

# 3. Apply migration
npm run db:push

# 4. Verify schema
npx drizzle-kit studio  # (opens DB browser)
```

### Skills:
- Direct file editing (Read, Edit tools)
- Database migration commands

### Files to create/modify:
- `shared/schema.ts` - Add new tables

---

## Phase 2: Compliance Rules Service (20 min)

### What we'll build:
Core compliance checking engine with 4 initial rules:

1. **CERT_CURRENT** - Certificate must be current (WIRC s99, Manual 2.4)
2. **RTW_PLAN_10WK** - RTW plan within 10 weeks (WIRC r224, Manual 5.3)
3. **FILE_REVIEW_8WK** - File review every 8 weeks (Manual 5.1)
4. **PAYMENT_CALC** - Correct payment calculations (WIRC s93, Manual 3.2)

### Commands:
```bash
# Create new service file
# No command needed - use Write tool

# Test the service
npm test -- complianceEngine.test.ts
```

### Skills:
- `/tdd` - Test-driven development for rule logic
- Direct implementation with Write tool

### Files to create:
- `server/services/complianceEngine.ts` - Main engine
- `server/services/complianceEngine.test.ts` - Unit tests

### Example code structure:
```typescript
interface ComplianceRule {
  code: string;
  name: string;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (workerCase: WorkerCase) => ComplianceCheckResult;
}

interface ComplianceCheckResult {
  status: 'compliant' | 'non_compliant' | 'at_risk';
  reason?: string;
  reference: string;
  daysOverdue?: number;
}

// Main function
export async function checkCaseCompliance(caseId: string): Promise<ComplianceReport>
```

---

## Phase 3: API Integration (10 min)

### What we'll build:
Add compliance check endpoint to expose results to frontend

### Commands:
```bash
# Edit routes
# Edit: server/routes.ts

# Test endpoint
curl http://localhost:5000/api/cases/CASE_ID/compliance
```

### Skills:
- Read existing routes.ts pattern
- Edit to add new endpoint

### Files to modify:
- `server/routes.ts` - Add `GET /api/cases/:id/compliance`

### New endpoint:
```typescript
// GET /api/cases/:id/compliance
// Returns: ComplianceReport with all rule checks
```

---

## Phase 4: Storage Layer (10 min)

### What we'll build:
Database operations for compliance rules and checks

### Commands:
```bash
# Edit storage
# Edit: server/storage.ts

# No compilation needed - TypeScript checks on save
```

### Skills:
- Read storage.ts patterns
- Add new functions following existing patterns

### Files to modify:
- `server/storage.ts` - Add compliance CRUD operations

### New functions:
```typescript
- getComplianceRules(): Promise<ComplianceRule[]>
- saveComplianceCheck(caseId, ruleId, result): Promise<void>
- getComplianceChecksForCase(caseId): Promise<ComplianceCheck[]>
```

---

## Phase 5: Frontend UI Component (20 min)

### What we'll build:
`ComplianceReportCard` component showing status with visual indicators

### Commands:
```bash
# Create component
# Use Write tool for new file

# Preview in browser
# Already running: http://localhost:5173
```

### Skills:
- `/frontend-design` - Use design skill for production-grade UI
- shadcn/ui components (Card, Badge, Alert)
- Tailwind CSS for styling

### Files to create:
- `client/src/components/ComplianceReportCard.tsx`

### Design:
```tsx
<ComplianceReportCard>
  <ComplianceHeader status="non_compliant" count={3} />

  <CriticalIssues>
    <ComplianceIssue
      icon="❌"
      severity="critical"
      title="Certificate Expired"
      finding="Certificate expired 14 days ago"
      reference="WIRC s99, Manual 2.4"
      action="Chase certificate from DXC immediately"
    />
  </CriticalIssues>

  <AtRiskIssues>
    ...
  </AtRiskIssues>

  <CompliantChecks>
    ...
  </CompliantChecks>
</ComplianceReportCard>
```

---

## Phase 6: Integration with Case Detail View (10 min)

### What we'll build:
Add compliance tab/section to employer case detail view

### Commands:
```bash
# Edit existing component
# Edit: client/src/components/EmployerCaseDetailView.tsx
```

### Skills:
- Read existing component structure
- Edit to add new tab

### Files to modify:
- `client/src/components/EmployerCaseDetailView.tsx`

### Integration:
Add new tab "Compliance" alongside existing Timeline, Summary tabs

---

## Phase 7: Testing & Verification (15 min)

### What we'll test:
1. Rules engine correctly identifies non-compliance
2. API endpoint returns proper JSON
3. UI displays compliance status correctly
4. Test with real Symmetry cases

### Commands:
```bash
# Backend tests
npm test

# TypeScript check
npm run build

# Manual testing with real data
# Login as employer@test.com
# View case 43714 (Andres Nieto)
# Check compliance tab
```

### Skills:
- `/verify` - Blind validation of implementation
- Manual testing in browser

---

## Commands & Skills Reference

### Git Workflow:
```bash
# Check what branch we're on
git branch --show-current
# → feature/compliance-engine

# Switch to bug fix branch
git checkout fix/smart-summary-500

# Switch back to compliance work
git checkout feature/compliance-engine

# Commit progress
git add .
git commit -m "feat: implement certificate expiry compliance rule"
```

### Skills we'll use:
- **`/tdd`** - For writing compliance rule tests first
- **`/frontend-design`** - For ComplianceReportCard UI
- **`/verify`** - For final validation
- **`/review`** - Code review before merging
- **Direct tools** - Read, Edit, Write for most implementation

### Core Tools:
- **Read** - Understand existing patterns
- **Edit** - Modify existing files
- **Write** - Create new files
- **Bash** - Run tests, migrations, git commands
- **Grep** - Find existing patterns in codebase

---

## Estimated Timeline

| Phase | Time | Cumulative |
|-------|------|------------|
| 1. Database Schema | 10 min | 10 min |
| 2. Compliance Engine | 20 min | 30 min |
| 3. API Integration | 10 min | 40 min |
| 4. Storage Layer | 10 min | 50 min |
| 5. Frontend Component | 20 min | 70 min |
| 6. Case Detail Integration | 10 min | 80 min |
| 7. Testing & Verification | 15 min | 95 min |

**Total: ~95 minutes (1.5 hours) for full compliance engine**

---

## Success Criteria

When complete, you should be able to:

1. ✅ Login as employer@test.com
2. ✅ View any Symmetry case (e.g., Andres Nieto #43714)
3. ✅ See "Compliance" tab with clear status
4. ✅ See specific non-compliance issues with WIRC/Manual citations
5. ✅ See recommended actions for each issue
6. ✅ All tests passing
7. ✅ TypeScript compilation clean

---

## What NOT to do (avoiding over-engineering)

❌ Don't build vector database / embeddings yet (Phase 2 of big spec)
❌ Don't build "Ask the Act" query interface yet
❌ Don't add speech/avatar features
❌ Don't ingest full WIRC Act documents yet

✅ **Focus:** Core compliance checking with hardcoded rules first
✅ **Deliver:** Working compliance report for real cases
✅ **Prove:** Value before adding complexity

---

## Ready to Start?

**Current branch:** `feature/compliance-engine`

**Next command:**
```bash
# Start with Phase 1: Database schema
# I'll guide you through each file edit
```

Would you like me to start building Phase 1 (Database Schema)?
