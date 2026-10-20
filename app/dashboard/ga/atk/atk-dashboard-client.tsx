'use client'

import React, { useState, useMemo, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  FileText,
  Plus,
  FolderKanban,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Trash2,
  Clock,
  Package,
  Layers,
  RotateCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AtkStatusBadge } from '@/components/atk/atk-status-badge'
import { AtkPrintDocumentDialog } from '@/components/atk/atk-print-document-dialog'
import { AtkReviewDialog } from '@/components/atk/atk-review-dialog'
import { getAtkRequestById, deleteAtkRequest } from '@/app/actions/atk'

type AtkRow = {
  id: number
  requestNumber: string
  requestType: string
  targetRecipientName: string
  requestDate: Date | string
  status: string
  notes: string
  requesterSignatureUrl?: string | null
  reviewerNote?: string | null
  reviewedAt?: Date | string | null
  recipientSignatureUrl?: string | null
  recipientName?: string | null
  completedAt?: Date | string | null
  createdAt: Date | string
  employeeId: number
  employeeName: string
  employeeSn: string
  employeeEmail: string
  siteId: number
  siteName: string
  departmentId?: number | null
  departmentName?: string | null
  reviewerName?: string | null
  totalItems: number
}

type MetricData = {
  total: number
  pending: number
  approved: number
  readyForPickup: number
  completed: number
  rejected: number
  inProgress: number
  activeMasterItems: number
}

