import { randomUUID } from 'node:crypto'

import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

import { db } from '@/db'
import { onechitaDb } from '@/db/onechitra-db'
import { employees, sites } from '@/db/schema/hero'
import { customers } from '@/db/schema/customers'
import {
  maestroAuditLogs,
  maestroCustomerMemberships,
  maestroCustomerLocations,
  maestroCustomerUserLocations,
  maestroCustomerSites,
  maestroCustomerUserSites,
  maestroCustomerUsers,
  maestroRoles,
  maestroUserRoles,
  maestroVisibilityPolicies,
} from '@/db/schema/maestro'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'

export class MaestroAdminAccessDeniedError extends Error {
  readonly status = 403

  constructor(message = 'MAESTRO administration access denied') {
    super(message)
    this.name = 'MaestroAdminAccessDeniedError'
  }
}

async function requireMaestroOperator() {
  const session = await getServerSession()
  if (!session?.user?.id) throw new MaestroAdminAccessDeniedError('HERO session required')

  const role = await getCurrentEmployeeAccessRole()
  const permission = await getCurrentMenuPermission('settings_maestro')
  if (!isSuperAdminRole(role) && !permission.canView) {
    throw new MaestroAdminAccessDeniedError()
  }

  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      or(
        eq(employees.authUserId, session.user.id),
        session.user.email ? sql`lower(${employees.email}) = lower(${session.user.email})` : undefined,
      ),
    )
    .limit(1)

  return { session, employeeId: employee?.id ?? null }
}

async function writeAudit(input: {
  actorEmployeeId: number | null
  action: string
  entityType: string
  entityId?: string
  customerId?: number
  siteId?: number
  metadata?: Record<string, unknown>
}) {
  await db.insert(maestroAuditLogs).values({
    actorType: 'internal',
    actorEmployeeId: input.actorEmployeeId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    customerId: input.customerId,
    siteId: input.siteId,
    metadata: input.metadata ?? {},
  })
}

type MaestroCustomerOption = {
  id: number | null
  name: string
  customerCode: string
}

/**
 * Master Data Customer lives in onechitranewdb. Keep the local HERO row id
 * when it exists because MAESTRO memberships use the local FK; new customers
 * are mirrored lazily when a user is registered.
 */
async function getMaestroCustomerOptions(): Promise<MaestroCustomerOption[]> {
  const localRows = await db
    .select({ id: customers.id, name: customers.name, customerCode: customers.customerCode })
    .from(customers)
    .orderBy(asc(customers.name))

  try {
    const remote = await onechitaDb.query(
      'SELECT customer_code, name FROM customers ORDER BY name ASC',
    )
    const localByCode = new Map(localRows.map((row) => [row.customerCode, row]))
    return remote.rows.map((row: { customer_code: string; name: string }) => ({
      id: localByCode.get(row.customer_code)?.id ?? null,
      name: row.name,
      customerCode: row.customer_code,
    }))
  } catch {
    return localRows
  }
}

async function resolveLocalCustomer(customerCode: string) {
  const [existing] = await db
    .select({ id: customers.id, name: customers.name, customerCode: customers.customerCode })
    .from(customers)
    .where(eq(customers.customerCode, customerCode))
    .limit(1)
  if (existing) return existing

  const remote = await onechitaDb.query(
    `SELECT customer_code, name, contact_name, email,
            address_1, address_2, address_3, address_4, address_5,
            birthday, business_category
     FROM customers WHERE customer_code = $1 LIMIT 1`,
    [customerCode],
  )
  const row = remote.rows[0] as Record<string, unknown> | undefined
  if (!row) throw new Error('Customer tidak ditemukan di Master Data Customer')

  await db.insert(customers).values({
    customerCode: String(row.customer_code),
    name: String(row.name),
    contactName: row.contact_name ? String(row.contact_name) : null,
    email: row.email ? String(row.email) : null,
    address1: row.address_1 ? String(row.address_1) : null,
    address2: row.address_2 ? String(row.address_2) : null,
    address3: row.address_3 ? String(row.address_3) : null,
    address4: row.address_4 ? String(row.address_4) : null,
    address5: row.address_5 ? String(row.address_5) : null,
    birthday: row.birthday ? String(row.birthday) : null,
    businessCategory: row.business_category ? String(row.business_category) : null,
  })

  const [mirrored] = await db
    .select({ id: customers.id, name: customers.name, customerCode: customers.customerCode })
    .from(customers)
    .where(eq(customers.customerCode, customerCode))
    .limit(1)
  if (!mirrored) throw new Error('Customer Master Data gagal dipetakan ke HERO')
  return mirrored
}

