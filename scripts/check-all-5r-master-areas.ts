import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const result: any = await db.execute(sql`
    SELECT 
      a.id,
      a.name as area_name,
      a.site_id,
      s.name as site_name,
      a.pic_employee_id,
      pic.name as pic_name,
      pic.job_title as pic_job_title,
      mgr.id as direct_manager_id,
      mgr.name as direct_manager_name,
      mgr.job_title as direct_manager_job_title,
      site_head.id as pjo_id,
      site_head.name as pjo_name,
      site_head.job_title as pjo_job_title,
      a.is_active
    FROM hero_five_r_master_areas a
    LEFT JOIN hero_sites s ON a.site_id = s.id
    LEFT JOIN hero_employees pic ON a.pic_employee_id = pic.id
    LEFT JOIN hero_employees mgr ON pic.direct_manager_id = mgr.id
    LEFT JOIN hero_employees site_head ON s.head_employee_id = site_head.id
    ORDER BY a.id ASC
  `)

  console.log(`Total Master Area 5R in DB: ${(result.rows || result).length}`)
  console.table(result.rows || result)
}

main().then(() => process.exit(0)).catch(console.error)
