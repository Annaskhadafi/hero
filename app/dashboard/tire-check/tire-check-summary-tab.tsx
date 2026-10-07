'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  IconChartBar,
  IconCalendar,
  IconFilter,
  IconDownload,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconCheck,
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconLayersLinked,
  IconTruck,
  IconTargetArrow,
  IconInfoCircle,
  IconEye,
} from '@tabler/icons-react'
import { RawTireCheckItem, TireCheckSummaryPeriodType, TireCheckTireSize } from './types'
import {
  calculateSiteSummaryDataset,
  CANONICAL_PROJECT_SITES,
  generateSummaryCsv,
  MONTH_SHORT_NAMES,
  SummaryFilterConfig,
} from './tire-check-summary-utils'
import { formatNumberIndo } from './tire-check-utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface TireCheckSummaryTabProps {
  rawItems: RawTireCheckItem[]
  onRefresh?: () => void
}

export function TireCheckSummaryTab({ rawItems, onRefresh }: TireCheckSummaryTabProps) {
  const printRef = useRef<HTMLDivElement>(null)

  // Filter States
  const [periodType, setPeriodType] = useState<TireCheckSummaryPeriodType>('monthly')
  const [selectedYear, setSelectedYear] = useState<number>(2026)
  const [monthRange, setMonthRange] = useState<'sem1' | 'sem2' | 'full' | 'custom'>('sem1')
  const [customStartMonth, setCustomStartMonth] = useState<number>(1)
  const [customEndMonth, setCustomEndMonth] = useState<number>(6)
  const [selectedQuarter, setSelectedQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL')
  const [customStartDate, setCustomStartDate] = useState<string>('2026-01-01')
  const [customEndDate, setCustomEndDate] = useState<string>('2026-06-30')
  const [tireSize, setTireSize] = useState<TireCheckTireSize>('all_stacked')
  const [selectedSites, setSelectedSites] = useState<string[]>(CANONICAL_PROJECT_SITES)
  const [targetLowPressurePct, setTargetLowPressurePct] = useState<number>(1.0)
  const [tableSearch, setTableSearch] = useState<string>('')

  // Build filter config
  const filterConfig = useMemo<SummaryFilterConfig>(() => {
    return {
      periodType,
      year: selectedYear,
      monthRange,
      customStartMonth,
      customEndMonth,
      quarter: selectedQuarter,
      customStartDate,
      customEndDate,
      selectedSites,
      tireSize,
      targetLowPressurePct,
      groupMode: 'project',
    }
  }, [
    periodType,
    selectedYear,
    monthRange,
    customStartMonth,
    customEndMonth,
    selectedQuarter,
    customStartDate,
    customEndDate,
    selectedSites,
    tireSize,
    targetLowPressurePct,
  ])

  // Hitung Datasets
  const dataset24 = useMemo(() => {
    return calculateSiteSummaryDataset(rawItems, filterConfig, '24.00R35')
  }, [rawItems, filterConfig])

  const dataset27 = useMemo(() => {
    return calculateSiteSummaryDataset(rawItems, filterConfig, '27.00R49')
  }, [rawItems, filterConfig])

  const datasetConsolidation = useMemo(() => {
    return calculateSiteSummaryDataset(rawItems, filterConfig, 'consolidation')
  }, [rawItems, filterConfig])

  // Menentukan dataset mana yang akan ditampilkan pada chart
  const activeDatasets = useMemo(() => {
    if (tireSize === 'all_stacked') {
      return [dataset24, dataset27]
    }
    if (tireSize === '24.00R35') {
      return [dataset24]
    }
    if (tireSize === '27.00R49') {
      return [dataset27]
    }
    return [datasetConsolidation]
  }, [tireSize, dataset24, dataset27, datasetConsolidation])

  // Executive KPI Aggregation across all sites
  const executiveKpis = useMemo(() => {
    const primary = datasetConsolidation
    let totalTarget = 0
    let totalChecked = 0
    let totalLow = 0

    primary.sites.forEach((s) => {
      totalTarget += s.totalTarget
      totalChecked += s.totalChecked
      totalLow += s.totalLowPressure
    })

    const overallCheckPct =
      totalTarget > 0 ? (totalChecked / totalTarget) * 100 : 100.0
    const overallLowPct =
      totalChecked > 0 ? (totalLow / totalChecked) * 100 : 0.0

    // Find best performing site (lowest low pressure among active)
    const activeSites = primary.sites.filter((s) => s.totalChecked > 0)
    const bestSite = activeSites.reduce(
      (best, cur) =>
        cur.avgLowPressurePct < best.avgLowPressurePct ? cur : best,
      activeSites[0] || primary.sites[0]
    )

    return {
      totalTarget,
      totalChecked,
      totalLow,
      overallCheckPct: Math.round(overallCheckPct * 10) / 10,
      overallLowPct: Math.round(overallLowPct * 100) / 100,
      bestSiteName: bestSite ? bestSite.siteCode : '-',
      bestSiteLowRate: bestSite ? bestSite.avgLowPressurePct : 0,
      totalSites: primary.sites.length,
      achievedSites: primary.sites.filter((s) => s.isAchieved).length,
    }
  }, [datasetConsolidation])

  // Toggle pilihan site
  const toggleSite = (siteCode: string) => {
    setSelectedSites((prev) => {
      if (prev.includes(siteCode)) {
        if (prev.length === 1) {
          toast.warning('Minimal harus memilih 1 site untuk dibandingkan')
          return prev
        }
        return prev.filter((s) => s !== siteCode)
      } else {
        return [...prev, siteCode]
      }
    })
  }

  const selectAllSites = () => {
    setSelectedSites(CANONICAL_PROJECT_SITES)
  }

  // Export CSV
  const handleExportCsv = (datasetToExport = datasetConsolidation) => {
    try {
      const csv = generateSummaryCsv(datasetToExport)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `Summary_Pressure_Check_${datasetToExport.sizeKey}_${selectedYear}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('File CSV Summary berhasil didownload')
    } catch (err: any) {
      toast.error('Gagal mengekspor CSV: ' + err.message)
    }
  }

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Filter baris tabel matriks
  const filteredMatrixSites = useMemo(() => {
    if (!tableSearch.trim()) return datasetConsolidation.sites
    const q = tableSearch.toLowerCase()
    return datasetConsolidation.sites.filter((s) =>
      s.siteCode.toLowerCase().includes(q)
    )
  }, [datasetConsolidation.sites, tableSearch])

  return (
    <div className="space-y-6" ref={printRef}>
      {/* ─── 1. TOP CONTROLS & FILTER BAR ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 print:hidden">
        {/* Row 1: Mode Periode & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1.5">
              <IconCalendar className="size-4 text-blue-600" />
              Tipe Periode:
            </span>

            {/* Segmented Period Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  periodType === 'monthly'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('quarterly')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  periodType === 'quarterly'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kuartalan (Qtr)
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('yearly')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  periodType === 'yearly'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tahunan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  periodType === 'custom'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv(activeDatasets[0])}
              className="text-xs h-9 font-semibold text-slate-700 gap-1.5 rounded-xl border-slate-200"
            >
              <IconDownload className="size-4 text-emerald-600" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-9 font-semibold text-slate-700 gap-1.5 rounded-xl border-slate-200"
            >
              <IconPrinter className="size-4 text-blue-600" />
              Cetak / Print
            </Button>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="text-xs h-9 font-semibold text-slate-700 gap-1.5 rounded-xl border-slate-200"
              >
                <IconRefresh className="size-4 text-slate-500" />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Detail Periode Selector + Ukuran Ban + Target Setting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Tahun & Rentang Bulan / Kuartal */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              {periodType === 'quarterly'
                ? 'Tahun & Kuartal'
                : periodType === 'yearly'
                ? 'Tahun Acuan'
                : periodType === 'custom'
                ? 'Rentang Tanggal'
                : 'Tahun & Rentang Bulan'}
            </label>

            {periodType === 'monthly' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
                <select
                  value={monthRange}
                  onChange={(e) => setMonthRange(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="sem1">Semester 1 (Jan – Jun)</option>
                  <option value="sem2">Semester 2 (Jul – Des)</option>
                  <option value="full">1 Tahun Penuh (Jan – Des)</option>
                </select>
              </div>
            )}

            {periodType === 'quarterly' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Kuartal (Q1 – Q4)</option>
                  <option value="Q1">Q1 (Jan – Mar)</option>
                  <option value="Q2">Q2 (Apr – Jun)</option>
                  <option value="Q3">Q3 (Jul – Sep)</option>
                  <option value="Q4">Q4 (Okt – Des)</option>
                </select>
              </div>
            )}

            {periodType === 'yearly' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value={2026}>Tahun 2026 (vs 2025 & 2024)</option>
                  <option value={2025}>Tahun 2025 (vs 2024 & 2023)</option>
                </select>
              </div>
            )}

            {periodType === 'custom' && (
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs h-9 rounded-xl border-slate-200"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs h-9 rounded-xl border-slate-200"
                />
              </div>
            )}
          </div>

          {/* 2. Ukuran Ban (Tire Size) Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Tampilan Ukuran Ban</span>
              <span className="text-[10px] text-blue-600 font-medium">Sesuai Report</span>
            </label>
            <select
              value={tireSize}
              onChange={(e) => setTireSize(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all_stacked">Semua Ukuran (24.00R35 & 27.00R49 Bersusun)</option>
              <option value="24.00R35">24.00R35 Saja (Haul Truck 100T)</option>
              <option value="27.00R49">27.00R49 Saja (Haul Truck 150T)</option>
              <option value="consolidation">Konsolidasi Total Armada Site</option>
            </select>
          </div>

          {/* 3. Target Low Pressure (%) Benchmark */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
              <span>Target Low Pressure (%)</span>
              <span className="text-[10px] text-emerald-600 font-bold">Garis Hijau</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10.0"
                value={targetLowPressurePct}
                onChange={(e) => setTargetLowPressurePct(parseFloat(e.target.value) || 1.0)}
                className="text-xs h-9 rounded-xl border-slate-200 pr-8 font-bold"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
            </div>
          </div>

          {/* 4. Pemilihan Site (Cross-Site Filter) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Bandingkan Site ({selectedSites.length})</span>
              <button
                type="button"
                onClick={selectAllSites}
                className="text-[10px] text-blue-600 font-bold hover:underline"
              >
                Pilih Semua
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {CANONICAL_PROJECT_SITES.map((site) => {
                const isChecked = selectedSites.includes(site)
                return (
                  <button
                    key={site}
                    type="button"
                    onClick={() => toggleSite(site)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                      isChecked
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {site}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. EXECUTIVE KPI CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">Rata-rata Pressure Checked</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {executiveKpis.overallCheckPct}%
            </span>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              Target 100%
            </Badge>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {formatNumberIndo(executiveKpis.totalChecked)} dari {formatNumberIndo(executiveKpis.totalTarget)} ban
          </span>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">Rata-rata Low Pressure</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-black tracking-tight ${
                executiveKpis.overallLowPct <= targetLowPressurePct
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}
            >
              {executiveKpis.overallLowPct}%
            </span>
            <Badge
              className={`text-[10px] font-bold ${
                executiveKpis.overallLowPct <= targetLowPressurePct
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              Benchmark &lt; {targetLowPressurePct}%
            </Badge>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Total {formatNumberIndo(executiveKpis.totalLow)} kejadian low pressure
          </span>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">Site Performa Terbaik</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600 tracking-tight truncate">
              {executiveKpis.bestSiteName}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Low rate terendah: {executiveKpis.bestSiteLowRate.toFixed(2)}%
          </span>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">Kepatuhan Target Site</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {executiveKpis.achievedSites}/{executiveKpis.totalSites}
            </span>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
              Site Lolos
            </Badge>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Kepatuhan di bawah benchmark {targetLowPressurePct}%
          </span>
        </div>
      </div>

      {/* ─── 3. COMPARISON CHARTS (SESUAI PERSIS SCREENSHOT REFERENSI) ─── */}
      <div className="space-y-8">
        {activeDatasets.map((dataset) => {
          return (
            <div
              key={dataset.sizeKey}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs print:shadow-none print:border-none print:p-2"
            >
              {/* Header Title per Ukuran Ban */}
              <div className="text-center mb-6">
                <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                  Summary Pressure Check {dataset.sizeLabel}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbandingan performa Pressure Checked (%) dan Low Pressure (%) antar Site · Periode{' '}
                  {periodType === 'monthly'
                    ? monthRange === 'sem1'
                      ? `Semester 1 ${selectedYear}`
                      : monthRange === 'sem2'
                      ? `Semester 2 ${selectedYear}`
                      : `Tahun ${selectedYear}`
                    : periodType === 'quarterly'
                    ? `Kuartal ${selectedQuarter} ${selectedYear}`
                    : periodType === 'yearly'
                    ? `Perbandingan Multi-Tahun (${selectedYear})`
                    : `Custom (${customStartDate} s/d ${customEndDate})`}
                </p>
              </div>

              {/* Multi-Site Comparison Row (Pixel-Perfect Side-by-Side Sesuai Screenshot) */}
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[900px] flex items-stretch gap-3">
                  {/* Sumbu Y Kiri (0% - 120%) */}
                  <div className="w-12 shrink-0 flex flex-col justify-between text-right text-[11px] text-slate-500 font-bold pb-8 pr-1 select-none">
                    <span>120%</span>
                    <span>100%</span>
                    <span>80%</span>
                    <span>60%</span>
                    <span>40%</span>
                    <span>20%</span>
                    <span>0%</span>
                  </div>

                  {/* Area Site Clusters */}
                  <div className="flex-1 grid grid-flow-col auto-cols-fr gap-3">
                    {dataset.sites.map((siteGroup) => {
                      return (
                        <div
                          key={siteGroup.siteCode}
                          className="flex flex-col border border-slate-200/80 rounded-xl bg-slate-50/40 p-2.5 relative group hover:border-slate-300 transition-colors"
                        >
                          {/* Top Metric Graphic Area */}
                          <div className="h-56 relative flex items-end">
                            {/* Gridlines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                              <div className="border-b border-slate-300 border-dashed w-full" />
                              <div className="border-b border-slate-300 border-dashed w-full" />
                              <div className="border-b border-slate-300 border-dashed w-full" />
                              <div className="border-b border-slate-300 border-dashed w-full" />
                              <div className="border-b border-slate-300 border-dashed w-full" />
                              <div className="border-b border-slate-300 border-dashed w-full" />
                              <div className="border-b border-slate-400 w-full" />
                            </div>

                            {/* Green Target Line Benchmark across this site */}
                            <div
                              className="absolute left-0 right-0 border-b-2 border-emerald-600 z-10 pointer-events-none"
                              style={{
                                bottom: `${Math.min(
                                  (dataset.targetBenchmarkPct / dataset.yRightMax) * 100,
                                  90
                                )}%`,
                              }}
                              title={`Target Low Pressure: ${dataset.targetBenchmarkPct}%`}
                            />

                            {/* SVG Orange Line overlay for Low Pressure Points */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                              {siteGroup.buckets.length > 1 && (
                                <polyline
                                  fill="none"
                                  stroke="#ea580c"
                                  strokeWidth="2.5"
                                  points={siteGroup.buckets
                                    .map((b, idx) => {
                                      const count = siteGroup.buckets.length
                                      const xPct = ((idx + 0.5) / count) * 100
                                      // Scale against yRightMax
                                      const yPct =
                                        100 -
                                        Math.min(
                                          (b.lowPressurePct / dataset.yRightMax) * 100,
                                          100
                                        )
                                      return `${xPct}%,${yPct}%`
                                    })
                                    .join(' ')}
                                />
                              )}
                            </svg>

                            {/* Month Columns Cluster */}
                            <div className="w-full grid grid-flow-col auto-cols-fr h-full items-end z-10 gap-1.5">
                              {siteGroup.buckets.map((bucket, bIdx) => {
                                const barHeightPct = Math.min(
                                  (bucket.checkedPct / dataset.yLeftMax) * 100,
                                  98
                                )
                                const linePointBottomPct = Math.min(
                                  (bucket.lowPressurePct / dataset.yRightMax) * 100,
                                  96
                                )

                                return (
                                  <div
                                    key={bucket.key}
                                    className="h-full flex flex-col justify-end items-center relative group/col"
                                  >
                                    {/* 1. Bar Column: Pressure Checked (%) */}
                                    <div
                                      className="w-full max-w-[28px] bg-[#005b82] rounded-t-sm relative transition-all duration-300 group-hover/col:bg-[#0369a1]"
                                      style={{ height: `${barHeightPct}%` }}
                                    >
                                      {/* Top Badge on Bar (% Checked) */}
                                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-30">
                                        <span className="bg-[#00b4d8] text-white text-[9px] font-black px-1 py-0.5 rounded shadow-xs leading-none inline-block">
                                          {bucket.checkedPct.toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* 2. Orange Point & Badge: Low Pressure (%) */}
                                    <div
                                      className="absolute left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none"
                                      style={{ bottom: `${linePointBottomPct}%` }}
                                    >
                                      {/* Node Dot */}
                                      <div className="size-2 rounded-full bg-[#ea580c] ring-2 ring-white shadow-xs" />

                                      {/* Badge Label: Low Pressure % */}
                                      <span
                                        className={`text-[8.5px] font-black px-1 py-0.2 rounded shadow-2xs whitespace-nowrap mt-0.5 leading-none ${
                                          bucket.lowPressurePct > dataset.targetBenchmarkPct
                                            ? 'bg-amber-500 text-white ring-1 ring-amber-600'
                                            : 'bg-[#00b4d8] text-white'
                                        }`}
                                      >
                                        {bucket.lowPressurePct.toFixed(2)}%
                                      </span>
                                    </div>

                                    {/* Tooltip on Hover */}
                                    <div className="opacity-0 group-hover/col:opacity-100 transition-opacity absolute bottom-full mb-8 z-50 pointer-events-none bg-slate-900 text-white rounded-lg p-2.5 text-[10px] w-44 shadow-xl">
                                      <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-sky-400">
                                        {siteGroup.siteCode} · {bucket.fullLabel}
                                      </p>
                                      <div className="space-y-0.5">
                                        <div className="flex justify-between">
                                          <span>Checked:</span>
                                          <span className="font-bold">{bucket.checkedPct.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total Ban:</span>
                                          <span>{formatNumberIndo(bucket.checkedTires)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Low Pressure:</span>
                                          <span className="font-bold text-amber-400">
                                            {bucket.lowPressurePct.toFixed(2)}% ({bucket.lowPressureTires} ban)
                                          </span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-700/60 pt-0.5">
                                          <span>Target Low:</span>
                                          <span className="text-emerald-400">&lt; {dataset.targetBenchmarkPct}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Month Labels under bars */}
                          <div className="grid grid-flow-col auto-cols-fr gap-1.5 pt-2 border-t border-slate-200 text-center">
                            {siteGroup.buckets.map((b) => (
                              <span
                                key={b.key}
                                className="text-[10px] font-bold text-slate-600 truncate"
                              >
                                {b.label}
                              </span>
                            ))}
                          </div>

                          {/* Site Label Footer */}
                          <div className="text-center pt-2">
                            <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
                              {siteGroup.siteCode}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Sumbu Y Kanan (0.00% - 14.00%) */}
                  <div className="w-14 shrink-0 flex flex-col justify-between text-left text-[11px] text-slate-500 font-bold pb-8 pl-1 select-none">
                    <span>{dataset.yRightMax.toFixed(2)}%</span>
                    <span>{(dataset.yRightMax * 0.85).toFixed(2)}%</span>
                    <span>{(dataset.yRightMax * 0.7).toFixed(2)}%</span>
                    <span>{(dataset.yRightMax * 0.55).toFixed(2)}%</span>
                    <span>{(dataset.yRightMax * 0.4).toFixed(2)}%</span>
                    <span>{(dataset.yRightMax * 0.2).toFixed(2)}%</span>
                    <span>0.00%</span>
                  </div>
                </div>
              </div>

              {/* Legend persis seperti di gambar referensi */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="inline-block size-3 bg-[#005b82] rounded-xs" />
                  <span>Pressure Checked (%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-0.5 bg-[#ea580c]" />
                  <span>Low Pressure (%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-0.5 bg-emerald-600" />
                  <span>Target Low Pressure (%)</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── 4. NOTE & OBSERVASI SECTION (SESUAI GAMBAR) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-2">
          <IconInfoCircle className="size-4 text-blue-600" />
          Note &amp; Observasi Kinerja Tire Check:
        </h3>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 pl-1">
          <li>
            <strong className="text-slate-800">Target Low Pressure:</strong> Ditetapkan maksimal{' '}
            <span className="text-emerald-700 font-bold">&lt; {targetLowPressurePct.toFixed(2)}%</span> dari
            seluruh ban yang diperiksa pada masing-masing site.
          </li>
          <li>
            <strong className="text-slate-800">Pencapaian Terbaik:</strong> Site{' '}
            <span className="text-blue-700 font-bold">{executiveKpis.bestSiteName}</span> mempertahankan rata-rata low
            pressure terendah sebesar{' '}
            <span className="text-blue-700 font-bold">{executiveKpis.bestSiteLowRate.toFixed(2)}%</span> pada periode ini.
          </li>
          <li>
            <strong className="text-slate-800">Tindakan Korektif:</strong> Area atau bulan dengan indikator nilai di
            atas target (warna oranye terang) memerlukan penyesuaian tekanan kompresor, kalibrasi tire pressure gauge,
            serta pengecekan kondisi pentil (valve core).
          </li>
        </ul>
      </div>

      {/* ─── 5. TABEL REKAPITULASI KOMPARASI LENGKAP ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <IconChartBar className="size-4 text-blue-600" />
              Tabel Matriks Komparasi Antar Site
            </h3>
            <p className="text-xs text-slate-500">
              Rincian komparatif performa pencapaian pemeriksaan tekanan ban per site
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <IconSearch className="size-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Cari nama site..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv(datasetConsolidation)}
              className="text-xs h-9 font-semibold text-slate-700 shrink-0 rounded-xl"
            >
              <IconDownload className="size-4 text-emerald-600 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <th className="py-3 px-4">Nama Site / Project</th>
                <th className="py-3 px-3 text-right">Target Ban</th>
                <th className="py-3 px-3 text-right">Realisasi Check</th>
                <th className="py-3 px-3 text-right">Pressure Checked (%)</th>
                <th className="py-3 px-3 text-right">Ban Low Pressure</th>
                <th className="py-3 px-3 text-right">Avg Low Rate (%)</th>
                <th className="py-3 px-3 text-center">Benchmark Target</th>
                <th className="py-3 px-4 text-center">Status Kepatuhan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMatrixSites.map((site) => {
                const isUnderTarget = site.avgLowPressurePct <= targetLowPressurePct
                return (
                  <tr key={site.siteCode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{site.siteCode}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {formatNumberIndo(site.totalTarget)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatNumberIndo(site.totalChecked)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {site.avgCheckedPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">
                      {formatNumberIndo(site.totalLowPressure)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black px-2 py-0.5 rounded ${
                          isUnderTarget
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {site.avgLowPressurePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500 font-medium">
                      &lt; {targetLowPressurePct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          isUnderTarget
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isUnderTarget ? (
                          <span className="flex items-center gap-1">
                            <IconCircleCheckFilled className="size-3 text-emerald-600" />
                            Memenuhi Target
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <IconAlertTriangleFilled className="size-3 text-amber-600" />
                            Melebihi Target
                          </span>
                        )}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
