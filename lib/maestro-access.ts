import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  maestroCustomerMemberships,
  maestroCustomerLocations,
  maestroCustomerUserLocations,
  maestroCustomerSites,
  maestroCustomerUserSites,
  maestroCustomerUsers,
  maestroUserRoles,
} from '@/db/schema/maestro'
import { maestroRoles } from '@/db/schema/maestro'
import { getMaestroPermissionCodesForUser } from '@/lib/maestro-pages'

export type MaestroAccessContext = {
  userId: string
  customerId: number
  roleIds: number[]
  permissions: string[]
  siteIds: number[]
  locationIds: number[]
}

export class MaestroAccessDeniedError extends Error {
  readonly status = 403

  constructor(message = 'MAESTRO access denied') {
    super(message)
    this.name = 'MaestroAccessDeniedError'
  }
}

export async function getMaestroAccessContexts(userId: string): Promise<MaestroAccessContext[]> {
  const memberships = await db
    .select({ customerId: maestroCustomerMemberships.customerId })
    .from(maestroCustomerMemberships)
    .innerJoin(maestroCustomerUsers, eq(maestroCustomerUsers.id, maestroCustomerMemberships.userId))
    .where(
      and(
        eq(maestroCustomerMemberships.userId, userId),
        eq(maestroCustomerMemberships.isActive, true),
        eq(maestroCustomerUsers.isActive, true),
      ),
    )

  const permissions = await getMaestroPermissionCodesForUser(userId)
  const roles = await db
    .select({ roleId: maestroUserRoles.roleId })
    .from(maestroUserRoles)
    .innerJoin(maestroRoles, eq(maestroRoles.id, maestroUserRoles.roleId))
    .where(and(eq(maestroUserRoles.userId, userId), eq(maestroRoles.isActive, true)))

  const roleIds = roles.map((row) => row.roleId)
  const contexts: MaestroAccessContext[] = []

  for (const membership of memberships) {
    const sites = await db
      .select({ siteId: maestroCustomerUserSites.siteId })
      .from(maestroCustomerUserSites)
      .innerJoin(
        maestroCustomerSites,
        and(
          eq(maestroCustomerSites.customerId, maestroCustomerUserSites.customerId),
          eq(maestroCustomerSites.siteId, maestroCustomerUserSites.siteId),
        ),
      )
      .where(
        and(
          eq(maestroCustomerUserSites.userId, userId),
          eq(maestroCustomerUserSites.customerId, membership.customerId),
          eq(maestroCustomerUserSites.isActive, true),
          eq(maestroCustomerSites.isActive, true),
        ),
      )

    const directSiteIds = sites.map((row) => row.siteId)
    const locationIds = await getLocationIdsForUserCustomer(userId, membership.customerId)
    const combinedSiteIds = [...new Set([...directSiteIds, ...locationIds])]

    contexts.push({
      userId,
      customerId: membership.customerId,
      roleIds,
      permissions,
      siteIds: combinedSiteIds,
      locationIds,
    })
  }

  return contexts
}

async function getLocationIdsForUserCustomer(userId: string, customerId: number) {
  const locations = await db
    .select({ locationId: maestroCustomerUserLocations.locationId })
    .from(maestroCustomerUserLocations)
    .innerJoin(
      maestroCustomerLocations,
      and(
        eq(maestroCustomerLocations.customerId, maestroCustomerUserLocations.customerId),
        eq(maestroCustomerLocations.locationId, maestroCustomerUserLocations.locationId),
      ),
    )
    .where(
      and(
        eq(maestroCustomerUserLocations.userId, userId),
        eq(maestroCustomerUserLocations.customerId, customerId),
        eq(maestroCustomerUserLocations.isActive, true),
        eq(maestroCustomerLocations.isActive, true),
      ),
    )
  return locations.map((row) => row.locationId)
}

export async function getMaestroAccessContext(userId: string, customerId?: number) {
  const contexts = await getMaestroAccessContexts(userId)
  if (customerId !== undefined) {
    const context = contexts.find((candidate) => candidate.customerId === customerId)
    if (!context) throw new MaestroAccessDeniedError('Customer membership not found')
    return context
  }
  if (contexts.length !== 1) {
    throw new MaestroAccessDeniedError(
      contexts.length === 0
        ? 'Customer membership not found'
        : 'An active customer context is required',
    )
  }
  return contexts[0]
}

export async function requireMaestroPermission(
  userId: string,
  permissionCode: string,
  customerId?: number,
) {
  const context = await getMaestroAccessContext(userId, customerId)
  if (!context.permissions.includes(permissionCode)) {
    throw new MaestroAccessDeniedError(`Missing permission: ${permissionCode}`)
  }
  return context
}

export async function requireMaestroSiteAccess(
  userId: string,
  siteId: number,
  customerId?: number,
) {
  const context = await getMaestroAccessContext(userId, customerId)
  if (!context.siteIds.includes(siteId)) {
    throw new MaestroAccessDeniedError('Site access denied')
  }
  return context
}

export async function requireMaestroLocationAccess(
  userId: string,
  locationId: number,
  customerId?: number,
) {
  const context = await getMaestroAccessContext(userId, customerId)
  if (!context.locationIds.includes(locationId)) {
    throw new MaestroAccessDeniedError('Location access denied')
  }
  return context
}
