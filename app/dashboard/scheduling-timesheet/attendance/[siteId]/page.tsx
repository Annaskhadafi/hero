import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { getSchedulingTimesheetAttendanceOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission, getPermittedSchedulingTabs } from '@/lib/hero-access'

const SchedulingTimesheetWorkspace = dynamic(
  () =>
    import('@/components/scheduling-timesheet-workspace').then(
      (m) => m.SchedulingTimesheetWorkspace
    ),
  {
    loading: () => (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-[520px] w-full rounded-lg" />
      </div>
    ),
  }
)

export default async function SchedulingTimesheetAttendanceSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>
  searchParams?: Promise<{ period?: string }>
}) {
  const permission = await getCurrentMenuPermission('scheduling_timesheet_attendance')

  if (!permission.canView) {
    const permittedTabs = await getPermittedSchedulingTabs()
    const fallback = permittedTabs[0]?.href ?? '/dashboard'
    redirect(fallback)
  }

  const { siteId: rawSiteParam } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const period = resolvedSearchParams?.period

  const options = await getSchedulingTimesheetAttendanceOptions()

  // Match site by numeric ID, exact name, or normalized slug (e.g. ck-mhu -> CK MHU)
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
  const matchedSite = options.sites.find((item) => {
    if (String(item.id) === rawSiteParam) return true
    if (item.name.toLowerCase() === rawSiteParam.toLowerCase()) return true
    if (normalize(item.name) === normalize(rawSiteParam)) return true
    return false
  })

  const resolvedSiteId = matchedSite ? String(matchedSite.id) : (/^\d+$/.test(rawSiteParam) ? rawSiteParam : null)

  if (!resolvedSiteId) {
    redirect('/dashboard/scheduling-timesheet/attendance')
  }

  return (
    <SchedulingTimesheetWorkspace
      mode="attendance"
      initialSiteId={resolvedSiteId}
      initialPeriod={period}
      initialAttendanceWorkspaceOpen={true}
      employees={options.employees}
      sites={options.sites}
      savedPlans={options.savedPlans}
      fieldBreakPlans={options.fieldBreakPlans}
      attendanceRecords={options.attendanceRecords}
      attendanceOverrides={options.attendanceOverrides}
      approvedSplWindows={options.approvedSplWindows}
      schedulingConfigs={options.schedulingConfigs}
      schedulingStatuses={options.schedulingStatuses}
      importPreviews={options.importPreviews}
      activities={options.activities}
      currentEmployeeSiteId={options.currentEmployeeSiteId}
      currentEmployeeName={options.currentEmployeeName}
      canEdit={permission.canEdit}
      canDelete={permission.canDelete}
    />
  )
}
