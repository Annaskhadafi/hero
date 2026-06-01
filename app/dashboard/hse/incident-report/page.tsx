import { Metadata } from 'next'
import { db } from '@/db/drizzle'
import { sites } from '@/db/schema/hero'
import { AdminPageShell } from '@/components/admin-page-shell'
import { IncidentReportClient } from './incident-client'

export const metadata: Metadata = {
  title: 'HSE Incident Report',
  description: 'Manage and track HSE incident reports',
}

export default async function IncidentReportPage() {
  const allSites = await db.select({ id: sites.id, name: sites.name }).from(sites)

  return (
    <AdminPageShell
      title="HSE Incident Report"
      description="Laporan kejadian insiden keselamatan kerja, analisis akar masalah (RCA), dan tindakan perbaikan."
    >
      <IncidentReportClient sites={allSites} />
    </AdminPageShell>
  )
}
