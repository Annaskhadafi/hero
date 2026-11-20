import { notFound } from 'next/navigation'
import { getRfrPublicApprovalByToken } from '@/app/actions/rfr'
import { RfrPublicApproval } from './public-approval'
import { getServerSession } from '@/lib/auth-session'

export const revalidate = 0

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function RfrPublicApprovalPage({ params }: PageProps) {
  const { token } = await params
  const data = await getRfrPublicApprovalByToken(token)

  if (!data) {
    notFound()
  }

  const session = await getServerSession()
  const currentUser = session?.user
    ? {
        name: session.user.name || '',
        email: session.user.email || '',
        role: (session.user as any)?.role || '',
        employeeId: (session.user as any)?.employeeId || null,
      }
    : null

  return (
    <RfrPublicApproval
      token={token}
      approval={data.approval}
      rfr={data.rfr}
      approvals={data.approvals}
      currentUser={currentUser}
    />
  )
}
