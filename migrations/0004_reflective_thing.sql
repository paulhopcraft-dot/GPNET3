CREATE TABLE "case_compliance_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"rule_id" varchar NOT NULL,
	"status" text NOT NULL,
	"checked_at" timestamp NOT NULL,
	"finding" text,
	"recommendation" text,
	"action_created" boolean DEFAULT false,
	"action_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_code" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"document_references" jsonb NOT NULL,
	"check_type" text NOT NULL,
	"severity" text NOT NULL,
	"evaluation_logic" jsonb NOT NULL,
	"recommended_action" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "compliance_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
ALTER TABLE "case_compliance_checks" ADD CONSTRAINT "case_compliance_checks_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_compliance_checks" ADD CONSTRAINT "case_compliance_checks_rule_id_compliance_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."compliance_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_compliance_checks" ADD CONSTRAINT "case_compliance_checks_action_id_case_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."case_actions"("id") ON DELETE no action ON UPDATE no action;