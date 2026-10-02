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
  Minus,
  ChevronDown,
  Plus,
  FileSpreadsheet,
  X,
  Zap,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  Gauge,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Database,
  TrendingUp,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  fetchTireScrapPerformance,
  type TireScrapResponse,
  type TireScrapDetailRecord,
  type TireScrapRecentEvent,
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
  if (!val || val === 0) return 'Rp 0'
  if (val >= 1_000_000_000) {
    return `Rp ${(val / 1_000_000_000).toFixed(1)} Billion`
  }
  if (val >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toFixed(1)} Million`
  }
  return `Rp ${formatNumber(val)}`
}

// Color palette for charts
const REASON_COLORS = [
  '#22c55e', '#06b6d4', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#38bdf8', '#a855f7', '#6366f1', '#14b8a6',
  '#84cc16', '#f43f5e', '#8b5cf6', '#94a3b8',
]

// ── Sample Mock Data for Demonstration / Preview when CTS DB has 0 records ──
const SAMPLE_MOCK_DATA: TireScrapResponse = {
  status: 1,
  message: 'Sample Demo Data (CTS DB contains 0 records for current date filter)',
  filters: {
    site: 'All Sites',
    brand: 'All Brands',
    size: 'All Sizes',
    pattern: 'All Patterns',
    reason: 'All Reasons',
    period: 'Jan 2026 - Dec 2026',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    unit: 'HM',
  },
  summary: {
    total_scrap_tires: {
      value: 128,
      unit: 'units',
      change_percentage: 12,
      change_direction: 'negative',
      previous_value: 114,
    },
    average_tire_life: {
      value: 4850,
      unit: 'hrs',
      change_percentage: 6,
      change_direction: 'positive',
      previous_value: 4575,
    },
    life_achievement: {
      value: 80.8,
      unit: '%',
      change_percentage: 4.5,
      change_direction: 'positive',
      previous_value: 77.3,
    },
    estimated_scrap_loss: {
      value: 3200000000,
      formatted: 'Rp 3.2 Billion',
      change_percentage: 18,
      change_direction: 'negative',
      previous_value: 2710000000,
    },
    top_scrap_reason: {
      reason: 'Cut Separation',
      count: 36,
      percentage: 28,
    },
  },
  charts: {
    scrap_by_brand: [
      { brand: 'Michelin', count: 42 },
      { brand: 'Bridgestone', count: 28 },
      { brand: 'Goodyear', count: 24 },
      { brand: 'Yokohama', count: 14 },
      { brand: 'Continental', count: 12 },
      { brand: 'BKT', count: 8 },
    ],
    scrap_by_reason: [
      { reason: 'Cut Separation', count: 36, percentage: 28, category: 'Road Hazard' },
      { reason: 'Road Hazard', count: 20, percentage: 16, category: 'Road Hazard' },
      { reason: 'Impact Break', count: 18, percentage: 14, category: 'Impact' },
      { reason: 'Sidewall Cut', count: 14, percentage: 11, category: 'Road Hazard' },
      { reason: 'Worn Out', count: 12, percentage: 9, category: 'Normal Wear' },
      { reason: 'Tread Separation', count: 10, percentage: 8, category: 'Tread Fatigue' },
      { reason: 'Heat Separation', count: 8, percentage: 6, category: 'Thermal Overload' },
      { reason: 'Bead Damage', count: 6, percentage: 5, category: 'Mounting Stress' },
      { reason: 'Run Flat', count: 4, percentage: 3, category: 'Operational' },
    ],
    target_vs_actual_by_brand: [
      { brand: 'Michelin', actual_life: 5200, target_life: 6000, achievement: 86.7 },
      { brand: 'Bridgestone', actual_life: 4380, target_life: 6000, achievement: 73.0 },
      { brand: 'Goodyear', actual_life: 4650, target_life: 6000, achievement: 77.5 },
      { brand: 'Yokohama', actual_life: 4980, target_life: 5500, achievement: 90.5 },
      { brand: 'Continental', actual_life: 4720, target_life: 5500, achievement: 85.8 },
      { brand: 'BKT', actual_life: 4100, target_life: 5000, achievement: 82.0 },
    ],
    scrap_by_tire_size: [
      { size: '27.00R49', count: 46 },
      { size: '24.00R35', count: 32 },
      { size: '33.00R51', count: 18 },
      { size: '21.00R35', count: 12 },
      { size: '45/65R45', count: 10 },
      { size: 'Others', count: 10 },
    ],
    scrap_trend: [
      { month: 1, month_name: 'Jan', scrap_count: 12, avg_life: 5100 },
      { month: 2, month_name: 'Feb', scrap_count: 15, avg_life: 5050 },
      { month: 3, month_name: 'Mar', scrap_count: 18, avg_life: 4950 },
      { month: 4, month_name: 'Apr', scrap_count: 14, avg_life: 5200 },
      { month: 5, month_name: 'May', scrap_count: 11, avg_life: 5300 },
      { month: 6, month_name: 'Jun', scrap_count: 16, avg_life: 5150 },
      { month: 7, month_name: 'Jul', scrap_count: 20, avg_life: 4900 },
      { month: 8, month_name: 'Aug', scrap_count: 24, avg_life: 4750 },
      { month: 9, month_name: 'Sep', scrap_count: 28, avg_life: 4850 },
      { month: 10, month_name: 'Oct', scrap_count: 22, avg_life: 4920 },
      { month: 11, month_name: 'Nov', scrap_count: 19, avg_life: 5010 },
      { month: 12, month_name: 'Dec', scrap_count: 15, avg_life: 5180 },
    ],
  },
  recent_events: [
    {
      serial_number: 'MIC-270049-001',
      brand: 'Michelin',
      size: '27.00R49',
      reason: 'Worn Out',
      actual_life: 5420,
      site: 'BIB',
      date: '18 Sep 2026, 14:32',
      date_raw: '2026-09-18',
    },
    {
      serial_number: 'BRI-270049-014',
      brand: 'Bridgestone',
      size: '27.00R49',
      reason: 'Sidewall Cut',
      actual_life: 3850,
      site: 'KPC',
      date: '07 Sep 2026, 10:15',
      date_raw: '2026-09-07',
    },
    {
      serial_number: 'GOO-270049-021',
      brand: 'Goodyear',
      size: '27.00R49',
      reason: 'Impact Break',
      actual_life: 4120,
      site: 'MHU',
      date: '10 Sep 2026, 16:48',
      date_raw: '2026-09-10',
    },
    {
      serial_number: 'MIC-240035-008',
      brand: 'Michelin',
      size: '24.00R35',
      reason: 'Cut Separation',
      actual_life: 4780,
      site: 'PPA',
      date: '20 Sep 2026, 09:21',
      date_raw: '2026-09-20',
    },
  ],
  details: [
    {
      brand: 'Michelin',
      tire_size: '27.00R49',
      pattern: 'XDGRIP',
      unit_number: 'DT-777E-01',
      equipment: 'CAT 777E',
      site: 'BIB',
      serial_number: 'MIC-270049-001',
      install_date: '12 Jan 2026',
      scrap_date: '18 Sep 2026',
      actual_life: 5420,
      actual_life_text: '5,420 hrs',
      target_life: 6000,
      target_life_text: '6,000 hrs',
      achievement: 90.3,
      achievement_text: '90.3%',
      tread_remaining: 18,
      tread_remaining_text: '18 mm',
      scrap_reason: 'Worn Out',
      scrap_category: 'Road Hazard',
      position: 'Front Right (Pos 1)',
      status: 'Scrap',
      lossgain: -32000000,
    },
    {
      brand: 'Bridgestone',
      tire_size: '27.00R49',
      pattern: 'VRPS',
      unit_number: 'HD-785-12',
      equipment: 'HD785-7',
      site: 'KPC',
      serial_number: 'BRI-270049-014',
      install_date: '03 Feb 2026',
      scrap_date: '07 Sep 2026',
      actual_life: 3850,
      actual_life_text: '3,850 hrs',
      target_life: 6000,
      target_life_text: '6,000 hrs',
      achievement: 64.2,
      achievement_text: '64.2%',
      tread_remaining: 24,
      scrap_reason: 'Sidewall Cut',
      scrap_category: 'Impact',
      position: 'Front Left (Pos 2)',
      status: 'Scrap',
      lossgain: -85000000,
    },
    {
      brand: 'Goodyear',
      tire_size: '27.00R49',
      pattern: 'RM-4B+',
      unit_number: 'CAT-777G-04',
      equipment: 'CAT 777G',
      site: 'MHU',
      serial_number: 'GOO-270049-021',
      install_date: '25 Jan 2026',
      scrap_date: '10 Sep 2026',
      actual_life: 4120,
      actual_life_text: '4,120 hrs',
      target_life: 6000,
      target_life_text: '6,000 hrs',
      achievement: 68.7,
      achievement_text: '68.7%',
      tread_remaining: 20,
      scrap_reason: 'Impact Break',
      scrap_category: 'Road Hazard',
      position: 'Rear Right Outer (Pos 5)',
      status: 'Scrap',
      lossgain: -62000000,
    },
    {
      brand: 'Michelin',
      tire_size: '24.00R35',
      pattern: 'XTRA DEFEND',
      unit_number: 'HD-465-08',
      equipment: 'HD465-7',
      site: 'PPA',
      serial_number: 'MIC-240035-008',
      install_date: '14 Mar 2026',
      scrap_date: '20 Sep 2026',
      actual_life: 4780,
      actual_life_text: '4,780 hrs',
      target_life: 5500,
      target_life_text: '5,500 hrs',
      achievement: 86.9,
      achievement_text: '86.9%',
      tread_remaining: 16,
      scrap_reason: 'Cut Separation',
      scrap_category: 'Road Hazard',
      position: 'Front Left (Pos 2)',
      status: 'Scrap',
      lossgain: -28000000,
    },
    {
      brand: 'Bridgestone',
      tire_size: '24.00R35',
      pattern: 'VMTP',
      unit_number: 'SKT-130-02',
      equipment: 'SANY SKT130S',
      site: 'BMB',
      serial_number: 'BRI-240035-004',
      install_date: '08 Apr 2026',
      scrap_date: '26 Sep 2026',
      actual_life: 5260,
      actual_life_text: '5,260 hrs',
      target_life: 5500,
      target_life_text: '5,500 hrs',
      achievement: 95.6,
      achievement_text: '95.6%',
      tread_remaining: 10,
      scrap_reason: 'Worn Out',
      scrap_category: 'Normal Wear',
      position: 'Rear Left Inner (Pos 3)',
      status: 'Scrap',
      lossgain: -9000000,
    },
    {
      brand: 'Yokohama',
      tire_size: '33.00R51',
      pattern: 'RL-51',
      unit_number: 'CAT-789D-09',
      equipment: 'CAT 789D',
      site: 'BIB',
      serial_number: 'YOK-330051-019',
      install_date: '18 Feb 2026',
      scrap_date: '12 Sep 2026',
      actual_life: 4980,
      actual_life_text: '4,980 hrs',
      target_life: 5500,
      target_life_text: '5,500 hrs',
      achievement: 90.5,
      achievement_text: '90.5%',
      tread_remaining: 14,
      scrap_reason: 'Heat Separation',
      scrap_category: 'Thermal Overload',
      position: 'Rear Right Inner (Pos 4)',
      status: 'Scrap',
      lossgain: -35000000,
    },
    {
      brand: 'Michelin',
      tire_size: '27.00R49',
      pattern: 'XDGRIP',
      unit_number: 'CAT-777E-11',
      equipment: 'CAT 777E',
      site: 'KPC',
      serial_number: 'MIC-270049-033',
      install_date: '02 Mar 2026',
      scrap_date: '15 Sep 2026',
      actual_life: 5120,
      actual_life_text: '5,120 hrs',
      target_life: 6000,
      target_life_text: '6,000 hrs',
      achievement: 85.3,
      achievement_text: '85.3%',
      tread_remaining: 12,
      scrap_reason: 'Tread Separation',
      scrap_category: 'Tread Fatigue',
      position: 'Front Right (Pos 1)',
      status: 'Scrap',
      lossgain: -41000000,
    },
    {
      brand: 'Goodyear',
      tire_size: '21.00R35',
      pattern: 'EV-4S',
      unit_number: 'HD-405-03',
      equipment: 'HD405',
      site: 'PPA',
      serial_number: 'GOO-210035-011',
      install_date: '10 May 2026',
      scrap_date: '22 Sep 2026',
      actual_life: 3650,
      actual_life_text: '3,650 hrs',
      target_life: 5000,
      target_life_text: '5,000 hrs',
      achievement: 73.0,
      achievement_text: '73.0%',
      tread_remaining: 22,
      scrap_reason: 'Bead Damage',
      scrap_category: 'Mounting Stress',
      position: 'Front Left (Pos 2)',
      status: 'Scrap',
      lossgain: -48000000,
    },
  ],
  available_filters: {
    sites: ['AMM-BCP', 'BIB', 'CK-BIB GH', 'KPC', 'MHU', 'PAMA-BAYA', 'PPA', 'BMB'],
    brands: ['Michelin', 'Bridgestone', 'Goodyear', 'Yokohama', 'Continental', 'BKT', 'Belshina', 'Maxam'],
    sizes: ['27.00R49', '24.00R35', '33.00R51', '21.00R35', '45/65R45', '18.00R33'],
    patterns: ['XDGRIP', 'VRPS', 'RM-4B+', 'XTRA DEFEND', 'VMTP', 'RL-51', 'EV-4S'],
    reasons: ['Cut Separation', 'Road Hazard', 'Impact Break', 'Sidewall Cut', 'Worn Out', 'Tread Separation', 'Heat Separation', 'Bead Damage', 'Run Flat'],
  },
  pagination: {
    total_records: 8,
    limit: 50,
    offset: 0,
    page: 1,
    total_pages: 1,
  },
}

interface TireScrapDashboardProps {
  customerName?: string
  userName?: string
  initialData?: TireScrapResponse | null
  initialError?: string
}

export function TireScrapDashboard({
  customerName = 'PT Pamapersada Nusantara',
  userName = 'Ahmad D.',
  initialData,
  initialError,
}: TireScrapDashboardProps) {
  const [mounted, setMounted] = React.useState(false)

  // Raw API Response state
  const [apiData, setApiData] = React.useState<TireScrapResponse | null>(initialData || null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(initialError || null)

  // Simulation fallback mode (active by default if CTS API has 0 records so user sees full UI immediately)
  const [useSampleData, setUseSampleData] = React.useState<boolean>(() => {
    if (!initialData) return true
    const total = initialData.summary?.total_scrap_tires?.value || 0
    const records = initialData.details?.length || 0
    return total === 0 && records === 0
  })

  // Filter States
  const [selectedSite, setSelectedSite] = React.useState('All Sites')
  const [selectedBrand, setSelectedBrand] = React.useState('All Brands')
  const [selectedSize, setSelectedSize] = React.useState('All Sizes')
  const [selectedPattern, setSelectedPattern] = React.useState('All Patterns')
  const [selectedReason, setSelectedReason] = React.useState('All Reasons')
  const [selectedPeriod, setSelectedPeriod] = React.useState('2026')
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

  // Dynamic filter lists from CTS API (fallback to sample filters if empty)
  const filterOptions = React.useMemo(() => {
    const raw = apiData?.available_filters || SAMPLE_MOCK_DATA.available_filters
    return {
      sites: ['All Sites', ...(raw.sites || [])],
      brands: ['All Brands', ...(raw.brands || [])],
      sizes: ['All Sizes', ...(raw.sizes || [])],
      patterns: ['All Patterns', ...(raw.patterns || [])],
      reasons: ['All Reasons', ...(raw.reasons || [])],
    }
  }, [apiData])

  // Refetch function to query real CTS API with active filters
  const handleApplyFilter = React.useCallback(
    async (overrideParams: Partial<TireScrapFilterParams> = {}) => {
      setIsLoading(true)
      setApiError(null)

      try {
        const params: TireScrapFilterParams = {
          site: selectedSite,
          brand: selectedBrand,
          size: selectedSize,
          pattern: selectedPattern,
          reason: selectedReason,
          unit: selectedUnit,
          year: selectedPeriod === 'all' ? undefined : selectedPeriod,
          limit: 100,
          ...overrideParams,
        }

        const res = await fetchTireScrapPerformance(params)
        if (res.success && res.data) {
          setApiData(res.data)
          setCurrentPage(1)
          // If real API returns actual records, turn off demo mode
          if (res.data.summary?.total_scrap_tires?.value > 0 || res.data.details?.length > 0) {
            setUseSampleData(false)
          }
          toast.success('Data Tire Scrap berhasil disinkronkan dari CTS API')
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
    [selectedSite, selectedBrand, selectedSize, selectedPattern, selectedReason, selectedUnit, selectedPeriod]
  )

  // Current active data source based on toggle
  const activeData: TireScrapResponse = React.useMemo(() => {
    if (useSampleData) {
      return SAMPLE_MOCK_DATA
    }
    return apiData || SAMPLE_MOCK_DATA
  }, [useSampleData, apiData])

  // Summary KPIs
  const summary = activeData.summary || SAMPLE_MOCK_DATA.summary

  // Charts data
  const charts = activeData.charts || SAMPLE_MOCK_DATA.charts

  // Prepare Pie Chart Data for Scrap by Reason with colors
  const reasonChartData = React.useMemo(() => {
    const list = charts.scrap_by_reason || []
    return list.map((item, idx) => ({
      name: item.reason,
      count: item.count,
      pct: item.percentage,
      category: item.category,
      color: REASON_COLORS[idx % REASON_COLORS.length],
    }))
  }, [charts.scrap_by_reason])

  // Filtered & Sorted Table Records
  const processedRecords = React.useMemo(() => {
    let list: TireScrapDetailRecord[] = [...(activeData.details || [])]

    // Local client-side search query
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

    // Sort
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
  }, [activeData.details, searchQuery, sortColumn, sortDirection])

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
      {/* ── Top Bar with Global Search & Status ── */}
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
              <span className="text-[10px] text-slate-400 font-mono">({filterOptions.sites.length - 1} Sites)</span>
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

      {/* ── Main Dashboard Workspace ── */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Alert if Real CTS DB returns 0 rows */}
        {apiData && apiData.summary?.total_scrap_tires?.value === 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-sky-900 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-md bg-sky-100 text-sky-700 shrink-0 mt-0.5">
                <Database className="size-4" />
              </div>
              <div>
                <p className="font-bold text-sky-950">
                  Koneksi CTS API Aktif &bull; Data filter saat ini: 0 catatan scrap tire
                </p>
                <p className="text-sky-700 text-[11px] mt-0.5">
                  Database CTS terhubung dengan baik ({filterOptions.sites.length - 1} site, {filterOptions.brands.length - 1} brand). Data riil scrap pada periode atau kombinasi filter ini sedang kosong. Anda dapat menyalakan Data Simulasi untuk melihat visualisasi grafik penuh.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => setUseSampleData(!useSampleData)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  useSampleData
                    ? 'bg-sky-600 text-white shadow-xs hover:bg-sky-700'
                    : 'bg-white text-sky-800 border border-sky-300 hover:bg-sky-50'
                }`}
              >
                {useSampleData ? '✓ Mode Simulasi Aktif' : 'Tampilkan Data Simulasi'}
              </button>
            </div>
          </div>
        )}

        {/* ── Page Header & Interactive Filter Bar ── */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Tire Scrap Performance
              </h1>

              {/* Data Mode Switcher */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setUseSampleData(true)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    useSampleData
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📊 Data Simulasi (Lengkap)
                </button>
                <button
                  type="button"
                  onClick={() => setUseSampleData(false)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    !useSampleData
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌐 Data Real CTS (0 Data)
                </button>
              </div>
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
                  onClick={() => {
                    setSelectedUnit('HM')
                    handleApplyFilter({ unit: 'HM' })
                  }}
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
                  onClick={() => {
                    setSelectedUnit('KM')
                    handleApplyFilter({ unit: 'KM' })
                  }}
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
                className="h-9 max-w-[130px] sm:max-w-[150px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedBrand(val)
                  handleApplyFilter({ brand: val })
                }}
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
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedSize(val)
                  handleApplyFilter({ size: val })
                }}
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
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedPattern(val)
                  handleApplyFilter({ pattern: val })
                }}
                className="h-9 max-w-[120px] sm:max-w-[130px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedPeriod(val)
                  handleApplyFilter({ year: val === 'all' ? undefined : val })
                }}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="2026">Year 2026</option>
                <option value="2025">Year 2025</option>
                <option value="2024">Year 2024</option>
                <option value="2023">Year 2023</option>
                <option value="all">All Time</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Scrap Reason Filter */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Scrap Reason</span>
              <select
                value={selectedReason}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedReason(val)
                  handleApplyFilter({ reason: val })
                }}
                className="h-9 max-w-[130px] sm:max-w-[150px] truncate appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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

        {/* ── 5 Stat / KPI Cards (Row) ── */}
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
                  {summary.total_scrap_tires?.change_percentage !== 0 && (
                    <span
                      className={`inline-flex items-center text-xs font-bold ${
                        summary.total_scrap_tires?.change_direction === 'positive'
                          ? 'text-emerald-600'
                          : summary.total_scrap_tires?.change_direction === 'negative'
                          ? 'text-rose-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {summary.total_scrap_tires?.change_direction === 'positive' ? (
                        <ArrowUp className="size-3 stroke-[3]" />
                      ) : (
                        <ArrowDown className="size-3 stroke-[3]" />
                      )}
                      {summary.total_scrap_tires?.change_percentage}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">vs previous period</p>
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
                  {summary.average_tire_life?.change_percentage !== 0 && (
                    <span
                      className={`inline-flex items-center text-xs font-bold ${
                        summary.average_tire_life?.change_direction === 'positive'
                          ? 'text-emerald-600'
                          : 'text-rose-500'
                      }`}
                    >
                      <ArrowUp className="size-3 stroke-[3]" /> {summary.average_tire_life?.change_percentage}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">vs previous period</p>
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
                  {summary.life_achievement?.change_percentage !== 0 && (
                    <span
                      className={`inline-flex items-center text-xs font-bold ${
                        summary.life_achievement?.change_direction === 'positive'
                          ? 'text-emerald-600'
                          : 'text-rose-500'
                      }`}
                    >
                      <ArrowUp className="size-3 stroke-[3]" /> {summary.life_achievement?.change_percentage}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">vs previous period</p>
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
                  {summary.estimated_scrap_loss?.change_percentage !== 0 && (
                    <span className="inline-flex items-center text-xs font-bold text-rose-500">
                      <ArrowUp className="size-3 stroke-[3]" /> {summary.estimated_scrap_loss?.change_percentage}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">vs previous period</p>
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
                  {summary.top_scrap_reason?.reason || 'None'}
                </p>
                <p className="text-xs text-slate-500 font-semibold">
                  {summary.top_scrap_reason?.count || 0} units ({summary.top_scrap_reason?.percentage || 0}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 Analytics Charts (Row) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Chart 1: Scrap by Brand */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Scrap by Brand</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">{charts.scrap_by_brand?.length || 0} brands</span>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {charts.scrap_by_brand && charts.scrap_by_brand.length > 0 ? (
                    <BarChart data={charts.scrap_by_brand} margin={{ top: 16, right: 10, left: -22, bottom: 0 }}>
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
                  {charts.target_vs_actual_by_brand && charts.target_vs_actual_by_brand.length > 0 ? (
                    <BarChart data={charts.target_vs_actual_by_brand} margin={{ top: 16, right: 10, left: -16, bottom: 0 }}>
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
              <span className="text-[11px] text-slate-400 font-medium">{charts.scrap_by_tire_size?.length || 0} sizes</span>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  {charts.scrap_by_tire_size && charts.scrap_by_tire_size.length > 0 ? (
                    <BarChart data={charts.scrap_by_tire_size} margin={{ top: 16, right: 10, left: -22, bottom: 0 }}>
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

            <div className="flex items-center gap-2.5">
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
                  {activeData.recent_events?.length || 0} events
                </span>
              </div>

              <div className="space-y-3">
                {activeData.recent_events && activeData.recent_events.length > 0 ? (
                  activeData.recent_events.slice(0, 5).map((evt, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-xs pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="size-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {evt.serial_number} scrapped at {evt.site}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {evt.size} &bull; {evt.reason} &bull; Actual: {formatNumber(evt.actual_life)} {selectedUnit === 'KM' ? 'km' : 'hrs'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0">{evt.date}</span>
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
                  {charts.scrap_trend && charts.scrap_trend.length > 0 ? (
                    <ComposedChart data={charts.scrap_trend} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
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
                Fitur input scrap tire langsung ke database CTS sedang dalam mode integrasi read-write. Gunakan aplikasi CTS Desktop / Web Portal untuk input data pergerakan movement scrap harian.
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
                    <p className="text-[11px] text-slate-500">{r.category || 'General'}</p>
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