export function AtkDashboardClient({
  initialRequests,
  metrics,
  sites,
  departments,
  canManage,
  currentEmployeeId,
}: {
  initialRequests: AtkRow[]
  metrics: MetricData
  sites: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string }>
  canManage: boolean
  currentEmployeeId: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filters state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [siteFilter, setSiteFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')

  // Dialogs state
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<{
    id: number
    requestNumber: string
    currentStatus: string
  } | null>(null)

  // Filtered rows
  const filteredRows = useMemo(() => {
    return initialRequests.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (siteFilter !== 'all' && String(row.siteId) !== siteFilter) return false
      if (deptFilter !== 'all' && String(row.departmentId) !== deptFilter) return false

      if (search.trim()) {
        const query = search.toLowerCase()
        const matchNumber = row.requestNumber.toLowerCase().includes(query)
        const matchName = row.employeeName.toLowerCase().includes(query)
        const matchSn = row.employeeSn?.toLowerCase().includes(query)
        const matchDept = row.departmentName?.toLowerCase().includes(query)
        const matchNotes = row.notes?.toLowerCase().includes(query)
        const matchTarget = row.targetRecipientName?.toLowerCase().includes(query)
        return matchNumber || matchName || matchSn || matchDept || matchNotes || matchTarget
      }

      return true
    })
  }, [initialRequests, search, statusFilter, siteFilter, deptFilter])

  // TanStack Virtualization
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const before = virtualItems.length > 0 ? virtualItems[0].start : 0
  const after =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0

  // Actions
  const handleOpenPrintDialog = async (id: number) => {
    setLoadingDetail(true)
    try {
      const detail = await getAtkRequestById(id)
      if (detail) {
        setPrintData(detail)
        setPrintDialogOpen(true)
      }
    } catch (err) {
      console.error('Failed to load ATK detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleOpenReviewDialog = (row: AtkRow) => {
    setSelectedReview({
      id: row.id,
      requestNumber: row.requestNumber,
      currentStatus: row.status,
    })
    setReviewDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin membatalkan dan menghapus pengajuan ATK ini?')) {
      try {
        await deleteAtkRequest(id)
        startTransition(() => {
          router.refresh()
        })
      } catch (err: any) {
        alert(err?.message || 'Gagal menghapus pengajuan')
      }
    }
  }

  const handleExportCsv = () => {
    const headers = [
      'No Dokumen',
      'Tanggal',
      'Nama Pemohon',
      'NIK / SN',
      'Site',
      'Departemen',
      'Peruntukan',
      'Penerima/Tujuan',
      'Jumlah Item',
      'Status',
      'Catatan',
      'Reviewer GA',
    ]

    const csvRows = filteredRows.map((r) => [
      `"${r.requestNumber}"`,
      `"${new Date(r.requestDate).toLocaleDateString('id-ID')}"`,
      `"${r.employeeName.replace(/"/g, '""')}"`,
      `"${r.employeeSn || ''}"`,
      `"${r.siteName}"`,
      `"${r.departmentName || ''}"`,
      `"${r.requestType}"`,
      `"${(r.targetRecipientName || '').replace(/"/g, '""')}"`,
      r.totalItems,
      `"${r.status}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      `"${r.reviewerName || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `rekap_pengajuan_atk_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <FileText className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">
                GA &bull; Pengajuan & Dashboard ATK
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kelola permintaan alat tulis kantor, serah terima, dan pemantauan per site/divisi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <Download className="size-4" />
            Ekspor CSV
          </Button>

          {canManage && (
            <Link href="/dashboard/ga/atk/master">
              <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5 h-9">
                <FolderKanban className="size-4" />
                Katalog Master ATK
              </Button>
            </Link>
          )}

          <Link href="/dashboard/ga/atk/new">
            <Button size="sm" className="text-xs font-semibold gap-1.5 h-9 shadow-sm">
              <Plus className="size-4" />
              Buat Pengajuan ATK
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Pengajuan</span>
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600">
              <Layers className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{metrics.total}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {metrics.activeMasterItems} item master aktif
          </p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Menunggu Review
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-amber-700 dark:text-amber-400">
            {metrics.pending}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Perlu peninjauan PIC GA</p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              Disetujui / Disiapkan
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-700 dark:text-blue-400">
            {metrics.inProgress}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {metrics.readyForPickup} siap diambil
          </p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Selesai Diserahkan
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
              <Package className="size-4" />
            </span>
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-700 dark:text-emerald-400">
            {metrics.completed}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Serah terima tuntas</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari no. formulir, nama karyawan, NIK, atau peruntukan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[150px] text-xs h-9">
                <SelectValue placeholder="Semua Site" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Semua Site</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[160px] text-xs h-9">
                <SelectValue placeholder="Semua Departemen" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Semua Departemen</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] text-xs h-9">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending_approval">Menunggu Review</SelectItem>
                <SelectItem value="approved">Disetujui / Disiapkan</SelectItem>
                <SelectItem value="ready_for_pickup">Siap Diambil di GA</SelectItem>
                <SelectItem value="completed">Selesai / Diterima</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TanStack Virtualized Table */}
      <div className="rounded-md border bg-card overflow-hidden shadow-sm">
        <div
          ref={parentRef}
          className="h-[600px] overflow-auto relative scrollbar-thin scrollbar-thumb-accent"
        >
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/80 text-muted-foreground uppercase text-[10px] font-bold sticky top-0 z-10 backdrop-blur-sm border-b">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-40">No. Formulir</th>
                <th className="py-3 px-4 w-32">Tanggal</th>
                <th className="py-3 px-4">Pemohon & Divisi</th>
                <th className="py-3 px-4 w-36">Peruntukan</th>
                <th className="py-3 px-4 w-24 text-center">Item</th>
                <th className="py-3 px-4 w-44">Status</th>
                <th className="py-3 px-4 w-40 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <FileText className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">Tidak ada data pengajuan ATK</p>
                    <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                  </td>
                </tr>
              ) : (
                <>
                  {before > 0 && (
                    <tr>
                      <td colSpan={8} style={{ height: `${before}px` }} />
                    </tr>
                  )}
                  {virtualItems.map((virtualRow) => {
                    const row = filteredRows[virtualRow.index]
                    const canEditRow = canManage
                    const canDeleteRow =
                      canManage ||
                      (row.employeeId === currentEmployeeId &&
                        row.status === 'pending_approval')

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/40 transition-colors h-[64px]"
                      >
                        <td className="py-3 px-4 text-center font-medium text-muted-foreground">
                          {virtualRow.index + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {row.requestNumber}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(row.requestDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground">{row.employeeName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.departmentName || '-'} &bull; {row.siteName}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-medium text-foreground">
                            {row.requestType === 'department'
                              ? `Divisi (${row.targetRecipientName || 'Dept'})`
                              : 'Personal'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold bg-muted px-2 py-0.5 rounded text-[11px]">
                            {row.totalItems} item
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <AtkStatusBadge status={row.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View / Print Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Lihat & Cetak Dokumen"
                              onClick={() => handleOpenPrintDialog(row.id)}
                              disabled={loadingDetail}
                            >
                              <Eye className="size-4" />
                            </Button>

                            {/* Review Action for GA */}
                            {canEditRow && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] font-semibold gap-1 text-primary hover:bg-primary/10"
                                onClick={() => handleOpenReviewDialog(row)}
                              >
                                Review
                              </Button>
                            )}

                            {/* Delete Button */}
                            {canDeleteRow && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Batalkan Pengajuan"
                                onClick={() => handleDelete(row.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {after > 0 && (
                    <tr>
                      <td colSpan={8} style={{ height: `${after}px` }} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print / Document Preview Dialog */}
      <AtkPrintDocumentDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        data={printData}
      />

      {/* Review Dialog */}
      {selectedReview && (
        <AtkReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          requestId={selectedReview.id}
          requestNumber={selectedReview.requestNumber}
          currentStatus={selectedReview.currentStatus}
          onSuccess={() => {
            startTransition(() => {
              router.refresh()
            })
          }}
        />
      )}
    </div>
  )
}
