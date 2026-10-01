'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Lock,
  MapPin,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Truck,
  Users,
  Wrench,
  X,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  DailyActivityDashboardData,
  EmployeeActivityRow,
  UnsubmittedEmployeeRow,
  ActivityTaskItem,
  DelayedJobItem,
  TimelineActivityEvent,
} from '@/lib/daily-activity-dashboard'
import { cn } from '@/lib/utils'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface MaestroClientActivityProps {
  initialData: DailyActivityDashboardData
  customerInfo: {
    name: string
    customerCode?: string | null
  }
  userInfo?: {
    name?: string | null
    email?: string | null
  }
  authorizedSites: Array<{
    id: number
    name: string
    location?: string | null
  }>
  currentSiteId: number
  initialFilters?: {
    siteId?: string
    startDate?: string
    endDate?: string
    shift?: string
    dept?: string
    section?: string
    status?: string
    activityType?: string
    search?: string
  }
}

export function MaestroClientActivityDashboard({
  initialData,
  customerInfo,
  userInfo,
  authorizedSites,
  currentSiteId,
  initialFilters,
}: MaestroClientActivityProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() || ''
  const [isPending, startTransition] = useTransition()

  const targetRoute = pathname.startsWith('/maestro') ? '/maestro/activity' : '/activity'

  // Local today ISO string (YYYY-MM-DD)
  const todayIso = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  // Filter States
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    searchParams.get('siteId') || initialFilters?.siteId || String(currentSiteId)
  )

  const initialDateVal =
    searchParams.get('date') ||
    searchParams.get('startDate') ||
    initialData.currentDateIso ||
    todayIso

  const [selectedDate, setSelectedDate] = useState<string>(initialDateVal)
  const [selectedShift, setSelectedShift] = useState<string>(
    searchParams.get('shift') || initialFilters?.shift || initialData.selectedShift || 'Semua Shift'
  )
  const [selectedDept, setSelectedDept] = useState<string>(
    searchParams.get('dept') || initialFilters?.dept || 'Semua Tim'
  )
  const [selectedSection, setSelectedSection] = useState<string>(
    searchParams.get('section') || initialFilters?.section || 'Semua Section'
  )
  const [selectedActivityType, setSelectedActivityType] = useState<string>(
    searchParams.get('activityType') || initialFilters?.activityType || 'Semua Aktivitas'
  )
  const [selectedEmployeeStatus, setSelectedEmployeeStatus] = useState<string>(
    searchParams.get('status') || initialFilters?.status || 'Semua Status'
  )
  const [employeeNameFilter, setEmployeeNameFilter] = useState<string>(
    searchParams.get('employeeName') || searchParams.get('q') || initialFilters?.search || ''
  )
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('q') || searchParams.get('employeeName') || initialFilters?.search || ''
  )

  // Active Tab state: 'submitted' (Sudah Mengisi) vs 'unsubmitted' (Belum Mengisi)
  const [activeTab, setActiveTab] = useState<'submitted' | 'unsubmitted'>('submitted')

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [unsubmittedPage, setUnsubmittedPage] = useState<number>(1)
  const pageSize = 10

  // Detail Modal state (Read-Only)
  const [activeDetailEmployee, setActiveDetailEmployee] = useState<EmployeeActivityRow | null>(null)

  // Lightbox Photo state
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string
    label: string
    unitNumber?: string
    time?: string
    remarks?: string
  } | null>(null)
  const [isLightboxLoading, setIsLightboxLoading] = useState(true)
  const [lightboxHasError, setLightboxHasError] = useState(false)

  useEffect(() => {
    if (lightboxPhoto) {
      setIsLightboxLoading(true)
      setLightboxHasError(false)
    }
  }, [lightboxPhoto?.url])

  // Synchronize state with URL search params changes
  useEffect(() => {
    const siteParam = searchParams.get('siteId')
    if (siteParam !== null) setSelectedSiteId(siteParam)

    const urlDate = searchParams.get('date') || searchParams.get('startDate')
    if (urlDate) {
      setSelectedDate(urlDate)
    } else if (initialData.currentDateIso) {
      setSelectedDate(initialData.currentDateIso)
    } else {
      setSelectedDate(todayIso)
    }

    setSelectedShift(searchParams.get('shift') || initialData.selectedShift || 'Semua Shift')
    setSelectedDept(searchParams.get('dept') || 'Semua Tim')
    setSelectedSection(searchParams.get('section') || 'Semua Section')
    setSelectedEmployeeStatus(searchParams.get('status') || 'Semua Status')
    setEmployeeNameFilter(searchParams.get('employeeName') || searchParams.get('q') || '')
    setSearchQuery(searchParams.get('q') || searchParams.get('employeeName') || '')
  }, [searchParams, initialData.selectedShift, initialData.currentDateIso, todayIso])

  const isToday = selectedDate === todayIso

  const handleDateChange = (newDate: string) => {
    if (!newDate) return
    setSelectedDate(newDate)
    applyFilters({ date: newDate })
  }

  const handlePreviousDay = () => {
    const base = selectedDate ? new Date(selectedDate) : new Date()
    base.setDate(base.getDate() - 1)
    const y = base.getFullYear()
    const m = String(base.getMonth() + 1).padStart(2, '0')
    const d = String(base.getDate()).padStart(2, '0')
    const prevDate = `${y}-${m}-${d}`
    handleDateChange(prevDate)
  }

  const handleNextDay = () => {
    const base = selectedDate ? new Date(selectedDate) : new Date()
    base.setDate(base.getDate() + 1)
    const y = base.getFullYear()
    const m = String(base.getMonth() + 1).padStart(2, '0')
    const d = String(base.getDate()).padStart(2, '0')
    const nextDate = `${y}-${m}-${d}`
    handleDateChange(nextDate)
  }

  const handleToday = () => {
    handleDateChange(todayIso)
  }

  // Sync URL filters
  const applyFilters = (overrides?: {
    siteId?: string
    date?: string
    shift?: string
    status?: string
    dept?: string
    section?: string
    activityType?: string
    q?: string
    employeeName?: string
  }) => {
    const sId = overrides?.siteId !== undefined ? overrides.siteId : selectedSiteId
    const curDate = overrides?.date !== undefined ? overrides.date : selectedDate
    const sh = overrides?.shift !== undefined ? overrides.shift : selectedShift
    const st = overrides?.status !== undefined ? overrides.status : selectedEmployeeStatus
    const dpt = overrides?.dept !== undefined ? overrides.dept : selectedDept
    const sec = overrides?.section !== undefined ? overrides.section : selectedSection
    const act = overrides?.activityType !== undefined ? overrides.activityType : selectedActivityType
    const empName = overrides?.employeeName !== undefined ? overrides.employeeName : employeeNameFilter
    const q = overrides?.q !== undefined ? overrides.q : searchQuery

    const params = new URLSearchParams()
    if (sId && sId !== '0' && sId !== 'all') params.set('siteId', sId)
    if (curDate) params.set('date', curDate)
    if (sh && sh !== 'Semua Shift') params.set('shift', sh)
    if (st && st !== 'Semua Status') params.set('status', st)
    if (dpt && dpt !== 'Semua Tim') params.set('dept', dpt)
    if (sec && sec !== 'Semua Section') params.set('section', sec)
    if (act && act !== 'Semua Aktivitas') params.set('activityType', act)
    if (empName.trim()) params.set('employeeName', empName.trim())
    else if (q.trim()) params.set('q', q.trim())

    startTransition(() => {
      router.push(`${targetRoute}?${params.toString()}`)
    })
    setCurrentPage(1)
    setUnsubmittedPage(1)
  }

  const handleResetFilters = () => {
    const defaultSite = authorizedSites[0]?.id ? String(authorizedSites[0].id) : '0'
    setSelectedSiteId(defaultSite)
    setSelectedDate(todayIso)
    setSelectedShift('Semua Shift')
    setSelectedDept('Semua Tim')
    setSelectedSection('Semua Section')
    setSelectedActivityType('Semua Aktivitas')
    setSelectedEmployeeStatus('Semua Status')
    setEmployeeNameFilter('')
    setSearchQuery('')
    setCurrentPage(1)
    setUnsubmittedPage(1)

    const params = new URLSearchParams()
    params.set('date', todayIso)
    if (defaultSite !== '0' && authorizedSites.length > 1) {
      params.set('siteId', defaultSite)
    }

    startTransition(() => {
      router.push(`${targetRoute}?${params.toString()}`)
    })
  }

  // Filter employees client-side for rapid search & department filter
  const filteredEmployees = useMemo(() => {
    return (initialData.employees || []).filter((emp) => {
      if (selectedSiteId && selectedSiteId !== '0' && selectedSiteId !== 'all' && emp.siteId !== undefined) {
        if (String(emp.siteId) !== selectedSiteId) return false
      }
      if (selectedShift !== 'Semua Shift' && emp.shift !== selectedShift) return false
      if (selectedDept !== 'Semua Tim' && emp.department !== selectedDept) return false
      if (selectedSection !== 'Semua Section' && emp.section !== selectedSection) return false
      if (
        selectedActivityType !== 'Semua Aktivitas' &&
        !emp.primaryActivity.toLowerCase().includes(selectedActivityType.toLowerCase())
      ) {
        return false
      }
      if (selectedEmployeeStatus !== 'Semua Status' && emp.status !== selectedEmployeeStatus) {
        return false
      }
      const effectiveSearch = (searchQuery || employeeNameFilter).trim().toLowerCase()
      if (effectiveSearch) {
        return (
          emp.name.toLowerCase().includes(effectiveSearch) ||
          emp.employeeId.toLowerCase().includes(effectiveSearch) ||
          emp.primaryActivity.toLowerCase().includes(effectiveSearch) ||
          emp.unitTireId.toLowerCase().includes(effectiveSearch) ||
          emp.jobTitle.toLowerCase().includes(effectiveSearch) ||
          (emp.siteName && emp.siteName.toLowerCase().includes(effectiveSearch)) ||
          (emp.section && emp.section.toLowerCase().includes(effectiveSearch)) ||
          emp.department.toLowerCase().includes(effectiveSearch)
        )
      }
      return true
    })
  }, [
    initialData.employees,
    selectedSiteId,
    selectedShift,
    selectedDept,
    selectedSection,
    selectedActivityType,
    selectedEmployeeStatus,
    searchQuery,
    employeeNameFilter,
  ])

  // Filter unsubmitted employees (Belum Mengisi, excluding Roster OFF)
  const filteredUnsubmittedEmployees = useMemo(() => {
    return (initialData.unsubmittedEmployees || []).filter((emp) => {
      if (selectedSiteId && selectedSiteId !== '0' && selectedSiteId !== 'all' && emp.siteId !== undefined) {
        if (String(emp.siteId) !== selectedSiteId) return false
      }
      if (selectedDept !== 'Semua Tim' && emp.department !== selectedDept) return false
      if (selectedSection !== 'Semua Section' && emp.section !== selectedSection) return false
      if (selectedShift !== 'Semua Shift' && emp.expectedShift !== selectedShift) return false

      const effectiveSearch = (searchQuery || employeeNameFilter).trim().toLowerCase()
      if (effectiveSearch) {
        return (
          emp.name.toLowerCase().includes(effectiveSearch) ||
          emp.employeeId.toLowerCase().includes(effectiveSearch) ||
          emp.jobTitle.toLowerCase().includes(effectiveSearch) ||
          (emp.siteName && emp.siteName.toLowerCase().includes(effectiveSearch)) ||
          (emp.section && emp.section.toLowerCase().includes(effectiveSearch)) ||
          emp.department.toLowerCase().includes(effectiveSearch)
        )
      }
      return true
    })
  }, [
    initialData.unsubmittedEmployees,
    selectedSiteId,
    selectedDept,
    selectedSection,
    selectedShift,
    searchQuery,
    employeeNameFilter,
  ])

  // Pagination slices
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEmployees.slice(start, start + pageSize)
  }, [filteredEmployees, currentPage])

  const totalUnsubmittedPages = Math.ceil(filteredUnsubmittedEmployees.length / pageSize) || 1
  const paginatedUnsubmittedEmployees = useMemo(() => {
    const start = (unsubmittedPage - 1) * pageSize
    return filteredUnsubmittedEmployees.slice(start, start + pageSize)
  }, [filteredUnsubmittedEmployees, unsubmittedPage])

  // Export handlers
  const handleExportCsv = () => {
    if (activeTab === 'unsubmitted') {
      const headers = [
        'Employee ID',
        'Nama Karyawan',
        'Jabatan',
        'Departemen / Section',
        'Shift Roster',
        'Status Kehadiran',
        'Jam Check-in',
        'Status Aktivitas',
        'Tipe Roster',
      ]
      const rows = filteredUnsubmittedEmployees.map((e) => [
        `"${e.employeeId}"`,
        `"${e.name}"`,
        `"${e.jobTitle}"`,
        `"${e.department}${e.section ? ` - ${e.section}` : ''}"`,
        `"${e.rosterCode} (${e.expectedShift})"`,
        `"${e.attendanceStatus}"`,
        `"${e.checkInTime}"`,
        `"Belum Mengisi"`,
        `"${e.rosterType || '-'}"`,
      ])
      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute(
        'download',
        `MAESTRO_Belum_Isi_Daily_Activity_${customerInfo.name.replace(/\s+/g, '_')}_${(initialData.currentDate || 'Export').replace(/\s+/g, '_')}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    const headers = [
      'Employee ID',
      'Nama Karyawan',
      'Site',
      'Jabatan / Section',
      'Shift',
      'Jam Check-in',
      'Jam Checkout',
      'EWH',
      'Aktivitas Utama',
      'Unit / Tire ID',
      'Status Aktivitas',
      'Progres (%)',
      'Update Terakhir',
    ]

    const rows = filteredEmployees.map((e) => [
      `"${e.employeeId}"`,
      `"${e.name}"`,
      `"${e.siteName || '-'}"`,
      `"${e.jobTitle}"`,
      `"${e.shift}"`,
      `"${e.checkInTime}"`,
      `"${e.checkOutTime || '-'}"`,
      `"${e.ewhLabel || '-'}"`,
      `"${e.primaryActivity}"`,
      `"${e.unitTireId}"`,
      `"${e.status}"`,
      `"${e.progress}%"`,
      `"${e.lastUpdate}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `MAESTRO_Daily_Activity_${customerInfo.name.replace(/\s+/g, '_')}_${(initialData.currentDate || 'Export').replace(/\s+/g, '_')}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      if (activeTab === 'unsubmitted') {
        const data = filteredUnsubmittedEmployees.map((e, idx) => ({
          'No': idx + 1,
          'Tanggal': initialData.currentDate || '-',
          'Employee ID': e.employeeId,
          'Nama Karyawan': e.name,
          'Site': e.siteName || '-',
          'Jabatan': e.jobTitle,
          'Departemen': e.department,
          'Section': e.section || '-',
          'Roster & Shift': `${e.rosterCode} (${e.expectedShift})`,
          'Status Kehadiran': e.attendanceStatus,
          'Jam Check-In': e.checkInTime || '-',
          'Status Log': 'Belum Mengisi',
        }))

        const ws = XLSX.utils.json_to_sheet(data)
        ws['!cols'] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 16 },
          { wch: 26 },
          { wch: 18 },
          { wch: 22 },
          { wch: 20 },
          { wch: 20 },
          { wch: 20 },
          { wch: 18 },
          { wch: 14 },
          { wch: 16 },
        ]

        XLSX.utils.book_append_sheet(wb, ws, 'Belum Mengisi')
        const filename = `MAESTRO_Belum_Isi_Activity_${customerInfo.name.replace(/\s+/g, '_')}_${(initialData.currentDate || 'Report').replace(/\s+/g, '_')}.xlsx`
        XLSX.writeFile(wb, filename)
        toast.success('Laporan Excel berhasil diunduh!')
        return
      }

      // Submitted tab
      const data = filteredEmployees.map((e, idx) => ({
        'No': idx + 1,
        'Tanggal': initialData.currentDate || '-',
        'Employee ID': e.employeeId,
        'Nama Karyawan': e.name,
        'Site': e.siteName || '-',
        'Jabatan / Section': e.jobTitle,
        'Shift': e.shift,
        'Jam Check-in': e.checkInTime,
        'Jam Checkout': e.checkOutTime || '-',
        'EWH': e.ewhLabel || '-',
        'Aktivitas Utama': e.primaryActivity,
        'No. Unit / Equipment': e.unitTireId,
        'Status Aktivitas': e.status,
        'Progress (%)': `${e.progress}%`,
        'Update Terakhir': e.lastUpdate,
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      ws['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 16 },
        { wch: 26 },
        { wch: 18 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 35 },
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Daily Activity')
      const filename = `MAESTRO_Daily_Activity_${customerInfo.name.replace(/\s+/g, '_')}_${(initialData.currentDate || 'Report').replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success('Laporan Excel Daily Activity berhasil diunduh!')
    } catch (err) {
      toast.error('Gagal mengekspor data ke Excel.')
    }
  }

  // Export specific employee detail tasks to Excel (.xlsx)
  const handleExportDetailExcel = async (emp: EmployeeActivityRow) => {
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      const data = emp.tasks.map((t, idx) => ({
        'No': idx + 1,
        'Jam Kerja': `${t.startedAt || '-'} - ${t.endedAt || '-'}`,
        'Durasi': t.durationLabel || '-',
        'Unit / Equipment': t.unitNumber || '-',
        'Aktivitas / Tugas': t.label || '-',
        'Grup / Kategori': t.groupName || '-',
        'Poin': t.points || 0,
        'Status': t.status,
        'Catatan Lapangan': t.remarks || '-',
        'Link Foto Bukti': t.photoUrl || '-',
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      ws['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 35 },
        { wch: 22 },
        { wch: 10 },
        { wch: 14 },
        { wch: 30 },
        { wch: 35 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Detail Tugas')
      const filename = `MAESTRO_Detail_${emp.name.replace(/\s+/g, '_')}_${(emp.workDate || 'Report').replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success(`Detail tugas ${emp.name} berhasil diekspor ke Excel!`)
    } catch (err) {
      toast.error('Gagal mengekspor detail ke Excel.')
    }
  }

  const renderStatusBadge = (status: EmployeeActivityRow['status']) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#15803d]">
            Selesai
          </span>
        )
      case 'Berjalan':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1d4ed8]">
            Berjalan
          </span>
        )
      case 'Menunggu':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#b45309]">
            Menunggu
          </span>
        )
      case 'Terlambat':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#b91c1c]">
            Terlambat
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        )
    }
  }

  const renderProgressBar = (progress: number, status: EmployeeActivityRow['status']) => {
    let barColor = 'bg-[#1d72f2]'
    if (status === 'Selesai') barColor = 'bg-[#00b875]'
    if (status === 'Menunggu') barColor = 'bg-[#f59e0b]'
    if (status === 'Terlambat') barColor = 'bg-[#ef4444]'

    return (
      <div className="flex items-center gap-2.5">
        <div className="w-20 sm:w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-700 w-8">{progress}%</span>
      </div>
    )
  }

  // Attendance Donut calculations (circumference for radius 38 is ~238.76)
  const attTotal = Math.max(1, initialData.attendanceSummary?.total || 1)
  const hadirPct = Math.round(((initialData.attendanceSummary?.hadir || 0) / attTotal) * 100)
  const belumPct = Math.round(((initialData.attendanceSummary?.belumCheckIn || 0) / attTotal) * 100)
  const cutiPct = Math.round(((initialData.attendanceSummary?.cutiIzin || 0) / attTotal) * 100)
  const offPct = Math.max(0, 100 - hadirPct - belumPct - cutiPct)

  const circumference = 238.76
  const hadirDash = (hadirPct / 100) * circumference
  const belumDash = (belumPct / 100) * circumference
  const cutiDash = (cutiPct / 100) * circumference
  const offDash = (offPct / 100) * circumference

  const hadirOffset = 0
  const belumOffset = -hadirDash
  const cutiOffset = -(hadirDash + belumDash)
  const offOffset = -(hadirDash + belumDash + cutiDash)

  const currentSiteName =
    authorizedSites.find((s) => String(s.id) === selectedSiteId)?.name ||
    authorizedSites[0]?.name ||
    'Seluruh Site'

  const kpis = initialData.kpis || {
    karyawanAktif: { value: 0, total: 0, change: '+0%' },
    hadirCheckIn: { value: 0, change: '+0%' },
    aktivitasSelesai: { value: 0, change: '+0%' },
    sedangBerjalan: { value: 0, change: '+0%' },
    terlambatBelumUpdate: { value: 0, change: '-0%' },
  }

  return (
    <div className="w-full space-y-5 text-slate-800">
      {/* ── Page Title Bar & Customer Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">Operations</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Daily Activity Monitoring</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {customerInfo.name.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Monitoring Daily Activity Seluruh Karyawan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dashboard supervisi operasional untuk memantau log pekerjaan harian teknisi, presensi, dan progress di site {customerInfo.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{customerInfo.name}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Site: <strong>{currentSiteName}</strong></span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Shift
          </span>
        </div>
      </div>

      {/* ── Filter Bar Card ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5 items-end">
          {/* Site Selector (Only customer's authorized sites) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              Site / Lokasi
            </label>
            <select
              aria-label="Pilih Site"
              value={selectedSiteId}
              onChange={(e) => {
                const val = e.target.value
                setSelectedSiteId(val)
                applyFilters({ siteId: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-h-[33px]"
            >
              {authorizedSites.length > 1 && (
                <option value="all">Semua Lokasi</option>
              )}
              {authorizedSites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Operasional (Day Navigator: Hari Sebelumnya, Date Picker, Hari Berikutnya, Hari Ini) */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-500">Tanggal Operasional</label>
              {isToday ? (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Hari Ini
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleToday}
                  disabled={isPending}
                  className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  title="Kembali ke Hari Ini"
                >
                  Ke Hari Ini
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={handlePreviousDay}
                disabled={isPending}
                className="h-[31px] w-8 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                aria-label="Pilih Tanggal Operasional"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={isPending}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
              />
              <button
                type="button"
                onClick={handleNextDay}
                disabled={isPending}
                className="h-[31px] w-8 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                title="Hari Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Nama Karyawan Search */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nama Karyawan</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={employeeNameFilter}
                onChange={(e) => {
                  setEmployeeNameFilter(e.target.value)
                  setSearchQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Shift */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Shift</label>
            <select
              aria-label="Pilih Shift"
              value={selectedShift}
              onChange={(e) => {
                const val = e.target.value
                setSelectedShift(val)
                applyFilters({ shift: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Semua Shift">Semua Shift</option>
              <option value="Pagi">Pagi (06:00 - 14:00)</option>
              <option value="Siang">Siang (14:00 - 22:00)</option>
              <option value="Malam">Malam (22:00 - 06:00)</option>
            </select>
          </div>

          {/* Departemen */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Department</label>
            <select
              aria-label="Pilih Departemen"
              value={selectedDept}
              onChange={(e) => {
                const val = e.target.value
                setSelectedDept(val)
                applyFilters({ dept: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Semua Tim">Semua Dept</option>
              {(initialData.departmentsList || []).map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Section</label>
            <select
              aria-label="Pilih Section"
              value={selectedSection}
              onChange={(e) => {
                const val = e.target.value
                setSelectedSection(val)
                applyFilters({ section: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Semua Section">Semua Section</option>
              {(initialData.sectionsList || []).map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Employee Status</label>
            <select
              aria-label="Pilih Status Karyawan"
              value={selectedEmployeeStatus}
              onChange={(e) => {
                const val = e.target.value
                setSelectedEmployeeStatus(val)
                applyFilters({ status: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>

          {/* Actions: Terapkan Filter & Reset */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => applyFilters()}
              disabled={isPending}
              className="h-[33px] text-xs font-semibold bg-[#1d72f2] hover:bg-blue-600 text-white rounded-lg px-3 gap-1.5 flex-1 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              Terapkan
            </Button>
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={isPending}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ── 5 KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Karyawan Aktif */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Karyawan Aktif</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {kpis.karyawanAktif.value}
                </span>
                <span className="text-xs text-slate-400">
                  dari {kpis.karyawanAktif.total} karyawan
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" /> {kpis.karyawanAktif.change}
            </span>
            <span className="text-slate-400">vs. hari sebelumnya</span>
          </div>
        </div>

        {/* Card 2: Hadir / Check-in */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Hadir / Check-in</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {kpis.hadirCheckIn.value}
                </span>
                <span className="text-xs text-slate-400">karyawan</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" /> {kpis.hadirCheckIn.change}
            </span>
            <span className="text-slate-400">vs. hari sebelumnya</span>
          </div>
        </div>

        {/* Card 3: Aktivitas Selesai */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Aktivitas Selesai</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {kpis.aktivitasSelesai.value}
                </span>
                <span className="text-xs text-slate-400">pekerjaan</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" /> {kpis.aktivitasSelesai.change}
            </span>
            <span className="text-slate-400">vs. hari sebelumnya</span>
          </div>
        </div>

        {/* Card 4: Sedang Berjalan */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Sedang Berjalan</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {kpis.sedangBerjalan.value}
                </span>
                <span className="text-xs text-slate-400">pekerjaan</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" /> {kpis.sedangBerjalan.change}
            </span>
            <span className="text-slate-400">vs. hari sebelumnya</span>
          </div>
        </div>

        {/* Card 5: Terlambat / Belum Update */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Terlambat / Belum Update</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {kpis.terlambatBelumUpdate.value}
                </span>
                <span className="text-xs text-slate-400">karyawan</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center font-bold text-rose-600">
              <ArrowDownRight className="w-3.5 h-3.5" /> {kpis.terlambatBelumUpdate.change}
            </span>
            <span className="text-slate-400">vs. hari sebelumnya</span>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Ringkasan Aktivitas Site & Status Kehadiran Tim ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Ringkasan Aktivitas Site (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Ringkasan Aktivitas Site
            </h2>
            <span className="text-[11px] text-slate-400">
              Update terakhir: {initialData.lastUpdatedTime}
            </span>
          </div>

          <div className="space-y-4 my-auto py-3">
            {(initialData.shiftSummaries || []).map((shift) => {
              const total = shift.total
              const pPlanned = total > 0 ? (shift.planned / total) * 100 : 0
              const pOngoing = total > 0 ? (shift.ongoing / total) * 100 : 0
              const pCompleted = total > 0 ? (shift.completed / total) * 100 : 0
              const pDelayed = total > 0 ? (shift.delayed / total) * 100 : 0

              return (
                <div key={shift.shift} className="flex items-center gap-3 text-xs">
                  <div className="w-28 text-left">
                    <span className="font-bold text-slate-800">{shift.shiftLabel}</span>
                    <span className="text-slate-400 text-[11px] block">({shift.hours})</span>
                  </div>

                  <div className="flex-1 h-7 rounded-sm overflow-hidden flex bg-slate-100 text-[11px] font-semibold text-white">
                    {total === 0 ? (
                      <div className="w-full flex items-center justify-center text-slate-400 text-[10px] font-normal">
                        Tidak ada aktivitas tercatat
                      </div>
                    ) : (
                      <>
                        {shift.planned > 0 && (
                          <div
                            style={{ width: `${pPlanned}%` }}
                            className="bg-[#9cb0c6] flex items-center justify-center min-w-[20px]"
                            title={`Planned: ${shift.planned}`}
                          >
                            {shift.planned}
                          </div>
                        )}
                        {shift.ongoing > 0 && (
                          <div
                            style={{ width: `${pOngoing}%` }}
                            className="bg-[#1d72f2] flex items-center justify-center min-w-[20px]"
                            title={`Ongoing: ${shift.ongoing}`}
                          >
                            {shift.ongoing}
                          </div>
                        )}
                        {shift.completed > 0 && (
                          <div
                            style={{ width: `${pCompleted}%` }}
                            className="bg-[#00b875] flex items-center justify-center min-w-[20px]"
                            title={`Completed: ${shift.completed}`}
                          >
                            {shift.completed}
                          </div>
                        )}
                        {shift.delayed > 0 && (
                          <div
                            style={{ width: `${pDelayed}%` }}
                            className="bg-[#f97316] flex items-center justify-center min-w-[20px]"
                            title={`Delayed: ${shift.delayed}`}
                          >
                            {shift.delayed}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <span className="font-bold text-slate-800 w-8 text-right">{shift.total}</span>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-start gap-5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#9cb0c6]" />
              <span>Planned (Rencana)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#1d72f2]" />
              <span>Ongoing (Berjalan)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#00b875]" />
              <span>Completed (Selesai)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#f97316]" />
              <span>Delayed (Terlambat)</span>
            </div>
          </div>
        </div>

        {/* Status Kehadiran Tim (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Status Kehadiran Tim
            </h2>
          </div>

          <div className="flex items-center gap-6 my-auto py-3">
            {/* SVG Donut Chart */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                {/* Off Shift */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth="12"
                  strokeDasharray={`${offDash} ${circumference}`}
                  strokeDashoffset={offOffset}
                />
                {/* Cuti / Izin */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#38bdf8"
                  strokeWidth="12"
                  strokeDasharray={`${cutiDash} ${circumference}`}
                  strokeDashoffset={cutiOffset}
                />
                {/* Belum Check-in */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="12"
                  strokeDasharray={`${belumDash} ${circumference}`}
                  strokeDashoffset={belumOffset}
                />
                {/* Hadir */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#00b875"
                  strokeWidth="12"
                  strokeDasharray={`${hadirDash} ${circumference}`}
                  strokeDashoffset={hadirOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900 leading-none">
                  {initialData.attendanceSummary?.hadir || 0}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Hadir dari {initialData.attendanceSummary?.total || 0}
                </span>
              </div>
            </div>

            {/* Legend Stats List */}
            <div className="flex-1 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00b875]" />
                  <span className="text-slate-700">Hadir / Check-in</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="text-slate-900">{initialData.attendanceSummary?.hadir || 0}</span>
                  <span className="text-slate-400 text-[11px]">({hadirPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1e293b]" />
                  <span className="text-slate-700">Belum Check-in</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="text-slate-900">{initialData.attendanceSummary?.belumCheckIn || 0}</span>
                  <span className="text-slate-400 text-[11px]">({belumPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                  <span className="text-slate-700">Cuti / Izin</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="text-slate-900">{initialData.attendanceSummary?.cutiIzin || 0}</span>
                  <span className="text-slate-400 text-[11px]">({cutiPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
                  <span className="text-slate-700">Off Shift</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="text-slate-900">{initialData.attendanceSummary?.offShift || 0}</span>
                  <span className="text-slate-400 text-[11px]">({offPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-end">
            <span>Total tercatat di site: <strong>{initialData.attendanceSummary?.total || 0} karyawan</strong></span>
          </div>
        </div>
      </div>

      {/* ── Main Activity Tables Section ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header & Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Aktivitas Setiap Karyawan
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredEmployees.length} record)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari karyawan, aktivitas, unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 text-xs font-semibold text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100 gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel (.XLSX)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100 gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Tab Switcher: Sudah Mengisi vs Belum Mengisi */}
        <div className="px-4 pt-3 pb-0 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('submitted')
              setCurrentPage(1)
            }}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === 'submitted'
                ? "border-blue-600 text-blue-600 bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sudah Mengisi Aktivitas</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              activeTab === 'submitted' ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
            )}>
              {filteredEmployees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('unsubmitted')
              setUnsubmittedPage(1)
            }}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === 'unsubmitted'
                ? "border-amber-500 text-amber-700 bg-amber-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Belum Mengisi Aktivitas</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px]",
              activeTab === 'unsubmitted' ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
            )}>
              {filteredUnsubmittedEmployees.length}
            </span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
              (Roster Aktif • OFF Dikecualikan)
            </span>
          </button>
        </div>

        {/* ── Tab 1: Sudah Mengisi Aktivitas Table ── */}
        {activeTab === 'submitted' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-28">Employee ID</th>
                  <th className="py-3 px-4 min-w-[160px]">Nama Karyawan</th>
                  <th className="py-3 px-4 min-w-[120px]">Site</th>
                  <th className="py-3 px-4 min-w-[130px]">Jabatan / Tim</th>
                  <th className="py-3 px-3 w-16">Shift</th>
                  <th className="py-3 px-4 min-w-[110px]">Jam Presensi</th>
                  <th className="py-3 px-3 min-w-[90px]">EWH</th>
                  <th className="py-3 px-4 min-w-[200px]">Aktivitas Utama</th>
                  <th className="py-3 px-4 min-w-[110px]">Unit / Tire ID</th>
                  <th className="py-3 px-4 w-28">Status Aktivitas</th>
                  <th className="py-3 px-4 min-w-[130px]">Progres</th>
                  <th className="py-3 px-4 w-24">Update Terakhir</th>
                  <th className="py-3 px-4 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="w-8 h-8 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Tidak Ada Data Aktivitas</p>
                        <p className="text-xs text-slate-400">
                          Tidak ditemukan data aktivitas karyawan untuk kriteria filter dan periode yang dipilih.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp) => {
                    const initials = emp.name
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()

                    return (
                      <tr
                        key={`${emp.employeeDbId}-${emp.sessionId}-${emp.workDate}`}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Employee ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                          {emp.employeeId}
                        </td>

                        {/* Nama Karyawan */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">
                                {emp.name}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate block">
                                {emp.department}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Site */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium truncate">
                          {emp.siteName || currentSiteName}
                        </td>

                        {/* Jabatan / Tim */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="block truncate font-medium text-slate-800">{emp.jobTitle}</span>
                          {emp.section && (
                            <span className="text-[11px] text-slate-400 block truncate">{emp.section}</span>
                          )}
                        </td>

                        {/* Shift */}
                        <td className="py-3.5 px-3">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold",
                            emp.shift === 'Pagi' && "bg-blue-50 text-blue-700 border border-blue-200",
                            emp.shift === 'Siang' && "bg-amber-50 text-amber-700 border border-amber-200",
                            emp.shift === 'Malam' && "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          )}>
                            {emp.shift}
                          </span>
                        </td>

                        {/* Jam Presensi */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{emp.checkInTime}</span>
                            <span className="text-slate-300">-</span>
                            <span>{emp.checkOutTime || '-'}</span>
                          </div>
                        </td>

                        {/* EWH */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-800 text-[11px] block">
                              {emp.ewhLabel || `${emp.ewhActualHours || 0}h`}
                            </span>
                            {emp.ewhPercentage !== undefined && (
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold",
                                emp.ewhPercentage >= 80 ? "bg-emerald-50 text-emerald-700" :
                                emp.ewhPercentage >= 50 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                              )}>
                                {emp.ewhPercentage}%
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Aktivitas Utama */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block line-clamp-2" title={emp.primaryActivity}>
                            {emp.primaryActivity}
                          </span>
                          {emp.tasksCount > 1 && (
                            <span className="text-[10px] text-blue-600 font-medium">
                              +{emp.tasksCount - 1} tugas lainnya
                            </span>
                          )}
                        </td>

                        {/* Unit / Tire ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{emp.unitTireId}</span>
                          </div>
                        </td>

                        {/* Status Aktivitas */}
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(emp.status)}
                        </td>

                        {/* Progres */}
                        <td className="py-3.5 px-4">
                          {renderProgressBar(emp.progress, emp.status)}
                        </td>

                        {/* Update Terakhir */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {emp.lastUpdate}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveDetailEmployee(emp)}
                            className="h-8 px-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab 2: Belum Mengisi Aktivitas Table ── */}
        {activeTab === 'unsubmitted' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-28">Employee ID</th>
                  <th className="py-3 px-4 min-w-[180px]">Nama Karyawan</th>
                  <th className="py-3 px-4 min-w-[130px]">Site</th>
                  <th className="py-3 px-4 min-w-[150px]">Jabatan / Section</th>
                  <th className="py-3 px-3 w-28">Shift Roster</th>
                  <th className="py-3 px-4 w-32">Status Presensi</th>
                  <th className="py-3 px-4 w-28">Jam Presensi</th>
                  <th className="py-3 px-4 w-32">Status Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUnsubmittedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        <p className="text-sm font-semibold text-slate-700">Semua Karyawan Telah Mengisi Log</p>
                        <p className="text-xs text-slate-400">
                          Seluruh karyawan yang terjadwal on-duty pada tanggal ini telah melaporkan aktivitas harian.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUnsubmittedEmployees.map((emp) => (
                    <tr key={emp.employeeDbId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        {emp.employeeId}
                      </td>

                      {/* Nama Karyawan */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{emp.name}</span>
                        <span className="text-[11px] text-slate-400 block">{emp.department}</span>
                      </td>

                      {/* Site */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {emp.siteName || currentSiteName}
                      </td>

                      {/* Jabatan / Section */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="block font-medium text-slate-800">{emp.jobTitle}</span>
                        {emp.section && (
                          <span className="text-[11px] text-slate-400 block">{emp.section}</span>
                        )}
                      </td>

                      {/* Shift Roster */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {emp.rosterCode} ({emp.expectedShift})
                        </span>
                      </td>

                      {/* Status Presensi */}
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          emp.attendanceStatus === 'Hadir'
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          {emp.attendanceStatus}
                        </span>
                      </td>

                      {/* Jam Presensi */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {emp.checkInTime || '-'}
                      </td>

                      {/* Status Log */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Belum Mengisi Log
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            {activeTab === 'submitted' ? (
              <span>
                Menampilkan <strong>{Math.min(filteredEmployees.length, (currentPage - 1) * pageSize + 1)}</strong> -{' '}
                <strong>{Math.min(filteredEmployees.length, currentPage * pageSize)}</strong> dari{' '}
                <strong>{filteredEmployees.length}</strong> karyawan
              </span>
            ) : (
              <span>
                Menampilkan <strong>{Math.min(filteredUnsubmittedEmployees.length, (unsubmittedPage - 1) * pageSize + 1)}</strong> -{' '}
                <strong>{Math.min(filteredUnsubmittedEmployees.length, unsubmittedPage * pageSize)}</strong> dari{' '}
                <strong>{filteredUnsubmittedEmployees.length}</strong> karyawan belum mengisi
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'submitted') setCurrentPage((p) => Math.max(1, p - 1))
                else setUnsubmittedPage((p) => Math.max(1, p - 1))
              }}
              disabled={activeTab === 'submitted' ? currentPage <= 1 : unsubmittedPage <= 1}
              className="h-8 w-8 p-0 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
              {activeTab === 'submitted' ? `${currentPage} / ${totalPages}` : `${unsubmittedPage} / ${totalUnsubmittedPages}`}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'submitted') setCurrentPage((p) => Math.min(totalPages, p + 1))
                else setUnsubmittedPage((p) => Math.min(totalUnsubmittedPages, p + 1))
              }}
              disabled={activeTab === 'submitted' ? currentPage >= totalPages : unsubmittedPage >= totalUnsubmittedPages}
              className="h-8 w-8 p-0 rounded-lg cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Timeline Aktivitas Terbaru & Pekerjaan Tertunda / Kendala ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Timeline Aktivitas Terbaru (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Timeline Aktivitas Terbaru
            </h2>
            <span className="text-xs text-slate-400 font-semibold">
              Live Feed
            </span>
          </div>

          <div className="divide-y divide-slate-100 pt-1">
            {(initialData.timeline || []).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada timeline aktivitas tercatat pada periode ini.
              </div>
            ) : (
              (initialData.timeline || []).slice(0, 5).map((t) => (
                <div key={t.id} className="py-3 flex items-start gap-3 text-xs">
                  <div className="w-12 font-mono font-bold text-slate-400 shrink-0 text-right pt-0.5">
                    {t.time}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800">
                      <strong className="text-slate-900">{t.employeeName}</strong>{' '}
                      <span className="text-slate-500">{t.description}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.2 rounded">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {t.locationTag}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pekerjaan Tertunda & Kendala (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Pekerjaan Tertunda &amp; Kendala
            </h2>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {(initialData.delayedJobs || []).length} isu aktif
            </span>
          </div>

          <div className="space-y-3 pt-3">
            {(initialData.delayedJobs || []).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada pekerjaan tertunda atau kendala operasional aktif.
              </div>
            ) : (
              (initialData.delayedJobs || []).map((j) => (
                <div
                  key={j.id}
                  className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/70 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-amber-950 block">{j.activity}</span>
                    <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                      Unit: {j.unitNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    <strong>Kendala:</strong> {j.reason}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-amber-200/40">
                    <span>PIC: {j.employeeName} ({j.jobTitle})</span>
                    <span>Target: {j.targetCompleted}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Modal: Read-Only Task Breakdown & Evidence ── */}
      <Dialog
        open={Boolean(activeDetailEmployee)}
        onOpenChange={(open) => !open && setActiveDetailEmployee(null)}
      >
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="p-5 bg-slate-900 text-white shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-blue-300">
                    {activeDetailEmployee?.employeeId}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-300 font-medium">
                    {activeDetailEmployee?.siteName || currentSiteName}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  {activeDetailEmployee?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  {activeDetailEmployee?.jobTitle} · {activeDetailEmployee?.department}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 pr-6">
                {activeDetailEmployee && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportDetailExcel(activeDetailEmployee)}
                    className="h-8 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 border-slate-300 gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Excel
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">STATUS</span>
                <span className="font-bold text-slate-800 text-xs">
                  {activeDetailEmployee?.status}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">SHIFT</span>
                <span className="font-bold text-slate-800 text-xs">
                  {activeDetailEmployee?.shift}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">EWH TERCATAT</span>
                <span className="font-bold text-emerald-700 font-mono text-xs">
                  {activeDetailEmployee?.ewhLabel || `${activeDetailEmployee?.ewhActualHours || 0}h`}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">TOTAL TUGAS</span>
                <span className="font-bold text-blue-700 text-xs">
                  {activeDetailEmployee?.tasks.length || 0} item
                </span>
              </div>
            </div>

            {/* Task Items List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Rincian Pekerjaan &amp; Foto Bukti
              </h3>

              {(activeDetailEmployee?.tasks || []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                  Tidak ada rincian tugas spesifik yang tercatat.
                </div>
              ) : (
                (activeDetailEmployee?.tasks || []).map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {t.startedAt || '-'} - {t.endedAt || '-'}
                          </span>
                          {t.unitNumber && t.unitNumber !== '-' && (
                            <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                              Unit: {t.unitNumber}
                            </span>
                          )}
                          {t.groupName && (
                            <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              {t.groupName}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{t.label}</h4>
                      </div>

                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                        t.status === 'Selesai' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                        t.status === 'Berjalan' && "bg-blue-50 text-blue-700 border border-blue-200",
                        t.status === 'Menunggu' && "bg-amber-50 text-amber-700 border border-amber-200",
                        t.status === 'Terlambat' && "bg-rose-50 text-rose-700 border border-rose-200"
                      )}>
                        {t.status}
                      </span>
                    </div>

                    {t.remarks && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <strong>Catatan:</strong> {t.remarks}
                      </p>
                    )}

                    {/* Photos Preview */}
                    {t.photoUrl && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-600 block mb-1.5 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          Foto Bukti Pengerjaan
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxPhoto({
                                url: resolveUploadUrl(t.photoUrl!),
                                label: t.label,
                                unitNumber: t.unitNumber,
                                time: `${t.startedAt} - ${t.endedAt}`,
                                remarks: t.remarks,
                              })
                            }
                            className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer"
                          >
                            <img
                              src={resolveUploadUrl(t.photoUrl)}
                              alt={t.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Dokumen Daily Activity terverifikasi otomatis oleh sistem HERO.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveDetailEmployee(null)}
              className="rounded-xl cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Photo Lightbox Modal ── */}
      <Dialog
        open={Boolean(lightboxPhoto)}
        onOpenChange={(open) => !open && setLightboxPhoto(null)}
      >
        <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden rounded-2xl bg-black text-white border-0 shadow-2xl">
          <div className="p-4 bg-slate-900 flex items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                {lightboxPhoto?.label}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {lightboxPhoto?.unitNumber && `Unit: ${lightboxPhoto.unitNumber} · `}
                {lightboxPhoto?.time}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLightboxPhoto(null)}
              className="text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 flex items-center justify-center bg-black/95 min-h-[300px] max-h-[70vh] overflow-hidden">
            {lightboxPhoto?.url && (
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.label}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            )}
          </div>

          {lightboxPhoto?.remarks && (
            <div className="p-3 bg-slate-900 text-xs text-slate-300 border-t border-slate-800">
              <strong className="text-slate-200">Catatan:</strong> {lightboxPhoto.remarks}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
