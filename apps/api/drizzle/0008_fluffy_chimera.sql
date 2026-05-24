CREATE TABLE "interview_code_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"interview_id" text NOT NULL,
	"question_id" text NOT NULL,
	"language" text NOT NULL,
	"yjs_snapshot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_code_documents" ADD CONSTRAINT "interview_code_documents_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_code_documents" ADD CONSTRAINT "interview_code_documents_question_id_interview_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."interview_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interview_code_documents_interview_question_unique" ON "interview_code_documents" USING btree ("interview_id","question_id");--> statement-breakpoint
CREATE INDEX "interview_code_documents_interview_id_idx" ON "interview_code_documents" USING btree ("interview_id");