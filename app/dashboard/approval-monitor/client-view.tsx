'use client'

import React, { useState, useMemo, useRef, useTransition } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Search,
  Filter,
  RefreshCw,
  ArrowRightLeft,
  UserCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  ExternalLink,
  ShieldAlert,
  Users,
  Layers,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type {
  ApprovalMonitorData,
  ApprovalMonitorItem,
  ApprovalMonitorStep,
} from '@/lib/approval-workspace'
import { Checkbox } from '@/components/ui/checkbox'
import {
  fetchApprovalMonitoringDataAction,
  reassignApprovalStepAction,
  modifyApprovalRouteAction,
  deleteApprovalSubmissionAction,
  bulkDeleteApprovalSubmissionsAction,
} from './actions'

interface Props {
  initialData: ApprovalMonitorData
  employees: Array<{
    id: number
    name: string
    email: string
    jobTitle: string
    departmentName: string
  }>
  currentUser: {
    name: string
    email: string
  }
}

function getPendingDurationInfo(item: ApprovalMonitorItem) {
  if (item.overallStatus === 'approved') {
    return {
      label: 'Selesai',
      sublabel: 'Disetujui',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }
  if (item.overallStatus === 'rejected') {
    return {
      label: 'Ditolak',
      sublabel: 'Selesai',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    }
  }
  if (item.overallStatus === 'reverted') {
    return {
      label: 'Revisi',
      sublabel: 'Dikembalikan',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    }
  }

  if (!item.submittedAt) {
    return {
      label: '-',
      sublabel: '',
      badgeClass: 'bg-slate-50 text-slate-500 border-slate-200',
    }
  }

  const start = new Date(item.submittedAt).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - start)
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays >= 1) {
    const remHours = diffHours % 24
    return {
      label: `${diffDays} hari${remHours > 0 ? ` ${remHours}j` : ''}`,
      sublabel: 'Lama pending',
      badgeClass: diffDays >= 2
        ? 'bg-rose-100 text-rose-800 border-rose-200 font-bold'
        : 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
    }
  }

  if (diffHours >= 1) {
    return {
      label: `${diffHours} jam`,
      sublabel: 'Lama pending',
      badgeClass: diffHours >= 12
        ? 'bg-amber-100 text-amber-800 border-amber-200 font-semibold'
        : 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    }
  }

  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)))
  return {
    label: `${diffMins} mnt`,
    sublabel: 'Baru diajukan',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
  }
}