export async function getMaestroUserManagementData() {
  await requireMaestroOperator()

  const [customerRows, locationRows, roleRows, userRows, membershipRows, userRoleRows, userLocationRows] =
    await Promise.all([
      getMaestroCustomerOptions(),
      db
        .select({ id: sites.id, name: sites.name, location: sites.location })
        .from(sites)
        .where(eq(sites.isActive, true))
        .orderBy(asc(sites.name)),
      db
        .select({ id: maestroRoles.id, code: maestroRoles.code, name: maestroRoles.name, description: maestroRoles.description })
        .from(maestroRoles)
        .where(eq(maestroRoles.isActive, true))
        .orderBy(asc(maestroRoles.name)),
      db
        .select({ id: maestroCustomerUsers.id, email: maestroCustomerUsers.email, name: maestroCustomerUsers.name, isActive: maestroCustomerUsers.isActive, createdAt: maestroCustomerUsers.createdAt })
        .from(maestroCustomerUsers)
        .orderBy(desc(maestroCustomerUsers.createdAt)),
      db
        .select({ userId: maestroCustomerMemberships.userId, customerId: maestroCustomerMemberships.customerId, customerName: customers.name, customerCode: customers.customerCode })
        .from(maestroCustomerMemberships)
        .innerJoin(customers, eq(customers.id, maestroCustomerMemberships.customerId))
        .where(eq(maestroCustomerMemberships.isActive, true)),
      db
        .select({ userId: maestroUserRoles.userId, roleCode: maestroRoles.code, roleName: maestroRoles.name })
        .from(maestroUserRoles)
        .innerJoin(maestroRoles, eq(maestroRoles.id, maestroUserRoles.roleId))
        .where(eq(maestroRoles.isActive, true)),
      db
        .select({ userId: maestroCustomerUserLocations.userId, locationId: maestroCustomerUserLocations.locationId, locationName: sites.name })
        .from(maestroCustomerUserLocations)
        .innerJoin(sites, eq(sites.id, maestroCustomerUserLocations.locationId))
        .where(eq(maestroCustomerUserLocations.isActive, true)),
    ])

  const memberships = new Map(membershipRows.map((row) => [row.userId, row]))
  const roles = new Map<string, string[]>()
  for (const row of userRoleRows) roles.set(row.userId, [...(roles.get(row.userId) ?? []), row.roleName])
  const locationAccess = new Map<string, string[]>()
  for (const row of userLocationRows) locationAccess.set(row.userId, [...(locationAccess.get(row.userId) ?? []), row.locationName])

  return {
    customers: customerRows,
    locations: locationRows,
    roles: roleRows,
    users: userRows.map((user) => ({
      ...user,
      customer: memberships.get(user.id) ?? null,
      roles: roles.get(user.id) ?? [],
      locations: locationAccess.get(user.id) ?? [],
    })),
  }
}

export async function registerMaestroCustomerUser(input: {
  email: string
  name: string
  password: string
  customerCode: string
  roleCode: string
  locationIds: number[]
}) {
  const { employeeId } = await requireMaestroOperator()
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const locationIds = [...new Set(input.locationIds.map(Number).filter(Number.isInteger))]
  if (!email || !email.includes('@')) throw new Error('Valid customer email is required')
  if (!name) throw new Error('Customer user name is required')
  if (input.password.length < 8) throw new Error('Customer password must be at least 8 characters')
  const customerCode = input.customerCode.trim()
  if (!customerCode) throw new Error('Customer is required')
  if (!input.roleCode.trim()) throw new Error('MAESTRO role is required')
  if (!locationIds.length) throw new Error('Pilih minimal satu lokasi')

  const [existingUser] = await db
    .select({ id: maestroCustomerUsers.id })
    .from(maestroCustomerUsers)
    .where(ilike(maestroCustomerUsers.email, email))
    .limit(1)
  if (existingUser) throw new Error('Email customer sudah terdaftar di MAESTRO')

  const customer = await resolveLocalCustomer(customerCode)

  const [role] = await db
    .select({ id: maestroRoles.id, code: maestroRoles.code })
    .from(maestroRoles)
    .where(and(eq(maestroRoles.code, input.roleCode.trim()), eq(maestroRoles.isActive, true)))
    .limit(1)
  if (!role) throw new Error('MAESTRO role tidak ditemukan')

  const selectedLocations = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.isActive, true), inArray(sites.id, locationIds)))
  if (selectedLocations.length !== locationIds.length) throw new Error('Ada lokasi yang tidak aktif atau tidak ditemukan')

  const userId = randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(maestroCustomerUsers).values({
      id: userId,
      email,
      name,
      passwordHash: await hashPassword(input.password),
    })
    await tx.insert(maestroCustomerMemberships).values({ userId, customerId: customer.id })
    await tx.insert(maestroUserRoles).values({ userId, roleId: role.id })
    await tx.insert(maestroCustomerLocations).values(
      locationIds.map((locationId) => ({ customerId: customer.id, locationId })),
    ).onConflictDoNothing()
    await tx.insert(maestroCustomerUserLocations).values(
      locationIds.map((locationId) => ({ userId, customerId: customer.id, locationId })),
    )
  })

  await writeAudit({
    actorEmployeeId: employeeId,
    action: 'customer_user.registered',
    entityType: 'maestro_customer_user',
    entityId: userId,
    customerId: customer.id,
    metadata: { roleCode: role.code, locationIds },
  })
  return { id: userId }
}

