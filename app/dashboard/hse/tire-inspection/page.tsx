import { AdminPageShell } from '@/components/admin-page-shell'
import { TireInspectionClient } from './client-page'
import { getInspectionList } from './actions'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function TireInspectionPage() {
  const [inspections, access] = await Promise.all([
    getInspectionList(),
    getCurrentMenuPermission("hse_tire_inspection"),
  ])

  return (
    <AdminPageShell
      eyebrow="HSE • Tire Inspection"
      title="Tire Site Inspection"
      description="Manajemen inspeksi site tambang dan otomatisasi laporan dengan AI."
    >
      <TireInspectionClient data={inspections} access={access} />
    </AdminPageShell>
  )
}
