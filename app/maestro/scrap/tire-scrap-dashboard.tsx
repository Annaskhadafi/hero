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
  ChevronDown,
  Plus,
  Download,
  Database,
  TrendingUp,
  FileSpreadsheet,
  X,
  Check,
  Zap,
  SlidersHorizontal,
  ArrowUpDown,
  Building2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// SVG Tire Icon matching the screenshot
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
function formatNumber(num: number | string): string {
  if (num === null || num === undefined || num === '') return '0'
  const parts = num.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

// ── Raw Master & Scrap Tire Dataset ──
export interface ScrapTireRecord {
  id: string
  brand: string
  tireSize: string
  pattern: string
  unitEquipment: string
  site: string
  serialNumber: string
  installDate: string
  scrapDate: string
  actualLifeHours: number
  targetLifeHours: number
  achievementPct: number
  treadRemainingMm: number
  scrapReason: string
  failureCategory: string
  position: string
  status: 'Scrap'
}

const INITIAL_SCRAP_RECORDS: ScrapTireRecord[] = [
  {
    id: 'scrap-1',
    brand: 'Michelin',
    tireSize: '27.00R49',
    pattern: 'XDGRIP',
    unitEquipment: 'CAT 777E',
    site: 'BIB',
    serialNumber: 'MIC-270049-001',
    installDate: '12 Jan 2026',
    scrapDate: '18 Sep 2026',
    actualLifeHours: 5420,
    targetLifeHours: 6000,
    achievementPct: 90.3,
    treadRemainingMm: 18,
    scrapReason: 'Worn Out',
    failureCategory: 'Road Hazard',
    position: 'Front Right',
    status: 'Scrap',
  },
  {
    id: 'scrap-2',
    brand: 'Bridgestone',
    tireSize: '27.00R49',
    pattern: 'VRPS',
    unitEquipment: 'HD785-7',
    site: 'KPC',
    serialNumber: 'BRI-270049-014',
    installDate: '03 Feb 2026',
    scrapDate: '07 Sep 2026',
    actualLifeHours: 3850,
    targetLifeHours: 6000,
    achievementPct: 64.2,
    treadRemainingMm: 24,
    scrapReason: 'Sidewall Cut',
    failureCategory: 'Impact',
    position: 'Front Left',
    status: 'Scrap',
  },
  {
    id: 'scrap-3',
    brand: 'Goodyear',
    tireSize: '27.00R49',
    pattern: 'RM-4B+',
    unitEquipment: 'CAT 777G',
    site: 'MHU',
    serialNumber: 'GOO-270049-021',
    installDate: '25 Jan 2026',
    scrapDate: '10 Sep 2026',
    actualLifeHours: 4120,
    targetLifeHours: 6000,
    achievementPct: 68.7,
    treadRemainingMm: 20,
    scrapReason: 'Impact Break',
    failureCategory: 'Road Hazard',
    position: 'Rear Right',
    status: 'Scrap',
  },
  {
    id: 'scrap-4',
    brand: 'Michelin',
    tireSize: '24.00R35',
    pattern: 'XTRA DEFEND',
    unitEquipment: 'HD465-7',
    site: 'PPA',
    serialNumber: 'MIC-240035-008',
    installDate: '14 Mar 2026',
    scrapDate: '20 Sep 2026',
    actualLifeHours: 4780,
    targetLifeHours: 5500,
    achievementPct: 86.9,
    treadRemainingMm: 16,
    scrapReason: 'Cut Separation',
    failureCategory: 'Road Hazard',
    position: 'Front Left',
    status: 'Scrap',
  },
  {
    id: 'scrap-5',
    brand: 'Bridgestone',
    tireSize: '24.00R35',
    pattern: 'VMTP',
    unitEquipment: 'SANY SKT130S',
    site: 'BMB',
    serialNumber: 'BRI-240035-004',
    installDate: '08 Apr 2026',
    scrapDate: '26 Sep 2026',
    actualLifeHours: 5260,
    targetLifeHours: 5500,
    achievementPct: 95.6,
    treadRemainingMm: 10,
    scrapReason: 'Worn Out',
    failureCategory: 'Normal Wear',
    position: 'Rear Left',
    status: 'Scrap',
  },
  {
    id: 'scrap-6',
    brand: 'Yokohama',
    tireSize: '33.00R51',
    pattern: 'RL-51',
    unitEquipment: 'CAT 789D',
    site: 'BIB',
    serialNumber: 'YOK-330051-019',
    installDate: '18 Feb 2026',
    scrapDate: '12 Sep 2026',
    actualLifeHours: 4980,
    targetLifeHours: 5500,
    achievementPct: 90.5,
    treadRemainingMm: 14,
    scrapReason: 'Heat Separation',
    failureCategory: 'Thermal Overload',
    position: 'Rear Right',
    status: 'Scrap',
  },
  {
    id: 'scrap-7',
    brand: 'Michelin',
    tireSize: '27.00R49',
    pattern: 'XDGRIP',
    unitEquipment: 'CAT 777E',
    site: 'KPC',
    serialNumber: 'MIC-270049-033',
    installDate: '02 Mar 2026',
    scrapDate: '15 Sep 2026',
    actualLifeHours: 5120,
    targetLifeHours: 6000,
    achievementPct: 85.3,
    treadRemainingMm: 12,
    scrapReason: 'Tread Separation',
    failureCategory: 'Tread Fatigue',
    position: 'Front Right',
    status: 'Scrap',
  },
  {
    id: 'scrap-8',
    brand: 'Goodyear',
    tireSize: '21.00R35',
    pattern: 'EV-4S',
    unitEquipment: 'HD405',
    site: 'PPA',
    serialNumber: 'GOO-210035-011',
    installDate: '10 May 2026',
    scrapDate: '22 Sep 2026',
    actualLifeHours: 3650,
    targetLifeHours: 5000,
    achievementPct: 73.0,
    treadRemainingMm: 22,
    scrapReason: 'Bead Damage',
    failureCategory: 'Mounting Stress',
    position: 'Front Left',
    status: 'Scrap',
  },
]

// ── Chart Data definitions matching the screenshot ──
const BRAND_SCRAP_DATA = [
  { brand: 'Michelin', count: 42 },
  { brand: 'Bridgestone', count: 28 },
  { brand: 'Goodyear', count: 24 },
  { brand: 'Yokohama', count: 14 },
]

const REASON_DONUT_DATA = [
  { name: 'Cut Separation', count: 36, pct: 28, color: '#22c55e' },
  { name: 'Road Hazard', count: 20, pct: 16, color: '#06b6d4' },
  { name: 'Impact Break', count: 18, pct: 14, color: '#eab308' },
  { name: 'Sidewall Cut', count: 14, pct: 11, color: '#f97316' },
  { name: 'Worn Out', count: 12, pct: 9, color: '#ef4444' },
  { name: 'Tread Separation', count: 10, pct: 8, color: '#ec4899' },
  { name: 'Heat Separation', count: 8, pct: 6, color: '#38bdf8' },
  { name: 'Bead Damage', count: 6, pct: 5, color: '#a855f7' },
  { name: 'Run Flat', count: 6, pct: 5, color: '#94a3b8' },
  { name: 'Irregular Wear', count: 4, pct: 3, color: '#6366f1' },
]

const LIFE_COMPARISON_DATA = [
  { brand: 'Michelin', actual: 5200, target: 6000 },
  { brand: 'Bridgestone', actual: 4380, target: 6000 },
  { brand: 'Goodyear', actual: 4650, target: 6000 },
  { brand: 'Yokohama', actual: 4980, target: 5500 },
]

const SIZE_SCRAP_DATA = [
  { size: '27.00R49', count: 46 },
  { size: '24.00R35', count: 32 },
  { size: '33.00R51', count: 18 },
  { size: '21.00R35', count: 12 },
  { size: 'Others', count: 20 },
]

const TREND_DATA = [
  { month: 'Jan', scrap: 12, avgLife: 5100 },
  { month: 'Feb', scrap: 15, avgLife: 5050 },
  { month: 'Mar', scrap: 18, avgLife: 4950 },
  { month: 'Apr', scrap: 14, avgLife: 5200 },
  { month: 'May', scrap: 11, avgLife: 5300 },
  { month: 'Jun', scrap: 16, avgLife: 5150 },
  { month: 'Jul', scrap: 20, avgLife: 4900 },
  { month: 'Aug', scrap: 24, avgLife: 4750 },
  { month: 'Sep', scrap: 28, avgLife: 4850 },
]

const RECENT_EVENTS = [
  {
    title: 'MIC-270049-001 scrapped at BIB',
    subtitle: '27.00R49 | Worn Out | Actual Life: 5,420 hrs',
    date: '18 Sep 2026, 14:32',
  },
  {
    title: 'BRI-270049-014 scrapped at KPC',
    subtitle: '27.00R49 | Sidewall Cut | Actual Life: 3,850 hrs',
    date: '07 Sep 2026, 10:15',
  },
  {
    title: 'GOO-270049-021 scrapped at MHU',
    subtitle: '27.00R49 | Impact Break | Actual Life: 4,120 hrs',
    date: '10 Sep 2026, 16:48',
  },
  {
    title: 'MIC-240035-008 scrapped at PPA',
    subtitle: '24.00R35 | Cut Separation | Actual Life: 4,780 hrs',
    date: '20 Sep 2026, 09:21',
  },
]

interface TireScrapDashboardProps {
  customerName?: string
  userName?: string
}

export function TireScrapDashboard({
  customerName = 'PT Pamapersada Nusantara',
  userName = 'Ahmad D.',
}: TireScrapDashboardProps) {
  const [mounted, setMounted] = React.useState(false)

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSite, setSelectedSite] = React.useState('All Sites')
  const [selectedBrand, setSelectedBrand] = React.useState('All Brands')
  const [selectedSize, setSelectedSize] = React.useState('All Sizes')
  const [selectedPattern, setSelectedPattern] = React.useState('All Patterns')
  const [selectedPeriod, setSelectedPeriod] = React.useState('Jan 2026 - Sep 2026')
  const [selectedReason, setSelectedReason] = React.useState('All Reasons')

  // Table Data State
  const [records, setRecords] = React.useState<ScrapTireRecord[]>(INITIAL_SCRAP_RECORDS)
  const [showAllRows, setShowAllRows] = React.useState(false)

  // Dialog States
  const [isLogScrapOpen, setIsLogScrapOpen] = React.useState(false)
  const [isAddDataOpen, setIsAddDataOpen] = React.useState(false)
  const [isAnalyzeOpen, setIsAnalyzeOpen] = React.useState(false)

  // New Scrap Form State
  const [newScrap, setNewScrap] = React.useState({
    serialNumber: '',
    brand: 'Michelin',
    tireSize: '27.00R49',
    pattern: 'XDGRIP',
    unitEquipment: 'CAT 777E',
    site: 'BIB',
    actualLifeHours: '5000',
    targetLifeHours: '6000',
    scrapReason: 'Worn Out',
    failureCategory: 'Road Hazard',
    position: 'Front Right',
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Filtered Records based on user inputs
  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      if (selectedSite !== 'All Sites' && r.site !== selectedSite) return false
      if (selectedBrand !== 'All Brands' && r.brand !== selectedBrand) return false
      if (selectedSize !== 'All Sizes' && r.tireSize !== selectedSize) return false
      if (selectedPattern !== 'All Patterns' && r.pattern !== selectedPattern) return false
      if (selectedReason !== 'All Reasons' && r.scrapReason !== selectedReason) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const match =
          r.serialNumber.toLowerCase().includes(query) ||
          r.unitEquipment.toLowerCase().includes(query) ||
          r.site.toLowerCase().includes(query) ||
          r.brand.toLowerCase().includes(query) ||
          r.scrapReason.toLowerCase().includes(query) ||
          r.tireSize.toLowerCase().includes(query)
        if (!match) return false
      }

      return true
    })
  }, [records, selectedSite, selectedBrand, selectedSize, selectedPattern, selectedReason, searchQuery])

  const displayedRecords = showAllRows ? filteredRecords : filteredRecords.slice(0, 5)

  // Handler for Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Brand,Tire Size,Pattern,Unit/Equipment,Site,Serial Number,Install Date,Scrap Date,Actual Life (hrs),Target Life (hrs),Achievement (%),Tread Remaining (mm),Scrap Reason,Failure Category,Position,Status',
    ]
    const rows = filteredRecords.map((r) =>
      [
        `"${r.brand}"`,
        `"${r.tireSize}"`,
        `"${r.pattern}"`,
        `"${r.unitEquipment}"`,
        `"${r.site}"`,
        `"${r.serialNumber}"`,
        `"${r.installDate}"`,
        `"${r.scrapDate}"`,
        r.actualLifeHours,
        r.targetLifeHours,
        r.achievementPct,
        r.treadRemainingMm,
        `"${r.scrapReason}"`,
        `"${r.failureCategory}"`,
        `"${r.position}"`,
        `"${r.status}"`,
      ].join(','),
    )

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `tire_scrap_performance_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Data Scrap Tire berhasil diexport ke CSV!')
  }

  // Handler for adding a new scrap record
  const handleSaveScrap = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newScrap.serialNumber.trim()) {
      toast.error('Nomor Serial wajib diisi')
      return
    }

    const actual = Number(newScrap.actualLifeHours) || 4500
    const target = Number(newScrap.targetLifeHours) || 6000
    const pct = Math.round((actual / target) * 1000) / 10

    const record: ScrapTireRecord = {
      id: `scrap-${Date.now()}`,
      brand: newScrap.brand,
      tireSize: newScrap.tireSize,
      pattern: newScrap.pattern,
      unitEquipment: newScrap.unitEquipment,
      site: newScrap.site,
      serialNumber: newScrap.serialNumber.toUpperCase().trim(),
      installDate: '15 Jan 2026',
      scrapDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      actualLifeHours: actual,
      targetLifeHours: target,
      achievementPct: pct,
      treadRemainingMm: 15,
      scrapReason: newScrap.scrapReason,
      failureCategory: newScrap.failureCategory,
      position: newScrap.position,
      status: 'Scrap',
    }

    setRecords([record, ...records])
    setIsLogScrapOpen(false)
    toast.success(`Data Scrap untuk ${record.serialNumber} berhasil dicatat!`)
    setNewScrap({
      serialNumber: '',
      brand: 'Michelin',
      tireSize: '27.00R49',
      pattern: 'XDGRIP',
      unitEquipment: 'CAT 777E',
      site: 'BIB',
      actualLifeHours: '5000',
      targetLifeHours: '6000',
      scrapReason: 'Worn Out',
      failureCategory: 'Road Hazard',
      position: 'Front Right',
    })
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      {/* ── Top Bar with Global Search & User Profile (as seen in screenshot) ── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tires, equipment, sites, or serial numbers..."
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

          {/* Right Action: Notification & User Pill */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => toast.info('Tidak ada notifikasi scrap baru saat ini.')}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 size-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="size-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                AD
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">Ahmad D.</p>
                <p className="text-[11px] text-slate-500 font-medium">Operations Manager</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Workspace ── */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ── Page Header & Filter Controls ── */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Tire Scrap Performance
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Monitor tire scrap performance, life achievement, and scrap reasons across mining sites.
            </p>
          </div>

          {/* Filter Dropdowns matching screenshot */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Site */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Site</span>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="All Sites">All Sites</option>
                <option value="BIB">BIB</option>
                <option value="KPC">KPC</option>
                <option value="MHU">MHU</option>
                <option value="PPA">PPA</option>
                <option value="BMB">BMB</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Brand */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Brand</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="All Brands">All Brands</option>
                <option value="Michelin">Michelin</option>
                <option value="Bridgestone">Bridgestone</option>
                <option value="Goodyear">Goodyear</option>
                <option value="Yokohama">Yokohama</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Tire Size */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Tire Size</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="All Sizes">All Sizes</option>
                <option value="27.00R49">27.00R49</option>
                <option value="24.00R35">24.00R35</option>
                <option value="33.00R51">33.00R51</option>
                <option value="21.00R35">21.00R35</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Pattern */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Pattern</span>
              <select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="All Patterns">All Patterns</option>
                <option value="XDGRIP">XDGRIP</option>
                <option value="VRPS">VRPS</option>
                <option value="RM-4B+">RM-4B+</option>
                <option value="XTRA DEFEND">XTRA DEFEND</option>
                <option value="VMTP">VMTP</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Period */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Period</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Jan 2026 - Sep 2026">Jan 2026 - Sep 2026</option>
                <option value="Q3 2026">Q3 2026</option>
                <option value="Q2 2026">Q2 2026</option>
                <option value="Q1 2026">Q1 2026</option>
                <option value="Full Year 2025">Full Year 2025</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-[23px] size-3.5 text-slate-500" />
            </div>

            {/* Scrap Reason */}
            <div className="relative">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 ml-1">Scrap Reason</span>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="All Reasons">All Reasons</option>
                <option value="Cut Separation">Cut Separation</option>
                <option value="Road Hazard">Road Hazard</option>
                <option value="Impact Break">Impact Break</option>
                <option value="Sidewall Cut">Sidewall Cut</option>
                <option value="Worn Out">Worn Out</option>
                <option value="Tread Separation">Tread Separation</option>
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
                  <span className="text-2xl font-black text-slate-950">128</span>
                  <span className="text-xs font-bold text-slate-600">units</span>
                  <span className="inline-flex items-center text-xs font-bold text-rose-500">
                    <ArrowUp className="size-3 stroke-[3]" /> 12%
                  </span>
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
                  <span className="text-2xl font-black text-slate-950">4,850</span>
                  <span className="text-xs font-bold text-slate-600">hrs</span>
                  <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                    <ArrowUp className="size-3 stroke-[3]" /> 6%
                  </span>
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
                  <span className="text-2xl font-black text-slate-950">80.8%</span>
                  <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                    <ArrowUp className="size-3 stroke-[3]" /> 4.5%
                  </span>
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
                  <span className="text-xl sm:text-2xl font-black text-slate-950">Rp 3.2 Billion</span>
                  <span className="inline-flex items-center text-xs font-bold text-rose-500">
                    <ArrowUp className="size-3 stroke-[3]" /> 18%
                  </span>
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
                <p className="text-lg font-black text-slate-950 mt-0.5">Cut Separation</p>
                <p className="text-xs text-slate-500 font-semibold">36 units (28%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 Analytics Charts (Row) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Chart 1: Scrap by Brand */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Scrap by Brand</h2>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={BRAND_SCRAP_DATA} margin={{ top: 16, right: 10, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="brand" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => [`${v} units`, 'Scrap']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={34}>
                      <LabelList dataKey="count" position="top" style={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Scrap by Reason (Donut Chart + Legend) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Scrap by Reason</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] items-center gap-2">
              {/* Donut with center text */}
              <div className="relative h-44 w-full flex items-center justify-center">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={REASON_DONUT_DATA}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {REASON_DONUT_DATA.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name, item) => [`${val} units (${item.payload.pct}%)`, String(name)]}
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-black text-slate-950 leading-none">128</span>
                  <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Scrap Tires</span>
                </div>
              </div>

              {/* Legend list on the right */}
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1 text-[11px]">
                {REASON_DONUT_DATA.map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="truncate">{r.name}</span>
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
                <BarChart3 className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Target Life vs Actual Life</h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#22c55e]" /> Actual Life
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#cbd5e1]" /> Target Life
                </span>
              </div>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={LIFE_COMPARISON_DATA} margin={{ top: 16, right: 10, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="brand" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 8000]} ticks={[0, 2000, 4000, 6000, 8000]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v, name) => [`${formatNumber(v as number)} hrs`, name === 'actual' ? 'Actual Life' : 'Target Life']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                    />
                    <Bar dataKey="actual" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={16}>
                      <LabelList dataKey="actual" position="top" style={{ fill: '#15803d', fontSize: 9, fontWeight: 700 }} />
                    </Bar>
                    <Bar dataKey="target" fill="#cbd5e1" radius={[3, 3, 0, 0]} barSize={16}>
                      <LabelList dataKey="target" position="top" style={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 4: Scrap by Tire Size */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Scrap by Tire Size</h2>
            </div>
            <div className="h-48 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={SIZE_SCRAP_DATA} margin={{ top: 16, right: 10, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="size" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => [`${v} units`, 'Scrap Count']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                    />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={26}>
                      <LabelList dataKey="count" position="top" style={{ fill: '#334155', fontSize: 10, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrap Tire Detail Table Section ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="text-emerald-600">
                <TireIcon className="size-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Scrap Tire Detail</h2>
            </div>

            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              {showAllRows ? 'Show Less' : 'View All'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-600">
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 cursor-pointer">
                      Tire Size <ArrowUpDown className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-3 px-4">Pattern</th>
                  <th className="py-3 px-4">Unit / Equipment</th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 cursor-pointer">
                      Site <ArrowUpDown className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 cursor-pointer">
                      Install Date <ArrowUpDown className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 cursor-pointer">
                      Scrap Date <ArrowUpDown className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-3 px-4">Actual Life</th>
                  <th className="py-3 px-4">Target Life</th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 cursor-pointer">
                      Achievement <ArrowUpDown className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-3 px-4">Tread Remaining</th>
                  <th className="py-3 px-4">Scrap Reason</th>
                  <th className="py-3 px-4">Failure Category</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {displayedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-8 text-slate-400 font-medium">
                      Tidak ada data scrap tire yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  displayedRecords.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.brand}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{row.tireSize}</td>
                      <td className="py-3 px-4">{row.pattern}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{row.unitEquipment}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{row.site}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{row.serialNumber}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">{row.installDate}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">{row.scrapDate}</td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap">{formatNumber(row.actualLifeHours)} hrs</td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap text-slate-500">{formatNumber(row.targetLifeHours)} hrs</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                            row.achievementPct >= 80
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {row.achievementPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{row.treadRemainingMm} mm</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{row.scrapReason}</td>
                      <td className="py-3 px-4 text-slate-600">{row.failureCategory}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{row.position}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 text-rose-600 border border-rose-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                <button
                  onClick={() => toast.info('Menampilkan 4 event scrap terbaru.')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {RECENT_EVENTS.map((evt, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 text-xs pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="size-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{evt.title}</p>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{evt.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0">{evt.date}</span>
                  </div>
                ))}
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
                  <span className="size-2 rounded-full bg-[#334155]" /> Average Life (hrs)
                </span>
              </div>
            </div>

            <div className="h-52 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={TREND_DATA} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 8000]} ticks={[0, 2000, 4000, 6000, 8000]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v, name) => [
                        name === 'scrap' ? `${v} units` : `${formatNumber(v as number)} hrs`,
                        name === 'scrap' ? 'Scrap Tires' : 'Average Life',
                      ]}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                    />
                    <Bar yAxisId="left" dataKey="scrap" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={22}>
                      <LabelList dataKey="scrap" position="top" style={{ fill: '#15803d', fontSize: 9, fontWeight: 700 }} />
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="avgLife" stroke="#334155" strokeWidth={2} dot={{ r: 3, fill: '#334155' }} />
                  </ComposedChart>
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
                <p className="text-[10px] text-slate-500 font-medium mt-1">Download data</p>
              </button>

              {/* Action 3: Add Tire Data */}
              <button
                onClick={() => setIsAddDataOpen(true)}
                className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3 text-left transition-all shadow-2xs cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Database className="size-3.5" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-900">Add Tire Data</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Upload or input</p>
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
                <p className="text-[10px] text-slate-500 font-medium mt-1">Scrap reason analysis</p>
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
              Catat riwayat ban yang memasuki masa scrap untuk keperluan monitoring lifetime dan klaim garansi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveScrap} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Serial Number *</Label>
                <Input
                  required
                  placeholder="e.g. MIC-270049-099"
                  value={newScrap.serialNumber}
                  onChange={(e) => setNewScrap({ ...newScrap, serialNumber: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Unit / Equipment</Label>
                <Input
                  placeholder="e.g. CAT 777E"
                  value={newScrap.unitEquipment}
                  onChange={(e) => setNewScrap({ ...newScrap, unitEquipment: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Brand</Label>
                <select
                  value={newScrap.brand}
                  onChange={(e) => setNewScrap({ ...newScrap, brand: e.target.value })}
                  className="mt-1 w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                >
                  <option value="Michelin">Michelin</option>
                  <option value="Bridgestone">Bridgestone</option>
                  <option value="Goodyear">Goodyear</option>
                  <option value="Yokohama">Yokohama</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Tire Size</Label>
                <select
                  value={newScrap.tireSize}
                  onChange={(e) => setNewScrap({ ...newScrap, tireSize: e.target.value })}
                  className="mt-1 w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                >
                  <option value="27.00R49">27.00R49</option>
                  <option value="24.00R35">24.00R35</option>
                  <option value="33.00R51">33.00R51</option>
                  <option value="21.00R35">21.00R35</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Site</Label>
                <select
                  value={newScrap.site}
                  onChange={(e) => setNewScrap({ ...newScrap, site: e.target.value })}
                  className="mt-1 w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                >
                  <option value="BIB">BIB</option>
                  <option value="KPC">KPC</option>
                  <option value="MHU">MHU</option>
                  <option value="PPA">PPA</option>
                  <option value="BMB">BMB</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Actual Life (Hours)</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={newScrap.actualLifeHours}
                  onChange={(e) => setNewScrap({ ...newScrap, actualLifeHours: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Target Life (Hours)</Label>
                <Input
                  type="number"
                  placeholder="6000"
                  value={newScrap.targetLifeHours}
                  onChange={(e) => setNewScrap({ ...newScrap, targetLifeHours: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Scrap Reason</Label>
                <select
                  value={newScrap.scrapReason}
                  onChange={(e) => setNewScrap({ ...newScrap, scrapReason: e.target.value })}
                  className="mt-1 w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                >
                  <option value="Cut Separation">Cut Separation</option>
                  <option value="Road Hazard">Road Hazard</option>
                  <option value="Impact Break">Impact Break</option>
                  <option value="Sidewall Cut">Sidewall Cut</option>
                  <option value="Worn Out">Worn Out</option>
                  <option value="Tread Separation">Tread Separation</option>
                  <option value="Heat Separation">Heat Separation</option>
                  <option value="Bead Damage">Bead Damage</option>
                  <option value="Run Flat">Run Flat</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Position</Label>
                <select
                  value={newScrap.position}
                  onChange={(e) => setNewScrap({ ...newScrap, position: e.target.value })}
                  className="mt-1 w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-800"
                >
                  <option value="Front Right">Front Right</option>
                  <option value="Front Left">Front Left</option>
                  <option value="Rear Right">Rear Right</option>
                  <option value="Rear Left">Rear Left</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsLogScrapOpen(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                Simpan Log Scrap
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Add Tire Data (Batch / File) ── */}
      <Dialog open={isAddDataOpen} onOpenChange={setIsAddDataOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Database className="size-5 text-emerald-600" />
              Upload Tire Scrap Data
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Import file Excel (.xlsx) atau CSV dari sistem Fleet Tyre Management Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
              <FileSpreadsheet className="size-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Klik untuk upload atau drag and drop</p>
              <p className="text-[11px] text-slate-500 mt-1">Format yang didukung: .CSV, .XLSX (Max 10MB)</p>
              <input
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                id="file-upload"
                onChange={() => {
                  toast.success('File berhasil dipilih dan diverifikasi!')
                  setIsAddDataOpen(false)
                }}
              />
              <label
                htmlFor="file-upload"
                className="inline-block mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Pilih Berkas
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: Analyze Cause Deep-Dive Modal ── */}
      <Dialog open={isAnalyzeOpen} onOpenChange={setIsAnalyzeOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="size-5 text-emerald-600" />
              Scrap Reason Cause Analysis
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rekomendasi teknis Tyre Engineer HERO berdasarkan kegagalan dominan periode Jan-Sep 2026.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
              <div className="flex items-center justify-between">
                <span className="font-black text-rose-800 text-sm">1. Cut Separation (28% - 36 Units)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-900">High Risk</span>
              </div>
              <p className="mt-1 text-slate-700 leading-relaxed">
                Penyebab utama adalah batuan tajam di area loading point PIT BIB dan KPC. Disarankan peningkatan grader frequency dan inspeksi jalan angkut (haul road maintenance).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-800 text-sm">2. Road Hazard (16% - 20 Units)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">Moderate</span>
              </div>
              <p className="mt-1 text-slate-700 leading-relaxed">
                Insiden robekan akibat spillage batu. Rekomendasi: Pasang spillage clean-up kit di disposal dan dump area.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-black text-blue-800 text-sm">3. Impact Break (14% - 18 Units)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-200/80 text-blue-900">Operational</span>
              </div>
              <p className="mt-1 text-slate-700 leading-relaxed">
                Tekanan angin ban (TKPH) melebihi batas operasional pada saat unit bermuatan penuh. Rekomendasi kalibrasi rutin sensor TPMS tiap shift change.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button onClick={() => setIsAnalyzeOpen(false)} className="rounded-xl text-xs font-bold bg-slate-900 text-white">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