export function ApprovalMonitorClientView({ initialData, employees, currentUser }: Props) {
  const [data, setData] = useState<ApprovalMonitorData>(initialData)
  const [isPendingRefresh, startTransition] = useTransition()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [urgencyFilter, setUrgencyFilter] = useState('ALL')
  const [siteFilter, setSiteFilter] = useState('ALL')

  // Modals & Actions
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ApprovalMonitorItem | null>(null)
  const [reassignTarget, setReassignTarget] = useState<{
    item: ApprovalMonitorItem
    step: ApprovalMonitorStep
  } | null>(null)
  const [selectedTargetEmployeeId, setSelectedTargetEmployeeId] = useState<string>('')
  const [reassignNote, setReassignNote] = useState('')
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false)

  const [routeManageItem, setRouteManageItem] = useState<ApprovalMonitorItem | null>(null)
  const [routeStepModifications, setRouteStepModifications] = useState<Record<number, number>>({})
  const [isSubmittingRoute, setIsSubmittingRoute] = useState(false)

  const [deleteTargetItem, setDeleteTargetItem] = useState<ApprovalMonitorItem | null>(null)
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  // Multi select state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isSubmittingBulkDelete, setIsSubmittingBulkDelete] = useState(false)

  // Unique sites for filter dropdown
  const uniqueSites = useMemo(() => {
    const set = new Set<string>()
    data.items.forEach((item) => {
      if (item.siteName && item.siteName !== '-') set.add(item.siteName)
    })
    return Array.from(set).sort()
  }, [data.items])

  // Filtered items
  const filteredItems = useMemo(() => {
    return data.items.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && item.overallStatus !== 'pending') return false
        if (statusFilter === 'APPROVED' && item.overallStatus !== 'approved') return false
        if (statusFilter === 'REVERTED' && item.overallStatus !== 'reverted') return false
        if (statusFilter === 'REJECTED' && item.overallStatus !== 'rejected') return false
      }
      if (urgencyFilter !== 'ALL') {
        if (urgencyFilter === 'OVERDUE' && item.dueState !== 'overdue') return false
        if (urgencyFilter === 'DUE_SOON' && item.dueState !== 'due_soon') return false
        if (urgencyFilter === 'ON_TRACK' && item.dueState !== 'on_track') return false
      }
      if (siteFilter !== 'ALL' && item.siteName !== siteFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchDoc = item.documentNumber.toLowerCase().includes(q)
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchReq = item.requesterName.toLowerCase().includes(q)
        const matchAppr = item.currentApproverName.toLowerCase().includes(q)
        const matchEmail = item.requesterEmail.toLowerCase().includes(q) || item.currentApproverEmail.toLowerCase().includes(q)
        if (!matchDoc && !matchTitle && !matchReq && !matchAppr && !matchEmail) return false
      }

      return true
    })
  }, [data.items, categoryFilter, statusFilter, urgencyFilter, siteFilter, searchQuery])

  // Virtualization container
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const before = virtualItems.length > 0 ? virtualItems[0].start : 0
  const after = virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await fetchApprovalMonitoringDataAction()
      if (res.success && res.data) {
        setData(res.data)
        toast.success('Data monitoring approval diperbarui.')
      } else {
        toast.error(res.error || 'Gagal menyegarkan data.')
      }
    })
  }

  const handleExecuteReassign = async () => {
    if (!reassignTarget || !selectedTargetEmployeeId) {
      toast.error('Pilih karyawan pengganti terlebih dahulu.')
      return
    }

    setIsSubmittingReassign(true)
    try {
      const res = await reassignApprovalStepAction({
        category: reassignTarget.item.category,
        stepId: reassignTarget.step.stepId,
        targetEmployeeId: Number(selectedTargetEmployeeId),
        note: reassignNote,
      })

      if (res.success) {
        toast.success(res.message)
        setReassignTarget(null)
        setSelectedTargetEmployeeId('')
        setReassignNote('')
        handleRefresh()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengalihkan approval.')
    } finally {
      setIsSubmittingReassign(false)
    }
  }

  const handleExecuteModifyRoute = async () => {
    if (!routeManageItem) return

    const modifiedEntries = Object.entries(routeStepModifications)
    if (modifiedEntries.length === 0) {
      toast.info('Tidak ada perubahan rute.')
      setRouteManageItem(null)
      return
    }

    setIsSubmittingRoute(true)
    try {
      const steps = modifiedEntries.map(([stepIdStr, empId]) => ({
        stepId: Number(stepIdStr),
        targetEmployeeId: empId,
      }))

      const res = await modifyApprovalRouteAction({
        category: routeManageItem.category,
        docId: routeManageItem.rawId,
        steps,
      })

      if (res.success) {
        toast.success(res.message)
        setRouteManageItem(null)
        setRouteStepModifications({})
        handleRefresh()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengubah route approval.')
    } finally {
      setIsSubmittingRoute(false)
    }
  }

  const handleExecuteDelete = async () => {
    if (!deleteTargetItem) return

    setIsSubmittingDelete(true)
    try {
      const res = await deleteApprovalSubmissionAction({
        category: deleteTargetItem.category,
        rawId: deleteTargetItem.rawId,
      })

      if (res.success) {
        toast.success(res.message)
        setDeleteTargetItem(null)
        handleRefresh()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pengajuan.')
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  const isAllSelected = useMemo(() => {
    if (filteredItems.length === 0) return false
    return filteredItems.every((item) => selectedItemIds.has(item.id))
  }, [filteredItems, selectedItemIds])

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedItemIds)
      filteredItems.forEach((item) => next.delete(item.id))
      setSelectedItemIds(next)
    } else {
      const next = new Set(selectedItemIds)
      filteredItems.forEach((item) => next.add(item.id))
      setSelectedItemIds(next)
    }
  }

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedItemIds(next)
  }

  const handleClearSelection = () => {
    setSelectedItemIds(new Set())
  }

  const handleExecuteBulkDelete = async () => {
    if (selectedItemIds.size === 0) return

    const itemsToDelete = data.items
      .filter((item) => selectedItemIds.has(item.id))
      .map((item) => ({
        category: item.category,
        rawId: item.rawId,
      }))

    setIsSubmittingBulkDelete(true)
    try {
      const res = await bulkDeleteApprovalSubmissionsAction(itemsToDelete)
      if (res.success) {
        toast.success(res.message)
        setSelectedItemIds(new Set())
        setIsBulkDeleteModalOpen(false)
        handleRefresh()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus dokumen.')
    } finally {
      setIsSubmittingBulkDelete(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Controls ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Approval Monitor
            </h1>
            <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 font-semibold px-2">
              Super Admin Console
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Pantau seluruh progres approval perusahaan, alihkan tugas jika approver berhalangan, dan kelola rute alur kerja secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPendingRefresh}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isPendingRefresh ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* ─── KPI Metrics Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Menunggu Approval</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-950">{data.metrics.totalPending}</div>
          <p className="text-xs text-amber-700 mt-0.5">Dokumen sedang dalam antrean</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Butuh Perhatian (SLA)</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-950">
            {data.metrics.overdueCount + data.metrics.dueSoonCount}
          </div>
          <p className="text-xs text-rose-700 mt-0.5">
            {data.metrics.overdueCount} Terlambat • {data.metrics.dueSoonCount} Segera Habis
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Selesai (Approved)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-950">{data.metrics.totalApproved}</div>
          <p className="text-xs text-emerald-700 mt-0.5">Disetujui penuh minggu ini</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">Revisi / Reverted</span>
            <RotateCcw className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-950">{data.metrics.totalReverted}</div>
          <p className="text-xs text-blue-700 mt-0.5">Dikembalikan ke pemohon</p>
        </div>
      </div>

      {/* ─── Bottleneck Approvers Alert Bar ───────────────────────────────── */}
      {data.metrics.bottleneckApprovers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Users className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Approver dengan Beban Antrean Terbanyak (Bottleneck Watch)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {data.metrics.bottleneckApprovers.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150 text-xs"
              >
                <div className="truncate mr-2">
                  <p className="font-semibold text-slate-900 truncate">{b.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{b.email || 'No Email'}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-bold shrink-0">
                  {b.count} pending
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Filter & Search Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nomor dokumen, pemohon, approver, atau judul..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] bg-white shadow-sm text-xs">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kategori</SelectItem>
              <SelectItem value="DAILY_ACTIVITY">Daily Activity (DAR)</SelectItem>
              <SelectItem value="OVERTIME">Lembur (SPL)</SelectItem>
              <SelectItem value="PTW">Izin Kerja (PTW)</SelectItem>
              <SelectItem value="SOP_WIN">SOP / WIN</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-white shadow-sm text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REVERTED">Reverted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* SLA / Urgency Filter */}
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-[140px] bg-white shadow-sm text-xs">
              <SelectValue placeholder="SLA / Urgensi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua SLA</SelectItem>
              <SelectItem value="OVERDUE">Terlambat (&gt;48h)</SelectItem>
              <SelectItem value="DUE_SOON">Segera Habis (&gt;24h)</SelectItem>
              <SelectItem value="ON_TRACK">Normal (&lt;24h)</SelectItem>
            </SelectContent>
          </Select>

          {/* Site Filter */}
          {uniqueSites.length > 0 && (
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[140px] bg-white shadow-sm text-xs">
                <SelectValue placeholder="Lokasi Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Lokasi</SelectItem>
                {uniqueSites.map((site) => (
                  <SelectItem key={site} value={site}>
                    {site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(categoryFilter !== 'ALL' || statusFilter !== 'ALL' || urgencyFilter !== 'ALL' || siteFilter !== 'ALL' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter('ALL')
                setStatusFilter('ALL')
                setUrgencyFilter('ALL')
                setSiteFilter('ALL')
                setSearchQuery('')
              }}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* ─── Bulk Action Floating / Top Banner ─────────────────────────── */}
      {selectedItemIds.size > 0 && (
        <div className="flex items-center justify-between p-3 px-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/30 text-indigo-300 font-bold text-xs border border-indigo-400/30">
              {selectedItemIds.size}
            </div>
            <span className="text-xs font-medium">
              <strong>{selectedItemIds.size}</strong> dokumen dipilih
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-xs text-slate-300 hover:text-white h-7 px-2 hover:bg-slate-800"
            >
              {isAllSelected ? 'Batalkan Semua' : `Pilih Semua (${filteredItems.length})`}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-xs text-slate-400 hover:text-white h-7 px-2 hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="h-7 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus {selectedItemIds.size} Terpilih</span>
            </Button>
          </div>
        </div>
      )}

      {/* ─── Virtualized Table ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50/70 border-b flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredItems.length}</strong> dari total {data.items.length} dokumen approval</span>
          {selectedItemIds.size > 0 && (
            <span className="text-indigo-600 font-semibold">{selectedItemIds.size} dokumen terpilih</span>
          )}
        </div>

        <div
          ref={parentRef}
          className="h-[600px] overflow-auto relative scrollbar-thin scrollbar-thumb-slate-300"
        >
          {filteredItems.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-slate-500">
              <Layers className="h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Tidak ada dokumen approval ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang aktif.</p>
            </div>
          ) : (
            <table className="table-fixed w-full min-w-[1080px] text-left text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur text-slate-600 font-semibold text-xs border-b">
                <tr>
                  <th className="py-3 px-3 w-[44px] text-center">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Pilih semua dokumen"
                    />
                  </th>
                  <th className="py-3 px-4 w-[145px]">Tanggal Submit & Pending</th>
                  <th className="py-3 px-4 w-[260px]">Dokumen</th>
                  <th className="py-3 px-4 w-[170px]">Pemohon & Site</th>
                  <th className="py-3 px-4 w-[190px]">Progres Stepper</th>
                  <th className="py-3 px-4 w-[160px]">Approver Aktif</th>
                  <th className="py-3 px-4 w-[95px]">Status</th>
                  <th className="py-3 px-3 w-[50px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {before > 0 && (
                  <tr>
                    <td colSpan={8} style={{ height: `${before}px` }} />
                  </tr>
                )}

                {virtualItems.map((virtualRow) => {
                  const item = filteredItems[virtualRow.index]
                  const isChecked = selectedItemIds.has(item.id)
                  const pendingInfo = getPendingDurationInfo(item)

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isChecked ? 'bg-indigo-50/30' : ''
                      }`}
                      style={{ height: '72px' }}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                          aria-label={`Pilih ${item.documentNumber}`}
                        />
                      </td>

                      {/* Submit Date & Lama Pending (DI AWAL) */}
                      <td className="py-2.5 px-4 whitespace-nowrap overflow-hidden">
                        <div className="text-xs font-semibold text-slate-800">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge className={`text-[10px] px-1.5 py-0 border shrink-0 ${pendingInfo.badgeClass}`}>
                            {pendingInfo.label}
                          </Badge>
                          {item.dueState === 'overdue' && item.overallStatus === 'pending' && (
                            <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider shrink-0">
                              SLA!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dokumen Info */}
                      <td className="py-2.5 px-4 overflow-hidden">
                        <div className="font-semibold text-slate-900 truncate" title={item.documentNumber}>
                          {item.documentNumber}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                            {item.categoryLabel}
                          </Badge>
                          <span className="text-xs text-slate-500 truncate min-w-0 block" title={item.title}>
                            {item.title}
                          </span>
                        </div>
                      </td>

                      {/* Pemohon & Site */}
                      <td className="py-2.5 px-4 overflow-hidden">
                        <div className="font-medium text-slate-800 truncate" title={item.requesterName}>
                          {item.requesterName}
                        </div>
                        <div className="text-xs text-slate-500 truncate" title={item.siteName}>
                          {item.siteName}
                        </div>
                      </td>

                      {/* Stepper Progres */}
                      <td className="py-2.5 px-4 overflow-hidden">
                        <div className="flex items-center gap-1">
                          {item.steps.map((st, idx) => {
                            const isApproved = ['approved', 'signed', 'completed'].includes(st.status)
                            const isPending = st.status === 'pending'
                            const isReverted = st.status === 'reverted'

                            return (
                              <React.Fragment key={st.stepId || idx}>
                                <div
                                  className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 ${
                                    isApproved
                                      ? 'bg-emerald-500 text-white'
                                      : isPending
                                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200'
                                      : isReverted
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                  title={`${st.stepLabel}: ${st.approverName} (${st.status})`}
                                >
                                  {isApproved ? '✓' : st.stepOrder}
                                </div>
                                {idx < item.steps.length - 1 && (
                                  <div
                                    className={`w-3 h-0.5 shrink-0 ${
                                      isApproved ? 'bg-emerald-400' : 'bg-slate-200'
                                    }`}
                                  />
                                )}
                              </React.Fragment>
                            )
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 truncate" title={`Step ${item.currentStepOrder} dari ${item.totalSteps}: ${item.steps.find(s => s.stepOrder === item.currentStepOrder)?.stepLabel || '-'}`}>
                          Step {item.currentStepOrder} dari {item.totalSteps}: {item.steps.find(s => s.stepOrder === item.currentStepOrder)?.stepLabel || '-'}
                        </div>
                      </td>

                      {/* Approver Aktif */}
                      <td className="py-2.5 px-4 overflow-hidden">
                        <div className="font-medium text-slate-900 truncate" title={item.currentApproverName}>
                          {item.currentApproverName}
                        </div>
                        <div className="text-xs text-slate-400 truncate" title={item.currentApproverEmail || '-'}>
                          {item.currentApproverEmail || '-'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {item.overallStatus === 'approved' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold text-[11px]">
                            Approved
                          </Badge>
                        )}
                        {item.overallStatus === 'pending' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold text-[11px]">
                            Pending
                          </Badge>
                        )}
                        {item.overallStatus === 'reverted' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold text-[11px]">
                            Reverted
                          </Badge>
                        )}
                        {item.overallStatus === 'rejected' && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold text-[11px]">
                            Rejected
                          </Badge>
                        )}
                      </td>

                      {/* Actions (ICON ONLY BUTTON) */}
                      <td className="py-2.5 px-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-1"
                              title="Menu Tindakan"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Tindakan</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs text-slate-400 uppercase tracking-wider">
                              Aksi Super Admin
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => setSelectedItemForDetail(item)}
                              className="text-xs cursor-pointer"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-slate-500" />
                              Detail & Riwayat Step
                            </DropdownMenuItem>

                            {/* Alihkan Approval */}
                            {item.overallStatus === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const pendingStep = item.steps.find((s) => s.status === 'pending') || item.steps[0]
                                  setReassignTarget({ item, step: pendingStep })
                                  setSelectedTargetEmployeeId('')
                                  setReassignNote('')
                                }}
                                className="text-xs cursor-pointer text-amber-700 font-medium"
                              >
                                <ArrowRightLeft className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                Alihkan Approver
                              </DropdownMenuItem>
                            )}

                            {/* Kelola Route */}
                            <DropdownMenuItem
                              onClick={() => {
                                setRouteManageItem(item)
                                setRouteStepModifications({})
                              }}
                              className="text-xs cursor-pointer text-indigo-700 font-medium"
                            >
                              <SlidersHorizontal className="mr-2 h-3.5 w-3.5 text-indigo-600" />
                              Kelola Route Approval
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Buka Tautan Asli */}
                            <DropdownMenuItem asChild className="text-xs cursor-pointer">
                              <a href={item.viewUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                Buka Dokumen Penuh
                              </a>
                            </DropdownMenuItem>

                            {item.editUrl && (
                              <DropdownMenuItem asChild className="text-xs cursor-pointer">
                                <a href={item.editUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  Edit Form Asli
                                </a>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Hapus Pengajuan (Delete) */}
                            <DropdownMenuItem
                              onClick={() => setDeleteTargetItem(item)}
                              className="text-xs cursor-pointer text-red-600 font-medium focus:bg-red-50 focus:text-red-700 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5 text-red-600" />
                              Hapus Pengajuan (Delete)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}

                {after > 0 && (
                  <tr>
                    <td colSpan={8} style={{ height: `${after}px` }} />
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Modal Dialog: Detail & Riwayat Step ─────────────────────────── */}
      <Dialog open={Boolean(selectedItemForDetail)} onOpenChange={(open) => !open && setSelectedItemForDetail(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span>Detail Progres Approval</span>
              <Badge variant="outline">{selectedItemForDetail?.categoryLabel}</Badge>
            </DialogTitle>
            <DialogDescription>
              Nomor: {selectedItemForDetail?.documentNumber} • Pemohon: {selectedItemForDetail?.requesterName} ({selectedItemForDetail?.siteName})
            </DialogDescription>
          </DialogHeader>

          {selectedItemForDetail && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-slate-50 p-3 border text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Judul Dokumen:</span>
                  <p className="font-semibold text-slate-800">{selectedItemForDetail.title}</p>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Pengajuan:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedItemForDetail.submittedAt ? new Date(selectedItemForDetail.submittedAt).toLocaleString('id-ID') : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Status Keseluruhan:</span>
                  <p className="font-semibold capitalize text-slate-800">{selectedItemForDetail.overallStatus}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status SLA:</span>
                  <p className="font-semibold text-slate-800 uppercase">{selectedItemForDetail.dueState}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Daftar Step & Riwayat Penandatanganan:
                </h4>
                <div className="space-y-2.5">
                  {selectedItemForDetail.steps.map((st) => (
                    <div
                      key={st.stepId}
                      className="p-3 rounded-lg border bg-white flex items-start justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                            ['approved', 'signed', 'completed'].includes(st.status)
                              ? 'bg-emerald-500 text-white'
                              : st.status === 'pending'
                              ? 'bg-amber-400 text-amber-950'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {['approved', 'signed', 'completed'].includes(st.status) ? '✓' : st.stepOrder}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {st.stepLabel} — {st.approverName}
                          </div>
                          <div className="text-slate-500 mt-0.5">{st.approverEmail || 'No Email'}</div>
                          {st.remarks && (
                            <div className="mt-1.5 p-2 bg-slate-50 rounded text-slate-600 text-[11px] whitespace-pre-wrap border border-slate-100">
                              {st.remarks}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            ['approved', 'signed', 'completed'].includes(st.status)
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : st.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }
                        >
                          {st.status}
                        </Badge>
                        {st.signedAt && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(st.signedAt).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItemForDetail(null)}>
              Tutup
            </Button>
            {selectedItemForDetail && (
              <Button asChild>
                <a href={selectedItemForDetail.viewUrl} target="_blank" rel="noreferrer">
                  Buka Dokumen Penuh
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Dialog: Alihkan Approver (Reassign) ───────────────────── */}
      <Dialog open={Boolean(reassignTarget)} onOpenChange={(open) => !open && setReassignTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-amber-900">
              <ArrowRightLeft className="h-5 w-5 text-amber-600" />
              <span>Alihkan Tugas Approval</span>
            </DialogTitle>
            <DialogDescription>
              Sebagai Super Admin, Anda dapat mengalihkan penugasan approval kepada karyawan lain bila approver sedang cuti, tidak aktif, atau mengalami hambatan operasional.
            </DialogDescription>
          </DialogHeader>

          {reassignTarget && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 space-y-1">
                <p><strong>Dokumen:</strong> {reassignTarget.item.documentNumber} ({reassignTarget.item.categoryLabel})</p>
                <p><strong>Step yang Dialihkan:</strong> Step {reassignTarget.step.stepOrder} ({reassignTarget.step.stepLabel})</p>
                <p><strong>Approver Saat Ini:</strong> {reassignTarget.step.approverName} ({reassignTarget.step.approverEmail || '-'})</p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Pilih Approver Pengganti:
                </label>
                <Select value={selectedTargetEmployeeId} onValueChange={setSelectedTargetEmployeeId}>
                  <SelectTrigger className="w-full bg-white text-xs">
                    <SelectValue placeholder="Pilih nama karyawan..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)} className="text-xs">
                        {emp.name} — {emp.jobTitle} ({emp.departmentName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Catatan / Alasan Pengalihan (Opsional):
                </label>
                <Textarea
                  placeholder="Contoh: Approver utama sedang cuti lapangan hingga 15 Okt..."
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  className="text-xs h-20"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReassignTarget(null)}
              disabled={isSubmittingReassign}
            >
              Batal
            </Button>
            <Button
              onClick={handleExecuteReassign}
              disabled={!selectedTargetEmployeeId || isSubmittingReassign}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmittingReassign ? 'Mengalihkan...' : 'Alihkan Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Dialog: Kelola Route Approval ─────────────────────────── */}
      <Dialog open={Boolean(routeManageItem)} onOpenChange={(open) => !open && setRouteManageItem(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-indigo-950">
              <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
              <span>Kelola Rute Approval Dokumen</span>
            </DialogTitle>
            <DialogDescription>
              Ubah approver pada masing-masing tahapan rute dokumen ini secara langsung.
            </DialogDescription>
          </DialogHeader>

          {routeManageItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 text-indigo-950">
                <p><strong>Dokumen:</strong> {routeManageItem.documentNumber} — {routeManageItem.title}</p>
                <p><strong>Pemohon:</strong> {routeManageItem.requesterName} ({routeManageItem.siteName})</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Konfigurasi Approver per Step:
                </h4>

                {routeManageItem.steps.map((st) => {
                  const isAlreadyApproved = ['approved', 'signed', 'completed'].includes(st.status)
                  const currentSelectedId = routeStepModifications[st.stepId]
                    ? String(routeStepModifications[st.stepId])
                    : st.approverEmployeeId
                    ? String(st.approverEmployeeId)
                    : ''

                  return (
                    <div
                      key={st.stepId}
                      className="p-3 rounded-lg border bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            isAlreadyApproved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {st.stepOrder}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{st.stepLabel}</p>
                          <p className="text-slate-500 text-[11px]">Saat ini: {st.approverName}</p>
                        </div>
                      </div>

                      <div className="w-full md:w-64">
                        {isAlreadyApproved ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Sudah Disetujui (Terkunci)
                          </Badge>
                        ) : (
                          <Select
                            value={currentSelectedId}
                            onValueChange={(val) => {
                              setRouteStepModifications((prev) => ({
                                ...prev,
                                [st.stepId]: Number(val),
                              }))
                            }}
                          >
                            <SelectTrigger className="w-full bg-white text-xs h-8">
                              <SelectValue placeholder="Pilih approver..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={String(emp.id)} className="text-xs">
                                  {emp.name} ({emp.jobTitle})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRouteManageItem(null)}
              disabled={isSubmittingRoute}
            >
              Batal
            </Button>
            <Button
              onClick={handleExecuteModifyRoute}
              disabled={isSubmittingRoute || Object.keys(routeStepModifications).length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmittingRoute ? 'Menyimpan...' : 'Simpan Perubahan Rute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: HAPUS PENGAJUAN (DELETE) ─────────────────────────── */}
      <Dialog open={Boolean(deleteTargetItem)} onOpenChange={(open) => !open && setDeleteTargetItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base text-red-950">Hapus Dokumen & Approval</DialogTitle>
                <DialogDescription className="text-xs text-red-800/80">
                  Tindakan ini menghapus seluruh submit, history, dan data approval secara permanen.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deleteTargetItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 space-y-2 text-slate-700">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Nomor Dokumen:</span>
                  <span className="font-bold text-slate-900 truncate">{deleteTargetItem.documentNumber}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Kategori:</span>
                  <span className="font-semibold text-slate-800">{deleteTargetItem.categoryLabel}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Judul:</span>
                  <span className="font-semibold text-slate-800 truncate text-right max-w-[220px]">{deleteTargetItem.title}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Pemohon:</span>
                  <span className="font-medium text-slate-800">{deleteTargetItem.requesterName}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Status:</span>
                  <span className="font-bold uppercase text-amber-700">{deleteTargetItem.overallStatus}</span>
                </div>
              </div>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>Pembersihan Data Testing:</strong> Dokumen pengajuan asli, riwayat proses submit, dan seluruh tahapan approval (stepper) akan dihapus fisik dari database. Tindakan ini tidak dapat dibatalkan.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTargetItem(null)}
              disabled={isSubmittingDelete}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteDelete}
              disabled={isSubmittingDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmittingDelete ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 5: BULK DELETE PENGAJUAN TERPILIH ─────────────────── */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base text-red-950">Hapus Dokumen Terpilih Secara Masal</DialogTitle>
                <DialogDescription className="text-xs text-red-800/80">
                  Konfirmasi pembersihan untuk {selectedItemIds.size} dokumen testing terpilih.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 space-y-2 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Jumlah Dokumen Terpilih:</span>
                <span className="font-bold text-red-700 text-sm">{selectedItemIds.size} dokumen</span>
              </div>
              <div className="text-[11px] text-slate-600">
                Dokumen yang akan dihapus mencakup formulir submit, seluruh tahapan approval (stepper), item pekerjaan, dan log audit.
              </div>
            </div>

            <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 leading-relaxed">
              ⚠️ <strong>Pembersihan Masal:</strong> Seluruh {selectedItemIds.size} dokumen terpilih ini akan dihapus fisik dari database secara permanen. Tindakan ini tidak dapat dibatalkan.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              disabled={isSubmittingBulkDelete}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteBulkDelete}
              disabled={isSubmittingBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmittingBulkDelete ? 'Menghapus...' : `Ya, Hapus ${selectedItemIds.size} Dokumen`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
