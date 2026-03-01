-- Add functional_restrictions_json column to medical_certificates table
-- Stores structured FunctionalRestrictionsExtracted data from certificate parsing
-- Used by RTW Planner Engine for restriction-to-duty matching

ALTER TABLE "medical_certificates"
ADD COLUMN IF NOT EXISTS "functional_restrictions_json" jsonb;

-- Comment for documentation
COMMENT ON COLUMN "medical_certificates"."functional_restrictions_json" IS 'Structured functional restrictions extracted from certificate data by Claude Haiku. Stores FunctionalRestrictionsExtracted interface including capabilities, weight limits, and time limits.';
