import { and, eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { user as authUser } from '@/db/schema/auth'
import {
  employees,
  employeeSiteAssignments,
  navbarMenuItems,
  roleMenuPermissions,
  securityRoles,
} from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'

export type HeroMenuPermission = {
  roleName: string | null
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
  dataScope: string
}

export type HeroEmployeeAccessContext = {
  employeeId: number
  siteId: number
  sectionId: number | null
  roleName: string | null
}

export function isSuperAdminRole(roleName: string | null | undefined): boolean {
  if (!roleName) return false
  const trimmed = roleName.trim()
  const lower = trimmed.toLowerCase()
  return (
    trimmed === 'Super Admin' ||
    trimmed === 'Khusus Mas Rendi' ||
    trimmed === 'System Administrator' ||
    lower === 'super admin' ||
    lower === 'superadmin' ||
    lower === 'system administrator'
  )
}

export async function getEmployeeAccessRoleByEmail(email: string) {
  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(or(eq(employees.email, email), eq(authUser.email, email)))
    .limit(1)

  return employee?.accessRole ?? null
}

export async function getCurrentEmployeeAccessRole() {
  const session = await getServerSession()

  if (session?.user?.id || session?.user?.email) {
    const [employee] = await db
      .select({ accessRole: employees.accessRole })
      .from(employees)
      .where(
        or(
          session.user.id ? eq(employees.authUserId, session.user.id) : undefined,
          session.user.email ? eq(employees.email, session.user.email) : undefined
        )
      )
      .limit(1)

    if (employee?.accessRole) return employee.accessRole
  }

  const [defaultUser] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(
      or(
        eq(employees.email, 'mochamad.khadafi@chitraparatama.co.id'),
        eq(employees.employeeSn, '71261')
      )
    )
    .limit(1)

  return defaultUser?.accessRole ?? 'Super Admin'
}

export async function getMenuPermissionForRole(
  roleName: string | null,
  resource: string
): Promise<HeroMenuPermission> {
  if (!roleName) {
    return {
      roleName: null,
      canView: false,
      canEdit: false,
      canDelete: false,
      canSelectAll: false,
      dataScope: 'own',
    }
  }

  if (isSuperAdminRole(roleName)) {
    return {
      roleName,
      canView: true,
      canEdit: true,
      canDelete: true,
      canSelectAll: true,
      dataScope: 'global',
    }
  }

  const [permission] = await db
    .select({
      canView: roleMenuPermissions.canView,
      canEdit: roleMenuPermissions.canEdit,
      canDelete: roleMenuPermissions.canDelete,
      canSelectAll: roleMenuPermissions.canSelectAll,
      dataScope: roleMenuPermissions.dataScope,
    })
    .from(roleMenuPermissions)
    .innerJoin(securityRoles, eq(roleMenuPermissions.roleId, securityRoles.id))
    .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
    .where(and(eq(securityRoles.name, roleName), eq(navbarMenuItems.resource, resource)))
    .limit(1)

  if (permission) {
    return {
      roleName,
      canView: permission.canView,
      canEdit: permission.canEdit,
      canDelete: permission.canDelete,
      canSelectAll: permission.canSelectAll,
      dataScope: permission.dataScope || 'own',
    }
  }

  // Fallback defaults for standard roles if not configured in roleMenuPermissions
  const isElevated = roleName === 'Site Admin' || roleName === 'HC Manager' || roleName === 'Manager'
  return {
    roleName,
    canView: isElevated,
    canEdit: isElevated,
    canDelete: false,
    canSelectAll: false,
    dataScope: roleName === 'HC Manager' ? 'global' : 'site',
  }
}

export async function getCurrentMenuPermission(resource: string) {
  const roleName = await getCurrentEmployeeAccessRole()
  return getMenuPermissionForRole(roleName, resource)
}

export async function getCurrentEmployeeAccessContext(): Promise<HeroEmployeeAccessContext | null> {
  const session = await getServerSession()

  if (!session?.user?.id && !session?.user?.email) {
    return null
  }

  const [employee] = await db
    .select({
      employeeId: employees.id,
      siteId: employees.siteId,
      sectionId: employees.sectionId,
      roleName: employees.accessRole,
    })
    .from(employees)
    .where(
      or(
        session.user.id ? eq(employees.authUserId, session.user.id) : undefined,
        session.user.email ? eq(employees.email, session.user.email) : undefined
      )
    )
    .limit(1)

  return employee ?? null
}

export function hasGlobalDataAccess(
  permission: Pick<HeroMenuPermission, 'canSelectAll' | 'dataScope'>
) {
  return permission.dataScope === 'global'
}

export function hasSiteDataAccess(
  permission: Pick<HeroMenuPermission, 'dataScope'>
) {
  return permission.dataScope === 'site'
}

export async function getUserAccessibleSiteIds(employeeId: number): Promise<number[]> {
  const [emp] = await db
    .select({ siteId: employees.siteId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)

  const siteIds = new Set<number>()
  if (emp?.siteId != null) {
    siteIds.add(emp.siteId)
  }

  const extraAssignments = await db
    .select({ siteId: employeeSiteAssignments.siteId })
    .from(employeeSiteAssignments)
    .where(
      and(
        eq(employeeSiteAssignments.employeeId, employeeId),
        eq(employeeSiteAssignments.isActive, true)
      )
    )

  for (const item of extraAssignments) {
    if (item.siteId != null) {
      siteIds.add(item.siteId)
    }
  }

  return Array.from(siteIds)
}

export const SCHEDULING_TIMESHEET_TABS = [
  {
    resource: 'scheduling_timesheet',
    label: 'Overview Roster',
    href: '/dashboard/scheduling-timesheet',
    hint: 'Status per site & periode',
    iconName: 'LayoutDashboard',
  },
  {
    resource: 'scheduling_timesheet_setup',
    label: 'Konfigurasi Roster, OT dan Meals',
    href: '/dashboard/scheduling-timesheet/setup',
    hint: 'Profil & konfigurasi site',
    iconName: 'Users',
  },
  {
    resource: 'scheduling_timesheet_field_break',
    label: 'Field Break Schedule',
    href: '/dashboard/scheduling-timesheet/field-break',
    hint: 'Rotasi FB',
    iconName: 'Coffee',
  },
  {
    resource: 'scheduling_timesheet_schedule_v2',
    label: 'Schedule V2',
    href: '/dashboard/scheduling-timesheet/schedule-v2',
    hint: 'Manual grid tanpa auto-generate',
    iconName: 'CalendarDays',
  },
  {
    resource: 'scheduling_timesheet_attendance',
    label: 'Attendance',
    href: '/dashboard/scheduling-timesheet/attendance',
    hint: 'Face/location, manual, Excel',
    iconName: 'ClipboardList',
  },
  {
    resource: 'scheduling_timesheet_payroll',
    label: 'Payroll Timesheet',
    href: '/dashboard/scheduling-timesheet/payroll',
    hint: 'Rekap MSA & overtime',
    iconName: 'FileSpreadsheet',
  },
] as const

export async function getPermittedSchedulingTabs() {
  const roleName = await getCurrentEmployeeAccessRole()

  if (isSuperAdminRole(roleName)) {
    return SCHEDULING_TIMESHEET_TABS.map((tab) => ({
      ...tab,
      canView: true,
      canEdit: true,
      canDelete: true,
      canSelectAll: true,
      dataScope: 'global',
    }))
  }

  const results = await Promise.all(
    SCHEDULING_TIMESHEET_TABS.map(async (tab) => {
      const permission = await getMenuPermissionForRole(roleName, tab.resource)
      return {
        ...tab,
        canView: permission.canView,
        canEdit: permission.canEdit,
        canDelete: permission.canDelete,
        canSelectAll: permission.canSelectAll,
        dataScope: permission.dataScope,
      }
    })
  )

  return results.filter((tab) => tab.canView)
}
