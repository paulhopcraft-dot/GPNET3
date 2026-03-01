CREATE TABLE "insurers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "insurers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo_url" text,
	"contact_name" text,
	"contact_phone" varchar(50),
	"contact_email" text,
	"insurer_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token_hash" text NOT NULL,
	"token_family" varchar NOT NULL,
	"device_name" text,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "assigned_to" varchar;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "assigned_to_name" varchar;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "completed_by" varchar;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "auto_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "email_reference" varchar;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "is_blocker" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "failed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "case_actions" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_source" varchar DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_confidence" varchar DEFAULT 'low';--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "compliance_override" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "compliance_override_value" text;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "compliance_override_reason" text;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "compliance_override_by" text;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "compliance_override_at" timestamp;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "master_ticket_id" text;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "case_status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "closed_reason" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;