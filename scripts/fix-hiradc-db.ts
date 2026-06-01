import { db } from '../db/index'
import { sql } from 'drizzle-orm'

async function fix() {
  console.log('Creating hero_hiradc_registers table...')
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hiradc_registers (
      id SERIAL PRIMARY KEY,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      title TEXT NOT NULL,
      revision TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  console.log('Creating hero_hiradc_entries table...')
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hiradc_entries (
      id SERIAL PRIMARY KEY,
      register_id INTEGER NOT NULL REFERENCES hero_hiradc_registers(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL,
      location TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      hazard_category TEXT NOT NULL,
      hazard_details TEXT,
      likelihood_before INTEGER NOT NULL,
      severity_before INTEGER NOT NULL,
      score_before INTEGER NOT NULL,
      risk_level_before TEXT NOT NULL,
      existing_control TEXT,
      likelihood_after INTEGER NOT NULL,
      severity_after INTEGER NOT NULL,
      score_after INTEGER NOT NULL,
      risk_level_after TEXT NOT NULL
    );
  `)

  console.log('Creating hero_hiradc_entries_register_order_uq index...')
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hero_hiradc_entries_register_order_uq 
    ON hero_hiradc_entries (register_id, order_index);
  `)

  console.log('Creating hero_hiradc_imports table...')
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_hiradc_imports (
      id SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      imported_by TEXT NOT NULL,
      registers_created INTEGER NOT NULL,
      entries_created INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `)

  console.log('Done.')
  process.exit(0)
}

fix().catch((err) => {
  console.error(err)
  process.exit(1)
})
