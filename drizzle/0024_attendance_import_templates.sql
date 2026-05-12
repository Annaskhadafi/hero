CREATE TABLE "hero_timesheet_attendance_import_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"template_name" text NOT NULL,
	"source_type" text DEFAULT 'fingerprint' NOT NULL,
	"sheet_name" text DEFAULT '' NOT NULL,
	"header_row" integer,
	"column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"match_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_import_templates" ADD CONSTRAINT "hero_timesheet_attendance_import_templates_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_attendance_import_templates_site_name_uidx" ON "hero_timesheet_attendance_import_templates" USING btree ("site_id","template_name");
