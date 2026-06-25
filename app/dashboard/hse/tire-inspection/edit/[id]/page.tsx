import { AdminPageShell } from '@/components/admin-page-shell'
import { TireInspectionEditClient } from './client-page'
import { getInspectionDetail } from '../../actions'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { notFound, redirect } from 'next/navigation'

export default async function TireInspectionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const [detail, access] = await Promise.all([
    getInspectionDetail(resolvedParams.id),
    getCurrentMenuPermission("hse_tire_inspection")
  ])

  if (!detail) {
    return notFound()
  }

  if (!access.canEdit) {
    redirect(`/dashboard/hse/tire-inspection/detail/${resolvedParams.id}`)
  }

  return (
    <AdminPageShell
      eyebrow="HSE • Tire Inspection"
      title="Edit Data Inspeksi"
      description="Edit informasi dan data laporan inspeksi."
    >
      <TireInspectionEditClient detail={detail} />
    </AdminPageShell>
  )
}
