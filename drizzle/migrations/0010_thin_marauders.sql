ALTER TABLE "assessment_attempts" ADD COLUMN "resumed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "continuation_token_hash" text DEFAULT encode(digest(gen_random_uuid()::text, 'sha256'), 'hex') NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD COLUMN "current_question_index" integer DEFAULT 0 NOT NULL;