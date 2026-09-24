import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('📦 Creating hero_employee_location_transfers table...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_employee_location_transfers (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
        from_site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
        to_site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE CASCADE,
        reason TEXT NOT NULL DEFAULT 'Pemindahan Lokasi',
        transfer_date TIMESTAMP NOT NULL DEFAULT NOW(),
        action_by_user_id TEXT,
        action_by_name TEXT NOT NULL DEFAULT 'Admin',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS hero_emp_loc_transfers_emp_id_idx ON hero_employee_location_transfers(employee_id);
      CREATE INDEX IF NOT EXISTS hero_emp_loc_transfers_transfer_date_idx ON hero_employee_location_transfers(transfer_date DESC);
    `)

    console.log('✅ hero_employee_location_transfers table created successfully.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
