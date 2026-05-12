ALTER TABLE "hero_timesheet_attendance_import_templates" ADD COLUMN IF NOT EXISTS "template_kind" text NOT NULL DEFAULT 'auto';
ALTER TABLE "hero_timesheet_attendance_import_templates" ADD COLUMN IF NOT EXISTS "header_signature" text NOT NULL DEFAULT '';
ALTER TABLE "hero_timesheet_attendance_import_templates" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp;
ALTER TABLE "hero_timesheet_attendance_import_templates" ADD COLUMN IF NOT EXISTS "usage_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "hero_timesheet_attendance_import_templates" ADD COLUMN IF NOT EXISTS "confidence" integer NOT NULL DEFAULT 0;

ALTER TABLE "hero_timesheet_attendance_import_previews" ADD COLUMN IF NOT EXISTS "template_id" integer REFERENCES "hero_timesheet_attendance_import_templates"("id") ON DELETE SET NULL;
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD COLUMN IF NOT EXISTS "template_kind" text NOT NULL DEFAULT 'auto';
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD COLUMN IF NOT EXISTS "sheet_name" text NOT NULL DEFAULT '';
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD COLUMN IF NOT EXISTS "detection_summary" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD COLUMN IF NOT EXISTS "validation_summary" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "hero_timesheet_attendance_import_previews" ADD COLUMN IF NOT EXISTS "rolled_back_at" timestamp;

CREATE INDEX IF NOT EXISTS "hero_timesheet_attendance_import_previews_site_period_created_idx"
ON "hero_timesheet_attendance_import_previews"("site_id", "period", "created_at");

CREATE TABLE IF NOT EXISTS "hero_timesheet_attendance_employee_aliases" (
  "id" serial PRIMARY KEY,
  "site_id" integer NOT NULL REFERENCES "hero_sites"("id") ON DELETE CASCADE,
  "employee_id" integer NOT NULL REFERENCES "hero_employees"("id") ON DELETE CASCADE,
  "alias_name" text NOT NULL DEFAULT '',
  "alias_sn" text NOT NULL DEFAULT '',
  "source" text NOT NULL DEFAULT 'attendance-import',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "hero_timesheet_attendance_employee_aliases_site_alias_uidx"
ON "hero_timesheet_attendance_employee_aliases"("site_id", "alias_name", "alias_sn");
CREATE INDEX IF NOT EXISTS "hero_timesheet_attendance_employee_aliases_employee_idx"
ON "hero_timesheet_attendance_employee_aliases"("employee_id");

ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD COLUMN IF NOT EXISTS "import_preview_id" integer REFERENCES "hero_timesheet_attendance_import_previews"("id") ON DELETE SET NULL;
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD COLUMN IF NOT EXISTS "validation_flags" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD COLUMN IF NOT EXISTS "work_minutes" integer;
CREATE INDEX IF NOT EXISTS "hero_timesheet_attendance_real_overrides_import_preview_idx"
ON "hero_timesheet_attendance_real_overrides"("import_preview_id");
