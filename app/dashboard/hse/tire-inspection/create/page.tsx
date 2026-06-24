import { AdminPageShell } from '@/components/admin-page-shell'
import { TireInspectionCreateClient } from './client-page'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export default async function TireInspectionCreatePage() {
  const access = await getCurrentMenuPermission("hse_tire_inspection")
  if (!access.canEdit) {
    redirect("/dashboard/hse/tire-inspection")
  }

  return (
    <AdminPageShell
      eyebrow="HSE • Tire Inspection"
      title="Inspeksi Baru"
      description="Buat laporan inspeksi site baru dan unggah foto lapangan."
    >
      <TireInspectionCreateClient />
    </AdminPageShell>
  )
}
