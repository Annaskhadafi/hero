import { and, eq, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { user as authUser } from '@/db/schema/auth'
import { employees, navbarMenuItems, roleMenuPermissions, securityRoles, sites } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'

export type HeroMenuPermission = {
  roleName: string | null
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll: boolean
  dataScope: DataScope
}

export type DataScope = 'own' | 'site' | 'global'

export function normalizeDataScope(value: unknown): DataScope {
  return value === 'site' || value === 'global' ? value : 'own'
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
  return trimmed === 'Super Admin' || lower === 'super admin' || lower === 'superadmin'
}

export async function getEmployeeAccessRoleByEmail(email: string) {
  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(
      or(
        sql`lower(${employees.email}) = lower(${email})`,
        sql`lower(${authUser.email}) = lower(${email})`
      )
    )
    .limit(1)

  return employee?.accessRole ?? null
}

export async function getCurrentEmployeeAccessRole(): Promise<string> {
  const session = await getServerSession()

  if (!session?.user?.id && !session?.user?.email) return ''
  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(
      or(
        session.user.id ? eq(employees.authUserId, session.user.id) : undefined,
        session.user.email
          ? sql`lower(${employees.email}) = lower(${session.user.email})`
          : undefined
      )
    )
    .limit(1)

  if (employee?.accessRole) return employee.accessRole
  return ''
}

export function isLeadershipOrManagerialRole(roleName?: string | null): boolean {
  if (!roleName) return false
  if (isSuperAdminRole(roleName)) return true
  const normalized = roleName.toLowerCase().trim()
  if (
    normalized === 'field team' ||
    normalized.includes('field team') ||
    normalized === 'mechanic' ||
    normalized === 'technician'
  ) {
    return false
  }
  const leadershipRoleKeywords = [
    'pjo',
    'manager',
    'head',
    'director',
    'admin',
    'central services',
    'supervisor',
    'spv',
    'coordinator',
    'leader',
    'hse',
  ]
  return leadershipRoleKeywords.some((keyword) => normalized.includes(keyword))
}

export function isLeadershipOrManagerialTitle(
  jobTitle?: string | null,
  role?: string | null
): boolean {
  const text = `${jobTitle || ''} ${role || ''}`.toLowerCase()
  const keywords = [
    'pjo',
    'head',
    'manager',
    'director',
    'supervisor',
    'spv',
    'coordinator',
    'leader',
    'gm',
    'general manager',
    'admin',
    'bod',
    'executive',
  ]
  return keywords.some((kw) => text.includes(kw))
}

export async function canAccessDailyActivityMonitoring(
  userEmail?: string | null,
  userId?: string | null,
  roleName?: string | null
): Promise<boolean> {
  // 1. Super Admin always allowed
  if (roleName && isSuperAdminRole(roleName)) return true

  // 2. Direct check on roleName if leadership role
  if (roleName && isLeadershipOrManagerialRole(roleName)) return true

  if (!userEmail && !userId) return false

  const userConds = []
  if (userId) userConds.push(eq(employees.authUserId, userId))
  if (userEmail) userConds.push(sql`lower(${employees.email}) = lower(${userEmail})`)
  if (userConds.length === 0) return false

  const [emp] = await db
    .select({
      id: employees.id,
      jobTitle: employees.jobTitle,
      role: employees.role,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(userConds.length > 1 ? or(...userConds) : userConds[0])
    .limit(1)

  if (!emp) return false

  // If user has an explicit leadership accessRole in DB
  if (isLeadershipOrManagerialRole(emp.accessRole)) return true

  // If user has leadership job title or employee role
  if (isLeadershipOrManagerialTitle(emp.jobTitle, emp.role)) return true

  // 4. Check if employee is designated Site Head (PJO Site) in sites table
  const [siteHead] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.headEmployeeId, emp.id))
    .limit(1)

  if (siteHead) return true

  // 5. Check if employee has direct subordinates (acting as Atasan / Head)
  const [hasSubordinate] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.directManagerId, emp.id))
    .limit(1)

  if (hasSubordinate) return true

  return false
}

