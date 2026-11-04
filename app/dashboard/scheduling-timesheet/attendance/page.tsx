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

export default async function SchedulingTimesheetAttendancePage() {
  const permission = await getCurrentMenuPermission('scheduling_timesheet_attendance')

  if (!permission.canView) {
    const permittedTabs = await getPermittedSchedulingTabs()
    const fallback = permittedTabs[0]?.href ?? '/dashboard'
    redirect(fallback)
  }

  const options = await getSchedulingTimesheetAttendanceOptions()

  return (
    <SchedulingTimesheetWorkspace
      mode="attendance"
      employees={options.employees}
      sites={options.sites}
      savedPlans={options.savedPlans}
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
