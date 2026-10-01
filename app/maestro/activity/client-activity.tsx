'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Headphones,
  Image as ImageIcon,
  Layers,
  Lock,
  MapPin,
  PackageCheck,
  PhoneCall,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
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
  const pathname = usePathname() || ''
  const [isPending, startTransition] = useTransition()

  const isPrefixed = pathname.startsWith('/maestro')
  const getLink = React.useCallback(
    (target: string) => {
      const clean = target.replace(/^\/maestro/, '')
      return isPrefixed ? `/maestro${clean}` : clean || '/'
    },
    [isPrefixed],
  )

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

  // Export table to formatted Excel (.xlsx) with neat columns
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
        'Jabatan / Section': e.jobTitle,
        'Shift': e.shift,
        'Jam Check-in': e.checkInTime,
        'Jam Checkout': e.checkOutTime || '-',
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
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
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
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-400 shadow-2xs">
            Selesai
          </span>
        )
      case 'Berjalan':
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-950 border border-blue-400 shadow-2xs">
            Berjalan
          </span>
        )
      case 'Menunggu':
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-400 shadow-2xs">
            Menunggu
          </span>
        )
      case 'Terlambat':
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-950 border border-rose-400 shadow-2xs">
            Terlambat
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-950 border border-slate-400 shadow-2xs">
            {status}
          </span>
        )
    }
  }

  const renderProgressBar = (progress: number, status: EmployeeActivityRow['status']) => {
    let barColor = 'bg-blue-700'
    if (status === 'Selesai') barColor = 'bg-emerald-600'
    if (status === 'Menunggu') barColor = 'bg-amber-600'
    if (status === 'Terlambat') barColor = 'bg-rose-600'

    return (
      <div className="flex items-center gap-3">
        <div className="w-24 sm:w-28 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-400/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <span className="text-xs sm:text-sm font-black text-slate-950 w-10">{progress}%</span>
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
    <div className="w-full space-y-3.5 text-slate-950">
      {/* ── Top Header & Context Bar ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                <Building2 className="w-3 h-3 text-blue-700" />
                {customerInfo.name}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <MapPin className="w-3 h-3 text-blue-700" />
                Site ID: {selectedSiteId}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Shift
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 font-display">
                Daily Activity &amp; Manpower
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden md:inline">
                — Pantau presensi check-in, jadwal roster shift, dan log servis teknisi OTR secara real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              disabled={isPending}
              className="h-8 gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-slate-600", isPending && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 5 KPI Executive Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Karyawan Terjadwal */}
        <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Karyawan Jadwal</span>
            <div className="size-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold border border-blue-200 shrink-0">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-950 font-display">
              {kpis.karyawanAktif.value}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">/ {kpis.karyawanAktif.total} Total</span>
          </div>
        </div>

        {/* Hadir Check-In */}
        <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hadir Check-In</span>
            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shrink-0">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-950 font-display">
              {kpis.hadirCheckIn.value}
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              {kpis.karyawanAktif.value > 0
                ? `${Math.round((kpis.hadirCheckIn.value / kpis.karyawanAktif.value) * 100)}%`
                : '100%'}
            </span>
          </div>
        </div>

        {/* Aktivitas Selesai */}
        <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs hover:border-indigo-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tugas Selesai</span>
            <div className="size-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold border border-indigo-200 shrink-0">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-950 font-display">
              {kpis.aktivitasSelesai.value}
            </span>
            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">Selesai</span>
          </div>
        </div>

        {/* Sedang Berjalan */}
        <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sedang Berjalan</span>
            <div className="size-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200 shrink-0">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-950 font-display">
              {kpis.sedangBerjalan.value}
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">Proses</span>
          </div>
        </div>

        {/* Pending / Belum Update */}
        <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs hover:border-rose-400 transition-all flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Update</span>
            <div className="size-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold border border-rose-200 shrink-0">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-950 font-display">
              {kpis.terlambatBelumUpdate.value}
            </span>
            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">Perlu Update</span>
          </div>
        </div>
      </div>

      {/* ── Advanced Filter Bar ── */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 items-end">
          {/* Site Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
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
              className="w-full h-8.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition shadow-2xs"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
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
              className="w-full h-8.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-2xs"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
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
              className="w-full h-8.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-2xs"
            />
          </div>

          {/* Department */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
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
              className="w-full h-8.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition shadow-2xs"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
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
              className="w-full h-8.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition shadow-2xs"
            >
              <option value="Semua Shift">Semua Shift</option>
              <option value="Pagi">Day Shift (Pagi)</option>
              <option value="Siang">Middle Shift (Siang)</option>
              <option value="Malam">Night Shift (Malam)</option>
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
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
              className="w-full h-8.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition shadow-2xs"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Status
            </label>
            <select
              aria-label="Pilih Status"
              value={selectedEmployeeStatus}
              onChange={(e) => {
                const val = e.target.value
                setSelectedEmployeeStatus(val)
                applyFilters({ status: val })
              }}
              className="w-full h-8.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition shadow-2xs"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
              Cari Nama / Unit
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                className="h-8.5 pl-8 text-xs bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 font-semibold text-slate-900 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 px-3 border border-slate-200 text-slate-700 hover:text-slate-950 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Reset Filter
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => applyFilters()}
            className="h-8 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 mr-1 text-blue-100" />
            Terapkan Filter
          </Button>
        </div>
      </div>

      {/* ── Main Content Tabs & Tables ── */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-3.5 py-2 sm:px-4 sm:py-2.5 gap-2.5 bg-slate-50/70">
          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 border border-slate-200">
            <button
              onClick={() => setActiveTab('submitted')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer",
                activeTab === 'submitted'
                  ? "bg-blue-700 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-200"
              )}
            >
              <CheckCircle2 className={cn("w-3.5 h-3.5", activeTab === 'submitted' ? "text-emerald-300" : "text-slate-500")} />
              <span>Sudah Mengisi Log</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                activeTab === 'submitted' ? "bg-white text-blue-900" : "bg-slate-300/80 text-slate-800"
              )}>
                {filteredEmployees.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unsubmitted')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer",
                activeTab === 'unsubmitted'
                  ? "bg-blue-700 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-200"
              )}
            >
              <AlertTriangle className={cn("w-3.5 h-3.5", activeTab === 'unsubmitted' ? "text-amber-300" : "text-slate-500")} />
              <span>Belum Mengisi Log</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                activeTab === 'unsubmitted' ? "bg-white text-blue-900" : "bg-slate-300/80 text-slate-800"
              )}>
                {filteredUnsubmittedEmployees.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 px-3 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>EXPORT EXCEL (.XLSX)</span>
            </Button>
            <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">
              Site: <b className="text-slate-800">{currentSiteName}</b>
            </span>
          </div>
        </div>

        {/* Tab 1: Sudah Mengisi Aktivitas Table */}
        {activeTab === 'submitted' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Karyawan &amp; Role</th>
                    <th className="py-2.5 px-4">Section / Tim</th>
                    <th className="py-2.5 px-4">Shift &amp; Jam Kerja</th>
                    <th className="py-2.5 px-4">Unit &amp; Aktivitas Utama</th>
                    <th className="py-2.5 px-4">Progress Kerja</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-600">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                          <p className="font-bold text-slate-900 text-sm">Tidak Ada Data Aktivitas</p>
                          <p className="text-xs text-slate-500 font-medium max-w-md">
                            Tidak ditemukan data aktivitas karyawan untuk kriteria filter dan periode tanggal yang dipilih.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((row) => (
                      <tr key={`${row.employeeDbId}-${row.sessionId}`} className="hover:bg-slate-50/80 transition-colors">
                        {/* Karyawan */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-[11px] shrink-0">
                              {row.name ? row.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{row.name}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{row.jobTitle || 'Teknisi'} • ID: {row.employeeId}</div>
                            </div>
                          </div>
                        </td>

                        {/* Section / Tim */}
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900 text-xs">{row.section || row.department || '-'}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">{row.department}</div>
                        </td>

                        {/* Shift & Jam Kerja */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {row.shift}
                            </span>
                            <span className="text-slate-900 font-bold text-xs">
                              {row.checkInTime || '-'} {row.checkOutTime ? `→ ${row.checkOutTime}` : ''}
                            </span>
                          </div>
                          {row.workDate && (
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{row.workDate}</div>
                          )}
                        </td>

                        {/* Unit & Aktivitas Utama */}
                        <td className="py-2.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 text-xs line-clamp-1" title={row.primaryActivity}>
                            {row.primaryActivity || 'Pemeriksaan Rutin'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {row.unitTireId && row.unitTireId !== '-' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                                <Truck className="w-3 h-3 text-blue-700" />
                                {row.unitTireId}
                              </span>
                            ) : null}
                            <span className="text-[10px] text-slate-500 font-medium">
                              {row.tasksCount || row.tasks?.length || 0} Tugas
                            </span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-2.5 px-4">
                          {renderProgressBar(row.progress, row.status)}
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Update: {row.lastUpdate || '-'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5">
                          {renderStatusBadge(row.status)}
                        </td>

                        {/* Aksi: Lihat Detail */}
                        <td className="py-3.5 px-5 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveDetailEmployee(row)}
                            className="h-9 px-3.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 shadow-2xs gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-700" />
                            <span>Lihat Detail</span>
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
              <div className="flex items-center justify-between px-5 py-3.5 border-t-2 border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-700 font-bold">
                  Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredEmployees.length)} dari {filteredEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3.5 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-2xs hover:bg-slate-100"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-2.5 text-xs font-black text-slate-950">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-9 px-3.5 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-2xs hover:bg-slate-100"
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
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Karyawan</th>
                    <th className="py-2.5 px-4">Section / Tim</th>
                    <th className="py-2.5 px-4">Shift Terjadwal</th>
                    <th className="py-2.5 px-4">Jadwal Roster</th>
                    <th className="py-2.5 px-4">Status Kehadiran</th>
                    <th className="py-2.5 px-4">Status Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {paginatedUnsubmittedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-600">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 stroke-[1.5]" />
                          <p className="font-bold text-slate-900 text-sm">Semua Karyawan Sudah Mengisi</p>
                          <p className="text-xs text-slate-500 font-medium max-w-md">
                            Seluruh karyawan yang terjadwal dan hadir di site telah mengisi log aktivitas harian mereka.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUnsubmittedEmployees.map((emp) => (
                      <tr key={emp.employeeDbId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-[11px] shrink-0">
                              {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{emp.name}</div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{emp.jobTitle} • ID: {emp.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900 text-xs">{emp.section || emp.department || '-'}</div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">{emp.department}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {emp.expectedShift}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {emp.rosterCode || 'Reguler'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {emp.attendanceStatus === 'Hadir' ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Hadir
                              </span>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Check-in: {emp.checkInTime}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-950 border border-slate-300">
                              Belum Check-In
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-400">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
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
              <div className="flex items-center justify-between px-5 py-3.5 border-t-2 border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-700 font-bold">
                  Menampilkan {(unsubmittedPage - 1) * pageSize + 1} - {Math.min(unsubmittedPage * pageSize, filteredUnsubmittedEmployees.length)} dari {filteredUnsubmittedEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === 1}
                    onClick={() => setUnsubmittedPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3.5 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-2xs hover:bg-slate-100"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-2.5 text-xs font-black text-slate-950">
                    {unsubmittedPage} / {unsubmittedTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === unsubmittedTotalPages}
                    onClick={() => setUnsubmittedPage((p) => Math.min(unsubmittedTotalPages, p + 1))}
                    className="h-9 px-3.5 text-xs font-bold rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-2xs hover:bg-slate-100"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3 Operational Quick Access Cards & Support Hotline Banner ── */}
      <div className="pt-3 pb-8 space-y-5">
        <div className="flex items-center justify-between border-t-2 border-slate-200/80 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-2 rounded-full bg-blue-600" />
            <div>
              <h3 className="font-display text-base sm:text-lg font-black text-slate-950">
                Modul &amp; Layanan Terintegrasi
              </h3>
              <p className="text-xs font-semibold text-slate-600">
                Akses cepat modul kepatuhan HSE, logistik kargo, dan pusat tiket bantuan.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Card 1: Safety & PTW */}
          <Link
            href={getLink('/safety')}
            className="group flex flex-col justify-between h-full relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xs hover:shadow-md hover:border-emerald-500 transition-all duration-200 cursor-pointer"
          >
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold border border-emerald-300 group-hover:scale-105 transition-transform">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 px-2.5 py-0.5 text-xs font-bold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                  HSE 100%
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 group-hover:text-emerald-700 transition-colors">
                  Safety &amp; PTW Management
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                  Manajemen izin kerja berisiko tinggi (PTW), analisis bahaya kerja JSA, serta catatan zero fatality operasional.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 text-[11px] font-bold">
                  Safe Man Hours
                </span>
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 text-[11px] font-bold">
                  PTW &amp; JSA K3
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-emerald-700 transition-colors">
                Buka Portal Safety
              </span>
              <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-900 group-hover:bg-emerald-700 group-hover:text-white flex items-center justify-center transition-colors font-bold">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 2: Cargo Tracking & PO */}
          <Link
            href={getLink('/tracking')}
            className="group flex flex-col justify-between h-full relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xs hover:shadow-md hover:border-amber-500 transition-all duration-200 cursor-pointer"
          >
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold border border-amber-300 group-hover:scale-105 transition-transform">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-950 border border-amber-400 px-2.5 py-0.5 text-xs font-bold">
                  <Truck className="h-3.5 w-3.5 text-amber-700" />
                  SUPPLY CHAIN
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 group-hover:text-amber-700 transition-colors">
                  PO &amp; Cargo Tracking
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                  Lacak pergerakan manifest kargo antar site, status DO pengiriman SAP, dan konsinyasi eVHS.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 text-[11px] font-bold">
                  Manifest Site
                </span>
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 text-[11px] font-bold">
                  DO SAP &amp; eVHS
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-amber-700 transition-colors">
                Buka Pelacakan Kargo
              </span>
              <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-900 group-hover:bg-amber-700 group-hover:text-white flex items-center justify-center transition-colors font-bold">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 3: Helpdesk & Tiket */}
          <Link
            href={getLink('/tickets')}
            className="group flex flex-col justify-between h-full relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xs hover:shadow-md hover:border-indigo-500 transition-all duration-200 cursor-pointer"
          >
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold border border-indigo-300 group-hover:scale-105 transition-transform">
                  <Headphones className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-950 border border-indigo-400 px-2.5 py-0.5 text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-700" />
                  AI &amp; STAF
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 group-hover:text-indigo-700 transition-colors">
                  Layanan Bantuan &amp; Tiket
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                  Sampaikan keluhan operasional atau kendala teknis. Respon cerdas otomatis AI dan eskalasi langsung ke staf HERO.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 text-[11px] font-bold">
                  Smart Ticketing AI
                </span>
                <span className="rounded-lg bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 text-[11px] font-bold">
                  Live Stream Chat
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-indigo-700 transition-colors">
                Buat Tiket &amp; Riwayat
              </span>
              <span className="h-8 w-8 rounded-lg bg-slate-100 text-slate-900 group-hover:bg-indigo-700 group-hover:text-white flex items-center justify-center transition-colors font-bold">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </div>

        {/* Support Callout Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-slate-300 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold border border-blue-300 shrink-0">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-950">
                Butuh Bantuan Cepat atau Koordinasi Darurat?
              </h4>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Tim technical support dan operasional HERO siap membantu 24 jam.
              </p>
            </div>
          </div>

          <Link
            href={getLink('/tickets')}
            className="h-10 inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-5 text-xs font-black shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 text-blue-100" />
            <span>Buat Tiket Baru</span>
          </Link>
        </div>
      </div>

      {/* ── Detail Activity Modal ── */}
      {activeDetailEmployee && (
        <Dialog open={Boolean(activeDetailEmployee)} onOpenChange={(open) => !open && setActiveDetailEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 p-5 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                  {activeDetailEmployee.name ? activeDetailEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    {activeDetailEmployee.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5 font-medium">
                    {activeDetailEmployee.jobTitle} • {activeDetailEmployee.section || activeDetailEmployee.department} • Shift {activeDetailEmployee.shift} ({activeDetailEmployee.workDate || 'Hari Ini'})
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportDetailExcel(activeDetailEmployee)}
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl px-3.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Excel</span>
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jam Check-In / Out</span>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                    {activeDetailEmployee.checkInTime || '-'} {activeDetailEmployee.checkOutTime ? `→ ${activeDetailEmployee.checkOutTime}` : ''}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tugas</span>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                    {activeDetailEmployee.tasks?.length || 0} Tugas
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress Pengerjaan</span>
                  <div className="mt-1.5">
                    {renderProgressBar(activeDetailEmployee.progress, activeDetailEmployee.status)}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Operasional</span>
                  <div className="mt-1">
                    {renderStatusBadge(activeDetailEmployee.status)}
                  </div>
                </div>
              </div>

              {/* Tasks & Timeline Section */}
              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <span>Rincian Pekerjaan &amp; Aktivitas Lapangan</span>
                </h3>

                {(!activeDetailEmployee.tasks || activeDetailEmployee.tasks.length === 0) ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200/80 text-slate-500 text-xs font-medium">
                    Belum ada detail tugas pengerjaan yang tercatat.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeDetailEmployee.tasks.map((task: ActivityTaskItem, idx: number) => (
                      <div
                        key={task.id || idx}
                        className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-900">{task.label}</span>
                            {task.groupName && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                                {task.groupName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {task.unitNumber && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                <Truck className="w-3 h-3 text-sky-600" />
                                {task.unitNumber}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 font-medium">
                              {task.startedAt || '-'} {task.endedAt ? `→ ${task.endedAt}` : ''}
                            </span>
                          </div>
                        </div>

                        {task.remarks && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-normal">
                            {task.remarks}
                          </p>
                        )}

                        {/* Evidence Photos */}
                        {(task.photoUrl || (task.photos && task.photos.length > 0)) && (
                          <div className="space-y-1.5 pt-0.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              Foto Bukti Pengerjaan
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
                                      className="group relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:border-blue-400 transition"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={displayUrl}
                                        alt={`Bukti ${task.label}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                        <ZoomIn className="w-4 h-4" />
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
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Catatan Handover &amp; Ringkasan Sesi
                  </h4>
                  <div className="space-y-2">
                    {activeDetailEmployee.sessions.map((s, sIdx) => (
                      <div key={s.id || sIdx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">Sesi {s.sessionCode || `#${s.id}`} • Shift {s.shiftCode}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{s.workDate}</span>
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
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl"
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
                className="h-8 gap-1 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white rounded-lg px-3"
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
