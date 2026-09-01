import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PrintFiveRReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/print/five-r/${id}`)
}

