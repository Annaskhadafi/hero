import { AdminPageShell } from '@/components/admin-page-shell'
import { TireInspectionClient } from './client-page'
import { getInspectionList } from './actions'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function TireInspectionPage() {
  const access = await getCurrentMenuPermission("hse_tire_inspection")
  const inspections = access.canView ? await getInspectionList() : []

  return (
    <AdminPageShell
      eyebrow="HSE • Tire Inspection"
      title="Tire Site Inspection"
      description="Manajemen inspeksi site tambang dan otomatisasi laporan dengan AI."
    >
      {access.canView ? (
        <TireInspectionClient data={inspections} access={access} />
      ) : (
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-5 text-sm font-semibold text-orange-700">
          Akses Tire Site Inspection belum aktif untuk role Anda. Hubungi admin untuk mengaktifkan permission hse_tire_inspection.
        </div>
      )}
    </AdminPageShell>
  )
}
