import { getOvertimeApprovalByToken } from '@/app/dashboard/overtime-requests/actions'
import { OvertimePublicApproval } from './public-approval'

export const revalidate = 0

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function OvertimePublicPage({ params }: PageProps) {
  const { token } = await params
  const result = await getOvertimeApprovalByToken(token)

  if (!result.success || !result.data) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h1 className="text-xl font-semibold text-slate-900">Approval tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">
            {result.error || 'Link tidak valid atau approval sudah tidak tersedia.'}
          </p>
        </div>
      </main>
    )
  }

  const { approval, ...restData } = result.data

  return (
    <OvertimePublicApproval
      token={token}
      approval={JSON.parse(JSON.stringify(approval))}
      data={JSON.parse(JSON.stringify(restData))}
    />
  )
}
