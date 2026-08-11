ALTER TABLE "assessment_answers" DROP CONSTRAINT "assessment_answers_organisation_id_organisations_id_fk";
--> statement-breakpoint
ALTER TABLE "assessment_answers" DROP CONSTRAINT "assessment_answers_attempt_organisation_fk";
--> statement-breakpoint
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_organisation_id_organisations_id_fk";
--> statement-breakpoint
ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_team_organisation_fk";
--> statement-breakpoint
ALTER TABLE "assessment_results" DROP CONSTRAINT "assessment_results_organisation_id_organisations_id_fk";
--> statement-breakpoint
ALTER TABLE "assessment_results" DROP CONSTRAINT "assessment_results_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "assessment_results" DROP CONSTRAINT "assessment_results_attempt_organisation_fk";
--> statement-breakpoint
DROP INDEX "assessment_answers_organisation_id_idx";--> statement-breakpoint
DROP INDEX "assessment_attempts_id_organisation_id_unique";--> statement-breakpoint
DROP INDEX "assessment_attempts_organisation_id_idx";--> statement-breakpoint
DROP INDEX "assessment_attempts_organisation_id_user_id_idx";--> statement-breakpoint
DROP INDEX "assessment_attempts_organisation_id_team_id_idx";--> statement-breakpoint
DROP INDEX "assessment_attempts_team_id_idx";--> statement-breakpoint
DROP INDEX "assessment_results_organisation_id_idx";--> statement-breakpoint
DROP INDEX "assessment_results_organisation_id_attempt_id_idx";--> statement-breakpoint
DROP INDEX "assessment_results_user_id_idx";--> statement-breakpoint
ALTER TABLE "assessment_answers" DROP COLUMN "organisation_id";--> statement-breakpoint
ALTER TABLE "assessment_attempts" DROP COLUMN "organisation_id";--> statement-breakpoint
ALTER TABLE "assessment_attempts" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "assessment_results" DROP COLUMN "organisation_id";--> statement-breakpoint
ALTER TABLE "assessment_results" DROP COLUMN "user_id";