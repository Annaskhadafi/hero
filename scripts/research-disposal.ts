import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

async function run() {
  const client = await pool.connect()
  try {
    // 1. Search for Amama Ira
    const amamaRes = await client.query(
      `SELECT id, employee_sn, name, job_title, department_id, email 
       FROM hero_employees 
       WHERE name ILIKE '%amama%' OR name ILIKE '%ira%'`
    )
    console.log('Search Amama Ira:', amamaRes.rows)

    // 2. Check Finance & Accounting department
    const faDept = await client.query(
      `SELECT id, code, name FROM hero_master_departments WHERE name ILIKE '%finance%' OR name ILIKE '%accounting%'`
    )
    console.log('Finance & Accounting departments:', faDept.rows)

    // 3. Check General Manager and Director job titles / employees
    const leaders = await client.query(
      `SELECT id, employee_sn, name, job_title, department_id 
       FROM hero_employees 
       WHERE job_title ILIKE '%director%' OR job_title ILIKE '%general manager%' OR job_title ILIKE '%gm%' 
       LIMIT 10`
    )
    console.log('Leaders (GM / Director):', leaders.rows)

    // 4. Check asset schema columns (Tahun pembelian, no aset, etc)
    const assetCols = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'hero_central_service_assets'`
    )
    console.log('Central Service Asset columns:', assetCols.rows.map(r => r.column_name))

    const sapCols = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'hero_sap_assets'`
    )
    console.log('SAP Asset columns:', sapCols.rows.map(r => r.column_name))
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(console.error)
