import { AdminPageShell } from '@/components/admin-page-shell'
import { ServiceFormWorkspace } from '@/components/service-forms/service-form-workspace'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export default async function ServiceFormPage() {
  const permission = await getCurrentMenuPermission('service360_service_form')
  if (!permission.canView) redirect('/dashboard')

  return (
    <AdminPageShell title="Service Form">
      <ServiceFormWorkspace />
    </AdminPageShell>
  )
}
