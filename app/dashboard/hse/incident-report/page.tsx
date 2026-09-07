import { Metadata } from 'next'
import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import { AdminPageShell } from '@/components/admin-page-shell'
import { IncidentReportClient } from './incident-client'
import { getIncidentRecords } from './actions'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'HSE Incident Report',
  description: 'Manage and track HSE incident reports',
}

export const dynamic = 'force-dynamic'

export default async function IncidentReportPage() {
  const access = await getCurrentMenuPermission('hse_incident_report')
  if (!access.canView) redirect('/dashboard')
  const allSites = await db.select({ id: sites.id, name: sites.name }).from(sites)
  const recordsResult = await getIncidentRecords()

  const records = recordsResult.success ? ((recordsResult.data as any) ?? []) : []

  return (
    <AdminPageShell
      eyebrow="HSE • Incident Control"
      title="HSE Incident Report"
      description="Laporan kejadian insiden keselamatan kerja, analisis akar masalah (RCA), dan tindakan perbaikan."
    >
      <IncidentReportClient data={records} sites={allSites} access={access} />
    </AdminPageShell>
  )
}
