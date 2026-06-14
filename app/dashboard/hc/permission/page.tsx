import Link from 'next/link'
import { AdminPageShell } from '@/components/admin-page-shell'
import { FileText } from 'lucide-react'
import { getAttendancePermissionDashboardData, type IzinDashboardKpis, type IzinDashboardCharts, type AttendancePermissionRow } from '@/lib/attendance-permission-dashboard'
import { IzinDashboardTabs } from '@/components/izin-dashboard/izin-dashboard-tabs'

const emptyKpis: IzinDashboardKpis = { total: 0, sick: 0, late: 0, departments: 0, pending: 0, approved: 0, rejected: 0, thisMonth: 0 }
const emptyCharts: IzinDashboardCharts = { sickByCategory: [], lateByReason: [], frequentLateEmployees: [], frequentSickEmployees: [], byDepartment: [], sickByDay: [], monthlyTrend: [], siteDistribution: [], byLocation: [] }

export default async function HcPermissionDashboardPage(props: {
  searchParams?: Promise<{ dateFrom?: string; dateTo?: string; siteId?: string }>
}) {
  const params = await props.searchParams

  let rows: AttendancePermissionRow[] = []
  let kpis = emptyKpis
  let charts = emptyCharts
  let sites: { id: number; name: string }[] = []

  try {
    const result = await getAttendancePermissionDashboardData({
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      siteId: params?.siteId,
    })
    rows = result.rows
    kpis = result.kpis
    charts = result.charts
    sites = result.sites
  } catch (error) {
    console.error('[izin-dashboard] Failed to load data:', error)
  }

  return (
    <AdminPageShell
      eyebrow="HC"
      title="Dashboard Izin"
      description="Monitoring izin sakit, terlambat, dan approval attendance."
      actions={
        <Link
          href="/dashboard/scheduling-timesheet/permission"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <FileText className="size-4" />
          Form Izin
        </Link>
      }
    >
      <IzinDashboardTabs data={{ rows, kpis, charts, sites }} />
    </AdminPageShell>
  )
}
