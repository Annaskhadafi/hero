'use client'

import * as React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LabelList,
  ComposedChart,
  Line,
} from 'recharts'
import {
  Search,
  Bell,
  Clock,
  BarChart3,
  Coins,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Plus,
  FileSpreadsheet,
  X,
  Zap,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Gauge,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  fetchTireScrapPerformance,
  type TireScrapResponse,
  type TireScrapDetailRecord,
  type TireScrapFilterParams,
} from '@/app/actions/maestro-tire-scrap'

// SVG Tire Icon matching the Maestro design
function TireIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v4.5" />
      <path d="M12 16.5V21" />
      <path d="M3 12h4.5" />
      <path d="M16.5 12H21" />
      <path d="m5.64 5.64 3.18 3.18" />
      <path d="m15.18 15.18 3.18 3.18" />
      <path d="m18.36 5.64-3.18 3.18" />
      <path d="m8.82 15.18-3.18 3.18" />
    </svg>
  )
}

// Deterministic number formatter to avoid SSR hydration mismatch
function formatNumber(num: number | string | undefined | null): string {
  if (num === null || num === undefined || num === '') return '0'
  const parts = Number(num).toLocaleString('en-US').split('.')
  return parts[0]
}

// Format Currency
function formatCurrencyIDR(val: number): string {
  if (!val || val === 0) return '$ 0'
  const absVal = Math.abs(val)
  if (absVal >= 1_000_000_000) {
    return `$ ${(absVal / 1_000_000_000).toFixed(1)}B`
  }
  if (absVal >= 1_000_000) {
    return `$ ${(absVal / 1_000_000).toFixed(1)}M`
  }
  if (absVal >= 1_000) {
    return `$ ${(absVal / 1_000).toFixed(1)}K`
  }
  return `$ ${absVal.toFixed(2)}`
}

// Color palette for charts
const REASON_COLORS = [
  '#22c55e', '#06b6d4', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#38bdf8', '#a855f7', '#6366f1', '#14b8a6',
  '#84cc16', '#f43f5e', '#8b5cf6', '#94a3b8',
]

interface TireScrapDashboardProps {
  customerName?: string
  userName?: string
  initialData?: TireScrapResponse | null
  initialError?: string
  hideTopNav?: boolean
}

