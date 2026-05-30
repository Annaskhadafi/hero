import { AdminPageShell } from "@/components/admin-page-shell"
import { SafetyDataManagement } from "@/components/safety-dashboard/safety-data-management"
import { getSafetyDashboardData } from "@/lib/safety-dashboard/queries"

export default async function SafetyDataPage() {
  const data = await getSafetyDashboardData()

  return (
    <AdminPageShell
      eyebrow="Safety Data"
      title="Safety Data Management"
      description="Form, import, table, filter, export, dan CRUD semua dataset Safety Dashboard."
    >
      <SafetyDataManagement data={data} />
    </AdminPageShell>
  )
}
