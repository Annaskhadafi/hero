import { redirect } from 'next/navigation'
import { ScheduleV2Workspace } from '@/components/scheduling-timesheet/schedule-v2-workspace'
import { getSchedulingTimesheetScheduleV2Options } from '@/lib/hero-admin'
import { getPermittedSchedulingTabs } from '@/lib/hero-access'

export default async function SchedulingTimesheetScheduleV2Page() {
  const options = await getSchedulingTimesheetScheduleV2Options()

  if (!options.access.canView) {
    const permittedTabs = await getPermittedSchedulingTabs()
    const fallback = permittedTabs[0]?.href ?? '/dashboard'
    redirect(fallback)
  }

  return (
    <ScheduleV2Workspace
      employees={options.employees}
      sites={options.sites}
      initialPlans={options.savedPlansV2}
      currentEmployeeName={options.currentEmployeeName}
      access={options.access}
      configs={options.schedulingConfigs}
      fieldBreakPlans={options.fieldBreakPlans}
    />
  )
}
