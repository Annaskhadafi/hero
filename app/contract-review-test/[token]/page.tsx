import { notFound } from 'next/navigation'
import { getContractReviewTestAttemptByToken } from '@/app/actions/contract-review-tests'
import { TestPlayerClient } from './test-player-client'

export const metadata = {
  title: 'Ujian Online Contract Review | HERO',
}

export default async function ContractReviewTestTakerPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const resolvedParams = await params
  const token = resolvedParams.token

  if (!token) {
    notFound()
  }

  const data = await getContractReviewTestAttemptByToken(token)
  if (!data) {
    notFound()
  }

  return <TestPlayerClient initialData={data} accessToken={token} />
}
