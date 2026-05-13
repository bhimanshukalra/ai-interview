ALTER TABLE "interviews" ADD COLUMN "user_id" text;
--> statement-breakpoint
UPDATE "interviews" SET "user_id" = 'legacy-user' WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "user_id" SET NOT NULL;
