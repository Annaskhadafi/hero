import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  const result: any = await db.execute(sql`
    SELECT 
      a.id as area_id,
      a.name as area_name,
      s.id as site_id,
      s.name as site_name,
      s.head_employee_id as site_head_id,
      pjo.name as pjo_name,
      pjo.job_title as pjo_job_title,
      pic.name as pic_name,
      mgr.name as direct_manager_name,
      mgr.job_title as direct_manager_job_title,
      CASE 
        WHEN s.head_employee_id IS NOT NULL AND pjo.name IS NOT NULL THEN pjo.name
        ELSE COALESCE(mgr.name, 'Ary Maulana')
      END as resolved_step2_approver,
      CASE 
        WHEN s.head_employee_id IS NOT NULL AND pjo.name IS NOT NULL THEN pjo.job_title
        ELSE COALESCE(mgr.job_title, 'SPV Repair & Retread Operation')
      END as resolved_step2_title,
      CASE 
        WHEN s.head_employee_id IS NOT NULL AND pjo.name IS NOT NULL THEN 'PJO Site'
        ELSE 'Atasan Langsung'
      END as approver_source
    FROM hero_five_r_master_areas a
    LEFT JOIN hero_sites s ON a.site_id = s.id
    LEFT JOIN hero_employees pic ON a.pic_employee_id = pic.id
    LEFT JOIN hero_employees mgr ON pic.direct_manager_id = mgr.id
    LEFT JOIN hero_employees pjo ON s.head_employee_id = pjo.id
    WHERE a.is_active = true
    ORDER BY s.name ASC, a.id ASC
  `)

  console.table(result.rows || result)
}

main().then(() => process.exit(0)).catch(console.error)
