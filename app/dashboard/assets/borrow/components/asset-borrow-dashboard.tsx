'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  HeroDataTable,
  HeroKpiCard,
  HeroStatusBadge,
  HeroConfirmDialog,
  HeroDateRangePicker,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Trash2,
  Clock,
  Box,
  Layers,
  UserCheck,
  RotateCcw,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { AssetBorrowFormDialog } from './asset-borrow-form-dialog'
import { AssetBorrowDetailModal } from './asset-borrow-detail-modal'
import { AssetBorrowReturnDialog } from './asset-borrow-return-dialog'
import { AssetBorrowConfirmReturnDialog } from './asset-borrow-confirm-return-dialog'
import { AssetApprovalDialog, type AssetApprovalDialogTarget } from '@/components/asset-approval-dialog'
import {
  getAssetBorrows,
  getAssetBorrowDetail,
  approveAssetBorrow,
  rejectAssetBorrow,
  cancelAssetBorrow,
} from '../actions'

export interface AssetBorrowDashboardProps {
  initialItems?: any[]
  totalItems?: number
  kpiStats?: {
    total: number
    pending: number
    borrowed: number
    pendingReturn?: number
    returned: number
  }
  initialData?: {
    items: any[]
    total: number
    kpi: {
      total: number
      pending: number
      borrowed: number
      pendingReturn?: number
      returned: number
    }
    currentAuth?: {
      userId?: string
      employeeId?: number | null
      isSuperAdmin?: boolean
    }
  }
  masterAssets: any[]
  employees: any[]
}

