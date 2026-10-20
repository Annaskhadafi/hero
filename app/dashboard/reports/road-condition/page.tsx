import { asc, desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { AdminPageShell } from '@/components/admin-page-shell'
import { db } from '@/db'
import { roadConditionReports, sites } from '@/db/schema/hero'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureRoadConditionReportTable } from '@/lib/road-condition-history'
import { ROAD_CONDITION_RESOURCE } from '@/lib/road-condition-rubric'

import { RoadConditionAnalysisClient, type HistoryRow, type SavedRoadConditionReportData } from './client-page'

export default async function RoadConditionAnalysisPage() {
  await ensureRoadConditionReportTable()

  const [access, siteRows, historyRows] = await Promise.all([
    getCurrentMenuPermission(ROAD_CONDITION_RESOURCE),
    db
      .select({
        id: sites.id,
        name: sites.name,
        customerName: sites.customerName,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name))
      .catch((err) => {
        console.warn('[road-condition] Failed to load sites:', err)
        return []
      }),
    db
      .select()
      .from(roadConditionReports)
      .orderBy(desc(roadConditionReports.updatedAt))
      .limit(50)
      .catch((err) => {
        console.warn('[road-condition] Failed to load history rows:', err)
        return []
      }),
  ])

  if (!access.canView) {
    redirect('/dashboard/reports')
  }

  const parsedHistoryRows: HistoryRow[] = historyRows.map((row) => ({
    id: row.id,
    siteId: row.siteId ?? null,
    siteName: row.siteName,
    customerName: row.customerName,
    inspectorName: row.inspectorName,
    reportDate: String(row.reportDate),
    averageScore: Number(row.averageScore ?? 0),
    pointCount: Array.isArray((row.reportData as { drafts?: unknown[] })?.drafts) ? (row.reportData as { drafts?: unknown[] }).drafts!.length : 0,
    reportData: row.reportData as SavedRoadConditionReportData | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return (
    <AdminPageShell
      eyebrow="Laporan"
      title="Report Analysis Road Condition"
      description="Analisis foto road condition dan output report slide."
    >
      <RoadConditionAnalysisClient access={access} sites={siteRows} historyRows={parsedHistoryRows} />
    </AdminPageShell>
  )
}
