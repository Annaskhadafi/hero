import { getSchedulingTimesheetOverviewOptions } from '@/lib/hero-admin'
import { SchedulingOverviewDashboard } from '@/components/scheduling-timesheet/overview-dashboard'

export default async function SchedulingTimesheetPage() {
  const options = await getSchedulingTimesheetOverviewOptions()

  return (
    <SchedulingOverviewDashboard
      employees={options.employees}
      sites={options.sites}
      schedulingConfigs={options.schedulingConfigs}
      schedulingStatuses={options.schedulingStatuses}
    />
  )
}
