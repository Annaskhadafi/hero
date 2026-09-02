import { redirect } from 'next/navigation'
import { getSchedulingTimesheetOverviewOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission, getPermittedSchedulingTabs } from '@/lib/hero-access'
import { SchedulingOverviewDashboard } from '@/components/scheduling-timesheet/overview-dashboard'

export default async function SchedulingTimesheetPage() {
  const permission = await getCurrentMenuPermission('scheduling_timesheet')

  if (!permission.canView) {
    const permittedTabs = await getPermittedSchedulingTabs()
    const alternate = permittedTabs.find((t) => t.href !== '/dashboard/scheduling-timesheet')
    if (alternate) {
      redirect(alternate.href)
    } else {
      redirect('/dashboard')
    }
  }

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
