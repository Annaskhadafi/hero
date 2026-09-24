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
    shift?: string
    dept?: string
    status?: string
    q?: string
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

  const [data, [emp]] = await Promise.all([
    getDailyActivityDashboardData({
      siteId: resolvedParams.siteId,
      date: resolvedParams.date,
      shift: resolvedParams.shift,
      status: resolvedParams.status,
      search: resolvedParams.q,
    }),
    db
      .select({
        name: employees.name,
        jobTitle: employees.jobTitle,
        accessRole: employees.accessRole,
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
      .limit(1),
  ])

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
