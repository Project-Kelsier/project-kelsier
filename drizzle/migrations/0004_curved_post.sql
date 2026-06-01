CREATE UNIQUE INDEX "assessment_options_id_question_id_unique" ON "assessment_options" USING btree ("id","question_id");--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_option_question_fk" FOREIGN KEY ("option_id","question_id") REFERENCES "public"."assessment_options"("id","question_id") ON DELETE restrict ON UPDATE no action;
