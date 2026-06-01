ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_team_organisation_fk" FOREIGN KEY ("team_id","organisation_id") REFERENCES "public"."teams"("id","organisation_id") ON DELETE restrict ON UPDATE no action;