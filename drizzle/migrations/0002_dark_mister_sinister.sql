ALTER TABLE "ai_insights" DROP CONSTRAINT "ai_insights_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_team_id_teams_id_fk";
--> statement-breakpoint
DROP INDEX "ai_insights_source_entity_id_idx";--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_team_organisation_fk" FOREIGN KEY ("team_id","organisation_id") REFERENCES "public"."teams"("id","organisation_id") ON DELETE restrict ON UPDATE no action;