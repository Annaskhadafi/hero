import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { getContractReviewTestConfigs } from '@/app/actions/contract-review-tests'
import { ContractTestsClient } from './contract-tests-client'

export const metadata = {
  title: 'Contract Review Tests | ChitraLearning LMS',
}

export default async function ContractTestsPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin, canManageLmsSection } = await import('@/lib/chitralearning-lms')
  const isAdmin = (await isLmsAdmin(session)) || (await canManageLmsSection())
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms')
  }

  const data = await getContractReviewTestConfigs()

  return (
    <div className="space-y-6">
      <ContractTestsClient initialConfigs={data.configs} sections={data.sections} />
    </div>
  )
}
