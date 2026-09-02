import { redirect } from 'next/navigation'
import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetAttendanceOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission, getPermittedSchedulingTabs } from '@/lib/hero-access'

export default async function SchedulingTimesheetAttendancePage() {
  const [options, permission] = await Promise.all([
    getSchedulingTimesheetAttendanceOptions(),
    getCurrentMenuPermission('scheduling_timesheet_attendance'),
  ])

  if (!permission.canView) {
    const permittedTabs = await getPermittedSchedulingTabs()
    const fallback = permittedTabs[0]?.href ?? '/dashboard'
    redirect(fallback)
  }

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
