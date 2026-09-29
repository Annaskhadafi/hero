import { notFound } from 'next/navigation'
import { getPublicOvertimeEvidenceData } from '@/lib/overtime-evidence-data'
import { OvertimeEvidenceViewer } from '@/components/overtime-evidence-viewer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const decoded = decodeURIComponent(id)
  const data = await getPublicOvertimeEvidenceData(decoded)

  if (!data) {
    return {
      title: 'Dokumen SPL Tidak Ditemukan - HERO',
    }
  }

  return {
    title: `Foto Bukti SPL ${data.header.splNumber} - ${data.header.requesterName} - HERO`,
    description: `Galeri foto bukti dan verifikasi dokumen Surat Perintah Lembur #${data.header.splNumber} (${data.header.title}) di site ${data.header.siteName}.`,
  }
}

export default async function SplEvidenceAliasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const decoded = decodeURIComponent(id)
  const data = await getPublicOvertimeEvidenceData(decoded)

  if (!data) {
    notFound()
  }

  return <OvertimeEvidenceViewer data={data} />
}
