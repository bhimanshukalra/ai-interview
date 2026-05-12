CREATE TABLE "interview_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"interview_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"question" text NOT NULL,
	"difficulty" text NOT NULL,
	"type" text NOT NULL,
	"rubric_excellent" text NOT NULL,
	"rubric_good" text NOT NULL,
	"rubric_weak" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"role" text NOT NULL,
	"level" text NOT NULL,
	"type" text NOT NULL,
	"topic" text,
	"question_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;