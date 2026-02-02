CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"template_type" varchar NOT NULL,
	"template_name" varchar,
	"subject_template" text NOT NULL,
	"body_template" text NOT NULL,
	"format" varchar DEFAULT 'plain' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_employment_assessment_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" varchar NOT NULL,
	"component_type" text NOT NULL,
	"component_name" text NOT NULL,
	"result" text,
	"measurement_value" text,
	"measurement_unit" text,
	"normal_range" text,
	"recommendations" text,
	"restrictions" jsonb,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"completed_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_employment_assessments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_email" text,
	"candidate_phone" text,
	"date_of_birth" timestamp,
	"position_title" text NOT NULL,
	"department_name" text,
	"role_id" varchar,
	"assessment_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"clearance_level" text,
	"medical_restrictions" jsonb,
	"functional_capacity_json" jsonb,
	"assessor_name" text,
	"assessor_type" text,
	"assessment_location" text,
	"report_url" text,
	"certificate_url" text,
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_employment_health_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" varchar NOT NULL,
	"previous_injuries" text,
	"ongoing_medical_conditions" text,
	"current_medications" text,
	"allergies" text,
	"previous_workers_comp_claims" boolean DEFAULT false,
	"previous_workers_comp_claims_details" text,
	"smoking_status" text,
	"exercise_level" text,
	"health_declaration_complete" boolean DEFAULT false,
	"health_declaration_date" timestamp,
	"declaration_accurate" boolean DEFAULT false,
	"consent_to_assessment" boolean DEFAULT false,
	"consent_to_data_sharing" boolean DEFAULT false,
	"consent_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_employment_health_requirements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"role_id" varchar,
	"position_title" text NOT NULL,
	"requires_baseline_health" boolean DEFAULT true,
	"requires_functional_capacity" boolean DEFAULT false,
	"requires_medical_screening" boolean DEFAULT false,
	"requires_fitness_for_duty" boolean DEFAULT false,
	"requires_psychological_assessment" boolean DEFAULT false,
	"requires_substance_screening" boolean DEFAULT false,
	"minimum_lifting_capacity_kg" integer,
	"requires_extended_standing" boolean DEFAULT false,
	"requires_extended_sitting" boolean DEFAULT false,
	"requires_climbing" boolean DEFAULT false,
	"requires_driving" boolean DEFAULT false,
	"required_certifications" text,
	"medical_clearance_validity_months" integer DEFAULT 12,
	"legislative_requirement" text,
	"industry_standards" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rtw_approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_version_id" varchar NOT NULL,
	"approver_id" varchar NOT NULL,
	"status" varchar NOT NULL,
	"reason" text,
	"modification_comments" text,
	"notification_sent" boolean DEFAULT false,
	"notification_sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rtw_duties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_modifiable" boolean DEFAULT false NOT NULL,
	"risk_flags" text[] DEFAULT ARRAY[]::text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rtw_duty_demands" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duty_id" varchar NOT NULL,
	"bending" varchar DEFAULT 'never' NOT NULL,
	"squatting" varchar DEFAULT 'never' NOT NULL,
	"kneeling" varchar DEFAULT 'never' NOT NULL,
	"twisting" varchar DEFAULT 'never' NOT NULL,
	"reaching_overhead" varchar DEFAULT 'never' NOT NULL,
	"reaching_forward" varchar DEFAULT 'never' NOT NULL,
	"lifting" varchar DEFAULT 'never' NOT NULL,
	"lifting_max_kg" integer,
	"carrying" varchar DEFAULT 'never' NOT NULL,
	"carrying_max_kg" integer,
	"standing" varchar DEFAULT 'never' NOT NULL,
	"sitting" varchar DEFAULT 'never' NOT NULL,
	"walking" varchar DEFAULT 'never' NOT NULL,
	"repetitive_movements" varchar DEFAULT 'never' NOT NULL,
	"concentration" varchar DEFAULT 'never' NOT NULL,
	"stress_tolerance" varchar DEFAULT 'never' NOT NULL,
	"work_pace" varchar DEFAULT 'never' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "rtw_duty_demands_duty_id_unique" UNIQUE("duty_id")
);
--> statement-breakpoint
CREATE TABLE "rtw_plan_duties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_version_id" varchar NOT NULL,
	"duty_id" varchar NOT NULL,
	"suitability" varchar NOT NULL,
	"modification_notes" text,
	"excluded_reason" text,
	"manually_overridden" boolean DEFAULT false,
	"override_reason" text,
	"overridden_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rtw_plan_schedule" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_version_id" varchar NOT NULL,
	"week_number" integer NOT NULL,
	"hours_per_day" numeric(4, 2) NOT NULL,
	"days_per_week" integer NOT NULL,
	"duties_json" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rtw_plan_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"version" integer NOT NULL,
	"data_json" jsonb NOT NULL,
	"created_by" varchar NOT NULL,
	"change_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rtw_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"case_id" varchar NOT NULL,
	"worker_id" varchar,
	"role_id" varchar,
	"plan_type" varchar DEFAULT 'graduated_return' NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp,
	"target_end_date" timestamp,
	"restriction_review_date" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rtw_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD COLUMN "functional_restrictions_json" jsonb;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_assessment_components" ADD CONSTRAINT "pre_employment_assessment_components_assessment_id_pre_employment_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."pre_employment_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_assessments" ADD CONSTRAINT "pre_employment_assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_assessments" ADD CONSTRAINT "pre_employment_assessments_role_id_rtw_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."rtw_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_assessments" ADD CONSTRAINT "pre_employment_assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_health_history" ADD CONSTRAINT "pre_employment_health_history_assessment_id_pre_employment_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."pre_employment_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_health_requirements" ADD CONSTRAINT "pre_employment_health_requirements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_health_requirements" ADD CONSTRAINT "pre_employment_health_requirements_role_id_rtw_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."rtw_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_employment_health_requirements" ADD CONSTRAINT "pre_employment_health_requirements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_approvals" ADD CONSTRAINT "rtw_approvals_plan_version_id_rtw_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."rtw_plan_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_approvals" ADD CONSTRAINT "rtw_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_duties" ADD CONSTRAINT "rtw_duties_role_id_rtw_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."rtw_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_duties" ADD CONSTRAINT "rtw_duties_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_duty_demands" ADD CONSTRAINT "rtw_duty_demands_duty_id_rtw_duties_id_fk" FOREIGN KEY ("duty_id") REFERENCES "public"."rtw_duties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plan_duties" ADD CONSTRAINT "rtw_plan_duties_plan_version_id_rtw_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."rtw_plan_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plan_duties" ADD CONSTRAINT "rtw_plan_duties_duty_id_rtw_duties_id_fk" FOREIGN KEY ("duty_id") REFERENCES "public"."rtw_duties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plan_duties" ADD CONSTRAINT "rtw_plan_duties_overridden_by_users_id_fk" FOREIGN KEY ("overridden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plan_schedule" ADD CONSTRAINT "rtw_plan_schedule_plan_version_id_rtw_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."rtw_plan_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plan_versions" ADD CONSTRAINT "rtw_plan_versions_plan_id_rtw_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."rtw_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plan_versions" ADD CONSTRAINT "rtw_plan_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plans" ADD CONSTRAINT "rtw_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plans" ADD CONSTRAINT "rtw_plans_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plans" ADD CONSTRAINT "rtw_plans_role_id_rtw_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."rtw_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_plans" ADD CONSTRAINT "rtw_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rtw_roles" ADD CONSTRAINT "rtw_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;