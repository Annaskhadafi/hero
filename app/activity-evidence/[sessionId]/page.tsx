import { notFound } from 'next/navigation'
import { getPublicDailyActivityEvidenceData } from '@/lib/daily-activity-documents'
import { ActivityEvidenceViewer } from '@/components/activity-evidence-viewer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const data = await getPublicDailyActivityEvidenceData(Number(sessionId))

  if (!data) {
    return {
      title: 'Evidence Not Found - HERO',
    }
  }

  return {
    title: `Foto Bukti ${data.header.employeeName} (${data.header.sessionCode}) - HERO`,
    description: `Galeri foto bukti aktivitas lapangan ${data.header.employeeName} di ${data.header.siteName}`,
  }
}

export default async function ActivityEvidencePage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const sessionIdNum = Number(sessionId)

  if (Number.isNaN(sessionIdNum)) {
    notFound()
  }

  const data = await getPublicDailyActivityEvidenceData(sessionIdNum)

  if (!data) {
    notFound()
  }

  return <ActivityEvidenceViewer data={data} />
}
