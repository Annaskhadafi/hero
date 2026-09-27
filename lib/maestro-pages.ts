import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  maestroCustomerUsers,
  maestroPageRegistry,
  maestroPermissions,
  maestroRolePermissions,
  maestroRoles,
  maestroUserRoles,
} from '@/db/schema/maestro'

export type MaestroPageDefinition = {
  code: string
  path: string
  label: string
  module: string
  permissionCode: string
  menuGroup?: string
  sortOrder?: number
  requiresSiteScope?: boolean
  metadata?: Record<string, unknown>
}

export const MAESTRO_PAGE_REGISTRY: readonly MaestroPageDefinition[] = [
  {
    code: 'maestro.dashboard',
    path: '/maestro',
    label: 'Dashboard',
    module: 'Overview',
    permissionCode: 'maestro.dashboard.view',
    sortOrder: 10,
  },
  {
    code: 'maestro.activity',
    path: '/maestro/activity',
    label: 'Daily Activity',
    module: 'Operations',
    permissionCode: 'maestro.activity.view',
    sortOrder: 20,
  },
  {
    code: 'maestro.attendance',
    path: '/maestro/attendance',
    label: 'Attendance',
    module: 'Operations',
    permissionCode: 'maestro.attendance.view',
    sortOrder: 30,
  },
  {
    code: 'maestro.safety',
    path: '/maestro/safety',
    label: 'Safety',
    module: 'Operations',
    permissionCode: 'maestro.safety.view',
    sortOrder: 40,
  },
  {
    code: 'maestro.orders',
    path: '/maestro/orders',
    label: 'Orders & PO',
    module: 'Commercial',
    permissionCode: 'maestro.orders.view',
    sortOrder: 50,
  },
  {
    code: 'maestro.deliveries',
    path: '/maestro/deliveries',
    label: 'Delivery & Reception',
    module: 'Commercial',
    permissionCode: 'maestro.deliveries.view',
    sortOrder: 60,
  },
  {
    code: 'maestro.invoice',
    path: '/maestro/invoices',
    label: 'Invoices',
    module: 'Commercial',
    permissionCode: 'maestro.invoice.view',
    sortOrder: 70,
  },
  {
    code: 'maestro.documents',
    path: '/maestro/documents',
    label: 'Documents',
    module: 'Commercial',
    permissionCode: 'maestro.documents.view',
    sortOrder: 80,
  },
]

const EXTRA_PERMISSIONS = [
  ['maestro.export', 'Export MAESTRO data', 'System', 'export'],
  ['maestro.customer-users.manage', 'Manage customer users', 'Administration', 'manage'],
  ['maestro.site-access.manage', 'Manage customer site access', 'Administration', 'manage'],
  ['maestro.visibility.manage', 'Manage customer visibility', 'Administration', 'manage'],
  ['maestro.audit.view', 'View MAESTRO audit log', 'Administration', 'view'],
] as const

const ROLE_SEEDS = [
  ['customer_viewer', 'Customer Viewer', 'Read-only portal access', ['maestro.dashboard.view', 'maestro.activity.view', 'maestro.attendance.view', 'maestro.safety.view', 'maestro.orders.view', 'maestro.deliveries.view', 'maestro.invoice.view', 'maestro.documents.view']],
  ['customer_supervisor', 'Customer Supervisor', 'Operational portal access with export', ['maestro.dashboard.view', 'maestro.activity.view', 'maestro.attendance.view', 'maestro.safety.view', 'maestro.orders.view', 'maestro.deliveries.view', 'maestro.invoice.view', 'maestro.documents.view', 'maestro.export']],
  ['customer_finance', 'Customer Finance', 'Commercial and invoice visibility', ['maestro.dashboard.view', 'maestro.orders.view', 'maestro.deliveries.view', 'maestro.invoice.view', 'maestro.documents.view', 'maestro.export']],
  ['customer_admin', 'Customer Admin', 'Customer portal administration', ['maestro.dashboard.view', 'maestro.activity.view', 'maestro.attendance.view', 'maestro.safety.view', 'maestro.orders.view', 'maestro.deliveries.view', 'maestro.invoice.view', 'maestro.documents.view', 'maestro.export', 'maestro.customer-users.manage', 'maestro.site-access.manage', 'maestro.visibility.manage', 'maestro.audit.view']],
] as const

