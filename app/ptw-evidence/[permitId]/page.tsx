import { notFound } from 'next/navigation'
import { getPtwApprovalData } from '@/app/dashboard/hse/izin-kerja-ptw/actions'
import { PtwEvidenceViewer } from '@/components/ptw-evidence-viewer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({
  params,
}: {
  params: Promise<{ permitId: string }>
}) {
  const { permitId } = await params
  const decoded = decodeURIComponent(permitId)
  const data = await getPtwApprovalData(decoded)

  if (!data) {
    return {
      title: 'Dokumen Lampiran Tidak Ditemukan - HERO',
    }
  }

  return {
    title: `Lampiran PTW ${data.permitNumber} - ${data.projectName || 'Izin Kerja Aman'} - HERO`,
    description: `Dokumen pendukung & bukti lampiran izin kerja aman #${data.permitNumber} (${data.projectName}) di lokasi ${data.location}.`,
  }
}

export default async function PtwEvidencePage({
  params,
}: {
  params: Promise<{ permitId: string }>
}) {
  const { permitId } = await params
  const decoded = decodeURIComponent(permitId)

  const data = await getPtwApprovalData(decoded)

  if (!data) {
    notFound()
  }

  return <PtwEvidenceViewer data={JSON.parse(JSON.stringify(data))} />
}
