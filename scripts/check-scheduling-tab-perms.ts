import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  const roles = await db.execute(sql`SELECT id, name FROM hero_security_roles ORDER BY id`)
  const attendanceNav = await db.execute(sql`SELECT id FROM hero_navbar_menu_items WHERE resource = 'scheduling_timesheet_attendance' LIMIT 1`)
  
  if (!attendanceNav.rows.length) {
    console.log('Attendance nav item missing!')
    return
  }
  
  const navId = (attendanceNav.rows[0] as any).id
  console.log(`Checking attendance permissions for nav_item_id = ${navId} across ${roles.rows.length} roles...`)

  for (const role of roles.rows as any[]) {
    const perm = await db.execute(sql`
      SELECT id, can_view, can_edit, data_scope 
      FROM hero_role_menu_permissions 
      WHERE role_id = ${role.id} AND menu_item_id = ${navId}
    `)
    
    if (!perm.rows.length) {
      console.log(`Role ${role.id} (${role.name}) was MISSING attendance permission. Inserting default (can_view=true)...`)
      await db.execute(sql`
        INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope, created_at)
        VALUES (${role.id}, ${navId}, true, true, false, false, 'global', NOW())
      `)
    } else {
      console.log(`Role ${role.id} (${role.name}): can_view=${(perm.rows[0] as any).can_view}, data_scope=${(perm.rows[0] as any).data_scope}`)
    }
  }

  console.log('✅ All roles verified!')
}

main().catch(console.error)
