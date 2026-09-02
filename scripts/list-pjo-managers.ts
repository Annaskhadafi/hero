import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('=== DAFTAR PJO / SITE HEAD (hero_sites) ===')
  const sitesResult: any = await db.execute(sql`
    SELECT s.id, s.name as site_name, s.site_type, s.head_employee_id, e.name as head_name, e.job_title as head_job_title, e.email as head_email
    FROM hero_sites s
    LEFT JOIN hero_employees e ON s.head_employee_id = e.id
    WHERE s.is_active = true
    ORDER BY s.name ASC
  `)
  console.table(sitesResult.rows || sitesResult)

  console.log('\n=== DAFTAR MANAGER / DEPT HEAD (hero_master_departments) ===')
  const deptResult: any = await db.execute(sql`
    SELECT d.id, d.name as dept_name, d.head_employee_id, e.name as head_name, e.job_title as head_job_title, e.email as head_email
    FROM hero_master_departments d
    LEFT JOIN hero_employees e ON d.head_employee_id = e.id
    ORDER BY d.name ASC
  `)
  console.table(deptResult.rows || deptResult)

  console.log('\n=== CONTOH PIC AREA 5R & ATASAN LANGSUNG (hero_five_r_master_areas) ===')
  const areaResult: any = await db.execute(sql`
    SELECT a.id, a.name as area_name, s.name as site_name, e.name as pic_name, e.job_title as pic_title,
           mgr.name as direct_manager_name, mgr.job_title as direct_manager_title
    FROM hero_five_r_master_areas a
    LEFT JOIN hero_sites s ON a.site_id = s.id
    LEFT JOIN hero_employees e ON a.pic_employee_id = e.id
    LEFT JOIN hero_employees mgr ON e.direct_manager_id = mgr.id
    WHERE a.is_active = true
    LIMIT 25
  `)
  console.table(areaResult.rows || areaResult)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
