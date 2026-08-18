import { cache } from 'react'
import { eq, or } from 'drizzle-orm'
import { db } from '@/db'
import {
  employees,
  securityRoles,
  roleMenuPermissions,
  navbarMenuItems,
} from '@/db/schema/hero'
import { user as authUser } from '@/db/schema/auth'
import { ensureHeroGovernanceSeedData } from '@/lib/hero-admin'

export type MobileResourcePermission = {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
  dataScope: string
}

export type MobilePermissionsMap = Record<string, MobileResourcePermission>

export const getUserMobilePermissions = cache(async function getUserMobilePermissions(
  email: string
): Promise<MobilePermissionsMap> {
  await ensureHeroGovernanceSeedData()

  const [employee] = await db
    .select({
      accessRole: employees.accessRole,
    })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(or(eq(employees.email, email), eq(authUser.email, email)))
    .limit(1)

  const roleName = employee?.accessRole ?? 'Super Admin'
  const [role] = await db
    .select()
    .from(securityRoles)
    .where(eq(securityRoles.name, roleName))
    .limit(1)

  if (!role) {
    return {}
  }

  const permissionsList = await db
    .select({
      resource: navbarMenuItems.resource,
      canView: roleMenuPermissions.canView,
      canEdit: roleMenuPermissions.canEdit,
      canDelete: roleMenuPermissions.canDelete,
      canSelectAll: roleMenuPermissions.canSelectAll,
      dataScope: roleMenuPermissions.dataScope,
    })
    .from(roleMenuPermissions)
    .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
    .where(eq(roleMenuPermissions.roleId, role.id))

  const permissionsMap: MobilePermissionsMap = {}

  for (const p of permissionsList) {
    if (p.resource) {
      permissionsMap[p.resource] = {
        canView: p.canView,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canSelectAll: p.canSelectAll,
        dataScope: p.dataScope,
      }
    }
  }

  return permissionsMap
})
