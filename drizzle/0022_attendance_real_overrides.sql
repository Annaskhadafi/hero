CREATE TABLE IF NOT EXISTS "hero_timesheet_attendance_real_overrides" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_id" integer NOT NULL REFERENCES "hero_sites"("id") ON DELETE cascade,
  "period" text NOT NULL,
  "employee_id" integer NOT NULL REFERENCES "hero_employees"("id") ON DELETE cascade,
  "day" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'empty',
  "clock_in" text NOT NULL DEFAULT '',
  "clock_out" text NOT NULL DEFAULT '',
  "note" text NOT NULL DEFAULT '',
  "source" text NOT NULL DEFAULT 'manual',
  "saved_by_user_id" text REFERENCES "user"("id") ON DELETE set null,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "hero_timesheet_attendance_real_overrides_employee_day_uidx"
  ON "hero_timesheet_attendance_real_overrides" ("site_id", "period", "employee_id", "day");
