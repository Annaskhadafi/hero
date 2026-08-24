import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating summary tables...');

  // Create hero_apd_summaries table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_apd_summaries (
      id SERIAL PRIMARY KEY,
      summary_number TEXT NOT NULL UNIQUE,
      section_id INTEGER NOT NULL REFERENCES hero_master_sections(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'draft',
      generated_by_employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      generated_at TIMESTAMP,
      approved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Created hero_apd_summaries');

  // Create hero_apd_summary_items table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_apd_summary_items (
      id SERIAL PRIMARY KEY,
      summary_id INTEGER NOT NULL REFERENCES hero_apd_summaries(id) ON DELETE CASCADE,
      apd_request_id INTEGER NOT NULL REFERENCES hero_apd_requests(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      employee_name TEXT NOT NULL,
      employee_sn TEXT NOT NULL DEFAULT '',
      site_name TEXT NOT NULL DEFAULT '',
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      request_type TEXT NOT NULL DEFAULT 'baru'
    )
  `);
  console.log('Created hero_apd_summary_items');

  // Create hero_apd_summary_approvals table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_apd_summary_approvals (
      id SERIAL PRIMARY KEY,
      summary_id INTEGER NOT NULL REFERENCES hero_apd_summaries(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      approver_employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      signature_url TEXT,
      decision_note TEXT NOT NULL DEFAULT '',
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Created hero_apd_summary_approvals');

  console.log('All summary tables created successfully!');
}

main().catch(console.error).finally(() => process.exit(0));