export async function createMaestroCustomerUser(input: {
  email: string
  name: string
  password: string
  customerId: number
}) {
  const { employeeId } = await requireMaestroOperator()
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!email || !email.includes('@')) throw new Error('Valid customer email is required')
  if (!name) throw new Error('Customer user name is required')
  if (input.password.length < 8) throw new Error('Customer password must be at least 8 characters')

  const userId = randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(maestroCustomerUsers).values({
      id: userId,
      email,
      name,
      passwordHash: await hashPassword(input.password),
    })
    await tx.insert(maestroCustomerMemberships).values({
      userId,
      customerId: input.customerId,
    })
  })

  await writeAudit({
    actorEmployeeId: employeeId,
    action: 'customer_user.created',
    entityType: 'maestro_customer_user',
    entityId: userId,
    customerId: input.customerId,
  })
  return { id: userId }
}

export async function assignMaestroRole(userId: string, roleCode: string) {
  const { employeeId } = await requireMaestroOperator()
  const [user] = await db
    .select({ id: maestroCustomerUsers.id })
    .from(maestroCustomerUsers)
    .where(and(eq(maestroCustomerUsers.id, userId), eq(maestroCustomerUsers.isActive, true)))
    .limit(1)
  if (!user) throw new Error('MAESTRO customer user not found')
  const [role] = await db
    .select({ id: maestroRoles.id })
    .from(maestroRoles)
    .where(and(eq(maestroRoles.code, roleCode), eq(maestroRoles.isActive, true)))
    .limit(1)
  if (!role) throw new Error('MAESTRO role not found')

  await db.insert(maestroUserRoles).values({ userId, roleId: role.id }).onConflictDoNothing()
  await writeAudit({
    actorEmployeeId: employeeId,
    action: 'customer_user.role_assigned',
    entityType: 'maestro_user_role',
    entityId: userId,
    metadata: { roleCode },
  })
}

export async function grantMaestroSiteAccess(input: {
  userId: string
  customerId: number
  siteId: number
}) {
  const { employeeId } = await requireMaestroOperator()
  const [membership] = await db
    .select({ id: maestroCustomerMemberships.id })
    .from(maestroCustomerMemberships)
    .where(
      and(
        eq(maestroCustomerMemberships.userId, input.userId),
        eq(maestroCustomerMemberships.customerId, input.customerId),
        eq(maestroCustomerMemberships.isActive, true),
      ),
    )
    .limit(1)
  if (!membership) throw new Error('Customer membership is required before site access')

  await db.transaction(async (tx) => {
    await tx
      .insert(maestroCustomerSites)
      .values({ customerId: input.customerId, siteId: input.siteId })
      .onConflictDoNothing()
    await tx
      .insert(maestroCustomerUserSites)
      .values(input)
      .onConflictDoNothing()
  })
  await writeAudit({
    actorEmployeeId: employeeId,
    action: 'customer_user.site_granted',
    entityType: 'maestro_customer_user_site',
    entityId: input.userId,
    customerId: input.customerId,
    siteId: input.siteId,
  })
}

export async function saveMaestroVisibilityPolicy(
  customerId: number,
  policy: Partial<{
    canViewEmployeeNames: boolean
    canViewAttendanceDetail: boolean
    canViewActivityPhotos: boolean
    canViewSafetyDetails: boolean
    canViewFinancialAmounts: boolean
    canDownloadDocuments: boolean
  }>,
) {
  const { employeeId } = await requireMaestroOperator()
  await db
    .insert(maestroVisibilityPolicies)
    .values({ customerId, ...policy })
    .onConflictDoUpdate({ target: maestroVisibilityPolicies.customerId, set: { ...policy, updatedAt: new Date() } })
  await writeAudit({
    actorEmployeeId: employeeId,
    action: 'visibility_policy.updated',
    entityType: 'maestro_visibility_policy',
    entityId: String(customerId),
    customerId,
    metadata: policy,
  })
}
