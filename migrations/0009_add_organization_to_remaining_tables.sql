-- Migration 0009: Add organization_id to case-related tables
-- Author: Security Hardening - Multi-Tenant Isolation
-- Date: 2025-12-15
-- Dependencies: 0003_add_security_constraints.sql (users.organization_id, worker_cases.organization_id)
--
-- Purpose: Complete multi-tenant isolation by adding organization_id to all case-related tables
-- that were missing it. This prevents cross-organization data leakage.

-- ==================================================================================
-- STEP 1: Add organization_id columns (nullable initially for backfill)
-- ==================================================================================

ALTER TABLE case_actions ADD COLUMN IF NOT EXISTS organization_id VARCHAR;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS organization_id VARCHAR;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id VARCHAR;
ALTER TABLE termination_processes ADD COLUMN IF NOT EXISTS organization_id VARCHAR;
ALTER TABLE case_discussion_notes ADD COLUMN IF NOT EXISTS organization_id VARCHAR;
ALTER TABLE case_attachments ADD COLUMN IF NOT EXISTS organization_id VARCHAR;

-- ==================================================================================
-- STEP 2: Backfill organization_id from parent worker_cases table
-- ==================================================================================

-- Backfill case_actions
UPDATE case_actions ca
SET organization_id = wc.organization_id
FROM worker_cases wc
WHERE ca.case_id = wc.id
AND ca.organization_id IS NULL;

-- Backfill email_drafts
UPDATE email_drafts ed
SET organization_id = wc.organization_id
FROM worker_cases wc
WHERE ed.case_id = wc.id
AND ed.organization_id IS NULL;

-- Backfill notifications
UPDATE notifications n
SET organization_id = wc.organization_id
FROM worker_cases wc
WHERE n.case_id = wc.id
AND n.organization_id IS NULL;

-- Backfill termination_processes
UPDATE termination_processes tp
SET organization_id = wc.organization_id
FROM worker_cases wc
WHERE tp.worker_case_id = wc.id
AND tp.organization_id IS NULL;

-- Backfill case_discussion_notes
UPDATE case_discussion_notes cdn
SET organization_id = wc.organization_id
FROM worker_cases wc
WHERE cdn.case_id = wc.id
AND cdn.organization_id IS NULL;

-- Backfill case_attachments
UPDATE case_attachments ca_att
SET organization_id = wc.organization_id
FROM worker_cases wc
WHERE ca_att.case_id = wc.id
AND ca_att.organization_id IS NULL;

-- ==================================================================================
-- STEP 3: Make organization_id NOT NULL (after verifying backfill succeeded)
-- ==================================================================================

ALTER TABLE case_actions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE email_drafts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE termination_processes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE case_discussion_notes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE case_attachments ALTER COLUMN organization_id SET NOT NULL;

-- ==================================================================================
-- STEP 4: Add indexes for query performance (organization-scoped queries)
-- ==================================================================================

CREATE INDEX IF NOT EXISTS idx_case_actions_organization_id
  ON case_actions(organization_id);

CREATE INDEX IF NOT EXISTS idx_email_drafts_organization_id
  ON email_drafts(organization_id);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON notifications(organization_id);

CREATE INDEX IF NOT EXISTS idx_termination_processes_organization_id
  ON termination_processes(organization_id);

CREATE INDEX IF NOT EXISTS idx_case_discussion_notes_organization_id
  ON case_discussion_notes(organization_id);

CREATE INDEX IF NOT EXISTS idx_case_attachments_organization_id
  ON case_attachments(organization_id);

-- ==================================================================================
-- STEP 5: Add composite indexes for common query patterns
-- ==================================================================================

-- Composite indexes for (organization_id, case_id) - used in case detail queries
CREATE INDEX IF NOT EXISTS idx_case_actions_org_case
  ON case_actions(organization_id, case_id);

CREATE INDEX IF NOT EXISTS idx_email_drafts_org_case
  ON email_drafts(organization_id, case_id);

CREATE INDEX IF NOT EXISTS idx_notifications_org_case
  ON notifications(organization_id, case_id);

CREATE INDEX IF NOT EXISTS idx_case_discussion_notes_org_case
  ON case_discussion_notes(organization_id, case_id);

CREATE INDEX IF NOT EXISTS idx_case_attachments_org_case
  ON case_attachments(organization_id, case_id);

-- Composite index for notifications by organization and status
CREATE INDEX IF NOT EXISTS idx_notifications_org_status
  ON notifications(organization_id, status);

-- Composite index for actions by organization and status
CREATE INDEX IF NOT EXISTS idx_case_actions_org_status
  ON case_actions(organization_id, status);

-- ==================================================================================
-- VERIFICATION QUERIES (run these after migration to verify success)
-- ==================================================================================

-- Check for any NULL organization_id values (should return 0 rows for each)
-- SELECT COUNT(*) FROM case_actions WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM email_drafts WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM notifications WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM termination_processes WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM case_discussion_notes WHERE organization_id IS NULL;
-- SELECT COUNT(*) FROM case_attachments WHERE organization_id IS NULL;

-- Check index existence
-- SELECT schemaname, tablename, indexname
-- FROM pg_indexes
-- WHERE tablename IN ('case_actions', 'email_drafts', 'notifications',
--                     'termination_processes', 'case_discussion_notes', 'case_attachments')
-- AND indexname LIKE '%organization%'
-- ORDER BY tablename, indexname;
