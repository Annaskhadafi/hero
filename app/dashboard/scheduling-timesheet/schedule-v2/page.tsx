import { ScheduleV2Workspace } from '@/components/scheduling-timesheet/schedule-v2-workspace'
import { getSchedulingTimesheetScheduleV2Options } from '@/lib/hero-admin'

export default async function SchedulingTimesheetScheduleV2Page() {
  const options = await getSchedulingTimesheetScheduleV2Options()
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
