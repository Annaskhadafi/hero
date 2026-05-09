ALTER TABLE "hero_timesheet_scheduling_plans" ADD COLUMN IF NOT EXISTS "employee_profiles" jsonb DEFAULT '[]'::jsonb NOT NULL;