export async function getMenuPermissionForRole(
  roleName: string | null,
  resource: string
): Promise<HeroMenuPermission> {
  if (resource === 'tire_service') {
    return {
      roleName: roleName || 'User',
      canView: true,
      canEdit: true,
      canDelete: false,
      canSelectAll: false,
      dataScope: 'global',
    }
  }

  if (resource === 'daily_activity') {
    // Khusus untuk PJO, Head Section, Head Department, keatas
    const isLeadership = isLeadershipOrManagerialRole(roleName)
    return {
      roleName: roleName || 'User',
      canView: isLeadership,
      canEdit: isLeadership,
      canDelete: false,
      canSelectAll: isLeadership,
      dataScope: 'global' as const,
    }
  }

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
    .where(
      and(
        sql`lower(${securityRoles.name}) = lower(${roleName})`,
        eq(navbarMenuItems.resource, resource)
      )
    )
    .limit(1)

  if (permission) {
    const dataScope = normalizeDataScope(permission.dataScope)
    const hasInvalidDataScope =
      permission.dataScope != null &&
      permission.dataScope !== 'own' &&
      permission.dataScope !== 'site' &&
      permission.dataScope !== 'global'

    return {
      roleName,
      canView: hasInvalidDataScope ? false : permission.canView,
      canEdit: hasInvalidDataScope ? false : permission.canEdit,
      canDelete: hasInvalidDataScope ? false : permission.canDelete,
      canSelectAll: hasInvalidDataScope ? false : permission.canSelectAll,
      dataScope,
    }
  }

  return {
    roleName,
    canView: false,
    canEdit: false,
    canDelete: false,
    canSelectAll: false,
    dataScope: 'own',
  }
}

export async function getCurrentMenuPermission(resource: string): Promise<HeroMenuPermission> {
  const session = await getServerSession()
  const roleName = await getCurrentEmployeeAccessRole()

  if (resource === 'daily_activity') {
    const canAccess = await canAccessDailyActivityMonitoring(
      session?.user?.email,
      session?.user?.id,
      roleName
    )
    return {
      roleName: roleName || 'User',
      canView: canAccess,
      canEdit: canAccess,
      canDelete: false,
      canSelectAll: canAccess,
      dataScope: 'global' as const,
    }
  }

  return getMenuPermissionForRole(roleName, resource)
}

export async function getDashboardRoutePermission(pathname: string) {
  const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/dashboard'

  // Dashboard home or empty path is accessible to all authenticated users
  if (cleanPath === '/dashboard') {
    const roleName = await getCurrentEmployeeAccessRole()
    return {
      roleName,
      canView: true,
      canEdit: true,
      canDelete: true,
      canSelectAll: true,
      dataScope: 'own',
    }
  }

  const menuItems = await db
    .select({ url: navbarMenuItems.url, resource: navbarMenuItems.resource })
    .from(navbarMenuItems)

  const matchingMenu = menuItems
    .filter(({ url }) => {
      const cleanUrl = url.split('?')[0].replace(/\/$/, '')
      return cleanPath === cleanUrl || cleanPath.startsWith(`${cleanUrl}/`)
    })
    .sort((left, right) => right.url.length - left.url.length)[0]

  if (matchingMenu) {
    return getCurrentMenuPermission(matchingMenu.resource)
  }

  const roleName = await getCurrentEmployeeAccessRole()
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

  return null
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
        session.user.email
          ? sql`lower(${employees.email}) = lower(${session.user.email})`
          : undefined
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

export function hasSiteDataAccess(permission: Pick<HeroMenuPermission, 'dataScope'>) {
  return permission.dataScope === 'site'
}

export async function getUserAccessibleSiteIds(employeeId: number): Promise<number[]> {
  const [emp] = await db
    .select({ siteId: employees.siteId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)

  return emp?.siteId == null ? [] : [emp.siteId]
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
