import { listRfrRequests } from '@/app/actions/rfr'
import { RfrClientPage } from './client-page'

export const revalidate = 0

type PageProps = {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

export default async function RfrDashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const result = await listRfrRequests({
    search: params.search,
    status: params.status,
    page,
    limit: 20,
  })

  return (
    <RfrClientPage
      initialData={result.data as any}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
    />
  )
}