function permissionSeed(definition: MaestroPageDefinition) {
  const [, action] = definition.permissionCode.split('.').slice(-2)
  return {
    code: definition.permissionCode,
    label: `${definition.label} (${action})`,
    module: definition.module,
    action,
  }
}

export async function syncMaestroFoundation() {
  return db.transaction(async (tx) => {
    const permissionSeeds = [
      ...MAESTRO_PAGE_REGISTRY.map(permissionSeed),
      ...EXTRA_PERMISSIONS.map(([code, label, module, action]) => ({ code, label, module, action })),
    ]

    const permissionIds = new Map<string, number>()
    for (const permission of permissionSeeds) {
      const [row] = await tx
        .insert(maestroPermissions)
        .values(permission)
        .onConflictDoUpdate({
          target: maestroPermissions.code,
          set: {
            label: permission.label,
            module: permission.module,
            action: permission.action,
            isActive: true,
          },
        })
        .returning({ id: maestroPermissions.id, code: maestroPermissions.code })
      if (row) permissionIds.set(row.code, row.id)
    }

    for (const definition of MAESTRO_PAGE_REGISTRY) {
      await tx
        .insert(maestroPageRegistry)
        .values({
          code: definition.code,
          path: definition.path,
          label: definition.label,
          module: definition.module,
          permissionCode: definition.permissionCode,
          menuGroup: definition.menuGroup ?? 'MAESTRO',
          sortOrder: definition.sortOrder ?? 0,
          requiresSiteScope: definition.requiresSiteScope ?? true,
          metadata: definition.metadata ?? {},
        })
        .onConflictDoUpdate({
          target: maestroPageRegistry.code,
          set: {
            path: definition.path,
            label: definition.label,
            module: definition.module,
            permissionCode: definition.permissionCode,
            menuGroup: definition.menuGroup ?? 'MAESTRO',
            sortOrder: definition.sortOrder ?? 0,
            requiresSiteScope: definition.requiresSiteScope ?? true,
            metadata: definition.metadata ?? {},
            isActive: true,
          },
        })
    }

    for (const [code, name, description, permissionCodes] of ROLE_SEEDS) {
      const [role] = await tx
        .insert(maestroRoles)
        .values({ code, name, description, isSystem: true, isActive: true })
        .onConflictDoUpdate({
          target: maestroRoles.code,
          set: { name, description, isActive: true },
        })
        .returning({ id: maestroRoles.id })

      if (!role) continue
      for (const permissionCode of permissionCodes) {
        const permissionId = permissionIds.get(permissionCode)
        if (!permissionId) continue
        await tx
          .insert(maestroRolePermissions)
          .values({ roleId: role.id, permissionId })
          .onConflictDoNothing()
      }
    }

    return {
      pages: MAESTRO_PAGE_REGISTRY.length,
      permissions: permissionSeeds.length,
      roles: ROLE_SEEDS.length,
    }
  })
}

export async function listMaestroPages() {
  return db
    .select()
    .from(maestroPageRegistry)
    .where(eq(maestroPageRegistry.isActive, true))
    .orderBy(maestroPageRegistry.sortOrder)
}

export async function getMaestroPermissionCodesForUser(userId: string) {
  const rows = await db
    .select({ code: maestroPermissions.code })
    .from(maestroCustomerUsers)
    .innerJoin(maestroUserRoles, eq(maestroUserRoles.userId, maestroCustomerUsers.id))
    .innerJoin(maestroRoles, eq(maestroRoles.id, maestroUserRoles.roleId))
    .innerJoin(maestroRolePermissions, eq(maestroRolePermissions.roleId, maestroRoles.id))
    .innerJoin(maestroPermissions, eq(maestroPermissions.id, maestroRolePermissions.permissionId))
    .where(
      and(
        eq(maestroCustomerUsers.id, userId),
        eq(maestroCustomerUsers.isActive, true),
        eq(maestroRoles.isActive, true),
        eq(maestroPermissions.isActive, true),
      ),
    )

  return [...new Set(rows.map((row) => row.code))]
}
