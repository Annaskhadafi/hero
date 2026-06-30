import { asc, desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { AdminPageShell } from '@/components/admin-page-shell'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db } from '@/db'
import { roadConditionReports, sites } from '@/db/schema/hero'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureRoadConditionReportTable } from '@/lib/road-condition-history'
import { ROAD_CONDITION_RESOURCE, normalizeRoadConditionScore } from '@/lib/road-condition-rubric'

import { RoadConditionAnalysisClient } from './client-page'

function formatReportDate(value: string) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function scoreTone(score: number) {
  if (score >= 5) return 'bg-emerald-100 text-emerald-900 ring-emerald-200'
  if (score >= 4) return 'bg-sky-100 text-sky-900 ring-sky-200'
  if (score >= 3) return 'bg-amber-100 text-amber-900 ring-amber-200'
  return 'bg-rose-100 text-rose-900 ring-rose-200'
}

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
      .orderBy(asc(sites.name)),
    db.select().from(roadConditionReports).orderBy(desc(roadConditionReports.updatedAt)).limit(50),
  ])

  if (!access.canView) {
    redirect('/dashboard/reports')
  }

  return (
    <AdminPageShell
      eyebrow="Laporan"
      title="Report Analysis Road Condition"
      description="Analisis foto road condition dan output report slide."
    >
      <Tabs defaultValue="report" className="space-y-4">
        <TabsList>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="space-y-5 outline-none">
          <RoadConditionAnalysisClient access={access} sites={siteRows} />
        </TabsContent>

        <TabsContent value="history" className="outline-none">
          <section className="space-y-4 rounded-[1.1rem] bg-white p-5 shadow-[0_14px_32px_rgba(8,32,51,0.08)] ring-1 ring-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950">History Inspeksi</h2>
                <p className="text-xs font-semibold text-slate-500">50 report terakhir.</p>
              </div>
              <Badge variant="outline">{historyRows.length} report</Badge>
            </div>

            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Site</th>
                    <th className="px-3 py-2">Inspector</th>
                    <th className="px-3 py-2">Point</th>
                    <th className="px-3 py-2">Avg</th>
                    <th className="px-3 py-2">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.length > 0 ? (
                    historyRows.map((row) => {
                      const reportData = row.reportData as { drafts?: unknown[] }
                      const pointCount = Array.isArray(reportData?.drafts) ? reportData.drafts.length : 0
                      const averageScore = Number(row.averageScore ?? 0)

                      return (
                        <tr key={row.id} className="border-t border-slate-200 align-top">
                          <td className="px-3 py-3 font-semibold text-slate-950">{formatReportDate(String(row.reportDate))}</td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-slate-950">{row.siteName}</div>
                            <div className="text-xs text-slate-500">{row.customerName}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-700">{row.inspectorName}</td>
                          <td className="px-3 py-3 text-slate-700">{pointCount}</td>
                          <td className="px-3 py-3">
                            <Badge className={scoreTone(normalizeRoadConditionScore(averageScore))}>
                              {averageScore.toFixed(2)}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-slate-500">
                            {row.updatedAt.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                        Belum ada history inspeksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  )
}
