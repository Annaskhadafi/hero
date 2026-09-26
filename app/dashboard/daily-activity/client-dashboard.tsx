'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
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
  MoreVertical,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Trash2,
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
  DelayedJobItem,
  TimelineActivityEvent,
} from '@/lib/daily-activity-dashboard'
import { cn } from '@/lib/utils'
import { formatPhotoDisplayUrl } from '@/lib/photo-url'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { deleteDailyActivityRecordAction } from './actions'

interface ClientDashboardProps {
  initialData: DailyActivityDashboardData
  currentUser?: {
    name?: string | null
    email?: string | null
    role?: string | null
    isSuperAdmin?: boolean
    isPjoOrLocationLeader?: boolean
    isDeptHead?: boolean
    isSectionHead?: boolean
    assignedSiteId?: number | null
    assignedSiteName?: string | null
    assignedDepartment?: string | null
    assignedSection?: string | null
  }
  initialFilters?: {
    siteId?: string
    dept?: string
    section?: string
  }
}

export function DailyActivityClientDashboard({
  initialData,
  currentUser,
  initialFilters,
}: ClientDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Top context bar & filters
  const initialSiteVal = currentUser?.isPjoOrLocationLeader && currentUser?.assignedSiteId
    ? String(currentUser.assignedSiteId)
    : (searchParams.get('siteId') || initialFilters?.siteId || String(initialData.currentSite.id))

  const initialDeptVal = searchParams.get('dept') ||
    initialFilters?.dept ||
    (currentUser?.isDeptHead && currentUser?.assignedDepartment ? currentUser.assignedDepartment : 'Semua Tim')

  const initialSectionVal = searchParams.get('section') ||
    initialFilters?.section ||
    (currentUser?.isSectionHead && currentUser?.assignedSection ? currentUser.assignedSection : 'Semua Section')

  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteVal)
  const [startDate, setStartDate] = useState<string>(
    searchParams.get('startDate') || initialData.startDate || searchParams.get('date') || ''
  )
  const [endDate, setEndDate] = useState<string>(
    searchParams.get('endDate') || initialData.endDate || searchParams.get('date') || ''
  )
  const [selectedShift, setSelectedShift] = useState<string>(
    searchParams.get('shift') || initialData.selectedShift
  )
  const [selectedDept, setSelectedDept] = useState<string>(initialDeptVal)
  const [selectedSection, setSelectedSection] = useState<string>(initialSectionVal)
  const [selectedActivityType, setSelectedActivityType] = useState<string>(
    'Semua Aktivitas'
  )
  const [selectedEmployeeStatus, setSelectedEmployeeStatus] = useState<string>(
    searchParams.get('status') || 'Semua Status'
  )
  const [employeeNameFilter, setEmployeeNameFilter] = useState<string>(
    searchParams.get('employeeName') || searchParams.get('q') || ''
  )
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('q') || searchParams.get('employeeName') || ''
  )

  // Active Tab state: 'submitted' (Sudah Mengisi) vs 'unsubmitted' (Belum Mengisi)
  const [activeTab, setActiveTab] = useState<'submitted' | 'unsubmitted'>('submitted')

  // Keep state synchronized whenever URL searchParams or server initialData changes
  useEffect(() => {
    if (currentUser?.isPjoOrLocationLeader && currentUser?.assignedSiteId) {
      setSelectedSiteId(String(currentUser.assignedSiteId))
    } else {
      const siteParam = searchParams.get('siteId')
      setSelectedSiteId(siteParam !== null ? siteParam : String(initialData.currentSite.id))
    }

    setStartDate(searchParams.get('startDate') || initialData.startDate || searchParams.get('date') || '')
    setEndDate(searchParams.get('endDate') || initialData.endDate || searchParams.get('date') || '')
    setSelectedShift(searchParams.get('shift') || initialData.selectedShift || 'Semua Shift')

    const deptParam = searchParams.get('dept')
    if (deptParam !== null) {
      setSelectedDept(deptParam)
    } else if (currentUser?.isDeptHead && currentUser?.assignedDepartment) {
      setSelectedDept(currentUser.assignedDepartment)
    } else {
      setSelectedDept('Semua Tim')
    }

    const secParam = searchParams.get('section')
    if (secParam !== null) {
      setSelectedSection(secParam)
    } else if (currentUser?.isSectionHead && currentUser?.assignedSection) {
      setSelectedSection(currentUser.assignedSection)
    } else {
      setSelectedSection('Semua Section')
    }

    setSelectedEmployeeStatus(searchParams.get('status') || 'Semua Status')
    setEmployeeNameFilter(searchParams.get('employeeName') || searchParams.get('q') || '')
    setSearchQuery(searchParams.get('q') || searchParams.get('employeeName') || '')
  }, [
    searchParams,
    initialData.currentSite.id,
    initialData.selectedShift,
    initialData.startDate,
    initialData.endDate,
    currentUser,
  ])

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [unsubmittedPage, setUnsubmittedPage] = useState<number>(1)
  const pageSize = 10

  // Detail Modal state
  const [activeDetailItem, setActiveDetailItem] = useState<{
    type: 'delayed' | 'employee'
    delayedJob?: DelayedJobItem
    employee?: EmployeeActivityRow
  } | null>(null)

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

  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false)

  // Delete state
  const [deletingEmployee, setDeletingEmployee] = useState<EmployeeActivityRow | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [deletedEmployeeKeys, setDeletedEmployeeKeys] = useState<string[]>([])

  const handleDeleteEmployeeActivity = async () => {
    if (!deletingEmployee) return
    if (!currentUser?.isSuperAdmin) {
      toast.error('Hanya Super Admin yang berhak menghapus data aktivitas.')
      return
    }
    setIsDeleting(true)

    const sessionIds = (deletingEmployee.sessions || []).map((s) => s.id)
    if (deletingEmployee.sessionId && !sessionIds.includes(deletingEmployee.sessionId)) {
      sessionIds.push(deletingEmployee.sessionId)
    }

    const activityIds = (deletingEmployee.tasks || [])
      .filter((t) => !t.sessionId && Number.isFinite(t.id) && t.id > 0)
      .map((t) => t.id)

    const key = `${deletingEmployee.employeeDbId}-${deletingEmployee.sessionId}`

    try {
      const res = await deleteDailyActivityRecordAction({
        sessionIds,
        activityIds,
        employeeDbId: deletingEmployee.employeeDbId,
        workDate: deletingEmployee.rawWorkDate,
      })

      if (res.success) {
        toast.success(`Aktivitas harian untuk ${deletingEmployee.name} berhasil dihapus.`)
        setDeletedEmployeeKeys((prev) => [...prev, key])
        if (activeDetailItem?.employee?.employeeId === deletingEmployee.employeeId) {
          setActiveDetailItem(null)
        }
        setDeletingEmployee(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Gagal menghapus data aktivitas.')
      }
    } catch (err: any) {
      console.error('Delete error:', err)
      toast.error(err.message || 'Terjadi kesalahan saat menghapus aktivitas.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Sync navigation when filters change
  const applyFilters = (overrides?: {
    siteId?: string
    startDate?: string
    endDate?: string
    shift?: string
    status?: string
    dept?: string
    section?: string
    q?: string
    employeeName?: string
  }) => {
    // If PJO / Leader Lokasi, lock siteId
    const sId = (currentUser?.isPjoOrLocationLeader && currentUser?.assignedSiteId)
      ? String(currentUser.assignedSiteId)
      : (overrides?.siteId !== undefined ? overrides.siteId : selectedSiteId)

    const sDate = overrides?.startDate !== undefined ? overrides.startDate : startDate
    const eDate = overrides?.endDate !== undefined ? overrides.endDate : endDate
    const sh = overrides?.shift !== undefined ? overrides.shift : selectedShift
    const st = overrides?.status !== undefined ? overrides.status : selectedEmployeeStatus
    const dpt = overrides?.dept !== undefined ? overrides.dept : selectedDept
    const sec = overrides?.section !== undefined ? overrides.section : selectedSection
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
    if (empName.trim()) params.set('employeeName', empName.trim())
    else if (q.trim()) params.set('q', q.trim())

    startTransition(() => {
      router.push(`/dashboard/daily-activity?${params.toString()}`)
    })
    setCurrentPage(1)
    setUnsubmittedPage(1)
  }

  const handleResetFilters = () => {
    const defaultSite = currentUser?.isPjoOrLocationLeader && currentUser?.assignedSiteId
      ? String(currentUser.assignedSiteId)
      : '0'
    const defaultDpt = currentUser?.isDeptHead && currentUser?.assignedDepartment
      ? currentUser.assignedDepartment
      : 'Semua Tim'
    const defaultSec = currentUser?.isSectionHead && currentUser?.assignedSection
      ? currentUser.assignedSection
      : 'Semua Section'

    setSelectedSiteId(defaultSite)
    setStartDate('')
    setEndDate('')
    setSelectedShift('Semua Shift')
    setSelectedDept(defaultDpt)
    setSelectedSection(defaultSec)
    setSelectedActivityType('Semua Aktivitas')
    setSelectedEmployeeStatus('Semua Status')
    setEmployeeNameFilter('')
    setSearchQuery('')
    setCurrentPage(1)
    setUnsubmittedPage(1)

    const params = new URLSearchParams()
    if (defaultSite !== '0') params.set('siteId', defaultSite)
    if (defaultDpt !== 'Semua Tim') params.set('dept', defaultDpt)
    if (defaultSec !== 'Semua Section') params.set('section', defaultSec)

    startTransition(() => {
      router.push(`/dashboard/daily-activity${params.toString() ? `?${params.toString()}` : ''}`)
    })
  }

  // Filter employees client-side for rapid search & department filter
  const filteredEmployees = useMemo(() => {
    return initialData.employees
      .filter((emp) => !deletedEmployeeKeys.includes(`${emp.employeeDbId}-${emp.sessionId}`))
      .filter((emp) => {
      if (currentUser?.isPjoOrLocationLeader && currentUser?.assignedSiteId) {
        if (emp.siteId !== undefined && emp.siteId !== currentUser.assignedSiteId) {
          return false
        }
      } else if (
        selectedSiteId !== '0' &&
        selectedSiteId !== 'all' &&
        emp.siteId !== undefined &&
        String(emp.siteId) !== selectedSiteId
      ) {
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
    deletedEmployeeKeys,
    selectedSiteId,
    selectedShift,
    selectedDept,
    selectedSection,
    selectedActivityType,
    selectedEmployeeStatus,
    searchQuery,
    employeeNameFilter,
    currentUser,
  ])

  // Filter unsubmitted employees (Belum Mengisi, excluding Roster OFF)
  const filteredUnsubmittedEmployees = useMemo(() => {
    return (initialData.unsubmittedEmployees || []).filter((emp) => {
      if (currentUser?.isPjoOrLocationLeader && currentUser?.assignedSiteId) {
        if (emp.siteId !== undefined && emp.siteId !== currentUser.assignedSiteId) {
          return false
        }
      } else if (
        selectedSiteId !== '0' &&
        selectedSiteId !== 'all' &&
        emp.siteId !== undefined &&
        String(emp.siteId) !== selectedSiteId
      ) {
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
    currentUser,
  ])

  // Available sites list (restricted to assigned site for PJO / Leader Lokasi)
  const availableSites = useMemo(() => {
    if (currentUser?.isPjoOrLocationLeader && currentUser?.assignedSiteId) {
      const match = initialData.sitesList.filter((s) => s.id === currentUser.assignedSiteId)
      if (match.length > 0) return match
      return [{
        id: currentUser.assignedSiteId,
        name: currentUser.assignedSiteName || 'Site Anda',
        customerName: '-',
        pjoName: currentUser.name || null,
        pjoJobTitle: currentUser.role || null,
      }]
    }
    return initialData.sitesList
  }, [initialData.sitesList, currentUser])

  // Available sections list from masterSections and employee records
  const availableSections = useMemo(() => {
    const list: string[] = []
    const seen = new Set<string>()

    ;(initialData.sectionsList || []).forEach((s) => {
      if (s.name && !seen.has(s.name.trim())) {
        seen.add(s.name.trim())
        list.push(s.name.trim())
      }
    })

    initialData.employees.forEach((e) => {
      if (e.section && !seen.has(e.section.trim())) {
        seen.add(e.section.trim())
        list.push(e.section.trim())
      }
    })
    ;(initialData.unsubmittedEmployees || []).forEach((e) => {
      if (e.section && !seen.has(e.section.trim())) {
        seen.add(e.section.trim())
        list.push(e.section.trim())
      }
    })

    return list.sort((a, b) => a.localeCompare(b))
  }, [initialData.sectionsList, initialData.employees, initialData.unsubmittedEmployees])

  // Pagination calculations
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

  // Dynamic activity types from real employee activities
  const dynamicActivityTypes = useMemo(() => {
    const set = new Set<string>()
    initialData.employees.forEach((e) => {
      if (e.primaryActivity) {
        const words = e.primaryActivity.split(' ').slice(0, 2).join(' ')
        if (words.length > 3) set.add(words)
      }
    })
    return Array.from(set).slice(0, 8)
  }, [initialData.employees])

  // Export to CSV using real data (based on activeTab)
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
        'Jadwal Roster Type',
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
        `Karyawan_Belum_Isi_Daily_Activity_${initialData.currentSite.name.replace(/\s+/g, '_')}_${initialData.currentDate.replace(/\s+/g, '_')}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    const headers = [
      'Employee ID',
      'Nama Karyawan',
      'Jabatan / Tim',
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
      `Daily_Activity_${initialData.currentSite.name.replace(/\s+/g, '_')}_${initialData.currentDate.replace(/\s+/g, '_')}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export specific employee's daily activity items to CSV
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
      `"${t.startedAt} - ${t.endedAt}"`,
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
      `Daily_Activity_${emp.name.replace(/\s+/g, '_')}_${(emp.workDate || 'Report').replace(/\s+/g, '_')}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Exact Badge Colors matching the mockup

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
    }
  }

  const renderProgressBar = (
    progress: number,
    status: EmployeeActivityRow['status']
  ) => {
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
  const attTotal = Math.max(1, initialData.attendanceSummary.total)
  const hadirPct = Math.round((initialData.attendanceSummary.hadir / attTotal) * 100)
  const belumPct = Math.round((initialData.attendanceSummary.belumCheckIn / attTotal) * 100)
  const cutiPct = Math.round((initialData.attendanceSummary.cutiIzin / attTotal) * 100)
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

  return (
    <div className="w-full space-y-5 text-slate-800">
      {/* ── Page Title Bar & Leadership Notice ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">Operations</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">Daily Activity Monitoring</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              PJO &amp; Leadership Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Monitoring Daily Activity Seluruh Karyawan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dashboard supervisi operasional untuk PJO, Head Section, Head Department, dan Manajemen memantau kinerja lapangan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {initialData.currentSite.pjoName && (
            <div className="flex items-center gap-1.5 text-xs bg-blue-50/90 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>
                <strong>PJO / Head Site:</strong> {initialData.currentSite.pjoName} ({initialData.currentSite.pjoJobTitle || 'Site Head'})
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {currentUser?.isSuperAdmin
                ? 'Hak Akses: Super Admin (Akses Penuh)'
                : currentUser?.isPjoOrLocationLeader
                ? `Hak Akses: PJO / Lokasi (${currentUser.assignedSiteName || initialData.currentSite.name})`
                : currentUser?.isDeptHead
                ? `Hak Akses: Head Dept (${currentUser.assignedDepartment || 'Department'})`
                : currentUser?.isSectionHead
                ? `Hak Akses: Section Head (${currentUser.assignedSection || 'Section'})`
                : 'Hak Akses: PJO / Head Section / Dept Head'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Secondary Filter Bar Card ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5 items-end">
          {/* Site */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Site</span>
              {currentUser?.isPjoOrLocationLeader && (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                  Terkunci
                </span>
              )}
            </label>
            <select
              aria-label="Pilih Site"
              value={selectedSiteId}
              disabled={currentUser?.isPjoOrLocationLeader}
              onChange={(e) => {
                const val = e.target.value
                setSelectedSiteId(val)
                applyFilters({ siteId: val })
              }}
              className={cn(
                "w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500",
                currentUser?.isPjoOrLocationLeader
                  ? "bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-slate-50 border border-slate-200 text-slate-800 cursor-pointer"
              )}
            >
              {availableSites.map((s) => (
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
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Nama Karyawan */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nama Karyawan</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari nama karyawan..."
                value={employeeNameFilter}
                onChange={(e) => {
                  setEmployeeNameFilter(e.target.value)
                  setSearchQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ employeeName: employeeNameFilter })
                }}
                className="h-[33px] pl-8 text-xs bg-slate-50 border-slate-200 rounded-lg placeholder:text-slate-400 font-normal"
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
              <option value="Pagi">Pagi</option>
              <option value="Siang">Siang</option>
              <option value="Malam">Malam</option>
            </select>
          </div>

          {/* Department/Team */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Department</span>
              {currentUser?.isDeptHead && (
                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                  Auto
                </span>
              )}
            </label>
            <select
              aria-label="Pilih Department atau Tim"
              value={selectedDept}
              onChange={(e) => {
                const val = e.target.value
                setSelectedDept(val)
                applyFilters({ dept: val })
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Semua Tim">Semua Dept</option>
              {initialData.departmentsList.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
              <span>Section</span>
              {currentUser?.isSectionHead && (
                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                  Auto
                </span>
              )}
            </label>
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
              {availableSections.map((secName) => (
                <option key={secName} value={secName}>
                  {secName}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Status */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              Employee Status
            </label>
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
              className="h-[33px] text-xs font-semibold bg-[#1d72f2] hover:bg-blue-600 text-white rounded-lg px-3 gap-1.5 flex-1"
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

      {/* ── 5 KPI Metric Cards (100% Real Live Data) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Karyawan Aktif */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">Karyawan Aktif</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {initialData.kpis.karyawanAktif.value}
                </span>
                <span className="text-xs text-slate-400">
                  dari {initialData.kpis.karyawanAktif.total} karyawan
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center font-bold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" /> {initialData.kpis.karyawanAktif.change}
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
                  {initialData.kpis.hadirCheckIn.value}
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
              <ArrowUpRight className="w-3.5 h-3.5" /> {initialData.kpis.hadirCheckIn.change}
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
                  {initialData.kpis.aktivitasSelesai.value}
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
              <ArrowUpRight className="w-3.5 h-3.5" /> {initialData.kpis.aktivitasSelesai.change}
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
                  {initialData.kpis.sedangBerjalan.value}
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
              <ArrowUpRight className="w-3.5 h-3.5" /> {initialData.kpis.sedangBerjalan.change}
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
                  {initialData.kpis.terlambatBelumUpdate.value}
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
              <ArrowDownRight className="w-3.5 h-3.5" />{' '}
              {initialData.kpis.terlambatBelumUpdate.change}
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
            {initialData.shiftSummaries.map((shift) => {
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
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#9cb0c6]" />
              <span>Planned (Rencana)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#1d72f2]" />
              <span>Ongoing (Berjalan)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#00b875]" />
              <span>Completed (Selesai)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#f97316]" />
              <span>Delayed (Terlambat)</span>
            </div>
          </div>
        </div>

        {/* Status Kehadiran Tim (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Status Kehadiran Tim
            </h2>
          </div>

          <div className="flex items-center justify-between gap-6 py-4 my-auto">
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
              <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="11" fill="none" />
                {/* Segment 1: Hadir */}
                {hadirPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#00b875"
                    strokeWidth="11"
                    strokeDasharray={`${hadirDash} ${circumference}`}
                    strokeDashoffset={hadirOffset}
                    fill="none"
                  />
                )}
                {/* Segment 2: Belum Check-in */}
                {belumPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#1e293b"
                    strokeWidth="11"
                    strokeDasharray={`${belumDash} ${circumference}`}
                    strokeDashoffset={belumOffset}
                    fill="none"
                  />
                )}
                {/* Segment 3: Cuti/Izin */}
                {cutiPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#38bdf8"
                    strokeWidth="11"
                    strokeDasharray={`${cutiDash} ${circumference}`}
                    strokeDashoffset={cutiOffset}
                    fill="none"
                  />
                )}
                {/* Segment 4: Off Shift */}
                {offPct > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#64748b"
                    strokeWidth="11"
                    strokeDasharray={`${offDash} ${circumference}`}
                    strokeDashoffset={offOffset}
                    fill="none"
                  />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-900 leading-tight">
                  {initialData.attendanceSummary.hadir}
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  Hadir
                  <br />
                  dari {initialData.attendanceSummary.total}
                </span>
              </div>
            </div>

            {/* Attendance Status List */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00b875]" />
                    <span className="font-medium text-slate-700">Hadir / Check-in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {initialData.attendanceSummary.hadir}
                    </span>
                    <span className="text-slate-400 text-[11px] w-8 text-right">{hadirPct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00b875] rounded-full transition-all duration-300"
                    style={{ width: `${hadirPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1e293b]" />
                    <span className="font-medium text-slate-700">Belum Check-in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {initialData.attendanceSummary.belumCheckIn}
                    </span>
                    <span className="text-slate-400 text-[11px] w-8 text-right">{belumPct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1e293b] rounded-full transition-all duration-300"
                    style={{ width: `${belumPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                    <span className="font-medium text-slate-700">Cuti / Izin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {initialData.attendanceSummary.cutiIzin}
                    </span>
                    <span className="text-slate-400 text-[11px] w-8 text-right">{cutiPct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#38bdf8] rounded-full transition-all duration-300"
                    style={{ width: `${cutiPct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                    <span className="font-medium text-slate-700">Off Shift</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {initialData.attendanceSummary.offShift}
                    </span>
                    <span className="text-slate-400 text-[11px] w-8 text-right">{offPct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#64748b] rounded-full transition-all duration-300"
                    style={{ width: `${offPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-right">
            Total tercatat di site: <strong>{initialData.attendanceSummary.total}</strong> karyawan
          </div>
        </div>
      </div>

      {/* ── Main Data Table: Aktivitas Setiap Karyawan ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Header Action Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Aktivitas Setiap Karyawan</h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              {activeTab === 'submitted'
                ? `${filteredEmployees.length} record`
                : `${filteredUnsubmittedEmployees.length} belum isi`}
            </span>
            {isPending && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md ml-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Memuat...</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-52 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder={
                  activeTab === 'submitted'
                    ? 'Cari karyawan, aktivitas, unit...'
                    : 'Cari nama, ID, jabatan...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ q: searchQuery })
                }}
                className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 rounded-lg placeholder:text-slate-400"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              Export rekap
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddActivityModalOpen(true)}
              className="h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Tambah aktivitas
            </Button>

            <Button
              asChild
              size="sm"
              className="h-8 text-xs font-semibold bg-[#1d72f2] hover:bg-blue-600 text-white gap-1.5 rounded-lg"
            >
              <Link href="/dashboard/scheduling-timesheet">
                <Users className="w-3.5 h-3.5" />
                Lihat roster
              </Link>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs: Sudah Mengisi vs Belum Mengisi (Roster Aktif) */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 px-4 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('submitted')
              setCurrentPage(1)
            }}
            className={cn(
              'flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer',
              activeTab === 'submitted'
                ? 'border-blue-600 text-blue-600 bg-white shadow-2xs rounded-t-lg -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sudah Mengisi Aktivitas</span>
            <span
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full font-semibold',
                activeTab === 'submitted'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
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
              'flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer',
              activeTab === 'unsubmitted'
                ? 'border-rose-600 text-rose-700 bg-white shadow-2xs rounded-t-lg -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Belum Mengisi Aktivitas</span>
            <span
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full font-semibold',
                activeTab === 'unsubmitted'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {filteredUnsubmittedEmployees.length}
            </span>
            <span className="text-[10px] font-normal text-slate-400 hidden sm:inline ml-0.5">
              (Roster Aktif &bull; OFF Dikecualikan)
            </span>
          </button>
        </div>

        {activeTab === 'submitted' && (
          <>
            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200/80">
                    <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">Jabatan / Tim</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Jam Presensi</th>
                <th className="py-3 px-4">Aktivitas Utama</th>
                <th className="py-3 px-4">Unit / Tire ID</th>
                <th className="py-3 px-4">Status Aktivitas</th>
                <th className="py-3 px-4 min-w-[130px]">Progres</th>
                <th className="py-3 px-4">Update Terakhir</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Tidak ada aktivitas karyawan yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, idx) => (
                  <tr
                    key={`emp-row-${emp.sessionId ?? ''}-${emp.employeeId}-${idx}`}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {emp.employeeId}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDetailItem({
                            type: 'employee',
                            employee: emp,
                          })
                        }
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left inline-flex items-center gap-1 group cursor-pointer"
                        title="Klik untuk melihat formulir detail aktivitas harian lengkap"
                      >
                        <span>{emp.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{emp.jobTitle}</td>
                    <td className="py-3 px-4 text-slate-600">{emp.shift}</td>
                    <td className="py-3 px-4 font-mono">
                      <div className="flex flex-col text-[11px] leading-tight gap-0.5">
                        <span className="text-slate-900 font-semibold flex items-center gap-1" title="Jam Masuk / Check-in">
                          <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                          {emp.checkInTime}
                        </span>
                        {emp.checkOutTime && emp.checkOutTime !== '-' && (
                          <span className="text-slate-400 text-[10px] flex items-center gap-1" title="Jam Pulang / Checkout">
                            <span className="size-1.5 rounded-full bg-blue-500 inline-block" />
                            {emp.checkOutTime}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 flex items-center flex-wrap gap-1">
                        <span>{emp.primaryActivity}</span>
                        {emp.tasksCount > 1 && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60"
                            title={`${emp.tasksCount} aktivitas tercatat`}
                          >
                            +{emp.tasksCount - 1} lainnya
                          </span>
                        )}
                        {emp.sessionsCount > 1 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {emp.sessionsCount} sesi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {emp.allUnits.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {emp.allUnits.slice(0, 2).map((unit) => (
                            <span
                              key={unit}
                              className="bg-slate-100 text-slate-800 font-semibold px-1.5 py-0.5 rounded text-[11px] border border-slate-200"
                            >
                              {unit}
                            </span>
                          ))}
                          {emp.allUnits.length > 2 && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              +{emp.allUnits.length - 2} unit
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{renderStatusBadge(emp.status)}</td>
                    <td className="py-3 px-4">{renderProgressBar(emp.progress, emp.status)}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{emp.lastUpdate}</td>
                    <td className="py-3 px-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() =>
                              setActiveDetailItem({
                                type: 'employee',
                                employee: emp,
                              })
                            }
                          >
                            <Eye className="w-3.5 h-3.5 mr-2 text-blue-600" />
                            Lihat Formulir Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportDetailCsv(emp)}>
                            <Download className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                            Ekspor CSV Aktivitas
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/overtime-requests">
                              <Clock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                              Buat SPL Lembur
                            </Link>
                          </DropdownMenuItem>
                          {currentUser?.isSuperAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingEmployee(emp)}
                                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600" />
                                Hapus Aktivitas
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan{' '}
            {filteredEmployees.length === 0
              ? '0'
              : `${(currentPage - 1) * pageSize + 1} - ${Math.min(
                  currentPage * pageSize,
                  filteredEmployees.length
                )}`}{' '}
            dari {filteredEmployees.length} karyawan
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1 self-center">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded border font-semibold ${
                      currentPage === page
                        ? 'bg-[#1d72f2] text-white border-blue-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </>
    )}

    {activeTab === 'unsubmitted' && (
      <>
        {/* Table Content: Belum Mengisi Aktivitas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200/80">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">Jabatan / Tim</th>
                <th className="py-3 px-4">Shift Roster</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-4">Status Daily Activity</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUnsubmittedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">
                        Tidak ada karyawan bertugas yang belum mengisi!
                      </span>
                      <span className="text-xs text-slate-500">
                        Semua karyawan dengan jadwal kerja aktif telah mengisi daily activity. Karyawan dengan status roster OFF / Libur otomatis dikecualikan.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUnsubmittedEmployees.map((emp, idx) => (
                  <tr
                    key={`unsubmitted-row-${emp.employeeDbId}-${emp.employeeId}-${idx}`}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {emp.employeeId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">
                        {emp.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium text-slate-800">{emp.jobTitle}</div>
                      <div className="text-[11px] text-slate-400">
                        {emp.department}{emp.section ? ` - ${emp.section}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {emp.rosterCode} ({emp.expectedShift})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {emp.attendanceStatus === 'Hadir' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                          Hadir ({emp.checkInTime})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Belum Check-In
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Belum Mengisi
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      <span className="text-[11px] text-slate-600 font-medium">
                        Jadwal Kerja Aktif ({emp.rosterType || '5:2'})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsAddActivityModalOpen(true)}
                          className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200 rounded-md gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Input
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-slate-500 hover:text-slate-800 px-2"
                        >
                          <Link href="/dashboard/scheduling-timesheet" title="Lihat jadwal roster lengkap">
                            <Users className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Unsubmitted Table Pagination */}
        <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan{' '}
            {filteredUnsubmittedEmployees.length === 0
              ? '0'
              : `${(unsubmittedPage - 1) * pageSize + 1} - ${Math.min(
                  unsubmittedPage * pageSize,
                  filteredUnsubmittedEmployees.length
                )}`}{' '}
            dari {filteredUnsubmittedEmployees.length} karyawan belum isi
          </div>

          {unsubmittedTotalPages > 1 && (
            <div className="flex items-center gap-1 self-center">
              <button
                type="button"
                onClick={() => setUnsubmittedPage((p) => Math.max(1, p - 1))}
                disabled={unsubmittedPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                &lt;
              </button>
              {Array.from({ length: unsubmittedTotalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setUnsubmittedPage(page)}
                    className={`w-7 h-7 flex items-center justify-center rounded border font-semibold ${
                      unsubmittedPage === page
                        ? 'bg-[#1d72f2] text-white border-blue-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setUnsubmittedPage((p) => Math.min(unsubmittedTotalPages, p + 1))}
                disabled={unsubmittedPage === unsubmittedTotalPages}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </>
    )}
  </div>

      {/* ── Bottom Row: Timeline Aktivitas Terbaru & Pekerjaan Tertunda (100% Real DB) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Timeline Aktivitas Terbaru
            </h2>
            <Link
              href="/dashboard/daily-activity"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Lihat semua ({initialData.timeline.length})
            </Link>
          </div>

          <div className="pt-4 relative pl-6 space-y-4 before:absolute before:left-2 before:top-5 before:bottom-3 before:w-[2px] before:bg-slate-200">
            {initialData.timeline.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                Belum ada aktivitas tercatat untuk site / periode ini.
              </p>
            ) : (
              initialData.timeline.map((event, idx) => (
                <div
                  key={`tl-${event.id}-${idx}`}
                  className="relative flex items-center justify-between gap-3 text-xs"
                >
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#1d72f2] ring-4 ring-white" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{event.time}</span>
                    <span className="text-slate-600">
                      <strong className="text-slate-900">
                        {event.employeeName} ({event.employeeId})
                      </strong>{' '}
                      {event.description}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap">
                    {event.locationTag}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pekerjaan Tertunda / Kendala (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Pekerjaan Tertunda &amp; Kendala
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {initialData.delayedJobs.length} isu aktif
            </span>
          </div>

          <div className="py-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold text-[11px] border-b border-slate-100 pb-2">
                  <th className="py-2 px-1">Aktivitas</th>
                  <th className="py-2 px-2">Karyawan / Tim</th>
                  <th className="py-2 px-2">Alasan</th>
                  <th className="py-2 px-2">Target Selesai</th>
                  <th className="py-2 px-1 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialData.delayedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Tidak ada pekerjaan tertunda. Semua aktivitas berjalan tepat waktu.
                    </td>
                  </tr>
                ) : (
                  initialData.delayedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-1 font-semibold text-slate-800">{job.activity}</td>
                      <td className="py-2.5 px-2">
                        <div className="font-semibold text-slate-900">{job.employeeName}</div>
                        <div className="text-[10px] text-slate-400">{job.jobTitle}</div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 max-w-[130px] truncate" title={job.reason}>
                        {job.reason}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-amber-600 whitespace-nowrap">
                        {job.targetCompleted}
                      </td>
                      <td className="py-2.5 px-1 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDetailItem({
                              type: 'delayed',
                              delayedJob: job,
                            })
                          }
                          className="font-semibold text-blue-600 hover:text-blue-800 text-xs cursor-pointer"
                        >
                          Lihat detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2 text-right">
            <Link
              href="/dashboard/overtime-requests"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Lihat Surat Perintah Lembur (SPL) &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modal Detail Item (Pekerjaan Tertunda atau Formulir Detail Karyawan) ── */}
      <Dialog
        open={!!activeDetailItem}
        onOpenChange={(open) => {
          if (!open) setActiveDetailItem(null)
        }}
      >
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[80]"
          className={
            activeDetailItem?.type === 'employee'
              ? 'w-[96vw] max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 shadow-2xl z-[90]'
              : 'max-w-2xl z-[90]'
          }
        >
          {/* Header for Delayed Job View */}
          {activeDetailItem?.type === 'delayed' && (
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Detail Pekerjaan Tertunda &amp; Kendala
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Informasi kendala operasional lapangan (Live Real Data)
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Content for Delayed Job */}
          {activeDetailItem?.type === 'delayed' && activeDetailItem.delayedJob && (
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900">
                    {activeDetailItem.delayedJob.activity}
                  </p>
                  <p className="text-amber-800">
                    Alasan kendala: <strong>{activeDetailItem.delayedJob.reason}</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                <div>
                  <span className="text-slate-500 block">Pelaksana / Tim:</span>
                  <span className="font-semibold text-slate-800">
                    {activeDetailItem.delayedJob.employeeName} ({activeDetailItem.delayedJob.jobTitle})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Unit Terkait:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {activeDetailItem.delayedJob.unitNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Target Penyelesaian:</span>
                  <span className="font-semibold text-amber-600">
                    {activeDetailItem.delayedJob.targetCompleted}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Site Operasional:</span>
                  <span className="font-semibold text-slate-800">
                    {initialData.currentSite.name} ({initialData.currentSite.customerName})
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setActiveDetailItem(null)}>
                  Tutup
                </Button>

                <Button asChild size="sm" className="bg-[#1d72f2] hover:bg-blue-600 text-white gap-1.5">
                  <Link href="/dashboard/overtime-requests">
                    <Clock className="w-3.5 h-3.5" />
                    Buat SPL Lembur Terkait
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* ── Official Document Style: Daily Activity Form for Employee ── */}
          {activeDetailItem?.type === 'employee' && activeDetailItem.employee && (
            <>
              {/* Top Corporate Header */}
              <div className="p-4 sm:p-5 bg-[linear-gradient(135deg,#003461,#004b87)] text-white border-b border-blue-900 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-200 shrink-0 border border-white/15">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-wider uppercase text-sky-200">
                        PT CHITRA PARATAMA
                      </div>
                      <DialogTitle className="text-base sm:text-lg font-black text-white leading-tight">
                        FORMULIR AKTIVITAS HARIAN (DAILY ACTIVITY REPORT)
                      </DialogTitle>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportDetailCsv(activeDetailItem.employee!)}
                      className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Ekspor CSV</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cetak</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => setActiveDetailItem(null)}
                      className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Tutup Formulir"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Metadata Badges Bar */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold bg-white/15 px-2 py-0.5 rounded text-white border border-white/20">
                      SN: {activeDetailItem.employee.employeeId}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {activeDetailItem.employee.name}
                    </span>
                    <span className="text-sky-300">&bull;</span>
                    <span>{activeDetailItem.employee.jobTitle}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="bg-sky-400/20 text-sky-200 px-2 py-0.5 rounded font-medium">
                      {activeDetailItem.employee.siteName || initialData.currentSite.name}
                    </span>
                    <span className="bg-white/10 px-2 py-0.5 rounded font-mono">
                      {activeDetailItem.employee.workDate || initialData.currentDate}
                    </span>
                    <span className="bg-white/15 text-sky-100 px-2 py-0.5 rounded font-mono text-[11px] border border-white/20">
                      In: {activeDetailItem.employee.checkInTime || '-'} | Out: {activeDetailItem.employee.checkOutTime || '-'}
                    </span>
                    <span className="bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded font-bold uppercase">
                      {activeDetailItem.employee.status} ({activeDetailItem.employee.progress}%)
                    </span>
                  </div>
                </div>
                <DialogDescription className="sr-only">
                  Formulir rincian aktivitas operasional harian karyawan
                </DialogDescription>
              </div>

              {/* Scrollable Document Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100/70">
                {/* 1. Official Document Metadata Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>A. INFORMASI KARYAWAN &amp; OPERASIONAL LAPANGAN</span>
                    <span className="text-[11px] font-mono text-slate-500 font-normal">
                      ID: {activeDetailItem.employee.employeeId}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Nama Karyawan</span>
                      <span className="font-bold text-slate-900 text-sm">{activeDetailItem.employee.name}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Employee SN</span>
                      <span className="font-mono font-bold text-slate-800">{activeDetailItem.employee.employeeId}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Jabatan / Role</span>
                      <span className="font-semibold text-slate-800">{activeDetailItem.employee.jobTitle}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Departemen / Section</span>
                      <span className="font-semibold text-slate-800">
                        {[activeDetailItem.employee.department, activeDetailItem.employee.section].filter(Boolean).join(' / ') || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Site Operasional</span>
                      <span className="font-semibold text-slate-800">
                        {activeDetailItem.employee.siteName || initialData.currentSite.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Customer / Client</span>
                      <span className="font-semibold text-slate-800">
                        {activeDetailItem.employee.customerName || initialData.currentSite.customerName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Shift &amp; Jam Presensi</span>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-semibold text-slate-800">
                          Shift {activeDetailItem.employee.shift}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span
                          className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]"
                          title="Jam Masuk / Check-in"
                        >
                          Masuk: {activeDetailItem.employee.checkInTime || '-'}
                        </span>
                        <span
                          className="font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px]"
                          title="Jam Pulang / Checkout"
                        >
                          Checkout: {activeDetailItem.employee.checkOutTime || '-'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Akumulasi Poin Harian</span>
                      <span className="font-bold text-emerald-600 text-sm font-mono">
                        {activeDetailItem.employee.totalPoints} Poin
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Units Handled Pill Bar */}
                {activeDetailItem.employee.allUnits.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Unit Operasional yang Dikerjakan Hari Ini:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeDetailItem.employee.allUnits.map((u) => (
                        <span
                          key={u}
                          className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs"
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Detailed Activities Table / List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">
                        B. RINCIAN TUGAS &amp; AKTIVITAS LAPANGAN ({activeDetailItem.employee.tasks.length} Item)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Total: <strong>{activeDetailItem.employee.tasks.length} pekerjaan</strong></span>
                      <span>&bull;</span>
                      <span>Sesi: <strong>{activeDetailItem.employee.sessionsCount} sesi</strong></span>
                      <span>&bull;</span>
                      <span>Total Poin: <strong className="text-emerald-600 font-mono">+{activeDetailItem.employee.totalPoints}</strong></span>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="divide-y divide-slate-100">
                    {activeDetailItem.employee.tasks.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Belum ada rincian tugas untuk karyawan ini.
                      </div>
                    ) : (
                      activeDetailItem.employee.tasks.map((task, idx) => (
                        <div
                          key={`modal-task-${task.id}-${idx}`}
                          className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                        >
                          {/* Left: Task Index, Labels, Metadata, Remarks */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span className="size-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                              {idx + 1}
                            </span>
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                  {task.label}
                                </h4>
                                {task.groupName && (
                                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    {task.groupName}
                                  </span>
                                )}
                                {task.sessionCode && (
                                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/60">
                                    {task.sessionCode}
                                  </span>
                                )}
                              </div>

                              {/* Badges: Unit, Jam, Durasi, Poin, Status */}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                {task.unitNumber && task.unitNumber !== '-' && (
                                  <span className="font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200/80 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                                    <Truck className="w-3 h-3 text-sky-600" />
                                    Unit: {task.unitNumber}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {task.startedAt} - {task.endedAt}
                                  {task.durationLabel && task.durationLabel !== '-' && (
                                    <span className="text-slate-400 font-sans">({task.durationLabel})</span>
                                  )}
                                </span>
                                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                  +{task.points || 0} Poin
                                </span>
                                {renderStatusBadge(task.status)}
                              </div>

                              {/* Remarks / Field notes */}
                              {task.remarks && (
                                <div className="mt-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200/70 rounded-lg p-2.5 leading-relaxed font-sans whitespace-pre-line">
                                  <span className="font-semibold text-slate-600 block text-[10px] uppercase tracking-wider mb-0.5">
                                    Catatan / Keterangan Lapangan:
                                  </span>
                                  {task.remarks}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Evidence Photo Thumbnail */}
                          {(() => {
                            const taskPhotos = (task.photos && task.photos.length > 0)
                              ? task.photos
                              : (task.photoUrl ? [task.photoUrl] : [])

                            if (taskPhotos.length === 0) {
                              return (
                                <div className="md:w-32 shrink-0 flex items-center justify-center text-slate-400 text-[11px] italic py-2 md:py-0">
                                  Tanpa foto bukti
                                </div>
                              )
                            }

                            return (
                              <div className="md:w-36 shrink-0 flex flex-col items-center md:items-end gap-1.5 select-none">
                                <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5">
                                  {taskPhotos.map((pUrl, pIdx) => (
                                    <div
                                      key={`${task.id}-photo-${pIdx}`}
                                      className="relative w-28 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden border border-slate-200 hover:border-sky-500 shadow-2xs hover:shadow-md transition-all bg-slate-900 flex items-center justify-center cursor-pointer group"
                                      onClick={() =>
                                        setLightboxPhoto({
                                          url: pUrl,
                                          label: `${task.label}${taskPhotos.length > 1 ? ` (${pIdx + 1}/${taskPhotos.length})` : ''}`,
                                          unitNumber: task.unitNumber,
                                          time: `${task.startedAt} - ${task.endedAt}`,
                                          remarks: task.remarks,
                                        })
                                      }
                                    >
                                      <img
                                        src={formatPhotoDisplayUrl(pUrl, 400)}
                                        alt={`${task.label} #${pIdx + 1}`}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.opacity = '0.3'
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="bg-white/95 text-slate-900 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                          <ZoomIn className="w-3 h-3 text-blue-600" /> Perbesar
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] text-sky-700 font-semibold flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" /> Foto Bukti{taskPhotos.length > 1 ? ` (${taskPhotos.length})` : ''}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveDetailItem(null)}>
                    Tutup Formulir
                  </Button>
                  {currentUser?.isSuperAdmin && activeDetailItem.employee && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingEmployee(activeDetailItem.employee!)}
                      className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      Hapus Aktivitas
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportDetailCsv(activeDetailItem.employee!)}
                    className="gap-1.5 text-xs text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    Ekspor Data CSV
                  </Button>
                  <Button asChild size="sm" className="bg-[#1d72f2] hover:bg-blue-600 text-white gap-1.5 text-xs">
                    <Link href="/dashboard/overtime-requests">
                      <Clock className="w-3.5 h-3.5" />
                      Buat SPL Lembur
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Konfirmasi Hapus Aktivitas ── */}
      <AlertDialog
        open={Boolean(deletingEmployee)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingEmployee(null)
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="size-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Hapus Aktivitas Harian?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data aktivitas harian untuk{' '}
              <span className="font-semibold text-slate-900">{deletingEmployee?.name}</span>{' '}
              (NIK: <span className="font-mono">{deletingEmployee?.employeeId}</span>) pada tanggal{' '}
              <span className="font-medium text-slate-800">{deletingEmployee?.workDate}</span>?
              <br />
              <span className="text-rose-600 font-medium block mt-1">
                Data sesi dan aktivitas ini akan dihapus dari monitoring harian dan rekap operasional.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteEmployeeActivity()
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Aktivitas</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Lightbox Photo Preview Modal ── */}
      <Dialog open={Boolean(lightboxPhoto)} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[200] bg-black/80 backdrop-blur-md"
          className="max-w-3xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-white z-[210] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
        >
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-4">
              <DialogTitle className="text-sm font-bold text-white truncate">
                {lightboxPhoto?.label || 'Foto Bukti Pekerjaan'}
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {[lightboxPhoto?.unitNumber ? `Unit: ${lightboxPhoto.unitNumber}` : null, lightboxPhoto?.time]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lightboxPhoto?.url && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="text-xs bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 gap-1.5"
                >
                  <a href={formatPhotoDisplayUrl(lightboxPhoto.url)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Resolusi Penuh
                  </a>
                </Button>
              )}
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="relative min-h-[360px] sm:min-h-[460px] max-h-[72vh] w-full p-4 flex items-center justify-center bg-black/95">
            {isLightboxLoading && !lightboxHasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 z-10">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-300">Memuat foto resolusi tinggi...</span>
              </div>
            )}

            {lightboxHasError ? (
              <div className="flex flex-col items-center justify-center gap-2 text-rose-400 p-8 text-center z-10">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
                <p className="text-xs font-semibold">Gagal memuat foto bukti pekerjaan.</p>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxHasError(false)
                    setIsLightboxLoading(true)
                  }}
                  className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Coba Muat Ulang
                </button>
              </div>
            ) : lightboxPhoto?.url ? (
              <img
                key={lightboxPhoto.url}
                src={formatPhotoDisplayUrl(lightboxPhoto.url, 1200)}
                alt={lightboxPhoto.label || 'Foto Bukti'}
                className={`max-h-[65vh] w-auto max-w-full object-contain rounded transition-opacity duration-300 ${
                  isLightboxLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => setIsLightboxLoading(false)}
                onError={() => {
                  setIsLightboxLoading(false)
                  setLightboxHasError(true)
                }}
              />
            ) : null}
          </div>
          {lightboxPhoto?.remarks && (
            <div className="p-3 bg-slate-900 text-xs text-slate-300 border-t border-slate-800">
              <span className="font-semibold text-slate-400 block text-[10px] uppercase">
                Catatan / Keterangan:
              </span>
              {lightboxPhoto.remarks}
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* ── Modal Tambah Aktivitas ── */}
      <Dialog open={isAddActivityModalOpen} onOpenChange={setIsAddActivityModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Input Daily Activity</DialogTitle>
            <DialogDescription>
              Silakan pilih modul input aktivitas harian atau penugasan SPL yang ingin Anda buat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Link
              href="/dashboard/activity-hub/my-day"
              onClick={() => setIsAddActivityModalOpen(false)}
              className="block p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
            >
              <div className="font-bold text-slate-800 text-sm">Input My Day (Aktivitas Saya)</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Catat check-in, checklist tugas lapangan, dan submission approval harian Anda.
              </p>
            </Link>

            <Link
              href="/dashboard/overtime-requests"
              onClick={() => setIsAddActivityModalOpen(false)}
              className="block p-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-colors"
            >
              <div className="font-bold text-slate-800 text-sm">Buat SPL (Surat Perintah Lembur)</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ajukan penugasan lembur atau pekerjaan tertunda untuk tim lapangan.
              </p>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
