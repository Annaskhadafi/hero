import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetPayrollOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function SchedulingTimesheetPayrollPage() {
  const [options, permission] = await Promise.all([
    getSchedulingTimesheetPayrollOptions(),
    getCurrentMenuPermission('scheduling_timesheet_payroll'),
  ])

  return (
    <SchedulingTimesheetWorkspace
      mode="payroll"
      employees={options.employees}
      sites={options.sites}
      savedPlans={options.savedPlans}
      fieldBreakPlans={options.fieldBreakPlans}
      attendanceRecords={options.attendanceRecords}
      attendanceOverrides={options.attendanceOverrides}
      approvedSplWindows={options.approvedSplWindows}
      schedulingConfigs={options.schedulingConfigs}
      schedulingStatuses={options.schedulingStatuses}
      currentEmployeeName={options.currentEmployeeName}
      canEdit={permission.canEdit}
      canDelete={permission.canDelete}
    />
  )
}
