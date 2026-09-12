ALTER TABLE "assessment_results" DROP CONSTRAINT "assessment_results_attempt_id_assessment_attempts_id_fk";
--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD COLUMN "required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD COLUMN "contributing_question_counts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD COLUMN "scoring_algorithm_version" text DEFAULT 'weighted-average-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "guest_sessions" ADD COLUMN "expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
CREATE INDEX "guest_sessions_expires_at_idx" ON "guest_sessions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_id_assessment_version_id_unique" UNIQUE("id","assessment_version_id");