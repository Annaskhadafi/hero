import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Creating RFR tables if not exists...')

  await db.execute(sql`
    ALTER TABLE hero_hc_recruitments 
    ADD COLUMN IF NOT EXISTS rfr_id integer;

    CREATE TABLE IF NOT EXISTS hero_hc_rfr_requests (
      id serial PRIMARY KEY,
      rfr_number text NOT NULL UNIQUE,
      request_date date NOT NULL,
      join_date_estimation date NOT NULL,
      requestor_name text NOT NULL,
      requestor_employee_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
      section_department text NOT NULL,
      received_by_hr text NOT NULL DEFAULT '',
      position_title text NOT NULL,
      number_of_persons integer NOT NULL DEFAULT 1,
      brief_job_description text NOT NULL DEFAULT '',
      level text NOT NULL DEFAULT 'non_staff',
      reason_for_request text NOT NULL DEFAULT 'new_headcount',
      mpp_status text NOT NULL DEFAULT 'budgeted',
      reasons_if_non_budgeted text NOT NULL DEFAULT '',
      employment_status text NOT NULL DEFAULT 'contract',
      contract_duration_months integer,
      attachment_mpp boolean NOT NULL DEFAULT false,
      attachment_jd boolean NOT NULL DEFAULT true,
      uploaded_attachment_urls jsonb DEFAULT '[]'::jsonb,
      sex_preference text NOT NULL DEFAULT 'any',
      age_preference text NOT NULL DEFAULT 'any',
      education_degree text NOT NULL DEFAULT 'any',
      education_background jsonb DEFAULT '[]'::jsonb,
      years_of_experience text NOT NULL DEFAULT 'any',
      field_of_job_experience text NOT NULL DEFAULT '',
      functional_competencies jsonb DEFAULT '[]'::jsonb,
      current_step_order integer NOT NULL DEFAULT 1,
      status text NOT NULL DEFAULT 'draft',
      rejection_reason text NOT NULL DEFAULT '',
      generated_recruitment_id integer,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );

    ALTER TABLE hero_hc_rfr_requests ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

    CREATE TABLE IF NOT EXISTS hero_hc_rfr_approvals (
      id serial PRIMARY KEY,
      rfr_id integer NOT NULL REFERENCES hero_hc_rfr_requests(id) ON DELETE CASCADE,
      step_order integer NOT NULL,
      step_key text NOT NULL,
      role_label text NOT NULL,
      approver_name text NOT NULL,
      approver_email text NOT NULL DEFAULT '',
      approver_title text NOT NULL DEFAULT '',
      approver_employee_id integer REFERENCES hero_employees(id) ON DELETE SET NULL,
      approval_token text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'pending',
      signature_data_url text,
      remarks text NOT NULL DEFAULT '',
      signed_at timestamp,
      created_at timestamp NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS hero_hc_rfr_settings (
      id serial PRIMARY KEY,
      setting_key text NOT NULL UNIQUE,
      setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `)

  console.log('✅ RFR tables successfully created or updated!')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
