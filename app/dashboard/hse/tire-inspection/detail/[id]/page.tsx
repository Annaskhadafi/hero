import { AdminPageShell } from '@/components/admin-page-shell'
import { TireInspectionDetailClient } from './client-page'
import { getInspectionDetail } from '../../actions'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { format } from 'date-fns'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params
  const detail = await getInspectionDetail(resolvedParams.id)
  
  if (!detail) {
    return { title: 'Not Found' }
  }

  const { customerName, inspectionDate } = detail.inspection
  const dateStr = inspectionDate ? format(new Date(inspectionDate), "dd MMM yyyy") : ""
  
  return {
    title: `Tire Inspection - ${customerName || 'Unknown'} - ${dateStr}`
  }
}

export default async function TireInspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const [detail, access] = await Promise.all([
    getInspectionDetail(resolvedParams.id),
    getCurrentMenuPermission("hse_tire_inspection")
  ])

  if (!detail) {
    return notFound()
  }

  return (
    <AdminPageShell
      eyebrow="HSE • Tire Inspection"
      title="Detail Inspeksi"
      description={`Laporan Inspeksi untuk ${detail.inspection.siteName}`}
    >
      <TireInspectionDetailClient detail={detail} access={access} />
    </AdminPageShell>
  )
}
