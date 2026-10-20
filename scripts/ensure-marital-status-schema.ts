import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function ensureMaritalStatusSchema() {
  console.log('Ensuring marital status columns exist in database...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_marital_status_requests (
      id SERIAL PRIMARY KEY,
      request_number TEXT NOT NULL UNIQUE,
      employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      submitted_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
      request_date TIMESTAMP NOT NULL DEFAULT NOW(),
      current_marital_status TEXT NOT NULL,
      target_marital_status TEXT NOT NULL,
      reason TEXT NOT NULL,
      marriage_date TIMESTAMP,
      spouse_name TEXT,
      residence_status TEXT,
      dependents_count INTEGER NOT NULL DEFAULT 0,
      attachment_url TEXT,
      attachment_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending_approval',
      signature_url TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    ALTER TABLE hero_marital_status_requests
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS marriage_date TIMESTAMP,
    ADD COLUMN IF NOT EXISTS spouse_name TEXT,
    ADD COLUMN IF NOT EXISTS residence_status TEXT,
    ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS attachment_url TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT,
    ADD COLUMN IF NOT EXISTS submitted_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL;
  `);

  await db.execute(sql`
    ALTER TABLE hero_employees
    ADD COLUMN IF NOT EXISTS spouse_name TEXT,
    ADD COLUMN IF NOT EXISTS marriage_date DATE,
    ADD COLUMN IF NOT EXISTS residence_status TEXT;
  `);

  console.log('✅ Marital status schema successfully ensured in database!');
}

if (require.main === module) {
  ensureMaritalStatusSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
