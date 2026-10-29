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
  const baseUrl = getFormBaseUrl()
  const publicFormUrl = `${baseUrl}/f/${formDetail.slug}`

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
      alert('Belum ada data submission untuk diexport.')
      return
    }

    const headers = ['ID', 'Nama Responden', 'Email', 'No Telepon', 'Tanggal Kirim', 'Durasi (Detik)']
    const rows = data.recentSubmissions.map((s) => [
      s.id,
      `"${s.respondentName.replace(/"/g, '""')}"`,
      `"${s.respondentEmail}"`,
      `"${s.respondentPhone}"`,
      s.submittedAt || '-',
      s.durationSeconds,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `survey_${formDetail.slug}_responses.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Daftar Pengisian Responden</CardTitle>
                <CardDescription>
                  Data waktu, durasi, dan identitas responden yang telah mengirim jawaban.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Belum ada responden yang mengisi formulir ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Respon</TableHead>
                        <TableHead>Nama Responden</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>No. Telepon / WA</TableHead>
                        <TableHead>Durasi Pengerjaan</TableHead>
                        <TableHead>Waktu Kirim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentSubmissions.map((sub, i) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-mono text-xs">#{sub.id}</TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            {sub.respondentName}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{sub.respondentEmail}</TableCell>
                          <TableCell className="text-sm text-slate-600">{sub.respondentPhone}</TableCell>
                          <TableCell className="text-sm">
                            {sub.durationSeconds ? `${sub.durationSeconds} detik` : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
