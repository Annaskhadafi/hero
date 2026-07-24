import { notFound } from 'next/navigation'
import { getRfrPublicApprovalByToken } from '@/app/actions/rfr'
import { RfrPublicApproval } from './public-approval'

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

  return (
    <RfrPublicApproval
      token={token}
      approval={data.approval}
      rfr={data.rfr}
      approvals={data.approvals}
    />
  )
}
