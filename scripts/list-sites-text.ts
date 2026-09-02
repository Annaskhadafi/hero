import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const sitesResult: any = await db.execute(sql`
    SELECT s.id, s.name as site_name, s.site_type, s.head_employee_id, e.name as head_name, e.job_title as head_job_title
    FROM hero_sites s
    LEFT JOIN hero_employees e ON s.head_employee_id = e.id
    WHERE s.is_active = true
    ORDER BY s.name ASC
  `)
  
  console.log('LIST SITES & PJO/HEAD:')
  for (const row of (sitesResult.rows || sitesResult)) {
    console.log(`- Site ${row.site_name} (ID: ${row.id}): Head = ${row.head_name || '(Belum diset)'} [${row.head_job_title || '-'}]`)
  }
}

main().then(() => process.exit(0)).catch(console.error)
