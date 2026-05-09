CREATE TABLE IF NOT EXISTS "hero_timesheet_scheduling_configs" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "schedule_type" text DEFAULT 'office' NOT NULL,
  "roster_type" text DEFAULT '5:2' NOT NULL,
  "msa_type" text DEFAULT 'staff-nonstaff' NOT NULL,
  "meals_type" text DEFAULT 'field-break' NOT NULL,
  "overtime_type" text DEFAULT 'five-hour' NOT NULL,
  "field_break_config" jsonb,
  "allowance_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "overtime_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "saved_by_user_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "hero_timesheet_scheduling_configs" ADD CONSTRAINT "hero_timesheet_scheduling_configs_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade;
ALTER TABLE "hero_timesheet_scheduling_configs" ADD CONSTRAINT "hero_timesheet_scheduling_configs_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null;
CREATE UNIQUE INDEX IF NOT EXISTS "hero_timesheet_scheduling_configs_site_uidx" ON "hero_timesheet_scheduling_configs" USING btree ("site_id");

CREATE TABLE IF NOT EXISTS "hero_timesheet_scheduling_statuses" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "period" text NOT NULL,
  "schedule_status" text DEFAULT 'draft' NOT NULL,
  "attendance_status" text DEFAULT 'draft' NOT NULL,
  "import_status" text DEFAULT 'none' NOT NULL,
  "conflict_count" integer DEFAULT 0 NOT NULL,
  "last_generated_at" timestamp,
  "last_saved_at" timestamp,
  "last_imported_at" timestamp,
  "finalized_at" timestamp,
  "saved_by_user_id" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "hero_timesheet_scheduling_statuses" ADD CONSTRAINT "hero_timesheet_scheduling_statuses_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade;
ALTER TABLE "hero_timesheet_scheduling_statuses" ADD CONSTRAINT "hero_timesheet_scheduling_statuses_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null;
CREATE UNIQUE INDEX IF NOT EXISTS "hero_timesheet_scheduling_statuses_site_period_uidx" ON "hero_timesheet_scheduling_statuses" USING btree ("site_id","period");

CREATE TABLE IF NOT EXISTS "hero_timesheet_attendance_import_previews" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL,
  "period" text NOT NULL,
  "filename" text NOT NULL,
  "status" text DEFAULT 'preview' NOT NULL,
  "matched_count" integer DEFAULT 0 NOT NULL,
  "unmatched_count" integer DEFAULT 0 NOT NULL,
  "cell_count" integer DEFAULT 0 NOT NULL,
  "conflict_count" integer DEFAULT 0 NOT NULL,
  "preview_rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "uploaded_by_user_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "applied_at" timestamp
);
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD CONSTRAINT "hero_timesheet_attendance_import_previews_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade;
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD CONSTRAINT "hero_timesheet_attendance_import_previews_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null;
