import Link from 'next/link'
import { AdminPageShell } from '@/components/admin-page-shell'
import { FileText } from 'lucide-react'
import { getAttendancePermissionDashboardData } from '@/lib/attendance-permission-dashboard'
import { IzinDashboardTabs } from '@/components/izin-dashboard/izin-dashboard-tabs'

export default async function HcPermissionDashboardPage(props: {
  searchParams?: Promise<{ dateFrom?: string; dateTo?: string; siteId?: string }>
}) {
  const params = await props.searchParams
  const data = await getAttendancePermissionDashboardData({
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    siteId: params?.siteId,
  })

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
      <IzinDashboardTabs data={data} />
    </AdminPageShell>
  )
}
