-- Overtime (SPL) Approval Steps
CREATE TABLE IF NOT EXISTS "hero_overtime_approvals" (
  "id" serial PRIMARY KEY,
  "overtime_command_letter_id" integer NOT NULL REFERENCES "hero_overtime_command_letters"("id") ON DELETE CASCADE,
  "step_order" integer NOT NULL,
  "step_label" text NOT NULL DEFAULT '',
  "approval_token" text NOT NULL UNIQUE,
  "approver_employee_id" integer REFERENCES "hero_employees"("id") ON DELETE SET NULL,
  "approver_name" text NOT NULL DEFAULT '',
  "approver_email" text NOT NULL DEFAULT '',
  "approver_role" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending',
  "signature_data_url" text,
  "remarks" text NOT NULL DEFAULT '',
  "signed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "hero_overtime_approvals_spl_step_uq" ON "hero_overtime_approvals" ("overtime_command_letter_id", "step_order");
CREATE UNIQUE INDEX IF NOT EXISTS "hero_overtime_approvals_token_uq" ON "hero_overtime_approvals" ("approval_token");

-- PTW (Permit to Work) Approval Steps
CREATE TABLE IF NOT EXISTS "hero_ptw_approvals" (
  "id" serial PRIMARY KEY,
  "ptw_permit_id" integer NOT NULL REFERENCES "hero_hse_ptw_permits"("id") ON DELETE CASCADE,
  "step_order" integer NOT NULL,
  "step_label" text NOT NULL DEFAULT '',
  "approval_token" text NOT NULL UNIQUE,
  "approver_employee_id" integer REFERENCES "hero_employees"("id") ON DELETE SET NULL,
  "approver_name" text NOT NULL DEFAULT '',
  "approver_email" text NOT NULL DEFAULT '',
  "approver_role" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'pending',
  "signature_data_url" text,
  "remarks" text NOT NULL DEFAULT '',
  "signed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "hero_ptw_approvals_ptw_step_uq" ON "hero_ptw_approvals" ("ptw_permit_id", "step_order");
CREATE UNIQUE INDEX IF NOT EXISTS "hero_ptw_approvals_token_uq" ON "hero_ptw_approvals" ("approval_token");
