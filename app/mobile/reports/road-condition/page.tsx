import { asc, desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { Truck } from 'lucide-react'

import { db } from '@/db'
import { roadConditionReports, sites } from '@/db/schema/hero'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureRoadConditionReportTable } from '@/lib/road-condition-history'
import { ROAD_CONDITION_RESOURCE } from '@/lib/road-condition-rubric'

import { RoadConditionAnalysisClient } from '@/app/dashboard/reports/road-condition/client-page'

export default async function MobileRoadConditionAnalysisPage() {
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
      .orderBy(asc(sites.name)),
    db.select().from(roadConditionReports).orderBy(desc(roadConditionReports.updatedAt)).limit(50),
  ])

  if (!access.canView) redirect('/mobile/reports')

  const parsedHistoryRows = historyRows.map((row) => ({
    id: row.id,
    siteId: row.siteId ?? null,
    siteName: row.siteName,
    customerName: row.customerName,
    inspectorName: row.inspectorName,
    reportDate: String(row.reportDate),
    averageScore: Number(row.averageScore ?? 0),
    pointCount: Array.isArray((row.reportData as { drafts?: unknown[] })?.drafts) ? (row.reportData as { drafts?: unknown[] }).drafts!.length : 0,
    reportData: row.reportData as any,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))

  return (
    <main className="min-h-dvh bg-slate-50 pb-8">
      <div className="sticky top-0 z-10 bg-gradient-to-br from-[#0f4c75] to-[#1b6ca8] px-4 pb-5 pt-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
            <Truck className="size-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Site Condition</p>
            <h1 className="truncate font-display text-lg font-black text-white">Road Condition Analysis</h1>
          </div>
        </div>
        <p className="mt-2 pl-[3.25rem] text-[13px] font-semibold text-white/75">
          Analisis foto, validasi AI, hasil slide report PDF
        </p>
      </div>

      <div className="px-3 pt-4">
        <RoadConditionAnalysisClient access={access} sites={siteRows} historyRows={parsedHistoryRows} />
      </div>
    </main>
  )
}
