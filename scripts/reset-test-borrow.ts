import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

async function reset() {
  const client = await pool.connect()
  try {
    // 1. Reset asset ID 5 to ACTIVE and holder to employee 71261
    const user = await client.query(`SELECT id FROM hero_employees WHERE employee_sn = '71261' LIMIT 1`)
    const userId = user.rows[0]?.id || 5

    await client.query(
      `UPDATE hero_central_service_assets 
       SET condition = 'ACTIVE', holder_employee_id = $1 
       WHERE id = 5`,
      [userId]
    )

    // 2. Clean previous test borrow rows
    await client.query(`DELETE FROM hero_asset_borrows WHERE asset_id = 5`)

    console.log('✓ Successfully reset test asset ID 5 and clean previous borrows')
  } finally {
    client.release()
    await pool.end()
  }
}

reset().catch(console.error)
