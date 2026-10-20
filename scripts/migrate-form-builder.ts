import { db } from '../db'
import { sql } from 'drizzle-orm'

async function runMigration() {
  console.log('Running direct schema migration for Form Builder...')

  await db.execute(sql`
    ALTER TABLE hero_form_templates ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '';
    ALTER TABLE hero_form_templates ADD COLUMN IF NOT EXISTS theme_config_json text NOT NULL DEFAULT '{}';
    ALTER TABLE hero_form_templates ADD COLUMN IF NOT EXISTS settings_json text NOT NULL DEFAULT '{}';
    ALTER TABLE hero_form_templates ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
    ALTER TABLE hero_form_templates ADD COLUMN IF NOT EXISTS start_count integer NOT NULL DEFAULT 0;
    ALTER TABLE hero_form_templates ADD COLUMN IF NOT EXISTS completion_count integer NOT NULL DEFAULT 0;

    ALTER TABLE hero_form_template_fields ADD COLUMN IF NOT EXISTS logic_rules_json text NOT NULL DEFAULT '[]';

    ALTER TABLE hero_form_submissions ALTER COLUMN requester_employee_id DROP NOT NULL;
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS respondent_name text NOT NULL DEFAULT '';
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS respondent_email text NOT NULL DEFAULT '';
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS respondent_phone text NOT NULL DEFAULT '';
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS respondent_metadata_json text NOT NULL DEFAULT '{}';
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS started_at timestamp NOT NULL DEFAULT now();
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS ip_address text NOT NULL DEFAULT '';
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS user_agent text NOT NULL DEFAULT '';
    ALTER TABLE hero_form_submissions ADD COLUMN IF NOT EXISTS is_public_submission boolean NOT NULL DEFAULT false;

    ALTER TABLE hero_form_submission_values ADD COLUMN IF NOT EXISTS numeric_value integer;
    ALTER TABLE hero_form_submission_values ADD COLUMN IF NOT EXISTS json_value text NOT NULL DEFAULT '';
  `)

  console.log('Migration completed successfully!')
  process.exit(0)
}

runMigration().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
