ALTER TABLE "hero_overtime_command_letters"
  ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'leader_command',
  ADD COLUMN IF NOT EXISTS "request_kind" text NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS "parent_spl_id" integer;

DO $$ BEGIN
  ALTER TABLE "hero_overtime_command_letters"
    ADD CONSTRAINT "hero_overtime_command_letters_parent_spl_id_fk"
    FOREIGN KEY ("parent_spl_id") REFERENCES "hero_overtime_command_letters"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "hero_overtime_command_letter_participants" (
  "id" serial PRIMARY KEY,
  "overtime_command_letter_id" integer NOT NULL REFERENCES "hero_overtime_command_letters"("id") ON DELETE CASCADE,
  "employee_id" integer NOT NULL REFERENCES "hero_employees"("id") ON DELETE CASCADE,
  "category" text NOT NULL DEFAULT 'after_mandatory_ot',
  "shift_code" text NOT NULL DEFAULT 'DS',
  "roster_type" text NOT NULL DEFAULT '5:2',
  "schedule_code" text NOT NULL DEFAULT '',
  "work_streak_days" integer NOT NULL DEFAULT 0,
  "overtime_credit_minutes" integer,
  "replacement_off_date" timestamp,
  "work_period" text NOT NULL DEFAULT '',
  "payroll_period" text NOT NULL DEFAULT '',
  "evidence_status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "hero_overtime_command_letter_participants_document_employee_uidx"
  ON "hero_overtime_command_letter_participants" ("overtime_command_letter_id", "employee_id");
