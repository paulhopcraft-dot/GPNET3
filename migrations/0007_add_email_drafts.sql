-- Migration: Add email_drafts table for IR Email Drafter v1
-- Stores AI-generated email drafts for case managers

CREATE TABLE IF NOT EXISTS email_drafts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR NOT NULL REFERENCES worker_cases(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'formal',
  additional_context TEXT,
  case_context_snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_drafts_case_id ON email_drafts(case_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON email_drafts(status);
CREATE INDEX IF NOT EXISTS idx_email_drafts_created_at ON email_drafts(created_at DESC);
