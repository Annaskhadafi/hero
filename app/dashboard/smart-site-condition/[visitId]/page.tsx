import { notFound, redirect } from 'next/navigation'
import { AdminPageShell } from '@/components/admin-page-shell'
import { SmartSiteConditionDetail } from '@/components/smart-site-condition/smart-site-condition-detail'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getSmartSiteConditionVisitDetail } from '@/lib/smart-site-condition'

export default async function SmartSiteConditionVisitDetailPage({
  params,
}: {
  params: Promise<{ visitId: string }>
}) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect('/sign-in')
  }

  const { visitId } = await params
  const detail = await getSmartSiteConditionVisitDetail(Number(visitId), employee.id)

  if (!detail) {
    notFound()
  }

  return (
    <AdminPageShell title="Smart Site Condition Detail">
      <SmartSiteConditionDetail
        visit={detail.visit}
        report={
          detail.report
            ? {
                id: detail.report.id,
                status: detail.report.status,
                executiveSummary: detail.report.executiveSummary,
                finalNarrative: detail.report.finalNarrative,
                aiModel: detail.report.aiModel,
                finalMatrix: (detail.report.finalMatrix as Record<string, unknown> | null) ?? null,
              }
            : null
        }
        observations={detail.observations}
      />
    </AdminPageShell>
  )
}
