'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Loader2,
  PieChart as PieChartIcon,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getFiveRAnalyticsAction } from '@/app/dashboard/quality/5r/actions'
import { FiveRDetailDialog } from './five-r-detail-dialog'

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function FiveRAnalyticsDashboard() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedSiteId, setSelectedSiteId] = useState<number>(0)
  const [approvedOnly, setApprovedOnly] = useState<boolean>(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchArea, setSearchArea] = useState('')
  const [scaleFilter, setScaleFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getFiveRAnalyticsAction({
        year: selectedYear,
        siteId: selectedSiteId > 0 ? selectedSiteId : undefined,
        approvedOnly,
      })
      if (res.success && res.data) {
        setData(res.data)
      } else {
        toast.error(res.message || 'Gagal memuat analitik 5R.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem saat memuat analitik.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedYear, selectedSiteId, approvedOnly])

  const pillarPieData = useMemo(() => {
    if (!data?.pillarsAvg) return []
    const raw = [
      { name: 'Ringkas', value: data.pillarsAvg.ringkas || 0, color: '#059669', fullName: 'Ringkas (Sort)' },
      { name: 'Rapi', value: data.pillarsAvg.rapi || 0, color: '#2563eb', fullName: 'Rapi (Set in Order)' },
      { name: 'Resik', value: data.pillarsAvg.resik || 0, color: '#0891b2', fullName: 'Resik (Shine)' },
      { name: 'Rawat', value: data.pillarsAvg.rawat || 0, color: '#d97706', fullName: 'Rawat (Standardize)' },
      { name: 'Rajin', value: data.pillarsAvg.rajin || 0, color: '#7c3aed', fullName: 'Rajin (Sustain)' },
    ]
    const total = raw.reduce((sum, item) => sum + item.value, 0)
    return raw.map((item) => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '20.0',
    }))
  }, [data?.pillarsAvg])

  const gradePieData = useMemo(() => {
    if (!data?.areaMatrix) return { items: [], total: 0 }
    let countA = 0
    let countB = 0
    let countC = 0
    let countD = 0
    for (const area of data.areaMatrix) {
      const scores = area.monthlyScores
        ? (Object.values(area.monthlyScores) as Array<{ score: number; count: number; reportIds?: number[] }>)
        : []
      for (const m of scores) {
        if (m.score > 0) {
          if (m.score >= 90) countA++
          else if (m.score >= 80) countB++
          else if (m.score >= 70) countC++
          else countD++
        }
      }
    }
    const total = countA + countB + countC + countD
    const items = [
      { name: 'Grade A (Sangat Baik ≥90)', shortName: 'Grade A', count: countA, color: '#10b981', percentage: total > 0 ? ((countA / total) * 100).toFixed(1) : '0' },
      { name: 'Grade B (Baik 80-89)', shortName: 'Grade B', count: countB, color: '#3b82f6', percentage: total > 0 ? ((countB / total) * 100).toFixed(1) : '0' },
      { name: 'Grade C (Cukup 70-79)', shortName: 'Grade C', count: countC, color: '#f59e0b', percentage: total > 0 ? ((countC / total) * 100).toFixed(1) : '0' },
      { name: 'Grade D (Perlu Perbaikan <70)', shortName: 'Grade D', count: countD, color: '#ef4444', percentage: total > 0 ? ((countD / total) * 100).toFixed(1) : '0' },
    ]
    return { items, total }
  }, [data?.areaMatrix])

  const getGradeInfo = (score: number) => {
    if (score >= 90) {
      return {
        grade: 'A',
        label: 'Sangat Baik',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        cellBg: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
        pillBg: 'bg-emerald-500',
      }
    }
    if (score >= 80) {
      return {
        grade: 'B',
        label: 'Baik',
        bg: 'bg-blue-50 text-blue-800 border-blue-300',
        cellBg: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
        pillBg: 'bg-blue-500',
      }
    }
    if (score >= 70) {
      return {
        grade: 'C',
        label: 'Cukup',
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        cellBg: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
        pillBg: 'bg-amber-500',
      }
    }
    if (score > 0) {
      return {
        grade: 'D',
        label: 'Kurang',
        bg: 'bg-rose-50 text-rose-800 border-rose-300',
        cellBg: 'bg-rose-100 text-rose-900 border-rose-300 font-semibold',
        pillBg: 'bg-rose-500',
      }
    }
    return {
      grade: '-',
      label: 'Belum Audit',
      bg: 'bg-slate-50 text-slate-500 border-slate-200',
      cellBg: 'text-slate-300 font-normal',
      pillBg: 'bg-slate-200',
    }
  }

  // Filter area matrix
  const filteredMatrix = useMemo(() => {
    if (!data?.areaMatrix) return []
    return data.areaMatrix.filter((a: any) => {
      if (scaleFilter !== 'all' && a.areaScale !== scaleFilter) return false
      if (searchArea.trim()) {
        const q = searchArea.toLowerCase()
        const matchName = a.areaName.toLowerCase().includes(q)
        const matchSite = a.siteName.toLowerCase().includes(q)
        const matchPic = a.picName.toLowerCase().includes(q)
        if (!matchName && !matchSite && !matchPic) return false
      }
      return true
    })
  }, [data?.areaMatrix, scaleFilter, searchArea])

  const exportExcelMatrix = () => {
    if (!data || !data.areaMatrix) {
      toast.error('Tidak ada data analitik untuk diekspor.')
      return
    }

    const rows = filteredMatrix.map((item: any, idx: number) => {
      const rowObj: Record<string, any> = {
        No: idx + 1,
        'Nama Area 5R': item.areaName,
        Skala: item.areaScale.toUpperCase(),
        Site: item.siteName,
        'PIC Area': item.picName,
      }

      FULL_MONTHS.forEach((mName, mIdx) => {
        const mScore = item.monthlyScores[mName]?.score || 0
        rowObj[SHORT_MONTHS[mIdx]] = mScore > 0 ? mScore : '-'
      })

      rowObj['Rata-Rata Tahunan'] = item.annualAvg > 0 ? item.annualAvg : '-'
      rowObj['Grade'] = item.annualAvg > 0 ? getGradeInfo(item.annualAvg).grade : '-'
      rowObj['Kepatuhan (%)'] = `${item.compliancePercent}%`

      return rowObj
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `Matriks 5R ${selectedYear}`)

    // Format column widths
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 10 },
      { wch: 16 },
      { wch: 20 },
      ...SHORT_MONTHS.map(() => ({ wch: 8 })),
      { wch: 18 },
      { wch: 8 },
      { wch: 15 },
    ]

    XLSX.writeFile(workbook, `Matriks_Skor_5R_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Matriks 5R berhasil diekspor ke Excel!')
  }

  const overallGrade = getGradeInfo(data?.avgScore || 0)

  return (
    <div className="space-y-6">
      {/* Top Filter & Command Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-700 uppercase">
                <BarChart3 className="size-3 text-blue-600" />
                Executive Dashboard
              </span>
              <span className="text-xs font-semibold text-slate-500">Quality &bull; 5R Program</span>
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
              Analitik &amp; Matriks Rekap Kepatuhan 5R
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau kepatuhan audit berkala, tren nilai 5 pilar, dan matriks skor per area kerja operasional.
            </p>
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Selector (Tahun Berjalan secara default) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="size-3.5 text-slate-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                aria-label="Pilih Tahun Matriks"
              >
                {Array.from(
                  new Set([
                    currentYear,
                    currentYear - 1,
                    currentYear - 2,
                    ...(data?.availableYears || []),
                  ])
                )
                  .sort((a, b) => b - a)
                  .map((y: number) => (
                    <option key={y} value={y}>
                      Tahun {y} {y === currentYear ? '(Tahun Berjalan)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Site Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Filter className="size-3.5 text-slate-500" />
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(Number(e.target.value))}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="0">Semua Site</option>
                {(data?.availableSites || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Approved Only Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors select-none">
              <input
                type="checkbox"
                checked={approvedOnly}
                onChange={(e) => setApprovedOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#003461] focus:ring-0 cursor-pointer size-3.5"
              />
              <span className="font-semibold text-[11px]">Approved Saja</span>
            </label>

            {/* Export Excel Button */}
            <Button
              onClick={exportExcelMatrix}
              variant="outline"
              size="sm"
              disabled={loading || !data}
              className="h-8 gap-1.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-xl cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Export Matriks</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
          <Loader2 className="mx-auto size-8 animate-spin text-[#003461]" />
          <p className="mt-3 text-xs font-semibold text-slate-600">Memuat kalkulasi analitik 5R...</p>
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-600">Data analitik tidak ditemukan.</p>
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Card 1: Rata-Rata Skor 5R */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Rata-Rata Skor 5R</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${overallGrade.bg}`}>
                  Grade {overallGrade.grade} &bull; {overallGrade.label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {data.avgScore > 0 ? data.avgScore : '—'}
                </span>
                <span className="text-xs font-medium text-slate-400">/ 100</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Sparkles className="size-3 text-amber-500" />
                <span>Akumulasi tahun {selectedYear}</span>
              </div>
            </div>

            {/* Card 2: Kepatuhan Audit */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Kepatuhan Audit Area</span>
                <ShieldCheck className="size-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {data.complianceRate}%
                </span>
                <span className="text-xs font-medium text-slate-400">terjangkau</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                <span className="font-bold text-slate-800">
                  {data.areaMatrix.filter((a: any) => a.auditCount > 0).length}
                </span>{' '}
                dari {data.totalMasterAreas} Master Area terdata
              </div>
            </div>

            {/* Card 3: Total Audit */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Audit Terlaksana</span>
                <Award className="size-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {data.totalReports}
                </span>
                <span className="text-xs font-medium text-slate-400">laporan</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                <span className="font-bold text-emerald-700">{data.approvedReports}</span> telah disetujui penuh
              </div>
            </div>

            {/* Card 4: Temuan 5R */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Temuan 5R</span>
                <ShieldAlert className="size-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-900">
                  {data.findingsStats.totalFindings}
                </span>
                <span className="text-xs font-medium text-slate-400">temuan</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-medium">
                  {data.findingsStats.resolvedFindings} Selesai
                </span>
                <span className="text-rose-600 font-semibold">
                  {data.findingsStats.openFindings} Terbuka
                </span>
              </div>
            </div>
          </div>

          {/* Visual Breakdown: 5 Pillars & Monthly Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 5 Pillars Performance Radar / Bars */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="size-4 text-[#003461]" />
                    Pencapaian Rata-Rata 5 Pilar 5R
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluasi pilar: Ringkas (Sort), Rapi (Set), Resik (Shine), Rawat (Standardize), Rajin (Sustain).
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { name: '1. Ringkas (Sort)', score: data.pillarsAvg.ringkas, desc: 'Pemilahan barang perlu & tidak perlu' },
                  { name: '2. Rapi (Set in Order)', score: data.pillarsAvg.rapi, desc: 'Penataan tata letak & visual management' },
                  { name: '3. Resik (Shine)', score: data.pillarsAvg.resik, desc: 'Kebersihan area & inspeksi peralatan' },
                  { name: '4. Rawat (Standardize)', score: data.pillarsAvg.rawat, desc: 'Standarisasi SOP & labeling area' },
                  { name: '5. Rajin (Sustain)', score: data.pillarsAvg.rajin, desc: 'Kedisiplinan & pembiasaan budaya kerja' },
                ].map((p, idx) => {
                  const pGrade = getGradeInfo(p.score)
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 hidden sm:inline">{p.desc}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pGrade.bg}`}>
                            {p.score}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pGrade.pillBg}`}
                          style={{ width: `${Math.min(100, Math.max(0, p.score))}%` }}
                        />
                        {/* Target Marker at 80% */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                          style={{ left: '80%' }}
                          title="Target Minimum (80%)"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 inline-block" /> Sangat Baik (&ge;90)
                  <span className="size-2 rounded-full bg-blue-500 inline-block ml-2" /> Baik (&ge;80)
                  <span className="size-2 rounded-full bg-amber-500 inline-block ml-2" /> Cukup (&ge;70)
                </span>
                <span className="font-medium text-slate-400">Garis Target: 80%</span>
              </div>
            </div>

            {/* Monthly Trends Chart */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="size-4 text-emerald-600" />
                    Tren Nilai Audit Bulanan ({selectedYear})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pergerakan rata-rata nilai dan volume audit per bulan dalam 1 tahun kalender.
                  </p>
                </div>
              </div>

              {/* Monthly Visual Bar Chart */}
              <div className="pt-4 space-y-2">
                <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 px-2 border-b border-slate-200">
                  {data.monthlyTrends.map((m: any) => {
                    const heightPercent = m.avgScore > 0 ? (m.avgScore / 100) * 100 : 4
                    const mGrade = getGradeInfo(m.avgScore)
                    return (
                      <div key={m.monthIndex} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1 pointer-events-none whitespace-nowrap shadow-lg">
                          <p className="font-bold">{m.monthName}</p>
                          <p>
                            Skor: {m.avgScore > 0 ? m.avgScore : '-'} ({m.reportCount} audit)
                          </p>
                        </div>

                        {/* Value label */}
                        <span className="text-[10px] font-bold text-slate-700 opacity-80 group-hover:opacity-100">
                          {m.avgScore > 0 ? Math.round(m.avgScore) : ''}
                        </span>

                        {/* Bar */}
                        <div
                          className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                            m.avgScore > 0 ? mGrade.pillBg : 'bg-slate-100'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Month Labels */}
                <div className="flex items-center justify-between gap-1 sm:gap-2 px-2 text-[10px] font-semibold text-slate-500">
                  {SHORT_MONTHS.map((sm, idx) => (
                    <div key={idx} className="flex-1 text-center truncate">
                      {sm}
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Summary Legend */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Bulan Teraktif: {data.monthlyTrends.reduce((max: any, m: any) => m.reportCount > max.reportCount ? m : max, data.monthlyTrends[0])?.monthName || '-'}</span>
                <span>Bulan Skor Tertinggi: {data.monthlyTrends.reduce((max: any, m: any) => m.avgScore > max.avgScore ? m : max, data.monthlyTrends[0])?.monthName || '-'}</span>
              </div>
            </div>
          </div>

          {/* Visual Breakdown: Pie Charts (Proporsi 5 Pilar & Distribusi Grade Mutu) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pie Chart 1: Proporsi Skor 5 Pilar */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <PieChartIcon className="size-4 text-indigo-600" />
                    Proporsi Skor Kategori 5R ({selectedYear})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Distribusi proporsi bobot pencapaian 5 pilar (Ringkas, Rapi, Resik, Rawat, Rajin).
                  </p>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  5 Pilar Mutu
                </span>
              </div>

              {pillarPieData.length === 0 || pillarPieData.every((p) => p.value === 0) ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  Belum ada data audit di tahun {selectedYear}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2">
                  <div className="sm:col-span-7 h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pillarPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {pillarPieData.map((entry, index) => (
                            <Cell key={`cell-pillar-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any, name: any) => [`${value} Poin (${pillarPieData.find((p) => p.name === name)?.percentage}%)`, name]}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends & Percentage breakdown */}
                  <div className="sm:col-span-5 space-y-2 text-xs">
                    {pillarPieData.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-semibold text-slate-700 text-[11px]">{p.fullName}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-xs">{p.percentage}%</span>
                          <span className="text-[10px] text-slate-400 ml-1">({p.value})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pie Chart 2: Proporsi Tingkat Kepatuhan & Grade Mutu */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <PieChartIcon className="size-4 text-emerald-600" />
                    Proporsi Grade Mutu Audit ({selectedYear})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Distribusi capaian grade audit seluruh area (Grade A, B, C, D).
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Total: {gradePieData.total} Audit
                </span>
              </div>

              {gradePieData.total === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  Belum ada data audit di tahun {selectedYear}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2">
                  <div className="sm:col-span-7 h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={gradePieData.items.filter((i) => i.count > 0)}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {gradePieData.items
                            .filter((i) => i.count > 0)
                            .map((entry, index) => (
                              <Cell key={`cell-grade-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any, name: any) => [`${value} Audit (${gradePieData.items.find((i) => i.name === name)?.percentage}%)`, name]}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legends & Percentage breakdown */}
                  <div className="sm:col-span-5 space-y-2 text-xs">
                    {gradePieData.items.map((g, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                          <span className="font-semibold text-slate-700 text-[11px]">{g.shortName}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 text-xs">{g.percentage}%</span>
                          <span className="text-[10px] text-slate-400 ml-1">({g.count} kali)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Area Leaderboard & Attention List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Top 5 Best Areas */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="size-4 text-emerald-600" />
                  Top 5 Area Berkinerja Terbaik
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Konsisten &amp; Rapih
                </span>
              </div>

              {data.topAreas.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada data audit area</p>
              ) : (
                <div className="space-y-2 pt-1">
                  {data.topAreas.map((a: any, idx: number) => {
                    const g = getGradeInfo(a.avgScore)
                    return (
                      <div
                        key={a.areaId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{a.areaName}</p>
                            <p className="text-[10px] text-slate-400">
                              {a.siteName} &bull; {a.auditCount} kali audit
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-black border ${g.bg}`}>
                            {a.avgScore} (Grade {g.grade})
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Needs Attention Areas */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-amber-600" />
                  Area Perlu Perhatian &amp; Peningkatan
                </h3>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Perlu Monitoring
                </span>
              </div>

              {data.needsAttentionAreas.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada data audit area</p>
              ) : (
                <div className="space-y-2 pt-1">
                  {data.needsAttentionAreas.map((a: any, idx: number) => {
                    const g = getGradeInfo(a.avgScore)
                    return (
                      <div
                        key={a.areaId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                            !
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{a.areaName}</p>
                            <p className="text-[10px] text-slate-400">
                              {a.siteName} &bull; {a.auditCount} kali audit
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-black border ${g.bg}`}>
                            {a.avgScore} (Grade {g.grade})
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Master Heatmap Matrix Table (Area x 12 Months) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="size-4 text-[#003461]" />
                  Matriks Skor Bulanan Area 5R ({selectedYear})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Heatmap nilai berkala per Master Area. Klik pada sel skor untuk membuka dokumen laporan.
                </p>
              </div>

              {/* Matrix Search & Scale Filter */}
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari area, PIC, site..."
                    value={searchArea}
                    onChange={(e) => setSearchArea(e.target.value)}
                    className="h-8 pl-8 text-xs bg-slate-50/70 rounded-xl"
                  />
                </div>

                <select
                  value={scaleFilter}
                  onChange={(e) => setScaleFilter(e.target.value as any)}
                  className="h-8 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Semua Skala</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>

            {/* Matrix Table Container */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/90">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">No</th>
                    <th className="py-2.5 px-3 min-w-[160px] border-r border-slate-200">Area 5R</th>
                    <th className="py-2.5 px-2.5 min-w-[100px] border-r border-slate-200">Site</th>
                    <th className="py-2.5 px-2 min-w-[60px] text-center border-r border-slate-200">Skala</th>
                    {SHORT_MONTHS.map((m, idx) => (
                      <th key={idx} className="py-2 px-1 text-center w-12 border-r border-slate-200 font-mono">
                        {m}
                      </th>
                    ))}
                    <th className="py-2.5 px-2.5 text-center min-w-[70px] border-r border-slate-200 bg-slate-200/70">
                      Rata-Rata
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[50px] border-r border-slate-200">Grade</th>
                    <th className="py-2.5 px-2.5 text-center min-w-[60px]">Kepatuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={19} className="py-10 text-center text-xs text-slate-400">
                        Tidak ada Master Area yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map((item: any, idx: number) => {
                      const avgGrade = getGradeInfo(item.annualAvg)
                      return (
                        <tr key={item.areaId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-2.5 text-center text-slate-400 font-mono border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                            <div className="truncate max-w-[180px]" title={item.areaName}>
                              {item.areaName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              PIC: {item.picName}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 border-r border-slate-200">
                            <span className="truncate block max-w-[100px]" title={item.siteName}>
                              {item.siteName}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                item.areaScale === 'small'
                                  ? 'bg-blue-50 text-blue-700'
                                  : item.areaScale === 'large'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {item.areaScale}
                            </span>
                          </td>

                          {/* 12 Months Score Cells */}
                          {FULL_MONTHS.map((mName, mIdx) => {
                            const monthData = item.monthlyScores[mName]
                            const score = monthData?.score || 0
                            const gInfo = getGradeInfo(score)
                            const firstReportId = monthData?.reportIds?.[0]

                            return (
                              <td
                                key={mIdx}
                                onClick={() => {
                                  if (firstReportId) setSelectedReportId(firstReportId)
                                }}
                                className={`py-1.5 px-0.5 text-center border-r border-slate-200 font-mono text-[11px] ${
                                  score > 0
                                    ? `${gInfo.cellBg} cursor-pointer hover:opacity-80 transition-opacity`
                                    : 'text-slate-300'
                                }`}
                                title={
                                  score > 0
                                    ? `Bulan ${mName}: Skor ${score} (Klik untuk lihat laporan)`
                                    : `Bulan ${mName}: Belum ada audit`
                                }
                              >
                                {score > 0 ? Math.round(score) : '—'}
                              </td>
                            )
                          })}

                          {/* Annual Avg */}
                          <td className="py-2 px-2.5 text-center border-r border-slate-200 font-mono font-bold bg-slate-50">
                            {item.annualAvg > 0 ? item.annualAvg : '—'}
                          </td>

                          {/* Grade */}
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            {item.annualAvg > 0 ? (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${avgGrade.bg}`}>
                                {avgGrade.grade}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Compliance % */}
                          <td className="py-2 px-2.5 text-center font-semibold text-slate-700">
                            {item.compliancePercent}%
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Matrix Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Indikator Skor:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">A (&ge;90)</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold">B (80-89)</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">C (70-79)</span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold">D (&lt;70)</span>
              </div>
              <div>
                <span>Menampilkan {filteredMatrix.length} dari {data.totalMasterAreas} Master Area</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Dialog Popup when clicking matrix cell */}
      {selectedReportId && (
        <FiveRDetailDialog
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onActionComplete={() => {
            loadData()
          }}
        />
      )}
    </div>
  )
}
