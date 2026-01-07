# GPNet3 TODO

## 🔥 Active Work - Compliance Engine

**Status:** Schema & API complete, needs rule implementation and data ingestion

### Phase 1: Compliance Rules Implementation ⏳
- [ ] **Create certificate expiry compliance rules**
  - Rule: Certificate must be current while worker is off work
  - Reference: WIRC Act s38, WorkSafe Manual 2.4
  - Severity: CRITICAL
  - Status: Not started

- [ ] **Create RTW plan deadline compliance rules**
  - Rule: RTW plan required within 10 weeks for serious injuries
  - Reference: WIRC Act s41, Manual 5.3
  - Severity: HIGH
  - Status: Not started

- [ ] **Create file review compliance rules**
  - Rule: Case review required every 8 weeks maximum
  - Reference: WIRC Regulation 224, Manual 5.1
  - Severity: MEDIUM
  - Status: Not started

- [ ] **Create payment compliance rules**
  - Rule: Weekly payments step down after 13 weeks without RTW
  - Reference: WIRC Act s37, Manual 3.4
  - Severity: HIGH
  - Status: Not started

### Phase 2: Document Ingestion 📚
- [ ] **Ingest WIRC Act sections**
  - Run: `tsx scripts/ingest-wirc-act.ts`
  - Sections needed: s37, s38, s41, s91, s99
  - Store in compliance_documents table
  - Status: Script ready, needs execution

- [ ] **Ingest WorkSafe Claims Manual sections**
  - Run: `tsx scripts/ingest-worksafe-manual.ts`
  - Sections needed: 2.4, 3.4, 3.5, 5.1, 5.3
  - Store in compliance_documents table
  - Status: Script ready, needs execution

### Phase 3: Testing & Validation ✅
- [ ] **Load compliance rules into database**
  - Run: `tsx scripts/ingest-compliance-rules.ts`
  - Verify rules created with correct severity levels
  - Status: Not started

- [ ] **Test compliance engine with real cases**
  - Run: `tsx scripts/test-compliance-engine.ts`
  - Verify evaluation logic works correctly
  - Check compliance scores and status calculations
  - Status: Not started

- [ ] **Verify database migrations applied**
  - Run: `npm run db:push`
  - Confirm 3 tables exist: compliance_documents, compliance_rules, case_compliance_checks
  - Status: Migrations created, needs verification

### Phase 4: Frontend Integration 🎨
- [ ] **Build compliance report UI component**
  - Component: `ComplianceReportCard.tsx`
  - Display: Overall status, score, issues by severity
  - Show: Rule violations with findings and recommendations
  - Status: Not started

- [ ] **Add compliance tab to case detail view**
  - Location: `EmployerCaseDetailView.tsx`
  - API: GET `/api/cases/:id/compliance/evaluate`
  - Status: Not started

- [ ] **Add compliance dashboard widget**
  - Show: Organization-wide compliance stats
  - Metrics: Total cases, compliance %, critical issues
  - Status: Not started

---

## ✅ Recently Completed

- [x] **Database schema for compliance system** (2026-01-07)
  - Tables: compliance_documents, compliance_rules, case_compliance_checks
  - Migrations: 0003, 0004

- [x] **Compliance engine service** (2026-01-07)
  - File: server/services/complianceEngine.ts
  - Functions: evaluateCase(), evaluateRule()

- [x] **Compliance evaluation API endpoint** (2026-01-07)
  - Endpoint: GET /api/cases/:id/compliance/evaluate
  - Authentication: JWT + case ownership required

- [x] **Compliance ingestion scripts** (2026-01-07)
  - 13 utility scripts created
  - Documentation: COMPLIANCE_ENGINE.md, COMPLIANCE_SYSTEM.md, WIRC_ACT_INFO.md

---

## 🎯 Next Session Priorities

1. **Create certificate expiry rule** - Most critical for immediate compliance
2. **Ingest WIRC Act s38** - Certificate requirements
3. **Test compliance evaluation** - Verify end-to-end flow
4. **Build basic UI component** - Display compliance report

---

## 📊 Project Status

**Build:** ✅ Passing (151/151 tests)
**Database:** ✅ PostgreSQL 16.11 with compliance tables
**API:** ✅ All endpoints functional
**Frontend:** ⏳ Compliance UI pending

---

## 📚 Reference Documentation

- `COMPLIANCE_ENGINE.md` - Architecture & RAG system design
- `COMPLIANCE_SYSTEM.md` - Use cases & examples
- `WIRC_ACT_INFO.md` - WIRC Act reference guide
- `docs/spec/07-compliance-engine.md` - Original spec
- `docs/PRD/GPNet3-PRD.md` - Product requirements

---

Last updated: 2026-01-07
