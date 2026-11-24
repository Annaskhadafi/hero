import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🚀 Migrating hero_asset_disposals table: adding disposal_type...')

    await client.query(`
      ALTER TABLE hero_asset_disposals 
      ADD COLUMN IF NOT EXISTS disposal_type TEXT NOT NULL DEFAULT 'Penghapusan';
    `)
    console.log('  ✓ Column disposal_type ensured in hero_asset_disposals')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
