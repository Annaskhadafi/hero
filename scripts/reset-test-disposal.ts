import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

async function run() {
  const client = await pool.connect()
  try {
    // Delete approvals associated with asset disposals
    await client.query(`
      DELETE FROM hero_approvals WHERE asset_disposal_id IS NOT NULL;
      DELETE FROM hero_asset_disposals;
      ALTER SEQUENCE hero_asset_disposals_id_seq RESTART WITH 1;
    `)
    console.log('✓ Test disposals cleaned up and sequence reset to 1.')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(console.error)
