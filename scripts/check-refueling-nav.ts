import 'dotenv/config'
import { db } from '../db'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('🔍 Checking navbar menu items...')

  // 1. Check or insert menu item
  const menuRes = await db.execute(sql`
    SELECT id, title, url, resource, section, group_label, is_visible 
    FROM hero_navbar_menu_items 
    WHERE url = '/dashboard/central-service/refueling' OR resource = 'central_service_refueling'
  `)
  console.log('Menu query result:', menuRes.rows)

  let menuId: number | null = null
  if (menuRes.rows.length === 0) {
    console.log('  ⚠️ Menu item not found in DB! Inserting...')
    const insertRes = await db.execute(sql`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      VALUES ('main', 'Central Service', 'Re-Fueling LV', '/dashboard/central-service/refueling', 'truck', 'central_service_refueling', 2, true, false, 'menu', 'Management')
      RETURNING id
    `)
    menuId = (insertRes.rows[0] as any).id
    console.log('  ✅ Menu inserted with ID:', menuId)
  } else {
    menuId = (menuRes.rows[0] as any).id
    console.log('  ✅ Menu exists with ID:', menuId)
  }

  // 2. Grant permissions to all security roles
  console.log('🔍 Granting permissions to all roles for menu ID:', menuId)
  const grantRes = await db.execute(sql`
    INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
    SELECT r.id, ${menuId}, true, true, true, true, 'global'
    FROM hero_security_roles r
    WHERE NOT EXISTS (
      SELECT 1 FROM hero_role_menu_permissions p
      WHERE p.role_id = r.id AND p.menu_item_id = ${menuId}
    )
  `)
  console.log('  ✅ Permissions granted!')

  // 3. Update existing permissions to can_view = true if any were false
  await db.execute(sql`
    UPDATE hero_role_menu_permissions
    SET can_view = true, can_edit = true
    WHERE menu_item_id = ${menuId}
  `)
  console.log('  ✅ Permissions updated to can_view = true!')

  // 4. List current menus in Central Service
  const csMenus = await db.execute(sql`
    SELECT id, title, url, resource, group_label, sort_order, is_visible
    FROM hero_navbar_menu_items
    WHERE section = 'Central Service'
    ORDER BY group_label, sort_order, id
  `)
  console.log('📋 All Central Service menus in DB:')
  for (const m of csMenus.rows as any[]) {
    console.log(`  - [${m.group_label}] ${m.title} (${m.url}) - visible: ${m.is_visible}`)
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
