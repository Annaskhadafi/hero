import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🚀 Migrating hero_asset_disposals table: adding total_book_value...')

    await client.query(`
      ALTER TABLE hero_asset_disposals 
      ADD COLUMN IF NOT EXISTS total_book_value DOUBLE PRECISION DEFAULT 0;
    `)
    console.log('  ✓ Column total_book_value ensured in hero_asset_disposals')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
