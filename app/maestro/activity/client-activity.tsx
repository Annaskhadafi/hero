'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Lock,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Shield,
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
} from '@/lib/daily-activity-dashboard'
import { cn } from '@/lib/utils'
import { formatPhotoDisplayUrl } from '@/lib/photo-url'
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
  const [isPending, startTransition] = useTransition()

  // Filter States
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    searchParams.get('siteId') || initialFilters?.siteId || String(currentSiteId)
  )
  const [startDate, setStartDate] = useState<string>(
    searchParams.get('startDate') || initialFilters?.startDate || initialData.startDate || searchParams.get('date') || ''
  )
  const [endDate, setEndDate] = useState<string>(
    searchParams.get('endDate') || initialFilters?.endDate || initialData.endDate || searchParams.get('date') || ''
  )
  const [selectedShift, setSelectedShift] = useState<string>(
    searchParams.get('shift') || initialFilters?.shift || 'Semua Shift'
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
    setStartDate(searchParams.get('startDate') || initialData.startDate || searchParams.get('date') || '')
    setEndDate(searchParams.get('endDate') || initialData.endDate || searchParams.get('date') || '')
    setSelectedShift(searchParams.get('shift') || 'Semua Shift')
    setSelectedDept(searchParams.get('dept') || 'Semua Tim')
    setSelectedSection(searchParams.get('section') || 'Semua Section')
    setSelectedEmployeeStatus(searchParams.get('status') || 'Semua Status')
    setEmployeeNameFilter(searchParams.get('employeeName') || searchParams.get('q') || '')
    setSearchQuery(searchParams.get('q') || searchParams.get('employeeName') || '')
  }, [searchParams, initialData.startDate, initialData.endDate])

  // Sync URL filters
  const applyFilters = (overrides?: {
    siteId?: string
    startDate?: string
    endDate?: string
    shift?: string
    status?: string
    dept?: string
    section?: string
    activityType?: string
    q?: string
    employeeName?: string
  }) => {
    const sId = overrides?.siteId !== undefined ? overrides.siteId : selectedSiteId
    const sDate = overrides?.startDate !== undefined ? overrides.startDate : startDate
    const eDate = overrides?.endDate !== undefined ? overrides.endDate : endDate
    const sh = overrides?.shift !== undefined ? overrides.shift : selectedShift
    const st = overrides?.status !== undefined ? overrides.status : selectedEmployeeStatus
    const dpt = overrides?.dept !== undefined ? overrides.dept : selectedDept
    const sec = overrides?.section !== undefined ? overrides.section : selectedSection
    const act = overrides?.activityType !== undefined ? overrides.activityType : selectedActivityType
    const empName = overrides?.employeeName !== undefined ? overrides.employeeName : employeeNameFilter
    const q = overrides?.q !== undefined ? overrides.q : searchQuery

    const params = new URLSearchParams()
    if (sId && sId !== '0' && sId !== 'all') params.set('siteId', sId)
    if (sDate) params.set('startDate', sDate)
    if (eDate) params.set('endDate', eDate)
    if (sh && sh !== 'Semua Shift') params.set('shift', sh)
    if (st && st !== 'Semua Status') params.set('status', st)
    if (dpt && dpt !== 'Semua Tim') params.set('dept', dpt)
    if (sec && sec !== 'Semua Section') params.set('section', sec)
    if (act && act !== 'Semua Aktivitas') params.set('activityType', act)
    if (empName.trim()) params.set('employeeName', empName.trim())
    else if (q.trim()) params.set('q', q.trim())

    startTransition(() => {
      router.push(`/activity?${params.toString()}`)
    })
    setCurrentPage(1)
    setUnsubmittedPage(1)
  }

  const handleResetFilters = () => {
    const defaultSite = authorizedSites[0]?.id ? String(authorizedSites[0].id) : '0'
    setSelectedSiteId(defaultSite)
    setStartDate('')
    setEndDate('')
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
    if (defaultSite !== '0') params.set('siteId', defaultSite)

    startTransition(() => {
      router.push(`/activity${params.toString() ? `?${params.toString()}` : ''}`)
    })
  }

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return initialData.employees.filter((emp) => {
      if (selectedSiteId !== '0' && selectedSiteId !== 'all' && emp.siteId !== undefined && String(emp.siteId) !== selectedSiteId) {
        return false
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

  // Filtered unsubmitted employees
  const filteredUnsubmittedEmployees = useMemo(() => {
    return (initialData.unsubmittedEmployees || []).filter((emp) => {
      if (selectedSiteId !== '0' && selectedSiteId !== 'all' && emp.siteId !== undefined && String(emp.siteId) !== selectedSiteId) {
        return false
      }
      if (selectedShift !== 'Semua Shift' && emp.expectedShift !== selectedShift) return false
      if (selectedDept !== 'Semua Tim' && emp.department !== selectedDept) return false
      if (selectedSection !== 'Semua Section' && emp.section !== selectedSection) return false

      const effectiveSearch = (searchQuery || employeeNameFilter).trim().toLowerCase()
      if (effectiveSearch) {
        return (
          emp.name.toLowerCase().includes(effectiveSearch) ||
          emp.employeeId.toLowerCase().includes(effectiveSearch) ||
          emp.jobTitle.toLowerCase().includes(effectiveSearch) ||
          emp.department.toLowerCase().includes(effectiveSearch) ||
          (emp.section && emp.section.toLowerCase().includes(effectiveSearch)) ||
          emp.rosterCode.toLowerCase().includes(effectiveSearch)
        )
      }
      return true
    })
  }, [
    initialData.unsubmittedEmployees,
    selectedSiteId,
    selectedShift,
    selectedDept,
    selectedSection,
    searchQuery,
    employeeNameFilter,
  ])

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredEmployees.slice(start, start + pageSize)
  }, [filteredEmployees, currentPage, pageSize])

  const unsubmittedTotalPages = Math.max(1, Math.ceil(filteredUnsubmittedEmployees.length / pageSize))
  const paginatedUnsubmittedEmployees = useMemo(() => {
    const start = (unsubmittedPage - 1) * pageSize
    return filteredUnsubmittedEmployees.slice(start, start + pageSize)
  }, [filteredUnsubmittedEmployees, unsubmittedPage, pageSize])

  // Export Table to CSV
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
      'Jabatan / Section',
      'Shift',
      'Jam Check-in',
      'Jam Checkout',
      'Aktivitas Utama',
      'Unit / Tire ID',
      'Status Aktivitas',
      'Progres (%)',
      'Update Terakhir',
    ]

    const rows = filteredEmployees.map((e) => [
      `"${e.employeeId}"`,
      `"${e.name}"`,
      `"${e.jobTitle}"`,
      `"${e.shift}"`,
      `"${e.checkInTime}"`,
      `"${e.checkOutTime || '-'}"`,
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

  // Export specific employee detail tasks to CSV
  const handleExportDetailCsv = (emp: EmployeeActivityRow) => {
    const headers = [
      'No',
      'Jam Kerja',
      'Durasi',
      'Unit',
      'Aktivitas / Tugas',
      'Grup',
      'Poin',
      'Status',
      'Catatan Lapangan',
      'Link Foto Bukti',
    ]
    const rows = emp.tasks.map((t, idx) => [
      `"${idx + 1}"`,
      `"${t.startedAt || '-'} - ${t.endedAt || '-'}"`,
      `"${t.durationLabel || '-'}"`,
      `"${t.unitNumber || '-'}"`,
      `"${(t.label || '').replace(/"/g, '""')}"`,
      `"${(t.groupName || '-').replace(/"/g, '""')}"`,
      `"${t.points || 0}"`,
      `"${t.status}"`,
      `"${(t.remarks || '-').replace(/"/g, '""')}"`,
      `"${t.photoUrl || '-'}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `MAESTRO_Activity_${emp.name.replace(/\s+/g, '_')}_${(emp.workDate || 'Report').replace(/\s+/g, '_')}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderStatusBadge = (status: EmployeeActivityRow['status']) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
            Selesai
          </span>
        )
      case 'Berjalan':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200/60">
            Berjalan
          </span>
        )
      case 'Menunggu':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/60">
            Menunggu
          </span>
        )
      case 'Terlambat':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/60">
            Terlambat
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        )
    }
  }

  const renderProgressBar = (progress: number, status: EmployeeActivityRow['status']) => {
    let barColor = 'bg-sky-500'
    if (status === 'Selesai') barColor = 'bg-emerald-500'
    if (status === 'Menunggu') barColor = 'bg-amber-500'
    if (status === 'Terlambat') barColor = 'bg-rose-500'

    return (
      <div className="flex items-center gap-2.5">
        <div className="w-20 sm:w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-800 w-8">{progress}%</span>
      </div>
    )
  }

  const currentSiteName =
    authorizedSites.find((s) => String(s.id) === selectedSiteId)?.name ||
    authorizedSites[0]?.name ||
    'Seluruh Site'

  const kpis = initialData.kpis || {
    karyawanAktif: { value: 0, total: 0, change: '0%' },
    hadirCheckIn: { value: 0, change: '0%' },
    aktivitasSelesai: { value: 0, change: '0%' },
    sedangBerjalan: { value: 0, change: '0%' },
    terlambatBelumUpdate: { value: 0, change: '0%' },
  }

  return (
    <div className="w-full space-y-8 text-slate-800">
      {/* ── Top Header & Context Bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/70 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Daily Activity Monitoring</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/60">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              {customerInfo.name}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
            Daily Activity &amp; Manpower
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring aktivitas teknisi, log pengerjaan ban, dan progres servis harian di site {currentSiteName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            disabled={isPending}
            className="h-9 gap-1.5 rounded-full border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400", isPending && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── 5 KPI Executive Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Karyawan Terjadwal */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/70 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Karyawan Terjadwal</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              {kpis.karyawanAktif.value}
            </span>
            <span className="text-xs text-slate-400">/ {kpis.karyawanAktif.total} Total</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            <span>{kpis.karyawanAktif.change || 'Total teknisi site'}</span>
          </div>
        </div>

        {/* Hadir Check-In */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/70 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hadir Check-In</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              {kpis.hadirCheckIn.value}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {kpis.karyawanAktif.value > 0
                ? `${Math.round((kpis.hadirCheckIn.value / kpis.karyawanAktif.value) * 100)}%`
                : '100%'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            <span>{kpis.hadirCheckIn.change || 'Tercatat hadir di site'}</span>
          </div>
        </div>

        {/* Aktivitas Selesai */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/70 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Aktivitas Selesai</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              {kpis.aktivitasSelesai.value}
            </span>
            <span className="text-xs font-semibold text-indigo-600">Tugas</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            <span>{kpis.aktivitasSelesai.change || 'Pekerjaan selesai 100%'}</span>
          </div>
        </div>

        {/* Sedang Berjalan */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/70 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sedang Berjalan</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              {kpis.sedangBerjalan.value}
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">In Progress</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            <span>{kpis.sedangBerjalan.change || 'Aktif dikerjakan saat ini'}</span>
          </div>
        </div>

        {/* Pending / Belum Update */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/70 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending / Terlambat</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              {kpis.terlambatBelumUpdate.value}
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">Pending</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            <span>{kpis.terlambatBelumUpdate.change || 'Belum update progres'}</span>
          </div>
        </div>
      </div>

      {/* ── Advanced Filter Bar ── */}
      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-2xs p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3.5 items-end">
          {/* Site Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Site Operasional
            </label>
            <select
              aria-label="Pilih Site"
              value={selectedSiteId}
              onChange={(e) => {
                const val = e.target.value
                setSelectedSiteId(val)
                applyFilters({ siteId: val })
              }}
              className="w-full text-xs font-semibold bg-[#f8f9fa] border border-slate-200/80 rounded-2xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white cursor-pointer truncate transition"
            >
              {authorizedSites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dari Tanggal */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Dari Tanggal
            </label>
            <input
              type="date"
              aria-label="Pilih Dari Tanggal"
              value={startDate}
              onChange={(e) => {
                const val = e.target.value
                setStartDate(val)
                applyFilters({ startDate: val })
              }}
              className="w-full text-xs font-semibold bg-[#f8f9fa] border border-slate-200/80 rounded-2xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Sampai Tanggal
            </label>
            <input
              type="date"
              aria-label="Pilih Sampai Tanggal"
              value={endDate}
              onChange={(e) => {
                const val = e.target.value
                setEndDate(val)
                applyFilters({ endDate: val })
              }}
              className="w-full text-xs font-semibold bg-[#f8f9fa] border border-slate-200/80 rounded-2xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Department */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Departemen
            </label>
            <select
              aria-label="Pilih Departemen"
              value={selectedDept}
              onChange={(e) => {
                const val = e.target.value
                setSelectedDept(val)
                applyFilters({ dept: val })
              }}
              className="w-full text-xs font-semibold bg-[#f8f9fa] border border-slate-200/80 rounded-2xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white cursor-pointer transition"
            >
              <option value="Semua Dept">Semua Dept</option>
              {(initialData.departmentsList || []).map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shift */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Shift
            </label>
            <select
              aria-label="Pilih Shift"
              value={selectedShift}
              onChange={(e) => {
                const val = e.target.value
                setSelectedShift(val)
                applyFilters({ shift: val })
              }}
              className="w-full text-xs font-semibold bg-[#f8f9fa] border border-slate-200/80 rounded-2xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white cursor-pointer transition"
            >
              <option value="Semua Shift">Semua Shift</option>
              <option value="Pagi">Day Shift (Pagi)</option>
              <option value="Siang">Middle Shift (Siang)</option>
              <option value="Malam">Night Shift (Malam)</option>
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Section
            </label>
            <select
              aria-label="Pilih Section"
              value={selectedSection}
              onChange={(e) => {
                const val = e.target.value
                setSelectedSection(val)
                applyFilters({ section: val })
              }}
              className="w-full text-xs font-semibold bg-[#f8f9fa] border border-slate-200/80 rounded-2xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white cursor-pointer transition"
            >
              <option value="Semua Section">Semua Section</option>
              {(initialData.sectionsList || []).map((sec) => (
                <option key={sec.id} value={sec.name}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Status Aktivitas
            </label>
            <select
              aria-label="Pilih Status"
              value={selectedEmployeeStatus}
              onChange={(e) => {
                const val = e.target.value
                setSelectedEmployeeStatus(val)
                applyFilters({ status: val })
              }}
              className="w-full text-xs font-semibold bg-[#f8f9fa] border border-slate-200/80 rounded-2xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white cursor-pointer transition"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Berjalan">Berjalan</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Cari Karyawan / Unit
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Nama / Unit..."
                value={employeeNameFilter}
                onChange={(e) => {
                  setEmployeeNameFilter(e.target.value)
                  setSearchQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ employeeName: employeeNameFilter })
                }}
                className="h-[38px] pl-8 text-xs bg-[#f8f9fa] border-slate-200/80 rounded-2xl placeholder:text-slate-400 font-medium focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:border-amber-500 focus-visible:bg-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => applyFilters()}
              className="flex-1 h-[38px] bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-xs transition"
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Terapkan
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              title="Reset Semua Filter"
              className="h-[38px] w-[38px] p-0 border-slate-200 text-slate-400 hover:text-slate-800 rounded-full text-xs bg-white shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Content Tabs & Tables ── */}
      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-2xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 p-4 sm:p-5 gap-3 bg-[#fbfbfc]">
          <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-slate-100/90 border border-slate-200/60">
            <button
              onClick={() => setActiveTab('submitted')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer",
                activeTab === 'submitted'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <CheckCircle2 className={cn("w-3.5 h-3.5", activeTab === 'submitted' ? "text-amber-500" : "text-slate-400")} />
              <span>Sudah Mengisi Aktivitas</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === 'submitted' ? "bg-amber-100 text-amber-900" : "bg-slate-200/70 text-slate-600"
              )}>
                {filteredEmployees.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unsubmitted')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer",
                activeTab === 'unsubmitted'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <AlertTriangle className={cn("w-3.5 h-3.5", activeTab === 'unsubmitted' ? "text-amber-500" : "text-slate-400")} />
              <span>Belum Mengisi Aktivitas</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === 'unsubmitted' ? "bg-amber-100 text-amber-900" : "bg-slate-200/70 text-slate-600"
              )}>
                {filteredUnsubmittedEmployees.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium self-start sm:self-center">
            Menampilkan data untuk site <strong className="text-slate-800 font-bold">{currentSiteName}</strong>
          </div>
        </div>

        {/* Tab 1: Sudah Mengisi Aktivitas Table */}
        {activeTab === 'submitted' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-5">Karyawan &amp; Role</th>
                    <th className="py-4 px-5">Section / Tim</th>
                    <th className="py-4 px-5">Shift &amp; Jam Kerja</th>
                    <th className="py-4 px-5">Unit &amp; Aktivitas Utama</th>
                    <th className="py-4 px-5">Progress Kerja</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers className="w-9 h-9 text-slate-300 stroke-[1.5]" />
                          <p className="font-bold text-slate-700 text-sm">Tidak Ada Data Aktivitas</p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Tidak ditemukan data aktivitas karyawan untuk kriteria filter dan periode tanggal yang dipilih.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((row) => (
                      <tr key={`${row.employeeDbId}-${row.sessionId}`} className="hover:bg-slate-50/70 transition">
                        {/* Karyawan */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {row.name ? row.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{row.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{row.jobTitle || 'Teknisi'} • ID: {row.employeeId}</div>
                            </div>
                          </div>
                        </td>

                        {/* Section / Tim */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-800 text-xs">{row.section || row.department || '-'}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{row.department}</div>
                        </td>

                        {/* Shift & Jam Kerja */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {row.shift}
                            </span>
                            <span className="text-slate-700 font-semibold text-xs">
                              {row.checkInTime || '-'} {row.checkOutTime ? `→ ${row.checkOutTime}` : ''}
                            </span>
                          </div>
                          {row.workDate && (
                            <div className="text-[10px] text-slate-400 mt-1">{row.workDate}</div>
                          )}
                        </td>

                        {/* Unit & Aktivitas Utama */}
                        <td className="py-4 px-5 max-w-xs">
                          <div className="font-semibold text-slate-900 text-xs line-clamp-1" title={row.primaryActivity}>
                            {row.primaryActivity || 'Pemeriksaan Rutin'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {row.unitTireId && row.unitTireId !== '-' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200/60">
                                <Truck className="w-2.5 h-2.5" />
                                {row.unitTireId}
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-400">
                              {row.tasksCount || row.tasks?.length || 0} Tugas
                            </span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-4 px-5">
                          {renderProgressBar(row.progress, row.status)}
                          <div className="text-[10px] text-slate-400 mt-1">
                            Update: {row.lastUpdate || '-'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(row.status)}
                          </div>
                        </td>

                        {/* Aksi: Lihat Detail */}
                        <td className="py-4 px-5 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveDetailEmployee(row)}
                            className="h-8 px-3 rounded-full border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>Detail</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-[#fbfbfc]">
                <span className="text-xs text-slate-400 font-medium">
                  Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredEmployees.length)} dari {filteredEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs rounded-full border-slate-200 bg-white"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-3 text-xs font-bold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs rounded-full border-slate-200 bg-white"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Belum Mengisi Aktivitas Table */}
        {activeTab === 'unsubmitted' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-5">Karyawan</th>
                    <th className="py-4 px-5">Section / Tim</th>
                    <th className="py-4 px-5">Shift Terjadwal</th>
                    <th className="py-4 px-5">Jadwal Roster</th>
                    <th className="py-4 px-5">Status Kehadiran</th>
                    <th className="py-4 px-5">Status Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedUnsubmittedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-9 h-9 text-emerald-500 stroke-[1.5]" />
                          <p className="font-bold text-slate-700 text-sm">Semua Karyawan Sudah Mengisi</p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Seluruh karyawan yang terjadwal dan hadir di site telah mengisi log aktivitas harian mereka.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUnsubmittedEmployees.map((emp) => (
                      <tr key={emp.employeeDbId} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{emp.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{emp.jobTitle} • ID: {emp.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-800">{emp.section || emp.department || '-'}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{emp.department}</div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {emp.expectedShift}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-800">{emp.rosterCode}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{emp.rosterType || '5:2'}</div>
                        </td>
                        <td className="py-4 px-5">
                          {emp.attendanceStatus === 'Hadir' ? (
                            <div>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                                Hadir
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1">Check-in: {emp.checkInTime}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Belum Check-In
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/60">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Belum Mengisi Log
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {unsubmittedTotalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-[#fbfbfc]">
                <span className="text-xs text-slate-400 font-medium">
                  Menampilkan {(unsubmittedPage - 1) * pageSize + 1} - {Math.min(unsubmittedPage * pageSize, filteredUnsubmittedEmployees.length)} dari {filteredUnsubmittedEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === 1}
                    onClick={() => setUnsubmittedPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs rounded-full border-slate-200 bg-white"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-3 text-xs font-bold text-slate-700">
                    {unsubmittedPage} / {unsubmittedTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === unsubmittedTotalPages}
                    onClick={() => setUnsubmittedPage((p) => Math.min(unsubmittedTotalPages, p + 1))}
                    className="h-8 px-3 text-xs rounded-full border-slate-200 bg-white"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail Activity Modal ── */}
      {activeDetailEmployee && (
        <Dialog open={Boolean(activeDetailEmployee)} onOpenChange={(open) => !open && setActiveDetailEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-slate-200/80 shadow-2xl bg-white">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                  {activeDetailEmployee.name ? activeDetailEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 font-display">
                    {activeDetailEmployee.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 mt-0.5">
                    {activeDetailEmployee.jobTitle} • {activeDetailEmployee.section || activeDetailEmployee.department} • Shift {activeDetailEmployee.shift} ({activeDetailEmployee.workDate || 'Hari Ini'})
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportDetailCsv(activeDetailEmployee)}
                  className="h-8 gap-1.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full px-3.5 bg-white shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-slate-200/70">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jam Check-In / Out</span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {activeDetailEmployee.checkInTime || '-'} {activeDetailEmployee.checkOutTime ? `→ ${activeDetailEmployee.checkOutTime}` : ''}
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-slate-200/70">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tugas</span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {activeDetailEmployee.tasks?.length || 0} Tugas
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-slate-200/70">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Progress Pengerjaan</span>
                  <div className="mt-1.5">
                    {renderProgressBar(activeDetailEmployee.progress, activeDetailEmployee.status)}
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-slate-200/70">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Operasional</span>
                  <div className="mt-1.5">
                    {renderStatusBadge(activeDetailEmployee.status)}
                  </div>
                </div>
              </div>

              {/* Tasks & Timeline Section */}
              <div className="space-y-3.5">
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Rincian Pekerjaan &amp; Aktivitas Lapangan</span>
                </h3>

                {(!activeDetailEmployee.tasks || activeDetailEmployee.tasks.length === 0) ? (
                  <div className="py-10 text-center bg-[#f8f9fa] rounded-2xl border border-slate-200/70 text-slate-400 text-xs">
                    Belum ada detail tugas pengerjaan yang tercatat.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDetailEmployee.tasks.map((task: ActivityTaskItem, idx: number) => (
                      <div
                        key={task.id || idx}
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{task.label}</span>
                            {task.groupName && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {task.groupName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {task.unitNumber && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200/60">
                                <Truck className="w-3 h-3" />
                                {task.unitNumber}
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-slate-400">
                              {task.startedAt || '-'} {task.endedAt ? `→ ${task.endedAt}` : ''}
                            </span>
                          </div>
                        </div>

                        {task.remarks && (
                          <p className="text-xs text-slate-600 bg-[#f8f9fa] p-3 rounded-xl border border-slate-100 leading-relaxed">
                            {task.remarks}
                          </p>
                        )}

                        {/* Evidence Photos */}
                        {(task.photoUrl || (task.photos && task.photos.length > 0)) && (
                          <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Foto Bukti Pengerjaan Lapangan
                            </span>

                            <div className="flex flex-wrap gap-3">
                              {Array.from(new Set([task.photoUrl, ...(task.photos || [])].filter(Boolean))).map(
                                (url: any, pIdx: number) => {
                                  const displayUrl = formatPhotoDisplayUrl(url, 400)
                                  return (
                                    <div
                                      key={pIdx}
                                      onClick={() =>
                                        setLightboxPhoto({
                                          url,
                                          label: task.label,
                                          unitNumber: task.unitNumber,
                                          time: task.startedAt,
                                          remarks: task.remarks,
                                        })
                                      }
                                      className="group relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={displayUrl}
                                        alt={`Bukti ${task.label}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                        <ZoomIn className="w-5 h-5" />
                                      </div>
                                    </div>
                                  )
                                }
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Handover & Session Summary Notes */}
              {activeDetailEmployee.sessions && activeDetailEmployee.sessions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Catatan Handover &amp; Ringkasan Sesi
                  </h4>
                  <div className="space-y-2.5">
                    {activeDetailEmployee.sessions.map((s, sIdx) => (
                      <div key={s.id || sIdx} className="bg-[#f8f9fa] p-4 rounded-2xl border border-slate-200/70 text-xs text-slate-600">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-800">Sesi {s.sessionCode || `#${s.id}`} • Shift {s.shiftCode}</span>
                          <span className="text-[10px] text-slate-400">{s.workDate}</span>
                        </div>
                        {s.summaryRemark ? (
                          <p className="text-slate-600 leading-relaxed">{s.summaryRemark}</p>
                        ) : (
                          <p className="text-slate-400 italic">Tidak ada catatan khusus pada sesi ini.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Lightbox Photo Zoom Modal ── */}
      {lightboxPhoto && (
        <Dialog open={Boolean(lightboxPhoto)} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-white rounded-3xl">
            <div className="relative w-full max-h-[75vh] flex items-center justify-center bg-black/90 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formatPhotoDisplayUrl(lightboxPhoto.url)}
                alt={lightboxPhoto.label}
                onLoad={() => setIsLightboxLoading(false)}
                onError={() => {
                  setIsLightboxLoading(false)
                  setLightboxHasError(true)
                }}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl"
              />

              {isLightboxLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
              )}

              {lightboxHasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-sm font-semibold">Foto Tidak Dapat Dimuat</p>
                  <p className="text-xs text-slate-400 mt-1">Berkas foto mungkin sedang diproses atau tidak tersedia.</p>
                </div>
              )}
            </div>

            <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{lightboxPhoto.label}</p>
                <p className="text-[11px] text-slate-400">
                  {lightboxPhoto.unitNumber ? `Unit: ${lightboxPhoto.unitNumber}` : ''} {lightboxPhoto.time ? `• Waktu: ${lightboxPhoto.time}` : ''}
                </p>
                {lightboxPhoto.remarks && (
                  <p className="text-[11px] text-slate-300 mt-1 max-w-lg">{lightboxPhoto.remarks}</p>
                )}
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white rounded-full px-3.5"
              >
                <a
                  href={resolveUploadUrl(lightboxPhoto.url, { absolute: true })}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Unduh
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
