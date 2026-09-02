import { redirect } from 'next/navigation'
import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetSetupOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission, getPermittedSchedulingTabs } from '@/lib/hero-access'

export default async function SchedulingTimesheetSetupPage() {
  const [options, permission] = await Promise.all([
    getSchedulingTimesheetSetupOptions(),
    getCurrentMenuPermission('scheduling_timesheet_setup'),
  ])

  if (!permission.canView) {
    const permittedTabs = await getPermittedSchedulingTabs()
    const fallback = permittedTabs[0]?.href ?? '/dashboard'
    redirect(fallback)
  }

  return (
    <SchedulingTimesheetWorkspace
      mode="setup"
      employees={options.employees}
      approvalEmployees={options.approvalEmployees}
      sites={options.sites}
      schedulingConfigs={options.schedulingConfigs}
      schedulingStatuses={options.schedulingStatuses}
      approvalSections={options.approvalSections}
      currentEmployeeName={options.currentEmployeeName}
      canEdit={permission.canEdit}
      canDelete={permission.canDelete}
    />
  )
}
