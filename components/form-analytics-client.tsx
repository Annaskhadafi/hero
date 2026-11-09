'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Download,
  Share2,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  ExternalLink,
  Star,
  FileSpreadsheet,
  Smile,
  Meh,
  Frown,
  Eye,
  Loader2,
  UserCheck,
  Calendar,
  Building2,
  MapPin,
  Briefcase,
  Sliders,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FormAnalyticsSummary, QuestionAnalytics } from '@/lib/form-analytics-service'
import type { FormTemplateDetail } from '@/lib/form-builder-types'
import { getFormBaseUrl } from '@/lib/form-config'
import { exportFormResponsesAction } from '@/app/dashboard/form-studio/actions'
import { exportFormResponsesToExcel } from '@/lib/export-form-excel'

export function FormAnalyticsClient({
  formDetail,
  initialAnalytics,
}: {
  formDetail: FormTemplateDetail
  initialAnalytics: FormAnalyticsSummary
}) {
  const [data] = useState<FormAnalyticsSummary>(initialAnalytics)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null)
  const baseUrl = getFormBaseUrl()
  const publicFormUrl = `${baseUrl}/f/${formDetail.slug}`

  const settings = formDetail.settings || {}
  const customFields = settings.customIdentityFields || []

  async function handleExportExcel() {
    try {
      setIsExportingExcel(true)
      const res = await exportFormResponsesAction(formDetail.id)
      if (!res.success || !res.data) {
        toast.error(res.error || 'Gagal mengambil data respon formulir.')
        return
      }

      if (res.data.rows.length === 0) {
        toast.info('Belum ada respon responden yang tersimpan pada formulir ini.')
        return
      }

      await exportFormResponsesToExcel(res.data)
      toast.success(`Berhasil mengekspor ${res.data.rows.length} respon ke format Excel!`)
    } catch (err: any) {
      console.error('Error handleExportExcel:', err)
      toast.error('Terjadi kesalahan saat memproses file Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  function exportToCsv() {
    if (!data.recentSubmissions || data.recentSubmissions.length === 0) {
      toast.info('Belum ada data submission untuk diexport.')
      return
    }

    const headers = [
      'ID Respon',
      settings.identityLabel || 'Nama Responden',
      settings.emailLabel || 'Email',
      settings.phoneLabel || 'No Telepon / WA',
    ]

    if (settings.requireCompany) {
      headers.push(settings.companyLabel || 'Nama Customer / Perusahaan')
    }
    if (settings.requireSite) {
      headers.push(settings.siteLabel || 'Nama Site / Lokasi Operasional')
    }
    if (settings.requireDepartment) {
      headers.push(settings.departmentLabel || 'Departemen / Divisi')
    }
    for (const cf of customFields) {
      headers.push(cf.label)
    }
    headers.push('Durasi Pengerjaan', 'Waktu Kirim')

    const rows = data.recentSubmissions.map((s) => {
      const row = [
        s.id,
        `"${(s.respondentName || '').replace(/"/g, '""')}"`,
        `"${(s.respondentEmail || '').replace(/"/g, '""')}"`,
        `"${(s.respondentPhone || '').replace(/"/g, '""')}"`,
      ]

      if (settings.requireCompany) {
        row.push(`"${(s.metadata?.company || '').replace(/"/g, '""')}"`)
      }
      if (settings.requireSite) {
        row.push(`"${(s.metadata?.site || '').replace(/"/g, '""')}"`)
      }
      if (settings.requireDepartment) {
        row.push(`"${(s.metadata?.department || '').replace(/"/g, '""')}"`)
      }
      for (const cf of customFields) {
        const val = s.metadata?.customFields?.[cf.key] ?? s.metadata?.customFields?.[cf.id] ?? ''
        row.push(`"${String(val).replace(/"/g, '""')}"`)
      }
      row.push(`${s.durationSeconds || 0} detik`)
      row.push(`"${s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : '-'}"`)
      return row
    })

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `survey_${formDetail.slug}_responses.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('File CSV respon formulir berhasil diunduh!')
  }

  return (
    <AdminPageShell
      eyebrow="Form & Survey Analytics"
      title={`Analitik: ${formDetail.name}`}
      description="Laporan SurveyMonkey-grade: Completion rate, Net Promoter Score (NPS), Likert Heatmap, dan respon individual responden."
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/form-studio/${formDetail.id}/builder`}>
            <Button variant="outline" size="sm">
              Buka Builder
            </Button>
          </Link>
          <a href={publicFormUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-4 w-4" />
              Buka Form Publik
            </Button>
          </a>
          <Button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isExportingExcel ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Export ke Excel (.xlsx)
              </>
            )}
          </Button>
          <Button
            onClick={exportToCsv}
            variant="outline"
            size="sm"
            className="gap-1.5 text-slate-700 hover:bg-slate-100"
            title="Download CSV sederhana"
          >
            CSV
          </Button>
        </div>
      }
    >
      {/* 4 Top Metric Cards */}
      <AdminMetricGrid
        metrics={[
          {
            label: 'Total Pengunjung (Views)',
            value: data.totalViews,
            detail: `${data.totalStarts} responden mulai mengisi`,
          },
          {
            label: 'Total Jawaban Masuk',
            value: data.totalSubmissions,
            detail: 'Kuesioner selesai dikirim',
          },
          {
            label: 'Tingkat Penyelesaian (Completion)',
            value: `${data.completionRate}%`,
            detail: `Drop-off rate: ${data.dropOffRate}%`,
          },
          {
            label: 'Rata-rata Durasi Pengisian',
            value: formatDuration(data.averageDurationSeconds),
            detail: 'Waktu rata-rata per responden',
          },
        ]}
      />

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="grid grid-cols-2 sm:w-[400px]">
          <TabsTrigger value="overview">Visualisasi Pertanyaan</TabsTrigger>
          <TabsTrigger value="responses">Respon Individual ({data.recentSubmissions.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: VISUALISASI PER PERTANYAAN */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {data.questions.map((q, idx) => (
            <Card key={q.fieldKey} className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      Pertanyaan #{idx + 1} &bull; {q.fieldType.replace('_', ' ')}
                    </span>
                    <CardTitle className="text-base font-bold mt-1 text-slate-900 dark:text-slate-100">
                      {q.label}
                    </CardTitle>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {q.totalAnswered} Jawaban Terkumpul
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {renderQuestionAnalyticsContent(q)}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB 2: DATA SUBMISSION & INDIVIDUAL RESPONSES */}
        <TabsContent value="responses" className="space-y-6 mt-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-col gap-3 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Daftar Pengisian Responden
                  </CardTitle>
                  <CardDescription>
                    Data identitas, custom fields, durasi pengisian, dan riwayat kirim respon formulir.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-medium border-slate-300">
                    {data.recentSubmissions.length} Responden
                  </Badge>
                </div>
              </div>

              {/* Aturan Identitas Aktif Overview */}
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 mr-1">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                  Aturan Identitas Aktif:
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-white dark:bg-slate-800 border text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  {settings.identityLabel || 'Nama Lengkap'}
                </span>
                {settings.requireEmail && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-white dark:bg-slate-800 border text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {settings.emailLabel || 'Email'}
                  </span>
                )}
                {settings.requirePhone && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-white dark:bg-slate-800 border text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {settings.phoneLabel || 'No. HP / WA'}
                  </span>
                )}
                {settings.requireCompany && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-white dark:bg-slate-800 border text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {settings.companyLabel || 'Perusahaan'}
                  </span>
                )}
                {settings.requireSite && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-white dark:bg-slate-800 border text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {settings.siteLabel || 'Site'}
                  </span>
                )}
                {settings.requireDepartment && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-white dark:bg-slate-800 border text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {settings.departmentLabel || 'Departemen'}
                  </span>
                )}
                {customFields.map((cf) => (
                  <span
                    key={cf.id || cf.key}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[11px] font-semibold"
                  >
                    Custom: {cf.label}
                  </span>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              {data.recentSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Belum ada responden yang mengisi formulir ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead className="w-16 font-semibold"># ID</TableHead>
                        <TableHead className="font-semibold">
                          {settings.identityLabel || 'Nama Responden'}
                        </TableHead>
                        <TableHead className="font-semibold">
                          {settings.emailLabel || 'Email'}
                        </TableHead>
                        <TableHead className="font-semibold">
                          {settings.phoneLabel || 'No. Telepon / WA'}
                        </TableHead>
                        {settings.requireCompany && (
                          <TableHead className="font-semibold">
                            {settings.companyLabel || 'Customer / Perusahaan'}
                          </TableHead>
                        )}
                        {settings.requireSite && (
                          <TableHead className="font-semibold">
                            {settings.siteLabel || 'Site'}
                          </TableHead>
                        )}
                        {settings.requireDepartment && (
                          <TableHead className="font-semibold">
                            {settings.departmentLabel || 'Departemen'}
                          </TableHead>
                        )}
                        {customFields.map((cf) => (
                          <TableHead key={cf.id || cf.key} className="font-semibold text-blue-700 dark:text-blue-400">
                            {cf.label}
                          </TableHead>
                        ))}
                        <TableHead className="font-semibold">Durasi</TableHead>
                        <TableHead className="font-semibold">Waktu Kirim</TableHead>
                        <TableHead className="text-right font-semibold">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentSubmissions.map((sub) => {
                        const customValues = (sub.metadata?.customFields as Record<string, any>) || {}
                        return (
                          <TableRow key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
                            <TableCell className="font-mono text-xs font-semibold text-slate-500">
                              #{sub.id}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                              <div>{sub.respondentName}</div>
                              {/* Subtitle helper jika kolom company/site/dept tidak ditampilkan tersendiri */}
                              {!settings.requireCompany && !settings.requireSite && !settings.requireDepartment && (sub.metadata?.company || sub.metadata?.site || sub.metadata?.department) && (
                                <div className="text-[11px] font-normal text-slate-500">
                                  {[sub.metadata.company, sub.metadata.site, sub.metadata.department].filter(Boolean).join(' • ')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                              {sub.respondentEmail || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                              {sub.respondentPhone || '-'}
                            </TableCell>
                            {settings.requireCompany && (
                              <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {sub.metadata?.company || '-'}
                              </TableCell>
                            )}
                            {settings.requireSite && (
                              <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {sub.metadata?.site || '-'}
                              </TableCell>
                            )}
                            {settings.requireDepartment && (
                              <TableCell className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {sub.metadata?.department || '-'}
                              </TableCell>
                            )}
                            {customFields.map((cf) => {
                              const val = customValues[cf.key] ?? customValues[cf.id]
                              return (
                                <TableCell key={cf.id || cf.key} className="text-xs">
                                  {val ? (
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 font-medium">
                                      {val}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                              {sub.durationSeconds ? `${sub.durationSeconds} dtk` : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                                onClick={() => setSelectedSubmission(sub)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Detail</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DETAIL MODAL RESIDUAL/INDIVIDUAL RESPONDENT */}
      <Dialog open={Boolean(selectedSubmission)} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Detail Respon #{selectedSubmission?.id}
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap profil dan identitas responden yang tersimpan di sistem.
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">
                    {settings.identityLabel || 'Nama Responden'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {selectedSubmission.respondentName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">
                    {settings.emailLabel || 'Alamat Email'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSubmission.respondentEmail || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">
                    {settings.phoneLabel || 'No. Telepon / WA'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSubmission.respondentPhone || '-'}
                  </span>
                </div>
                {settings.requireCompany && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      {settings.companyLabel || 'Customer / Perusahaan'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedSubmission.metadata?.company || '-'}
                    </span>
                  </div>
                )}
                {settings.requireSite && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      {settings.siteLabel || 'Site / Lokasi'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedSubmission.metadata?.site || '-'}
                    </span>
                  </div>
                )}
                {settings.requireDepartment && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      {settings.departmentLabel || 'Departemen / Divisi'}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedSubmission.metadata?.department || '-'}
                    </span>
                  </div>
                )}
              </div>

              {/* Custom Identity Fields Section in Modal */}
              {customFields.length > 0 && (
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2">
                  <div className="font-bold text-blue-900 dark:text-blue-300 text-xs">
                    Custom Identity Fields:
                  </div>
                  <div className="space-y-1.5">
                    {customFields.map((cf) => {
                      const cVals = (selectedSubmission.metadata?.customFields as Record<string, any>) || {}
                      const val = cVals[cf.key] ?? cVals[cf.id] ?? '-'
                      return (
                        <div key={cf.id || cf.key} className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/50 last:border-b-0">
                          <span className="text-blue-700 dark:text-blue-400 font-medium">
                            {cf.label}:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {val}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Submission Timestamps */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-slate-400">Durasi Pengerjaan:</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedSubmission.durationSeconds ? `${selectedSubmission.durationSeconds} detik` : '-'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="text-slate-400">Waktu Kirim:</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString('id-ID') : '-'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}

function renderQuestionAnalyticsContent(q: QuestionAnalytics) {
  // 1. NPS Score Visualization (SurveyMonkey standard)
  if (q.fieldType === 'nps' && q.npsBreakdown) {
    const { promoters, passives, detractors, promoterPct, passivePct, detractorPct } = q.npsBreakdown
    const nps = q.npsScore || 0
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-center px-6 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 pb-4 sm:pb-0">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Net Promoter Score
            </div>
            <div
              className={`text-5xl font-black mt-1 ${
                nps > 30 ? 'text-emerald-600' : nps >= 0 ? 'text-blue-600' : 'text-rose-600'
              }`}
            >
              {nps > 0 ? `+${nps}` : nps}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Rentang: -100 s/d +100</div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-4 w-full">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-bold">
                <Smile className="h-4 w-4" /> Promoters (9-10)
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {promoterPct}%
              </div>
              <div className="text-xs text-slate-400">{promoters} responden</div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 text-xs font-bold">
                <Meh className="h-4 w-4" /> Passives (7-8)
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {passivePct}%
              </div>
              <div className="text-xs text-slate-400">{passives} responden</div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <div className="flex items-center justify-center gap-1 text-rose-500 text-xs font-bold">
                <Frown className="h-4 w-4" /> Detractors (0-6)
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {detractorPct}%
              </div>
              <div className="text-xs text-slate-400">{detractors} responden</div>
            </div>
          </div>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-200">
            <div style={{ width: `${promoterPct}%` }} className="bg-emerald-500 transition-all" />
            <div style={{ width: `${passivePct}%` }} className="bg-amber-400 transition-all" />
            <div style={{ width: `${detractorPct}%` }} className="bg-rose-500 transition-all" />
          </div>
        </div>
      </div>
    )
  }

  // 2. Choice Breakdown Bar Chart (Single, Multi, Dropdown)
  if (q.responseBreakdown && q.responseBreakdown.length > 0) {
    return (
      <div className="space-y-3">
        {q.responseBreakdown.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{item.label}</span>
              <span className="font-bold">
                {item.count} ({item.percentage}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 3. Star Rating / Slider Average
  if (q.averageRating !== undefined && q.averageRating > 0) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-1 text-amber-400">
          <Star className="h-8 w-8 fill-amber-400" />
        </div>
        <div>
          <div className="text-3xl font-black text-slate-900">{q.averageRating}</div>
          <div className="text-xs text-slate-500">Nilai rata-rata dari seluruh responden</div>
        </div>
      </div>
    )
  }

  // 4. Likert Matrix Heatmap
  if (q.likertMatrix && q.likertMatrix.rows) {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="py-2.5 px-3 font-semibold">Aspek</th>
              <th className="py-2.5 px-3 text-center font-semibold">Rata-rata Skor</th>
              <th className="py-2.5 px-3 font-semibold">Distribusi Pilihan</th>
            </tr>
          </thead>
          <tbody>
            {q.likertMatrix.rows.map((row) => (
              <tr key={row.rowId} className="border-b border-slate-100">
                <td className="py-2.5 px-3 font-medium text-slate-800">{row.rowLabel}</td>
                <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                  {row.averageScore} / 5
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    {row.counts.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-600"
                      >
                        {c.columnLabel}: <b>{c.count}</b>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // 5. Open-ended Text Answers Sample
  if (q.textAnswersSample && q.textAnswersSample.length > 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Sampel Jawaban Teks Terbaru:
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {q.textAnswersSample.map((ans, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
            >
              <p className="leading-relaxed font-normal">"{ans.text}"</p>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>Responden: {ans.respondentName}</span>
                <span>{new Date(ans.createdAt).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="text-xs text-slate-400 italic">
      Belum ada visualisasi respon yang tercatat untuk pertanyaan ini.
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 dtk'
  if (seconds < 60) return `${seconds} detik`
  const minutes = Math.floor(seconds / 60)
  const remSec = seconds % 60
  return `${minutes} mnt ${remSec > 0 ? `${remSec} dtk` : ''}`
}
