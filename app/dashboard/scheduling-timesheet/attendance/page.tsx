import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetAttendanceOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function SchedulingTimesheetAttendancePage() {
  const [options, permission] = await Promise.all([
    getSchedulingTimesheetAttendanceOptions(),
    getCurrentMenuPermission('scheduling_timesheet_attendance'),
  ])

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
