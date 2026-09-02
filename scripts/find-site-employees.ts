import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const empJakarta: any = await db.execute(sql`
    SELECT e.id, e.name, e.job_title, s.name as site_name
    FROM hero_employees e
    LEFT JOIN hero_sites s ON e.work_location_id = s.id
    WHERE s.name ILIKE '%jakarta%' OR s.name ILIKE '%makassar%'
    LIMIT 20
  `)
  console.log('Employees in Jakarta/Makassar:', empJakarta.rows || empJakarta)
}

main().then(() => process.exit(0)).catch(console.error)
