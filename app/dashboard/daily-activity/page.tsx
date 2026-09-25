import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq, or, sql } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth-session'
import { canAccessDailyActivityMonitoring } from '@/lib/hero-access'
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
  const searchKeyword = resolvedParams.employeeName || resolvedParams.q

  const userConds = []
  if (session.user.id) {
    userConds.push(eq(employees.authUserId, session.user.id))
  }
  if (session.user.email) {
    userConds.push(sql`lower(${employees.email}) = lower(${session.user.email})`)
  }

  const [data, empRows] = await Promise.all([
    getDailyActivityDashboardData({
      siteId: resolvedParams.siteId,
      date: resolvedParams.date,
      startDate: resolvedParams.startDate,
      endDate: resolvedParams.endDate,
      shift: resolvedParams.shift,
      status: resolvedParams.status,
      search: searchKeyword,
    }),
    userConds.length > 0
      ? db
          .select({
            name: employees.name,
            jobTitle: employees.jobTitle,
            accessRole: employees.accessRole,
          })
          .from(employees)
          .where(userConds.length > 1 ? or(...userConds) : userConds[0])
          .limit(1)
          .catch((err) => {
            console.error('[daily-activity:page:employee] query error:', err)
            return []
          })
      : Promise.resolve([]),
  ])
  const emp = empRows[0]

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-4 sm:p-5 lg:p-6 bg-[#f5f7fb]">
      <div className="w-full max-w-[1720px] mx-auto">
        <DailyActivityClientDashboard
          initialData={data}
          currentUser={{
            name: emp?.name || session.user.name || 'User HERO',
            email: session.user.email,
            role: emp?.jobTitle || emp?.accessRole || sessionRole || 'PJO / Head Dept',
          }}
        />
      </div>
    </div>
  )
}
