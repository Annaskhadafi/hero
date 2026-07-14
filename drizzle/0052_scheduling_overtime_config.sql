ALTER TABLE "hero_timesheet_scheduling_configs"
ADD COLUMN IF NOT EXISTS "overtime_config" jsonb;
