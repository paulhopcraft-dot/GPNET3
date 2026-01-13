CREATE TABLE "case_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(50),
	"email" text,
	"company" text,
	"notes" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_contacts" ADD CONSTRAINT "case_contacts_case_id_worker_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."worker_cases"("id") ON DELETE cascade ON UPDATE no action;