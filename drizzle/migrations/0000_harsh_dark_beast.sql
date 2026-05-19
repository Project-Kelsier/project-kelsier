CREATE TYPE "public"."assessment_version_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."organisation_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('lead', 'member');--> statement-breakpoint
CREATE TYPE "public"."organisation_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."pilot_request_status" AS ENUM('pending', 'contacted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"team_id" uuid,
	"user_id" uuid,
	"source_entity_id" uuid NOT NULL,
	"source_entity_type" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" double precision,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"r2_object_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"team_id" uuid,
	"user_id" uuid NOT NULL,
	"assessment_version_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"score_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"sort_order" integer NOT NULL,
	"prompt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assessment_version_id" uuid NOT NULL,
	"trait_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "assessment_version_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisation_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organisation_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "organisation_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"company_name" text NOT NULL,
	"status" "pilot_request_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personality_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"trait_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "team_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_option_id_assessment_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."assessment_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_version_id_assessment_versions_id_fk" FOREIGN KEY ("assessment_version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_options" ADD CONSTRAINT "assessment_options_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_version_id_assessment_versions_id_fk" FOREIGN KEY ("assessment_version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_requests" ADD CONSTRAINT "pilot_requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_profiles" ADD CONSTRAINT "personality_profiles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personality_profiles" ADD CONSTRAINT "personality_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_insights_organisation_id_idx" ON "ai_insights" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "ai_insights_team_id_idx" ON "ai_insights" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "ai_insights_user_id_idx" ON "ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_insights_source_entity_id_idx" ON "ai_insights" USING btree ("source_entity_id");--> statement-breakpoint
CREATE INDEX "ai_insights_generated_at_idx" ON "ai_insights" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "ai_insights_created_at_idx" ON "ai_insights" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_answers_attempt_id_question_id_unique" ON "assessment_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "assessment_answers_organisation_id_idx" ON "assessment_answers" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "assessment_answers_attempt_id_idx" ON "assessment_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "assessment_answers_question_id_idx" ON "assessment_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "assessment_answers_option_id_idx" ON "assessment_answers" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "assessment_answers_created_at_idx" ON "assessment_answers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assessment_attempts_organisation_id_idx" ON "assessment_attempts" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_team_id_idx" ON "assessment_attempts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_user_id_idx" ON "assessment_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_assessment_version_id_idx" ON "assessment_attempts" USING btree ("assessment_version_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_created_at_idx" ON "assessment_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_options_question_id_sort_order_unique" ON "assessment_options" USING btree ("question_id","sort_order");--> statement-breakpoint
CREATE INDEX "assessment_options_question_id_idx" ON "assessment_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "assessment_options_created_at_idx" ON "assessment_options" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_version_id_sort_order_unique" ON "assessment_questions" USING btree ("version_id","sort_order");--> statement-breakpoint
CREATE INDEX "assessment_questions_version_id_idx" ON "assessment_questions" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "assessment_questions_created_at_idx" ON "assessment_questions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_results_attempt_id_unique" ON "assessment_results" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "assessment_results_organisation_id_idx" ON "assessment_results" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "assessment_results_user_id_idx" ON "assessment_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_results_assessment_version_id_idx" ON "assessment_results" USING btree ("assessment_version_id");--> statement-breakpoint
CREATE INDEX "assessment_results_created_at_idx" ON "assessment_results" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_versions_slug_unique" ON "assessment_versions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "assessment_versions_slug_idx" ON "assessment_versions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "assessment_versions_status_idx" ON "assessment_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_versions_created_at_idx" ON "assessment_versions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_members_organisation_id_user_id_unique" ON "organisation_members" USING btree ("organisation_id","user_id");--> statement-breakpoint
CREATE INDEX "organisation_members_organisation_id_idx" ON "organisation_members" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "organisation_members_user_id_idx" ON "organisation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organisation_members_created_at_idx" ON "organisation_members" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_team_id_user_id_unique" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "team_members_organisation_id_idx" ON "team_members" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_members_created_at_idx" ON "team_members" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organisations_slug_unique" ON "organisations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organisations_slug_idx" ON "organisations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organisations_status_idx" ON "organisations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organisations_created_at_idx" ON "organisations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pilot_requests_organisation_id_idx" ON "pilot_requests" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "pilot_requests_status_idx" ON "pilot_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pilot_requests_created_at_idx" ON "pilot_requests" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "personality_profiles_organisation_id_user_id_unique" ON "personality_profiles" USING btree ("organisation_id","user_id");--> statement-breakpoint
CREATE INDEX "personality_profiles_organisation_id_idx" ON "personality_profiles" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "personality_profiles_user_id_idx" ON "personality_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personality_profiles_created_at_idx" ON "personality_profiles" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_organisation_id_slug_unique" ON "teams" USING btree ("organisation_id","slug");--> statement-breakpoint
CREATE INDEX "teams_organisation_id_idx" ON "teams" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "teams_slug_idx" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "teams_status_idx" ON "teams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teams_created_at_idx" ON "teams" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_user_id_unique" ON "users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "users_auth_user_id_idx" ON "users" USING btree ("auth_user_id");