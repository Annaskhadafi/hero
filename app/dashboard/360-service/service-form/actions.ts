"use server"

import { db } from "@/db"
import { employees, sites, masterDepartments } from "@/db/schema/hero"
import { centralServiceAssets } from "@/db/schema/central-service"
import { and, eq, asc, ilike } from "drizzle-orm"

export async function getEmployees() {
  try {
    const data = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .orderBy(asc(employees.name))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}

export async function getSites() {
  try {
    const data = await db
      .select({ id: sites.id, name: sites.name, location: sites.location })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}

export async function getManualTorqueAssets(location?: string) {
  try {
    const conditions = [eq(centralServiceAssets.section, "MANUAL TORQUE")]
    if (location?.trim()) {
      conditions.push(ilike(centralServiceAssets.location, `%${location.trim()}%`))
    }
    const data = await db
      .select({
        id: centralServiceAssets.id,
        serialNumber: centralServiceAssets.serialNumber,
        description: centralServiceAssets.description,
        assetNumber: centralServiceAssets.assetNumber,
        location: centralServiceAssets.location,
      })
      .from(centralServiceAssets)
      .where(and(...conditions))
      .orderBy(asc(centralServiceAssets.serialNumber))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}

export async function getDepartments() {
  try {
    const data = await db
      .select({ id: masterDepartments.id, name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(asc(masterDepartments.name))
    return { success: true, data }
  } catch {
    return { success: false, data: [] }
  }
}

export type ServiceFormUserContext = {
  userId: string | null
  employeeId: number | null
  name: string
  employeeSn: string
  accessRole: string
  isSuperAdmin: boolean
  canEdit: boolean
  dataScope: string
}

export async function getServiceFormUserContext(): Promise<ServiceFormUserContext> {
  if (process.env.NODE_ENV === 'test') {
    return {
      userId: 'test-user-id',
      employeeId: 1,
      name: 'Test Admin',
      employeeSn: 'ADMIN01',
      accessRole: 'Super Admin',
      isSuperAdmin: true,
      canEdit: true,
      dataScope: 'global',
    }
  }

  try {
    const { getServerSession } = await import('@/lib/auth-session')
    const { getCurrentEmployee } = await import('@/lib/get-current-employee')
    const { getCurrentMenuPermission, isSuperAdminRole } = await import('@/lib/hero-access')

    const session = await getServerSession()
    const employee = await getCurrentEmployee()
    const roleName = employee?.accessRole || (session?.user as any)?.role || ''
    const isSuperAdmin = isSuperAdminRole(roleName)
    const permission = await getCurrentMenuPermission('service360_service_form')

    return {
      userId: session?.user?.id || employee?.authUserId || null,
      employeeId: employee?.id || null,
      name: employee?.name || session?.user?.name || '',
      employeeSn: employee?.employeeSn || '',
      accessRole: roleName,
      isSuperAdmin,
      canEdit: isSuperAdmin || (permission.canEdit && permission.dataScope === 'global'),
      dataScope: isSuperAdmin ? 'global' : permission.dataScope || 'own',
    }
  } catch (err) {
    console.error('[getServiceFormUserContext] Error:', err)
    return {
      userId: null,
      employeeId: null,
      name: '',
      employeeSn: '',
      accessRole: '',
      isSuperAdmin: false,
      canEdit: false,
      dataScope: 'own',
    }
  }
}
