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
  FileSpreadsheet,
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
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
            Selesai
          </span>
        )
      case 'Berjalan':
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-950 border border-sky-300 shadow-2xs">
            Berjalan
          </span>
        )
      case 'Menunggu':
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
            Menunggu
          </span>
        )
      case 'Terlambat':
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs">
            Terlambat
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-slate-200/90 text-slate-900 border border-slate-300 shadow-2xs">
            {status}
          </span>
        )
    }
  }

  const renderProgressBar = (progress: number, status: EmployeeActivityRow['status']) => {
    let barColor = 'bg-sky-600'
    if (status === 'Selesai') barColor = 'bg-emerald-600'
    if (status === 'Menunggu') barColor = 'bg-amber-600'
    if (status === 'Terlambat') barColor = 'bg-rose-600'

    return (
      <div className="flex items-center gap-3">
        <div className="w-24 sm:w-28 h-2.5 bg-slate-200/80 rounded-full overflow-hidden border border-slate-300/60">
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
    <div className="w-full space-y-8 text-slate-900">
      {/* ── Top Header & Context Bar: Frosted Glass Panel ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/90 border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-2xs transition"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
                <span>Dashboard</span>
              </Link>
              <span className="text-slate-400 font-bold">/</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800">Daily Activity Monitoring</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                {customerInfo.name}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 font-display">
              Daily Activity &amp; Manpower
            </h1>
            <p className="text-sm sm:text-base text-slate-700 mt-2 font-medium">
              Monitoring aktivitas teknisi, log pengerjaan ban, dan progres servis harian di site {currentSiteName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-11 gap-2 rounded-2xl border-slate-300 bg-white/90 px-5 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              disabled={isPending}
              className="h-11 gap-2 rounded-2xl border-slate-300 bg-white/90 px-5 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
            >
              <RefreshCw className={cn("w-4 h-4 text-slate-600", isPending && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 5 KPI Executive Summary Cards: High Legibility Frosted Glass ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {/* Karyawan Terjadwal */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Karyawan Jadwal</span>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold border border-sky-200 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-950 font-display">
              {kpis.karyawanAktif.value}
            </span>
            <span className="text-sm font-bold text-slate-600">/ {kpis.karyawanAktif.total} Total</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-semibold">
            <span>{kpis.karyawanAktif.change || 'Total teknisi site'}</span>
          </div>
        </div>

        {/* Hadir Check-In */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Hadir Check-In</span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-950 font-display">
              {kpis.hadirCheckIn.value}
            </span>
            <span className="text-xs font-extrabold text-emerald-950 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
              {kpis.karyawanAktif.value > 0
                ? `${Math.round((kpis.hadirCheckIn.value / kpis.karyawanAktif.value) * 100)}%`
                : '100%'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-semibold">
            <span>{kpis.hadirCheckIn.change || 'Tercatat hadir di site'}</span>
          </div>
        </div>

        {/* Aktivitas Selesai */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Tugas Selesai</span>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold border border-indigo-200 shadow-2xs">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-950 font-display">
              {kpis.aktivitasSelesai.value}
            </span>
            <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">Tugas Selesai</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-semibold">
            <span>{kpis.aktivitasSelesai.change || 'Pekerjaan selesai 100%'}</span>
          </div>
        </div>

        {/* Sedang Berjalan */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Sedang Berjalan</span>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-200 shadow-2xs">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-950 font-display">
              {kpis.sedangBerjalan.value}
            </span>
            <span className="text-xs font-extrabold text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">In Progress</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-semibold">
            <span>{kpis.sedangBerjalan.change || 'Aktif dikerjakan saat ini'}</span>
          </div>
        </div>

        {/* Pending / Belum Update */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Pending Update</span>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold border border-rose-200 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-950 font-display">
              {kpis.terlambatBelumUpdate.value}
            </span>
            <span className="text-xs font-extrabold text-rose-950 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full">Perlu Update</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 font-semibold">
            <span>{kpis.terlambatBelumUpdate.change || 'Belum update progres'}</span>
          </div>
        </div>
      </div>

      {/* ── Advanced Filter Bar: Frosted Glass Panel ── */}
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs p-6 sm:p-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 items-end">
          {/* Site Selector */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
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
              className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer truncate shadow-2xs transition"
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
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
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
              className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs transition"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
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
              className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs transition"
            />
          </div>

          {/* Department */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
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
              className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-2xs transition"
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
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
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
              className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-2xs transition"
            >
              <option value="Semua Shift">Semua Shift</option>
              <option value="Pagi">Day Shift (Pagi)</option>
              <option value="Siang">Middle Shift (Siang)</option>
              <option value="Malam">Night Shift (Malam)</option>
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
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
              className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-2xs transition"
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
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
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
              className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-2xs transition"
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
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2 block">
              Cari Nama / Unit
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
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
                className="h-11 pl-10 text-xs sm:text-sm bg-white border-slate-300 rounded-2xl placeholder:text-slate-400 font-bold text-slate-900 focus-visible:ring-2 focus-visible:ring-amber-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-200/70 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-11 px-5 border-slate-300 text-slate-700 hover:text-slate-950 rounded-2xl text-xs sm:text-sm font-bold bg-white shadow-2xs"
          >
            <X className="w-4 h-4 mr-1.5 text-slate-500" />
            Reset Filter
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => applyFilters()}
            className="h-11 px-6 bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md transition"
          >
            <Filter className="w-4 h-4 mr-2" />
            Terapkan Filter
          </Button>
        </div>
      </div>

      {/* ── Main Content Tabs & Tables: Frosted Glass Panel ── */}
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 p-5 sm:p-6 gap-4 bg-slate-50/70">
          <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white/90 border border-slate-300/80 shadow-2xs">
            <button
              onClick={() => setActiveTab('submitted')}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer",
                activeTab === 'submitted'
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:text-slate-950"
              )}
            >
              <CheckCircle2 className={cn("w-4 h-4", activeTab === 'submitted' ? "text-amber-400" : "text-slate-500")} />
              <span>Sudah Mengisi Log Aktivitas</span>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-black",
                activeTab === 'submitted' ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-800"
              )}>
                {filteredEmployees.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unsubmitted')}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-all cursor-pointer",
                activeTab === 'unsubmitted'
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:text-slate-950"
              )}
            >
              <AlertTriangle className={cn("w-4 h-4", activeTab === 'unsubmitted' ? "text-amber-400" : "text-slate-500")} />
              <span>Belum Mengisi Log Aktivitas</span>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-black",
                activeTab === 'unsubmitted' ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-800"
              )}>
                {filteredUnsubmittedEmployees.length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-11 px-4 gap-2 rounded-2xl border-emerald-300 bg-emerald-50 text-xs sm:text-sm font-black text-emerald-950 hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Excel (.xlsx)</span>
            </Button>
            <div className="text-xs sm:text-sm text-slate-600 font-semibold hidden md:block">
              Site <strong className="text-slate-950 font-black">{currentSiteName}</strong>
            </div>
          </div>
        </div>

        {/* Tab 1: Sudah Mengisi Aktivitas Table */}
        {activeTab === 'submitted' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    <th className="py-4 px-6">Karyawan &amp; Role</th>
                    <th className="py-4 px-6">Section / Tim</th>
                    <th className="py-4 px-6">Shift &amp; Jam Kerja</th>
                    <th className="py-4 px-6">Unit &amp; Aktivitas Utama</th>
                    <th className="py-4 px-6">Progress Kerja</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-semibold text-slate-800">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Layers className="w-12 h-12 text-slate-400 stroke-[1.5]" />
                          <p className="font-extrabold text-slate-900 text-base">Tidak Ada Data Aktivitas</p>
                          <p className="text-xs sm:text-sm text-slate-600 max-w-md font-medium">
                            Tidak ditemukan data aktivitas karyawan untuk kriteria filter dan periode tanggal yang dipilih.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((row) => (
                      <tr key={`${row.employeeDbId}-${row.sessionId}`} className="hover:bg-amber-50/40 transition">
                        {/* Karyawan */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center font-black text-amber-950 text-xs shrink-0 shadow-2xs">
                              {row.name ? row.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-950 text-sm">{row.name}</div>
                              <div className="text-xs font-semibold text-slate-600 mt-0.5">{row.jobTitle || 'Teknisi'} • ID: {row.employeeId}</div>
                            </div>
                          </div>
                        </td>

                        {/* Section / Tim */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm">{row.section || row.department || '-'}</div>
                          <div className="text-xs font-semibold text-slate-600 mt-0.5">{row.department}</div>
                        </td>

                        {/* Shift & Jam Kerja */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-900 border border-slate-300">
                              {row.shift}
                            </span>
                            <span className="text-slate-900 font-extrabold text-xs sm:text-sm">
                              {row.checkInTime || '-'} {row.checkOutTime ? `→ ${row.checkOutTime}` : ''}
                            </span>
                          </div>
                          {row.workDate && (
                            <div className="text-xs font-semibold text-slate-500 mt-1">{row.workDate}</div>
                          )}
                        </td>

                        {/* Unit & Aktivitas Utama */}
                        <td className="py-4 px-6 max-w-xs">
                          <div className="font-bold text-slate-950 text-sm line-clamp-1" title={row.primaryActivity}>
                            {row.primaryActivity || 'Pemeriksaan Rutin'}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {row.unitTireId && row.unitTireId !== '-' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-950 border border-sky-300 shadow-2xs">
                                <Truck className="w-3.5 h-3.5 text-sky-700" />
                                {row.unitTireId}
                              </span>
                            ) : null}
                            <span className="text-xs font-semibold text-slate-600">
                              {row.tasksCount || row.tasks?.length || 0} Tugas
                            </span>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-4 px-6">
                          {renderProgressBar(row.progress, row.status)}
                          <div className="text-xs font-semibold text-slate-500 mt-1.5">
                            Update: {row.lastUpdate || '-'}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          {renderStatusBadge(row.status)}
                        </td>

                        {/* Aksi: Lihat Detail */}
                        <td className="py-4 px-6 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveDetailEmployee(row)}
                            className="h-10 px-4 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 hover:text-slate-950 shadow-2xs gap-1.5"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 bg-slate-50/70">
                <span className="text-xs sm:text-sm text-slate-700 font-bold">
                  Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredEmployees.length)} dari {filteredEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-10 px-4 text-xs sm:text-sm font-bold rounded-2xl border-slate-300 bg-white shadow-2xs"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-3 text-xs sm:text-sm font-black text-slate-950">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-10 px-4 text-xs sm:text-sm font-bold rounded-2xl border-slate-300 bg-white shadow-2xs"
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
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    <th className="py-4 px-6">Karyawan</th>
                    <th className="py-4 px-6">Section / Tim</th>
                    <th className="py-4 px-6">Shift Terjadwal</th>
                    <th className="py-4 px-6">Jadwal Roster</th>
                    <th className="py-4 px-6">Status Kehadiran</th>
                    <th className="py-4 px-6">Status Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-semibold text-slate-800">
                  {paginatedUnsubmittedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <CheckCircle2 className="w-12 h-12 text-emerald-600 stroke-[1.5]" />
                          <p className="font-extrabold text-slate-900 text-base">Semua Karyawan Sudah Mengisi</p>
                          <p className="text-xs sm:text-sm text-slate-600 max-w-md font-medium">
                            Seluruh karyawan yang terjadwal dan hadir di site telah mengisi log aktivitas harian mereka.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUnsubmittedEmployees.map((emp) => (
                      <tr key={emp.employeeDbId} className="hover:bg-amber-50/40 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center font-black text-amber-950 text-xs shrink-0 shadow-2xs">
                              {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-950 text-sm">{emp.name}</div>
                              <div className="text-xs font-semibold text-slate-600 mt-0.5">{emp.jobTitle} • ID: {emp.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm">{emp.section || emp.department || '-'}</div>
                          <div className="text-xs font-semibold text-slate-600 mt-0.5">{emp.department}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-900 border border-slate-300">
                            {emp.expectedShift}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm">{emp.rosterCode}</div>
                          <div className="text-xs font-semibold text-slate-600 mt-0.5">{emp.rosterType || '5:2'}</div>
                        </td>
                        <td className="py-4 px-6">
                          {emp.attendanceStatus === 'Hadir' ? (
                            <div>
                              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                                Hadir
                              </span>
                              <div className="text-xs font-semibold text-slate-600 mt-1">Check-in: {emp.checkInTime}</div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
                              Belum Check-In
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 bg-slate-50/70">
                <span className="text-xs sm:text-sm text-slate-700 font-bold">
                  Menampilkan {(unsubmittedPage - 1) * pageSize + 1} - {Math.min(unsubmittedPage * pageSize, filteredUnsubmittedEmployees.length)} dari {filteredUnsubmittedEmployees.length} Karyawan
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === 1}
                    onClick={() => setUnsubmittedPage((p) => Math.max(1, p - 1))}
                    className="h-10 px-4 text-xs sm:text-sm font-bold rounded-2xl border-slate-300 bg-white shadow-2xs"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-3 text-xs sm:text-sm font-black text-slate-950">
                    {unsubmittedPage} / {unsubmittedTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unsubmittedPage === unsubmittedTotalPages}
                    onClick={() => setUnsubmittedPage((p) => Math.min(unsubmittedTotalPages, p + 1))}
                    className="h-10 px-4 text-xs sm:text-sm font-bold rounded-2xl border-slate-300 bg-white shadow-2xs"
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
                  onClick={() => handleExportDetailExcel(activeDetailEmployee)}
                  className="h-10 gap-2 text-xs sm:text-sm font-black border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 rounded-2xl px-4 shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Export Excel</span>
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