export function AssetBorrowDashboard({
  initialItems,
  totalItems,
  kpiStats,
  initialData,
  masterAssets,
  employees,
}: AssetBorrowDashboardProps) {
  const router = useRouter()

  const items = initialData?.items || initialItems || []
  const initialKpi = initialData?.kpi || kpiStats || { total: 0, pending: 0, borrowed: 0, pendingReturn: 0, returned: 0 }

  const [data, setData] = React.useState(items)
  const [kpi, setKpi] = React.useState(initialKpi)
  const [isLoading, setIsLoading] = React.useState(false)

  const isAdmin = Boolean(initialData?.currentAuth?.isSuperAdmin)
  const currentUserId = initialData?.currentAuth?.userId
  const currentEmpId = initialData?.currentAuth?.employeeId

  // Tabs: 'my_borrows' (Daftar Peminjaman Saya) vs 'all_borrows' (Daftar Peminjaman)
  const [activeTab, setActiveTab] = React.useState<'my_borrows' | 'all_borrows'>('my_borrows')

  // Date Range filter for export / general filtering
  const [dateRange, setDateRange] = React.useState<{ from: Date; to?: Date } | undefined>(undefined)

  const displayData = React.useMemo(() => {
    if (!dateRange?.from) return data
    const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0)
    const toTime = dateRange.to
      ? new Date(dateRange.to).setHours(23, 59, 59, 999)
      : new Date(dateRange.from).setHours(23, 59, 59, 999)
    return data.filter((item) => {
      const itemDate = new Date(item.submittedAt || item.createdAt).getTime()
      return itemDate >= fromTime && itemDate <= toTime
    })
  }, [data, dateRange])

  // "Daftar Peminjaman Saya": user is borrower, holder, creator, or approver (or all if admin)
  const myBorrowsData = React.useMemo(() => {
    if (isAdmin) return displayData
    return displayData.filter((item) => {
      const isBorrower = currentEmpId && item.borrowerEmployeeId === currentEmpId
      const isHolder = currentEmpId && item.holderEmployeeId === currentEmpId
      const isCreator = Boolean(
        (currentEmpId && item.applicantEmployeeId === currentEmpId) ||
        (currentUserId && item.createdById === currentUserId)
      )
      return isBorrower || isHolder || isCreator
    })
  }, [displayData, isAdmin, currentUserId, currentEmpId])

  // Dialog & Modal states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [selectedBorrow, setSelectedBorrow] = React.useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  // AssetApprovalDialog (Split 2-Panel Review like Asset Transfer)
  const [reviewTarget, setReviewTarget] = React.useState<AssetApprovalDialogTarget | null>(null)
  const [isAssetApprovalOpen, setIsAssetApprovalOpen] = React.useState(false)
  const [isAssetSubmitting, setIsAssetSubmitting] = React.useState(false)

  // Cancel / Delete Confirm Dialog
  const [borrowToCancel, setBorrowToCancel] = React.useState<any | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)

  // Return Request Dialog (Peminjam mengembalikan aset)
  const [borrowToReturn, setBorrowToReturn] = React.useState<any | null>(null)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = React.useState(false)

  // Confirm Return Dialog (Holder mengonfirmasi fisik aset kembali)
  const [borrowToConfirmReturn, setBorrowToConfirmReturn] = React.useState<any | null>(null)
  const [isConfirmReturnDialogOpen, setIsConfirmReturnDialogOpen] = React.useState(false)

  // Refresh data from server
  const refreshData = async () => {
    try {
      setIsLoading(true)
      const res = await getAssetBorrows()
      if (res.success) {
        setData(res.items)
        setKpi(res.kpi)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return '-'
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  const getStatusTone = (status: string) => {
    switch (status) {
      case 'borrowed':
        return { label: 'Sedang Dipinjam', status: 'approved' as const }
      case 'pending_return':
        return { label: 'Menunggu Pengembalian', status: 'pending' as const }
      case 'returned':
        return { label: 'Selesai Dikembalikan', status: 'completed' as const }
      case 'rejected':
        return { label: 'Ditolak', status: 'rejected' as const }
      case 'cancelled':
        return { label: 'Dibatalkan', status: 'draft' as const }
      case 'pending':
      default:
        return { label: 'Menunggu Persetujuan', status: 'pending' as const }
    }
  }

  // Open Review: opens AssetApprovalDialog for pending borrow, or confirm return dialog for pending_return
  const handleOpenReview = (row: any) => {
    if (row.status === 'pending_return') {
      setBorrowToConfirmReturn(row)
      setIsConfirmReturnDialogOpen(true)
      return
    }

    setReviewTarget({
      approvalId: row.currentApprovalId || 0,
      targetId: row.id,
      subType: 'ASSET_BORROW',
      documentNumber: row.borrowNumber,
      title: `Peminjaman Aset: ${row.assetName}`,
      employeeName: row.borrowerName,
      siteName: row.assetNumber || '-',
      stepLabel: 'Persetujuan Pemegang Aset',
      rawAssetItem: row,
    })
    setIsAssetApprovalOpen(true)
  }

  // Open Request Return: opens AssetBorrowReturnDialog for borrower
  const handleOpenRequestReturn = (row: any) => {
    setBorrowToReturn(row)
    setIsReturnDialogOpen(true)
  }

  // Open View: opens AssetBorrowDetailModal
  const handleOpenView = async (item: any) => {
    try {
      const res = await getAssetBorrowDetail(item.id)
      if (res.success && res.item) {
        setSelectedBorrow(res.item)
      } else {
        setSelectedBorrow(item)
      }
    } catch {
      setSelectedBorrow(item)
    }
    setIsDetailOpen(true)
  }

  // Prompt cancel confirmation
  const handlePromptCancel = (row: any) => {
    setBorrowToCancel(row)
    setIsCancelConfirmOpen(true)
  }

  // Confirm cancel & delete
  const handleConfirmCancel = async () => {
    if (!borrowToCancel) return
    setIsCancelling(true)
    try {
      const res = await cancelAssetBorrow(borrowToCancel.id)
      if (res.success) {
        toast.success(res.message || 'Pengajuan peminjaman berhasil dibatalkan dan dihapus.')
        setIsCancelConfirmOpen(false)
        setBorrowToCancel(null)
        refreshData()
      } else {
        toast.error(res.message || 'Gagal membatalkan pengajuan.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem saat membatalkan.')
    } finally {
      setIsCancelling(false)
    }
  }

  // Table Columns
  const columns: HeroColumnDef<any>[] = React.useMemo(() => [
    {
      key: 'borrowNumber',
      header: 'No. Peminjaman',
      sortable: true,
      render: (row: any) => (
        <div>
          <span className="font-bold font-mono text-xs text-primary block">{row.borrowNumber}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'assetName',
      header: 'Nama & Info Aset',
      sortable: true,
      render: (row: any) => (
        <div>
          <span className="font-semibold text-xs text-foreground block">{row.assetName}</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            No: {row.assetNumber || '-'} {row.serialNumber ? `• SN: ${row.serialNumber}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'borrowerName',
      header: 'Peminjam',
      sortable: true,
      render: (row: any) => (
        <div>
          <span className="font-medium text-xs text-foreground block">{row.borrowerName}</span>
          <span className="text-[10px] text-muted-foreground">Peminjam Aset</span>
        </div>
      ),
    },
    {
      key: 'holderName',
      header: 'Holder Asal',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-xs text-blue-700 block">{row.holderName}</span>
          <span className="text-[10px] text-muted-foreground">Pemilik Fisik</span>
        </div>
      ),
    },
    {
      key: 'borrowDate',
      header: 'Waktu Pinjam & Estimasi Kembali',
      render: (row: any) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 text-foreground">
            <span className="text-[11px] font-medium">{formatDateTime(row.borrowDate)}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            s/d {formatDateTime(row.expectedReturnDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'equipmentNotes',
      header: 'Kelengkapan Aset',
      render: (row: any) => (
        <div className="max-w-[180px]">
          <span className="text-[11px] text-muted-foreground truncate block font-mono" title={row.equipmentNotes || '-'}>
            {row.equipmentNotes || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      exportValue: (row: any) => getStatusTone(row.status).label,
      render: (row: any) => {
        const tone = getStatusTone(row.status)
        return (
          <div className="flex flex-col items-start gap-1">
            <HeroStatusBadge status={tone.status} label={tone.label} />
            {row.status === 'borrowed' && row.isOverdue && (
              <span className="inline-flex items-center text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                ⚠️ Terlambat {row.overdueDays} Hari
              </span>
            )}
          </div>
        )
      },
    },
  ], [])

  // Filters definition
  const filters: HeroTableFilter[] = React.useMemo(() => [
    {
      key: 'status',
      label: 'Status Peminjaman',
      options: [
        { label: 'Semua Status', value: 'all' },
        { label: 'Menunggu Persetujuan', value: 'pending' },
        { label: 'Sedang Dipinjam', value: 'borrowed' },
        { label: 'Menunggu Pengembalian', value: 'pending_return' },
        { label: 'Selesai Dikembalikan', value: 'returned' },
        { label: 'Ditolak', value: 'rejected' },
        { label: 'Dibatalkan', value: 'cancelled' },
      ],
    },
  ], [])

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Asset Borrow
            </h1>
            <Badge variant="secondary" className="text-xs">
              Central Service
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Formulir peminjaman aset operasional, persetujuan langsung holder fisik, dan pemantauan pengembalian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-border/80 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
          >
            <Plus className="size-4" />
            Buat Peminjaman Aset
          </Button>
        </div>
      </div>

      {/* KPI SCORECARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <HeroKpiCard
          title="Total Pengajuan"
          value={kpi.total}
          tone="blue"
          icon={<Box className="size-5" />}
          description="Seluruh riwayat peminjaman"
        />
        <HeroKpiCard
          title="Menunggu Persetujuan"
          value={kpi.pending}
          tone="amber"
          icon={<Clock className="size-5" />}
          description="Perlu persetujuan holder"
        />
        <HeroKpiCard
          title="Sedang Dipinjam"
          value={kpi.borrowed}
          tone="emerald"
          icon={<CheckCircle2 className="size-5" />}
          description="Aset aktif digunakan"
        />
        <HeroKpiCard
          title="Menunggu Pengembalian"
          value={kpi.pendingReturn || 0}
          tone="purple"
          icon={<RotateCcw className="size-5" />}
          description="Fisik perlu diverifikasi holder"
        />
        <HeroKpiCard
          title="Selesai Dikembalikan"
          value={kpi.returned}
          tone="cyan"
          icon={<CheckCircle2 className="size-5" />}
          description="Aset kembali ke holder"
        />
      </div>

      {/* TABS NAVIGATION (ABOVE TABLE - REFERENSI ASSET TRANSFER) */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <TabsList className="h-10 w-full justify-start rounded-lg border border-border/80 bg-muted/60 p-1 text-muted-foreground">
          <TabsTrigger
            value="my_borrows"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <UserCheck className="size-3.5 text-emerald-600" />
            <span>Daftar Peminjaman Saya</span>
            <Badge className="ml-1 rounded-full border-0 bg-emerald-100 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {myBorrowsData.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="all_borrows"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <Layers className="size-3.5 text-blue-600" />
            <span>Daftar Peminjaman</span>
            <Badge className="ml-1 rounded-full border-0 bg-blue-100 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {displayData.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DAFTAR PEMINJAMAN SAYA (DENGAN AKSI TINJAU, VIEW, & BATALKAN) */}
        <TabsContent value="my_borrows" className="space-y-4">
          <TooltipProvider>
            <HeroDataTable
              data={myBorrowsData}
              columns={columns}
              idField="id"
              title="Daftar Peminjaman Saya &amp; Tindakan"
              description={
                isAdmin
                  ? `Seluruh pengajuan peminjaman aset dengan kontrol operasional approval, view, & pembatalan (${myBorrowsData.length} data)`
                  : `Daftar pengajuan peminjaman aset terkait Anda beserta kontrol operasional (${myBorrowsData.length} data)`
              }
              searchPlaceholder="Cari no peminjaman, nama aset, nomor aset, atau nama holder..."
              searchKeys={[
                'borrowNumber',
                'assetName',
                'assetNumber',
                'borrowerName',
                'holderName',
                'purpose',
                'equipmentNotes',
              ]}
              filters={filters}
              loading={isLoading}
              enableExport={isAdmin}
              headerActions={
                isAdmin ? (
                  <div className="flex items-center gap-2">
                    <HeroDateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                      placeholder="Rentang Tanggal Ekspor"
                      align="end"
                      className="h-9 min-w-[220px]"
                    />
                  </div>
                ) : undefined
              }
              exportFileName={`Laporan-Peminjaman-Aset-Saya${dateRange?.from ? `-${new Date(dateRange.from).toISOString().slice(0, 10)}` : ''}`}
              pdfTitle="Laporan Peminjaman Aset Saya - PT Chitra Paratama"
              renderRowActions={(row) => {
                const isHolder = Boolean(currentEmpId && row.holderEmployeeId === currentEmpId)
                const isBorrower = Boolean(currentEmpId && row.borrowerEmployeeId === currentEmpId)
                const isCreator = Boolean(
                  (currentEmpId && row.applicantEmployeeId === currentEmpId) ||
                  (currentUserId && row.createdById === currentUserId)
                )

                const canReview = Boolean(
                  (row.status === 'pending' || row.status === 'pending_return') &&
                  (isHolder || isAdmin)
                )
                const canRequestReturn = Boolean(
                  row.status === 'borrowed' &&
                  (isBorrower || isAdmin)
                )
                const canView = Boolean(isBorrower || isCreator || isAdmin || isHolder)
                const canCancel = Boolean(
                  (row.status === 'pending' || row.status === 'needs_revision') &&
                  (isCreator || isBorrower || isAdmin)
                )

                return (
                  <div className="flex items-center gap-1.5">
                    {/* 1. Tinjau (Holder & Admin) */}
                    {canReview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReview(row)}
                        className="h-8 gap-1 border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                      >
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        Tinjau
                      </Button>
                    )}

                    {/* 2. Kembalikan (Peminjam & Admin saat status borrowed) */}
                    {canRequestReturn && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRequestReturn(row)}
                        className="h-8 gap-1 border-blue-300 bg-blue-50 px-2.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 shadow-2xs"
                      >
                        <RotateCcw className="size-3.5 text-blue-600" />
                        Kembalikan
                      </Button>
                    )}

                    {/* 3. View (Peminjam / Pengaju, Holder, & Admin - Murni Detail) */}
                    {canView && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenView(row)}
                        className="h-8 gap-1 border-border/80 px-2.5 text-xs font-semibold text-foreground hover:bg-muted shadow-2xs"
                      >
                        <Eye className="size-3.5 text-primary" />
                        View
                      </Button>
                    )}

                    {/* 3. Batalkan & Hapus (Pengaju & Admin) */}
                    {canCancel && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromptCancel(row)}
                            className="h-8 w-8 p-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-2xs"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Batalkan &amp; Hapus Pengajuan</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )
              }}
            />
          </TooltipProvider>
        </TabsContent>

        {/* TAB 2: DAFTAR PEMINJAMAN (SEMUA USER, READ-ONLY TANPA TOMBOL AKSI TINJAU & VIEW) */}
        <TabsContent value="all_borrows" className="space-y-4">
          <TooltipProvider>
            <HeroDataTable
              data={displayData}
              columns={columns}
              idField="id"
              title="Daftar Semua Peminjaman Aset"
              description="Direktori riwayat peminjaman aset seluruh site dan departemen (Semua Pengguna)"
              searchPlaceholder="Cari no peminjaman, nama aset, nomor aset, atau nama holder..."
              searchKeys={[
                'borrowNumber',
                'assetName',
                'assetNumber',
                'borrowerName',
                'holderName',
                'purpose',
                'equipmentNotes',
              ]}
              filters={filters}
              loading={isLoading}
              enableExport={true}
              headerActions={
                <div className="flex items-center gap-2">
                  <HeroDateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Rentang Tanggal Riwayat"
                    align="end"
                    className="h-9 min-w-[220px]"
                  />
                </div>
              }
              exportFileName={`Laporan-Peminjaman-Aset${dateRange?.from ? `-${new Date(dateRange.from).toISOString().slice(0, 10)}` : ''}`}
              pdfTitle="Laporan Resmi Peminjaman Aset - PT Chitra Paratama"
              // Read-only: no action buttons per instruction
              renderRowActions={() => (
                <span className="text-muted-foreground text-xs font-mono">-</span>
              )}
            />
          </TooltipProvider>
        </TabsContent>
      </Tabs>

      {/* FORM MODAL: BUAT PEMINJAMAN ASET (LEBAR 4XL) */}
      <AssetBorrowFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={refreshData}
        masterAssets={masterAssets}
        employees={employees}
      />

      {/* DETAIL MODAL (VIEW / PRATINJAU DOKUMEN / PENGEMBALIAN / PERPANJANGAN) */}
      {selectedBorrow && (
        <AssetBorrowDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          borrow={selectedBorrow}
          onSuccess={refreshData}
        />
      )}

      {/* ASSET APPROVAL DIALOG (SPLIT 2-PANEL REVIEW SEPERTI ASSET TRANSFER) */}
      <AssetApprovalDialog
        open={isAssetApprovalOpen}
        onOpenChange={setIsAssetApprovalOpen}
        item={reviewTarget}
        allowRevert={false}
        isSubmitting={isAssetSubmitting}
        onApprove={async ({ decisionNote, signatureUrl }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await approveAssetBorrow(reviewTarget.targetId, decisionNote, signatureUrl)
            if (res.success) {
              toast.success(res.message || 'Peminjaman aset berhasil disetujui.')
              setIsAssetApprovalOpen(false)
              refreshData()
            } else {
              toast.error(res.message || 'Gagal menyetujui peminjaman aset.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
        onReject={async ({ rejectionReason }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await rejectAssetBorrow(reviewTarget.targetId, rejectionReason)
            if (res.success) {
              toast.success(res.message || 'Peminjaman aset berhasil ditolak.')
              setIsAssetApprovalOpen(false)
              refreshData()
            } else {
              toast.error(res.message || 'Gagal menolak peminjaman aset.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
      />

      {/* CONFIRM CANCEL / DELETE DIALOG */}
      <HeroConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Batalkan &amp; Hapus Pengajuan Peminjaman"
        description={`Apakah Anda yakin ingin membatalkan pengajuan ${borrowToCancel?.borrowNumber || ''}? Data pengajuan akan otomatis dihapus permanen dari sistem.`}
        confirmLabel={isCancelling ? 'Menghapus...' : 'Ya, Batalkan & Hapus'}
        cancelLabel="Kembali"
        tone="destructive"
        confirmDisabled={isCancelling}
        onConfirm={handleConfirmCancel}
      />

      {/* DIALOG PENGAJUAN PENGEMBALIAN ASET (LANGKAH 1 PEMINJAM) */}
      <AssetBorrowReturnDialog
        open={isReturnDialogOpen}
        onOpenChange={setIsReturnDialogOpen}
        borrow={borrowToReturn}
        onSuccess={refreshData}
      />

      {/* DIALOG KONFIRMASI PENERIMAAN KEMBALI FISIK (LANGKAH 2 HOLDER) */}
      <AssetBorrowConfirmReturnDialog
        open={isConfirmReturnDialogOpen}
        onOpenChange={setIsConfirmReturnDialogOpen}
        borrow={borrowToConfirmReturn}
        onSuccess={refreshData}
      />
    </div>
  )
}
