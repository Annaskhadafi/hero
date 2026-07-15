import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetSetupOptions } from '@/lib/hero-admin'

export default async function SchedulingTimesheetSetupPage() {
  const options = await getSchedulingTimesheetSetupOptions()

  return (
    <SchedulingTimesheetWorkspace
      mode="setup"
      employees={options.employees}
      sites={options.sites}
      schedulingConfigs={options.schedulingConfigs}
      schedulingStatuses={options.schedulingStatuses}
      currentEmployeeName={options.currentEmployeeName}
    />
  )
}
