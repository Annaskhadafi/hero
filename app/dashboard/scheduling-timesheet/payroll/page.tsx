import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetPayrollOptions } from '@/lib/hero-admin'

export default async function SchedulingTimesheetPayrollPage() {
  const options = await getSchedulingTimesheetPayrollOptions()

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
    />
  )
}
