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
  title: 'Daily Activity & Manpower | MAESTRO™ Customer Portal',
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
    status?: string
    q?: string
    search?: string
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
  if (resolvedParams.siteId) {
    const candidateSiteId = Number(resolvedParams.siteId)
    if (authorizedSiteIds.includes(candidateSiteId)) {
      effectiveSiteId = candidateSiteId
    }
  }

  // 3. Fetch daily activity data scoped strictly to effectiveSiteId
  const searchKeyword = resolvedParams.q || resolvedParams.search
  const data = await getDailyActivityDashboardData({
    siteId: String(effectiveSiteId),
    date: resolvedParams.date,
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    shift: resolvedParams.shift,
    status: resolvedParams.status,
    search: searchKeyword,
  })

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <MaestroClientActivityDashboard
          initialData={data}
          customerInfo={session.customer}
          authorizedSites={authorizedSites}
          currentSiteId={effectiveSiteId}
          currentDate={resolvedParams.date}
        />
      </div>
    </div>
  )
}
