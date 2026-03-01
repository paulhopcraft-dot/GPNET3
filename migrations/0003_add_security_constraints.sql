-- ========================================
-- GPNet3 Security Hardening - Phase 1
-- Migration 0003: Add Security Constraints
-- ========================================
-- This migration adds critical security constraints for multi-tenancy,
-- secure user invitations, and data integrity.

-- ========================================
-- 1. Add organizationId to core tables
-- ========================================

-- Add organization column to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "organization_id" varchar;

-- Add organization column to worker_cases table
ALTER TABLE "worker_cases"
  ADD COLUMN IF NOT EXISTS "organization_id" varchar;

-- ========================================
-- 2. Create user_invites table for secure registration
-- ========================================

CREATE TABLE IF NOT EXISTS "user_invites" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "organization_id" varchar NOT NULL,
  "role" text NOT NULL,
  "subrole" text,
  "invited_by_user_id" varchar NOT NULL,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_invites_email_org_unique" UNIQUE ("email", "organization_id")
);

-- Add foreign key constraint (will be added after organizations table is created)
-- For now, we'll add a comment indicating this dependency
COMMENT ON COLUMN "user_invites"."invited_by_user_id" IS 'FK to users.id - user who created the invite';
COMMENT ON COLUMN "user_invites"."organization_id" IS 'FK to organizations.id - will be added in future migration';

-- ========================================
-- 3. Add unique constraints for multi-tenancy
-- ========================================

-- Ensure users are unique per organization
-- First, remove the global unique constraint on email
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";

-- Add unique constraint for email + organization combination
-- Note: This will fail if duplicate email+org combinations exist
-- Clean up duplicates before running this migration if needed
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_org_unique" UNIQUE ("email", "organization_id");

-- ========================================
-- 4. Add NOT NULL constraints (after data cleanup)
-- ========================================

-- These constraints enforce that all future records must have an organization
-- WARNING: Existing NULL values must be updated before uncommenting these

-- Uncomment after backfilling organization_id for existing users:
-- ALTER TABLE "users"
--   ALTER COLUMN "organization_id" SET NOT NULL;

-- Uncomment after backfilling organization_id for existing worker_cases:
-- ALTER TABLE "worker_cases"
--   ALTER COLUMN "organization_id" SET NOT NULL;

-- ========================================
-- 5. Add performance indexes
-- ========================================

-- Index for organization-based queries on users
CREATE INDEX IF NOT EXISTS "idx_users_organization_id" ON "users"("organization_id");

-- Index for organization-based queries on worker_cases
CREATE INDEX IF NOT EXISTS "idx_worker_cases_organization_id" ON "worker_cases"("organization_id");

-- Index for invite token lookups (used during registration)
CREATE INDEX IF NOT EXISTS "idx_user_invites_token" ON "user_invites"("token");

-- Index for finding pending invites
CREATE INDEX IF NOT EXISTS "idx_user_invites_expires_at" ON "user_invites"("expires_at") WHERE "accepted_at" IS NULL;

-- Composite index for organization + email lookups
CREATE INDEX IF NOT EXISTS "idx_user_invites_org_email" ON "user_invites"("organization_id", "email");

-- ========================================
-- 6. Add audit trail for security events
-- ========================================

CREATE TABLE IF NOT EXISTS "security_audit_log" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" text NOT NULL, -- 'login_success', 'login_failure', 'invite_sent', 'invite_accepted', 'password_change', etc.
  "user_id" varchar,
  "organization_id" varchar,
  "ip_address" text,
  "user_agent" text,
  "details" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Index for audit queries by user
CREATE INDEX IF NOT EXISTS "idx_security_audit_user_id" ON "security_audit_log"("user_id");

-- Index for audit queries by organization
CREATE INDEX IF NOT EXISTS "idx_security_audit_org_id" ON "security_audit_log"("organization_id");

-- Index for audit queries by event type
CREATE INDEX IF NOT EXISTS "idx_security_audit_event_type" ON "security_audit_log"("event_type");

-- Index for time-based audit queries
CREATE INDEX IF NOT EXISTS "idx_security_audit_created_at" ON "security_audit_log"("created_at" DESC);

-- ========================================
-- 7. Add session management table
-- ========================================

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "device_name" text,
  "ip_address" text,
  "user_agent" text,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "refresh_tokens_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token_hash" ON "refresh_tokens"("token_hash");

-- Index for user's active tokens
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_active" ON "refresh_tokens"("user_id") WHERE "revoked_at" IS NULL AND "expires_at" > NOW();

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens"("expires_at");

-- ========================================
-- 8. Add webhook security table
-- ========================================

CREATE TABLE IF NOT EXISTS "webhook_secrets" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" varchar NOT NULL,
  "service_name" text NOT NULL, -- 'freshdesk', 'stripe', etc.
  "secret_key" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "rotated_at" timestamp,
  CONSTRAINT "webhook_secrets_org_service_unique" UNIQUE ("organization_id", "service_name")
);

-- Index for webhook verification
CREATE INDEX IF NOT EXISTS "idx_webhook_secrets_org_service" ON "webhook_secrets"("organization_id", "service_name") WHERE "is_active" = true;

-- ========================================
-- 9. Add data retention tracking
-- ========================================

CREATE TABLE IF NOT EXISTS "data_retention_policy" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" varchar NOT NULL UNIQUE,
  "worker_cases_retention_days" integer NOT NULL DEFAULT 2555, -- 7 years (Worksafe Victoria requirement)
  "audit_logs_retention_days" integer NOT NULL DEFAULT 2555,
  "inactive_users_retention_days" integer NOT NULL DEFAULT 365,
  "last_cleanup_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ========================================
-- 10. Add failed login tracking (anti-brute force)
-- ========================================

CREATE TABLE IF NOT EXISTS "failed_login_attempts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "ip_address" text NOT NULL,
  "attempted_at" timestamp DEFAULT now() NOT NULL,
  "user_agent" text
);

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS "idx_failed_logins_email_ip" ON "failed_login_attempts"("email", "ip_address", "attempted_at" DESC);

-- Automatically delete old failed attempts (older than 24 hours)
-- This can be done via a scheduled job or trigger

-- ========================================
-- Migration complete
-- ========================================

-- Add migration tracking
CREATE TABLE IF NOT EXISTS "schema_migrations" (
  "version" varchar PRIMARY KEY,
  "applied_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "schema_migrations" ("version")
VALUES ('0003_add_security_constraints')
ON CONFLICT ("version") DO NOTHING;
