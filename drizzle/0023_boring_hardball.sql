CREATE TABLE "hero_employee_site_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"assignment_type" text DEFAULT 'primary' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_indonesia_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"local_name" text NOT NULL,
	"country_code" text DEFAULT 'ID' NOT NULL,
	"source" text DEFAULT 'openholiday' NOT NULL,
	"source_id" text,
	"types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nationwide" boolean DEFAULT true NOT NULL,
	"raw_payload" jsonb,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_attendance_employee_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"alias_name" text DEFAULT '' NOT NULL,
	"alias_sn" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'attendance-import' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_attendance_import_previews" (
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
	"template_id" integer,
	"template_kind" text DEFAULT 'auto' NOT NULL,
	"sheet_name" text DEFAULT '' NOT NULL,
	"detection_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validation_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"applied_at" timestamp,
	"deleted_at" timestamp,
	"rolled_back_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_attendance_import_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"template_name" text NOT NULL,
	"source_type" text DEFAULT 'fingerprint' NOT NULL,
	"sheet_name" text DEFAULT '' NOT NULL,
	"header_row" integer,
	"column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"match_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"template_kind" text DEFAULT 'auto' NOT NULL,
	"header_signature" text DEFAULT '' NOT NULL,
	"last_used_at" timestamp,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_scheduling_configs" (
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
--> statement-breakpoint
CREATE TABLE "hero_timesheet_scheduling_statuses" (
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
--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ALTER COLUMN "on_site_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ALTER COLUMN "day_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ALTER COLUMN "day_count" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ALTER COLUMN "field_break_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD COLUMN "confidence_score" numeric(4, 3);--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD COLUMN "device_type" text;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD COLUMN "import_preview_id" integer;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD COLUMN "validation_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD COLUMN "work_minutes" integer;--> statement-breakpoint
ALTER TABLE "hero_employee_site_assignments" ADD CONSTRAINT "hero_employee_site_assignments_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_site_assignments" ADD CONSTRAINT "hero_employee_site_assignments_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_employee_aliases" ADD CONSTRAINT "hero_timesheet_attendance_employee_aliases_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_employee_aliases" ADD CONSTRAINT "hero_timesheet_attendance_employee_aliases_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD CONSTRAINT "hero_timesheet_attendance_import_previews_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD CONSTRAINT "hero_timesheet_attendance_import_previews_template_id_hero_timesheet_attendance_import_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hero_timesheet_attendance_import_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD CONSTRAINT "hero_timesheet_attendance_import_previews_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_import_templates" ADD CONSTRAINT "hero_timesheet_attendance_import_templates_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_configs" ADD CONSTRAINT "hero_timesheet_scheduling_configs_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_configs" ADD CONSTRAINT "hero_timesheet_scheduling_configs_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_statuses" ADD CONSTRAINT "hero_timesheet_scheduling_statuses_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_statuses" ADD CONSTRAINT "hero_timesheet_scheduling_statuses_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_employee_site_assignments_employee_site_effective_uq" ON "hero_employee_site_assignments" USING btree ("employee_id","site_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_indonesia_holidays_date_source_uidx" ON "hero_indonesia_holidays" USING btree ("date","source");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_attendance_employee_aliases_site_alias_uidx" ON "hero_timesheet_attendance_employee_aliases" USING btree ("site_id","alias_name","alias_sn");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_attendance_import_templates_site_name_uidx" ON "hero_timesheet_attendance_import_templates" USING btree ("site_id","template_name");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_scheduling_configs_site_uidx" ON "hero_timesheet_scheduling_configs" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_scheduling_statuses_site_period_uidx" ON "hero_timesheet_scheduling_statuses" USING btree ("site_id","period");--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD CONSTRAINT "hero_timesheet_attendance_real_overrides_import_preview_id_hero_timesheet_attendance_import_previews_id_fk" FOREIGN KEY ("import_preview_id") REFERENCES "public"."hero_timesheet_attendance_import_previews"("id") ON DELETE set null ON UPDATE no action;