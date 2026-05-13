CREATE INDEX "answer_evaluations_interview_id_idx" ON "answer_evaluations" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_questions_interview_id_idx" ON "interview_questions" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interviews_user_id_idx" ON "interviews" USING btree ("user_id");