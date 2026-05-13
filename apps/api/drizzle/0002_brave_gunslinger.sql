CREATE TABLE "answer_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"interview_id" text NOT NULL,
	"question_id" text NOT NULL,
	"answer_id" text NOT NULL,
	"score" integer NOT NULL,
	"summary" text NOT NULL,
	"strengths" jsonb NOT NULL,
	"weaknesses" jsonb NOT NULL,
	"follow_up_question" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_evaluations" ADD CONSTRAINT "answer_evaluations_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_evaluations" ADD CONSTRAINT "answer_evaluations_question_id_interview_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."interview_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_evaluations" ADD CONSTRAINT "answer_evaluations_answer_id_interview_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."interview_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "answer_evaluations_answer_unique" ON "answer_evaluations" USING btree ("answer_id");