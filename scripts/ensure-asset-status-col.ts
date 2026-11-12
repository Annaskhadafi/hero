import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

async function run() {
  const client = await pool.connect()
  try {
    await client.query(`
      ALTER TABLE hero_central_service_assets 
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
    `)
    console.log('✓ Column status ensured in hero_central_service_assets')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(console.error)
