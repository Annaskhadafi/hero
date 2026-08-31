import { getDailyActivityApprovalByToken } from '@/app/dashboard/activity-hub/actions'
import { DailyActivityPublicApproval } from './public-approval'

export const revalidate = 0

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function DailyActivityPublicPage({ params }: PageProps) {
  const { token } = await params

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <h1 className="text-xl font-semibold text-slate-900">Approval tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">
            Link tidak valid atau token approval tidak tersedia.
          </p>
        </div>
      </main>
    )
  }

  const result = await getDailyActivityApprovalByToken(token)

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

  const data = JSON.parse(JSON.stringify(result.data))

  return (
    <DailyActivityPublicApproval
      token={token}
      approval={data.approval}
      session={data.session}
      employee={data.employee}
      site={data.site}
      sessionItems={data.sessionItems}
      allApprovals={data.allApprovals}
      totals={data.totals}
      registeredSignature={data.registeredSignature}
    />
  )
}

