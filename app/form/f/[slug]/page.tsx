import { notFound } from 'next/navigation'
import { getFormTemplateBySlugOrKey, incrementFormMetric } from '@/lib/form-service'
import { PublicFormViewerClient } from '@/components/public-form-viewer-client'

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  if (!slug) return notFound()

  const formDetail = await getFormTemplateBySlugOrKey(slug)
  if (!formDetail || !formDetail.isActive) return notFound()

  // Track page view
  await incrementFormMetric(slug, 'view')

  return <PublicFormViewerClient formDetail={formDetail} />
}
