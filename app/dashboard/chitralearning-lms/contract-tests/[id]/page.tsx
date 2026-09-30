import { notFound, redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getContractReviewTestConfigById } from '@/app/actions/contract-review-tests'
import { QuestionEditorClient } from './question-editor-client'

export const metadata = {
  title: 'Bank Soal Ujian | ChitraLearning LMS',
}

export default async function ContractTestDetailConfigPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin, canManageLmsSection } = await import('@/lib/chitralearning-lms')
  const isAdmin = (await isLmsAdmin(session)) || (await canManageLmsSection())
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms')
  }

  const resolvedParams = await params
  const configId = Number(resolvedParams.id)
  if (isNaN(configId)) {
    notFound()
  }

  const config = await getContractReviewTestConfigById(configId)
  if (!config) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <QuestionEditorClient config={config} />
    </div>
  )
}
