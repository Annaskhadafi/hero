import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const result: any = await db.execute(sql`
    SELECT 
      a.id as area_id,
      s.id as site_id,
      s.name as site_name,
      a.name as area_name,
      pic.name as pic_name,
      pic.job_title as pic_job_title,
      site_head.name as pjo_name,
      site_head.job_title as pjo_job_title,
      mgr.name as direct_manager_name,
      mgr.job_title as direct_manager_job_title
    FROM hero_five_r_master_areas a
    LEFT JOIN hero_sites s ON a.site_id = s.id
    LEFT JOIN hero_employees pic ON a.pic_employee_id = pic.id
    LEFT JOIN hero_employees site_head ON s.head_employee_id = site_head.id
    LEFT JOIN hero_employees mgr ON pic.direct_manager_id = mgr.id
    WHERE a.is_active = true
    ORDER BY s.name ASC, a.name ASC
  `)

  console.log(JSON.stringify(result.rows || result, null, 2))
}

main().then(() => process.exit(0)).catch(console.error)
