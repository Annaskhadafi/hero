import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { centralServiceEmployees } from '@/db/schema/central-service'
import { employees } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { eq } from 'drizzle-orm'

async function requireCentralServiceAccess() {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(eq(employees.email, session.user.email.trim().toLowerCase()))
    .limit(1)

  const allowedRoles = new Set(['Super Admin', 'Admin', 'HC Admin', 'HR Admin', 'Site Admin'])
  if (!employee?.accessRole || !allowedRoles.has(employee.accessRole)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session }
}

/**
 * POST /api/central-service/employees/sync
 * Sync employee to User Management (create user account)
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireCentralServiceAccess()
    if (access.error) return access.error

    const body = await request.json()
    const { employeeId, email } = body

    if (!employeeId || !email) {
      return NextResponse.json({ error: 'Employee ID and email are required' }, { status: 400 })
    }

    // Get Central Service employee
    const [csEmployee] = await db
      .select()
      .from(centralServiceEmployees)
      .where(eq(centralServiceEmployees.id, employeeId))
      .limit(1)

    if (!csEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check if already synced
    if (csEmployee.isSyncedToUserManagement) {
      return NextResponse.json(
        { error: 'Employee already synced to User Management' },
        { status: 400 }
      )
    }

    // Update email if provided
    if (email !== csEmployee.email) {
      await db
        .update(centralServiceEmployees)
        .set({ email })
        .where(eq(centralServiceEmployees.id, employeeId))
    }

    // Check if employee already exists in User Management by SN
    const [existingEmployee] = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeSn, csEmployee.employeeSn))
      .limit(1)

    let userManagementEmployeeId: number

    if (existingEmployee) {
      // Update existing employee
      const [updated] = await db
        .update(employees)
        .set({
          name: csEmployee.fullName,
          email: email,
          phoneNumber: csEmployee.phoneNumber || '',
          department: csEmployee.department || 'Central Services', // Keep original or default
          section: csEmployee.section,
          jobTitle: csEmployee.position,
          workLocation: csEmployee.siteName,
          employmentStatus: csEmployee.employmentStatus,
        })
        .where(eq(employees.id, existingEmployee.id))
        .returning()
      userManagementEmployeeId = updated.id
    } else {
      // Create new employee in User Management
      const [newEmployee] = await db
        .insert(employees)
        .values({
          siteId: csEmployee.siteId || 1, // Default site if not set
          name: csEmployee.fullName,
          email: email,
          employeeSn: csEmployee.employeeSn,
          phoneNumber: csEmployee.phoneNumber || '',
          department: csEmployee.department || 'Central Services', // Keep original or default
          section: csEmployee.section,
          role: 'employee',
          jobTitle: csEmployee.position,
          workLocation: csEmployee.siteName,
          employmentStatus: csEmployee.employmentStatus,
          isActive: true,
        })
        .returning()
      userManagementEmployeeId = newEmployee.id
    }

    // Mark as synced in Central Service
    await db
      .update(centralServiceEmployees)
      .set({
        isSyncedToUserManagement: true,
        syncedAt: new Date(),
      })
      .where(eq(centralServiceEmployees.id, employeeId))

    return NextResponse.json({
      success: true,
      message: 'Employee synced to User Management successfully',
      userManagementEmployeeId,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
/**
 * GET /api/central-service/employees/sync
 * Bulk-refresh all CS employee emails FROM hero_employees (User Management).
 * hero_employees is the single source of truth for email.
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireCentralServiceAccess()
    if (access.error) return access.error

    // Fetch all CS employees that are synced to User Management
    const csEmployees = await db
      .select({
        id: centralServiceEmployees.id,
        employeeSn: centralServiceEmployees.employeeSn,
        currentEmail: centralServiceEmployees.email,
      })
      .from(centralServiceEmployees)
      .where(eq(centralServiceEmployees.isActive, true))

    if (csEmployees.length === 0) {
      return NextResponse.json({ success: true, updated: 0, skipped: 0 })
    }

    // Fetch all hero_employees emails matched by employeeSn
    const heroEmps = await db
      .select({ employeeSn: employees.employeeSn, email: employees.email })
      .from(employees)

    const heroEmailMap = new Map<string, string | null>()
    for (const e of heroEmps) {
      if (e.employeeSn) heroEmailMap.set(e.employeeSn.toLowerCase(), e.email)
    }

    let updated = 0
    let skipped = 0

    for (const csEmp of csEmployees) {
      const sn = csEmp.employeeSn?.toLowerCase() ?? ''
      const heroEmail = heroEmailMap.get(sn) ?? heroEmailMap.get(sn.replace(/^emp-/i, '')) ?? heroEmailMap.get(`emp-${sn}`)
      if (!heroEmail) { skipped++; continue }
      if (heroEmail === csEmp.currentEmail) { skipped++; continue }

      await db
        .update(centralServiceEmployees)
        .set({ email: heroEmail, updatedAt: new Date() })
        .where(eq(centralServiceEmployees.id, csEmp.id))
      updated++
    }

    return NextResponse.json({
      success: true,
      message: `Email sync selesai: ${updated} diperbarui, ${skipped} tidak berubah`,
      updated,
      skipped,
    })
  } catch (error) {
    console.error('Bulk email sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk sync failed' },
      { status: 500 }
    )
  }
}
