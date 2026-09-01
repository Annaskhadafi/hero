import { notFound } from 'next/navigation'
import { getFiveRReportDetailAction } from '@/app/dashboard/quality/5r/actions'
import { FiveRPdfPreview } from '@/components/five-r/five-r-pdf-preview'

export const dynamic = 'force-dynamic'

export default async function PrintFiveRStandalonePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await getFiveRReportDetailAction(Number(id))

  if (!res.success || !res.report) {
    notFound()
  }

  return <FiveRPdfPreview data={res} />
}
