'use client'

import { useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { classifyEwh, formatMinutesToHours, EWH_ACTIVITY_COLUMNS, parseDateYMD } from '@/lib/ewh/calculate-ewh'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Cell,
  Legend,
  ReferenceLine,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card'
import {
  createEwhTeamAction,
  updateEwhTeamAction,
  deleteEwhTeamAction,
  type EwhServicemanInfo,
  type EwhMatrixDayRow,
  type EwhSiteMonthlyMatrixResult,
  type EwhWeeklyBreakdownItem,
  type EwhMtdSummary,
  type EwhYtdMonthItem,
} from './actions'
import {
  Activity,
  BarChart2,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Download,
  Edit2,
  ArrowUpRight,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  LineChart as LineChartIcon,
  MapPin,
  PieChart as PieIcon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react'
import { HeroSearchableSelect } from '@/components/templates'

interface EwhRow {
  employeeId: number
  employeeName: string
  employeeSn: string
  section: string
  department: string
  shiftCode: string
  clockIn: string | null
  clockOut: string | null
  availabilityMinutes: number
  clockDurationMinutes: number
  breakMinutes: number
  effectiveMinutes: number
  idleMinutes: number
  ewhPercent: number
  ewhPercentStr: string
  activitySessionCount: number
  checkedItemCount: number
  totalItemCount: number
  overtimeMinutes: number
  workDate: Date
  period: string
  activityMap?: Partial<Record<string, number>>
  activitiesSummary?: Array<{ key: string; label: string; count: number }>
}

interface TeamMember {
  id: number
  employeeId: number
  role: string
  name: string
  employeeSn: string
  jobTitle: string
}

interface EwhTeam {
  id: number
  name: string
  siteId: number
  section: string
  createdAt: Date
  updatedAt: Date
  members: TeamMember[]
}

interface Props {
  monthlyMatrixData: EwhSiteMonthlyMatrixResult
  rows: EwhRow[]
  siteId: number | string | null
  departmentId?: number | null
  period: string
  employeeSiteId: number
  teams: EwhTeam[]
  allEmployees: {
    id: number
    name: string
    employeeSn: string
    jobTitle: string
    department: string
    section: string
  }[]
  allSites: { id: number; name: string }[]
  allDepartments: { id: number; code: string; name: string }[]
  initialTab?: string
}

const EWH_CLASS_CONFIG = {
  excellent: { label: 'Excellent', color: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  good: { label: 'Baik', color: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Cukup', color: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  low: { label: 'Rendah', color: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  absent: { label: 'Tidak Hadir', color: 'bg-slate-300', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500' },
}

export function EwhDashboardClient({
  monthlyMatrixData,
  rows,
  siteId,
  departmentId,
  period,
  teams,
  allEmployees,
  allSites,
  allDepartments,
  initialTab,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'matrix' | 'individual' | 'team'>(
    initialTab === 'individual' ? 'individual' : initialTab === 'team' ? 'team' : 'matrix'
  )

  // Period / Analytics View Mode: Harian (Daily), Mingguan (Weekly), MTD (Month to Date), YTD (Year to Date)
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'mtd' | 'ytd'>('daily')

  // Chart Type: 'bar' | 'line' | 'composed' | 'radar'
  const [chartType, setChartType] = useState<'bar' | 'line' | 'composed' | 'radar'>('bar')

  // Table Visibility Toggle: true = tampilkan, false = sembunyikan/collapse
  const [showTable, setShowTable] = useState<boolean>(true)

  // Powerman otomatis dari Master Data (Single Source of Truth)
  const currentPowerman = monthlyMatrixData.powerman || 1

  // Safe helper to extract day of month (1..31) from Date or string
  const getRowDay = (workDate: Date | string | null | undefined): number => {
    if (!workDate) return 0
    if (typeof workDate === 'string') {
      const match = workDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
      if (match) return parseInt(match[3], 10)
    }
    const parsed = parseDateYMD(workDate)
    return parsed ? parsed.day : 0
  }

  // Pre-index rows by day (1..31) for fast O(1) lookup on hover
  const rowsByDay = useMemo(() => {
    const map = new Map<number, EwhRow[]>()
    for (const r of rows) {
      const day = getRowDay(r.workDate)
      if (day > 0) {
        const list = map.get(day) ?? []
        list.push(r)
        map.set(day, list)
      }
    }
    return map
  }, [rows])

  // Search & Filter state for individual/team
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')

  // Powerman Manpower Dialog State
  const [isPowermanModalOpen, setIsPowermanModalOpen] = useState(false)
  const [powermanSearch, setPowermanSearch] = useState('')

  const servicemenList: EwhServicemanInfo[] = useMemo(() => {
    return monthlyMatrixData.servicemen || []
  }, [monthlyMatrixData.servicemen])

  const isAllSites = !monthlyMatrixData.siteId || monthlyMatrixData.siteName.toLowerCase().includes('semua')

  const filteredServicemen = useMemo(() => {
    if (!powermanSearch.trim()) return servicemenList
    const q = powermanSearch.toLowerCase()
    return servicemenList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.employeeSn.toLowerCase().includes(q) ||
        s.jobTitle.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q) ||
        (s.siteName && s.siteName.toLowerCase().includes(q))
    )
  }, [servicemenList, powermanSearch])

  // PDF Preview Modal State
  const [pdfPreviewState, setPdfPreviewState] = useState<{
    url: string
    filename: string
    title: string
  } | null>(null)

  const handleClosePdfPreview = () => {
    if (pdfPreviewState?.url) {
      URL.revokeObjectURL(pdfPreviewState.url)
    }
    setPdfPreviewState(null)
  }

  const handleDownloadPdfFromPreview = () => {
    if (!pdfPreviewState) return
    const a = document.createElement('a')
    a.href = pdfPreviewState.url
    a.download = pdfPreviewState.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('File PDF berhasil di-download!')
  }

  // Selected Day Manpower Detail Dialog state
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(null)
  const [daySearchQuery, setDaySearchQuery] = useState('')
  const [dayStatusFilter, setDayStatusFilter] = useState('all')

  // Selected Activity Detail Dialog state
  interface ActivityWorkerContribution {
    employeeId: number
    employeeName: string
    employeeSn: string
    section: string
    department?: string
    count: number
    hours: number
    clockHours: number
    ewhPercent: number
    activeDays: number[]
  }

  interface SelectedActivityModalState {
    title: string
    actKey: string
    scopeLabel: string
    totalVolume: number
    isDurasiKerja?: boolean
  }

  const [selectedActivityDetail, setSelectedActivityDetail] = useState<SelectedActivityModalState | null>(null)
  const [activitySearchQuery, setActivitySearchQuery] = useState('')

  // Selected Week Manpower Detail Dialog state
  const [selectedWeekDetail, setSelectedWeekDetail] = useState<number | null>(null)
  const [weekSearchQuery, setWeekSearchQuery] = useState('')

  // Selected Team Detail Dialog state
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<any | null>(null)
  const [teamDetailSearchQuery, setTeamDetailSearchQuery] = useState('')

  // Expanded employee for Rekap Individu detailing
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null)

  // Team Modal state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<EwhTeam | null>(null)
  const [teamName, setTeamName] = useState('')
  const [teamSection, setTeamSection] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [savingTeam, setSavingTeam] = useState(false)
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<EwhTeam | null>(null)

  // Selected Day Manpower filtered for Modal Dialog
  const selectedDayWorkers = useMemo(() => {
    if (selectedDayDetail === null) return []
    const dayRows = rowsByDay.get(selectedDayDetail) || []
    return dayRows.filter((worker) => {
      const q = daySearchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        worker.employeeName.toLowerCase().includes(q) ||
        worker.employeeSn.toLowerCase().includes(q) ||
        (worker.section || '').toLowerCase().includes(q) ||
        (worker.department || '').toLowerCase().includes(q)
      
      const ewhClass = classifyEwh(worker.ewhPercent)
      const matchStatus = dayStatusFilter === 'all' || ewhClass === dayStatusFilter
      return matchSearch && matchStatus
    })
  }, [selectedDayDetail, rowsByDay, daySearchQuery, dayStatusFilter])

  // Calculate live matrix: kolom durasiKerjaHours adalah total jam seluruh personil pada hari itu (jangan dibagi dulu).
  // Baris paling bawah baru memakai Formula Pembagi Kapasitas Standar Tambang (= SUM / 22 / Powerman).
  const liveMatrix = useMemo(() => {
    return monthlyMatrixData.matrix.map((r) => {
      const effectiveWorkers = r.workerCount || currentPowerman || 1
      const ewhHoursPerPerson = r.durasiKerjaHours > 0 && effectiveWorkers > 0
        ? Math.round((r.durasiKerjaHours / effectiveWorkers) * 100) / 100
        : 0
      const ewhRatio = ewhHoursPerPerson > 0 ? Math.round((ewhHoursPerPerson / 8.0) * 10000) / 100 : 0
      return {
        ...r,
        ewhHoursPerPerson,
        ewhRatioPercent: Math.round(ewhRatio * 100) / 100,
      }
    })
  }, [monthlyMatrixData.matrix, currentPowerman])

  // Total jam akumulasi bulanan: Total Durasi Aktivitas = SUM(Durasi Kerja 1..31)
  const totalDurasiHoursSum = useMemo(() => {
    return liveMatrix.reduce((sum, r) => sum + r.durasiKerjaHours, 0)
  }, [liveMatrix])

  // Formula Standar Tambang:
  // EWH (Jam/Orang) = Total Durasi Aktivitas / (Shift Kapasitas (22 Jam) × Powerman)
  const liveEwhAverage = useMemo(() => {
    const totalCapacity = 22 * currentPowerman
    if (totalCapacity <= 0) return 0
    return Math.round((totalDurasiHoursSum / totalCapacity) * 10) / 10
  }, [totalDurasiHoursSum, currentPowerman])

  // Matrix Hover Column Info Type
  type MatrixHoverColumnInfo =
    | { type: 'activity'; key: string; label: string; value: number }
    | { type: 'durasi'; label: string; value: string }
    | { type: 'date'; label: string; value?: string }

  // Helper function to render Contextual Minimalist HoverCard on matrix table cells
  const renderDayHoverCard = (
    row: EwhMatrixDayRow,
    dayWorkers: EwhRow[],
    columnInfo: MatrixHoverColumnInfo | null,
    children: React.ReactNode,
    className?: string
  ) => {
    // 1. ACTIVITY COLUMN CONTEXT
    if (columnInfo && columnInfo.type === 'activity') {
      const actKey = columnInfo.key
      const totalVolume = typeof columnInfo.value === 'number' ? columnInfo.value : 0
      let performers = dayWorkers.filter((w) => {
        const cnt = (w.activityMap && w.activityMap[actKey]) || 0
        return cnt > 0
      })
      if (performers.length === 0 && totalVolume > 0) {
        performers = dayWorkers.filter((w) => w.activitySessionCount > 0 || w.checkedItemCount > 0 || w.effectiveMinutes > 0)
      }

      return (
        <HoverCard openDelay={40} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div
              onClick={(e) => {
                e.stopPropagation()
                setSelectedDayDetail(row.day)
              }}
              className={`w-full h-full cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors ${className || ''}`}
            >
              {children}
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-lg bg-white overflow-hidden z-50 text-left"
          >
            {/* Header */}
            <div className="p-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10.5px] font-mono font-bold bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded">
                  Tgl {row.day}
                </span>
                <span className="text-xs font-bold text-slate-900 truncate">
                  {columnInfo.label}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                {totalVolume} Item
              </span>
            </div>

            {/* Performers Context Body */}
            {performers.length === 0 ? (
              <div className="p-3 text-center space-y-0.5 text-xs text-slate-500">
                <p className="font-medium text-slate-700">
                  {totalVolume > 0 ? `${totalVolume} item tercatat pada matriks` : 'Tidak ada log aktivitas pada tanggal ini'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {dayWorkers.filter((w) => w.clockDurationMinutes > 0).length} manpower hadir • Total: {row.durasiKerjaHours.toFixed(1)}h
                </p>
              </div>
            ) : (
              <div className="p-2.5 max-h-[240px] overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                {performers.map((w) => {
                  const hoursWork = (w.clockDurationMinutes / 60).toFixed(1)
                  const hoursEff = (w.effectiveMinutes / 60).toFixed(1)
                  const actCount = (w.activityMap && w.activityMap[actKey]) || (performers.length === 1 ? totalVolume : 1)

                  return (
                    <div key={w.employeeId} className="pt-1.5 first:pt-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {w.employeeName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shrink-0">
                          {actCount} item
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>
                          Hadir: {hoursWork}h • Efektif: <strong className="text-emerald-700 font-bold">{hoursEff}h</strong> ({w.ewhPercentStr || `${w.ewhPercent.toFixed(0)}%`})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/ewh/${w.employeeId}?period=${period}`)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                        >
                          Timeline →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      )
    }

    // 2. DURASI KERJA COLUMN CONTEXT
    if (columnInfo && columnInfo.type === 'durasi') {
      const activeWorkers = dayWorkers
        .filter((w) => w.clockDurationMinutes > 0)
        .sort((a, b) => b.effectiveMinutes - a.effectiveMinutes)

      return (
        <HoverCard openDelay={40} closeDelay={100}>
          <HoverCardTrigger asChild>
            <div
              onClick={(e) => {
                e.stopPropagation()
                setSelectedDayDetail(row.day)
              }}
              className={`w-full h-full cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors ${className || ''}`}
            >
              {children}
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            sideOffset={8}
            className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-lg bg-white overflow-hidden z-50 text-left"
          >
            {/* Header */}
            <div className="p-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-mono font-bold bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded">
                  Tgl {row.day}
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Durasi Jam Kerja
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                {row.durasiKerjaHours.toFixed(2)}h
              </span>
            </div>

            {/* Sub-bar */}
            <div className="px-2.5 py-1.5 bg-slate-100/60 border-b border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span>Rata-rata: <strong className="text-emerald-700">{row.ewhHoursPerPerson.toFixed(1)}h/org</strong> ({row.ewhRatioPercent}%)</span>
              <span>{activeWorkers.length} Manpower</span>
            </div>

            {/* Active Workers List */}
            <div className="p-2.5 max-h-[220px] overflow-y-auto space-y-1.5 divide-y divide-slate-100">
              {activeWorkers.length === 0 ? (
                <div className="text-center py-3 text-slate-400 text-xs">
                  Tidak ada kehadiran pada tanggal ini.
                </div>
              ) : (
                activeWorkers.map((w) => {
                  const hoursWork = (w.clockDurationMinutes / 60).toFixed(1)
                  const hoursEff = (w.effectiveMinutes / 60).toFixed(1)

                  return (
                    <div key={w.employeeId} className="pt-1.5 first:pt-0 flex items-center justify-between text-[10.5px]">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 block truncate">{w.employeeName}</span>
                        <span className="text-[9.5px] text-slate-500 font-mono">Hadir: {hoursWork}h • Efektif: {hoursEff}h</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/ewh/${w.employeeId}?period=${period}`)
                        }}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer shrink-0 ml-2"
                      >
                        Timeline →
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      )
    }

    // 3. DATE / GENERAL COLUMN CONTEXT
    const activeWorkers = dayWorkers.filter((w) => w.clockDurationMinutes > 0 || w.activitySessionCount > 0)
    const activeActivities = EWH_ACTIVITY_COLUMNS.filter((col) => {
      const v = (row as any)[col.key]
      return typeof v === 'number' && v > 0
    })

    return (
      <HoverCard openDelay={40} closeDelay={100}>
        <HoverCardTrigger asChild>
          <div
            onClick={(e) => {
              e.stopPropagation()
              setSelectedDayDetail(row.day)
            }}
            className={`w-full h-full cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors ${className || ''}`}
          >
            {children}
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-lg bg-white overflow-hidden z-50 text-left"
        >
          {/* Header */}
          <div className="p-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-mono font-bold bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded">
                Tgl {row.day}
              </span>
              <span className="text-xs font-bold text-slate-900">
                Ringkasan Hari
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              {activeWorkers.length} Hadir
            </span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white px-2 py-1.5 border-b border-slate-100 text-center text-xs">
            <div>
              <span className="block text-[9px] text-slate-400">Total Jam</span>
              <span className="font-bold text-slate-800 font-mono text-[11px]">{row.durasiKerjaHours.toFixed(1)}h</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400">Rata EWH</span>
              <span className="font-bold text-emerald-700 font-mono text-[11px]">{row.ewhHoursPerPerson.toFixed(1)}h</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400">Efisiensi</span>
              <span className="font-bold text-blue-700 font-mono text-[11px]">{row.ewhRatioPercent}%</span>
            </div>
          </div>

          {/* Activities Badges */}
          {activeActivities.length > 0 && (
            <div className="p-2 bg-slate-50/60 border-b border-slate-100 flex flex-wrap gap-1">
              {activeActivities.map((col) => {
                const val = (row as any)[col.key]
                return (
                  <span key={col.key} className="text-[9.5px] font-mono font-semibold bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-700">
                    {col.short}: <strong>{val}</strong>
                  </span>
                )
              })}
            </div>
          )}

          {/* Active Workers */}
          <div className="p-2.5 max-h-[160px] overflow-y-auto space-y-1 divide-y divide-slate-100">
            {activeWorkers.length === 0 ? (
              <div className="text-center py-3 text-slate-400 text-xs">
                Tidak ada aktivitas atau absensi pada tanggal ini.
              </div>
            ) : (
              activeWorkers.slice(0, 6).map((w) => {
                const hoursEff = (w.effectiveMinutes / 60).toFixed(1)
                return (
                  <div key={w.employeeId} className="pt-1 first:pt-0 flex items-center justify-between text-[10.5px]">
                    <span className="font-medium text-slate-800 truncate">{w.employeeName}</span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">{hoursEff}h</span>
                  </div>
                )
              })
            )}
            {activeWorkers.length > 6 && (
              <p className="text-[9.5px] text-slate-400 text-center pt-1">
                +{activeWorkers.length - 6} orang lainnya
              </p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  // Daily Trend Data for Line / Area / Composed Chart
  const dailyTrendData = useMemo(() => {
    return liveMatrix.map((r) => ({
      name: `Tgl ${r.day}`,
      day: r.day,
      dateStr: r.dateStr,
      durasiKerjaHours: r.durasiKerjaHours,
      ewhHoursPerPerson: r.ewhHoursPerPerson,
      ewhRatioPercent: r.ewhRatioPercent,
      workerCount: r.workerCount,
      targetEwh: 8.0,
    }))
  }, [liveMatrix])

  // Radar Activity Composition Data (12 Aktivitas)
  const radarActivityData = useMemo(() => {
    return monthlyMatrixData.chartData
      .filter((d) => d.name !== 'Durasi Kerja/Hours')
      .map((d) => ({
        subject: d.shortName,
        value: d.value,
        fullMark: Math.max(...monthlyMatrixData.chartData.map((c) => c.value), 10),
      }))
  }, [monthlyMatrixData.chartData])

  // Live Weekly Breakdown
  const liveWeeklyBreakdown = useMemo(() => {
    return monthlyMatrixData.weeklyBreakdown.map((w) => {
      const weekWorkDays = w.endDay - w.startDay + 1
      const weekRatio = currentPowerman > 0 ? (w.totalHours / (22 * currentPowerman * weekWorkDays)) * 100 : 0
      const weekEwhPerPerson = currentPowerman > 0 ? Math.round((w.totalHours / (22 * currentPowerman)) * 10) / 10 : 0
      return {
        ...w,
        ewhHoursPerPerson: weekEwhPerPerson,
        ewhRatioPercent: Math.round(weekRatio * 100) / 100,
        workerCount: currentPowerman,
        targetEwh: 8.0,
      }
    })
  }, [monthlyMatrixData.weeklyBreakdown, currentPowerman])

  // Aggregate workers for each week (Week 1..5)
  const weekWorkersByWeekNumber = useMemo(() => {
    const map = new Map<number, {
      employeeId: number
      employeeName: string
      employeeSn: string
      section: string
      totalClockMinutes: number
      totalEffectiveMinutes: number
      ewhSum: number
      workDays: number
      avgEwh: number
      activitySessionCount: number
      checkedItemCount: number
    }[]>()

    for (const w of liveWeeklyBreakdown) {
      const empMap = new Map<number, {
        employeeId: number
        employeeName: string
        employeeSn: string
        section: string
        totalClockMinutes: number
        totalEffectiveMinutes: number
        ewhSum: number
        workDays: number
        activitySessionCount: number
        checkedItemCount: number
      }>()

      for (const r of rows) {
        const day = getRowDay(r.workDate)
        if (day >= w.startDay && day <= w.endDay) {
          if (!empMap.has(r.employeeId)) {
            empMap.set(r.employeeId, {
              employeeId: r.employeeId,
              employeeName: r.employeeName,
              employeeSn: r.employeeSn,
              section: r.section || 'General',
              totalClockMinutes: 0,
              totalEffectiveMinutes: 0,
              ewhSum: 0,
              workDays: 0,
              activitySessionCount: 0,
              checkedItemCount: 0,
            })
          }
          const item = empMap.get(r.employeeId)!
          item.totalClockMinutes += r.clockDurationMinutes
          item.totalEffectiveMinutes += r.effectiveMinutes
          item.activitySessionCount += r.activitySessionCount
          item.checkedItemCount += r.checkedItemCount
          if (r.clockIn) {
            item.workDays += 1
            item.ewhSum += r.ewhPercent
          }
        }
      }

      const list = Array.from(empMap.values()).map((e) => ({
        ...e,
        avgEwh: e.workDays > 0 ? Math.round((e.ewhSum / e.workDays) * 100) / 100 : 0,
      }))
      map.set(w.weekNumber, list)
    }

    return map
  }, [liveWeeklyBreakdown, rows])

  // Helper to get workers who contributed to a specific activity across a given scope (Month, Cutoff, or Week)
  const getActivityContributors = (
    actKey: string,
    options?: { cutoffDay?: number; weekNumber?: number }
  ): ActivityWorkerContribution[] => {
    const isDurasi = actKey === 'durasiKerjaHours' || actKey.toLowerCase().includes('durasi')
    const empMap = new Map<number, ActivityWorkerContribution>()

    // Determine week bounds if weekNumber is given
    let startDay = 1
    let endDay = 31
    if (options?.weekNumber) {
      const wk = liveWeeklyBreakdown.find((w) => w.weekNumber === options.weekNumber)
      if (wk) {
        startDay = wk.startDay
        endDay = wk.endDay
      }
    } else if (options?.cutoffDay) {
      endDay = options.cutoffDay
    }

    for (const r of rows) {
      const day = getRowDay(r.workDate)
      if (day < startDay || day > endDay) continue

      if (isDurasi) {
        if (r.effectiveMinutes > 0 || r.clockDurationMinutes > 0) {
          if (!empMap.has(r.employeeId)) {
            empMap.set(r.employeeId, {
              employeeId: r.employeeId,
              employeeName: r.employeeName,
              employeeSn: r.employeeSn,
              section: r.section || 'General',
              department: r.department,
              count: 1,
              hours: 0,
              clockHours: 0,
              ewhPercent: 0,
              activeDays: [],
            })
          }
          const item = empMap.get(r.employeeId)!
          item.hours += r.effectiveMinutes / 60
          item.clockHours += r.clockDurationMinutes / 60
          item.ewhPercent += r.ewhPercent
          if (!item.activeDays.includes(day)) item.activeDays.push(day)
        }
      } else {
        const directCount = (r.activityMap && r.activityMap[actKey]) || 0
        const summaryCount = r.activitiesSummary?.find((a) => a.key === actKey)?.count || 0
        const cnt = directCount || summaryCount

        if (cnt > 0) {
          if (!empMap.has(r.employeeId)) {
            empMap.set(r.employeeId, {
              employeeId: r.employeeId,
              employeeName: r.employeeName,
              employeeSn: r.employeeSn,
              section: r.section || 'General',
              department: r.department,
              count: 0,
              hours: 0,
              clockHours: 0,
              ewhPercent: 0,
              activeDays: [],
            })
          }
          const item = empMap.get(r.employeeId)!
          item.count += cnt
          item.hours += r.effectiveMinutes / 60
          item.clockHours += r.clockDurationMinutes / 60
          item.ewhPercent += r.ewhPercent
          if (!item.activeDays.includes(day)) item.activeDays.push(day)
        }
      }
    }

    // Fallback: If no direct activityMap mapping exists but activity volume > 0, include servicemen with attendance
    if (!isDurasi && empMap.size === 0) {
      for (const r of rows) {
        const day = getRowDay(r.workDate)
        if (day < startDay || day > endDay) continue
        if (r.activitySessionCount > 0 || r.checkedItemCount > 0 || r.effectiveMinutes > 0) {
          if (!empMap.has(r.employeeId)) {
            empMap.set(r.employeeId, {
              employeeId: r.employeeId,
              employeeName: r.employeeName,
              employeeSn: r.employeeSn,
              section: r.section || 'General',
              department: r.department,
              count: r.activitySessionCount || 1,
              hours: r.effectiveMinutes / 60,
              clockHours: r.clockDurationMinutes / 60,
              ewhPercent: r.ewhPercent,
              activeDays: [day],
            })
          } else {
            const item = empMap.get(r.employeeId)!
            item.count += r.activitySessionCount || 1
            item.hours += r.effectiveMinutes / 60
            item.clockHours += r.clockDurationMinutes / 60
            if (!item.activeDays.includes(day)) item.activeDays.push(day)
          }
        }
      }
    }

    // Secondary fallback: if still empty and servicemen list exists, display servicemen
    if (empMap.size === 0 && servicemenList.length > 0) {
      for (const s of servicemenList) {
        empMap.set(s.id, {
          employeeId: s.id,
          employeeName: s.name,
          employeeSn: s.employeeSn,
          section: s.section || 'General',
          department: s.department,
          count: 0,
          hours: 0,
          clockHours: 0,
          ewhPercent: 0,
          activeDays: [],
        })
      }
    }

    const list = Array.from(empMap.values())
    if (isDurasi) {
      return list.sort((a, b) => b.hours - a.hours)
    }
    return list.sort((a, b) => b.count - a.count || b.hours - a.hours)
  }

  const handleOpenActivityDetail = (
    actKeyOrName: string,
    options?: {
      weekNumber?: number
      cutoffDay?: number
      scopeLabel?: string
      title?: string
      totalVolume?: number
      isDurasiKerja?: boolean
    }
  ) => {
    const foundCol = EWH_ACTIVITY_COLUMNS.find(
      (c) =>
        c.key === actKeyOrName ||
        c.label.toLowerCase() === actKeyOrName.toLowerCase() ||
        c.short.toLowerCase() === actKeyOrName.toLowerCase()
    )
    const isDurasi =
      options?.isDurasiKerja ||
      actKeyOrName === 'durasiKerjaHours' ||
      actKeyOrName.toLowerCase().includes('durasi')

    const actKey = foundCol ? foundCol.key : isDurasi ? 'durasiKerjaHours' : actKeyOrName
    const title = options?.title || foundCol?.label || (isDurasi ? 'Durasi Kerja / Hours' : actKeyOrName)

    let scopeLabel = options?.scopeLabel || `Bulan ${period}`
    if (options?.weekNumber) {
      scopeLabel = options.scopeLabel || `Minggu ${options.weekNumber}`
    } else if (options?.cutoffDay) {
      scopeLabel = options.scopeLabel || `Cut-off Tgl 1 s/d ${options.cutoffDay}`
    }

    let totalVolume = options?.totalVolume
    if (totalVolume === undefined) {
      const chartItem = monthlyMatrixData.chartData.find((c) => c.actKey === actKey || c.name === title)
      totalVolume = chartItem ? chartItem.value : 0
    }

    setSelectedActivityDetail({
      title,
      actKey,
      scopeLabel,
      totalVolume,
      isDurasiKerja: isDurasi,
    })
    setActivitySearchQuery('')
  }

  const filteredActivityWorkers = useMemo(() => {
    if (!selectedActivityDetail) return []
    const workers = getActivityContributors(selectedActivityDetail.actKey, {
      cutoffDay: selectedActivityDetail.scopeLabel.includes('Cut-off')
        ? monthlyMatrixData.mtdSummary?.cutoffDay
        : undefined,
      weekNumber: selectedActivityDetail.scopeLabel.includes('Minggu')
        ? parseInt(selectedActivityDetail.scopeLabel.replace(/\D/g, ''), 10) || undefined
        : undefined,
    })
    if (!activitySearchQuery.trim()) return workers
    const q = activitySearchQuery.toLowerCase()
    return workers.filter(
      (w) =>
        w.employeeName.toLowerCase().includes(q) ||
        w.employeeSn.toLowerCase().includes(q) ||
        w.section.toLowerCase().includes(q)
    )
  }, [selectedActivityDetail, activitySearchQuery, rows, liveWeeklyBreakdown, monthlyMatrixData.mtdSummary])

  const selectedWeekWorkers = useMemo(() => {
    if (selectedWeekDetail === null) return []
    const workers = weekWorkersByWeekNumber.get(selectedWeekDetail) || []
    if (!weekSearchQuery.trim()) return workers
    const q = weekSearchQuery.toLowerCase()
    return workers.filter(
      (w) =>
        w.employeeName.toLowerCase().includes(q) ||
        w.employeeSn.toLowerCase().includes(q) ||
        w.section.toLowerCase().includes(q)
    )
  }, [selectedWeekDetail, weekSearchQuery, weekWorkersByWeekNumber])

  // Custom Chart Tooltips
  const ActivityChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload
    const actKey = data.actKey || data.key || 'mounting'
    const isDurasi = actKey === 'durasiKerjaHours' || (data.name && data.name.includes('Durasi'))
    const contributors = getActivityContributors(actKey, {
      cutoffDay: viewMode === 'mtd' ? monthlyMatrixData.mtdSummary?.cutoffDay : undefined,
    })
    const topContributors = contributors.slice(0, 5)

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/80 shadow-2xl max-w-xs text-xs z-50">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/70 pb-1.5 mb-2">
          <span className="font-bold text-slate-100 truncate">{data.name || data.subject}</span>
          <span className="font-mono font-black text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded text-[11px] shrink-0">
            {isDurasi ? `${data.value} Jam` : `${data.value} Item`}
          </span>
        </div>
        <div className="text-[10px] text-slate-300 font-semibold mb-1 flex items-center justify-between">
          <span>Kontributor Personil ({contributors.length} Orang):</span>
        </div>
        {contributors.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-1 italic">
            Belum ada log personil individual untuk aktivitas ini.
          </div>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {topContributors.map((c, i) => (
              <div key={c.employeeId} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="truncate text-slate-200">
                  <span className="text-slate-500 font-mono mr-1">{i + 1}.</span>
                  {c.employeeName}
                </span>
                <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0">
                  {isDurasi ? `${c.hours.toFixed(1)}h` : `${c.count}x`}
                </span>
              </div>
            ))}
            {contributors.length > 5 && (
              <div className="text-[10px] text-slate-400 pt-1 text-center font-medium">
                +{contributors.length - 5} personil lainnya...
              </div>
            )}
          </div>
        )}
        <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-blue-300 flex items-center gap-1">
          <span>💡 Klik diagram untuk melihat rincian personil</span>
        </div>
      </div>
    )
  }

  const DailyTrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload
    const day = typeof data.day === 'number' ? data.day : parseInt(String(label).replace(/\D/g, ''), 10) || 1
    const dayRows = rowsByDay.get(day) || []
    const activeWorkers = dayRows
      .filter((w) => w.clockDurationMinutes > 0 || w.effectiveMinutes > 0)
      .sort((a, b) => b.effectiveMinutes - a.effectiveMinutes)
    const topWorkers = activeWorkers.slice(0, 5)

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/80 shadow-2xl max-w-xs text-xs z-50">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/70 pb-1.5 mb-2">
          <span className="font-bold text-slate-100">Tgl {day} ({data.dateStr || `${day}/${period}`})</span>
          <span className="font-mono font-black text-emerald-400 text-[11px] shrink-0">
            {data.durasiKerjaHours || data.hours || 0} Jam
          </span>
        </div>
        <div className="text-[10px] text-slate-300 font-semibold mb-1 flex items-center justify-between">
          <span>Personil Hadir ({activeWorkers.length} Orang):</span>
          <span className="font-mono text-slate-400 text-[9.5px]">EWH: {data.ewhHoursPerPerson || 0}h/org</span>
        </div>
        {activeWorkers.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-1 italic">
            Tidak ada personil aktif pada tanggal ini.
          </div>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {topWorkers.map((w, i) => (
              <div key={w.employeeId} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="truncate text-slate-200">
                  <span className="text-slate-500 font-mono mr-1">{i + 1}.</span>
                  {w.employeeName}
                </span>
                <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0">
                  {(w.effectiveMinutes / 60).toFixed(1)}h ({w.ewhPercentStr || `${w.ewhPercent.toFixed(0)}%`})
                </span>
              </div>
            ))}
            {activeWorkers.length > 5 && (
              <div className="text-[10px] text-slate-400 pt-1 text-center font-medium">
                +{activeWorkers.length - 5} personil lainnya...
              </div>
            )}
          </div>
        )}
        <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-blue-300 flex items-center gap-1">
          <span>💡 Klik titik grafik untuk melihat rincian personil</span>
        </div>
      </div>
    )
  }

  const WeeklyChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload
    const weekNumber = data.weekNumber || 1
    const weekWorkers = weekWorkersByWeekNumber.get(weekNumber) || []
    const topWorkers = weekWorkers.slice(0, 5)

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/80 shadow-2xl max-w-xs text-xs z-50">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/70 pb-1.5 mb-2">
          <span className="font-bold text-slate-100">{data.label} (Tgl {data.startDay}–{data.endDay})</span>
          <span className="font-mono font-black text-blue-400 text-[11px] shrink-0">
            {Number(data.totalHours || 0).toFixed(1)} Jam
          </span>
        </div>
        <div className="text-[10px] text-slate-300 font-semibold mb-1 flex items-center justify-between">
          <span>Personil Aktif ({weekWorkers.length} Orang):</span>
          <span className="font-mono text-emerald-400 text-[9.5px]">Rata: {Number(data.ewhHoursPerPerson || 0).toFixed(1)}h/org</span>
        </div>
        {weekWorkers.length === 0 ? (
          <div className="text-[11px] text-slate-400 py-1 italic">
            Tidak ada personil aktif pada minggu ini.
          </div>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {topWorkers.map((w, i) => (
              <div key={w.employeeId} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="truncate text-slate-200">
                  <span className="text-slate-500 font-mono mr-1">{i + 1}.</span>
                  {w.employeeName}
                </span>
                <span className="font-mono font-bold text-emerald-400 ml-2 shrink-0">
                  {(w.totalEffectiveMinutes / 60).toFixed(1)}h ({w.avgEwh.toFixed(1)}%)
                </span>
              </div>
            ))}
            {weekWorkers.length > 5 && (
              <div className="text-[10px] text-slate-400 pt-1 text-center font-medium">
                +{weekWorkers.length - 5} personil lainnya...
              </div>
            )}
          </div>
        )}
        <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-blue-300 flex items-center gap-1">
          <span>💡 Klik diagram untuk melihat rincian personil</span>
        </div>
      </div>
    )
  }

  const YtdChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0].payload
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl border border-slate-700/80 shadow-2xl max-w-xs text-xs z-50">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/70 pb-1.5 mb-2">
          <span className="font-bold text-slate-100">{data.monthName} ({data.period})</span>
          <span className="font-mono font-black text-indigo-400 text-[11px] shrink-0">
            {Number(data.totalHours || 0).toFixed(1)} Jam
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] py-1">
          <div className="bg-slate-800/80 p-1.5 rounded">
            <span className="text-slate-400 block">Powerman:</span>
            <span className="font-bold font-mono text-slate-100">{data.powerman || currentPowerman} Orang</span>
          </div>
          <div className="bg-slate-800/80 p-1.5 rounded">
            <span className="text-slate-400 block">Rata-rata EWH:</span>
            <span className="font-bold font-mono text-emerald-400">{Number(data.monthlyEwhAverage || 0).toFixed(1)}h/org</span>
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-blue-300 flex items-center gap-1">
          <span>💡 Klik diagram untuk membuka daftar manpower site</span>
        </div>
      </div>
    )
  }

  // Weekly Radar Data (Week 1..5 Comparison)
  const weeklyRadarData = useMemo(() => {
    return liveWeeklyBreakdown.map((w) => ({
      subject: w.label,
      value: Number(w.totalHours.toFixed(1)),
      ewh: Number(w.ewhHoursPerPerson.toFixed(1)),
      fullMark: Math.max(...liveWeeklyBreakdown.map((wb) => wb.totalHours), 10),
    }))
  }, [liveWeeklyBreakdown])

  // MTD Daily Trend Data (Filtered up to cutoffDay)
  const mtdDailyTrendData = useMemo(() => {
    const cutoff = monthlyMatrixData.mtdSummary?.cutoffDay ?? 31
    return dailyTrendData.filter((d) => d.day <= cutoff)
  }, [dailyTrendData, monthlyMatrixData.mtdSummary?.cutoffDay])

  // Live YTD Months
  const liveYtdMonths = useMemo(() => {
    return monthlyMatrixData.ytdSummary.months.map((m) => {
      const mDays = new Date(monthlyMatrixData.ytdSummary.year, m.monthIndex, 0).getDate()
      const eff = currentPowerman > 0 && mDays > 0
        ? Math.round((m.totalHours / (22 * currentPowerman * mDays)) * 10000) / 100
        : 0
      const ewhAvg = currentPowerman > 0 ? Math.round((m.totalHours / 22 / currentPowerman) * 10) / 10 : 0
      return {
        ...m,
        shortName: m.shortMonth,
        ewhAverage: ewhAvg,
        efficiencyPercent: eff,
        targetEwh: 8.0,
      }
    })
  }, [monthlyMatrixData.ytdSummary, currentPowerman])

  // YTD Radar Data (12 Months Comparison)
  const ytdRadarData = useMemo(() => {
    return liveYtdMonths.map((m) => ({
      subject: m.shortMonth,
      value: Number(m.totalHours.toFixed(1)),
      ewh: Number(m.ewhAverage.toFixed(1)),
      fullMark: Math.max(...liveYtdMonths.map((ym) => ym.totalHours), 10),
    }))
  }, [liveYtdMonths])

  // Aggregate EWH per Employee for individual tab
  const employeeAggregates = useMemo(() => {
    const map = new Map<number, {
      employeeId: number
      employeeName: string
      employeeSn: string
      section: string
      department: string
      totalEffectiveMinutes: number
      totalClockMinutes: number
      totalOvertimeMinutes: number
      workDays: number
      ewhSum: number
      snapshots: EwhRow[]
    }>()

    for (const r of rows) {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          employeeSn: r.employeeSn,
          section: r.section || 'General',
          department: r.department || 'Operations',
          totalEffectiveMinutes: 0,
          totalClockMinutes: 0,
          totalOvertimeMinutes: 0,
          workDays: 0,
          ewhSum: 0,
          snapshots: [],
        })
      }
      const entry = map.get(r.employeeId)!
      entry.totalEffectiveMinutes += r.effectiveMinutes
      entry.totalClockMinutes += r.clockDurationMinutes
      entry.totalOvertimeMinutes += r.overtimeMinutes
      if (r.clockIn) {
        entry.workDays += 1
        entry.ewhSum += r.ewhPercent
      }
      entry.snapshots.push(r)
    }

    return Array.from(map.values()).map((e) => {
      const avgEwh = e.workDays > 0 ? e.ewhSum / e.workDays : 0
      const ewhClass = classifyEwh(avgEwh) as keyof typeof EWH_CLASS_CONFIG
      return {
        ...e,
        avgEwh: Math.round(avgEwh * 100) / 100,
        ewhClass,
      }
    })
  }, [rows])

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employeeAggregates.filter((e) => {
      const matchSearch =
        !search ||
        e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeSn.toLowerCase().includes(search.toLowerCase())
      const matchSection = sectionFilter === 'all' || e.section === sectionFilter
      return matchSearch && matchSection
    })
  }, [employeeAggregates, search, sectionFilter])

  const [empSortField, setEmpSortField] = useState<string>("avgEwh")
  const [empSortDir, setEmpSortDir] = useState<"asc" | "desc">("desc")

  const handleEmpSort = (field: string) => {
    if (empSortField === field) {
      setEmpSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setEmpSortField(field)
      setEmpSortDir("asc")
    }
  }

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let aVal = (a as any)[empSortField]
      let bVal = (b as any)[empSortField]
      if (empSortField === "workDays" || empSortField === "totalEffectiveMinutes" || empSortField === "totalOvertimeMinutes" || empSortField === "avgEwh") {
        aVal = Number(aVal || 0)
        bVal = Number(bVal || 0)
      } else {
        aVal = String(aVal || "").toLowerCase()
        bVal = String(bVal || "").toLowerCase()
      }
      if (aVal < bVal) return empSortDir === "asc" ? -1 : 1
      if (aVal > bVal) return empSortDir === "asc" ? 1 : -1
      return 0
    })
  }, [filteredEmployees, empSortField, empSortDir])

  const siteSelectOptions = useMemo(() => [
    { value: "ALL", label: "Semua Site" },
    ...allSites.map((s) => ({ value: String(s.id), label: s.name }))
  ], [allSites])

  const deptSelectOptions = useMemo(() => [
    { value: "ALL", label: "Semua Departemen" },
    ...allDepartments.map((d) => ({ value: String(d.id), label: d.name }))
  ], [allDepartments])

  // Aggregate EWH per Team
  const teamAggregates = useMemo(() => {
    return teams.map((team) => {
      const memberIds = team.members.map((m) => m.employeeId)
      const teamEmpSnapshots = employeeAggregates.filter((emp) =>
        memberIds.includes(emp.employeeId)
      )

      if (teamEmpSnapshots.length === 0) {
        return {
          ...team,
          avgEwh: 0,
          totalEffectiveMinutes: 0,
          totalClockMinutes: 0,
          totalOvertimeMinutes: 0,
          avgWorkDays: 0,
          ewhClass: classifyEwh(0) as keyof typeof EWH_CLASS_CONFIG,
        }
      }

      const totalEwh = teamEmpSnapshots.reduce((sum, emp) => sum + emp.avgEwh, 0)
      const avgEwh = totalEwh / teamEmpSnapshots.length
      const totalEffective = teamEmpSnapshots.reduce((sum, emp) => sum + emp.totalEffectiveMinutes, 0)
      const totalClock = teamEmpSnapshots.reduce((sum, emp) => sum + emp.totalClockMinutes, 0)
      const totalOt = teamEmpSnapshots.reduce((sum, emp) => sum + emp.totalOvertimeMinutes, 0)
      const avgWorkDays = teamEmpSnapshots.reduce((sum, emp) => sum + emp.workDays, 0) / teamEmpSnapshots.length

      return {
        ...team,
        avgEwh: Math.round(avgEwh * 100) / 100,
        totalEffectiveMinutes: totalEffective,
        totalClockMinutes: totalClock,
        totalOvertimeMinutes: totalOt,
        avgWorkDays: Math.round(avgWorkDays * 10) / 10,
        ewhClass: classifyEwh(avgEwh) as keyof typeof EWH_CLASS_CONFIG,
      }
    })
  }, [teams, employeeAggregates])

  // Sections list
  const sections = useMemo(() => {
    const empSections = employeeAggregates.map((e) => e.section)
    const teamSections = teams.map((t) => t.section)
    return ['all', ...Array.from(new Set([...empSections, ...teamSections].filter(Boolean)))]
  }, [employeeAggregates, teams])

  // Filtered team aggregates
  const filteredTeamAggregates = useMemo(() => {
    return teamAggregates.filter((t) => {
      const matchSection = sectionFilter === 'all' || t.section === sectionFilter
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
      return matchSection && matchSearch
    })
  }, [teamAggregates, sectionFilter, search])

  // Excel Export Handler (Mendukung Matriks Harian/Mingguan/MTD/YTD, Rekap Individu, dan Rekap Team)
  const exportEwhToExcel = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const cleanSiteName = monthlyMatrixData.siteName.replace(/\s+/g, '_')
    const currentDepartmentName =
      allDepartments.find((d) => d.id === departmentId)?.name || 'Semua Departemen'

    if (activeTab === 'individual') {
      const wsData: any[][] = []
      wsData.push([`REKAPITULASI EWH INDIVIDU KARYAWAN - ${monthlyMatrixData.siteName.toUpperCase()}`])
      wsData.push([
        `Periode: ${period} | Departemen: ${currentDepartmentName} | Powerman: ${currentPowerman} Orang | Total Karyawan: ${filteredEmployees.length}`,
      ])
      wsData.push([])

      const headers = [
        'No',
        'Nama Karyawan',
        'SN',
        'Section',
        'Departemen',
        'Hari Kerja Aktif',
        'Jam Kerja Reguler (Jam)',
        'Jam Lembur (Jam)',
        'Total Jam Efektif (EWH)',
        'Score EWH (%)',
        'Klasifikasi Status EWH',
      ]
      wsData.push(headers)

      filteredEmployees.forEach((e, idx) => {
        const classCfg = EWH_CLASS_CONFIG[e.ewhClass] || { label: e.ewhClass }
        wsData.push([
          idx + 1,
          e.employeeName,
          e.employeeSn,
          e.section || '-',
          e.department || '-',
          e.workDays,
          (e.totalClockMinutes / 60).toFixed(2),
          (e.totalOvertimeMinutes / 60).toFixed(2),
          (e.totalEffectiveMinutes / 60).toFixed(2),
          `${e.avgEwh.toFixed(1)}%`,
          classCfg.label,
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 12 },
        { wch: 22 },
        { wch: 20 },
        { wch: 16 },
        { wch: 22 },
        { wch: 18 },
        { wch: 22 },
        { wch: 24 },
        { wch: 22 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'EWH Individu')
      XLSX.writeFile(wb, `EWH_Individu_${cleanSiteName}_${period}.xlsx`)
      toast.success('File Excel Rekap Individu EWH berhasil diunduh!')
      return
    }

    if (activeTab === 'team') {
      const wsData: any[][] = []
      wsData.push([`REKAPITULASI EWH PER TEAM - ${monthlyMatrixData.siteName.toUpperCase()}`])
      wsData.push([
        `Periode: ${period} | Departemen: ${currentDepartmentName} | Total Team: ${filteredTeamAggregates.length}`,
      ])
      wsData.push([])

      const headers = [
        'No',
        'Nama Team',
        'Section',
        'Jumlah Member',
        'Rata-rata Hari Kerja',
        'Total Jam Kerja (Jam)',
        'Total Jam Efektif (EWH)',
        'Rata-rata EWH Team (%)',
        'Status Efektivitas',
      ]
      wsData.push(headers)

      filteredTeamAggregates.forEach((t, idx) => {
        const classCfg = EWH_CLASS_CONFIG[t.ewhClass] || { label: t.ewhClass }
        wsData.push([
          idx + 1,
          t.name,
          t.section || 'General',
          t.members.length,
          t.avgWorkDays,
          (t.totalClockMinutes / 60).toFixed(2),
          (t.totalEffectiveMinutes / 60).toFixed(2),
          `${t.avgEwh.toFixed(1)}%`,
          classCfg.label,
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 20 },
        { wch: 22 },
        { wch: 14 },
        { wch: 18 },
        { wch: 20 },
        { wch: 22 },
        { wch: 26 },
        { wch: 20 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'EWH Per Team')
      XLSX.writeFile(wb, `EWH_Per_Team_${cleanSiteName}_${period}.xlsx`)
      toast.success('File Excel Rekap Team EWH berhasil diunduh!')
      return
    }

    // Active tab is Matrix
    if (viewMode === 'daily') {
      const wsData: any[][] = []
      wsData.push([`INTERNAL INFORMATION - UTILITIES & EWH HARIAN (${monthlyMatrixData.siteName.toUpperCase()})`])
      wsData.push([`Periode: ${period} | Powerman: ${currentPowerman} Orang | Standar 2-Shift (22 Jam/Hari)`])
      wsData.push([])

      const headers = [
        'TGL', 'P5M/Safety Talk', 'Check Pressure/Day', 'Adjust Pressure/Tire', 'Reseal/Tire',
        'Assembly/Tire', 'Disassembly/Tire', 'Mounting/Tire', 'Dismounting/Tire', 'PM Check/Unit',
        'Clean Up/Day', 'Maintenance Rim', 'Retorque/Tire', 'Durasi Kerja/Hours', 'EWH (Jam/Orang)', 'Efisiensi %',
      ]
      wsData.push(headers)

      liveMatrix.forEach((r) => {
        wsData.push([
          r.day,
          r.p5m || '',
          r.checkPressure || '',
          r.adjustPressure || '',
          r.reseal || '',
          r.assembly || '',
          r.disassembly || '',
          r.mounting || '',
          r.dismounting || '',
          r.pmCheck || '',
          r.cleanUp || '',
          r.maintenanceRim || '',
          r.retorque || '',
          r.durasiKerjaHours ? r.durasiKerjaHours.toFixed(2) : '',
          r.ewhHoursPerPerson ? r.ewhHoursPerPerson.toFixed(2) : '',
          r.ewhRatioPercent ? `${r.ewhRatioPercent.toFixed(1)}%` : '',
        ])
      })

      const sum = monthlyMatrixData.sumRow
      wsData.push([
        'SUM',
        sum.p5m, sum.checkPressure, sum.adjustPressure, sum.reseal,
        sum.assembly, sum.disassembly, sum.mounting, sum.dismounting,
        sum.pmCheck, sum.cleanUp, sum.maintenanceRim, sum.retorque,
        sum.totalDurasiKerjaHours.toFixed(2),
        liveEwhAverage.toFixed(1),
        `${sum.monthlyEfficiencyPercent}%`,
      ])

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 19 }, { wch: 19 }, { wch: 13 }, { wch: 15 }, { wch: 17 }, { wch: 15 }, { wch: 17 }, { wch: 15 }, { wch: 15 }, { wch: 17 }, { wch: 15 }, { wch: 19 }, { wch: 16 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws, 'EWH Harian')
      XLSX.writeFile(wb, `EWH_Harian_${cleanSiteName}_${period}.xlsx`)
    } else if (viewMode === 'weekly') {
      const wsData: any[][] = []
      wsData.push([`REKAP EWH MINGGUAN - ${monthlyMatrixData.siteName.toUpperCase()}`])
      wsData.push([`Periode: ${period} | Powerman: ${currentPowerman} Orang`])
      wsData.push([])

      const headers = [
        'Minggu', 'Rentang Tanggal', 'P5M', 'Check Pressure', 'Adjust Pressure', 'Reseal',
        'Assembly', 'Disassembly', 'Mounting', 'Dismounting', 'PM Check', 'Clean Up',
        'Maint Rim', 'Retorque', 'Total Jam Kerja', 'EWH (Jam/Orang)', 'Efisiensi %',
      ]
      wsData.push(headers)

      liveWeeklyBreakdown.forEach((w) => {
        wsData.push([
          w.label, w.rangeStr, w.p5m, w.checkPressure, w.adjustPressure, w.reseal,
          w.assembly, w.disassembly, w.mounting, w.dismounting, w.pmCheck, w.cleanUp,
          w.maintenanceRim, w.retorque, w.totalHours.toFixed(2), w.ewhHoursPerPerson.toFixed(2), `${w.ewhRatioPercent.toFixed(1)}%`,
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws, 'EWH Mingguan')
      XLSX.writeFile(wb, `EWH_Mingguan_${cleanSiteName}_${period}.xlsx`)
    } else if (viewMode === 'mtd') {
      const wsData: any[][] = []
      wsData.push([`REKAP EWH MONTH TO DATE (MTD) - ${monthlyMatrixData.siteName.toUpperCase()}`])
      wsData.push([`Cutoff: ${monthlyMatrixData.mtdSummary.cutoffDateStr} | Powerman: ${currentPowerman} Orang`])
      wsData.push([])

      wsData.push(['Metrik MTD', 'Nilai'])
      wsData.push(['Total Jam Kerja MTD', `${monthlyMatrixData.mtdSummary.totalHours.toFixed(1)} Jam`])
      wsData.push(['Rata-rata EWH MTD', `${monthlyMatrixData.mtdSummary.mtdEwhAverage.toFixed(1)} Jam/Orang`])
      wsData.push(['Efisiensi Shift MTD', `${monthlyMatrixData.mtdSummary.mtdEfficiencyPercent}%`])
      wsData.push(['Hari Kerja Aktif MTD', `${monthlyMatrixData.mtdSummary.activeDaysCount} Hari`])
      wsData.push([])

      wsData.push(['Aktivitas', 'Total Volume MTD'])
      EWH_ACTIVITY_COLUMNS.forEach((col) => {
        wsData.push([col.label, monthlyMatrixData.mtdSummary.activities[col.key] || 0])
      })

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 25 }, { wch: 25 }]
      XLSX.utils.book_append_sheet(wb, ws, 'EWH MTD')
      XLSX.writeFile(wb, `EWH_MTD_${cleanSiteName}_${period}.xlsx`)
    } else if (viewMode === 'ytd') {
      const wsData: any[][] = []
      wsData.push([`REKAP EWH YEAR TO DATE (YTD ${monthlyMatrixData.ytdSummary.year}) - ${monthlyMatrixData.siteName.toUpperCase()}`])
      wsData.push([`Tahun: ${monthlyMatrixData.ytdSummary.year} | Total Jam YTD: ${monthlyMatrixData.ytdSummary.ytdTotalHours.toFixed(1)} Jam | Rata-rata EWH: ${monthlyMatrixData.ytdSummary.ytdAverageEwh.toFixed(1)} Jam`])
      wsData.push([])

      const headers = ['Bulan', 'Periode', 'Total Jam Kerja', 'Powerman', 'Rata-rata EWH (Jam)', 'Efisiensi %', 'Total Aktivitas']
      wsData.push(headers)

      liveYtdMonths.forEach((m) => {
        wsData.push([
          m.monthName, m.period, m.totalHours.toFixed(2), m.powerman,
          m.ewhAverage.toFixed(1), `${m.efficiencyPercent}%`, m.totalActivities,
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(wb, ws, 'EWH YTD')
      XLSX.writeFile(wb, `EWH_YTD_${cleanSiteName}_${monthlyMatrixData.ytdSummary.year}.xlsx`)
    }
    toast.success('File Excel EWH berhasil diunduh!')
  }

  // PDF Export Handler (Mengikuti Standar Format PDF Attendance: Kop Header, Tabel Border, Shading Libur/Weekend/Total, dan Footer Tanda Tangan)
  const exportEwhToPdf = async () => {
    try {
      toast.loading('Menyiapkan file PDF EWH...', { id: 'ewh-pdf' })
      const cleanSiteName = monthlyMatrixData.siteName.replace(/\s+/g, '_')
      const currentDepartmentName =
        allDepartments.find((d) => d.id === departmentId)?.name || 'Semua Departemen'

      let pdfBytes: Uint8Array
      let downloadFilename = ''

      if (activeTab === 'individual') {
        const { generateEwhIndividualSummaryPdf } = await import('@/lib/timesheet/generate-ewh-pdf')
        pdfBytes = await generateEwhIndividualSummaryPdf({
          period,
          siteName: monthlyMatrixData.siteName,
          departmentName: currentDepartmentName,
          powerman: currentPowerman,
          employees: filteredEmployees.map((e, idx) => ({
            no: idx + 1,
            employeeName: e.employeeName,
            employeeSn: e.employeeSn,
            section: e.section || '-',
            department: e.department || '-',
            workDays: e.workDays,
            regularHours: e.totalClockMinutes / 60,
            overtimeHours: e.totalOvertimeMinutes / 60,
            effectiveHours: e.totalEffectiveMinutes / 60,
            avgEwh: e.avgEwh,
            ewhClassLabel: (EWH_CLASS_CONFIG[e.ewhClass] || { label: e.ewhClass }).label,
          })),
          signatures: {
            preparedBy: 'Supervisor / Lead Hand',
            pjoLeader: 'PJO / Coordinator',
            approvedBy: 'Site Manager',
            hrName: 'Human Capital',
          },
        })
        downloadFilename = `EWH_Rekap_Individu_${cleanSiteName}_${period}.pdf`
      } else if (activeTab === 'team') {
        const { generateEwhTeamSummaryPdf } = await import('@/lib/timesheet/generate-ewh-pdf')
        pdfBytes = await generateEwhTeamSummaryPdf({
          period,
          siteName: monthlyMatrixData.siteName,
          departmentName: currentDepartmentName,
          teams: filteredTeamAggregates.map((t, idx) => ({
            no: idx + 1,
            name: t.name,
            section: t.section || 'General',
            memberCount: t.members.length,
            avgWorkDays: t.avgWorkDays,
            totalClockHours: t.totalClockMinutes / 60,
            totalEffectiveHours: t.totalEffectiveMinutes / 60,
            avgEwh: t.avgEwh,
            ewhClassLabel: (EWH_CLASS_CONFIG[t.ewhClass] || { label: t.ewhClass }).label,
          })),
          signatures: {
            preparedBy: 'Supervisor / Lead Hand',
            pjoLeader: 'PJO / Coordinator',
            approvedBy: 'Site Manager',
            hrName: 'Human Capital',
          },
        })
        downloadFilename = `EWH_Rekap_Team_${cleanSiteName}_${period}.pdf`
      } else if (viewMode === 'weekly') {
        const { generateEwhWeeklyPdf } = await import('@/lib/timesheet/generate-ewh-pdf')
        pdfBytes = await generateEwhWeeklyPdf({
          period,
          siteName: monthlyMatrixData.siteName,
          departmentName: currentDepartmentName,
          powerman: currentPowerman,
          weeklyData: liveWeeklyBreakdown,
          signatures: {
            preparedBy: 'Admin / Lead Hand',
            pjoLeader: 'Supervisor / PJO',
            approvedBy: 'Site Manager',
            hrName: 'Human Capital',
          },
        })
        downloadFilename = `EWH_Mingguan_${cleanSiteName}_${period}.pdf`
      } else {
        // Daily Matrix (Harian / MTD / YTD default)
        const { generateEwhDailyMatrixPdf } = await import('@/lib/timesheet/generate-ewh-pdf')
        pdfBytes = await generateEwhDailyMatrixPdf({
          period,
          siteName: monthlyMatrixData.siteName,
          departmentName: currentDepartmentName,
          powerman: currentPowerman,
          matrix: liveMatrix,
          sumRow: monthlyMatrixData.sumRow,
          liveEwhAverage,
          signatures: {
            preparedBy: 'Admin / Lead Hand',
            pjoLeader: 'Supervisor / PJO',
            approvedBy: 'Site Manager',
            hrName: 'Human Capital',
          },
        })
        downloadFilename = `EWH_Harian_${cleanSiteName}_${period}.pdf`
      }

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfPreviewState({
        url,
        filename: downloadFilename,
        title: downloadFilename.replace('.pdf', '').replace(/_/g, ' '),
      })

      toast.success('Preview PDF EWH siap!', { id: 'ewh-pdf' })
    } catch (err) {
      console.error('[EWH PDF Error]', err)
      toast.error('Gagal men-generate PDF EWH', { id: 'ewh-pdf' })
    }
  }

  // Navigation handlers
  const handleSiteChange = (newSiteId: string) => {
    const deptQuery = departmentId ? `&departmentId=${departmentId}` : ''
    router.push(`/dashboard/ewh?siteId=${newSiteId}&period=${period}${deptQuery}&tab=${activeTab}`)
  }

  const handleDepartmentChange = (newDeptId: string) => {
    const deptParam = newDeptId === 'ALL' ? '' : `&departmentId=${newDeptId}`
    const siteParam = siteId === 'ALL' || !siteId ? 'ALL' : siteId
    router.push(`/dashboard/ewh?siteId=${siteParam}&period=${period}${deptParam}&tab=${activeTab}`)
  }

  const handlePeriodChange = (newPeriod: string) => {
    const deptQuery = departmentId ? `&departmentId=${departmentId}` : ''
    const siteParam = siteId === 'ALL' || !siteId ? 'ALL' : siteId
    router.push(`/dashboard/ewh?siteId=${siteParam}&period=${newPeriod}${deptQuery}&tab=${activeTab}`)
  }

  // Team Modal Handlers
  const openCreateTeam = () => {
    setEditingTeam(null)
    setTeamName('')
    setTeamSection('')
    setSelectedMembers([])
    setTeamDialogOpen(true)
  }

  const openEditTeam = (team: EwhTeam) => {
    setEditingTeam(team)
    setTeamName(team.name)
    setTeamSection(team.section)
    setSelectedMembers(team.members.map((m) => m.employeeId))
    setTeamDialogOpen(true)
  }

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      toast.error('Nama team tidak boleh kosong')
      return
    }
    setSavingTeam(true)
    try {
      const targetSiteId = typeof siteId === 'number' ? siteId : (allSites[0]?.id || 1)
      if (editingTeam) {
        await updateEwhTeamAction(editingTeam.id, {
          name: teamName,
          section: teamSection,
          employeeIds: selectedMembers,
        })
        toast.success('Team berhasil diperbarui')
      } else {
        await createEwhTeamAction({
          name: teamName,
          siteId: targetSiteId,
          section: teamSection,
          employeeIds: selectedMembers,
        })
        toast.success('Team baru berhasil ditambahkan')
      }
      setTeamDialogOpen(false)
      router.refresh()
    } catch (err) {
      toast.error('Gagal menyimpan team: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSavingTeam(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!deleteConfirmTeam) return
    try {
      await deleteEwhTeamAction(deleteConfirmTeam.id)
      toast.success('Team berhasil dihapus')
      setDeleteConfirmTeam(null)
      router.refresh()
    } catch {
      toast.error('Gagal menghapus team')
    }
  }

  const toggleMember = (employeeId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            EWH — Effective Working Hours
            <Badge className="bg-[#003461] text-white border-0 text-[11px] font-bold px-2.5 py-0.5">
              {monthlyMatrixData.siteName}
            </Badge>
            <Badge className="bg-emerald-700 text-white border-0 text-[11px] font-bold px-2.5 py-0.5">
              {monthlyMatrixData.departmentName}
            </Badge>
          </h1>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Site Selector */}
          <div className="w-44">
            <HeroSearchableSelect
              value={siteId === 'ALL' || !siteId ? 'ALL' : String(siteId)}
              onChange={(val: any) => handleSiteChange(val || 'ALL')}
              options={siteSelectOptions}
              placeholder="Semua Site"
            />
          </div>

          {/* Department Selector */}
          <div className="w-48">
            <HeroSearchableSelect
              value={departmentId !== null && departmentId !== undefined ? String(departmentId) : 'ALL'}
              onChange={(val: any) => handleDepartmentChange(val || 'ALL')}
              options={deptSelectOptions}
              placeholder="Semua Departemen"
            />
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Clock className="size-3.5 text-slate-500" />
            <input
              type="month"
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
            />
          </div>

          {/* Powerman Metric (Master Data Serviceman) */}
          <button
            type="button"
            data-testid="powerman-pill-btn"
            onClick={() => setIsPowermanModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 transition-all cursor-pointer hover:bg-blue-50 hover:border-blue-300 text-left"
            title="Klik untuk melihat daftar nama manpower Powerman"
          >
            <Users className="size-3.5 text-blue-600" />
            <span className="text-xs font-medium text-slate-600">Powerman:</span>
            <span className="text-xs font-black text-slate-900">{currentPowerman} Orang</span>
            <span
              className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 rounded px-1.5 py-0.5"
              title="Khusus Manpower Service Operation (Serviceman) - Klik untuk melihat daftar"
            >
              Service Only
            </span>
          </button>

          {/* Export Actions (Excel & PDF) */}
          <div className="flex items-center gap-2">
            <Button
              onClick={exportEwhToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs h-9 px-3.5 cursor-pointer"
            >
              <FileSpreadsheet className="size-3.5" />
              Export Excel
            </Button>
            <Button
              onClick={exportEwhToPdf}
              variant="outline"
              className="border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 rounded-xl shadow-xs h-9 px-3.5 cursor-pointer bg-white"
            >
              <FileText className="size-3.5 text-rose-600" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-white text-[#003461] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="size-3.5" />
            Matriks Bulanan &amp; Chart
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'individual'
                ? 'bg-white text-[#003461] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="size-3.5" />
            Rekap Individu Karyawan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'team'
                ? 'bg-white text-[#003461] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="size-3.5" />
            Rekap Per Team
          </button>
        </div>

        {activeTab === 'team' && (
          <Button size="sm" onClick={openCreateTeam} className="h-8 text-xs font-bold gap-1.5">
            <Plus className="size-3.5" /> Tambah Team
          </Button>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: MATRIKS BULANAN & CHART */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              data-testid="powerman-card-btn"
              onClick={() => setIsPowermanModalOpen(true)}
              className="rounded-2xl border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              title="Klik untuk melihat daftar nama manpower Powerman"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Powerman ({monthlyMatrixData.departmentName})</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{currentPowerman} <span className="text-xs font-semibold text-slate-500">Orang</span></p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full group-hover:bg-blue-100 transition-all">
                  Lihat &rarr;
                </span>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="size-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Shift Kapasitas</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">22 <span className="text-xs font-semibold text-slate-500">Jam / Hari</span></p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="size-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {viewMode === 'ytd' ? 'Total Jam (YTD)' : viewMode === 'mtd' ? 'Total Jam (MTD)' : 'Total Jam Kerja'}
                  </p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    {viewMode === 'ytd'
                      ? (monthlyMatrixData.ytdSummary?.ytdTotalHours ?? 0).toFixed(1)
                      : viewMode === 'mtd'
                      ? (monthlyMatrixData.mtdSummary?.totalHours ?? 0).toFixed(1)
                      : (monthlyMatrixData.sumRow?.totalDurasiKerjaHours ?? 0).toFixed(1)}{' '}
                    <span className="text-xs font-semibold text-slate-500">Hours</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 shadow-2xs bg-emerald-50/50 border-emerald-200">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="size-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    {viewMode === 'ytd' ? 'Rata-rata EWH (YTD)' : viewMode === 'mtd' ? 'EWH (MTD)' : 'Rata-rata EWH'}
                  </p>
                  <p className="text-xl font-black text-emerald-950 mt-0.5">
                    {viewMode === 'ytd'
                      ? (monthlyMatrixData.ytdSummary?.ytdAverageEwh ?? 0).toFixed(1)
                      : viewMode === 'mtd'
                      ? (currentPowerman > 0 ? ((monthlyMatrixData.mtdSummary?.totalHours ?? 0) / 22 / currentPowerman).toFixed(1) : '0.0')
                      : liveEwhAverage.toFixed(1)}{' '}
                    <span className="text-xs font-bold text-emerald-700">Jam/Orang</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── MULTI-VIEW & CHART CONTROLS BAR ── */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            {/* View Mode Pills (Harian, Mingguan, MTD, YTD) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'daily' ? 'bg-white text-[#003461] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="size-3.5" />
                Harian (1..31)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'weekly' ? 'bg-white text-[#003461] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="size-3.5" />
                Mingguan (Weekly)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mtd')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'mtd' ? 'bg-white text-[#003461] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="size-3.5" />
                Month to Date (MTD)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ytd')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'ytd' ? 'bg-white text-[#003461] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="size-3.5" />
                Year to Date (YTD)
              </button>
            </div>

            {/* Right controls: Table hide/show toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Show / Hide Table Toggle */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTable((prev) => !prev)}
                className={`h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer ${
                  !showTable ? 'bg-amber-50 text-amber-800 border-amber-300' : 'text-slate-700'
                }`}
              >
                {showTable ? (
                  <>
                    <EyeOff className="size-3.5 text-slate-500" />
                    Sembunyikan Tabel
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5 text-amber-600" />
                    Tampilkan Tabel
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ── 1. CONDITIONAL TABLES (HARIAN / MINGGUAN / MTD / YTD) ── */}
          {showTable && (
            <>
              {/* 1.1 HARIAN (TGL 1 - 31) MATRIKS */}
              {viewMode === 'daily' && (
                <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 px-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <FileSpreadsheet className="size-4 text-emerald-600" />
                        Matriks Aktivitas & Effective Working Hours (TGL 1 - 31)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Data volume pekerjaan harian dan durasi jam kerja seluruh orang di site {monthlyMatrixData.siteName} ({period}).
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPowermanModalOpen(true)}
                        className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 px-2.5 py-1 rounded-md cursor-pointer transition-all inline-flex items-center gap-1.5"
                        title="Klik untuk melihat rincian nama 17 orang Powerman"
                      >
                        <Users className="size-3 text-blue-600" />
                        Powerman: {currentPowerman} Orang (Service)
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-center text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                            <th className="py-2.5 px-2 w-12 border-r border-slate-200 bg-slate-200/70">TGL</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[90px]">P5M/Safety Talk</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[100px]">Check Pressure/Day</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[105px]">Adjust Pressure/Tire</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[85px]">Reseal/Tire</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[95px]">Assembly/Tire</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[105px]">Disassembly/Tire</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[95px]">Mounting/Tire</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[105px]">Dismounting/Tire</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[90px]">PM Check/Unit</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[90px]">Clean Up/Day</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[105px]">Maintenance Rim</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[95px]">Retorque/Tire</th>
                            <th className="py-2.5 px-3 min-w-[110px] bg-slate-200/80 font-black text-slate-900">Durasi Kerja/Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11.5px]">
                          {liveMatrix.map((row) => {
                            const hasData = row.durasiKerjaHours > 0
                            const dayWorkers = rowsByDay.get(row.day) || []

                            return (
                              <tr
                                key={row.day}
                                className={`hover:bg-blue-50/60 transition-colors ${
                                  row.day % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
                                } ${!hasData ? 'text-slate-300' : 'text-slate-800'}`}
                              >
                                {/* TGL */}
                                <td className="py-0 px-0 font-bold font-mono border-r border-slate-200 bg-slate-50/70 text-center">
                                  {renderDayHoverCard(
                                    row,
                                    dayWorkers,
                                    { type: 'date', label: `Tanggal ${row.day}`, value: row.dateStr },
                                    <div className="w-full py-1.5 px-2 flex items-center justify-center gap-1 font-mono font-bold">
                                      <span>{row.day}</span>
                                      {dayWorkers.length > 0 && (
                                        <span className="inline-flex items-center justify-center size-4 text-[9px] font-black rounded-full bg-blue-100 text-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                          {dayWorkers.length}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* 12 Activity Columns with HoverCard */}
                                {EWH_ACTIVITY_COLUMNS.map((col) => {
                                  const val = (row as any)[col.key] || (hasData ? 0 : '')
                                  const isImportant = ['adjustPressure', 'mounting', 'dismounting'].includes(col.key)
                                  const numVal = typeof val === 'number' ? val : 0
                                  return (
                                    <td
                                      key={col.key}
                                      className={`py-0 px-0 border-r border-slate-200 text-center ${
                                        isImportant ? 'font-semibold' : ''
                                      }`}
                                    >
                                      {renderDayHoverCard(
                                        row,
                                        dayWorkers,
                                        { type: 'activity', key: col.key, label: col.label, value: numVal },
                                        <div className="w-full py-1.5 px-1 font-mono">
                                          {val !== '' ? val : <span className="text-slate-300">—</span>}
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}

                                {/* Durasi Kerja with HoverCard */}
                                <td className="py-0 px-0 font-mono font-bold text-slate-900 bg-slate-50/60 text-right">
                                  {renderDayHoverCard(
                                    row,
                                    dayWorkers,
                                    { type: 'durasi', label: 'Durasi Jam Kerja', value: `${row.durasiKerjaHours.toFixed(2)}h` },
                                    <div className="w-full py-1.5 px-3 font-mono font-bold text-right flex items-center justify-end gap-1.5">
                                      <span>{hasData ? row.durasiKerjaHours.toFixed(2) : '—'}</span>
                                      {dayWorkers.length > 0 && (
                                        <Users className="size-3 text-slate-400 group-hover:text-blue-600 inline shrink-0" />
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}

                          {/* SUM ROW (GREEN HIGHLIGHT MATCHING SPREADSHEET IMAGE) */}
                          <tr className="bg-[#4ade80] text-slate-950 font-black text-[12px] border-t-2 border-slate-400">
                            <td className="py-2.5 px-2 border-r border-emerald-600 uppercase tracking-wider">
                              SUM
                            </td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.p5m}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.checkPressure}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.adjustPressure}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.reseal}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.assembly}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.disassembly}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.mounting}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.dismounting}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.pmCheck}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.cleanUp}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.maintenanceRim}</td>
                            <td className="py-2.5 px-2 border-r border-emerald-600">{monthlyMatrixData.sumRow.retorque}</td>
                            <td className="py-2 px-3 font-mono font-black text-slate-950 text-right cursor-pointer hover:bg-emerald-300 transition-colors">
                              <HoverCard openDelay={40} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <div
                                    onClick={() =>
                                      handleOpenActivityDetail('durasiKerjaHours', {
                                        title: 'Akumulasi Durasi Jam Kerja Bulanan',
                                        scopeLabel: 'Formula Standar Tambang (SUM / 22 / Powerman)',
                                        totalVolume: totalDurasiHoursSum,
                                        isDurasiKerja: true,
                                      })
                                    }
                                    className="w-full flex flex-col items-end leading-tight"
                                  >
                                    <span className="text-[12.5px] font-black">{liveEwhAverage.toFixed(1)}</span>
                                    <span className="text-[8.5px] font-semibold text-emerald-950/80 font-sans tracking-tight">
                                      Durasi ÷ (22 × {currentPowerman})
                                    </span>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  side="top"
                                  align="end"
                                  sideOffset={8}
                                  className="w-84 p-0 rounded-xl border border-emerald-300 shadow-xl bg-white overflow-hidden z-50 text-left"
                                >
                                  <div className="p-3 bg-emerald-50 border-b border-emerald-200">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <span className="text-[10px] font-mono font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                        Standar Tambang
                                      </span>
                                      <span className="text-xs font-bold text-emerald-950">
                                        Formula EWH (Jam/Orang)
                                      </span>
                                    </div>
                                    <div className="bg-white border border-emerald-200 rounded-lg p-2 text-center text-xs font-mono font-bold text-emerald-900 shadow-2xs">
                                      <div className="border-b border-emerald-300 pb-1 mb-1">
                                        Total Durasi Aktivitas
                                      </div>
                                      <div>
                                        Shift Kapasitas (22 Jam) × Powerman ({currentPowerman} Orang)
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-3 space-y-2 text-xs">
                                    <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                                      <span>Total Durasi Aktivitas:</span>
                                      <strong className="font-mono text-slate-900">{totalDurasiHoursSum.toFixed(2)} Jam</strong>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                                      <span>Shift Kapasitas:</span>
                                      <strong className="font-mono text-slate-900">22 Jam (2 Shift/Hari)</strong>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                                      <span>Powerman ({monthlyMatrixData.siteName}):</span>
                                      <strong className="font-mono text-slate-900">{currentPowerman} Orang</strong>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                                      <span>Total Kapasitas Penyebut:</span>
                                      <strong className="font-mono text-slate-900">
                                        22 × {currentPowerman} = {22 * currentPowerman} Jam
                                      </strong>
                                    </div>
                                    <div className="flex items-center justify-between bg-emerald-100/70 p-2.5 rounded-lg text-emerald-950">
                                      <span className="font-semibold">EWH (Jam/Orang):</span>
                                      <strong className="text-sm font-mono font-black text-emerald-800">
                                        {liveEwhAverage.toFixed(1)} Jam/Orang
                                      </strong>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic pt-0.5 text-center">
                                      Klik untuk melihat kontributor total durasi aktivitas bulanan
                                    </p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 1.2 MINGGUAN (WEEKLY BREAKDOWN) TABLE */}
              {viewMode === 'weekly' && (
                <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 px-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <CalendarDays className="size-4 text-blue-600" />
                        Rekapitulasi EWH Per Minggu (Weekly Breakdown)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Agregasi jam kerja dan efisiensi per rentang minggu operasional site {monthlyMatrixData.siteName} ({period}).
                      </CardDescription>
                    </div>
                    <Badge className="bg-blue-600 text-white font-bold text-xs">
                      5 Rentang Periode
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-center text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                            <th className="py-2.5 px-3 text-left border-r border-slate-200 min-w-[120px]">Minggu</th>
                            <th className="py-2.5 px-2 border-r border-slate-200 min-w-[110px]">Rentang Tanggal</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">P5M</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Check Press</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Adjust Press</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Reseal</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Assembly</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Disassembly</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Mounting</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Dismounting</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">PM Check</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Clean Up</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Maint Rim</th>
                            <th className="py-2.5 px-2 border-r border-slate-200">Retorque</th>
                            <th className="py-2.5 px-3 min-w-[100px] bg-slate-200/80 font-black text-slate-900">Total Jam</th>
                            <th className="py-2.5 px-3 min-w-[90px] bg-emerald-100 text-emerald-950 font-black">EWH (Jam)</th>
                            <th className="py-2.5 px-3 min-w-[80px] bg-blue-100 text-blue-950 font-black">% Efisiensi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11.5px]">
                          {liveWeeklyBreakdown.map((w) => {
                            const weeklyWorkers = weekWorkersByWeekNumber.get(w.weekNumber) || []

                            return (
                              <tr key={w.weekNumber} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-1 px-1 text-left font-bold text-slate-900 border-r border-slate-200 bg-slate-50/50 p-0">
                                  <HoverCard openDelay={40} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedWeekDetail(w.weekNumber)}
                                        className="w-full h-full py-2.5 px-3 text-left font-bold text-slate-900 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-between gap-1.5 group"
                                      >
                                        <span>{w.label}</span>
                                        {weeklyWorkers.length > 0 && (
                                          <span className="inline-flex items-center justify-center size-4 text-[9px] font-black rounded-full bg-slate-200 text-slate-800 transition-colors">
                                            {weeklyWorkers.length}
                                          </span>
                                        )}
                                      </button>
                                    </HoverCardTrigger>
                                    <HoverCardContent
                                      side="right"
                                      align="start"
                                      sideOffset={8}
                                      className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-lg bg-white overflow-hidden z-50 text-left"
                                    >
                                      {/* Header */}
                                      <div className="p-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10.5px] font-mono font-bold bg-slate-200/80 text-slate-800 px-1.5 py-0.5 rounded">
                                            {w.label}
                                          </span>
                                          <span className="text-xs font-bold text-slate-900">
                                            Tgl {w.startDay}–{w.endDay}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                          {weeklyWorkers.length} Karyawan
                                        </span>
                                      </div>

                                      {/* Metrics */}
                                      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-white px-2 py-1.5 border-b border-slate-100 text-center text-xs">
                                        <div>
                                          <span className="block text-[9px] text-slate-400">Total Jam</span>
                                          <span className="font-bold text-slate-800 font-mono text-[11px]">{w.totalHours.toFixed(1)}h</span>
                                        </div>
                                        <div>
                                          <span className="block text-[9px] text-slate-400">Rata EWH</span>
                                          <span className="font-bold text-emerald-700 font-mono text-[11px]">{w.ewhHoursPerPerson.toFixed(1)}h</span>
                                        </div>
                                        <div>
                                          <span className="block text-[9px] text-slate-400">Efisiensi</span>
                                          <span className="font-bold text-blue-700 font-mono text-[11px]">{w.ewhRatioPercent}%</span>
                                        </div>
                                      </div>

                                      {/* Workers List */}
                                      <div className="p-2.5 max-h-[220px] overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                                        {weeklyWorkers.length === 0 ? (
                                          <div className="text-center py-3 text-slate-400 text-xs">
                                            Tidak ada karyawan aktif pada minggu ini.
                                          </div>
                                        ) : (
                                          weeklyWorkers.map((emp) => {
                                            const totalEffHours = (emp.totalEffectiveMinutes / 60).toFixed(1)
                                            return (
                                              <div
                                                key={emp.employeeId}
                                                className="pt-1.5 first:pt-0 flex items-center justify-between text-[10.5px]"
                                              >
                                                <div className="min-w-0">
                                                  <span className="font-semibold text-slate-900 block truncate">
                                                    {emp.employeeName}
                                                  </span>
                                                  <span className="text-[9.5px] text-slate-400 font-mono">
                                                    {emp.workDays}h hadir • {totalEffHours}h efkt ({emp.avgEwh.toFixed(1)}%)
                                                  </span>
                                                </div>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/dashboard/ewh/${emp.employeeId}?period=${period}`)
                                                  }}
                                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer shrink-0 ml-2"
                                                >
                                                  Timeline →
                                                </button>
                                              </div>
                                            )
                                          })
                                        )}
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </td>
                                <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-600">
                                  Tgl {w.startDay} - {w.endDay}
                                </td>
                                {EWH_ACTIVITY_COLUMNS.map((col) => {
                                  const count = (w as any)[col.key] || 0
                                  const weekWorkers = getActivityContributors(col.key, { weekNumber: w.weekNumber })
                                  const isImportant = ['adjustPressure', 'mounting', 'dismounting'].includes(col.key)

                                  return (
                                    <td
                                      key={col.key}
                                      className={`py-0 px-0 border-r border-slate-200 text-center ${
                                        isImportant ? 'font-semibold' : ''
                                      }`}
                                    >
                                      <HoverCard openDelay={40} closeDelay={100}>
                                        <HoverCardTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleOpenActivityDetail(col.key, {
                                                weekNumber: w.weekNumber,
                                                scopeLabel: `${w.label} (Tgl ${w.startDay}–${w.endDay})`,
                                                title: col.label,
                                                totalVolume: count,
                                              })
                                            }}
                                            className="w-full h-full py-2.5 px-2 cursor-pointer hover:bg-blue-100/70 hover:text-blue-900 transition-colors font-mono font-semibold block text-center"
                                          >
                                            {count || <span className="text-slate-300 font-normal">0</span>}
                                          </button>
                                        </HoverCardTrigger>
                                        <HoverCardContent
                                          side="top"
                                          align="center"
                                          sideOffset={8}
                                          className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-xl bg-white overflow-hidden z-50 text-left"
                                        >
                                          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                                {w.label}
                                              </span>
                                              <span className="text-xs font-bold text-slate-900 truncate">
                                                {col.label}
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                              {count} Item
                                            </span>
                                          </div>
                                          <div className="p-2.5 max-h-[220px] overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                                            {weekWorkers.length === 0 ? (
                                              <div className="text-center py-2 text-slate-400 text-xs italic">
                                                {count > 0 ? `${count} item tercatat pada minggu ini.` : 'Tidak ada aktivitas pada minggu ini.'}
                                              </div>
                                            ) : (
                                              weekWorkers.map((cw) => (
                                                <div key={cw.employeeId} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                                                  <div className="min-w-0">
                                                    <span className="font-semibold text-slate-900 block truncate">{cw.employeeName}</span>
                                                    <span className="text-[9.5px] text-slate-400 font-mono">
                                                      {cw.activeDays.length} hari aktif ({cw.activeDays.map((d) => `Tgl ${d}`).join(', ')})
                                                    </span>
                                                  </div>
                                                  <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-2">
                                                    {cw.count} item
                                                  </span>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                          <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-blue-600 font-medium text-center">
                                            Klik untuk melihat rincian personil
                                          </div>
                                        </HoverCardContent>
                                      </HoverCard>
                                    </td>
                                  )
                                })}
                                <td
                                  onClick={() => setSelectedWeekDetail(w.weekNumber)}
                                  className="py-2.5 px-3 font-mono font-bold text-slate-900 bg-slate-50/80 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                  {w.totalHours.toFixed(2)}
                                </td>
                                <td
                                  onClick={() => setSelectedWeekDetail(w.weekNumber)}
                                  className="py-2.5 px-3 font-mono font-black text-emerald-800 bg-emerald-50 text-right cursor-pointer hover:bg-emerald-100 transition-colors"
                                >
                                  {w.ewhHoursPerPerson.toFixed(1)}
                                </td>
                                <td
                                  onClick={() => setSelectedWeekDetail(w.weekNumber)}
                                  className="py-2.5 px-3 font-mono font-black text-blue-800 bg-blue-50 text-right cursor-pointer hover:bg-blue-100 transition-colors"
                                >
                                  {w.ewhRatioPercent}%
                                </td>
                              </tr>
                            )
                          })}

                          {/* SUM ROW */}
                          <tr className="bg-[#4ade80] text-slate-950 font-black text-[12px] border-t-2 border-slate-400">
                            <td className="py-2.5 px-3 text-left border-r border-emerald-600 uppercase tracking-wider" colSpan={2}>
                              TOTAL AKUMULASI BULAN INI
                            </td>
                            {EWH_ACTIVITY_COLUMNS.map((col) => {
                              const sumVal = (monthlyMatrixData.sumRow as any)[col.key] || 0
                              const monthWorkers = getActivityContributors(col.key)
                              return (
                                <td key={`sum-${col.key}`} className="py-0 px-0 border-r border-emerald-600 text-center">
                                  <HoverCard openDelay={40} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenActivityDetail(col.key, {
                                            title: col.label,
                                            totalVolume: sumVal,
                                          })
                                        }
                                        className="w-full h-full py-2.5 px-2 cursor-pointer hover:bg-emerald-500 hover:text-white transition-colors font-mono font-black text-center"
                                      >
                                        {sumVal}
                                      </button>
                                    </HoverCardTrigger>
                                    <HoverCardContent
                                      side="top"
                                      align="center"
                                      sideOffset={8}
                                      className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-xl bg-white overflow-hidden z-50 text-left"
                                    >
                                      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900 truncate">
                                          {col.label} (Akumulasi Bulan)
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                          {sumVal} Item
                                        </span>
                                      </div>
                                      <div className="p-2.5 max-h-[220px] overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                                        {monthWorkers.slice(0, 8).map((cw) => (
                                          <div key={cw.employeeId} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                                            <div className="min-w-0">
                                              <span className="font-semibold text-slate-900 block truncate">{cw.employeeName}</span>
                                              <span className="text-[9.5px] text-slate-400 font-mono">
                                                {cw.activeDays.length} hari aktif
                                              </span>
                                            </div>
                                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-2">
                                              {cw.count} item
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-blue-600 font-medium text-center">
                                        Klik untuk melihat rincian personil
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                </td>
                              )
                            })}
                            <td className="py-2.5 px-3 font-mono font-black text-slate-950 text-right">
                              {monthlyMatrixData.sumRow.totalDurasiKerjaHours.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-slate-950 text-right">
                              {liveEwhAverage.toFixed(1)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-slate-950 text-right">
                              {monthlyMatrixData.sumRow.monthlyEfficiencyPercent}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 1.3 MONTH TO DATE (MTD) TABLE & HIGHLIGHTS */}
              {viewMode === 'mtd' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* MTD Performance Highlight Box */}
                  <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-sm">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded">
                        PROGRESS CUT-OFF HARI INI
                      </span>
                      <h4 className="text-lg font-black mt-2 text-white">Month To Date (MTD)</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Periode berjalan Tgl 1 s/d Tgl {monthlyMatrixData.mtdSummary.cutoffDay} {period}
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs text-slate-400 font-medium">Hari Berjalan:</span>
                        <span className="text-sm font-black font-mono text-white">{monthlyMatrixData.mtdSummary?.cutoffDay ?? 1} Hari</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs text-slate-400 font-medium">Total Jam Aktual:</span>
                        <span className="text-sm font-black font-mono text-amber-300">{(monthlyMatrixData.mtdSummary?.totalHours ?? 0).toFixed(1)} Jam</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs text-slate-400 font-medium">Target Kapasitas MTD:</span>
                        <span className="text-sm font-black font-mono text-slate-300">{((monthlyMatrixData.mtdSummary?.cutoffDay ?? 1) * 22 * currentPowerman).toFixed(1)} Jam</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs text-slate-400 font-medium">Rata-rata EWH MTD:</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                          {currentPowerman > 0 ? ((monthlyMatrixData.mtdSummary?.totalHours ?? 0) / 22 / currentPowerman).toFixed(1) : '0.0'} Jam/Orang
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-400 font-medium">% Efisiensi MTD:</span>
                        <span className="text-base font-black font-mono text-emerald-400">{monthlyMatrixData.mtdSummary?.mtdEfficiencyPercent ?? 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* 12 Activity Volume MTD Table */}
                  <div className="lg:col-span-8">
                    <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 px-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="size-4 text-amber-600" />
                            Akumulasi Aktivitas Month to Date
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500">
                            Volume seluruh item pekerjaan dari tgl 1 hingga tgl {monthlyMatrixData.mtdSummary?.cutoffDay ?? 1}.
                          </CardDescription>
                        </div>
                      </CardHeader>

                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-xs font-sans">
                            <thead>
                              <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                                <th className="py-2.5 px-4 text-left border-r border-slate-200">Nama Aktivitas</th>
                                <th className="py-2.5 px-4 text-center border-r border-slate-200">Kode Kolom</th>
                                <th className="py-2.5 px-4 text-right">Volume MTD</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11.5px]">
                              {monthlyMatrixData.chartData.map((act, idx) => {
                                const mtdWorkers = getActivityContributors(act.actKey || 'mounting', {
                                  cutoffDay: monthlyMatrixData.mtdSummary?.cutoffDay ?? 31,
                                })
                                const isDurasi = act.actKey === 'durasiKerjaHours' || act.name.includes('Durasi')

                                return (
                                  <HoverCard key={`act-mtd-${idx}`} openDelay={40} closeDelay={100}>
                                    <HoverCardTrigger asChild>
                                      <tr
                                        onClick={() =>
                                          handleOpenActivityDetail(act.actKey || act.name, {
                                            cutoffDay: monthlyMatrixData.mtdSummary?.cutoffDay ?? 31,
                                            scopeLabel: `Cut-off Tgl 1 s/d ${monthlyMatrixData.mtdSummary?.cutoffDay ?? 31}`,
                                            title: act.name,
                                            totalVolume: act.value,
                                            isDurasiKerja: isDurasi,
                                          })
                                        }
                                        className="hover:bg-blue-50/60 cursor-pointer transition-colors group"
                                      >
                                        <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200 flex items-center justify-between">
                                          <span>{act.name}</span>
                                          {mtdWorkers.length > 0 && (
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                              {mtdWorkers.length} Orang
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-4 text-center font-mono text-slate-500 border-r border-slate-200">
                                          {act.shortName}
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                                          {isDurasi ? `${act.value}h` : act.value}
                                        </td>
                                      </tr>
                                    </HoverCardTrigger>
                                    <HoverCardContent
                                      side="right"
                                      align="start"
                                      sideOffset={8}
                                      className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-xl bg-white overflow-hidden z-50 text-left"
                                    >
                                      <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900 truncate">
                                          {act.name} (MTD)
                                        </span>
                                        <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                                          {isDurasi ? `${act.value} Jam` : `${act.value} Item`}
                                        </span>
                                      </div>
                                      <div className="p-2.5 max-h-[220px] overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                                        {mtdWorkers.length === 0 ? (
                                          <div className="text-center py-2 text-slate-400 text-xs italic">
                                            Tidak ada personil aktif untuk aktivitas ini.
                                          </div>
                                        ) : (
                                          mtdWorkers.slice(0, 8).map((cw) => (
                                            <div key={cw.employeeId} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                                              <div className="min-w-0">
                                                <span className="font-semibold text-slate-900 block truncate">{cw.employeeName}</span>
                                                <span className="text-[9.5px] text-slate-400 font-mono">
                                                  {cw.activeDays.length} hari aktif
                                                </span>
                                              </div>
                                              <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] shrink-0 ml-2">
                                                {isDurasi ? `${cw.hours.toFixed(1)}h` : `${cw.count}x`}
                                              </span>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                      <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-blue-600 font-medium text-center">
                                        Klik untuk melihat rincian personil
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* 1.4 YEAR TO DATE (YTD 12-BULAN) TABLE */}
              {viewMode === 'ytd' && (
                <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 px-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <CalendarRange className="size-4 text-indigo-600" />
                        Rekapitulasi EWH Year to Date (Januari — Desember {monthlyMatrixData.ytdSummary?.year ?? new Date().getFullYear()})
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Histori dan performa efisiensi 12 bulan di site {monthlyMatrixData.siteName}.
                      </CardDescription>
                    </div>
                    <Badge className="bg-indigo-600 text-white font-bold text-xs">
                      Tahun {monthlyMatrixData.ytdSummary?.year ?? new Date().getFullYear()}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-center text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                            <th className="py-2.5 px-4 text-left border-r border-slate-200 min-w-[140px]">Bulan</th>
                            <th className="py-2.5 px-3 border-r border-slate-200 min-w-[100px]">Powerman (Orang)</th>
                            <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px] bg-slate-200/80 font-black text-slate-900">Total Jam Kerja</th>
                            <th className="py-2.5 px-3 border-r border-slate-200 min-w-[120px] bg-emerald-100 text-emerald-950 font-black">Rata-rata EWH</th>
                            <th className="py-2.5 px-3 min-w-[120px] bg-blue-100 text-blue-950 font-black">% Efisiensi Shift</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11.5px]">
                          {liveYtdMonths.map((m) => {
                            const isCurrent = m.period === period
                            return (
                              <HoverCard key={m.monthIndex} openDelay={40} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <tr
                                    onClick={() => setIsPowermanModalOpen(true)}
                                    className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                                      isCurrent ? 'bg-amber-50/70 font-bold' : ''
                                    }`}
                                  >
                                    <td className="py-2.5 px-4 text-left border-r border-slate-200 flex items-center justify-between">
                                      <span className="text-slate-900 font-bold">{m.monthName}</span>
                                      {isCurrent && (
                                        <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0">
                                          Bulan Ini
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-700">
                                      {m.powerman || currentPowerman}
                                    </td>
                                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold text-slate-900 text-right bg-slate-50/50">
                                      {m.totalHours.toFixed(2)} Jam
                                    </td>
                                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold text-emerald-800 text-right bg-emerald-50/50">
                                      {m.monthlyEwhAverage.toFixed(1)} Jam
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-blue-800 text-right bg-blue-50/50">
                                      {m.monthlyEfficiencyPercent}%
                                    </td>
                                  </tr>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  side="right"
                                  align="start"
                                  sideOffset={8}
                                  className="w-72 sm:w-[320px] p-0 rounded-xl border border-slate-200/90 shadow-xl bg-white overflow-hidden z-50 text-left"
                                >
                                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900">
                                      {m.monthName} ({m.period})
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                      {m.powerman || currentPowerman} Powerman
                                    </span>
                                  </div>
                                  <div className="p-3 text-xs space-y-1.5">
                                    <div className="flex justify-between text-slate-600">
                                      <span>Total Jam Kerja:</span>
                                      <strong className="text-slate-900 font-mono">{m.totalHours.toFixed(1)} Jam</strong>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                      <span>Rata-rata EWH:</span>
                                      <strong className="text-emerald-700 font-mono">{m.monthlyEwhAverage.toFixed(1)} Jam/Orang</strong>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                      <span>Efisiensi Shift:</span>
                                      <strong className="text-blue-700 font-mono">{m.monthlyEfficiencyPercent}%</strong>
                                    </div>
                                  </div>
                                  <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-blue-600 font-medium text-center">
                                    Klik untuk membuka daftar personil manpower
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )
                          })}

                          {/* YTD SUM ROW */}
                          <tr className="bg-[#4ade80] text-slate-950 font-black text-[12px] border-t-2 border-slate-400">
                            <td className="py-2.5 px-4 text-left border-r border-emerald-600 uppercase tracking-wider">
                              TOTAL / RATA-RATA YTD {monthlyMatrixData.ytdSummary?.year ?? new Date().getFullYear()}
                            </td>
                            <td className="py-2.5 px-3 border-r border-emerald-600 font-mono">
                              {currentPowerman}
                            </td>
                            <td className="py-2.5 px-3 border-r border-emerald-600 font-mono font-black text-right">
                              {(monthlyMatrixData.ytdSummary?.ytdTotalHours ?? 0).toFixed(2)} Jam
                            </td>
                            <td className="py-2.5 px-3 border-r border-emerald-600 font-mono font-black text-right">
                              {(monthlyMatrixData.ytdSummary?.ytdAverageEwh ?? 0).toFixed(1)} Jam/Orang
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-right">
                              {monthlyMatrixData.ytdSummary?.ytdAverageEfficiency ?? 0}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── 2. MULTI-STYLE & MULTI-PERIOD CHARTS ── */}
          <Card className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white p-5 space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-wide uppercase flex items-center gap-2">
                  <BarChart3 className="size-4 text-blue-600" />
                  {viewMode === 'daily' && `UTILITIES & EWH HARIAN — ${monthlyMatrixData.siteName.toUpperCase()}`}
                  {viewMode === 'weekly' && `TREN EWH MINGGUAN (WEEK 1 - 5) — ${monthlyMatrixData.siteName.toUpperCase()}`}
                  {viewMode === 'mtd' && `PROFIL AKTIVITAS & EWH MTD — ${monthlyMatrixData.siteName.toUpperCase()}`}
                  {viewMode === 'ytd' && `TREN TAHUNAN EWH 12 BULAN (${monthlyMatrixData.ytdSummary?.year ?? new Date().getFullYear()}) — ${monthlyMatrixData.siteName.toUpperCase()}`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {viewMode === 'daily' && `Visualisasi performa harian periode ${period} (Tipe: ${chartType.toUpperCase()})`}
                  {viewMode === 'weekly' && `Perbandingan jam kerja & EWH per rentang minggu operasional (${period}) (Tipe: ${chartType.toUpperCase()})`}
                  {viewMode === 'mtd' && `Distribusi volume aktivitas operasional hingga cut-off tgl ${monthlyMatrixData.mtdSummary?.cutoffDay ?? 1} (Tipe: ${chartType.toUpperCase()})`}
                  {viewMode === 'ytd' && `Fluktuasi jam kerja total dan rata-rata EWH sepanjang tahun ${monthlyMatrixData.ytdSummary?.year ?? new Date().getFullYear()} (Tipe: ${chartType.toUpperCase()})`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Embedded Chart Type Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    title="Diagram Batang"
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      chartType === 'bar' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <BarChart2 className="size-3.5" />
                    <span>Batang</span>
                  </button>
                  <button
                    type="button"
                    title="Grafik Tren Garis / Area"
                    onClick={() => setChartType('line')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      chartType === 'line' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LineChartIcon className="size-3.5" />
                    <span>Garis / Tren</span>
                  </button>
                  <button
                    type="button"
                    title="Target 8.0 Jam (Kombinasi)"
                    onClick={() => setChartType('composed')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      chartType === 'composed' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <TrendingUp className="size-3.5" />
                    <span>Target 8.0h</span>
                  </button>
                  <button
                    type="button"
                    title="Radar Polar Distribusi"
                    onClick={() => setChartType('radar')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      chartType === 'radar' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <PieIcon className="size-3.5" />
                    <span>Radar</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPowermanModalOpen(true)}
                  className="text-xs font-bold text-slate-600 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 px-2.5 py-1 rounded-md cursor-pointer transition-all inline-flex items-center gap-1.5"
                  title="Klik untuk melihat rincian nama 17 orang Powerman"
                >
                  <Users className="size-3 text-blue-600" />
                  Powerman: {currentPowerman} Orang (Service)
                </button>
                <Badge className="bg-[#003461] text-white text-xs font-bold">
                  {viewMode.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* CHART RENDERERS */}
            <div className="h-[380px] w-full pt-2">
              {/* 2.1 HARIAN (DAILY) CHARTS */}
              {viewMode === 'daily' && (
                <>
                  {chartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyMatrixData.chartData}
                        margin={{ top: 25, right: 20, left: 10, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="shortName"
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={75}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ActivityChartTooltip />} />
                        <Bar
                          dataKey="value"
                          fill="#38bdf8"
                          radius={[4, 4, 0, 0]}
                          onClick={(entry: any) => {
                            if (entry) handleOpenActivityDetail(entry.actKey || entry.name)
                          }}
                          className="cursor-pointer"
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            style={{ fill: '#1e293b', fontSize: '11px', fontWeight: 'bold' }}
                          />
                          {monthlyMatrixData.chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color ? entry.color : '#0284c7'}
                              onClick={() => handleOpenActivityDetail(entry.actKey || entry.name)}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailyTrendData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                        onClick={(e: any) => {
                          const day = e?.activePayload?.[0]?.payload?.day
                          if (typeof day === 'number') setSelectedDayDetail(day)
                        }}
                        className="cursor-pointer"
                      >
                        <defs>
                          <linearGradient id="colorDurasiDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<DailyTrendTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="durasiKerjaHours"
                          name="Total Jam Kerja Harian"
                          stroke="#0284c7"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorDurasiDaily)"
                        />
                        <Line
                          type="monotone"
                          dataKey="ewhHoursPerPerson"
                          name="EWH Jam/Orang"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#10b981' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'composed' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={dailyTrendData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                        onClick={(e: any) => {
                          const day = e?.activePayload?.[0]?.payload?.day
                          if (typeof day === 'number') setSelectedDayDetail(day)
                        }}
                        className="cursor-pointer"
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<DailyTrendTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <ReferenceLine
                          y={8.0}
                          label={{ value: 'Target EWH: 8.0 Jam', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                        />
                        <Bar
                          dataKey="durasiKerjaHours"
                          name="Durasi Jam Kerja Harian"
                          fill="#38bdf8"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="ewhHoursPerPerson"
                          name="EWH Aktual (Jam/Orang)"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#10b981' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'radar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={radarActivityData}
                        onClick={(e: any) => {
                          const subj = e?.activePayload?.[0]?.payload?.subject
                          if (subj) handleOpenActivityDetail(subj)
                        }}
                        className="cursor-pointer"
                      >
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Radar
                          name="Volume Aktivitas"
                          dataKey="value"
                          stroke="#0284c7"
                          fill="#38bdf8"
                          fillOpacity={0.6}
                        />
                        <Tooltip content={<ActivityChartTooltip />} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}

              {/* 2.2 MINGGUAN (WEEKLY) CHARTS */}
              {viewMode === 'weekly' && (
                <>
                  {chartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={liveWeeklyBreakdown}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
                        onClick={(e: any) => {
                          const wk = e?.activePayload?.[0]?.payload?.weekNumber
                          if (typeof wk === 'number') setSelectedWeekDetail(wk)
                        }}
                        className="cursor-pointer"
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<WeeklyChartTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="totalHours"
                          name="Total Jam Kerja Mingguan"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                          onClick={(entry: any) => {
                            if (entry?.weekNumber) setSelectedWeekDetail(entry.weekNumber)
                          }}
                          className="cursor-pointer"
                        >
                          <LabelList
                            dataKey="totalHours"
                            position="top"
                            formatter={(v: any) => (typeof v === 'number' ? `${v.toFixed(1)}h` : v)}
                            style={{ fill: '#1e293b', fontSize: '11px', fontWeight: 'bold' }}
                          />
                          {liveWeeklyBreakdown.map((w, index) => (
                            <Cell
                              key={`cell-week-${index}`}
                              fill="#6366f1"
                              onClick={() => setSelectedWeekDetail(w.weekNumber)}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={liveWeeklyBreakdown}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
                        onClick={(e: any) => {
                          const wk = e?.activePayload?.[0]?.payload?.weekNumber
                          if (typeof wk === 'number') setSelectedWeekDetail(wk)
                        }}
                        className="cursor-pointer"
                      >
                        <defs>
                          <linearGradient id="colorWeeklyArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<WeeklyChartTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="totalHours"
                          name="Total Jam Kerja Mingguan"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorWeeklyArea)"
                        />
                        <Line
                          type="monotone"
                          dataKey="ewhHoursPerPerson"
                          name="EWH Jam/Orang"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#10b981' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'composed' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={liveWeeklyBreakdown}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
                        onClick={(e: any) => {
                          const wk = e?.activePayload?.[0]?.payload?.weekNumber
                          if (typeof wk === 'number') setSelectedWeekDetail(wk)
                        }}
                        className="cursor-pointer"
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<WeeklyChartTooltip />} />
                        <Legend />
                        <ReferenceLine
                          y={8.0}
                          label={{ value: 'Target EWH: 8.0 Jam', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                        />
                        <Bar
                          dataKey="totalHours"
                          name="Total Jam Kerja Mingguan"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                        >
                          <LabelList
                            dataKey="totalHours"
                            position="top"
                            formatter={(v: any) => (typeof v === 'number' ? `${v.toFixed(1)}h` : v)}
                            style={{ fill: '#1e293b', fontSize: '11px', fontWeight: 'bold' }}
                          />
                        </Bar>
                        <Line
                          type="monotone"
                          dataKey="ewhHoursPerPerson"
                          name="EWH Jam/Orang"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#10b981' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'radar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={weeklyRadarData}
                        onClick={(e: any) => {
                          const subj = e?.activePayload?.[0]?.payload?.subject
                          const wk = parseInt(String(subj).replace(/\D/g, ''), 10)
                          if (wk) setSelectedWeekDetail(wk)
                        }}
                        className="cursor-pointer"
                      >
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Radar
                          name="Total Jam Kerja (Jam)"
                          dataKey="value"
                          stroke="#6366f1"
                          fill="#818cf8"
                          fillOpacity={0.6}
                        />
                        <Tooltip content={<WeeklyChartTooltip />} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}

              {/* 2.3 MONTH TO DATE (MTD) CHARTS */}
              {viewMode === 'mtd' && (
                <>
                  {chartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyMatrixData.chartData}
                        margin={{ top: 25, right: 20, left: 10, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="shortName"
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={75}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ActivityChartTooltip />} />
                        <Bar
                          dataKey="value"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                          onClick={(entry: any) => {
                            if (entry)
                              handleOpenActivityDetail(entry.actKey || entry.name, {
                                cutoffDay: monthlyMatrixData.mtdSummary?.cutoffDay ?? 31,
                                scopeLabel: `Cut-off Tgl 1 s/d ${monthlyMatrixData.mtdSummary?.cutoffDay ?? 31}`,
                              })
                          }}
                          className="cursor-pointer"
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            style={{ fill: '#1e293b', fontSize: '11px', fontWeight: 'bold' }}
                          />
                          {monthlyMatrixData.chartData.map((entry, index) => (
                            <Cell
                              key={`cell-mtd-${index}`}
                              fill={entry.color ? entry.color : '#f59e0b'}
                              onClick={() =>
                                handleOpenActivityDetail(entry.actKey || entry.name, {
                                  cutoffDay: monthlyMatrixData.mtdSummary?.cutoffDay ?? 31,
                                  scopeLabel: `Cut-off Tgl 1 s/d ${monthlyMatrixData.mtdSummary?.cutoffDay ?? 31}`,
                                })
                              }
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={mtdDailyTrendData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                        onClick={(e: any) => {
                          const day = e?.activePayload?.[0]?.payload?.day
                          if (typeof day === 'number') setSelectedDayDetail(day)
                        }}
                        className="cursor-pointer"
                      >
                        <defs>
                          <linearGradient id="colorMtdArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<DailyTrendTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <Area
                          type="monotone"
                          dataKey="durasiKerjaHours"
                          name="Jam Kerja Harian MTD"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorMtdArea)"
                        />
                        <Line
                          type="monotone"
                          dataKey="ewhHoursPerPerson"
                          name="EWH Jam/Orang"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#10b981' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'composed' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={mtdDailyTrendData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                        onClick={(e: any) => {
                          const day = e?.activePayload?.[0]?.payload?.day
                          if (typeof day === 'number') setSelectedDayDetail(day)
                        }}
                        className="cursor-pointer"
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<DailyTrendTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        <ReferenceLine
                          y={8.0}
                          label={{ value: 'Target EWH: 8.0 Jam', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                        />
                        <Bar
                          dataKey="durasiKerjaHours"
                          name="Jam Kerja Harian MTD"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="ewhHoursPerPerson"
                          name="EWH Aktual (Jam/Orang)"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#10b981' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'radar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={radarActivityData}
                        onClick={(e: any) => {
                          const subj = e?.activePayload?.[0]?.payload?.subject
                          if (subj)
                            handleOpenActivityDetail(subj, {
                              cutoffDay: monthlyMatrixData.mtdSummary?.cutoffDay ?? 31,
                              scopeLabel: `Cut-off Tgl 1 s/d ${monthlyMatrixData.mtdSummary?.cutoffDay ?? 31}`,
                            })
                        }}
                        className="cursor-pointer"
                      >
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Radar
                          name="Volume Aktivitas MTD"
                          dataKey="value"
                          stroke="#d97706"
                          fill="#fbbf24"
                          fillOpacity={0.6}
                        />
                        <Tooltip content={<ActivityChartTooltip />} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}

              {/* 2.4 YEAR TO DATE (YTD) CHARTS */}
              {viewMode === 'ytd' && (
                <>
                  {chartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={liveYtdMonths}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
                        onClick={() => setIsPowermanModalOpen(true)}
                        className="cursor-pointer"
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="shortName"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<YtdChartTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="totalHours"
                          name="Total Jam Kerja (Bulan)"
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                          onClick={() => setIsPowermanModalOpen(true)}
                          className="cursor-pointer"
                        >
                          <LabelList
                            dataKey="totalHours"
                            position="top"
                            formatter={(v: any) => (typeof v === 'number' ? `${v.toFixed(1)}h` : v)}
                            style={{ fill: '#1e293b', fontSize: '10px', fontWeight: 'bold' }}
                          />
                          {liveYtdMonths.map((m, index) => (
                            <Cell
                              key={`cell-ytd-${index}`}
                              fill="#4f46e5"
                              onClick={() => setIsPowermanModalOpen(true)}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={liveYtdMonths}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
                        onClick={() => setIsPowermanModalOpen(true)}
                        className="cursor-pointer"
                      >
                        <defs>
                          <linearGradient id="colorYtdLine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="shortName"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<YtdChartTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="totalHours"
                          name="Total Jam Kerja (Bulan)"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorYtdLine)"
                        />
                        <Line
                          type="monotone"
                          dataKey="ewhAverage"
                          name="Rata-rata EWH (Jam/Orang)"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#10b981' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'composed' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={liveYtdMonths}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
                        onClick={() => setIsPowermanModalOpen(true)}
                        className="cursor-pointer"
                      >
                        <defs>
                          <linearGradient id="colorYtdComp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="shortName"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<YtdChartTooltip />} />
                        <Legend />
                        <ReferenceLine
                          y={8.0}
                          label={{ value: 'Target EWH: 8.0h', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="totalHours"
                          name="Total Jam Kerja (Bulan)"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorYtdComp)"
                        />
                        <Line
                          type="monotone"
                          dataKey="ewhAverage"
                          name="Rata-rata EWH (Jam/Orang)"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#10b981' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'radar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        data={ytdRadarData}
                        onClick={() => setIsPowermanModalOpen(true)}
                        className="cursor-pointer"
                      >
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                        <Radar
                          name="Total Jam Kerja (Bulan)"
                          dataKey="value"
                          stroke="#4f46e5"
                          fill="#818cf8"
                          fillOpacity={0.6}
                        />
                        <Tooltip content={<YtdChartTooltip />} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: REKAP INDIVIDU KARYAWAN */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari karyawan / SN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-44 text-xs h-9">
                  <SelectValue placeholder="Semua Section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s === 'all' ? 'Semua Section' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('employeeName')}
                    >
                      Nama Karyawan
                      {empSortField === 'employeeName' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-2.5 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('employeeSn')}
                    >
                      SN
                      {empSortField === 'employeeSn' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-2.5 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('section')}
                    >
                      Section
                      {empSortField === 'section' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-2.5 px-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('workDays')}
                    >
                      Hari Hadir
                      {empSortField === 'workDays' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-3 ml-auto h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('totalEffectiveMinutes')}
                    >
                      Jam Efektif
                      {empSortField === 'totalEffectiveMinutes' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-3 ml-auto h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('totalOvertimeMinutes')}
                    >
                      Jam Lembur
                      {empSortField === 'totalOvertimeMinutes' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-3 ml-auto h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('avgEwh')}
                    >
                      Rata-rata EWH
                      {empSortField === 'avgEwh' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-2.5 px-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-bold hover:bg-transparent"
                      onClick={() => handleEmpSort('ewhClass')}
                    >
                      Kategori
                      {empSortField === 'ewhClass' ? (
                        empSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedEmployees.map((emp, idx) => {
                  const isExpanded = expandedEmpId === emp.employeeId

                  // Calculate employee activity summary
                  const empActivitySums: Record<string, { label: string; count: number; days: number[] }> = {}
                  for (const sn of emp.snapshots) {
                    const day = getRowDay(sn.workDate)
                    if (sn.activityMap) {
                      for (const [k, cnt] of Object.entries(sn.activityMap)) {
                        if (cnt && cnt > 0) {
                          if (!empActivitySums[k]) {
                            const col = EWH_ACTIVITY_COLUMNS.find((c) => c.key === k)
                            empActivitySums[k] = { label: col?.label || k, count: 0, days: [] }
                          }
                          empActivitySums[k].count += cnt
                          if (!empActivitySums[k].days.includes(day)) empActivitySums[k].days.push(day)
                        }
                      }
                    }
                  }
                  const empActivityList = Object.entries(empActivitySums).sort((a, b) => b[1].count - a[1].count)

                  return (
                    <Fragment key={emp.employeeId}>
                      <tr
                        onClick={() => setExpandedEmpId(isExpanded ? null : emp.employeeId)}
                        className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50/70 border-l-4 border-blue-600 font-medium' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-400 flex items-center gap-1.5 font-mono">
                          {isExpanded ? (
                            <ChevronDown className="size-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <ChevronRight className="size-3.5 text-slate-400 shrink-0" />
                          )}
                          <span>{idx + 1}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center justify-between">
                          <span>{emp.employeeName}</span>
                          {empActivityList.length > 0 && (
                            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shrink-0 ml-2">
                              {empActivityList.reduce((acc, curr) => acc + curr[1].count, 0)} item
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{emp.employeeSn}</td>
                        <td className="py-2.5 px-3">{emp.section}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{emp.workDays} Hari</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800">
                          {formatMinutesToHours(emp.totalEffectiveMinutes)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatMinutesToHours(emp.totalOvertimeMinutes)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{emp.avgEwh.toFixed(2)}%</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge className={`${EWH_CLASS_CONFIG[emp.ewhClass].badge} border-0 text-[10px]`}>
                            {EWH_CLASS_CONFIG[emp.ewhClass].label}
                          </Badge>
                        </td>
                      </tr>

                      {/* EXPANDED ROW: DETAIL AKTIVITAS & TANGGAL KERJA */}
                      {isExpanded && (
                        <tr key={`expanded-${emp.employeeId}`} className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
                              {/* Header Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-slate-900 text-sm">
                                      Rincian Aktivitas &amp; Tanggal Kerja: {emp.employeeName}
                                    </h4>
                                    <Badge variant="outline" className="text-xs font-mono">
                                      SN: {emp.employeeSn}
                                    </Badge>
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                      {emp.section}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Total <strong>{emp.workDays} hari hadir</strong> • <strong>{formatMinutesToHours(emp.totalEffectiveMinutes)} jam efektif</strong> • Rata-rata EWH <strong>{emp.avgEwh.toFixed(2)}%</strong> ({EWH_CLASS_CONFIG[emp.ewhClass].label})
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0"
                                  onClick={() => router.push(`/dashboard/ewh/${emp.employeeId}?period=${period}`)}
                                >
                                  Buka Timeline 24 Jam Karyawan →
                                </Button>
                              </div>

                              {/* 1. Ringkasan Akumulasi Aktivitas Karyawan Ini */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <Activity className="size-3.5 text-blue-600" />
                                  Aktivitas Yang Dikerjakan Bulan Ini:
                                </span>
                                {empActivityList.length === 0 ? (
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                                    Belum ada log item aktivitas spesifik tercatat untuk karyawan ini pada periode {period}.
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {empActivityList.map(([k, item]) => (
                                      <div
                                        key={k}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs flex items-center gap-2.5 shadow-2xs"
                                      >
                                        <div>
                                          <span className="font-bold text-slate-900 block">{item.label}</span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {item.days.length} hari aktif ({item.days.sort((a, b) => a - b).map((d) => `Tgl ${d}`).join(', ')})
                                          </span>
                                        </div>
                                        <Badge className="bg-blue-600 text-white font-mono font-black text-xs px-2 py-0.5 ml-1">
                                          {item.count}x
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 2. Riwayat Harian Tanggal demi Tanggal */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <CalendarDays className="size-3.5 text-blue-600" />
                                  Riwayat Harian &amp; Aktivitas Per Tanggal (Tgl 1 s/d 31):
                                </span>
                                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                                      <tr>
                                        <th className="py-2 px-3">Tanggal</th>
                                        <th className="py-2 px-3">Jam Masuk - Pulang</th>
                                        <th className="py-2 px-3 text-right">Jam Hadir</th>
                                        <th className="py-2 px-3 text-right">Jam Efektif</th>
                                        <th className="py-2 px-3 text-right">EWH %</th>
                                        <th className="py-2 px-3">Aktivitas Yang Dikerjakan Pada Tanggal Tersebut</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11.5px]">
                                      {emp.snapshots
                                        .slice()
                                        .sort((a, b) => getRowDay(a.workDate) - getRowDay(b.workDate))
                                        .map((sn) => {
                                          const day = getRowDay(sn.workDate)
                                          const hasAtt = Boolean(sn.clockIn)
                                          const activities =
                                            sn.activitiesSummary ||
                                            (sn.activityMap
                                              ? Object.entries(sn.activityMap)
                                                  .map(([k, c]) => ({
                                                    key: k,
                                                    label: EWH_ACTIVITY_COLUMNS.find((col) => col.key === k)?.label || k,
                                                    count: c || 0,
                                                  }))
                                                  .filter((a) => a.count > 0)
                                              : [])

                                          return (
                                            <tr
                                              key={day}
                                              className={`hover:bg-blue-50/50 transition-colors ${
                                                hasAtt ? '' : 'text-slate-400 bg-slate-50/30'
                                              }`}
                                            >
                                              <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                                Tgl {day}
                                              </td>
                                              <td className="py-2 px-3 font-mono text-slate-600">
                                                {hasAtt ? `${sn.clockIn || '—'} - ${sn.clockOut || '—'}` : 'Libur / Tidak Hadir'}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono">
                                                {hasAtt ? `${(sn.clockDurationMinutes / 60).toFixed(1)}h` : '—'}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                                {hasAtt ? `${(sn.effectiveMinutes / 60).toFixed(1)}h` : '—'}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                                {hasAtt ? `${sn.ewhPercent.toFixed(1)}%` : '—'}
                                              </td>
                                              <td className="py-2 px-3">
                                                {activities.length > 0 ? (
                                                  <div className="flex flex-wrap gap-1.5">
                                                    {activities.map((act, i) => (
                                                      <span
                                                        key={i}
                                                        className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-lg text-[10.5px] font-medium"
                                                      >
                                                        <strong>{act.label}:</strong> {act.count}x
                                                      </span>
                                                    ))}
                                                  </div>
                                                ) : hasAtt ? (
                                                  <span className="text-[10.5px] text-slate-400 italic">
                                                    Sesi operasional umum
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-300">—</span>
                                                )}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: REKAP PER TEAM */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeamAggregates.map((team) => {
              const memberIds = team.members.map((m: any) => m.employeeId)
              const teamSnapshots = rows.filter((r) => memberIds.includes(r.employeeId))

              // Team Activities Aggregation ("team apa ngerjain apa")
              const teamActivitySums: Record<string, { label: string; count: number; days: number[] }> = {}
              for (const sn of teamSnapshots) {
                const day = getRowDay(sn.workDate)
                if (sn.activityMap) {
                  for (const [k, cnt] of Object.entries(sn.activityMap)) {
                    if (cnt && cnt > 0) {
                      if (!teamActivitySums[k]) {
                        const col = EWH_ACTIVITY_COLUMNS.find((c) => c.key === k)
                        teamActivitySums[k] = { label: col?.label || k, count: 0, days: [] }
                      }
                      teamActivitySums[k].count += cnt
                      if (!teamActivitySums[k].days.includes(day)) teamActivitySums[k].days.push(day)
                    }
                  }
                }
              }
              const teamActivityList = Object.entries(teamActivitySums).sort((a, b) => b[1].count - a[1].count)

              return (
                <Card key={team.id} className="rounded-2xl border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
                  <div>
                    <CardHeader className="bg-slate-50/70 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">{team.name}</CardTitle>
                        <CardDescription className="text-[11px]">{team.section || 'General'}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditTeam(team)}>
                          <Edit2 className="size-3.5 text-slate-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteConfirmTeam(team)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3.5">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Anggota</span>
                          <span className="font-bold text-slate-800 text-sm">{team.members.length} Orang</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">Rata-rata EWH</span>
                          <span className="font-bold text-emerald-700 text-sm">{team.avgEwh.toFixed(2)}%</span>
                        </div>
                      </div>

                      {/* Team Activities ("team apa ngerjain apa") */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-700 block flex items-center justify-between">
                          <span>Aktivitas Yang Dikerjakan:</span>
                          <span className="font-mono text-[10px] text-slate-400 font-normal">
                            {teamActivityList.reduce((acc, curr) => acc + curr[1].count, 0)} Total Item
                          </span>
                        </span>
                        {teamActivityList.length === 0 ? (
                          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10.5px] text-slate-400 italic">
                            Belum ada log aktivitas tercatat untuk tim ini.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {teamActivityList.slice(0, 4).map(([k, item]) => (
                              <Badge key={k} variant="secondary" className="text-[10.5px] font-medium bg-blue-50 text-blue-800 border-blue-200/70">
                                {item.label}: <strong>{item.count}x</strong>
                              </Badge>
                            ))}
                            {teamActivityList.length > 4 && (
                              <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
                                +{teamActivityList.length - 4} lainnya
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Team Members ("nama-namanya apa") */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Anggota Team:</span>
                        <div className="flex flex-wrap gap-1">
                          {team.members.map((m: any) => (
                            <Badge key={m.id} variant="secondary" className="text-[10px] font-medium bg-slate-100 text-slate-700">
                              {m.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  {/* Card Footer Button */}
                  <div className="p-3 bg-slate-50/70 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTeamDetail(team)
                        setTeamDetailSearchQuery('')
                      }}
                      className="w-full h-8 text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer"
                    >
                      Lihat Detail Tanggal &amp; Aktivitas Tim →
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Team Create/Edit Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingTeam ? 'Edit Team EWH' : 'Tambah Team EWH Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Nama Team</Label>
              <Input
                placeholder="e.g. Squad Tyre Team A"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Section</Label>
              <Input
                placeholder="e.g. Tyre Maintenance"
                value={teamSection}
                onChange={(e) => setTeamSection(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1.5 block">Pilih Anggota ({selectedMembers.length} Terpilih)</Label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 divide-y divide-slate-100">
                {allEmployees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 py-1.5 px-1 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(emp.id)}
                      onChange={() => toggleMember(emp.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="font-semibold text-slate-800">{emp.name}</span>
                    <span className="text-slate-400 text-[10px]">({emp.employeeSn})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTeamDialogOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveTeam} disabled={savingTeam} className="bg-[#003461] hover:bg-[#002647] text-white">
              {savingTeam ? 'Menyimpan...' : 'Simpan Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Delete Confirmation */}
      <Dialog open={Boolean(deleteConfirmTeam)} onOpenChange={(open) => !open && setDeleteConfirmTeam(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">Hapus Team?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600">
            Apakah Anda yakin ingin menghapus team <span className="font-bold">{deleteConfirmTeam?.name}</span>? Anggota team tidak akan terhapus dari sistem.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmTeam(null)}>
              Batal
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeleteTeam}>
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG DETAIL MANPOWER PER TANGGAL (INTERACTIVE MODAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={selectedDayDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDayDetail(null)
            setDaySearchQuery('')
            setDayStatusFilter('all')
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
          <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#003461] to-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5">
                    TGL {selectedDayDetail}
                  </Badge>
                  <DialogTitle className="text-base sm:text-lg font-black text-white">
                    Rincian Manpower &amp; Jam Efektif (EWH)
                  </DialogTitle>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Site: <strong className="text-white">{monthlyMatrixData.siteName}</strong> • Departemen: <strong className="text-white">{monthlyMatrixData.departmentName}</strong> • Periode: <strong className="text-white">{period}</strong>
                </p>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs font-bold px-3 py-1 shrink-0">
                {selectedDayWorkers.length} Dari {(rowsByDay.get(selectedDayDetail || 0) || []).length} Karyawan
              </Badge>
            </div>
          </DialogHeader>

          {/* Filter & Search Toolbar */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari nama karyawan, SN, section..."
                value={daySearchQuery}
                onChange={(e) => setDaySearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white rounded-xl"
              />
              {daySearchQuery && (
                <button
                  type="button"
                  onClick={() => setDaySearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'excellent', label: 'Sangat Baik' },
                { id: 'good', label: 'Baik' },
                { id: 'fair', label: 'Cukup' },
                { id: 'low', label: 'Rendah' },
                { id: 'absent', label: 'Tidak Hadir' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setDayStatusFilter(st.id)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    dayStatusFilter === st.id
                      ? 'bg-[#003461] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manpower Data Table */}
          <div className="flex-1 overflow-y-auto p-0">
            {selectedDayWorkers.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400 space-y-2">
                <Users className="size-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Tidak ada data manpower yang sesuai kriteria pencarian / filter.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3">Nama Karyawan</th>
                    <th className="py-2 px-3">SN</th>
                    <th className="py-2 px-3">Section</th>
                    <th className="py-2 px-3">Shift &amp; Absensi</th>
                    <th className="py-2 px-3 text-center">Aktivitas</th>
                    <th className="py-2 px-3 text-right">Lembur</th>
                    <th className="py-2 px-3 text-right">Jam Hadir</th>
                    <th className="py-2 px-3 text-right">Jam Efektif</th>
                    <th className="py-2 px-3 text-center">EWH Score</th>
                    <th className="py-2 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {selectedDayWorkers.map((w, idx) => {
                    const ewhClass = classifyEwh(w.ewhPercent) as keyof typeof EWH_CLASS_CONFIG
                    const cfg = EWH_CLASS_CONFIG[ewhClass] || EWH_CLASS_CONFIG.fair
                    const hoursWork = (w.clockDurationMinutes / 60).toFixed(1)
                    const hoursEff = (w.effectiveMinutes / 60).toFixed(1)
                    const hoursOt = (w.overtimeMinutes / 60).toFixed(1)

                    return (
                      <tr key={w.employeeId} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{w.employeeName}</span>
                          <span className="text-[10px] text-slate-500">{w.department || 'Operations'}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{w.employeeSn}</td>
                        <td className="py-2.5 px-3">{w.section || 'General'}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-slate-300">
                              {w.shiftCode || 'DS'}
                            </Badge>
                            <span>{w.clockIn || '—'} - {w.clockOut || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {w.activitySessionCount > 0 ? (
                            <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                              {w.activitySessionCount} sesi ({w.checkedItemCount} item)
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {w.overtimeMinutes > 0 ? (
                            <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                              {hoursOt}h
                            </span>
                          ) : (
                            <span className="text-slate-300">0h</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{hoursWork}h</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{hoursEff}h</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge className={`${cfg.badge} border-0 text-[10px] font-black`}>
                            {w.ewhPercentStr || `${w.ewhPercent.toFixed(1)}%`}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDayDetail(null)
                              router.push(`/dashboard/ewh/${w.employeeId}?period=${period}`)
                            }}
                            className="h-7 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200 gap-1 rounded-lg"
                          >
                            Timeline 24h
                            <ArrowUpRight className="size-3" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Total <strong>{selectedDayWorkers.length}</strong> orang tercatat pada tanggal {selectedDayDetail}
            </span>
            <Button size="sm" variant="outline" onClick={() => setSelectedDayDetail(null)} className="rounded-xl">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG DETAIL PERSONIL AKTIVITAS (INTERACTIVE MODAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={selectedActivityDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedActivityDetail(null)
            setActivitySearchQuery('')
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
          <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#003461] to-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5">
                    {selectedActivityDetail?.scopeLabel}
                  </Badge>
                  <DialogTitle className="text-base sm:text-lg font-black text-white">
                    Rincian Personil: {selectedActivityDetail?.title}
                  </DialogTitle>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Site: <strong className="text-white">{monthlyMatrixData.siteName}</strong> • Periode: <strong className="text-white">{period}</strong> • Total Volume: <strong className="text-amber-300">{selectedActivityDetail?.totalVolume} {selectedActivityDetail?.isDurasiKerja ? 'Jam' : 'Item'}</strong>
                </p>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs font-bold px-3 py-1 shrink-0">
                {filteredActivityWorkers.length} Kontributor
              </Badge>
            </div>
          </DialogHeader>

          {/* Search Bar */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari nama karyawan, SN, section..."
                value={activitySearchQuery}
                onChange={(e) => setActivitySearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white rounded-xl"
              />
              {activitySearchQuery && (
                <button
                  type="button"
                  onClick={() => setActivitySearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Karyawan</th>
                    <th className="py-2.5 px-3">SN</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3 text-right">
                      {selectedActivityDetail?.isDurasiKerja ? 'Jam Efektif' : 'Volume / Kontribusi'}
                    </th>
                    <th className="py-2.5 px-3 text-right">Kontribusi %</th>
                    <th className="py-2.5 px-3">Tanggal Aktif</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {filteredActivityWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        Tidak ditemukan data kontributor untuk aktivitas ini.
                      </td>
                    </tr>
                  ) : (
                    filteredActivityWorkers.map((w, idx) => {
                      const total = selectedActivityDetail?.totalVolume || 1
                      const contributionVal = selectedActivityDetail?.isDurasiKerja ? w.hours : w.count
                      const percent = total > 0 ? Math.min(100, Math.round((contributionVal / total) * 100)) : 0
                      return (
                        <tr key={w.employeeId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{w.employeeName}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{w.employeeSn}</td>
                          <td className="py-2 px-3">{w.section}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {selectedActivityDetail?.isDurasiKerja ? `${w.hours.toFixed(1)}h` : `${w.count}x`}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {percent}%
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[10.5px]">
                            {w.activeDays.length > 0
                              ? w.activeDays
                                  .sort((a, b) => a - b)
                                  .map((d) => `Tgl ${d}`)
                                  .join(', ')
                              : '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => router.push(`/dashboard/ewh/${w.employeeId}?period=${period}`)}
                            >
                              Timeline →
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Menampilkan <strong>{filteredActivityWorkers.length}</strong> kontributor
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedActivityDetail(null)}
              className="h-9 px-4 rounded-xl text-xs font-bold"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG DETAIL MANPOWER MINGGUAN (INTERACTIVE MODAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={selectedWeekDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWeekDetail(null)
            setWeekSearchQuery('')
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
          <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#003461] to-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-400 text-slate-950 font-black text-xs px-2.5 py-0.5">
                    MINGGU {selectedWeekDetail}
                  </Badge>
                  <DialogTitle className="text-base sm:text-lg font-black text-white">
                    Rincian Manpower Minggu ke-{selectedWeekDetail}
                  </DialogTitle>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Site: <strong className="text-white">{monthlyMatrixData.siteName}</strong> • Periode: <strong className="text-white">{period}</strong>
                </p>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs font-bold px-3 py-1 shrink-0">
                {selectedWeekWorkers.length} Karyawan Aktif
              </Badge>
            </div>
          </DialogHeader>

          {/* Search Bar */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari nama karyawan, SN, section..."
                value={weekSearchQuery}
                onChange={(e) => setWeekSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white rounded-xl"
              />
              {weekSearchQuery && (
                <button
                  type="button"
                  onClick={() => setWeekSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Karyawan</th>
                    <th className="py-2.5 px-3">SN</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3 text-center">Hari Hadir</th>
                    <th className="py-2.5 px-3 text-right">Jam Hadir</th>
                    <th className="py-2.5 px-3 text-right">Jam Efektif</th>
                    <th className="py-2.5 px-3 text-right">Rata EWH</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11.5px]">
                  {selectedWeekWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        Tidak ada personil aktif pada minggu ini.
                      </td>
                    </tr>
                  ) : (
                    selectedWeekWorkers.map((w, idx) => (
                      <tr key={w.employeeId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{w.employeeName}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{w.employeeSn}</td>
                        <td className="py-2 px-3">{w.section}</td>
                        <td className="py-2 px-3 text-center font-bold">{w.workDays} Hari</td>
                        <td className="py-2 px-3 text-right font-mono">{(w.totalClockMinutes / 60).toFixed(1)}h</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {(w.totalEffectiveMinutes / 60).toFixed(1)}h
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                          {w.avgEwh.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => router.push(`/dashboard/ewh/${w.employeeId}?period=${period}`)}
                          >
                            Timeline →
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Menampilkan <strong>{selectedWeekWorkers.length}</strong> karyawan
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeekDetail(null)}
              className="h-9 px-4 rounded-xl text-xs font-bold"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG DETAIL TIM & AKTIVITAS (INTERACTIVE MODAL) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog
        open={selectedTeamDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTeamDetail(null)
            setTeamDetailSearchQuery('')
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
          <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#003461] to-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-400 text-slate-950 font-black text-xs px-2.5 py-0.5">
                    TEAM DETAIL
                  </Badge>
                  <DialogTitle className="text-base sm:text-lg font-black text-white">
                    Rincian Detail Tim: {selectedTeamDetail?.name}
                  </DialogTitle>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Section: <strong className="text-white">{selectedTeamDetail?.section || 'General'}</strong> • Anggota: <strong className="text-white">{selectedTeamDetail?.members?.length || 0} Orang</strong> • Periode: <strong className="text-white">{period}</strong>
                </p>
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs font-bold px-3 py-1 shrink-0">
                Rata-rata EWH: {selectedTeamDetail?.avgEwh?.toFixed(2) || 0}%
              </Badge>
            </div>
          </DialogHeader>

          {/* Team Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Team Members List */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Daftar Anggota Tim &amp; Kontribusi:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {selectedTeamDetail?.members?.map((m: any) => {
                  const empAgg = employeeAggregates.find((e) => e.employeeId === m.employeeId)
                  return (
                    <div
                      key={m.id}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex items-center justify-between shadow-2xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{m.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {empAgg ? `${empAgg.workDays} hari • ${(empAgg.totalEffectiveMinutes / 60).toFixed(1)}h efkt` : '0 hari'}
                        </span>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono text-[10.5px]">
                        {empAgg ? `${empAgg.avgEwh.toFixed(1)}%` : '0%'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Day by Day Breakdown for Team */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Riwayat Harian &amp; Aktivitas Tim Per Tanggal (Tgl 1 s/d 31):
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Anggota Hadir</th>
                      <th className="py-2.5 px-3 text-right">Total Jam Hadir</th>
                      <th className="py-2.5 px-3 text-right">Total Jam Efektif</th>
                      <th className="py-2.5 px-3">Aktivitas Yang Dikerjakan Tim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11.5px]">
                    {(() => {
                      const memberIds = (selectedTeamDetail?.members || []).map((m: any) => m.employeeId)
                      const teamSnapshots = rows.filter((r) => memberIds.includes(r.employeeId))
                      const daysList = Array.from({ length: 31 }, (_, i) => i + 1)

                      return daysList.map((day) => {
                        const daySnaps = teamSnapshots.filter((sn) => getRowDay(sn.workDate) === day)
                        const presentMembers = daySnaps.filter((sn) => sn.clockIn)
                        const totalClockHours = presentMembers.reduce((sum, sn) => sum + sn.clockDurationMinutes, 0) / 60
                        const totalEffHours = presentMembers.reduce((sum, sn) => sum + sn.effectiveMinutes, 0) / 60

                        const dayActs: Record<string, number> = {}
                        for (const sn of daySnaps) {
                          if (sn.activityMap) {
                            for (const [k, c] of Object.entries(sn.activityMap)) {
                              if (c && c > 0) dayActs[k] = (dayActs[k] || 0) + c
                            }
                          }
                        }
                        const actEntries = Object.entries(dayActs)

                        if (presentMembers.length === 0 && actEntries.length === 0) {
                          return (
                            <tr key={day} className="text-slate-300 bg-slate-50/30">
                              <td className="py-2 px-3 font-mono">Tgl {day}</td>
                              <td className="py-2 px-3 italic text-slate-400">Tidak ada anggota hadir</td>
                              <td className="py-2 px-3 text-right font-mono">—</td>
                              <td className="py-2 px-3 text-right font-mono">—</td>
                              <td className="py-2 px-3">—</td>
                            </tr>
                          )
                        }

                        return (
                          <tr key={day} className="hover:bg-blue-50/50 transition-colors">
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              Tgl {day}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {presentMembers.map((sn) => (
                                  <Badge key={sn.employeeId} variant="outline" className="text-[10px] bg-slate-50">
                                    {sn.employeeName}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {totalClockHours.toFixed(1)}h
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {totalEffHours.toFixed(1)}h
                            </td>
                            <td className="py-2 px-3">
                              {actEntries.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {actEntries.map(([k, c]) => (
                                    <Badge key={k} className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                                      {EWH_ACTIVITY_COLUMNS.find((col) => col.key === k)?.label || k}: <strong>{c}x</strong>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[10.5px]">Sesi operasional umum</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total <strong>{selectedTeamDetail?.members?.length || 0}</strong> anggota terdaftar pada tim ini
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTeamDetail(null)}
              className="h-9 px-4 rounded-xl text-xs font-bold"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal Dialog */}
      <Dialog open={!!pdfPreviewState} onOpenChange={(open) => !open && handleClosePdfPreview()}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="p-4 bg-slate-900 text-white shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Preview Dokumen PDF EWH
                </DialogTitle>
                <p className="text-xs text-slate-300 font-mono">
                  {pdfPreviewState?.filename}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-6">
              {pdfPreviewState?.url && (
                <a
                  href={pdfPreviewState.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Tab Baru
                </a>
              )}
              <Button
                size="sm"
                onClick={handleDownloadPdfFromPreview}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-lg shadow-sm h-8 px-3 cursor-pointer"
              >
                <Download className="size-3.5" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 w-full bg-slate-100 overflow-hidden relative">
            {pdfPreviewState?.url && (
              <iframe
                src={pdfPreviewState.url}
                className="w-full h-full border-0"
                title="Preview Dokumen PDF EWH"
              />
            )}
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-slate-500">
              Gunakan tombol <strong>Download PDF</strong> untuk menyimpan file ke komputer Anda.
            </span>
            <Button size="sm" variant="outline" onClick={handleClosePdfPreview} className="rounded-xl cursor-pointer">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Powerman Manpower List Dialog */}
      <Dialog open={isPowermanModalOpen} onOpenChange={setIsPowermanModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                <Users className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Daftar Manpower Powerman ({currentPowerman} Orang)
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {monthlyMatrixData.siteName} &bull; Periode {period} &bull; Khusus Service Operation (Serviceman)
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3.5 border-b border-slate-100 bg-white flex items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={powermanSearch}
                onChange={(e) => setPowermanSearch(e.target.value)}
                placeholder="Cari nama, NIK/SN, atau seksi kerja..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            {powermanSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPowermanSearch('')}
                className="h-9 px-2 text-xs"
              >
                Reset
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">No</th>
                    <th className="py-2.5 px-3 text-left w-24 border-r border-slate-200">NIK / SN</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200">Nama Karyawan</th>
                    {isAllSites && (
                      <th className="py-2.5 px-3 text-left border-r border-slate-200">Site / Lokasi</th>
                    )}
                    <th className="py-2.5 px-3 text-left border-r border-slate-200">Jabatan</th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200">Seksi (Section)</th>
                    <th className="py-2.5 px-3 text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServicemen.length === 0 ? (
                    <tr>
                      <td colSpan={isAllSites ? 7 : 6} className="text-center py-8 text-slate-400">
                        {servicemenList.length === 0
                          ? 'Daftar rincian manpower dapat dilihat pada tab "Rekap Individu Karyawan".'
                          : 'Tidak ada data karyawan yang cocok dengan pencarian.'}
                      </td>
                    </tr>
                  ) : (
                    filteredServicemen.map((emp, i) => (
                      <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-400 font-medium border-r border-slate-100">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900 border-r border-slate-100">{emp.employeeSn || '-'}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100">{emp.name}</td>
                        {isAllSites && (
                          <td className="py-2 px-3 font-medium text-slate-700 border-r border-slate-100">{emp.siteName || '-'}</td>
                        )}
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-100">{emp.jobTitle}</td>
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-100">{emp.section || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed">
              <strong>💡 Catatan Operasional:</strong> Powerman EWH khusus menghitung personel <em>Service Operation (Serviceman)</em>. Posisi Technical Engineer, PJO, dan Repairman otomatis dikecualikan agar pembagi rasio EWH dan Utilitas murni mencerminkan aktivitas serviceman di lapangan.
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between sm:justify-between shrink-0">
            <span className="text-xs text-slate-500">
              Total: <strong>{filteredServicemen.length}</strong> orang
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs cursor-pointer"
                onClick={() => {
                  setIsPowermanModalOpen(false)
                  setActiveTab('individual')
                }}
              >
                Buka Rekap Individu &rarr;
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-[#003461] hover:bg-[#002447] text-white cursor-pointer"
                onClick={() => setIsPowermanModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
