CREATE TABLE "hero_cargo_master_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_cargo_master_sites_site_name_unique" UNIQUE("site_name")
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_scheduling_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"period" text NOT NULL,
	"site_schedule_type" text DEFAULT 'office' NOT NULL,
	"draft_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fixed_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"field_break_config" jsonb,
	"saved_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_central_service_employees" ADD COLUMN "section" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" ADD COLUMN "site_id" integer;--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" ADD COLUMN "signature_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" ADD COLUMN "signature_data_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_plans" ADD CONSTRAINT "hero_timesheet_scheduling_plans_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_plans" ADD CONSTRAINT "hero_timesheet_scheduling_plans_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_scheduling_plans_site_period_uidx" ON "hero_timesheet_scheduling_plans" USING btree ("site_id","period");--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" ADD CONSTRAINT "hero_cargo_manifests_site_id_hero_cargo_master_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_cargo_master_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" ADD CONSTRAINT "hero_cargo_manifests_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;