import { db } from '@/db'
import { sql } from 'drizzle-orm'

async function main() {
  // Check nav items for scheduling tabs - no 'name' column
  const navItems = await db.execute(sql`
    SELECT id, resource, title, url
    FROM hero_navbar_menu_items
    WHERE resource LIKE 'scheduling_timesheet%'
    ORDER BY resource
  `)
  console.log('\n=== NAV ITEMS for scheduling tabs ===')
  console.log(JSON.stringify(navItems.rows, null, 2))

  // Check what columns are in hero_navbar_menu_items
  const cols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'hero_navbar_menu_items'
    ORDER BY ordinal_position
  `)
  console.log('\n=== COLUMNS in hero_navbar_menu_items ===')
  console.log(JSON.stringify(cols.rows, null, 2))

  // Check permissions for all roles on scheduling tabs
  const perms = await db.execute(sql`
    SELECT sr.name as role_name, nmi.resource, rmp.can_view, rmp.can_edit, rmp.data_scope
    FROM hero_role_menu_permissions rmp
    JOIN hero_security_roles sr ON rmp.role_id = sr.id
    JOIN hero_navbar_menu_items nmi ON rmp.menu_item_id = nmi.id
    WHERE nmi.resource LIKE 'scheduling_timesheet%'
    ORDER BY sr.name, nmi.resource
  `)
  console.log('\n=== PERMISSIONS for scheduling tabs ===')
  console.log(JSON.stringify(perms.rows, null, 2))
}

main().catch(console.error)
