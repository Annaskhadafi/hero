import { notFound } from 'next/navigation'
import { getFormAnalytics } from '@/lib/form-analytics-service'
import { getFormTemplateById } from '@/lib/form-service'
import { FormAnalyticsClient } from '@/components/form-analytics-client'

export default async function FormAnalyticsPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  const resolvedParams = await params
  const templateId = parseInt(resolvedParams.templateId, 10)
  if (isNaN(templateId)) return notFound()

  const [formDetail, analyticsData] = await Promise.all([
    getFormTemplateById(templateId),
    getFormAnalytics(templateId),
  ])

  if (!formDetail || !analyticsData) return notFound()

  return <FormAnalyticsClient formDetail={formDetail} initialAnalytics={analyticsData} />
}
