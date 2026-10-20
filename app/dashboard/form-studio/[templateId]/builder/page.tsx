import { notFound } from 'next/navigation'
import { getFormTemplateById } from '@/lib/form-service'
import { FormVisualBuilderClient } from '@/components/form-visual-builder-client'

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  const resolvedParams = await params
  const templateId = parseInt(resolvedParams.templateId, 10)
  if (isNaN(templateId)) return notFound()

  const formDetail = await getFormTemplateById(templateId)
  if (!formDetail) return notFound()

  return <FormVisualBuilderClient initialForm={formDetail} />
}
