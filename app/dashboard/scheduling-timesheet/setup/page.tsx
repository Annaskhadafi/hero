import { SchedulingTimesheetWorkspace } from '@/components/scheduling-timesheet-workspace'
import { getSchedulingTimesheetSetupOptions } from '@/lib/hero-admin'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function SchedulingTimesheetSetupPage() {
  const [options, permission] = await Promise.all([
    getSchedulingTimesheetSetupOptions(),
    getCurrentMenuPermission('scheduling_timesheet_setup'),
  ])

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
