ALTER TABLE "hero_sites"
ADD COLUMN IF NOT EXISTS "allow_outside_attendance" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_configs"
ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'WITA' NOT NULL;
