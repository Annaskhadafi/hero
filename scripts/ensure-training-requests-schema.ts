import { db } from '../db'
import { sql } from 'drizzle-orm'

export async function run() {
  console.log('Ensuring hero_training_requests and hero_training_request_approvals tables exist...')
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_training_requests (
        id SERIAL PRIMARY KEY,
        request_number TEXT NOT NULL UNIQUE,
        document_code TEXT NOT NULL DEFAULT 'F.HR.STD.011.00',
        revision TEXT NOT NULL DEFAULT '00',
        requester_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        requester_name TEXT NOT NULL,
        requester_email TEXT NOT NULL DEFAULT '',
        requester_department TEXT NOT NULL DEFAULT '',
        requester_position TEXT NOT NULL DEFAULT '',
        participants_type TEXT NOT NULL DEFAULT 'employees',
        participant_employee_ids JSONB DEFAULT '[]',
        participant_names TEXT NOT NULL DEFAULT '',
        participant_details JSONB DEFAULT '[]',
        job_level TEXT NOT NULL DEFAULT '',
        department TEXT NOT NULL DEFAULT '',
        work_location TEXT NOT NULL DEFAULT '',
        training_title TEXT NOT NULL,
        training_type TEXT NOT NULL DEFAULT 'Training',
        training_category TEXT NOT NULL DEFAULT 'External',
        training_date TEXT NOT NULL DEFAULT '',
        training_venue TEXT NOT NULL DEFAULT '',
        cost_amount TEXT NOT NULL DEFAULT '0',
        cost_currency TEXT NOT NULL DEFAULT 'IDR',
        cost_notes TEXT NOT NULL DEFAULT '',
        provider_name TEXT NOT NULL DEFAULT '',
        provider_contact TEXT NOT NULL DEFAULT '',
        objectives JSONB DEFAULT '[]',
        past_trainings JSONB DEFAULT '[]',
        attachment_url TEXT,
        attachment_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        current_step_order INTEGER NOT NULL DEFAULT 1,
        total_steps INTEGER NOT NULL DEFAULT 5,
        is_synced_to_records BOOLEAN NOT NULL DEFAULT FALSE,
        synced_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hero_training_request_approvals (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES hero_training_requests(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        approval_token TEXT NOT NULL UNIQUE,
        role_label TEXT NOT NULL,
        approver_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        approver_name TEXT NOT NULL,
        approver_email TEXT NOT NULL DEFAULT '',
        approver_title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        signature_data_url TEXT,
        remarks TEXT NOT NULL DEFAULT '',
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log('✅ hero_training_requests and hero_training_request_approvals successfully ensured!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error creating tables:', err)
    process.exit(1)
  }
}

run()
