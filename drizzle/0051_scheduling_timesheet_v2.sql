CREATE TABLE IF NOT EXISTS "hero_timesheet_scheduling_plans_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"draft_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hero_timesheet_scheduling_plans_v2" ADD CONSTRAINT "hero_timesheet_scheduling_plans_v2_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hero_timesheet_scheduling_plans_v2" ADD CONSTRAINT "hero_timesheet_scheduling_plans_v2_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hero_timesheet_scheduling_plans_v2" ADD CONSTRAINT "hero_timesheet_scheduling_plans_v2_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hero_timesheet_scheduling_plans_v2_site_period_uidx" ON "hero_timesheet_scheduling_plans_v2" USING btree ("site_id","period");
