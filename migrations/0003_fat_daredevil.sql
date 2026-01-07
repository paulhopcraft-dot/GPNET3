CREATE TABLE "compliance_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"section_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"full_reference" text NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
