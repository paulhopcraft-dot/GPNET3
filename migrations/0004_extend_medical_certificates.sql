-- Migration: Extend medical_certificates table for Certificate Engine v1
-- Description: Add comprehensive tracking fields for medical certificates including
--              OCR extraction, compliance tracking, and organizational isolation

-- Add new columns to medical_certificates table
ALTER TABLE medical_certificates
  -- Core fields
  ADD COLUMN certificate_type TEXT NOT NULL DEFAULT 'medical_certificate',
  ADD COLUMN organization_id VARCHAR,
  ADD COLUMN worker_id VARCHAR,
  ADD COLUMN document_id VARCHAR,

  -- Clinical details
  ADD COLUMN restrictions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN treating_practitioner VARCHAR,
  ADD COLUMN practitioner_type VARCHAR,
  ADD COLUMN clinic_name VARCHAR,

  -- OCR extraction
  ADD COLUMN raw_extracted_data JSONB,
  ADD COLUMN extraction_confidence NUMERIC(3,2),
  ADD COLUMN requires_review BOOLEAN DEFAULT false,

  -- Compliance tracking
  ADD COLUMN is_current_certificate BOOLEAN DEFAULT false,
  ADD COLUMN review_date TIMESTAMP,

  -- File metadata
  ADD COLUMN file_name VARCHAR,
  ADD COLUMN file_url VARCHAR;

-- Add foreign key constraints
ALTER TABLE medical_certificates
  ADD CONSTRAINT fk_medical_certificates_organization
    FOREIGN KEY (organization_id) REFERENCES companies(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_medical_certificates_worker
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_medical_certificates_document
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

-- Create indexes for common queries
CREATE INDEX idx_medical_certificates_org_id
  ON medical_certificates(organization_id);

CREATE INDEX idx_medical_certificates_worker_id
  ON medical_certificates(worker_id);

CREATE INDEX idx_medical_certificates_type
  ON medical_certificates(certificate_type);

CREATE INDEX idx_medical_certificates_current
  ON medical_certificates(is_current_certificate)
  WHERE is_current_certificate = true;

CREATE INDEX idx_medical_certificates_expiry
  ON medical_certificates(end_date)
  WHERE end_date > NOW();

CREATE INDEX idx_medical_certificates_review
  ON medical_certificates(requires_review)
  WHERE requires_review = true;

-- Create certificate expiry alerts table
CREATE TABLE certificate_expiry_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id VARCHAR NOT NULL REFERENCES medical_certificates(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'expiring_soon' | 'expired' | 'review_needed'
  alert_date TIMESTAMP NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(certificate_id, alert_type)
);

CREATE INDEX idx_expiry_alerts_cert_id
  ON certificate_expiry_alerts(certificate_id);

CREATE INDEX idx_expiry_alerts_unacknowledged
  ON certificate_expiry_alerts(acknowledged)
  WHERE acknowledged = false;

-- Add comments for documentation
COMMENT ON COLUMN medical_certificates.certificate_type IS 'Type of certificate: medical_certificate, clearance, fitness_assessment, other';
COMMENT ON COLUMN medical_certificates.restrictions IS 'Array of restriction objects with type, description, and date ranges';
COMMENT ON COLUMN medical_certificates.raw_extracted_data IS 'Raw OCR extracted data from certificate image';
COMMENT ON COLUMN medical_certificates.extraction_confidence IS 'OCR extraction confidence score (0.00-1.00)';
COMMENT ON COLUMN medical_certificates.requires_review IS 'Flag indicating if certificate requires manual review due to low OCR confidence';
COMMENT ON COLUMN medical_certificates.is_current_certificate IS 'Flag indicating if this is the current active certificate for the worker';
COMMENT ON TABLE certificate_expiry_alerts IS 'Tracks alerts for expiring or expired certificates';
