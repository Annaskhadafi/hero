CREATE TABLE IF NOT EXISTS "hero_daily_activity_approvals" (
  "id" serial PRIMARY KEY,
  "session_id" integer NOT NULL REFERENCES "hero_daily_activity_sessions"("id") ON DELETE CASCADE,
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

CREATE UNIQUE INDEX IF NOT EXISTS "hero_daily_activity_approvals_session_step_uq"
  ON "hero_daily_activity_approvals" ("session_id", "step_order");

CREATE UNIQUE INDEX IF NOT EXISTS "hero_daily_activity_approvals_token_uq"
  ON "hero_daily_activity_approvals" ("approval_token");
