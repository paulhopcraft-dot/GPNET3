CREATE TABLE "audit_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar,
	"organisation_id" varchar,
	"event_type" text NOT NULL,
	"resource_type" text,
	"resource_id" varchar,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "case_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_discussion_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"note_id" text NOT NULL,
	"area" text NOT NULL,
	"severity" text NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_discussion_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"worker_name" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"raw_text" text NOT NULL,
	"summary" text NOT NULL,
	"next_steps" json,
	"risk_flags" json,
	"updates_compliance" boolean DEFAULT false,
	"updates_recovery_timeline" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "medical_certificates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"issue_date" timestamp NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"capacity" text NOT NULL,
	"notes" text,
	"source" text DEFAULT 'freshdesk' NOT NULL,
	"document_url" text,
	"source_reference" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"subrole" text,
	"company_id" varchar,
	"insurer_id" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "worker_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_name" text NOT NULL,
	"company" text NOT NULL,
	"date_of_injury" timestamp NOT NULL,
	"risk_level" text NOT NULL,
	"work_status" text NOT NULL,
	"has_certificate" boolean DEFAULT false NOT NULL,
	"certificate_url" text,
	"compliance_indicator" text NOT NULL,
	"compliance_json" jsonb,
	"current_status" text NOT NULL,
	"next_step" text NOT NULL,
	"owner" text NOT NULL,
	"due_date" text NOT NULL,
	"summary" text NOT NULL,
	"ticket_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"ticket_count" text DEFAULT '1' NOT NULL,
	"ai_summary" text,
	"ai_summary_generated_at" timestamp,
	"ai_summary_model" text,
	"ai_work_status_classification" text,
	"ticket_last_updated_at" timestamp,
	"clc_last_follow_up" text,
	"clc_next_follow_up" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_discussion_insights" ADD CONSTRAINT "case_discussion_insights_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_discussion_insights" ADD CONSTRAINT "case_discussion_insights_note_id_case_discussion_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."case_discussion_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_discussion_notes" ADD CONSTRAINT "case_discussion_notes_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE no action ON UPDATE no action;