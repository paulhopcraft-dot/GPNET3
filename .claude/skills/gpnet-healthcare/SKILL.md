---
name: gpnet-healthcare
domain: healthcare
project: gpnet3
version: 1.0.0
---

<domain_context>
GPNet3 is a healthcare claims processing system subject to:
- **HIPAA Security Rule** (45 CFR §164.308-316)
- **HIPAA Privacy Rule** (45 CFR §164.500-534)
- **CMS claims processing requirements**
- **State healthcare regulations**

This system processes Protected Health Information (PHI) and requires strict compliance with federal regulations.
</domain_context>

<phi_handling_rules>
## Protected Health Information (PHI)

### Always Required:
- **Encrypt at rest**: AES-256 for all PHI in databases and file storage
- **Encrypt in transit**: TLS 1.3 for all PHI transmission over networks
- **Access logging**: Log all PHI access (who accessed what, when, why)
- **Minimum necessary**: Only expose PHI fields required for the operation
- **Business Associate Agreements**: Required for all third-party services handling PHI
- **Role-based access control**: Implement least privilege access patterns

### Never Allowed:
- ❌ PHI in console.log, debug logs, or error messages visible to users
- ❌ PHI in URLs, query parameters, or HTTP headers
- ❌ PHI in client-side storage (localStorage, sessionStorage) without encryption
- ❌ PHI in public error responses or stack traces
- ❌ PHI retention beyond legally required timeframes
- ❌ PHI transmission over unencrypted connections
- ❌ PHI in code comments, commit messages, or documentation

### PHI Identifiers (18 HIPAA identifiers):
1. Names (full name, first + last initial combinations)
2. Geographic subdivisions smaller than state
3. Dates related to individual (birth, admission, discharge, death - except year)
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security Numbers
8. Medical Record Numbers (MRN)
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers (fingerprints, voiceprints)
17. Full-face photos
18. Any other unique identifying number, characteristic, or code
</phi_handling_rules>

<evidence_chain_requirements>
## Audit Trail & Evidence Chain

Every mutation to claims, patient data, or adjudication decisions must create an immutable audit record:

### Required Fields:
```json
{
  "event_id": "uuid-v4",
  "timestamp": "ISO-8601 UTC timestamp",
  "actor": "user_id or system_component_name",
  "action": "CREATE|UPDATE|DELETE|READ",
  "resource_type": "claim|patient|adjudication|provider",
  "resource_id": "12345",
  "before": {"status": "pending", "amount": 1500.00},
  "after": {"status": "approved", "amount": 1500.00},
  "reason": "authorization_code or ticket_reference",
  "component": "claims-service-v2",
  "ip_address": "hashed_ip",
  "session_id": "session_uuid"
}
```

### Audit Requirements:
- **Immutability**: Audit logs cannot be modified or deleted
- **Retention**: 7 years minimum for HIPAA compliance
- **Integrity**: Checksums or cryptographic signatures to prevent tampering
- **Accessibility**: Available for compliance audits within 24 hours
- **Completeness**: No gaps in the audit trail
</evidence_chain_requirements>

<code_patterns>
## Required Code Patterns

### Database Queries (PHI Fields)
**CORRECT**: Parameterized queries prevent SQL injection
```typescript
// Good: Parameterized query
const patient = await db.query(
  'SELECT * FROM patients WHERE mrn = $1',
  [mrn]
);
```

**WRONG**: String concatenation creates SQL injection vulnerability
```typescript
// Bad: SQL injection risk
const patient = await db.query(
  `SELECT * FROM patients WHERE mrn = '${mrn}'`
);
```

### API Error Responses
**CORRECT**: Generic errors that don't leak PHI existence
```typescript
// Good: No PHI in error
res.status(404).json({
  error: 'Resource not found',
  code: 'NOT_FOUND'
});
```

**WRONG**: Error messages that confirm PHI existence
```typescript
// Bad: Leaks patient existence
res.status(404).json({
  error: `Patient with MRN ${mrn} not found`
});
```

### Audit Logging
**CORRECT**: Comprehensive evidence chain
```typescript
// Good: Complete audit trail
await auditLog.record({
  actor: req.user.id,
  action: 'UPDATE',
  resource_type: 'claim',
  resource_id: claimId,
  before: oldClaimData,
  after: newClaimData,
  reason: req.body.authorizationCode,
  component: 'claims-api-v2',
  timestamp: new Date().toISOString()
});
```

**WRONG**: Incomplete or missing audit
```typescript
// Bad: No evidence chain
console.log('Updated claim', claimId);
```

### PHI Encryption
**CORRECT**: Encrypt PHI before storage
```typescript
// Good: Encrypted PHI storage
const encryptedSSN = await encrypt(patient.ssn, {
  algorithm: 'aes-256-gcm',
  key: process.env.ENCRYPTION_KEY
});

await db.query(
  'INSERT INTO patients (id, ssn_encrypted) VALUES ($1, $2)',
  [patientId, encryptedSSN]
);
```

