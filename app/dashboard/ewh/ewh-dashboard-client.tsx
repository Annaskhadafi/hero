'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { classifyEwh, formatMinutesToHours, EWH_ACTIVITY_COLUMNS } from '@/lib/ewh/calculate-ewh'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
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
  createEwhTeamAction,
  updateEwhTeamAction,
  deleteEwhTeamAction,
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
  Eye,
  EyeOff,
  FileSpreadsheet,
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
} from 'lucide-react'

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
  siteId: number
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

  // Search & Filter state for individual/team
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')

  // Team Modal state
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<EwhTeam | null>(null)
  const [teamName, setTeamName] = useState('')
  const [teamSection, setTeamSection] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [savingTeam, setSavingTeam] = useState(false)
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<EwhTeam | null>(null)

  // Calculate live matrix with customized powerman if changed
  const liveMatrix = useMemo(() => {
    return monthlyMatrixData.matrix.map((r) => {
      const ewhRatio = currentPowerman > 0 ? (r.durasiKerjaHours / (22 * currentPowerman)) * 100 : 0
      const ewhHoursPerPerson = currentPowerman > 0 ? Math.round((r.durasiKerjaHours / currentPowerman) * 100) / 100 : 0
      return {
        ...r,
        ewhHoursPerPerson,
        ewhRatioPercent: Math.round(ewhRatio * 100) / 100,
      }
    })
  }, [monthlyMatrixData.matrix, currentPowerman])

  // Live average EWH: =SUM(Durasi Kerja 1..31) / 22 / Powerman
  const liveEwhAverage = useMemo(() => {
    const totalHours = liveMatrix.reduce((sum, r) => sum + r.durasiKerjaHours, 0)
    if (currentPowerman <= 0) return 0
    return Math.round((totalHours / 22 / currentPowerman) * 10) / 10
  }, [liveMatrix, currentPowerman])

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

  // Excel Export Handler (Mendukung Harian, Mingguan, MTD, dan YTD)
  const exportMatrixToExcel = () => {
    const wb = XLSX.utils.book_new()

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
      XLSX.writeFile(wb, `EWH_Harian_${monthlyMatrixData.siteName.replace(/\s+/g, '_')}_${period}.xlsx`)
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
      XLSX.writeFile(wb, `EWH_Mingguan_${monthlyMatrixData.siteName.replace(/\s+/g, '_')}_${period}.xlsx`)
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
      XLSX.writeFile(wb, `EWH_MTD_${monthlyMatrixData.siteName.replace(/\s+/g, '_')}_${period}.xlsx`)
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
      XLSX.writeFile(wb, `EWH_YTD_${monthlyMatrixData.siteName.replace(/\s+/g, '_')}_${monthlyMatrixData.ytdSummary.year}.xlsx`)
    }
    toast.success('File Excel EWH berhasil diunduh!')
  }

  // Navigation handlers
  const handleSiteChange = (newSiteId: string) => {
    const deptQuery = departmentId ? `&departmentId=${departmentId}` : ''
    router.push(`/dashboard/ewh?siteId=${newSiteId}&period=${period}${deptQuery}&tab=${activeTab}`)
  }

  const handleDepartmentChange = (newDeptId: string) => {
    const deptParam = newDeptId === 'ALL' ? '' : `&departmentId=${newDeptId}`
    router.push(`/dashboard/ewh?siteId=${siteId}&period=${period}${deptParam}&tab=${activeTab}`)
  }

  const handlePeriodChange = (newPeriod: string) => {
    const deptQuery = departmentId ? `&departmentId=${departmentId}` : ''
    router.push(`/dashboard/ewh?siteId=${siteId}&period=${newPeriod}${deptQuery}&tab=${activeTab}`)
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
          siteId,
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
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <MapPin className="size-3.5 text-slate-500" />
            <select
              value={String(siteId)}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
            >
              {allSites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Building2 className="size-3.5 text-slate-500" />
            <select
              value={departmentId !== null && departmentId !== undefined ? String(departmentId) : 'ALL'}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Departemen</option>
              {allDepartments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
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

          {/* Powerman Metric (Master Data) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Users className="size-3.5 text-blue-600" />
            <span className="text-xs font-medium text-slate-600">Powerman:</span>
            <span className="text-xs font-black text-slate-900">{currentPowerman} Orang</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 rounded px-1.5 py-0.5">
              Master Data
            </span>
          </div>

          {/* Export Excel */}
          <Button
            onClick={exportMatrixToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs h-9 px-3.5 cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5" />
            Export Excel
          </Button>
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
            <Card className="rounded-2xl border-slate-200/80 shadow-2xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Powerman ({monthlyMatrixData.departmentName})</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{currentPowerman} <span className="text-xs font-semibold text-slate-500">Orang</span></p>
                </div>
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
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        Powerman: {currentPowerman} Orang
                      </span>
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
                            return (
                              <tr
                                key={row.day}
                                className={`hover:bg-blue-50/50 transition-colors ${
                                  row.day % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
                                } ${!hasData ? 'text-slate-300' : 'text-slate-800'}`}
                              >
                                <td className="py-1.5 px-2 font-bold font-mono border-r border-slate-200 bg-slate-50/70">
                                  {row.day}
                                </td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.p5m || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.checkPressure || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200 font-semibold">{row.adjustPressure || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.reseal || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.assembly || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.disassembly || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200 font-semibold">{row.mounting || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200 font-semibold">{row.dismounting || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.pmCheck || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.cleanUp || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.maintenanceRim || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-2 border-r border-slate-200">{row.retorque || (hasData ? '0' : '')}</td>
                                <td className="py-1.5 px-3 font-mono font-bold text-slate-900 bg-slate-50/60 text-right">
                                  {hasData ? row.durasiKerjaHours.toFixed(2) : '—'}
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
                            <td className="py-2.5 px-3 font-mono font-black text-slate-950 text-right">
                              {liveEwhAverage.toFixed(1)}
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
                          {liveWeeklyBreakdown.map((w) => (
                            <tr key={w.weekNumber} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-2.5 px-3 text-left font-bold text-slate-900 border-r border-slate-200 bg-slate-50/50">
                                {w.label}
                              </td>
                              <td className="py-2.5 px-2 border-r border-slate-200 font-mono text-slate-600">
                                Tgl {w.startDay} - {w.endDay}
                              </td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.p5m}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.checkPressure}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200 font-semibold">{w.adjustPressure}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.reseal}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.assembly}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.disassembly}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200 font-semibold">{w.mounting}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200 font-semibold">{w.dismounting}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.pmCheck}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.cleanUp}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.maintenanceRim}</td>
                              <td className="py-2.5 px-2 border-r border-slate-200">{w.retorque}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 bg-slate-50/80 text-right">
                                {w.totalHours.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-emerald-800 bg-emerald-50 text-right">
                                {w.ewhHoursPerPerson.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-blue-800 bg-blue-50 text-right">
                                {w.ewhRatioPercent}%
                              </td>
                            </tr>
                          ))}

                          {/* SUM ROW */}
                          <tr className="bg-[#4ade80] text-slate-950 font-black text-[12px] border-t-2 border-slate-400">
                            <td className="py-2.5 px-3 text-left border-r border-emerald-600 uppercase tracking-wider" colSpan={2}>
                              TOTAL AKUMULASI BULAN INI
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
                              {monthlyMatrixData.chartData.map((act, idx) => (
                                <tr key={`act-mtd-${idx}`} className="hover:bg-blue-50/40 transition-colors">
                                  <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">
                                    {act.name}
                                  </td>
                                  <td className="py-2 px-4 text-center font-mono text-slate-500 border-r border-slate-200">
                                    {act.shortName}
                                  </td>
                                  <td className="py-2 px-4 text-right font-mono font-black text-slate-900">
                                    {act.value}
                                  </td>
                                </tr>
                              ))}
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
                              <tr
                                key={m.monthIndex}
                                className={`hover:bg-blue-50/40 transition-colors ${
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
                                <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-black text-emerald-800 text-right bg-emerald-50/50">
                                  {m.ewhAverage.toFixed(1)} Jam/Orang
                                </td>
                                <td className="py-2.5 px-3 font-mono font-black text-blue-800 text-right bg-blue-50/50">
                                  {m.efficiencyPercent}%
                                </td>
                              </tr>
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

                <Badge variant="outline" className="text-xs font-bold text-slate-600 bg-slate-50">
                  Powerman: {currentPowerman} Orang
                </Badge>
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any) => [val, 'Total Volume / Nilai']}
                        />
                        <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                          <LabelList
                            dataKey="value"
                            position="top"
                            style={{ fill: '#1e293b', fontSize: '11px', fontWeight: 'bold' }}
                          />
                          {monthlyMatrixData.chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color ? entry.color : '#0284c7'}
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? val.toFixed(2) : val,
                            name === 'durasiKerjaHours' ? 'Durasi Jam Kerja' : 'EWH Jam/Orang',
                          ]}
                        />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
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
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarActivityData}>
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? `${val.toFixed(1)} Jam` : val,
                            name === 'totalHours' ? 'Total Jam Kerja' : name,
                          ]}
                        />
                        <Legend />
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
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={liveWeeklyBreakdown}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? val.toFixed(2) : val,
                            name === 'totalHours' ? 'Total Jam Kerja' : 'EWH Jam/Orang',
                          ]}
                        />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
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
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={weeklyRadarData}>
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any) => [val, 'Volume Month to Date']}
                        />
                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                          <LabelList
                            dataKey="value"
                            position="top"
                            style={{ fill: '#1e293b', fontSize: '11px', fontWeight: 'bold' }}
                          />
                          {monthlyMatrixData.chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color ? entry.color : '#f59e0b'}
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? val.toFixed(2) : val,
                            name === 'durasiKerjaHours' ? 'Durasi Jam Kerja' : 'EWH Jam/Orang',
                          ]}
                        />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
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
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarActivityData}>
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? `${val.toFixed(1)} Jam` : val,
                            name === 'totalHours' ? 'Total Jam Kerja' : name,
                          ]}
                        />
                        <Legend />
                        <Bar
                          dataKey="totalHours"
                          name="Total Jam Kerja (Bulan)"
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                        >
                          <LabelList
                            dataKey="totalHours"
                            position="top"
                            formatter={(v: any) => (typeof v === 'number' ? `${v.toFixed(1)}h` : v)}
                            style={{ fill: '#1e293b', fontSize: '10px', fontWeight: 'bold' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={liveYtdMonths}
                        margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? val.toFixed(2) : val,
                            name === 'totalHours' ? 'Total Jam Kerja (Jam)' : 'Rata-rata EWH (Jam/Orang)',
                          ]}
                        />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                          formatter={(val: any, name: any) => [
                            typeof val === 'number' ? val.toFixed(2) : val,
                            name === 'totalHours' ? 'Total Jam Kerja (Jam)' : 'Rata-rata EWH (Jam/Orang)',
                          ]}
                        />
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
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ytdRadarData}>
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                            border: 'none',
                          }}
                        />
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
                  <th className="py-2.5 px-3">Nama Karyawan</th>
                  <th className="py-2.5 px-3">SN</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3 text-center">Hari Hadir</th>
                  <th className="py-2.5 px-3 text-right">Jam Efektif</th>
                  <th className="py-2.5 px-3 text-right">Jam Lembur</th>
                  <th className="py-2.5 px-3 text-right">Rata-rata EWH</th>
                  <th className="py-2.5 px-3 text-center">Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{emp.employeeName}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{emp.employeeSn}</td>
                    <td className="py-2 px-3">{emp.section}</td>
                    <td className="py-2 px-3 text-center font-bold">{emp.workDays} Hari</td>
                    <td className="py-2 px-3 text-right font-mono">{formatMinutesToHours(emp.totalEffectiveMinutes)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatMinutesToHours(emp.totalOvertimeMinutes)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{emp.avgEwh.toFixed(2)}%</td>
                    <td className="py-2 px-3 text-center">
                      <Badge className={`${EWH_CLASS_CONFIG[emp.ewhClass].badge} border-0 text-[10px]`}>
                        {EWH_CLASS_CONFIG[emp.ewhClass].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
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
            {filteredTeamAggregates.map((team) => (
              <Card key={team.id} className="rounded-2xl border-slate-200/80 shadow-2xs overflow-hidden">
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
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Anggota</span>
                      <span className="font-bold text-slate-800">{team.members.length} Orang</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Rata-rata EWH</span>
                      <span className="font-bold text-emerald-700">{team.avgEwh.toFixed(2)}%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Anggota Team:</span>
                    <div className="flex flex-wrap gap-1">
                      {team.members.map((m) => (
                        <Badge key={m.id} variant="secondary" className="text-[10px] font-medium bg-slate-100 text-slate-700">
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  )
}
