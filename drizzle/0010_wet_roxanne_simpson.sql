ALTER TABLE "hero_training_records" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_training_records" ADD COLUMN "completed_year" integer DEFAULT 2026 NOT NULL;