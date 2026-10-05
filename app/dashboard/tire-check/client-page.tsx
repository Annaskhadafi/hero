'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  IconTruck,
  IconCalendar,
  IconChevronDown,
  IconClipboardText,
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconDatabase,
  IconTrendingUp,
  IconTable,
  IconDownload,
  IconCode,
  IconCopy,
  IconCheck,
  IconMapPin,
  IconRosetteDiscountCheckFilled,
  IconSearch,
  IconArrowUp,
  IconArrowDown,
  IconDatabaseImport,
} from '@tabler/icons-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList,
} from 'recharts'
import {
  AVAILABLE_SITES,
  AVAILABLE_PERIODS,
  getTireCheckMockData,
} from './mock-data'
import { TireCheckApiResponse } from './types'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TireCheckClientProps {
  initialData?: TireCheckApiResponse
}

export function TireCheckClientPage({ initialData }: TireCheckClientProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('CK-BIB GH')
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('2026-02')
  const [chartMetric, setChartMetric] = useState<'percentage' | 'count'>('percentage')
  const [tableSearch, setTableSearch] = useState<string>('')
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false)
  const [activeJsonTab, setActiveJsonTab] = useState<'raw' | 'processed'>('raw')
  const [hasCopiedJson, setHasCopiedJson] = useState<boolean>(false)

  // Ambil data agregasi berdasarkan site dan periode dari dataset user
  const currentData = useMemo(() => {
    return getTireCheckMockData(selectedSiteId, selectedPeriodId)
  }, [selectedSiteId, selectedPeriodId])

  const { siteInfo, targetConfig, kpiSummary, chartTrend, rekapTable, rawItems } = currentData.data

  const currentPeriodMeta = useMemo(() => {
    return AVAILABLE_PERIODS.find((p) => p.id === selectedPeriodId) || AVAILABLE_PERIODS[0]
  }, [selectedPeriodId])

  // Hitung domain numerik aman untuk YAxis (menghindari NaN dari string dataMax + 0.5)
  const yDomain = useMemo(() => {
    if (chartMetric === 'percentage') {
      const maxVal = Math.max(
        ...chartTrend.map((d) => Number(d.lowPressurePct) || 0),
        0
      )
      // Tambahkan ruang di atas agar data label pada bar tertinggi tidak terpotong
      const upper = Math.max(Math.ceil((maxVal * 1.35 + 0.3) * 10) / 10, 3.5)
      return [0, upper]
    } else {
      const maxVal = Math.max(
        ...chartTrend.map((d) => Number(d.lowPressureQty) || 0),
        0
      )
      const upper = Math.max(Math.ceil(maxVal * 1.3 + 2), 12)
      return [0, upper]
    }
  }, [chartTrend, chartMetric])

  const yTicks = useMemo(() => {
    if (chartMetric === 'percentage') {
      const max = yDomain[1]
      if (max <= 3.5) {
        return [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
      }
      const step = max > 10 ? 2 : 1
      const ticks: number[] = []
      for (let i = 0; i <= max + 0.001; i += step) {
        ticks.push(Number(i.toFixed(1)))
      }
      return ticks
    }
    return undefined
  }, [yDomain, chartMetric])

  // Filter baris tabel berdasarkan pencarian tanggal/qty
  const filteredTable = useMemo(() => {
    if (!tableSearch.trim()) return rekapTable
    const query = tableSearch.toLowerCase()
    return rekapTable.filter(
      (row) =>
        row.tanggal.toLowerCase().includes(query) ||
        String(row.totalTireChecked).includes(query) ||
        String(row.lowPressureQty).includes(query)
    )
  }, [rekapTable, tableSearch])

  // Export CSV
  const handleExportCsv = () => {
    try {
      const headers = [
        'No',
        'Tanggal',
        'Site',
        'Total Tire Checked',
        'Low Pressure (Qty)',
        'Target Checked (Qty)',
        'Adjusted (Qty)',
      ]
      const rows = rekapTable.map((r) => [
        r.no,
        r.tanggal,
        selectedSiteId,
        r.totalTireChecked,
        r.lowPressureQty,
        r.targetCheckedQty,
        r.adjustedQty,
      ])

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Tire_Check_${selectedSiteId}_${selectedPeriodId}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('File CSV berhasil diunduh')
    } catch {
      toast.error('Gagal mengunduh CSV')
    }
  }

  // Copy JSON ke Clipboard
  const handleCopyJson = () => {
    const payload =
      activeJsonTab === 'raw'
        ? { data: rawItems }
        : currentData

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setHasCopiedJson(true)
    toast.success('JSON berhasil disalin!')
    setTimeout(() => setHasCopiedJson(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#f3f7fa] p-4 md:p-6 space-y-5 text-slate-800 antialiased">
      {/* 1. TOP BAR: SITE & PERIODE SELECTOR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Site Selector */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <span className="text-[12px] font-medium text-slate-500">Site</span>
          <div className="relative inline-block w-full sm:w-88">
            <div className="flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs hover:border-slate-300 transition-all cursor-pointer">
              <IconTruck className="size-5 text-amber-500 shrink-0" />
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-hidden cursor-pointer appearance-none pr-6 truncate"
              >
                {AVAILABLE_SITES.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.code === 'ALL' ? site.name + ' – ' + site.plant : site.code + ' (' + site.plant + ')'}
                  </option>
                ))}
              </select>
              <IconChevronDown className="size-4 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Periode Selector & Quick Actions */}
        <div className="flex items-end gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <span className="text-[12px] font-medium text-slate-500">Periode</span>
            <div className="relative inline-block w-full sm:w-56">
              <div className="flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-xs hover:border-slate-300 transition-all cursor-pointer">
                <IconCalendar className="size-5 text-blue-600 shrink-0" />
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-hidden cursor-pointer appearance-none pr-6"
                >
                  {AVAILABLE_PERIODS.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown className="size-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tombol Lihat Kontrak JSON Response API */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsJsonModalOpen(true)}
            className="h-10 px-3.5 rounded-xl border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 transition-colors flex items-center gap-1.5 shrink-0"
            title="Lihat Data Dummy & Respon JSON API"
          >
            <IconCode className="size-4 text-blue-600" />
            <span className="text-xs font-semibold hidden md:inline">Data & Struktur JSON</span>
          </Button>
        </div>
      </div>

      {/* 2. SITE BANNER & TARGET CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        {/* Banner Area (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden relative min-h-[175px] border border-slate-200/80 shadow-xs flex flex-col justify-between p-6 bg-slate-900">
          {/* Background Image of Mining Pit */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/tire-check-banner.jpg"
              alt="Mining Site Banner"
              fill
              className="object-cover object-center opacity-85"
              priority
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent" />
          </div>


          {/* Banner Text Content */}
          <div className="relative z-20 space-y-1 max-w-lg">
            <div className="inline-flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                {siteInfo.companyName}
              </h1>
            </div>
            <p className="text-base md:text-lg font-semibold text-slate-100/95 drop-shadow-sm">
              {siteInfo.plantName}
            </p>
          </div>

          <div className="relative z-20 flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 text-xs font-medium text-slate-200">
            <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-lg">
              <IconMapPin className="size-4 text-sky-400 shrink-0" />
              <span>{siteInfo.location}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-xs px-2.5 py-1 rounded-lg">
              <IconRosetteDiscountCheckFilled className="size-4 text-sky-400 shrink-0" />
              <span>{siteInfo.serviceProvider}</span>
            </div>
          </div>
        </div>

        {/* Target Low Pressure Card (1 col) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex items-center gap-4">
          {/* Target Bullseye SVG Graphic */}
          <div className="size-16 sm:size-20 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full text-emerald-500 drop-shadow-xs"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="50" cy="50" r="44" strokeWidth="8" className="text-emerald-500" />
              <circle cx="50" cy="50" r="28" strokeWidth="7" className="text-emerald-500" />
              <circle cx="50" cy="50" r="14" fill="currentColor" className="text-emerald-500" />
              <path
                d="M50 50 L84 16 M84 16 L70 18 M84 16 L82 30"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-600"
              />
            </svg>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <span className="text-xs font-semibold text-slate-700 tracking-tight">
              Target Low Pressure
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight my-0.5">
              {targetConfig.targetLabel}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {targetConfig.description}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FOUR KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Check Hari Ini */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="size-12 rounded-full bg-blue-100/90 text-blue-600 flex items-center justify-center shrink-0">
            <IconClipboardText className="size-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-600">Total Check Hari Terakhir</div>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {kpiSummary.totalCheckToday.toLocaleString()}
              </span>
              <div className="flex items-center text-[11px] text-emerald-600 font-bold">
                {kpiSummary.totalCheckGrowthType === 'increase' ? (
                  <IconArrowUp className="size-3.5 stroke-[3]" />
                ) : (
                  <IconArrowDown className="size-3.5 stroke-[3] text-slate-500" />
                )}
                <span>{kpiSummary.totalCheckGrowthPct}%</span>
                <span className="text-slate-400 font-normal ml-1">
                  vs kemarin ({kpiSummary.totalCheckYesterday.toLocaleString()})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Low Pressure Hari Ini */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="size-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
            <IconAlertTriangleFilled className="size-6 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-600">Low Pressure Hari Ini</div>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {kpiSummary.lowPressureToday}
              </span>
              <div className="flex items-center text-[11px] font-bold">
                {kpiSummary.lowPressureGrowthPct <= 0 ? (
                  <span className="text-emerald-600 flex items-center">
                    <IconArrowDown className="size-3.5 stroke-[3]" />
                    <span>{Math.abs(kpiSummary.lowPressureGrowthPct)}%</span>
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center">
                    <IconArrowUp className="size-3.5 stroke-[3]" />
                    <span>+{kpiSummary.lowPressureGrowthPct}%</span>
                  </span>
                )}
                <span className="text-slate-400 font-normal ml-1">
                  vs kemarin ({kpiSummary.lowPressureYesterday})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Persentase Low Pressure */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <IconCircleCheckFilled className="size-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-600">Persentase Low Pressure</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpiSummary.lowPressurePercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Card 4: Total Equipment (Matrik) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="size-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <IconDatabase className="size-6 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-600">Total Equipment (Matrik)</div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {kpiSummary.totalEquipment.toLocaleString()}
              </span>
              <div className="text-[11px] space-y-0.5 text-right">
                <div className="flex justify-between gap-2 text-slate-500">
                  <span>Normal</span>
                  <span className="font-bold text-slate-800">
                    {kpiSummary.equipmentBreakdown.normal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-500">
                  <span>Low</span>
                  <span className="font-bold text-slate-800">
                    {kpiSummary.equipmentBreakdown.low}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-500">
                  <span>Maintenance</span>
                  <span className="font-bold text-slate-800">
                    {kpiSummary.equipmentBreakdown.maintenance}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHART CARD: TREND LOW PRESSURE (DAILY) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconTrendingUp className="size-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">Trend Low Pressure (Daily)</h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Segmented Control Toggle: Persentase | Jumlah */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setChartMetric('percentage')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  chartMetric === 'percentage'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Persentase
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('count')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  chartMetric === 'count'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jumlah
              </button>
            </div>

            {/* Date Range Selector Display */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700">
              <IconCalendar className="size-4 text-blue-600" />
              <span>{currentPeriodMeta.range}</span>
              <IconChevronDown className="size-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartTrend}
              margin={{ top: 28, right: 30, left: -10, bottom: 5 }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                domain={yDomain}
                ticks={yTicks}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) =>
                  chartMetric === 'percentage' ? `${Number(val).toFixed(1)}%` : val
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 text-xs shadow-xl border border-slate-700 space-y-1">
                        <div className="font-bold text-sky-400">{data.formattedDate}</div>
                        <div>
                          Site: <span className="font-semibold text-amber-300">{selectedSiteId}</span>
                        </div>
                        <div>
                          Target: <span className="font-semibold">{data.targetChecked} ban</span>
                        </div>
                        <div>
                          Total Checked:{' '}
                          <span className="font-semibold">{data.totalChecked} ban</span>
                        </div>
                        <div>
                          Low Pressure:{' '}
                          <span className="font-semibold text-rose-300">
                            {data.lowPressureQty} ban ({data.lowPressurePct}%)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 pt-0.5 border-t border-slate-800">
                          Status:{' '}
                          <span
                            className={`font-bold ${
                              data.status === 'normal'
                                ? 'text-emerald-400'
                                : data.status === 'warning'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {data.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />

              {/* Target Reference Line (< 1%) */}
              {chartMetric === 'percentage' && (
                <ReferenceLine
                  y={1.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Target < 1%',
                    position: 'insideTopRight',
                    fill: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content: ({ viewBox }: any) => {
                      if (!viewBox || typeof viewBox.y !== 'number' || isNaN(viewBox.y)) return null
                      const chartWidth = viewBox.width || 500
                      return (
                        <g transform={`translate(${Math.max(chartWidth - 75, 40)}, ${viewBox.y - 12})`}>
                          <rect
                            width="72"
                            height="18"
                            rx="4"
                            fill="#ef4444"
                            className="drop-shadow-xs"
                          />
                          <text
                            x="36"
                            y="12"
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            Target &lt; 1%
                          </text>
                        </g>
                      )
                    },
                  }}
                />
              )}

              {/* Bars with dynamic color matching target threshold */}
              {chartMetric === 'percentage' ? (
                <Bar
                  dataKey="lowPressurePct"
                  radius={[3, 3, 0, 0]}
                  name="Low Pressure (%)"
                  minPointSize={2}
                >
                  <LabelList
                    dataKey="lowPressurePct"
                    position="top"
                    offset={5}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(val: any) => {
                      const num = Number(val)
                      if (isNaN(num)) return ''
                      return num === 0 ? '0%' : `${num.toFixed(1)}%`
                    }}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      fill: '#475569',
                    }}
                  />
                  {chartTrend.map((entry, index) => {
                    const pct = Number(entry.lowPressurePct) || 0
                    let fillColor = '#10b981' // Normal (< 1%)
                    if (pct > 3.0) {
                      fillColor = '#ef4444' // Spike / Alert (> 3%)
                    } else if (pct >= 1.0) {
                      fillColor = '#f59e0b' // Warning (1% - 3%)
                    }
                    return <Cell key={`bar-pct-${index}`} fill={fillColor} />
                  })}
                </Bar>
              ) : (
                <Bar
                  dataKey="lowPressureQty"
                  radius={[3, 3, 0, 0]}
                  name="Low Pressure (Qty)"
                  minPointSize={2}
                >
                  <LabelList
                    dataKey="lowPressureQty"
                    position="top"
                    offset={5}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(val: any) => {
                      const num = Number(val)
                      if (isNaN(num)) return ''
                      return `${num}`
                    }}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      fill: '#475569',
                    }}
                  />
                  {chartTrend.map((entry, index) => {
                    const qty = Number(entry.lowPressureQty) || 0
                    let fillColor = '#10b981'
                    if (qty >= 10) {
                      fillColor = '#ef4444'
                    } else if (qty >= 4) {
                      fillColor = '#f59e0b'
                    }
                    return <Cell key={`bar-qty-${index}`} fill={fillColor} />
                  })}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-2 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-500" />
            <span>Normal (&lt; 1%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-amber-500" />
            <span>Warning (1% - 3%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-rose-500" />
            <span>Low (&gt; 3%)</span>
          </div>
        </div>
      </div>

      {/* 5. TABLE CARD: REKAP DAILY CHECK PRESSURE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconTable className="size-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">Rekap Daily Check Pressure</h3>
            <span className="text-xs text-slate-500 font-medium">({filteredTable.length} hari)</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <IconSearch className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Cari tanggal..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200"
              />
            </div>

            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 px-3 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
            >
              <IconDownload className="size-4 text-slate-600" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 max-h-[500px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#f0f6fc] text-slate-700 font-bold border-b border-slate-200 shadow-2xs">
                <th className="py-3 px-4 text-center w-12 bg-[#f0f6fc]">No</th>
                <th className="py-3 px-4 bg-[#f0f6fc]">Tanggal</th>
                <th className="py-3 px-4 text-center bg-[#f0f6fc]">Total Tire Checked</th>
                <th className="py-3 px-4 text-center bg-[#f0f6fc]">Low Pressure (Qty)</th>
                <th className="py-3 px-4 text-center bg-[#f0f6fc]">Target Checked (Qty)</th>
                <th className="py-3 px-4 text-center bg-[#f0f6fc]">Adjusted (Qty)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTable.length > 0 ? (
                filteredTable.map((row) => {
                  let lowPressureCellClass = 'bg-emerald-50 text-emerald-700 font-semibold'
                  if (row.lowPressureQty >= 4) {
                    lowPressureCellClass = 'bg-rose-100 text-rose-700 font-bold'
                  } else if (row.lowPressureQty >= 2) {
                    lowPressureCellClass = 'bg-amber-100/70 text-amber-800 font-semibold'
                  }

                  return (
                    <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">{row.no}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {row.tanggal}
                        {row.notes && (
                          <span className="block text-[10px] text-amber-600 font-normal">
                            {row.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">
                        {row.totalTireChecked.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 text-center ${lowPressureCellClass}`}>
                        {row.lowPressureQty}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">
                        {row.targetCheckedQty.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">
                        {row.adjustedQty}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada data yang sesuai pencarian
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL: STRUKTUR RESPON JSON & DATA MENTAH */}
      <Dialog open={isJsonModalOpen} onOpenChange={setIsJsonModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconCode className="size-5 text-blue-600" />
                <span>Struktur Respons JSON API & Data Dummy</span>
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="h-8 text-xs font-semibold flex items-center gap-1.5 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                {hasCopiedJson ? (
                  <>
                    <IconCheck className="size-4 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="size-4" />
                    <span>Salin JSON</span>
                  </>
                )}
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              Pilih tab di bawah untuk melihat format JSON mentah dari backend atau format olahan dashboard.
            </DialogDescription>
          </DialogHeader>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveJsonTab('raw')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeJsonTab === 'raw'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <IconDatabaseImport className="size-4" />
              <span>Format Data Mentah API (Data Kamu)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveJsonTab('processed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeJsonTab === 'processed'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <IconCode className="size-4" />
              <span>Format Olahan Dashboard (Processed)</span>
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs leading-relaxed border border-slate-800 scrollbar-thin">
            <pre>
              {activeJsonTab === 'raw'
                ? JSON.stringify({ data: rawItems }, null, 2)
                : JSON.stringify(currentData, null, 2)}
            </pre>
          </div>

          <div className="pt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Format input: <code className="font-mono text-slate-700">date2 (YYYY-MM-DD), trgt, checked_tires, low_press_tires, site</code>
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsJsonModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
