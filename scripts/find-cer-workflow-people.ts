import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

async function run() {
  const client = await pool.connect()
  try {
    const res = await client.query(`
      SELECT id, employee_sn, name, email, job_title, department 
      FROM hero_employees 
      WHERE name ILIKE '%aulia%' OR name ILIKE '%riski%' OR name ILIKE '%walidina%' OR name ILIKE '%risqy%' OR name ILIKE '%rizki%'
    `)
    console.log('Search for Aulia / Riski / Walidina:', res.rows)
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(console.error)
