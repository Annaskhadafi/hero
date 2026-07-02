import { AdminPageShell } from '@/components/admin-page-shell'
import { ServiceFormWorkspace } from '@/components/service-forms/service-form-workspace'

export default function ServiceFormPage() {
  return (
    <AdminPageShell title="Service Form">
      <ServiceFormWorkspace />
    </AdminPageShell>
  )
}
