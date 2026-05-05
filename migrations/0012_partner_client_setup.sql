-- Partner-tier slice 2: rich client metadata so partner users can self-onboard
-- new clients without engineering involvement.
-- See .planning/partner-tier/PLAN-SLICE-2.md for the field rationale.
--
-- All columns are nullable / additive. No backfill required for existing rows.

ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "abn" varchar(11),
  ADD COLUMN IF NOT EXISTS "worksafe_state" text,
  ADD COLUMN IF NOT EXISTS "policy_number" text,
  ADD COLUMN IF NOT EXISTS "wic_code" varchar(20),
  ADD COLUMN IF NOT EXISTS "address_line_1" text,
  ADD COLUMN IF NOT EXISTS "address_line_2" text,
  ADD COLUMN IF NOT EXISTS "suburb" text,
  ADD COLUMN IF NOT EXISTS "state" text,
  ADD COLUMN IF NOT EXISTS "postcode" varchar(4),
  ADD COLUMN IF NOT EXISTS "insurer_claim_contact_email" text,
  ADD COLUMN IF NOT EXISTS "rtw_coordinator_name" text,
  ADD COLUMN IF NOT EXISTS "rtw_coordinator_email" text,
  ADD COLUMN IF NOT EXISTS "rtw_coordinator_phone" varchar(50),
  ADD COLUMN IF NOT EXISTS "hr_contact_name" text,
  ADD COLUMN IF NOT EXISTS "hr_contact_email" text,
  ADD COLUMN IF NOT EXISTS "hr_contact_phone" varchar(50),
  ADD COLUMN IF NOT EXISTS "notification_emails" text,
  ADD COLUMN IF NOT EXISTS "employee_count" text,
  ADD COLUMN IF NOT EXISTS "notes" text;

COMMENT ON COLUMN "organizations"."abn" IS 'Australian Business Number (11 digits, validated as numeric).';
COMMENT ON COLUMN "organizations"."worksafe_state" IS 'AU state code under whose WorkSafe regulator the org operates (VIC/NSW/QLD/WA/SA/TAS/ACT/NT).';
COMMENT ON COLUMN "organizations"."policy_number" IS 'Insurer policy number for this org.';
COMMENT ON COLUMN "organizations"."wic_code" IS 'WorkSafe Industry Classification code.';
COMMENT ON COLUMN "organizations"."state" IS 'AU state code for the org address (VIC/NSW/QLD/WA/SA/TAS/ACT/NT).';
COMMENT ON COLUMN "organizations"."notification_emails" IS 'Comma-separated email list for case alerts. Trimmed/lowercased on write.';
COMMENT ON COLUMN "organizations"."employee_count" IS 'Approximate band: 1-10 / 11-50 / 51-200 / 201-500 / 500+.';
