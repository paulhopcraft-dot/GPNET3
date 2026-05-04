-- Partner-tier tenancy model: WorkBetter (HR consultancy) and similar partners
-- can manage cases on behalf of multiple employer-clients.
-- See docs/DECISIONS.md (2026-05-04) for the data-model rationale.

-- Discriminator on organizations:
--   'employer' (default, all existing rows) - owns its own cases
--   'partner'  - manages cases on behalf of others
ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'employer' NOT NULL;

COMMENT ON COLUMN "organizations"."kind" IS 'Organization kind: employer (owns its own cases) or partner (manages cases on behalf of other employer organizations).';

-- Track-distinguisher on worker_cases:
--   NULL        = preventative case (no WorkCover claim)
--   populated   = injury case (WorkCover claim number)
ALTER TABLE "worker_cases"
ADD COLUMN IF NOT EXISTS "claim_number" text;

COMMENT ON COLUMN "worker_cases"."claim_number" IS 'WorkCover claim number. NULL means preventative case (non-work-related condition); populated means injury management case.';

-- Many-to-many access table: which client organizations a partner-role user
-- can switch into. Composite PK on (user_id, organization_id).
CREATE TABLE IF NOT EXISTS "partner_user_organizations" (
  "user_id" varchar NOT NULL,
  "organization_id" varchar NOT NULL,
  "granted_at" timestamp DEFAULT now() NOT NULL,
  "granted_by" varchar,
  CONSTRAINT "partner_user_organizations_user_id_organization_id_pk" PRIMARY KEY ("user_id", "organization_id"),
  CONSTRAINT "partner_user_organizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "partner_user_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "partner_user_organizations_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "partner_user_organizations_user_id_idx"
ON "partner_user_organizations" USING btree ("user_id");
