ALTER TABLE "hero_training_records" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_training_records" ADD COLUMN IF NOT EXISTS "completed_year" integer;--> statement-breakpoint
UPDATE "hero_training_records"
SET "completed_year" = COALESCE("completed_year", EXTRACT(YEAR FROM COALESCE("expires_at", CURRENT_DATE))::integer)
WHERE "completed_year" IS NULL;--> statement-breakpoint
ALTER TABLE "hero_training_records" ALTER COLUMN "completed_year" SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer;--> statement-breakpoint
ALTER TABLE "hero_training_records" ALTER COLUMN "completed_year" SET NOT NULL;
