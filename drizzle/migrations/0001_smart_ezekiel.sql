CREATE UNIQUE INDEX "teams_id_organisation_id_unique" ON "teams" USING btree ("id","organisation_id");--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_organisation_fk" FOREIGN KEY ("team_id","organisation_id") REFERENCES "public"."teams"("id","organisation_id") ON DELETE cascade ON UPDATE no action;
