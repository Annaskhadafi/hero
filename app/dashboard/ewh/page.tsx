import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getEwhSummaryAction, getEwhTeamsAction, getEwhEmployeesAction } from './actions'
import { EwhDashboardClient } from './ewh-dashboard-client'

interface PageProps {
  searchParams: Promise<{ siteId?: string; period?: string }>
}

export const metadata = {
  title: 'EWH Dashboard — Effective Working Hours',
  description:
    'Monitor jam kerja efektif seluruh karyawan per site per periode. Terhubung dengan Attendance Real dan Daily Activity.',
}

export default async function EwhDashboardPage({ searchParams }: PageProps) {
  const employee = await getCurrentEmployee()
  if (!employee) redirect('/login')

  const params = await searchParams
  const siteId = params.siteId ? parseInt(params.siteId, 10) : employee.siteId
  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const period = params.period ?? defaultPeriod

  const [result, teamsRes, employeesRes] = await Promise.all([
    getEwhSummaryAction(siteId, period),
    getEwhTeamsAction(siteId),
    getEwhEmployeesAction(siteId),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          EWH — Effective Working Hours
        </h1>
        <p className="text-sm text-muted-foreground">
          Jam kerja efektif karyawan berbasis 24 jam. Terintegrasi dengan Attendance Real, Daily
          Activity, dan SPL/Overtime.
        </p>
      </div>

      <Suspense fallback={<div className="text-muted-foreground text-sm">Memuat data EWH…</div>}>
        <EwhDashboardClient
          rows={result.rows}
          siteId={siteId}
          period={period}
          employeeSiteId={employee.siteId}
          teams={teamsRes.teams || []}
          allEmployees={employeesRes.employees || []}
        />
      </Suspense>
    </div>
  )
}
