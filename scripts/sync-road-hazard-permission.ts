import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local' })

import { db } from '../db'
import { navbarMenuItems, roleMenuPermissions, securityRoles } from '../db/schema/hero'
import { eq } from 'drizzle-orm'

async function syncRoadHazardPermission() {
  console.log('[sync-road-hazard] Checking navbarMenuItems for hse_road_hazard...')

  const existing = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.resource, 'hse_road_hazard'))
    .limit(1)

  let menuItemId: number

  if (existing.length === 0) {
    const [inserted] = await db
      .insert(navbarMenuItems)
      .values({
        menuArea: 'main',
        section: 'HSE',
        groupLabel: 'Safety Tools & Compliance',
        title: 'Road Hazard Live AI',
        url: '/dashboard/hse/road-hazard',
        iconName: 'video',
        resource: 'hse_road_hazard',
        sortOrder: 13,
        isVisible: true,
        openInNewTab: false,
      })
      .returning({ id: navbarMenuItems.id })

    menuItemId = inserted.id
    console.log('[sync-road-hazard] Inserted navbarMenuItem id:', menuItemId)
  } else {
    menuItemId = existing[0].id
    console.log('[sync-road-hazard] Existing navbarMenuItem id:', menuItemId)
  }

  // Get all security roles
  const roles = await db.select().from(securityRoles)
  console.log('[sync-road-hazard] Found roles count:', roles.length)

  // Get existing roleMenuPermissions for this menuItemId
  const existingPerms = await db
    .select()
    .from(roleMenuPermissions)
    .where(eq(roleMenuPermissions.menuItemId, menuItemId))

  const existingRoleIds = new Set(existingPerms.map((p) => p.roleId))

  for (const role of roles) {
    if (!existingRoleIds.has(role.id)) {
      const isPrivileged = [
        'Super Admin',
        'Site Admin',
        'HSE',
        'Manager',
        'PJO SITE',
        'CENTRAL SERVICES',
      ].includes(role.name)

      await db.insert(roleMenuPermissions).values({
        roleId: role.id,
        menuItemId: menuItemId,
        canView: true,
        canEdit: isPrivileged,
        canDelete: role.name === 'Super Admin' || role.name === 'HSE',
        canSelectAll: isPrivileged,
        dataScope: isPrivileged ? 'global' : 'own',
      })
      console.log(`[sync-road-hazard] Granted permission for role: ${role.name}`)
    }
  }

  console.log('[sync-road-hazard] Synchronization completed successfully!')
  process.exit(0)
}

syncRoadHazardPermission().catch((err) => {
  console.error('[sync-road-hazard] Error:', err)
  process.exit(1)
})
