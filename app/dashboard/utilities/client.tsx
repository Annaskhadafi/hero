'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Search,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UtilitiesDashboardData } from '@/lib/utilities-dashboard'
import { exportUtilitiesToCsv, exportUtilitiesToExcel } from './export-excel'

interface UtilitiesClientDashboardProps {
  initialData: UtilitiesDashboardData
  canSwitchSite?: boolean
}

export function UtilitiesClientDashboard({
  initialData,
  canSwitchSite = true,
}: UtilitiesClientDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filters state
  const [selectedSiteId, setSelectedSiteId] = useState<string>(String(initialData.currentSite.id))
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialData.currentPeriod)
  const [startDate, setStartDate] = useState<string>(initialData.startDate)
  const [endDate, setEndDate] = useState<string>(initialData.endDate)
  const [tableSearch, setTableSearch] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'date' | 'tech' | 'unit'>('date')
  const [isCustomDateOpen, setIsCustomDateOpen] = useState<boolean>(initialData.currentPeriod === 'custom')

  // Sinkronisasi state saat data server berubah karena filter / navigasi
  useEffect(() => {
    setSelectedSiteId(String(initialData.currentSite.id))
    setSelectedPeriod(initialData.currentPeriod)
    setStartDate(initialData.startDate)
    setEndDate(initialData.endDate)
    setIsCustomDateOpen(initialData.currentPeriod === 'custom')
  }, [initialData])

  const applyFilters = (overrides?: {
    siteId?: string
    period?: string
    startDate?: string
    endDate?: string
  }) => {
    const sId = overrides?.siteId !== undefined ? overrides.siteId : selectedSiteId
    const prd = overrides?.period !== undefined ? overrides.period : selectedPeriod
    const sDate = overrides?.startDate !== undefined ? overrides.startDate : startDate
    const eDate = overrides?.endDate !== undefined ? overrides.endDate : endDate

    const params = new URLSearchParams()
    if (sId !== undefined && sId !== null && sId !== '') {
      params.set('siteId', sId)
    }
    if (prd) {
      params.set('period', prd)
    }
    if (prd === 'custom') {
      if (sDate) params.set('startDate', sDate)
      if (eDate) params.set('endDate', eDate)
    }

    startTransition(() => {
      router.push(`/dashboard/utilities?${params.toString()}`)
    })
  }

  const handlePeriodChange = (periodKey: string) => {
    setSelectedPeriod(periodKey)
    if (periodKey === 'custom') {
      setIsCustomDateOpen(true)
    } else {
      setIsCustomDateOpen(false)
      applyFilters({ period: periodKey })
    }
  }

  const handleSiteChange = (siteId: number) => {
    const sStr = String(siteId)
    setSelectedSiteId(sStr)
    applyFilters({ siteId: sStr })
  }

  const handleCustomDateSubmit = () => {
    if (!startDate || !endDate) {
      toast.error('Harap pilih tanggal mulai dan tanggal selesai')
      return
    }
    applyFilters({ period: 'custom', startDate, endDate })
  }

  // Filtered rows for tables
  const filteredDateRows = initialData.dateMatrix.rows.filter((r) => {
    if (!tableSearch) return true
    const term = tableSearch.toLowerCase()
    return r.date.toLowerCase().includes(term) || r.dateLabel.toLowerCase().includes(term) || r.dayName.toLowerCase().includes(term)
  })

  const filteredTechRows = initialData.technicianMatrix.rows.filter((r) => {
    if (!tableSearch) return true
    const term = tableSearch.toLowerCase()
    return (
      r.employeeName.toLowerCase().includes(term) ||
      r.employeeSn.toLowerCase().includes(term) ||
      r.jobTitle.toLowerCase().includes(term)
    )
  })

  const filteredUnitRows = initialData.unitMatrix.rows.filter((r) => {
    if (!tableSearch) return true
    return r.unitNumber.toLowerCase().includes(tableSearch.toLowerCase())
  })

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-sky-50 text-sky-700 border border-sky-200">
              OPERATIONAL UTILITIES
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Update: {initialData.lastUpdatedTime} WITA
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-sky-600" />
            Dashboard Utilities Site
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring akumulasi output fisik pekerjaan (Ban, Pcs, Satuan Tugas) dan durasi operasional site
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportUtilitiesToExcel(initialData)}
            className="h-9 px-3 rounded-xl border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-bold text-xs gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor Excel (.xlsx)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportUtilitiesToCsv(initialData)}
            className="h-9 px-3 rounded-xl border-slate-200 hover:bg-sky-50 hover:text-sky-700 font-bold text-xs gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-sky-600" />
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Site Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-slate-400" /> Site:
          </span>

          {canSwitchSite ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl font-bold text-xs text-slate-800 border-slate-200 gap-2 hover:bg-slate-50 cursor-pointer"
                >
                  <span className="max-w-[200px] truncate">{initialData.currentSite.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto rounded-xl">
                {initialData.sitesList.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => handleSiteChange(s.id)}
                    className={cn(
                      'cursor-pointer text-xs font-medium py-2',
                      s.id === initialData.currentSite.id && 'font-bold bg-sky-50 text-sky-700'
                    )}
                  >
                    <div className="flex flex-col">
                      <span>{s.name}</span>
                      <span className="text-[10px] text-slate-400">{s.customerName}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
              {initialData.currentSite.name}
            </div>
          )}
        </div>

        {/* Right: Period Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'today', label: 'Hari Ini' },
            { key: 'yesterday', label: 'Kemarin' },
            { key: 'weekly', label: '7 Hari Terakhir' },
            { key: 'monthly', label: 'Bulan Ini' },
            { key: 'custom', label: 'Custom Tanggal' },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePeriodChange(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                selectedPeriod === p.key
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Popover/Bar if active */}
      {isCustomDateOpen && (
        <div className="bg-sky-50/70 border border-sky-200/80 p-4 rounded-2xl flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-sky-900">Rentang Tanggal Custom:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs bg-white border-sky-200 w-36 rounded-lg font-mono font-medium"
            />
            <span className="text-xs text-sky-700 font-bold">s/d</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs bg-white border-sky-200 w-36 rounded-lg font-mono font-medium"
            />
          </div>
          <Button
            size="sm"
            onClick={handleCustomDateSubmit}
            disabled={isPending}
            className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-1 shadow-2xs cursor-pointer"
          >
            {isPending ? 'Memuat...' : 'Terapkan Filter'}
          </Button>
        </div>
      )}

      {/* ── 5 METRIC SUMMARY CARDS (KPIS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Output Utilitas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Output Utilitas
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {initialData.kpis.totalOutput.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] font-semibold text-sky-700 mt-0.5 block">
              Ban / Satuan Output
            </span>
          </div>
        </div>

        {/* Card 2: Total Durasi Jam */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Durasi Operasional
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {initialData.kpis.totalDurationHours}
              <span className="text-sm font-sans font-bold text-slate-500 ml-1">Jam</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 mt-0.5 block">
              Total Jam Pelaksanaan
            </span>
          </div>
        </div>

        {/* Card 3: Rata-rata Output/Hari */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Rata-rata Output / Hari
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {initialData.kpis.averageOutputPerDay}
            </div>
            <span className="text-[11px] font-semibold text-blue-700 mt-0.5 block">
              Produktivitas Harian
            </span>
          </div>
        </div>

        {/* Card 4: Unit Tertangani */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Unit Tertangani
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {initialData.kpis.unitsHandled}
              <span className="text-sm font-sans font-bold text-slate-500 ml-1">Unit</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 mt-0.5 block">
              Dump Truck &amp; Support
            </span>
          </div>
        </div>

        {/* Card 5: Teknisi Aktif */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Teknisi Bertugas
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {initialData.kpis.techniciansCount}
              <span className="text-sm font-sans font-bold text-slate-500 ml-1">Orang</span>
            </div>
            <span className="text-[11px] font-semibold text-violet-700 mt-0.5 block">
              Serviceman &amp; Mekanik
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN BAR CHART: UTILITIES SITE (EXCEL REPLICA) ── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              UTILITIES SITE {initialData.currentSite.name.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi volume fisik per jenis aktivitas pekerjaan selama rentang {initialData.startDate} s/d {initialData.endDate}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
              {initialData.activityBars.length} Kategori Aktivitas
            </span>
          </div>
        </div>

        {initialData.activityBars.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <p>Tidak ada aktivitas yang tercatat pada rentang waktu dan site ini.</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {canSwitchSite && initialData.currentSite.id !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSiteChange(0)}
                  className="h-8 text-xs font-bold text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100 cursor-pointer"
                >
                  Lihat Semua Site (Konsolidasi)
                </Button>
              )}
              {selectedPeriod !== 'monthly' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePeriodChange('monthly')}
                  className="h-8 text-xs font-bold text-slate-700 border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                >
                  Ubah Periode ke Bulan Ini
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-80 sm:h-96 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={initialData.activityBars}
                margin={{ top: 25, right: 15, left: -10, bottom: 65 }}
              >
                <defs>
                  <linearGradient id="utilitiesBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="activityLabel"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={75}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload as (typeof initialData.activityBars)[0]
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3.5 text-xs shadow-xl border border-slate-700 min-w-[200px]">
                          <div className="font-bold text-sky-300 pb-1.5 border-b border-slate-700 leading-tight">
                            {p.activityLabel}
                          </div>
                          <div className="mt-2 space-y-1.5 font-sans">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Total Output / Vol:</span>
                              <span className="font-mono font-bold text-white text-sm">
                                {p.totalQuantity} Ban/Satuan
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Total Durasi:</span>
                              <span className="font-mono font-semibold text-emerald-400">
                                {p.totalDurationHours} Jam
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
                              <span className="text-slate-400">Porsi Terhadap Total:</span>
                              <span className="font-bold text-sky-400">{p.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="totalQuantity"
                  fill="url(#utilitiesBarGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  <LabelList
                    dataKey="totalQuantity"
                    position="top"
                    fill="#0f172a"
                    fontSize={11}
                    fontWeight={800}
                    fontFamily="monospace"
                  />
                  {initialData.activityBars.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      className="hover:opacity-85 transition-opacity cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 2 COLUMN CHARTS: DAILY TREND & TOP CONTRIBUTORS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Tren Harian Output Utilitas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                Tren Harian Output Utilitas
              </h3>
              <p className="text-[11px] text-slate-500">Fluktuasi volume pekerjaan per hari</p>
            </div>
          </div>

          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={initialData.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload as (typeof initialData.dailyTrends)[0]
                      return (
                        <div className="bg-slate-900 text-white rounded-lg p-2.5 text-xs shadow-md border border-slate-700">
                          <div className="font-bold text-sky-300">{p.dateLabel}</div>
                          <div className="mt-1 flex justify-between gap-3 text-slate-300">
                            <span>Output:</span>
                            <span className="font-mono font-bold text-white">{p.totalOutput} Ban/Pcs</span>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-300">
                            <span>Durasi:</span>
                            <span className="font-mono font-semibold text-emerald-400">{p.totalDurationHours} Jam</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalOutput"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaTrendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Leaderboard Teknisi Teratas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                Leaderboard Kontribusi Teknisi
              </h3>
              <p className="text-[11px] text-slate-500">Teknisi dengan akumulasi volume pekerjaan terbanyak</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Top {Math.min(5, initialData.topTechnicians.length)} Orang
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-56 pr-1">
            {initialData.topTechnicians.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">Belum ada data teknisi</div>
            ) : (
              initialData.topTechnicians.slice(0, 5).map((t, idx) => (
                <div
                  key={t.employeeId}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        'size-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border',
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800 border-slate-300'
                          : idx === 2
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-white text-slate-600 border-slate-200'
                      )}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{t.employeeName}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {t.jobTitle} • {t.topActivity}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-xs text-sky-800">
                      {t.totalOutput} <span className="text-[10px] font-sans font-normal text-slate-400">output</span>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-700 font-semibold">
                      {t.totalDurationHours}j kerja
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MULTI-VIEW MATRIX TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Tabel Matriks Rekapitulasi Utilitas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian komprehensif data utilitas per Tanggal, per Teknisi, dan per Unit Operasional
            </p>
          </div>

          {/* Table Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Cari baris..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
            <TabsTrigger value="date" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
              <Calendar className="w-3.5 h-3.5" />
              Rekap per Tanggal (Excel View)
            </TabsTrigger>
            <TabsTrigger value="tech" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
              <Users className="w-3.5 h-3.5" />
              Rekap per Teknisi
            </TabsTrigger>
            <TabsTrigger value="unit" className="rounded-lg text-xs font-bold gap-1.5 cursor-pointer">
              <Truck className="w-3.5 h-3.5" />
              Rekap per Unit
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: REKAP PER TANGGAL (EXCEL VIEW PERSIS) ── */}
          <TabsContent value="date" className="mt-0">
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                      TGL
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap">HARI</th>
                    {initialData.activityColumns.map((col) => (
                      <th key={col} className="py-2.5 px-3 text-center whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-emerald-50 text-emerald-900 border-l border-emerald-200">
                      DURASI (JAM)
                    </th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-sky-50 text-sky-900 border-l border-sky-200">
                      TOTAL OUTPUT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDateRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={initialData.activityColumns.length + 4}
                        className="py-12 text-center text-slate-400 text-xs"
                      >
                        Tidak ada data tanggal yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDateRows.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap sticky left-0 bg-white border-r border-slate-200">
                          {row.dateLabel}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row.dayName}</td>
                        {initialData.activityColumns.map((col) => {
                          const val = row.counts[col] || 0
                          return (
                            <td
                              key={col}
                              className={cn(
                                'py-2 px-3 text-center font-mono whitespace-nowrap',
                                val > 0 ? 'font-bold text-slate-900 bg-sky-50/30' : 'text-slate-300'
                              )}
                            >
                              {val > 0 ? val : '-'}
                            </td>
                          )
                        })}
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap bg-emerald-50/50 border-l border-emerald-100">
                          {row.totalRowDurationHours > 0 ? row.totalRowDurationHours : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-sky-900 whitespace-nowrap bg-sky-50/50 border-l border-sky-100">
                          {row.totalRowOutput > 0 ? row.totalRowOutput : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* ── BARIS SUM / TOTAL (PERSIS DI EXCEL) ── */}
                <tfoot className="bg-emerald-100/90 text-emerald-950 font-black border-t-2 border-emerald-400 text-xs">
                  <tr>
                    <td className="py-2.5 px-3 sticky left-0 bg-emerald-100 z-10 border-r border-emerald-300 uppercase tracking-wider font-black">
                      SUM
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[11px] font-bold">TOTAL</td>
                    {initialData.activityColumns.map((col) => {
                      const totalCol = initialData.dateMatrix.summaryRow.counts[col] || 0
                      return (
                        <td key={`sum-${col}`} className="py-2.5 px-3 text-center font-mono font-black">
                          {totalCol}
                        </td>
                      )
                    })}
                    <td className="py-2.5 px-3 text-right font-mono font-black border-l border-emerald-300">
                      {initialData.dateMatrix.summaryRow.totalDurationHours}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black border-l border-emerald-300 text-sky-950">
                      {initialData.dateMatrix.summaryRow.totalOutput}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </TabsContent>

          {/* ── TAB 2: REKAP PER TEKNISI ── */}
          <TabsContent value="tech" className="mt-0">
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                      NAMA TEKNISI
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap">SN</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">JABATAN</th>
                    {initialData.activityColumns.map((col) => (
                      <th key={col} className="py-2.5 px-3 text-center whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-emerald-50 text-emerald-900 border-l border-emerald-200">
                      DURASI (JAM)
                    </th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-sky-50 text-sky-900 border-l border-sky-200">
                      TOTAL OUTPUT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTechRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={initialData.activityColumns.length + 5}
                        className="py-12 text-center text-slate-400 text-xs"
                      >
                        Tidak ada data teknisi yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredTechRows.map((t) => (
                      <tr key={t.employeeId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap sticky left-0 bg-white border-r border-slate-200">
                          {t.employeeName}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{t.employeeSn}</td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{t.jobTitle}</td>
                        {initialData.activityColumns.map((col) => {
                          const val = t.counts[col] || 0
                          return (
                            <td
                              key={col}
                              className={cn(
                                'py-2 px-3 text-center font-mono whitespace-nowrap',
                                val > 0 ? 'font-bold text-slate-900 bg-sky-50/30' : 'text-slate-300'
                              )}
                            >
                              {val > 0 ? val : '-'}
                            </td>
                          )
                        })}
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap bg-emerald-50/50 border-l border-emerald-100">
                          {t.totalRowDurationHours}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-sky-900 whitespace-nowrap bg-sky-50/50 border-l border-sky-100">
                          {t.totalRowOutput}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── TAB 3: REKAP PER UNIT OPERASIONAL ── */}
          <TabsContent value="unit" className="mt-0">
            <div className="rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                      NOMOR UNIT
                    </th>
                    {initialData.activityColumns.map((col) => (
                      <th key={col} className="py-2.5 px-3 text-center whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-emerald-50 text-emerald-900 border-l border-emerald-200">
                      DURASI (JAM)
                    </th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap bg-sky-50 text-sky-900 border-l border-sky-200">
                      TOTAL OUTPUT PEKERJAAN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnitRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={initialData.activityColumns.length + 3}
                        className="py-12 text-center text-slate-400 text-xs"
                      >
                        Tidak ada data unit operasional yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredUnitRows.map((u) => (
                      <tr key={u.unitNumber} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap sticky left-0 bg-white border-r border-slate-200 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          {u.unitNumber}
                        </td>
                        {initialData.activityColumns.map((col) => {
                          const val = u.counts[col] || 0
                          return (
                            <td
                              key={col}
                              className={cn(
                                'py-2 px-3 text-center font-mono whitespace-nowrap',
                                val > 0 ? 'font-bold text-slate-900 bg-sky-50/30' : 'text-slate-300'
                              )}
                            >
                              {val > 0 ? val : '-'}
                            </td>
                          )
                        })}
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap bg-emerald-50/50 border-l border-emerald-100">
                          {u.totalRowDurationHours}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-sky-900 whitespace-nowrap bg-sky-50/50 border-l border-sky-100">
                          {u.totalRowOutput}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
