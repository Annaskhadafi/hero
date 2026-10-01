import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { getDailyActivityDashboardData } from '@/lib/daily-activity-dashboard'
import { MaestroClientActivityDashboard } from './client-activity'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Daily Activity & Manpower',
  description:
    'Monitoring log pekerjaan harian, timesheet teknisi, dan progress servis di site - PT Chitra Paratama.',
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
    activityType?: string
    q?: string
    search?: string
    employeeName?: string
  }>
}

export default async function MaestroDailyActivityPage({ searchParams }: PageProps) {
  const session = await getMaestroServerSession()
  if (!session) {
    redirect('/login')
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const authorizedSiteIds = session.access.siteIds || []

  if (authorizedSiteIds.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Akses Site Belum Dikonfigurasi</h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Akun customer Anda ({session.customer.name}) belum memiliki penugasan site aktif. Hubungi PIC
            Chitra Paratama untuk menambahkan akses site operasional Anda.
          </p>
        </div>
      </div>
    )
  }

  // 1. Fetch details of customer's authorized sites
  const authorizedSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      location: sites.location,
    })
    .from(sites)
    .where(and(eq(sites.isActive, true), inArray(sites.id, authorizedSiteIds)))
    .orderBy(sites.name)

  // 2. Resolve effective site ID (strictly scoped to authorized sites)
  let effectiveSiteId = authorizedSites[0]?.id || authorizedSiteIds[0]
  const requestedSiteId = resolvedParams.siteId
  if (requestedSiteId && requestedSiteId !== 'all' && requestedSiteId !== '0') {
    const candidateSiteId = Number(requestedSiteId)
    if (authorizedSiteIds.includes(candidateSiteId)) {
      effectiveSiteId = candidateSiteId
    }
  }

  // 3. Fetch daily activity data scoped strictly to customer authorizedSiteIds
  const searchKeyword = resolvedParams.employeeName || resolvedParams.q || resolvedParams.search
  const data = await getDailyActivityDashboardData({
    siteId: requestedSiteId === 'all' || requestedSiteId === '0' ? 'all' : String(effectiveSiteId),
    authorizedSiteIds,
    date: resolvedParams.date,
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    shift: resolvedParams.shift,
    departmentId: resolvedParams.dept,
    status: resolvedParams.status,
    search: searchKeyword,
    employeeName: resolvedParams.employeeName,
  })

  return (
    <div className="min-h-screen py-3 sm:py-4 px-3 sm:px-5 lg:px-6">
      <div className="mx-auto w-full max-w-[1720px]">
        <MaestroClientActivityDashboard
          initialData={data}
          customerInfo={session.customer}
          userInfo={session.user}
          authorizedSites={authorizedSites}
          currentSiteId={effectiveSiteId}
          initialFilters={{
            siteId: String(effectiveSiteId),
            startDate: resolvedParams.startDate || resolvedParams.date,
            endDate: resolvedParams.endDate || resolvedParams.date,
            shift: resolvedParams.shift,
            dept: resolvedParams.dept,
            section: resolvedParams.section,
            status: resolvedParams.status,
            activityType: resolvedParams.activityType,
            search: searchKeyword,
          }}
        />
      </div>
    </div>
  )
}
