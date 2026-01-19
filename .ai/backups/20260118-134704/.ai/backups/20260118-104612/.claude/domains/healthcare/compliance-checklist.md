# Healthcare Compliance Checklist

Use this checklist before marking any feature complete that touches PHI or regulated data.

## HIPAA Security Rule Compliance

### Administrative Safeguards (§164.308)
- [ ] **Security Management Process**: Risk analysis completed for new feature
- [ ] **Security Personnel**: Responsible person identified for this feature
- [ ] **Information Access Management**: Role-based access controls implemented
- [ ] **Workforce Training**: Team trained on HIPAA requirements for this feature
- [ ] **Evaluation**: Security measures tested and documented

### Physical Safeguards (§164.310)
- [ ] **Facility Access Controls**: Server/data center access restricted (if applicable)
- [ ] **Workstation Use**: Workstation security policies documented
- [ ] **Device and Media Controls**: Data disposal procedures in place

### Technical Safeguards (§164.312)
- [ ] **Access Control**: Unique user identification implemented
- [ ] **Access Control**: Emergency access procedures documented
- [ ] **Access Control**: Automatic logoff configured
- [ ] **Access Control**: Encryption and decryption implemented for PHI
- [ ] **Audit Controls**: Hardware/software audit trail mechanisms in place
- [ ] **Integrity**: Data integrity protection mechanisms implemented
- [ ] **Transmission Security**: Encryption for PHI transmission (TLS 1.3+)

## HIPAA Privacy Rule Compliance (§164.500-534)

### Minimum Necessary Standard
- [ ] Access to PHI limited to minimum necessary for task
- [ ] API responses filtered to minimum necessary fields
- [ ] Database queries use column-specific SELECT (not SELECT *)
- [ ] Logging excludes unnecessary PHI

### Individual Rights
- [ ] **Right to Access**: Patient can access their own PHI
- [ ] **Right to Amend**: Patient can request amendments (process documented)
- [ ] **Right to Accounting**: System logs all PHI disclosures for accounting

### Notice of Privacy Practices
- [ ] Privacy notice provided to patients (if user-facing feature)
- [ ] Consent obtained for PHI use (if applicable)

## PHI Protection

### Data at Rest
- [ ] PHI encrypted with AES-256 or stronger
- [ ] Encryption keys stored separately from data
- [ ] Key rotation policy implemented
- [ ] Database backups encrypted

### Data in Transit
- [ ] TLS 1.3 enforced for all PHI transmission
- [ ] Certificate validation enabled
- [ ] No PHI in URL parameters or headers
- [ ] API authentication required (OAuth 2.0, JWT, etc.)

### Data Exposure Prevention
- [ ] No PHI in application logs
- [ ] No PHI in error messages or stack traces
- [ ] No PHI in client-side storage (without encryption)
- [ ] No PHI in external analytics or monitoring tools
- [ ] No PHI in version control (Git, etc.)

## Evidence Chain & Audit Trail

### Audit Logging
- [ ] All CREATE operations logged with full context
- [ ] All UPDATE operations log before/after state
- [ ] All DELETE operations logged with reason
- [ ] READ operations for sensitive PHI logged
- [ ] Audit logs are immutable (append-only)
- [ ] Audit logs retained for 7+ years
- [ ] Audit log schema matches `.claude/domains/healthcare/evidence-schema.json`

### Required Audit Fields
- [ ] Event ID (UUID)
- [ ] Timestamp (ISO 8601 UTC)
- [ ] Actor (user ID or system component)
- [ ] Action (CREATE/READ/UPDATE/DELETE)
- [ ] Resource type and ID
- [ ] Before/after state (for mutations)
- [ ] Reason or authorization code
- [ ] Component/service name

## CMS Claims Processing (if applicable)

### Claims Data Integrity
- [ ] Claim data validated against CMS specifications
- [ ] Diagnosis codes validated (ICD-10)
- [ ] Procedure codes validated (CPT, HCPCS)
- [ ] Provider NPI validated (10-digit format)
- [ ] Financial amounts use precise decimal (not float)

### Adjudication Requirements
- [ ] Adjudication decisions logged with reason codes
- [ ] Manual review process documented
- [ ] Appeal process implemented (if denials supported)
- [ ] Payment tracking with audit trail

## Business Associate Agreements

### Third-Party Services
- [ ] Business Associate Agreement (BAA) in place for all third parties handling PHI
- [ ] Third-party security practices reviewed
- [ ] Data processing agreements signed
- [ ] Third-party breach notification procedures documented

### Common Third Parties Requiring BAA:
- Cloud hosting providers (AWS, Azure, GCP)
- Email service providers
- Analytics platforms
- Monitoring/logging services
- Payment processors
- Document storage services

## Breach Notification Preparedness

### Breach Detection
- [ ] Monitoring in place to detect unauthorized PHI access
- [ ] Alerts configured for suspicious activity
- [ ] Incident response procedures documented

### Breach Response Plan
- [ ] Breach assessment process documented (within 60 days)
- [ ] Notification procedures for patients (if >500 affected: within 60 days)
- [ ] Notification procedures for HHS (if >500 affected: within 60 days)
- [ ] Notification procedures for media (if >500 affected: immediately)
- [ ] Mitigation steps documented

## Testing & Validation

### Security Testing
- [ ] Penetration testing completed (if high-risk feature)
- [ ] Vulnerability scanning performed
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Authentication/authorization tested

### Compliance Testing
- [ ] PHI detection patterns tested (no false negatives)
- [ ] Encryption validated (at rest and in transit)
- [ ] Audit logging verified (complete and accurate)
- [ ] Access controls tested (users can't access unauthorized data)
- [ ] Data retention policies enforced

### Privacy Impact Assessment
- [ ] Privacy impact assessment completed for new PHI uses
- [ ] Privacy risks identified and mitigated
- [ ] Stakeholder approval obtained

## Documentation

### Technical Documentation
- [ ] System architecture diagram includes security controls
- [ ] Data flow diagram shows PHI paths and encryption
- [ ] API documentation notes PHI fields and access requirements
- [ ] Database schema documented with PHI field annotations

### Compliance Documentation
- [ ] Risk assessment documented
- [ ] Security measures documented
- [ ] Privacy practices documented
- [ ] Audit procedures documented
- [ ] Incident response plan documented

## Sign-Off

### Pre-Deployment Checklist
- [ ] All checklist items above completed
- [ ] Security review conducted
- [ ] Privacy review conducted
- [ ] Legal/compliance review conducted (for major features)
- [ ] Stakeholder approval obtained

### Feature Approval
- **Feature ID**: ________________
- **Reviewed by**: ________________
- **Review date**: ________________
- **Approved**: [ ] YES [ ] NO
- **Notes**: ____________________________________

---

**IMPORTANT**: Do not mark feature complete or deploy to production until ALL applicable checklist items are verified. HIPAA violations can result in civil penalties up to $1.5M per violation category per year, and criminal penalties up to $250,000 and 10 years imprisonment.

**References**:
- [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/)
- [HHS HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/)
- [CMS Claims Processing Manual](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Internet-Only-Manuals-IOMs)
