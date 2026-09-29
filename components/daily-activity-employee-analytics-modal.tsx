'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Wrench,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { toast } from 'sonner'
import { getEmployeeEwhAnalyticsAction } from '@/app/dashboard/daily-activity/actions'
import type { EmployeeEwhAnalyticsResult } from '@/lib/employee-ewh-analytics'
import { cn } from '@/lib/utils'

interface DailyActivityEmployeeAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  employeeDbId?: number | null
  employeeName?: string
  employeeSn?: string
  siteName?: string
}

export function DailyActivityEmployeeAnalyticsModal({
  isOpen,
  onClose,
  employeeDbId,
  employeeName,
  employeeSn,
  siteName,
}: DailyActivityEmployeeAnalyticsModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<EmployeeEwhAnalyticsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d' | 'custom'>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && employeeDbId) {
      if (timeRange === 'custom') {
        loadAnalytics(employeeDbId, 'custom', startDate, endDate)
      } else {
        loadAnalytics(employeeDbId, timeRange)
      }
    } else if (!isOpen) {
      setData(null)
      setError(null)
    }
  }, [isOpen, employeeDbId])

  async function loadAnalytics(
    empId: number,
    range: 'all' | '30d' | '7d' | 'custom',
    customStart?: string,
    customEnd?: string
  ) {
    setLoading(true)
    setError(null)

    let sDate: string | undefined = customStart
    let eDate: string | undefined = customEnd

    if (range === '30d') {
      const d = new Date()
      eDate = d.toISOString().split('T')[0]
      d.setDate(d.getDate() - 30)
      sDate = d.toISOString().split('T')[0]
    } else if (range === '7d') {
      const d = new Date()
      eDate = d.toISOString().split('T')[0]
      d.setDate(d.getDate() - 7)
      sDate = d.toISOString().split('T')[0]
    } else if (range === 'all') {
      sDate = undefined
      eDate = undefined
    }

    try {
      const res = await getEmployeeEwhAnalyticsAction(empId, sDate, eDate)
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(res.error || 'Gagal memuat analitik EWH karyawan.')
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem saat memuat analitik.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPreset = (range: 'all' | '30d' | '7d' | 'custom') => {
    setTimeRange(range)
    if (!employeeDbId) return

    if (range === 'all') {
      setStartDate('')
      setEndDate('')
      loadAnalytics(employeeDbId, 'all')
    } else if (range === '30d') {
      const d = new Date()
      const endStr = d.toISOString().split('T')[0]
      d.setDate(d.getDate() - 30)
      const startStr = d.toISOString().split('T')[0]
      setStartDate(startStr)
      setEndDate(endStr)
      loadAnalytics(employeeDbId, '30d')
    } else if (range === '7d') {
      const d = new Date()
      const endStr = d.toISOString().split('T')[0]
      d.setDate(d.getDate() - 7)
      const startStr = d.toISOString().split('T')[0]
      setStartDate(startStr)
      setEndDate(endStr)
      loadAnalytics(employeeDbId, '7d')
    } else if (range === 'custom') {
      if (!startDate && !endDate) {
        const d = new Date()
        const endStr = d.toISOString().split('T')[0]
        d.setDate(d.getDate() - 14)
        const startStr = d.toISOString().split('T')[0]
        setStartDate(startStr)
        setEndDate(endStr)
      }
    }
  }

  const handleApplyCustomDate = () => {
    if (!employeeDbId) return
    if (!startDate && !endDate) {
      toast.error('Silakan tentukan minimal tanggal mulai atau tanggal selesai.')
      return
    }
    if (startDate && endDate && startDate > endDate) {
      toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.')
      return
    }
    loadAnalytics(employeeDbId, 'custom', startDate, endDate)
  }

  const handleRefresh = () => {
    if (!employeeDbId) return
    if (timeRange === 'custom') {
      loadAnalytics(employeeDbId, 'custom', startDate, endDate)
    } else {
      loadAnalytics(employeeDbId, timeRange)
    }
  }

  const handleExportCsv = () => {
    if (!data) return
    const headers = [
      'Rank',
      'Aktivitas',
      'Frekuensi (Kali)',
      'Total Jam',
      'Rata-rata Durasi (Jam/Tugas)',
      'Rata-rata (Menit)',
      'Kontribusi (%)',
    ]
    const rows = data.topActivities.map((a) => [
      a.rank,
      `"${a.name}"`,
      a.count,
      a.totalHours,
      a.averageHoursPerTask,
      a.averageMinutesPerTask,
      `${a.percentageOfTotalWork}%`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Top_Aktivitas_${data.employee.name.replace(/\s+/g, '_')}_${data.employee.employeeSn}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200/90 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white px-5 sm:px-7 py-4 flex items-center justify-between gap-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  Analitik EWH &amp; Riwayat Aktivitas Karyawan
                </DialogTitle>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/25 text-blue-200 border border-blue-400/30">
                  {employeeSn || data?.employee.employeeSn || '-'}
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-300 truncate">
                {employeeName || data?.employee.name} &bull;{' '}
                {data?.employee.jobTitle || 'Technician'} &bull;{' '}
                {siteName || data?.employee.siteName || 'Site Operasional'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Timeframe Selector */}
            <div className="inline-flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold text-white/80 border border-white/15">
              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  timeRange === 'all'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'hover:text-white hover:bg-white/5'
                )}
              >
                Semua Waktu
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('30d')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  timeRange === '30d'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'hover:text-white hover:bg-white/5'
                )}
              >
                30 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('7d')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs',
                  timeRange === '7d'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'hover:text-white hover:bg-white/5'
                )}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('custom')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs inline-flex items-center gap-1',
                  timeRange === 'custom'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'hover:text-white hover:bg-white/5'
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Rentang Tanggal</span>
              </button>
            </div>

            {/* Custom Date Range Picker */}
            {timeRange === 'custom' && (
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-sky-200 font-semibold uppercase">Dari</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-900/90 text-white text-xs px-2 py-0.5 rounded border border-white/25 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono [color-scheme:dark]"
                    title="Pilih tanggal mulai"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-sky-200 font-semibold uppercase">s/d</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-900/90 text-white text-xs px-2 py-0.5 rounded border border-white/25 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono [color-scheme:dark]"
                    title="Pilih tanggal selesai"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCustomDate}
                  disabled={loading}
                  className="h-6 px-2.5 text-[11px] font-bold bg-blue-500 hover:bg-blue-400 text-white rounded cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Terapkan
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              title="Segarkan data analitik"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/60">
          {loading && !data && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Menghitung analitik EWH &amp; aktivitas karyawan...</p>
              <p className="text-xs text-slate-400">Menganalisis seluruh sesi, presensi, durasi tugas, dan lembur</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Memuat Analitik</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* 1. Summary KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Total Jam Efektif */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Total Jam Efektif
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                          {data.summaryKpis.totalEffectiveHours}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Jam</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Target total shift:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {data.summaryKpis.totalTargetHours} Jam
                    </span>
                  </div>
                </div>

                {/* Rata-rata EWH / Hari */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Rata-Rata EWH Harian
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-bold font-mono text-blue-600">
                          {data.summaryKpis.averageDailyHours}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Jam/Hari</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Pencapaian Efektif:</span>
                    <span
                      className={cn(
                        'font-bold px-1.5 py-0.2 rounded text-[10px]',
                        data.summaryKpis.overallEwhPercentage >= 80
                          ? 'bg-emerald-50 text-emerald-700'
                          : data.summaryKpis.overallEwhPercentage >= 50
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      )}
                    >
                      {data.summaryKpis.overallEwhPercentage}% EWH
                    </span>
                  </div>
                </div>

                {/* Total Hari & Sesi */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Kehadiran &amp; Sesi
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                          {data.summaryKpis.totalDaysWorked}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Hari Kerja</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Total Sesi Dicatat:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {data.summaryKpis.totalSessionsCount} Sesi
                    </span>
                  </div>
                </div>

                {/* Total Tugas & Poin */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Pekerjaan Selesai
                      </p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">
                          {data.summaryKpis.totalTasksCompleted}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Tugas</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Total Poin:</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {data.summaryKpis.totalPoints} Poin
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Middle Row: Grafik Tren EWH Historis */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Grafik Tren EWH Harian (Jam Kerja Efektif vs Target Shift)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {data.dailyTrend.length} hari tercatat
                    {timeRange === 'custom' && (startDate || endDate) ? (
                      <span className="ml-1 font-semibold text-blue-600">
                        ({startDate || 'Awal'} s/d {endDate || 'Sekarang'})
                      </span>
                    ) : null}
                    {' '}&bull; Batang biru = Jam Efektif, Abu-abu = Target Shift
                  </span>
                </div>

                {data.dailyTrend.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Belum ada riwayat aktivitas harian yang tercatat pada rentang waktu ini.
                  </div>
                ) : (
                  <div className="w-full h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.dailyTrend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="displayDate"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          unit="j"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const p = payload[0].payload as (typeof data.dailyTrend)[0]
                              return (
                                <div className="bg-slate-900 text-white rounded-lg p-3 text-xs shadow-xl border border-slate-700 min-w-[180px]">
                                  <div className="font-bold text-blue-300 pb-1 border-b border-slate-700 flex items-center justify-between">
                                    <span>{p.date}</span>
                                    <span className="text-[10px] text-slate-300">Shift {p.shift}</span>
                                  </div>
                                  <div className="mt-2 space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Efektif Kerja:</span>
                                      <span className="font-mono font-bold text-emerald-400">
                                        {p.effectiveHours} Jam
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Target Shift:</span>
                                      <span className="font-mono font-bold text-slate-200">
                                        {p.targetHours} Jam
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-slate-700/80">
                                      <span className="text-slate-400">Persentase:</span>
                                      <span className="font-bold text-blue-400">
                                        {p.ewhPercentage}% EWH
                                      </span>
                                    </div>
                                    {p.overtimeHours > 0 && (
                                      <div className="flex justify-between text-amber-400">
                                        <span>Lembur:</span>
                                        <span className="font-bold">+{p.overtimeHours} Jam</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                          formatter={(val) => (val === 'effectiveHours' ? 'Jam Kerja Efektif' : 'Target Shift Normal')}
                        />
                        <Bar
                          dataKey="effectiveHours"
                          name="effectiveHours"
                          fill="#1d72f2"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                        <Bar
                          dataKey="targetHours"
                          name="targetHours"
                          fill="#cbd5e1"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 3. Ranking Top Aktivitas & Rata-rata Durasi Kerja */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Aktivitas Paling Sering Dikerjakan &amp; Rata-Rata Durasi Pengerjaan
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCsv}
                      className="h-7 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1 rounded-lg cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Ekspor CSV
                    </Button>
                    <span className="text-xs text-slate-400">
                      {data.topActivities.length} jenis aktivitas
                    </span>
                  </div>
                </div>

                {data.topActivities.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada rincian tugas aktivitas yang tercatat.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                          <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                          <th className="py-2.5 px-3">Nama Aktivitas Operasional</th>
                          <th className="py-2.5 px-3 text-center">Frekuensi Pengerjaan</th>
                          <th className="py-2.5 px-3 text-right">Total Jam Dihabiskan</th>
                          <th className="py-2.5 px-3 text-right font-bold text-blue-700 bg-blue-50/50">
                            Rata-Rata Pengerjaan (Jam / Tugas)
                          </th>
                          <th className="py-2.5 px-3 text-right w-36">Porsi Waktu Kerja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.topActivities.map((act) => (
                          <tr key={act.name} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-3 text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
                                  act.rank === 1
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : act.rank === 2
                                    ? 'bg-slate-200 text-slate-800'
                                    : act.rank === 3
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'text-slate-500'
                                )}
                              >
                                {act.rank}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800">{act.name}</span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                                {act.count} kali
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                              {act.totalHours} Jam
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                              {act.averageHoursPerTask} Jam{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                ({act.averageMinutesPerTask}m)
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${Math.min(100, act.percentageOfTotalWork)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-slate-600 w-9 text-right">
                                  {act.percentageOfTotalWork}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 4. Tabel Riwayat Detail Aktivitas Harian */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Riwayat Log Aktivitas Harian (Seluruh Rekam Jejak)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Klik baris tanggal untuk melihat rincian tugas yang dikerjakan
                  </span>
                </div>

                {data.historyLogs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Tidak ada riwayat log aktivitas yang ditemukan.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.historyLogs.map((log) => {
                      const isExpanded = expandedDate === log.date
                      return (
                        <div
                          key={log.date}
                          className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-3xs"
                        >
                          {/* Row Header */}
                          <button
                            type="button"
                            onClick={() => setExpandedDate(isExpanded ? null : log.date)}
                            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-16 sm:w-20">
                                <span className="font-bold text-xs text-slate-900 block font-mono">
                                  {log.displayDate}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{log.dayOfWeek}</span>
                              </div>

                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                Shift {log.shift}
                              </span>

                              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-500">
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px] border border-emerald-200">
                                  In: {log.checkInTime}
                                </span>
                                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[11px] border border-blue-200">
                                  Out: {log.checkOutTime}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* EWH badge */}
                              <div className="text-right">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded border',
                                    log.ewhPercentage >= 80
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : log.ewhPercentage >= 50
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  )}
                                >
                                  {log.effectiveHours}/{log.targetHours} Jam ({log.ewhPercentage}%)
                                </span>
                                {log.overtimeHours > 0 && (
                                  <span className="block text-[9px] font-bold text-blue-600 mt-0.5">
                                    +{log.overtimeHours}j Lembur
                                  </span>
                                )}
                              </div>

                              <span className="text-xs text-slate-400 font-medium">
                                {log.tasks.length} tugas
                              </span>

                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Expanded Task Items */}
                          {isExpanded && (
                            <div className="bg-slate-50/70 p-4 border-t border-slate-200">
                              {log.tasks.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  Tidak ada rincian tugas spesifik pada sesi ini (hanya rekap jam kerja sesi).
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {log.tasks.map((t, idx) => (
                                    <div
                                      key={`${t.id}-${idx}`}
                                      className="bg-white rounded-lg p-3 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-semibold text-slate-800 truncate">{t.label}</p>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                            {t.unitNumber !== '-' && (
                                              <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold border border-slate-200">
                                                Unit: {t.unitNumber}
                                              </span>
                                            )}
                                            {t.remarks && <span className="truncate italic">"{t.remarks}"</span>}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 font-mono text-right">
                                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                          {t.durationLabel}
                                        </span>
                                        {t.points > 0 && (
                                          <span className="font-bold text-emerald-600 text-[11px]">
                                            +{t.points} Pts
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
