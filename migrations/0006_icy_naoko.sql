ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_requires_review" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_extraction_method" varchar DEFAULT 'fallback';--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_source_text" text;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_ai_reasoning" text;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_reviewed_by" varchar;--> statement-breakpoint
ALTER TABLE "worker_cases" ADD COLUMN "date_of_injury_reviewed_at" timestamp;