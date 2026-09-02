import { db } from '../db'
import { navbarMenuItems, roleMenuPermissions } from '../db/schema/hero'
import { inArray, eq, sql } from 'drizzle-orm'

async function main() {
  console.log('Removing "Input Audit 5R" and "Master Area 5R" from navbar menus...')

  const itemsToDelete = await db
    .select({ id: navbarMenuItems.id, title: navbarMenuItems.title })
    .from(navbarMenuItems)
    .where(
      inArray(navbarMenuItems.url, [
        '/dashboard/quality/5r/create',
        '/dashboard/quality/5r/master-area',
      ])
    )

  if (itemsToDelete.length > 0) {
    const ids = itemsToDelete.map((i) => i.id)
    await db.delete(roleMenuPermissions).where(inArray(roleMenuPermissions.menuItemId, ids))
    await db.delete(navbarMenuItems).where(inArray(navbarMenuItems.id, ids))
    console.log(`✅ Deleted menu items:`, itemsToDelete)
  } else {
    console.log('No extra 5R menu items found to delete.')
  }

  // Ensure "Audit 5R" has sortOrder: 1
  await db
    .update(navbarMenuItems)
    .set({ sortOrder: 1 })
    .where(eq(navbarMenuItems.url, '/dashboard/quality/5r'))

  console.log('✅ "Audit 5R" is now the single consolidated menu for Quality & CPI.')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
