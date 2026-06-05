ALTER TABLE "hero_hc_online_test_questions" ADD COLUMN IF NOT EXISTS "image_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_assignments" ADD COLUMN IF NOT EXISTS "expires_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_assignments" ADD COLUMN IF NOT EXISTS "score" integer;
--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_answers" ADD COLUMN IF NOT EXISTS "points_awarded" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_assignments" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_assignments" ADD COLUMN IF NOT EXISTS "tab_leave_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_assignments" ADD COLUMN IF NOT EXISTS "refresh_count" integer DEFAULT 0 NOT NULL;
