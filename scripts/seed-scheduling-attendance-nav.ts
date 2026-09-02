import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  // 1. Get an existing scheduling_timesheet item to copy its structure
  const existingItems = await db.execute(sql`
    SELECT id, resource, title, url, parent_id, sort_order, icon_name, section, menu_area, item_type, group_label, is_visible
    FROM hero_navbar_menu_items
    WHERE resource LIKE 'scheduling_timesheet%'
    ORDER BY sort_order
  `)
  console.log('Existing scheduling nav items:')
  console.log(JSON.stringify(existingItems.rows, null, 2))

  // Check if attendance already exists
  const attendanceCheck = await db.execute(sql`
    SELECT id FROM hero_navbar_menu_items WHERE resource = 'scheduling_timesheet_attendance'
  `)

  if (attendanceCheck.rows.length > 0) {
    console.log('scheduling_timesheet_attendance already exists, id:', attendanceCheck.rows[0].id)
  } else {
    // Find the setup item to copy structure from
    const refItem = existingItems.rows.find((r: any) => r.resource === 'scheduling_timesheet_schedule_v2')
      ?? existingItems.rows[0]

    if (!refItem) {
      console.error('No reference item found!')
      return
    }

    const maxSort = Math.max(...existingItems.rows.map((r: any) => parseInt(String(r.sort_order ?? 0))))

    console.log(`Inserting attendance nav item copying structure from: ${(refItem as any).resource}`)
    console.log(`parent_id=${(refItem as any).parent_id}, section=${(refItem as any).section}, menu_area=${(refItem as any).menu_area}`)

    const inserted = await db.execute(sql`
      INSERT INTO hero_navbar_menu_items (
        menu_area, section, title, url, icon_name, resource,
        sort_order, is_visible, open_in_new_tab, item_type, parent_id, group_label, is_iframe
      )
      VALUES (
        ${(refItem as any).menu_area ?? 'main'},
        ${(refItem as any).section ?? 'main'},
        'Attendance',
        '/dashboard/scheduling-timesheet/attendance',
        'ClipboardList',
        'scheduling_timesheet_attendance',
        ${maxSort + 1},
        true,
        false,
        ${(refItem as any).item_type ?? 'menu'},
        ${(refItem as any).parent_id ?? null},
        ${(refItem as any).group_label ?? null},
        false
      )
      RETURNING id, resource, title
    `)
    console.log('Inserted attendance nav item:', JSON.stringify(inserted.rows, null, 2))

    // Now replicate permissions from scheduling_timesheet_schedule_v2 for all roles
    const v2Item = existingItems.rows.find((r: any) => r.resource === 'scheduling_timesheet_schedule_v2')
    if (!v2Item) {
      console.error('Could not find reference permissions item (schedule_v2)')
      return
    }

    const allRolePerms = await db.execute(sql`
      SELECT role_id, can_view, can_edit, can_delete, can_select_all, data_scope
      FROM hero_role_menu_permissions
      WHERE menu_item_id = ${(v2Item as any).id}
    `)

    const newItemId = inserted.rows[0].id
    console.log(`\nSeeding permissions for new item id=${newItemId}:`)

    for (const perm of allRolePerms.rows) {
      await db.execute(sql`
        INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
        VALUES (${(perm as any).role_id}, ${newItemId}, ${(perm as any).can_view}, ${(perm as any).can_edit}, ${(perm as any).can_delete}, ${(perm as any).can_select_all}, ${(perm as any).data_scope})
        ON CONFLICT DO NOTHING
      `)
      console.log(`  → role_id=${(perm as any).role_id}, can_view=${(perm as any).can_view}, data_scope=${(perm as any).data_scope}`)
    }

    console.log('\n✅ scheduling_timesheet_attendance nav item and permissions seeded!')
  }
}

main().catch(console.error)
