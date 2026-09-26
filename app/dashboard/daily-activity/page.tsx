import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees, masterDepartments, masterSections, sites } from '@/db/schema/hero'
import { eq, or, sql } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth-session'
import { canAccessDailyActivityMonitoring, isSuperAdminRole } from '@/lib/hero-access'
import { getDailyActivityDashboardData } from '@/lib/daily-activity-dashboard'
import { DailyActivityClientDashboard } from './client-dashboard'

export const metadata: Metadata = {
  title: 'Daily Activity - Monitoring PJO & Head | HERO',
  description: 'Monitoring aktivitas harian seluruh karyawan site khusus PJO, Head Section, Head Department, dan Manajemen',
}

interface PageProps {
  searchParams?: Promise<{
    siteId?: string
    date?: string
    startDate?: string
    endDate?: string
    shift?: string
    dept?: string
    section?: string
    status?: string
    q?: string
    employeeName?: string
  }>
}

export default async function DailyActivityPage({ searchParams }: PageProps) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  // Khusus untuk PJO, Head Section, Head Department, keatas
  const sessionRole = (session.user as { role?: string }).role || null
  const canAccess = await canAccessDailyActivityMonitoring(
    session.user.email,
    session.user.id,
    sessionRole
  )

  if (!canAccess) {
    // Teknisi / karyawan biasa diarahkan ke modul input aktivitas My Day
    redirect('/dashboard/activity-hub/my-day')
  }

  const resolvedParams = searchParams ? await searchParams : {}

  const userConds = []
  if (session.user.id) {
    userConds.push(eq(employees.authUserId, session.user.id))
  }
  if (session.user.email) {
    userConds.push(sql`lower(${employees.email}) = lower(${session.user.email})`)
  }

  // 1. Fetch current employee with joined master department, section, and site data
  const empRows = userConds.length > 0
    ? await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          jobTitle: employees.jobTitle,
          role: employees.role,
          accessRole: employees.accessRole,
          siteId: employees.siteId,
          departmentId: employees.departmentId,
          sectionId: employees.sectionId,
          department: employees.department,
          section: employees.section,
          siteName: sites.name,
          deptName: masterDepartments.name,
          sectionName: masterSections.name,
        })
        .from(employees)
        .leftJoin(sites, eq(employees.siteId, sites.id))
        .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
        .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
        .where(userConds.length > 1 ? or(...userConds) : userConds[0])
        .limit(1)
        .catch((err) => {
          console.error('[daily-activity:page:employee] query error:', err)
          return []
        })
    : []

  const emp = empRows[0]

  // 2. Check if employee is registered as head in master data
  let siteHeadSites: Array<{ id: number; name: string }> = []
  let deptHeadDepts: Array<{ id: number; name: string }> = []
  let sectionHeadSections: Array<{ id: number; name: string }> = []

  if (emp?.id) {
    const [hSites, hDepts, hSecs] = await Promise.all([
      db
        .select({ id: sites.id, name: sites.name })
        .from(sites)
        .where(eq(sites.headEmployeeId, emp.id)),
      db
        .select({ id: masterDepartments.id, name: masterDepartments.name })
        .from(masterDepartments)
        .where(eq(masterDepartments.headEmployeeId, emp.id)),
      db
        .select({ id: masterSections.id, name: masterSections.name })
        .from(masterSections)
        .where(eq(masterSections.headEmployeeId, emp.id)),
    ]).catch(() => [[], [], []])

    siteHeadSites = hSites
    deptHeadDepts = hDepts
    sectionHeadSections = hSecs
  }

  // 3. Determine specific role classifications
  const isSuperAdmin = isSuperAdminRole(sessionRole) || isSuperAdminRole(emp?.accessRole)

  const titleLower = (emp?.jobTitle || '').toLowerCase()
  const roleLower = (emp?.role || '').toLowerCase()
  const accessRoleLower = (emp?.accessRole || '').toLowerCase()

  // PJO / Leader Lokasi
  const isPjoTitle =
    titleLower.includes('pjo') ||
    titleLower.includes('project manager') ||
    titleLower.includes('site manager') ||
    titleLower.includes('site head') ||
    titleLower.includes('head site') ||
    titleLower.includes('leader lokasi') ||
    titleLower.includes('lokasi leader') ||
    roleLower.includes('pjo') ||
    accessRoleLower.includes('pjo') ||
    siteHeadSites.length > 0
  const isPjoOrLocationLeader = !isSuperAdmin && isPjoTitle

  // Department Head
  const isDeptHeadTitle =
    titleLower.includes('dept head') ||
    titleLower.includes('head dept') ||
    titleLower.includes('department head') ||
    titleLower.includes('head department') ||
    titleLower.includes('dept. head') ||
    accessRoleLower.includes('dept head') ||
    accessRoleLower.includes('head dept') ||
    deptHeadDepts.length > 0
  const isDeptHead = !isSuperAdmin && isDeptHeadTitle

  // Section Head
  const isSectionHeadTitle =
    titleLower.includes('section head') ||
    titleLower.includes('head section') ||
    titleLower.includes('sec head') ||
    titleLower.includes('supervisor') ||
    titleLower.includes('spv') ||
    accessRoleLower.includes('section head') ||
    accessRoleLower.includes('head section') ||
    sectionHeadSections.length > 0
  const isSectionHead = !isSuperAdmin && isSectionHeadTitle

  const assignedSiteId = siteHeadSites[0]?.id || emp?.siteId || null
  const assignedSiteName = siteHeadSites[0]?.name || emp?.siteName || null
  const assignedDepartment = deptHeadDepts[0]?.name || emp?.deptName || emp?.department || null
  const assignedSection = sectionHeadSections[0]?.name || emp?.sectionName || emp?.section || null

  // 4. Resolve filtering parameters according to role master data rules:
  // Rule 4: untuk PJO / leader Lokasi filter otomatis hanya melihat lokasi nya saja
  let effectiveSiteId = resolvedParams.siteId
  if (isPjoOrLocationLeader && assignedSiteId) {
    // Strictly lock site to user's assigned location
    effectiveSiteId = String(assignedSiteId)
  }

  // Rule 3: untuk Head Departement filter otomatis di Departement tersebut
  let effectiveDept = resolvedParams.dept
  if (isDeptHead && assignedDepartment && !resolvedParams.dept) {
    effectiveDept = assignedDepartment
  }

  // Rule 2: Untuk Section head, filter otomatis di Section nya saja, tapi tetap bisa lihat yang lain
  let effectiveSection = resolvedParams.section
  if (isSectionHead && assignedSection && !resolvedParams.section) {
    effectiveSection = assignedSection
  }

  const searchKeyword = resolvedParams.employeeName || resolvedParams.q

  // 5. Fetch dashboard data with effective siteId
  const data = await getDailyActivityDashboardData({
    siteId: effectiveSiteId,
    date: resolvedParams.date,
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    shift: resolvedParams.shift,
    status: resolvedParams.status,
    search: searchKeyword,
  })

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-5 lg:p-6 bg-[#f5f7fb]">
      <div className="w-full max-w-[1720px] mx-auto">
        <DailyActivityClientDashboard
          initialData={data}
          currentUser={{
            name: emp?.name || session.user.name || 'User HERO',
            email: session.user.email,
            role: emp?.jobTitle || emp?.accessRole || sessionRole || 'PJO / Head Dept',
            isSuperAdmin,
            isPjoOrLocationLeader,
            isDeptHead,
            isSectionHead,
            assignedSiteId,
            assignedSiteName,
            assignedDepartment,
            assignedSection,
          }}
          initialFilters={{
            siteId: effectiveSiteId,
            dept: effectiveDept,
            section: effectiveSection,
          }}
        />
      </div>
    </div>
  )
}
