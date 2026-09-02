import { redirect } from 'next/navigation'
import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetFieldBreakOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission, getPermittedSchedulingTabs } from '@/lib/hero-access'

export default async function SchedulingTimesheetFieldBreakPage() {
  const [options, permission] = await Promise.all([
    getSchedulingTimesheetFieldBreakOptions(),
    getCurrentMenuPermission('scheduling_timesheet_field_break'),
  ])

  if (!permission.canView) {
    const permittedTabs = await getPermittedSchedulingTabs()
    const fallback = permittedTabs[0]?.href ?? '/dashboard'
    redirect(fallback)
  }

  return (
    <SchedulingTimesheetWorkspace
      mode="field-break"
      employees={options.employees}
      sites={options.sites}
      savedPlans={options.fieldBreakRosterPlans}
      fieldBreakPlans={options.fieldBreakPlans}
      schedulingConfigs={options.schedulingConfigs}
      schedulingStatuses={options.schedulingStatuses}
      currentEmployeeName={options.currentEmployeeName}
      canEdit={permission.canEdit}
      canDelete={permission.canDelete}
    />
  )
}
