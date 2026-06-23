import { redirect } from 'next/navigation'
import { AdminPageShell } from '@/components/admin-page-shell'
import { SmartSiteConditionWorkspace } from '@/components/smart-site-condition/smart-site-condition-workspace'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getSmartSiteConditionDashboardData } from '@/lib/smart-site-condition'

export default async function SmartSiteConditionPage() {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect('/sign-in')
  }

  const dashboardData = await getSmartSiteConditionDashboardData(employee.id)

  return (
    <AdminPageShell title="Smart Site Condition">
      <SmartSiteConditionWorkspace
        stats={dashboardData.stats}
        visits={dashboardData.visits}
        reports={dashboardData.reports}
        templates={dashboardData.templates}
      />
    </AdminPageShell>
  )
}