export function TireScrapDashboard({
  customerName = 'PT Pamapersada Nusantara',
  userName = 'Ahmad D.',
  initialData,
  initialError,
  hideTopNav = false,
}: TireScrapDashboardProps) {
  const [mounted, setMounted] = React.useState(false)

  // Real CTS API Response state (100% data real)
  const [apiData, setApiData] = React.useState<TireScrapResponse | null>(initialData || null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(initialError || null)

  // Filter States
  const [selectedSite, setSelectedSite] = React.useState<string>(initialData?.filters?.site || 'CK-KIM')
  const [selectedBrand, setSelectedBrand] = React.useState('All Brands')
  const [selectedSize, setSelectedSize] = React.useState('All Sizes')
  const [selectedPattern, setSelectedPattern] = React.useState('All Patterns')
  const [selectedReason, setSelectedReason] = React.useState('All Reasons')
  const [selectedPeriod, setSelectedPeriod] = React.useState('all')
  const [selectedUnit, setSelectedUnit] = React.useState<'HM' | 'KM'>('HM')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Table pagination and view mode
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [sortColumn, setSortColumn] = React.useState<keyof TireScrapDetailRecord>('scrap_date')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')

  // Quick Action Dialog States
  const [isLogScrapOpen, setIsLogScrapOpen] = React.useState(false)
  const [isAnalyzeOpen, setIsAnalyzeOpen] = React.useState(false)

  // Mount effect
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Dynamic filter dropdown options
  const filterOptions = React.useMemo(() => {
    const raw = apiData?.available_filters || initialData?.available_filters
    const rawSites = raw?.sites || []
    const cleanSites = rawSites.includes('CK-KIM') ? rawSites : ['CK-KIM', ...rawSites]

    // Compute distinct brands, sizes, patterns, reasons from actual dataset
    const allDetails = apiData?.details || []
    const distinctBrands = Array.from(new Set(allDetails.map((d) => d.brand).filter(Boolean))).sort()
    const distinctSizes = Array.from(new Set(allDetails.map((d) => d.tire_size).filter(Boolean))).sort()
    const distinctPatterns = Array.from(new Set(allDetails.map((d) => d.pattern).filter(Boolean))).sort()
    const distinctReasons = Array.from(new Set(allDetails.map((d) => d.scrap_reason).filter(Boolean))).sort()

    return {
      sites: cleanSites.length > 0 ? cleanSites : ['CK-KIM'],
      brands: ['All Brands', ...(distinctBrands.length > 0 ? distinctBrands : raw?.brands || [])],
      sizes: ['All Sizes', ...(distinctSizes.length > 0 ? distinctSizes : raw?.sizes || [])],
      patterns: ['All Patterns', ...(distinctPatterns.length > 0 ? distinctPatterns : raw?.patterns || [])],
      reasons: ['All Reasons', ...(distinctReasons.length > 0 ? distinctReasons : raw?.reasons || [])],
    }
  }, [apiData, initialData])

  // Refetch function when site changes
  const handleApplyFilter = React.useCallback(
    async (overrideParams: Partial<TireScrapFilterParams> = {}) => {
      setIsLoading(true)
      setApiError(null)

      try {
        const nextSite = overrideParams.site !== undefined ? overrideParams.site : selectedSite
        const params: TireScrapFilterParams = {
          site: nextSite,
          unit: selectedUnit,
          limit: 500,
          ...overrideParams,
        }

        const res = await fetchTireScrapPerformance(params)
        if (res.success && res.data) {
          setApiData(res.data)
          setCurrentPage(1)
          toast.success(`Data Tire Scrap berhasil dimuat (${res.data.details?.length || 0} unit)`)
        } else {
          setApiError(res.error || 'Gagal memuat data dari CTS')
          toast.error(res.error || 'Gagal memuat data dari CTS')
        }
      } catch (err: any) {
        setApiError(err.message || 'Koneksi ke CTS terganggu')
        toast.error('Gagal menghubungi CTS API')
      } finally {
        setIsLoading(false)
      }
    },
    [selectedSite, selectedUnit]
  )

  // ── REAKTIF: Filter records sesuai seluruh filter yang dipilih di UI ──
  const filteredRecords = React.useMemo(() => {
    let list: TireScrapDetailRecord[] = [...(apiData?.details || [])]

    // Brand filter
    if (selectedBrand !== 'All Brands') {
      list = list.filter((r) => r.brand.toLowerCase() === selectedBrand.toLowerCase())
    }

    // Size filter
    if (selectedSize !== 'All Sizes') {
      list = list.filter((r) => r.tire_size.toLowerCase() === selectedSize.toLowerCase())
    }

    // Pattern filter
    if (selectedPattern !== 'All Patterns') {
      list = list.filter((r) => r.pattern.toLowerCase() === selectedPattern.toLowerCase())
    }

    // Reason filter
    if (selectedReason !== 'All Reasons') {
      list = list.filter((r) => r.scrap_reason.toLowerCase() === selectedReason.toLowerCase())
    }

    // Period / Year filter
    if (selectedPeriod !== 'all') {
      list = list.filter((r) => {
        if (!r.scrap_date || r.scrap_date === '-') return false
        return r.scrap_date.includes(selectedPeriod)
      })
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        return (
          r.serial_number?.toLowerCase().includes(q) ||
          r.equipment?.toLowerCase().includes(q) ||
          r.unit_number?.toLowerCase().includes(q) ||
          r.site?.toLowerCase().includes(q) ||
          r.brand?.toLowerCase().includes(q) ||
          r.tire_size?.toLowerCase().includes(q) ||
          r.scrap_reason?.toLowerCase().includes(q) ||
          r.pattern?.toLowerCase().includes(q)
        )
      })
    }

    return list
  }, [apiData?.details, selectedBrand, selectedSize, selectedPattern, selectedReason, selectedPeriod, searchQuery])

  // ── SCORECARD / KPI CARDS: Dihitung secara DINAMIS mengikuti filter yang aktif ──
  const summary = React.useMemo(() => {
    const total = filteredRecords.length
    if (total === 0) {
      return {
        total_scrap_tires: { value: 0, unit: 'units', change_percentage: 0, change_direction: 'neutral' as const, previous_value: 0 },
        average_tire_life: { value: 0, unit: selectedUnit === 'KM' ? 'km' : 'hrs', change_percentage: 0, change_direction: 'neutral' as const, previous_value: 0 },
        life_achievement: { value: 0, unit: '%', change_percentage: 0, change_direction: 'neutral' as const, previous_value: 0 },
        estimated_scrap_loss: { value: 0, formatted: '$ 0', change_percentage: 0, change_direction: 'neutral' as const, previous_value: 0 },
        top_scrap_reason: { reason: 'None', count: 0, percentage: 0 },
      }
    }

    const totalLife = filteredRecords.reduce((acc, cur) => acc + (cur.actual_life || 0), 0)
    const avgLife = Math.round(totalLife / total)
    const totalAch = filteredRecords.reduce((acc, cur) => acc + (cur.achievement || 0), 0)
    const avgAch = Math.round((totalAch / total) * 10) / 10
    const totalLoss = Math.abs(filteredRecords.reduce((acc, cur) => acc + (cur.lossgain && cur.lossgain < 0 ? cur.lossgain : 0), 0))

    // Top scrap reason
    const reasonCounts: Record<string, number> = {}
    filteredRecords.forEach((r) => {
      const rName = r.scrap_reason || 'Unknown'
      reasonCounts[rName] = (reasonCounts[rName] || 0) + 1
    })

    let topReasonName = '-'
    let topReasonCount = 0
    Object.entries(reasonCounts).forEach(([rName, count]) => {
      if (count > topReasonCount) {
        topReasonCount = count
        topReasonName = rName
      }
    })
    const topReasonPct = total > 0 ? Math.round((topReasonCount / total) * 1000) / 10 : 0

    return {
      total_scrap_tires: {
        value: total,
        unit: 'units',
        change_percentage: 0,
        change_direction: 'neutral' as const,
        previous_value: 0,
      },
      average_tire_life: {
        value: avgLife,
        unit: selectedUnit === 'KM' ? 'km' : 'hrs',
        change_percentage: 0,
        change_direction: 'neutral' as const,
        previous_value: 0,
      },
      life_achievement: {
        value: avgAch,
        unit: '%',
        change_percentage: 0,
        change_direction: 'neutral' as const,
        previous_value: 0,
      },
      estimated_scrap_loss: {
        value: totalLoss,
        formatted: formatCurrencyIDR(totalLoss),
        change_percentage: 0,
        change_direction: 'neutral' as const,
        previous_value: 0,
      },
      top_scrap_reason: {
        reason: topReasonName,
        count: topReasonCount,
        percentage: topReasonPct,
      },
    }
  }, [filteredRecords, selectedUnit])

  // ── CHARTS: Dihitung secara DINAMIS mengikuti filter yang aktif ──
  const dynamicCharts = React.useMemo(() => {
    const brandMap: Record<string, number> = {}
    const reasonMap: Record<string, number> = {}
    const brandLifeMap: Record<string, { totalActual: number; totalTarget: number; count: number }> = {}
    const sizeMap: Record<string, number> = {}
    const monthMap: Record<number, { scrap: number; totalLife: number }> = {}

    for (let m = 1; m <= 12; m++) {
      monthMap[m] = { scrap: 0, totalLife: 0 }
    }

    filteredRecords.forEach((d) => {
      // Brand
      brandMap[d.brand] = (brandMap[d.brand] || 0) + 1

      // Reason
      reasonMap[d.scrap_reason] = (reasonMap[d.scrap_reason] || 0) + 1

      // Brand Target vs Actual
      if (!brandLifeMap[d.brand]) {
        brandLifeMap[d.brand] = { totalActual: 0, totalTarget: 0, count: 0 }
      }
      brandLifeMap[d.brand].totalActual += d.actual_life
      brandLifeMap[d.brand].totalTarget += d.target_life
      brandLifeMap[d.brand].count++

      // Size
      sizeMap[d.tire_size] = (sizeMap[d.tire_size] || 0) + 1

      // Month trend
      if (d.scrap_date && d.scrap_date !== '-') {
        const parsedDate = new Date(d.scrap_date)
        if (!isNaN(parsedDate.getTime())) {
          const m = parsedDate.getMonth() + 1
          if (monthMap[m]) {
            monthMap[m].scrap++
            monthMap[m].totalLife += d.actual_life
          }
        }
      }
    })

    const scrap_by_brand = Object.entries(brandMap)
      .map(([b, cnt]) => ({ brand: b, count: cnt }))
      .sort((a, b) => b.count - a.count)

    const total = filteredRecords.length
    const scrap_by_reason = Object.entries(reasonMap)
      .map(([r, count]) => ({
        reason: r,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const target_vs_actual_by_brand = Object.entries(brandLifeMap)
      .map(([b, info]) => {
        const act = Math.round(info.totalActual / info.count)
        const trg = Math.round(info.totalTarget / info.count)
        return {
          brand: b,
          actual_life: act,
          target_life: trg,
          achievement: trg > 0 ? Math.round((act / trg) * 1000) / 10 : 0,
        }
      })
      .sort((a, b) => b.actual_life - a.actual_life)

    const scrap_by_tire_size = Object.entries(sizeMap)
      .map(([sz, cnt]) => ({ size: sz, count: cnt }))
      .sort((a, b) => b.count - a.count)

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const scrap_trend = Object.entries(monthMap).map(([mStr, val]) => {
      const m = Number(mStr)
      return {
        month: m,
        month_name: monthNames[m] || `M${m}`,
        scrap_count: val.scrap,
        avg_life: val.scrap > 0 ? Math.round(val.totalLife / val.scrap) : 0,
      }
    })

    return {
      scrap_by_brand,
      scrap_by_reason,
      target_vs_actual_by_brand,
      scrap_by_tire_size,
      scrap_trend,
    }
  }, [filteredRecords])

  // Donut chart data with color mapping
  const reasonChartData = React.useMemo(() => {
    return dynamicCharts.scrap_by_reason.map((item, idx) => ({
      name: item.reason,
      count: item.count,
      pct: item.percentage,
      color: REASON_COLORS[idx % REASON_COLORS.length],
    }))
  }, [dynamicCharts.scrap_by_reason])

  // Sorted Table Records
  const processedRecords = React.useMemo(() => {
    const list = [...filteredRecords]
    list.sort((a, b) => {
      let valA: any = a[sortColumn]
      let valB: any = b[sortColumn]

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA
      }
      valA = String(valA || '').toLowerCase()
      valB = String(valB || '').toLowerCase()
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
    return list
  }, [filteredRecords, sortColumn, sortDirection])

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(processedRecords.length / pageSize))
  const paginatedRecords = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return processedRecords.slice(start, start + pageSize)
  }, [processedRecords, currentPage, pageSize])

  // Sort click handler
  const handleSort = (col: keyof TireScrapDetailRecord) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection('desc')
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (processedRecords.length === 0) {
      toast.error('Tidak ada data scrap tire untuk diekspor')
      return
    }

    const headers = [
      'Brand,Tire Size,Pattern,Unit Number,Equipment,Site,Serial Number,Install Date,Scrap Date,Actual Life,Target Life,Achievement (%),Tread Remaining,Scrap Reason,Failure Category,Position,Status,Estimated Loss',
    ]

    const rows = processedRecords.map((r) =>
      [
        `"${r.brand}"`,
        `"${r.tire_size}"`,
        `"${r.pattern}"`,
        `"${r.unit_number}"`,
        `"${r.equipment}"`,
        `"${r.site}"`,
        `"${r.serial_number}"`,
        `"${r.install_date}"`,
        `"${r.scrap_date}"`,
        `"${r.actual_life_text || r.actual_life}"`,
        `"${r.target_life_text || r.target_life}"`,
        `"${r.achievement}"`,
        `"${r.tread_remaining_text || r.tread_remaining}"`,
        `"${r.scrap_reason}"`,
        `"${r.scrap_category}"`,
        `"${r.position}"`,
        `"${r.status}"`,
        `"${r.lossgain || 0}"`,
      ].join(',')
    )

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `tire_scrap_performance_${selectedSite}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Berhasil mengekspor ${processedRecords.length} data scrap tire!`)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      {/* ── Top Bar with Global Search & Status (Hidden in HERO Dashboard shell) ── */}
      {!hideTopNav && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5 sticky top-0 z-20 shadow-2xs">
          <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search serial number, unit, brand, site, or scrap reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Right Action: API Status, Refresh & User Pill */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Live CTS API Status Badge */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <span className="relative flex size-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${apiError ? 'bg-amber-400 opacity-75' : 'bg-emerald-400 opacity-75'}`} />
                  <span className={`relative inline-flex rounded-full size-2 ${apiError ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </span>
                <span>CTS API Live</span>
                <span className="text-[10px] text-slate-400 font-mono">({filterOptions.sites.length} Sites)</span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => handleApplyFilter()}
                disabled={isLoading}
                title="Refresh Data from CTS"
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`size-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => toast.info('Tidak ada notifikasi scrap darurat saat ini.')}
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="size-5" />
                <span className="absolute top-1.5 right-1.5 size-2 bg-rose-500 rounded-full ring-2 ring-white" />
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="size-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{userName}</p>
                  <p className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">{customerName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Workspace ── */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── Page Header & Interactive Filter Bar ── */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Tire Scrap Performance
              </h1>
              {hideTopNav && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 shadow-2xs">
                    <span className="relative flex size-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${apiError ? 'bg-amber-400 opacity-75' : 'bg-emerald-400 opacity-75'}`} />
                      <span className={`relative inline-flex rounded-full size-2 ${apiError ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </span>
                    <span>CTS API Live</span>
                  </div>
                  <button
                    onClick={() => handleApplyFilter()}
                    disabled={isLoading}
                    title="Refresh Data from CTS"
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Pantau kinerja ban scrap, pencapaian target lifetime, estimasi kerugian, dan analisa penyebab scrap di seluruh site.
            </p>
          </div>

          {/* Filter Dropdowns with Live Data from CTS API */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Unit Selector: HM vs KM */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Unit</span>
              <div className="inline-flex h-9 rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setSelectedUnit('HM')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    selectedUnit === 'HM'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  HM (hrs)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUnit('KM')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    selectedUnit === 'KM'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  KM
                </button>
              </div>
            </div>

            {/* Site Filter */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Site</span>
              <select
                value={selectedSite}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedSite(val)
                  handleApplyFilter({ site: val })
                }}
                className="h-9 max-w-[150px] sm:max-w-[180px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {filterOptions.sites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Brand Filter */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Brand</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="h-9 max-w-[120px] sm:max-w-[140px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {filterOptions.brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Tire Size Filter */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Tire Size</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="h-9 max-w-[120px] sm:max-w-[130px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {filterOptions.sizes.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Pattern Filter */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Pattern</span>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="h-9 max-w-[120px] sm:max-w-[140px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {filterOptions.patterns.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Period / Year Filter */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Year / Period</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="2026">Year 2026</option>
                <option value="2025">Year 2025</option>
                <option value="2024">Year 2024</option>
                <option value="2023">Year 2023</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Scrap Reason Filter */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Scrap Reason</span>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-9 max-w-[140px] sm:max-w-[170px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {filterOptions.reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>
          </div>
        </div>

        {/* ── 5 Stat / KPI Scorecards (Row) - REAKTIF MENGIKUTI FILTER ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Card 1: Total Scrap Tires */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <TireIcon className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Total Scrap Tires</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-950">
                    {formatNumber(summary.total_scrap_tires?.value)}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {summary.total_scrap_tires?.unit || 'units'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">terfilter dari dataset</p>
              </div>
            </div>
          </div>

          {/* Card 2: Average Tire Life */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Clock className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Average Tire Life</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-950">
                    {formatNumber(summary.average_tire_life?.value)}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {summary.average_tire_life?.unit || (selectedUnit === 'KM' ? 'km' : 'hrs')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">rata-rata aktual</p>
              </div>
            </div>
          </div>

          {/* Card 3: Life Achievement vs Target */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <BarChart3 className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Life Achievement vs Target</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-950">
                    {summary.life_achievement?.value || 0}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">vs target lifetime</p>
              </div>
            </div>
          </div>

          {/* Card 4: Estimated Scrap Loss */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Coins className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Estimated Scrap Loss</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-950">
                    {summary.estimated_scrap_loss?.formatted || formatCurrencyIDR(summary.estimated_scrap_loss?.value || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">total kerugian scrap</p>
              </div>
            </div>
          </div>

          {/* Card 5: Top Scrap Reason */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-200">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600">Top Scrap Reason</p>
                <p className="text-base sm:text-lg font-black text-slate-950 mt-0.5 truncate max-w-[150px]" title={summary.top_scrap_reason?.reason}>
                  {summary.top_scrap_reason?.reason || '-'}
                </p>
                <p className="text-xs text-slate-500 font-semibold">
                  {summary.top_scrap_reason?.count || 0} units ({summary.top_scrap_reason?.percentage || 0}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 Analytics Charts (Row) - REAKTIF MENGIKUTI FILTER ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Chart 1: Scrap by Brand */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Scrap by Brand</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{dynamicCharts.scrap_by_brand.length} brands</span>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {dynamicCharts.scrap_by_brand.length > 0 ? (
                    <BarChart data={dynamicCharts.scrap_by_brand} margin={{ top: 16, right: 10, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="brand" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v) => [`${v} units`, 'Scrap Count']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                      />
                      <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={28}>
                        <LabelList dataKey="count" position="top" style={{ fill: '#334155', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Tidak ada data scrap by brand
                    </div>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Scrap by Reason (Donut Chart + Dynamic Legend) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Scrap by Reason</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{reasonChartData.length} reasons</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
              {/* Donut with center total */}
              <div className="relative h-44 w-full flex items-center justify-center">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    {reasonChartData.length > 0 ? (
                      <PieChart>
                        <Pie
                          data={reasonChartData}
                          dataKey="count"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={68}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {reasonChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val, name, item) => [`${val} units (${item.payload.pct}%)`, String(name)]}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600 }}
                        />
                      </PieChart>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Tidak ada data
                      </div>
                    )}
                  </ResponsiveContainer>
                )}
                {reasonChartData.length > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black text-slate-950 leading-none">
                      {formatNumber(summary.total_scrap_tires?.value)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Scrap Tires</span>
                  </div>
                )}
              </div>

              {/* Legend list on the right */}
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1 text-[11px]">
                {reasonChartData.map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-slate-700 hover:text-slate-950">
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="truncate" title={r.name}>{r.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-medium">
                      <span className="font-bold text-slate-900">{r.count}</span>
                      <span className="text-slate-500 text-[10px] w-7 text-right">{r.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3: Target Life vs Actual Life */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Target vs Actual Life</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#22c55e]" /> Actual
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#cbd5e1]" /> Target
                </span>
              </div>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {dynamicCharts.target_vs_actual_by_brand.length > 0 ? (
                    <BarChart data={dynamicCharts.target_vs_actual_by_brand} margin={{ top: 16, right: 10, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="brand" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v, name) => [
                          `${formatNumber(v as number)} ${selectedUnit === 'KM' ? 'km' : 'hrs'}`,
                          name === 'actual_life' ? 'Actual Life' : 'Target Life',
                        ]}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                      />
                      <Bar dataKey="actual_life" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={14}>
                        <LabelList dataKey="actual_life" position="top" style={{ fill: '#15803d', fontSize: 9, fontWeight: 700 }} />
                      </Bar>
                      <Bar dataKey="target_life" fill="#cbd5e1" radius={[3, 3, 0, 0]} barSize={14}>
                        <LabelList dataKey="target_life" position="top" style={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Tidak ada data target vs actual
                    </div>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Scrap by Tire Size */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Scrap by Tire Size</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{dynamicCharts.scrap_by_tire_size.length} sizes</span>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {dynamicCharts.scrap_by_tire_size.length > 0 ? (
                    <BarChart data={dynamicCharts.scrap_by_tire_size} margin={{ top: 16, right: 10, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="size" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v) => [`${v} units`, 'Scrap Count']}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                      />
                      <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={22}>
                        <LabelList dataKey="count" position="top" style={{ fill: '#334155', fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Tidak ada data scrap by size
                    </div>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrap Tire Detail Table Section ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-200 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="text-emerald-600">
                <TireIcon className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Scrap Tire Detail</h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Menampilkan {processedRecords.length} unit ban scrap &bull; Halaman {currentPage} dari {totalPages}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input in table header */}
              <div className="relative w-full sm:w-60 md:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari SN, unit, reason, brand..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-8 pl-8 pr-7 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setCurrentPage(1)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Page size selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600">
                  <th onClick={() => handleSort('brand')} className="py-3 px-4 cursor-pointer hover:text-slate-950">
                    <span className="inline-flex items-center gap-1">Brand <ArrowUpDown className="size-3 text-slate-400" /></span>
                  </th>
                  <th onClick={() => handleSort('tire_size')} className="py-3 px-4 cursor-pointer hover:text-slate-950">
                    <span className="inline-flex items-center gap-1">Tire Size <ArrowUpDown className="size-3 text-slate-400" /></span>
                  </th>
                  <th className="py-3 px-4">Pattern</th>
                  <th className="py-3 px-4">Unit / Equipment</th>
                  <th onClick={() => handleSort('site')} className="py-3 px-4 cursor-pointer hover:text-slate-950">
                    <span className="inline-flex items-center gap-1">Site <ArrowUpDown className="size-3 text-slate-400" /></span>
                  </th>
                  <th onClick={() => handleSort('serial_number')} className="py-3 px-4 cursor-pointer hover:text-slate-950">
                    <span className="inline-flex items-center gap-1">Serial Number <ArrowUpDown className="size-3 text-slate-400" /></span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Install Date</th>
                  <th onClick={() => handleSort('scrap_date')} className="py-3 px-4 cursor-pointer hover:text-slate-950 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">Scrap Date <ArrowUpDown className="size-3 text-slate-400" /></span>
                  </th>
                  <th onClick={() => handleSort('actual_life')} className="py-3 px-4 cursor-pointer hover:text-slate-950 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">Actual Life <ArrowUpDown className="size-3 text-slate-400" /></span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Target Life</th>
                  <th onClick={() => handleSort('achievement')} className="py-3 px-4 cursor-pointer hover:text-slate-950 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">Achievement <ArrowUpDown className="size-3 text-slate-400" /></span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Tread Remaining</th>
                  <th className="py-3 px-4">Scrap Reason</th>
                  <th className="py-3 px-4">Failure Category</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-10 text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertTriangle className="size-6 text-slate-300" />
                        <p>Tidak ada data scrap tire yang cocok dengan filter aktif.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((row, idx) => (
                    <tr key={row.serial_number || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.brand}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{row.tire_size}</td>
                      <td className="py-3 px-4">{row.pattern}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {row.unit_number || row.equipment ? `${row.unit_number || ''} ${row.equipment ? `(${row.equipment})` : ''}` : '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.site}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 font-medium">{row.serial_number}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">{row.install_date || '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">{row.scrap_date || '-'}</td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        {row.actual_life_text || `${formatNumber(row.actual_life)} ${selectedUnit === 'KM' ? 'km' : 'hrs'}`}
                      </td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap text-slate-500">
                        {row.target_life_text || `${formatNumber(row.target_life)} ${selectedUnit === 'KM' ? 'km' : 'hrs'}`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                            row.achievement >= 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {row.achievement_text || `${row.achievement}%`}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.tread_remaining_text || `${row.tread_remaining} mm`}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{row.scrap_reason || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{row.scrap_category || '-'}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{row.position || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 text-rose-600 border border-rose-200">
                          {row.status || 'Scrap'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, processedRecords.length)} dari {processedRecords.length} baris
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-slate-700"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`size-7 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-slate-700"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom 3 Cards: Recent Scrap Events, Scrap Trend, Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Card 1: Recent Scrap Events (span 4) */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">Recent Scrap Events</h2>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {filteredRecords.length} events
                </span>
              </div>

              <div className="space-y-3">
                {filteredRecords.length > 0 ? (
                  filteredRecords.slice(0, 5).map((evt, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-xs pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="size-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {evt.serial_number} scrapped at {evt.site}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {evt.tire_size} &bull; {evt.scrap_reason} &bull; Actual: {formatNumber(evt.actual_life)} {selectedUnit === 'KM' ? 'km' : 'hrs'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0">{evt.scrap_date}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada event scrap terbaru
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Scrap Trend (Combined Bar + Line Dual Axis, span 5) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Scrap Trend</h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-xs bg-[#22c55e]" /> Scrap Tires
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#334155]" /> Average Life ({selectedUnit === 'KM' ? 'km' : 'hrs'})
                </span>
              </div>
            </div>

            <div className="h-52 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {dynamicCharts.scrap_trend.length > 0 ? (
                    <ComposedChart data={dynamicCharts.scrap_trend} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month_name" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v, name) => [
                          name === 'scrap_count' ? `${v} units` : `${formatNumber(v as number)} ${selectedUnit === 'KM' ? 'km' : 'hrs'}`,
                          name === 'scrap_count' ? 'Scrap Tires' : 'Average Life',
                        ]}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                      />
                      <Bar yAxisId="left" dataKey="scrap_count" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={20}>
                        <LabelList dataKey="scrap_count" position="top" style={{ fill: '#15803d', fontSize: 9, fontWeight: 700 }} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="avg_life" stroke="#334155" strokeWidth={2} dot={{ r: 3, fill: '#334155' }} />
                    </ComposedChart>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Tidak ada data trend bulanan
                    </div>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Card 3: Quick Actions (span 3) */}
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5 h-full">
              {/* Action 1: Log Scrap */}
              <button
                onClick={() => setIsLogScrapOpen(true)}
                className="flex flex-col justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white p-3 text-left transition-all shadow-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-white/20 flex items-center justify-center">
                    <Plus className="size-4 text-white" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm">Log Scrap</span>
                </div>
                <p className="text-[10px] text-emerald-100 font-medium mt-1">Record a scrap tire</p>
              </button>

              {/* Action 2: Export Report */}
              <button
                onClick={handleExportCSV}
                className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3 text-left transition-all shadow-2xs cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <FileSpreadsheet className="size-3.5" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">Export Report</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Download CSV</p>
              </button>

              {/* Action 3: Refresh CTS */}
              <button
                onClick={() => handleApplyFilter()}
                disabled={isLoading}
                className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3 text-left transition-all shadow-2xs cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">Sync CTS</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Fetch latest</p>
              </button>

              {/* Action 4: Analyze Cause */}
              <button
                onClick={() => setIsAnalyzeOpen(true)}
                className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3 text-left transition-all shadow-2xs cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <TrendingUp className="size-3.5" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">Analyze Cause</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Failure breakdown</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog 1: Log Scrap Tire Modal ── */}
      <Dialog open={isLogScrapOpen} onOpenChange={setIsLogScrapOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <TireIcon className="size-5 text-emerald-600" />
              Log Scrap Tire
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pencatatan ban scrap baru terhubung langsung dengan sistem tire management CTS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <p className="font-bold text-slate-800">Sinkronisasi CTS Online</p>
              <p className="mt-1">
                Gunakan aplikasi CTS Desktop / Web Portal untuk input data pergerakan movement scrap harian, data akan otomatis tersinkron ke dashboard ini.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsLogScrapOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Analyze Cause Breakdown Modal ── */}
      <Dialog open={isAnalyzeOpen} onOpenChange={setIsAnalyzeOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="size-5 text-emerald-600" />
              Scrap Reason Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Distribusi alasan kerusakan ban berdasarkan data CTS API.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {reasonChartData.map((r) => (
              <div key={r.name} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{r.name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-xs text-slate-950">{r.count} units</p>
                  <p className="text-[11px] text-slate-500 font-semibold">{r.pct}% dari total</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