**WRONG**: Plain text PHI storage
```typescript
// Bad: Unencrypted PHI
await db.query(
  'INSERT INTO patients (id, ssn) VALUES ($1, $2)',
  [patientId, patient.ssn]
);
```

### API Response Filtering
**CORRECT**: Remove PHI from responses when not necessary
```typescript
// Good: Minimum necessary disclosure
function sanitizePatientForPublic(patient) {
  return {
    id: patient.id,
    initials: patient.first_name[0] + patient.last_name[0],
    age: calculateAge(patient.birth_date)
    // PHI fields excluded
  };
}
```

**WRONG**: Exposing all PHI fields unnecessarily
```typescript
// Bad: Unnecessary PHI exposure
res.json(patient); // Includes SSN, full name, DOB, etc.
```
</code_patterns>

<validation_checklist>
## Pre-Commit Validation

Before committing code that touches PHI or claims data:

### Security Checklist:
- [ ] No PHI in logs, console.log, or debug output
- [ ] All database queries use parameterized statements
- [ ] API responses filtered to minimum necessary PHI
- [ ] Error messages don't leak PHI existence
- [ ] Encryption configured for PHI at rest
- [ ] TLS 1.3 enforced for PHI in transit
- [ ] No hardcoded credentials or encryption keys

### Audit Trail Checklist:
- [ ] All CREATE operations logged with full evidence
- [ ] All UPDATE operations log before/after state
- [ ] All DELETE operations logged with reason
- [ ] READ operations logged for sensitive PHI access
- [ ] Actor (user/system) identified in all audit records
- [ ] Timestamps are UTC ISO-8601 format
- [ ] Reason codes or authorization references included

### Compliance Checklist:
- [ ] Business Associate Agreement in place for third-party services
- [ ] Role-based access control enforced
- [ ] Data retention policy followed
- [ ] Breach notification procedures documented
- [ ] Privacy impact assessment completed for new features
</validation_checklist>

<integration>
## Agent Integration

This skill is automatically invoked by the **healthcare-validator agent** when running:
- `/prd-check` - Validates PRD alignment and compliance impact
- `/build-prd` - Ensures implementation follows healthcare requirements
- `/verify` - Comprehensive compliance validation before marking feature complete
- `/review` - Code review with healthcare compliance focus

The healthcare-validator agent will:
1. Scan code for PHI exposure patterns
2. Validate HIPAA Security Rule compliance
3. Verify evidence chain completeness
4. Check encryption configuration
5. Review access controls
6. Generate compliance report

**Output**: Compliance report with CRITICAL/HIGH/MEDIUM/LOW findings and blocking status.
</integration>

<common_violations>
## Common HIPAA Violations to Avoid

### 1. Logging PHI
```typescript
// VIOLATION
console.log('Processing claim for patient:', patient.name, patient.ssn);
logger.debug(`Patient ${mrn} updated`);

// CORRECT
console.log('Processing claim for patient ID:', patient.id);
logger.debug(`Patient record updated`, { patient_id: patient.id });
```

### 2. URL Parameters with PHI
```typescript
// VIOLATION
router.get('/patients/:ssn', getPatientBySSN);
// URL: /patients/123-45-6789

// CORRECT
router.get('/patients/:patient_id', getPatientById);
// URL: /patients/550e8400-e29b-41d4-a716-446655440000
```

### 3. Unencrypted Email with PHI
```typescript
// VIOLATION
sendEmail({
  to: doctor.email,
  subject: 'Patient Report',
  body: `Patient ${patient.name} has diagnosis: ${diagnosis}`
});

// CORRECT
sendSecureMessage({
  to: doctor.id,
  subject: 'Patient Report Available',
  body: 'Please log in to view patient report',
  secure_portal_link: generateSecureLink(report.id)
});
```

### 4. Client-Side PHI Storage
```typescript
// VIOLATION
localStorage.setItem('patient', JSON.stringify(patient));

// CORRECT
// Store only non-PHI session data client-side
sessionStorage.setItem('patient_id', patient.id);
// Fetch PHI from server when needed
```
</common_violations>

<references>
## Compliance References

- **HIPAA Security Rule**: https://www.hhs.gov/hipaa/for-professionals/security/
- **HIPAA Privacy Rule**: https://www.hhs.gov/hipaa/for-professionals/privacy/
- **CMS Claims Processing Manual**: https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Internet-Only-Manuals-IOMs
- **OCR Breach Portal**: https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf

**Project-Specific**:
- PRD: `/docs/PRD_v1.md`
- Evidence Schema: `.claude/domains/healthcare/evidence-schema.json`
- Compliance Reports: `/docs/COMPLIANCE-REPORT.md`
</references>
