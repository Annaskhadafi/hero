'use client'

import React, { useState, useMemo, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Image as ImageIcon,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Truck,
  Users,
  Wrench,
  X,
  ZoomIn,
} from 'lucide-react'

import {
  DailyActivityDashboardData,
  EmployeeActivityRow,
  ActivityTaskItem,
} from '@/lib/daily-activity-dashboard'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MaestroClientActivityProps {
  initialData: DailyActivityDashboardData
  customerInfo: {
    name: string
    code?: string | null
  }
  authorizedSites: Array<{
    id: number
    name: string
    location?: string | null
  }>
  currentSiteId: number
  currentDate?: string
}

export function MaestroClientActivityDashboard({
  initialData,
  customerInfo,
  authorizedSites,
  currentSiteId,
  currentDate,
}: MaestroClientActivityProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Filter States
  const [selectedSiteId, setSelectedSiteId] = useState<number>(currentSiteId)
  const [selectedDate, setSelectedDate] = useState<string>(
    currentDate || searchParams.get('date') || new Date().toISOString().split('T')[0]
  )
  const [selectedShift, setSelectedShift] = useState<string>(searchParams.get('shift') || 'ALL')
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState<'activities' | 'manpower'>('activities')

  // Modal inspection states
  const [detailRow, setDetailRow] = useState<EmployeeActivityRow | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const kpis = initialData.kpis || {
    karyawanAktif: { value: 0, total: 0, change: '0%' },
    hadirCheckIn: { value: 0, change: '0%' },
    aktivitasSelesai: { value: 0, change: '0%' },
    sedangBerjalan: { value: 0, change: '0%' },
    terlambatBelumUpdate: { value: 0, change: '0%' },
  }

  const employeesList = initialData.employees || []

  // Calculate task counts from employees
  const totalTasks = employeesList.reduce((acc, row) => acc + (row.tasksCount || row.tasks?.length || 0), 0)
  const completedTasks = kpis.aktivitasSelesai?.value || 0
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

  // Handle URL Parameter Sync
  const applyFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'ALL') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  // Filtered rows
  const filteredActivities = useMemo(() => {
    return employeesList.filter((row: EmployeeActivityRow) => {
      if (selectedShift !== 'ALL' && row.shift !== selectedShift) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesUnit =
          row.unitTireId?.toLowerCase().includes(q) ||
          (row.allUnits && row.allUnits.some((u: string) => u.toLowerCase().includes(q)))
        const matchesActivity = row.primaryActivity?.toLowerCase().includes(q)
        const matchesName = row.name?.toLowerCase().includes(q)
        const matchesTask = row.tasks?.some(
          (t: ActivityTaskItem) =>
            t.label?.toLowerCase().includes(q) || t.unitNumber?.toLowerCase().includes(q)
        )
        if (!matchesUnit && !matchesActivity && !matchesName && !matchesTask) {
          return false
        }
      }
      return true
    })
  }, [employeesList, selectedShift, searchQuery])

  const currentSiteName =
    authorizedSites.find((s) => s.id === selectedSiteId)?.name || 'Seluruh Site'

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-slate-500 hover:text-slate-900"
            >
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-xs">Kembali ke Dashboard</span>
              </Link>
            </Button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Daily Activity Monitoring
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Log Pekerjaan &amp; Timesheet Site
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Pantau aktivitas harian teknisi PT Chitra Paratama di site Anda secara real-time.
          </p>
        </div>

        {/* Site Switcher (Strictly scoped to customer's authorized sites) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <MapPin className="h-4 w-4 text-amber-600 shrink-0 ml-1.5" />
            <select
              value={selectedSiteId}
              onChange={(e) => {
                const siteId = Number(e.target.value)
                setSelectedSiteId(siteId)
                applyFilter('siteId', String(siteId))
              }}
              className="h-8 rounded-lg border-0 bg-transparent pr-8 text-xs font-semibold text-slate-900 focus:ring-0 cursor-pointer"
            >
              {authorizedSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.location ? `(${s.location})` : ''}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            disabled={isPending}
            className="h-11 rounded-xl border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Manpower */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Personel Aktif di Site
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {kpis.hadirCheckIn?.value || 0}
            </span>
            <span className="text-xs text-slate-500">
              dari {kpis.karyawanAktif?.total || employeesList.length} personel
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Personel Chitra hadir dan siap bertugas di site.
          </p>
        </div>

        {/* Card 2: Total Tasks */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Aktivitas &amp; Servis Ban
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {totalTasks}
            </span>
            <span className="text-xs text-slate-500">tugas pekerjaan</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {completedTasks} selesai, {kpis.sedangBerjalan?.value || 0} dalam pengerjaan.
          </p>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Penyelesaian Tugas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {completionRate}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Tuntas</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Progress keseluruhan tugas shift aktif.
          </p>
        </div>

        {/* Card 4: Attendance / Site Info */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status Operasional
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Aktif
            </span>
            <span className="text-xs text-slate-500">Live Update</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Site {currentSiteName} terhubung ke sistem HERO.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('activities')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'activities'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Log Pekerjaan &amp; Unit ({filteredActivities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manpower')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'manpower'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Roster &amp; Timesheet ({employeesList.length})
            </button>
          </div>

          {/* Filters: Date, Shift & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  applyFilter('date', e.target.value)
                }}
                className="border-0 bg-transparent p-0 text-xs font-medium text-slate-800 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Shift Filter */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
              <span className="text-[11px] font-medium text-slate-400 mr-1.5">Shift:</span>
              <select
                value={selectedShift}
                onChange={(e) => {
                  setSelectedShift(e.target.value)
                  applyFilter('shift', e.target.value)
                }}
                className="border-0 bg-transparent p-0 pr-6 text-xs font-semibold text-slate-800 focus:ring-0 cursor-pointer"
              >
                <option value="ALL">Semua Shift</option>
                <option value="Pagi">Pagi</option>
                <option value="Siang">Siang</option>
                <option value="Malam">Malam</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari Unit / Pekerjaan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  applyFilter('q', e.target.value)
                }}
                className="h-9 rounded-xl border-slate-200 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: Log Pekerjaan & Unit */}
      {activeTab === 'activities' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Teknisi Chitra</th>
                  <th className="px-5 py-3.5">Shift</th>
                  <th className="px-5 py-3.5">Unit Alat Berat</th>
                  <th className="px-5 py-3.5">Aktivitas Utama / Servis</th>
                  <th className="px-5 py-3.5">Status Progress</th>
                  <th className="px-5 py-3.5">Bukti Foto</th>
                  <th className="px-5 py-3.5 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Wrench className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">Tidak ada log aktivitas</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Belum ada aktivitas tercatat untuk site dan filter yang dipilih.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((row: EmployeeActivityRow, idx: number) => {
                    const allPhotos = (row.tasks || [])
                      .flatMap((t: ActivityTaskItem) => t.photos || (t.photoUrl ? [t.photoUrl] : []))
                      .filter(Boolean)

                    return (
                      <tr key={row.sessionId || idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{row.name}</div>
                          <div className="text-[11px] text-slate-500">{row.jobTitle || 'Teknisi Ban'}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              row.shift === 'Pagi'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : row.shift === 'Malam'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.shift}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                            <Truck className="h-3.5 w-3.5 text-slate-400" />
                            <span>{row.unitTireId || (row.allUnits && row.allUnits[0]) || '-'}</span>
                          </div>
                          {row.allUnits && row.allUnits.length > 1 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              +{row.allUnits.length - 1} unit lainnya
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            {row.primaryActivity || 'Pemeriksaan Rutin'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {row.tasks?.length || row.tasksCount || 0} sub-pekerjaan
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${row.progress || 100}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-medium text-slate-600">
                              {row.progress || 100}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {allPhotos.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              {allPhotos.slice(0, 3).map((photoUrl: string, pIdx: number) => {
                                const resolved = resolveUploadUrl(photoUrl)
                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => setLightboxImage(resolved)}
                                    className="relative h-8 w-8 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition shrink-0"
                                  >
                                    <Image
                                      src={resolved}
                                      alt="Bukti Kerja"
                                      fill
                                      className="object-cover"
                                      sizes="32px"
                                    />
                                  </button>
                                )
                              })}
                              {allPhotos.length > 3 && (
                                <span className="text-[10px] font-semibold text-slate-400">
                                  +{allPhotos.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailRow(row)}
                            className="h-8 rounded-lg px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
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
        </div>
      )}

      {/* Tab 2: Manpower & Timesheet Summary */}
      {activeTab === 'manpower' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Teknisi</th>
                  <th className="px-5 py-3.5">Departemen</th>
                  <th className="px-5 py-3.5">Jadwal Shift</th>
                  <th className="px-5 py-3.5">Check-In</th>
                  <th className="px-5 py-3.5">Check-Out</th>
                  <th className="px-5 py-3.5">Status Timesheet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.map((row: EmployeeActivityRow, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{row.name}</div>
                      <div className="text-[11px] text-slate-500">{row.jobTitle}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {row.department || 'Tyre Management'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                        {row.shift}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-700">
                      {row.checkInTime || '-'}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-700">
                      {row.checkOutTime || 'Sedang Bertugas'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Terverifikasi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={Boolean(detailRow)} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-3xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-slate-900">
              Detail Log Aktivitas &amp; Servis Ban
            </DialogTitle>
          </DialogHeader>

          {detailRow && (
            <div className="space-y-6 pt-2">
              {/* Header Info */}
              <div className="grid gap-3 sm:grid-cols-3 rounded-xl bg-slate-50 p-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Teknisi</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{detailRow.name}</p>
                  <p className="text-[11px] text-slate-500">{detailRow.jobTitle}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Site &amp; Shift</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{currentSiteName}</p>
                  <p className="text-[11px] text-slate-500">Shift {detailRow.shift}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Unit Utama</span>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{detailRow.unitTireId || '-'}</p>
                  <p className="text-[11px] text-slate-500">Check-in: {detailRow.checkInTime || '-'}</p>
                </div>
              </div>

              {/* Task Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Daftar Pekerjaan Tercatat ({detailRow.tasks?.length || 0})
                </h4>
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {(detailRow.tasks || []).map((task: ActivityTaskItem, tIdx: number) => (
                    <div
                      key={tIdx}
                      className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-900">{task.label}</div>
                        <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                          {task.status}
                        </span>
                      </div>

                      {task.unitNumber && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Truck className="h-3 w-3 text-slate-400" />
                          <span>Unit: {task.unitNumber}</span>
                        </div>
                      )}

                      {task.remarks && (
                        <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg">
                          {task.remarks}
                        </p>
                      )}

                      {/* Task Photos */}
                      {task.photos && task.photos.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-semibold text-slate-400 block mb-1.5">
                            Dokumentasi Foto ({task.photos.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {task.photos.map((pUrl: string, pIdx: number) => {
                              const resolved = resolveUploadUrl(pUrl)
                              return (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => setLightboxImage(resolved)}
                                  className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-200 hover:opacity-80 transition"
                                >
                                  <Image
                                    src={resolved}
                                    alt="Dokumentasi Pekerjaan"
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative w-full h-[70vh]">
              <Image
                src={lightboxImage}
                alt="Bukti Foto Resolusi Penuh"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
