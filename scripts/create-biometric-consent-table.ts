import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🛡️ Creating hero_biometric_consents table (UU PDP Compliance)...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_biometric_consents (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
        consent_type TEXT NOT NULL DEFAULT 'face_recognition',
        status TEXT NOT NULL DEFAULT 'agreed',
        consent_version TEXT NOT NULL DEFAULT 'v1.0-uupdp',
        legal_notice_text TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_biometric_consent_emp ON hero_biometric_consents(employee_id, status);
      CREATE INDEX IF NOT EXISTS idx_biometric_consent_created ON hero_biometric_consents(created_at);
    `)

    // Verify table exists
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'hero_biometric_consents'
      ORDER BY ordinal_position;
    `)

    console.log('✅ Table hero_biometric_consents verified with columns:')
    res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`))
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
