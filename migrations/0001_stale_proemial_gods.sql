CREATE TABLE "case_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"case_id" varchar NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"priority" integer DEFAULT 1,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "certificate_expiry_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" varchar NOT NULL,
	"alert_type" text NOT NULL,
	"alert_date" timestamp NOT NULL,
	"acknowledged" boolean DEFAULT false,
	"acknowledged_by" varchar,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "document_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "email_drafts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"case_id" varchar NOT NULL,
	"email_type" text NOT NULL,
	"recipient" text NOT NULL,
	"recipient_name" text,
	"recipient_email" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"tone" text DEFAULT 'formal' NOT NULL,
	"additional_context" text,
	"case_context_snapshot" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_case_id" varchar,
	"template_code" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"case_id" varchar,
	"recipient_id" varchar,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"failure_reason" text,
	"dedupe_key" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "termination_processes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"worker_case_id" varchar NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"pre_injury_role" text,
	"rtw_attempts_summary" text,
	"has_sustainable_role" boolean,
	"alternative_roles_considered_summary" text,
	"agent_meeting_date" timestamp,
	"agent_meeting_notes_id" text,
	"consultant_invite_date" timestamp,
	"consultant_appointment_date" timestamp,
	"consultant_report_id" text,
	"long_term_restrictions_summary" text,
	"can_return_pre_injury_role" boolean,
	"pre_termination_invite_sent_date" timestamp,
	"pre_termination_meeting_date" timestamp,
	"pre_termination_meeting_location" text,
	"worker_allowed_representative" boolean,
	"worker_instructed_not_to_attend_work" boolean,
	"pay_status_during_stand_down" text,
	"pre_termination_letter_doc_id" text,
	"pre_termination_meeting_held" boolean,
	"pre_termination_meeting_notes_id" text,
	"any_new_medical_info_provided" boolean,
	"new_medical_docs_summary" text,
	"decision" text DEFAULT 'NO_DECISION' NOT NULL,
	"decision_date" timestamp,
	"decision_rationale" text,
	"termination_effective_date" timestamp,
	"termination_notice_weeks" integer,
	"notice_type" text,
	"termination_letter_doc_id" text,
	"entitlements_summary" text,
	"ongoing_comp_arrangements" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"organization_id" varchar NOT NULL,
	"role" text NOT NULL,
	"subrole" text,
	"invited_by_user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "webhook_form_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" text NOT NULL,
	"organization_id" varchar NOT NULL,
	"form_type" text NOT NULL,
	"webhook_password" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_form_mappings_form_id_unique" UNIQUE("form_id")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "case_attachments" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "case_discussion_notes" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "certificate_type" text DEFAULT 'medical_certificate' NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "organization_id" varchar;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "worker_id" varchar;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "document_id" varchar;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "restrictions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "treating_practitioner" varchar;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "practitioner_type" varchar;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "clinic_name" varchar;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "raw_extracted_data" jsonb;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "extraction_confidence" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "requires_review" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "is_current_certificate" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "review_date" timestamp;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "file_name" varchar;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "file_url" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "organization_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "clinical_status_json" jsonb;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "employment_status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "termination_process_id" varchar;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "termination_reason" text;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "termination_audit_flag" text;--> statement-breakpoint
ALTER TABLE "case_actions" ADD CONSTRAINT "case_actions_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_expiry_alerts" ADD CONSTRAINT "certificate_expiry_alerts_certificate_id_medical_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."medical_certificates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_worker_case_id_worker_cases_id_fk" FOREIGN KEY ("worker_case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_processes" ADD CONSTRAINT "termination_processes_worker_case_id_worker_cases_id_fk" FOREIGN KEY ("worker_case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;