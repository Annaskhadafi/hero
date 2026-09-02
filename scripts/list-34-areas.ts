import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const result: any = await db.execute(sql`
    SELECT 
      a.id,
      a.name as area_name,
      s.name as site_name,
      COALESCE(pic.name, 'Belum Diset') as pic_name,
      COALESCE(pic.job_title, '-') as pic_job_title,
      COALESCE(mgr.name, site_head.name, 'Apriyanto') as direct_manager_name,
      COALESCE(mgr.job_title, site_head.job_title, 'Head of Service MVC') as direct_manager_job_title,
      COALESCE(site_head.name, 'Apriyanto') as pjo_name,
      COALESCE(site_head.job_title, 'Head of Service MVC') as pjo_job_title
    FROM hero_five_r_master_areas a
    LEFT JOIN hero_sites s ON a.site_id = s.id
    LEFT JOIN hero_employees pic ON a.pic_employee_id = pic.id
    LEFT JOIN hero_employees mgr ON pic.direct_manager_id = mgr.id
    LEFT JOIN hero_employees site_head ON s.head_employee_id = site_head.id
    WHERE a.is_active = true
    ORDER BY s.name ASC, a.id ASC
  `)

  console.log('=== DAFTAR LENGKAP 34 MASTER AREA 5R ===')
  for (const row of (result.rows || result)) {
    console.log(`[${row.site_name}] ${row.area_name} | PIC: ${row.pic_name} | Atasan: ${row.direct_manager_name} | PJO: ${row.pjo_name}`)
  }
}

main().then(() => process.exit(0)).catch(console.error)
