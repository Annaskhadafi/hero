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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            Selesai
          </span>
        )
      case 'Berjalan':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            Berjalan
          </span>
        )
      case 'Menunggu':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
            Menunggu
          </span>
        )
      case 'Terlambat':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
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
    let barColor = 'bg-blue-600'
    if (status === 'Selesai') barColor = 'bg-emerald-600'
    if (status === 'Menunggu') barColor = 'bg-amber-500'
    if (status === 'Terlambat') barColor = 'bg-rose-500'

    return (
      <div className="flex items-center gap-2.5">
        <div className="w-20 sm:w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-700 w-8">{progress}%</span>
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
    <div className="w-full space-y-6 text-slate-800">
      {/* ── Top Header & Context Bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 -ml-2 gap-1 px-2 text-slate-500 hover:text-slate-900"
            >
              <Link href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Dashboard</span>
              </Link>
            </Button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Daily Activity Monitoring</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
              <Building2 className="w-3 h-3 text-amber-600" />
              {customerInfo.name}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
            Daily Activity &amp; Manpower Progress
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring aktivitas teknisi, log pengerjaan ban, dan progress servis harian di site {currentSiteName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Customer Portal: <strong className="text-slate-900 font-semibold">Read Only</strong>
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 rounded-xl border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            disabled={isPending}
            className="h-9 gap-1.5 rounded-xl border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", isPending && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── 5 KPI Executive Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Karyawan Aktif */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Karyawan Terjadwal</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">
              {kpis.karyawanAktif.value}
            </span>
            <span className="text-xs text-slate-400">/ {kpis.karyawanAktif.total} Total</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span>{kpis.karyawanAktif.change || 'Total teknisi site'}</span>
          </div>
        </div>

        {/* Hadir Check-In */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hadir Check-In</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">
              {kpis.hadirCheckIn.value}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              {kpis.karyawanAktif.value > 0
                ? `${Math.round((kpis.hadirCheckIn.value / kpis.karyawanAktif.value) * 100)}%`
                : '100%'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>{kpis.hadirCheckIn.change || 'Tercatat hadir di site'}</span>
          </div>
        </div>

        {/* Aktivitas Selesai */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Aktivitas Selesai</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">
              {kpis.aktivitasSelesai.value}
            </span>
            <span className="text-xs font-semibold text-indigo-600">Pekerjaan</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>{kpis.aktivitasSelesai.change || 'Pekerjaan selesai 100%'}</span>
          </div>
        </div>

        {/* Sedang Berjalan */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sedang Berjalan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">
              {kpis.sedangBerjalan.value}
            </span>
            <span className="text-xs font-semibold text-amber-600">In Progress</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>{kpis.sedangBerjalan.change || 'Aktif dikerjakan saat ini'}</span>
          </div>
        </div>

        {/* Terlambat / Belum Update */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending / Terlambat</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">
              {kpis.terlambatBelumUpdate.value}
            </span>
            <span className="text-xs font-semibold text-rose-600">Pending</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            <span>{kpis.terlambatBelumUpdate.change || 'Belum update progres'}</span>
          </div>
        </div>
      </div>

      {/* ── Advanced Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 items-end">
          {/* Site Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Site Operasional</span>
            </label>
            <select
              aria-label="Pilih Site"
              value={selectedSiteId}
              onChange={(e) => {
                const val = e.target.value
                setSelectedSiteId(val)
                applyFilters({ siteId: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
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
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Dari Tanggal</label>
            <input
              type="date"
              aria-label="Pilih Dari Tanggal"
              value={startDate}
              onChange={(e) => {
                const val = e.target.value
                setStartDate(val)
                applyFilters({ startDate: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Sampai Tanggal</label>
            <input
              type="date"
              aria-label="Pilih Sampai Tanggal"
              value={endDate}
              onChange={(e) => {
                const val = e.target.value
                setEndDate(val)
                applyFilters({ endDate: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
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
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
            >
              <option value="Semua Shift">Semua Shift</option>
              <option value="Pagi">Day Shift (Pagi)</option>
              <option value="Siang">Middle Shift (Siang)</option>
              <option value="Malam">Night Shift (Malam)</option>
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
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
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
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Status Aktivitas</label>
            <select
              aria-label="Pilih Status"
              value={selectedEmployeeStatus}
              onChange={(e) => {
                const val = e.target.value
                setSelectedEmployeeStatus(val)
                applyFilters({ status: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
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
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Cari Karyawan / Unit</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Nama / Unit / WO..."
                value={employeeNameFilter}
                onChange={(e) => {
                  setEmployeeNameFilter(e.target.value)
                  setSearchQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ employeeName: employeeNameFilter })
                }}
                className="h-[36px] pl-8 text-xs bg-slate-50 border-slate-200/90 rounded-xl placeholder:text-slate-400 font-normal focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:border-amber-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="default"
              size="sm"
              onClick={() => applyFilters()}
              className="flex-1 h-[36px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Terapkan
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              title="Reset Semua Filter"
              className="h-[36px] px-2.5 border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Content Tabs & Tables ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 pt-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('submitted')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
                activeTab === 'submitted'
                  ? "border-amber-500 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <CheckCircle2 className={cn("w-4 h-4", activeTab === 'submitted' ? "text-amber-500" : "text-slate-400")} />
              <span>Sudah Mengisi Aktivitas</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === 'submitted' ? "bg-amber-100 text-amber-800" : "bg-slate-200/70 text-slate-600"
              )}>
                {filteredEmployees.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unsubmitted')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
                activeTab === 'unsubmitted'
                  ? "border-amber-500 text-slate-900 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <AlertTriangle className={cn("w-4 h-4", activeTab === 'unsubmitted' ? "text-amber-500" : "text-slate-400")} />
              <span>Belum Mengisi Aktivitas</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === 'unsubmitted' ? "bg-amber-100 text-amber-800" : "bg-slate-200/70 text-slate-600"
              )}>
                {filteredUnsubmittedEmployees.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Menampilkan data untuk site <strong className="text-slate-800">{currentSiteName}</strong>
          </div>
        </div>

        {/* Tab 1: Sudah Mengisi Aktivitas Table */}
        {activeTab === 'submitted' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Karyawan &amp; Role</th>
                    <th className="py-3 px-4">Section / Tim</th>
                    <th className="py-3 px-4">Shift &amp; Jam Kerja</th>
                    <th className="py-3 px-4">Unit &amp; Aktivitas Utama</th>
                    <th className="py-3 px-4">Progress Kerja</th>
                    <th className="py-3 px-4">Skor KPI &amp; Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                          <p className="font-semibold text-slate-600 text-sm">Tidak Ada Data Aktivitas</p>
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
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                              {row.name ? row.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{row.name}</div>
                              <div className="text-[11px] text-slate-500">{row.jobTitle || 'Teknisi'} • ID: {row.employeeId}</div>
                            </div>
                          </div>
                        </td>

                        {/* Section / Tim */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 text-xs">{row.section || row.department || '-'}</div>
                          <div className="text-[11px] text-slate-400">{row.department}</div>
                        </td>

                        {/* Shift & Jam Kerja */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {row.shift}
                            </span>
                            <span className="text-slate-700 font-semibold text-xs">
                              {row.checkInTime || '-'} {row.checkOutTime ? `→ ${row.checkOutTime}` : ''}
                            </span>
                          </div>
                          {row.workDate && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{row.workDate}</div>
                          )}
                        </td>

                        {/* Unit & Aktivitas Utama */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 text-xs line-clamp-1" title={row.primaryActivity}>
                            {row.primaryActivity || 'Pemeriksaan Rutin'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {row.unitTireId && row.unitTireId !== '-' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Truck className="w-2.5 h-2.5" />
                                {row.unitTireId}
                              </span>
                            ) : null}
                            <span className="text-[11px] text-slate-500">
                              {row.tasksCount || row.tasks?.length || 0} Tugas
                            </span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-3 px-4">
                          {renderProgressBar(row.progress, row.status)}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Update: {row.lastUpdate || '-'}
                          </div>
                        </td>

                        {/* Skor KPI & Status */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(row.status)}
                            {row.totalPoints > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {row.totalPoints} Pts
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Aksi: Lihat Detail */}
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveDetailEmployee(row)}
                            className="h-7 px-2.5 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredEmployees.length)} dari {filteredEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs rounded-lg"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-2 text-xs font-bold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs rounded-lg"
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
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Karyawan</th>
                    <th className="py-3 px-4">Section / Tim</th>
                    <th className="py-3 px-4">Shift Terjadwal</th>
                    <th className="py-3 px-4">Jadwal Roster</th>
                    <th className="py-3 px-4">Status Kehadiran</th>
                    <th className="py-3 px-4">Status Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedUnsubmittedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 stroke-[1.5]" />
                          <p className="font-semibold text-slate-700 text-sm">Semua Karyawan Sudah Mengisi</p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Seluruh karyawan yang terjadwal dan hadir di site telah mengisi log aktivitas harian mereka.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUnsubmittedEmployees.map((emp) => (
                      <tr key={emp.employeeDbId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                              {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{emp.name}</div>
                              <div className="text-[11px] text-slate-500">{emp.jobTitle} • ID: {emp.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{emp.section || emp.department || '-'}</div>
                          <div className="text-[11px] text-slate-400">{emp.department}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {emp.expectedShift}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{emp.rosterCode}</div>
                          <div className="text-[11px] text-slate-400">{emp.rosterType || '5:2'}</div>
                        </td>
                        <td className="py-3 px-4">
                          {emp.attendanceStatus === 'Hadir' ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                Hadir
                              </span>
                              <div className="text-[10px] text-slate-400 mt-0.5">Check-in: {emp.checkInTime}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Belum Check-In
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 bg-slate-50/50">
                <span className="text-xs text-slate-500">
                  Menampilkan {(unsubmittedPage - 1) * pageSize + 1} - {Math.min(unsubmittedPage * pageSize, filteredUnsubmittedEmployees.length)} dari {filteredUnsubmittedEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === 1}
                    onClick={() => setUnsubmittedPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs rounded-lg"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-2 text-xs font-bold text-slate-700">
                    {unsubmittedPage} / {unsubmittedTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === unsubmittedTotalPages}
                    onClick={() => setUnsubmittedPage((p) => Math.min(unsubmittedTotalPages, p + 1))}
                    className="h-8 px-3 text-xs rounded-lg"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail Activity Modal (Read-Only) ── */}
      {activeDetailEmployee && (
        <Dialog open={Boolean(activeDetailEmployee)} onOpenChange={(open) => !open && setActiveDetailEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200/90 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                  {activeDetailEmployee.name ? activeDetailEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 font-display">
                    {activeDetailEmployee.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    {activeDetailEmployee.jobTitle} • {activeDetailEmployee.section || activeDetailEmployee.department} • Shift {activeDetailEmployee.shift} ({activeDetailEmployee.workDate || 'Hari Ini'})
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportDetailCsv(activeDetailEmployee)}
                  className="h-8 gap-1.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-500">Jam Check-In / Out</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeDetailEmployee.checkInTime || '-'} {activeDetailEmployee.checkOutTime ? `→ ${activeDetailEmployee.checkOutTime}` : ''}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-500">Total Tugas</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeDetailEmployee.tasks?.length || 0} Tugas
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-500">Progress Pengerjaan</span>
                  <div className="mt-1">
                    {renderProgressBar(activeDetailEmployee.progress, activeDetailEmployee.status)}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
                  <span className="text-[11px] font-semibold text-slate-500">Status Operasional</span>
                  <div className="mt-0.5">
                    {renderStatusBadge(activeDetailEmployee.status)}
                  </div>
                </div>
              </div>

              {/* Tasks & Timeline Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>Rincian Pekerjaan &amp; Aktivitas Lapangan</span>
                </h3>

                {(!activeDetailEmployee.tasks || activeDetailEmployee.tasks.length === 0) ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200/70 text-slate-400 text-xs">
                    Belum ada detail tugas pengerjaan yang tercatat.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDetailEmployee.tasks.map((task: ActivityTaskItem, idx: number) => (
                      <div
                        key={task.id || idx}
                        className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{task.label}</span>
                            {task.groupName && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {task.groupName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {task.unitNumber && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Truck className="w-3 h-3" />
                                {task.unitNumber}
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-slate-500">
                              {task.startedAt || '-'} {task.endedAt ? `→ ${task.endedAt}` : ''}
                            </span>
                          </div>
                        </div>

                        {task.remarks && (
                          <p className="text-xs text-slate-600 bg-slate-50/60 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                            {task.remarks}
                          </p>
                        )}

                        {/* Evidence Photos */}
                        {(task.photoUrl || (task.photos && task.photos.length > 0)) && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Foto Bukti Pengerjaan Lapangan
                            </span>

                            <div className="flex flex-wrap gap-2.5">
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
                                      className="group relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition"
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
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Catatan Handover &amp; Ringkasan Sesi
                  </h4>
                  <div className="space-y-2">
                    {activeDetailEmployee.sessions.map((s, sIdx) => (
                      <div key={s.id || sIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs text-slate-600">
                        <div className="flex items-center justify-between mb-1">
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
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-white rounded-2xl">
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
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
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

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
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
                className="h-8 gap-1 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
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
