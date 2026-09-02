import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { ensureHeroGovernanceSeedData } from '@/lib/hero-admin'

async function main() {
  console.log('1. Fixing tire_engineer menu item in DB...')
  await db.execute(sql`
    UPDATE hero_navbar_menu_items 
    SET url = '/dashboard/timesheet' 
    WHERE resource = 'tire_engineer' AND url = '/dashboard/scheduling-timesheet/attendance'
  `)

  console.log('2. Inserting or updating scheduling_timesheet_attendance menu item in DB...')
  const existing = await db.execute(sql`
    SELECT id FROM hero_navbar_menu_items WHERE resource = 'scheduling_timesheet_attendance'
  `)

  let navItemId: number
  if (existing.rows.length > 0) {
    navItemId = (existing.rows[0] as any).id
    await db.execute(sql`
      UPDATE hero_navbar_menu_items
      SET section = 'Roster & Timesheet',
          title = 'Attendance',
          url = '/dashboard/scheduling-timesheet/attendance',
          menu_area = 'main',
          sort_order = 6,
          is_visible = true
      WHERE id = ${navItemId}
    `)
    console.log(`Updated existing nav item id=${navItemId}`)
  } else {
    const inserted = await db.execute(sql`
      INSERT INTO hero_navbar_menu_items (
        resource, title, url, icon_name, section, menu_area, sort_order, is_visible, open_in_new_tab, item_type
      ) VALUES (
        'scheduling_timesheet_attendance',
        'Attendance',
        '/dashboard/scheduling-timesheet/attendance',
        'checklist',
        'Roster & Timesheet',
        'main',
        6,
        true,
        false,
        'menu'
      )
      RETURNING id
    `)
    navItemId = (inserted.rows[0] as any).id
    console.log(`Inserted new nav item id=${navItemId}`)
  }

  console.log('3. Seeding permissions for all roles for scheduling_timesheet_attendance...')
  const roles = await db.execute(sql`SELECT id, name FROM hero_security_roles`)
  for (const role of roles.rows as any[]) {
    const dataScope = role.name === 'PJO SITE' ? 'site' : 'global'
    const existingPerm = await db.execute(sql`
      SELECT id FROM hero_role_menu_permissions
      WHERE role_id = ${role.id} AND menu_item_id = ${navItemId}
    `)

    if (existingPerm.rows.length > 0) {
      await db.execute(sql`
        UPDATE hero_role_menu_permissions
        SET can_view = true,
            can_edit = true,
            data_scope = ${dataScope}
        WHERE id = ${(existingPerm.rows[0] as any).id}
      `)
    } else {
      await db.execute(sql`
        INSERT INTO hero_role_menu_permissions (
          role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope, created_at
        ) VALUES (
          ${role.id}, ${navItemId}, true, true, false, false, ${dataScope}, NOW()
        )
      `)
    }
  }

  console.log('4. Running ensureHeroGovernanceSeedData() to verify persistence...')
  await ensureHeroGovernanceSeedData()

  console.log('\n5. Verifying navbar menu items for Roster & Timesheet in DB...')
  const items = await db.execute(sql`
    SELECT id, resource, title, url, section, menu_area, sort_order, is_visible
    FROM hero_navbar_menu_items
    WHERE section = 'Roster & Timesheet'
    ORDER BY sort_order, id
  `)
  console.log(JSON.stringify(items.rows, null, 2))

  console.log('\n6. Verifying permissions for CENTRAL SERVICES (SN 23396)...')
  const rendiPerms = await db.execute(sql`
    SELECT rmp.can_view, rmp.can_edit, rmp.data_scope, nmi.title, nmi.resource, nmi.section
    FROM hero_role_menu_permissions rmp
    JOIN hero_navbar_menu_items nmi ON rmp.menu_item_id = nmi.id
    JOIN hero_security_roles sr ON rmp.role_id = sr.id
    WHERE sr.name = 'CENTRAL SERVICES' AND nmi.section = 'Roster & Timesheet'
    ORDER BY nmi.sort_order
  `)
  console.log(JSON.stringify(rendiPerms.rows, null, 2))

  console.log('\n🎉 ALL DONE!')
}

main().catch(console.error)
