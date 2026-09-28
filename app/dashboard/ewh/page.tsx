import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import {
  getEwhSummaryAction,
  getEwhTeamsAction,
  getEwhEmployeesAction,
  getEwhSiteMonthlyMatrixAction,
} from './actions'
import { EwhDashboardClient } from './ewh-dashboard-client'

interface PageProps {
  searchParams: Promise<{ siteId?: string; period?: string; powerman?: string; tab?: string }>
}

export const metadata = {
  title: 'EWH Dashboard — Effective Working Hours | HERO',
  description:
    'Monitor jam kerja efektif dan utilitas aktivitas operasional per site. Terintegrasi dengan Attendance Real, Daily Activity, dan Standar 2-Shift (22 Jam/Hari).',
}

export default async function EwhDashboardPage({ searchParams }: PageProps) {
  const employee = await getCurrentEmployee()
  if (!employee) redirect('/sign-in')

  const params = await searchParams
  const siteId = params.siteId ? parseInt(params.siteId, 10) : employee.siteId
  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const period = params.period ?? defaultPeriod
  const overridePowerman = params.powerman ? parseInt(params.powerman, 10) : undefined

  const [matrixRes, summaryRes, teamsRes, employeesRes] = await Promise.all([
    getEwhSiteMonthlyMatrixAction(siteId, period, overridePowerman),
    getEwhSummaryAction(siteId || 1, period),
    getEwhTeamsAction(siteId || 1),
    getEwhEmployeesAction(siteId || 1),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 bg-slate-50/50 min-h-screen">
      <Suspense fallback={<div className="text-muted-foreground text-sm p-8 text-center">Memuat data EWH & Utilitas…</div>}>
        <EwhDashboardClient
          monthlyMatrixData={matrixRes}
          rows={summaryRes.rows}
          siteId={matrixRes.siteId}
          period={period}
          employeeSiteId={employee.siteId || 1}
          teams={teamsRes.teams || []}
          allEmployees={employeesRes.employees || []}
          allSites={matrixRes.allSites || []}
          initialPowerman={matrixRes.powerman}
          initialTab={params.tab}
        />
      </Suspense>
    </div>
  )
}
