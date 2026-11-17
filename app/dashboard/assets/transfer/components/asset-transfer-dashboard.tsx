'use client'

import * as React from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  ArrowRight,
  Ban,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { toast } from 'sonner'
import { AssetTransferFormDialog } from './asset-transfer-form-dialog'
import { AssetApprovalDialog, type AssetApprovalDialogTarget } from '@/components/asset-approval-dialog'
import { AssetTransferDocumentView } from '@/components/assets/asset-transfer-document-view'
import { getAssetManagementItemDetailAction } from '@/app/dashboard/assets/approval-actions'
import {
  getAssetTransfers,
  approveAssetTransfer,
  rejectAssetTransfer,
  cancelAssetTransfer,
} from '../actions'

interface AssetTransferDashboardProps {
  initialData: {
    items: any[]
    total: number
    kpi: {
      total: number
      pending: number
      approved: number
      rejected: number
    }
  }
  masterAssets: any[]
  employees: any[]
  sites: any[]
}

export function AssetTransferDashboard({
  initialData,
  masterAssets,
  employees,
  sites,
}: AssetTransferDashboardProps) {
  const [data, setData] = React.useState(initialData.items)
  const [kpi, setKpi] = React.useState(initialData.kpi)
  const [isLoading, setIsLoading] = React.useState(false)

  const isAdmin = Boolean((initialData as any)?.currentAuth?.isSuperAdmin)
  const currentUserId = (initialData as any)?.currentAuth?.userId
  const currentEmpId = (initialData as any)?.currentAuth?.employeeId

  // Tab state: 'all_transfers' (Daftar Transfer) vs 'my_transfers' (Daftar Transfer Saya)
  const [activeTab, setActiveTab] = React.useState<'all_transfers' | 'my_transfers'>('all_transfers')

  // Check if current user is an applicant or involved party in any transfer
  const isApplicantUser = React.useMemo(() => {
    return data.some((item) => {
      const isCreator = currentUserId && item.createdById === currentUserId
      const isApplicant = currentEmpId && item.applicantEmployeeId === currentEmpId
      const isCurrentHolder = currentEmpId && item.currentHolderEmployeeId === currentEmpId
      const isNewHolder = currentEmpId && item.newHolderEmployeeId === currentEmpId
      return isCreator || isApplicant || isCurrentHolder || isNewHolder
    })
  }, [data, currentUserId, currentEmpId])

  // "Daftar Transfer Saya" can only be accessed by Pengaju & Admin
  const canAccessMyTransfers = isAdmin || isApplicantUser

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

  // Data for "Daftar Transfer Saya": Admin sees all action items, applicant sees own/involved items
  const myTransfersData = React.useMemo(() => {
    if (isAdmin) return displayData
    return displayData.filter((item) => {
      const isCreator = currentUserId && item.createdById === currentUserId
      const isApplicant = currentEmpId && item.applicantEmployeeId === currentEmpId
      const isCurrentHolder = currentEmpId && item.currentHolderEmployeeId === currentEmpId
      const isNewHolder = currentEmpId && item.newHolderEmployeeId === currentEmpId
      const isApprover = currentEmpId && item.currentApproverEmployeeId === currentEmpId
      return isCreator || isApplicant || isCurrentHolder || isNewHolder || isApprover
    })
  }, [displayData, isAdmin, currentUserId, currentEmpId])

  // Dialog & Modal states
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [reviewTarget, setReviewTarget] = React.useState<AssetApprovalDialogTarget | null>(null)
  const [isAssetApprovalOpen, setIsAssetApprovalOpen] = React.useState(false)
  const [isAssetSubmitting, setIsAssetSubmitting] = React.useState(false)

  // Cancel Confirm Dialog
  const [transferToCancel, setTransferToCancel] = React.useState<any | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)

  // PDF Preview & Download Dialog (Khusus Full Approved)
  const [pdfPreviewTarget, setPdfPreviewTarget] = React.useState<any | null>(null)
  const [pdfPreviewDoc, setPdfPreviewDoc] = React.useState<any | null>(null)
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = React.useState(false)
  const [isDocPreviewLoading, setIsDocPreviewLoading] = React.useState(false)

  const handleOpenPdfPreview = async (row: any) => {
    setPdfPreviewTarget(row)
    setIsPdfPreviewOpen(true)
    setIsDocPreviewLoading(true)
    try {
      const res = await getAssetManagementItemDetailAction({
        subType: 'ASSET_TRANSFER',
        targetId: row.id,
        approvalId: row.currentApprovalId || 0,
      })
      if (res.success && res.doc) {
        setPdfPreviewDoc(res.doc)
      }
    } catch (err) {
      console.error('[handleOpenPdfPreview] error:', err)
    } finally {
      setIsDocPreviewLoading(false)
    }
  }

  // Refresh data from server
  const refreshData = async () => {
    try {
      setIsLoading(true)
      const res = await getAssetTransfers()
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

  // Open review approval modal
  const handleOpenReview = (row: any) => {
    setReviewTarget({
      approvalId: row.currentApprovalId || 0,
      targetId: row.id,
      subType: 'ASSET_TRANSFER',
      documentNumber: row.transferNumber,
      title: `Transfer Aset: ${row.assetName}`,
      employeeName: row.currentHolderName,
      siteName: `${row.currentLocationName || '-'} -> ${row.targetLocationName || '-'}`,
      stepLabel: row.currentApproverTitle || `Step ${row.currentStepOrder}`,
      rawAssetItem: row,
    })
    setIsAssetApprovalOpen(true)
  }

  // Confirm cancel handler
  const handleConfirmCancel = async () => {
    if (!transferToCancel) return
    setIsCancelling(true)
    try {
      const res = await cancelAssetTransfer(transferToCancel.id)
      if (res.success) {
        toast.success(res.message || 'Pengajuan transfer aset berhasil dibatalkan.')
        setIsCancelConfirmOpen(false)
        setTransferToCancel(null)
        refreshData()
      } else {
        toast.error(res.message || 'Gagal membatalkan transfer aset.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem saat membatalkan.')
    } finally {
      setIsCancelling(false)
    }
  }

  // Columns definition for HeroDataTable
  const columns: HeroColumnDef<any>[] = React.useMemo(() => [
    {
      key: 'transferNumber',
      header: 'No. Dokumen',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs font-semibold text-primary">
          {row.transferNumber}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Tanggal',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString('id-ID') : '-'}
        </span>
      ),
    },
    {
      key: 'assetName',
      header: 'Nama Aset',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold text-foreground">
          {row.assetName}
        </span>
      ),
    },
    {
      key: 'assetNumber',
      header: 'Nomor Aset',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-medium text-primary">
          {row.assetNumber || '-'}
        </span>
      ),
    },
    {
      key: 'holders',
      header: 'Holder Asal ➔ Baru',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {row.currentHolderName}
          </span>
          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            {row.newHolderName}
          </span>
        </div>
      ),
    },
    {
      key: 'locations',
      header: 'Lokasi Asal ➔ Tujuan',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{row.currentLocationName}</span>
          <ArrowRight className="size-3 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground">{row.targetLocationName}</span>
        </div>
      ),
    },
    {
      key: 'equipmentChecklist',
      header: 'Kelengkapan',
      render: (row) => {
        const count = Array.isArray(row.equipmentChecklist) ? row.equipmentChecklist.length : 0
        return (
          <Badge variant="outline" className="text-[11px] px-2 py-0.5">
            {count > 0 ? `${count} Item` : 'Standar'}
          </Badge>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <HeroStatusBadge status={row.status} />,
    },
  ], [])

  // Filter definitions
  const filters: HeroTableFilter[] = React.useMemo(() => [
    {
      key: 'status',
      label: 'Status Persetujuan',
      options: [
        { label: 'Semua Status', value: 'all' },
        { label: 'Menunggu (Pending)', value: 'pending' },
        { label: 'Dalam Review', value: 'in_review' },
        { label: 'Disetujui (Approved)', value: 'approved' },
        { label: 'Ditolak (Rejected)', value: 'rejected' },
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
              Asset Transfer
            </h1>
            <Badge variant="secondary" className="text-xs">
              Central Service
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Pengajuan mutasi, serah terima pemegang aset, dan relokasi site secara terpadu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            className="h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="size-4" />
            Buat Transfer Aset
          </Button>
        </div>
      </div>

      {/* KPI SCORECARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Pengajuan"
          value={kpi.total}
          tone="blue"
          icon={<ArrowRightLeft className="size-5" />}
          description="Seluruh riwayat transfer aset"
        />
        <HeroKpiCard
          title="Menunggu Persetujuan"
          value={kpi.pending}
          tone="amber"
          icon={<Clock className="size-5" />}
          description="Perlu verifikasi atau konfirmasi"
        />
        <HeroKpiCard
          title="Transfer Disetujui"
          value={kpi.approved}
          tone="emerald"
          icon={<CheckCircle2 className="size-5" />}
          description="Aset resmi berpindah tangan"
        />
        <HeroKpiCard
          title="Ditolak / Dibatalkan"
          value={kpi.rejected}
          tone="rose"
          icon={<XCircle className="size-5" />}
          description="Permohonan ditolak"
        />
      </div>

      {/* TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <TabsList className="h-10 w-full justify-start rounded-lg border border-border/80 bg-muted/60 p-1 text-muted-foreground">
          <TabsTrigger
            value="all_transfers"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <Layers className="size-3.5 text-blue-600" />
            <span>Daftar Transfer</span>
            <Badge className="ml-1 rounded-full border-0 bg-blue-100 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {displayData.length}
            </Badge>
          </TabsTrigger>

          {canAccessMyTransfers && (
            <TabsTrigger
              value="my_transfers"
              className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <UserCheck className="size-3.5 text-emerald-600" />
              <span>Daftar Transfer Saya</span>
              <Badge className="ml-1 rounded-full border-0 bg-emerald-100 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {myTransfersData.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1: DAFTAR TRANSFER (SEMUA USER, READ-ONLY TANPA TOMBOL AKSI) */}
        <TabsContent value="all_transfers" className="space-y-4">
          <TooltipProvider>
            <HeroDataTable
              data={displayData}
              columns={columns}
              idField="id"
              title="Daftar Semua Transfer Aset"
              description={
                isAdmin && dateRange?.from
                  ? `Menampilkan data dari rentang tanggal terpilih (${displayData.length} data)`
                  : "Direktori publik riwayat mutasi dan perpindahan aset seluruh site (Semua Pengguna)"
              }
              searchPlaceholder="Cari no dokumen, nama aset, nomor aset, atau nama holder..."
              searchKeys={[
                'transferNumber',
                'assetName',
                'assetNumber',
                'currentHolderName',
                'newHolderName',
                'currentLocationName',
                'targetLocationName',
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
              exportFileName={`Laporan-Transfer-Aset${dateRange?.from ? `-${new Date(dateRange.from).toISOString().slice(0, 10)}` : ''}`}
              pdfTitle="Laporan Resmi Transfer Aset - PT Chitra Paratama"
              // Read-only: no action buttons for public view
              renderRowActions={() => (
                <span className="text-muted-foreground text-xs font-mono">-</span>
              )}
            />
          </TooltipProvider>
        </TabsContent>

        {/* TAB 2: DAFTAR TRANSFER SAYA (KHUSUS PENGAJU & ADMIN DENGAN TOMBOL AKSI) */}
        {canAccessMyTransfers && (
          <TabsContent value="my_transfers" className="space-y-4">
            <TooltipProvider>
              <HeroDataTable
                data={myTransfersData}
                columns={columns}
                idField="id"
                title="Daftar Transfer Saya &amp; Tindakan"
                description={
                  isAdmin
                    ? `Seluruh pengajuan mutasi aset dengan kontrol operasional approval &amp; pembatalan (${myTransfersData.length} data)`
                    : `Daftar pengajuan mutasi aset terkait Anda beserta tombol tindakan operasional (${myTransfersData.length} data)`
                }
                searchPlaceholder="Cari no dokumen, nama aset, nomor aset, atau nama holder..."
                searchKeys={[
                  'transferNumber',
                  'assetName',
                  'assetNumber',
                  'currentHolderName',
                  'newHolderName',
                  'currentLocationName',
                  'targetLocationName',
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
                exportFileName={`Laporan-Transfer-Aset-Saya${dateRange?.from ? `-${new Date(dateRange.from).toISOString().slice(0, 10)}` : ''}`}
                pdfTitle="Laporan Resmi Transfer Aset Saya - PT Chitra Paratama"
                renderRowActions={(row) => {
                  const isApproved = row.status === 'approved'
                  const hasActions = row.canApprove || row.canCancel || isApproved
                  if (!hasActions) {
                    return <span className="text-muted-foreground text-xs font-mono">-</span>
                  }

                  return (
                    <div className="flex items-center gap-1.5">
                      {/* 1. Tinjau (Hanya untuk Approver Aktif & Admin) */}
                      {row.canApprove && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(row)}
                          className="h-8 border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-2xs gap-1"
                        >
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          Tinjau
                        </Button>
                      )}

                      {/* 2. Pratinjau & Unduh Dokumen Berita Acara PDF (Khusus Full Approved) */}
                      {isApproved && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPdfPreview(row)}
                              className="h-8 border-blue-200 bg-blue-50/70 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-800 shadow-2xs gap-1.5 transition-colors"
                            >
                              <FileText className="size-3.5 text-blue-600" />
                              <span>PDF</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Pratinjau &amp; Unduh Dokumen Berita Acara PDF</TooltipContent>
                        </Tooltip>
                      )}

                      {/* 3. Batalkan (Hanya untuk Pengaju & Admin saat status masih pending/in_review) */}
                      {row.canCancel && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-rose-200 bg-rose-50/60 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs gap-1"
                              onClick={() => {
                                setTransferToCancel(row)
                                setIsCancelConfirmOpen(true)
                              }}
                            >
                              <Ban className="size-3.5 text-rose-600" />
                              Batalkan
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Batalkan &amp; Hapus Pengajuan</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )
                }}
              />
            </TooltipProvider>
          </TabsContent>
        )}
      </Tabs>

      {/* FORM CREATE DIALOG */}
      <AssetTransferFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={refreshData}
        masterAssets={masterAssets}
        employees={employees}
        sites={sites}
      />

      {/* ASSET APPROVAL DIALOG (2-COLUMN WORK ORDER STYLE MODAL) */}
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
            const res = await approveAssetTransfer(reviewTarget.targetId, decisionNote, undefined, signatureUrl)
            if (res.success) {
              toast.success(res.message || 'Persetujuan transfer aset berhasil dicatat.')
              setIsAssetApprovalOpen(false)
              refreshData()
            } else {
              toast.error(res.message || 'Gagal menyetujui transfer aset.')
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
            const res = await rejectAssetTransfer(reviewTarget.targetId, rejectionReason)
            if (res.success) {
              toast.success(res.message || 'Penolakan transfer aset berhasil dicatat.')
              setIsAssetApprovalOpen(false)
              refreshData()
            } else {
              toast.error(res.message || 'Gagal menolak transfer aset.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
      />

      {/* CONFIRM CANCEL DIALOG */}
      <HeroConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Batalkan Pengajuan Transfer Aset"
        description={`Apakah Anda yakin ingin membatalkan pengajuan transfer aset ${transferToCancel?.transferNumber || ''}? Seluruh alur persetujuan yang sedang berjalan akan dihentikan dan dihapus.`}
        confirmText="Ya, Batalkan Pengajuan"
        cancelText="Kembali"
        variant="destructive"
        loading={isCancelling}
        onConfirm={handleConfirmCancel}
      />

      {/* PDF PREVIEW & DOWNLOAD DIALOG (KHUSUS FULL APPROVED) */}
      <Dialog open={isPdfPreviewOpen} onOpenChange={setIsPdfPreviewOpen}>
        <DialogContent className="max-w-5xl w-[94vw] h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-900 border-border shadow-2xl">
          {pdfPreviewTarget && (
            <>
              <div className="bg-background px-5 py-3 flex items-center justify-between border-b border-border/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-base font-bold text-foreground">
                        Berita Acara Mutasi Aset
                      </DialogTitle>
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[11px] font-semibold">
                        Disetujui Penuh
                      </Badge>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      No: <span className="font-mono font-medium text-foreground">{pdfPreviewTarget.transferNumber}</span> • {pdfPreviewTarget.assetName} {pdfPreviewTarget.assetNumber ? `(${pdfPreviewTarget.assetNumber})` : ''}
                    </DialogDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 text-xs font-medium border-border/80 hover:bg-muted"
                  >
                    <a
                      href={pdfPreviewTarget.pdfUrl ? resolveUploadUrl(pdfPreviewTarget.pdfUrl) : `/api/assets/transfer/${pdfPreviewTarget.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Buka Tab Baru</span>
                    </a>
                  </Button>

                  <Button
                    size="sm"
                    asChild
                    className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs"
                  >
                    <a
                      href={`/api/assets/transfer/${pdfPreviewTarget.id}/pdf`}
                      download={`${pdfPreviewTarget.transferNumber}.pdf`}
                    >
                      <Download className="size-3.5" />
                      <span>Unduh PDF</span>
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex-1 w-full overflow-y-auto p-4 flex justify-center bg-slate-200/40 dark:bg-slate-950">
                {isDocPreviewLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold">Menyiapkan pratinjau dokumen A4 resmi...</span>
                  </div>
                ) : pdfPreviewDoc ? (
                  <div className="w-full flex justify-center">
                    <AssetTransferDocumentView doc={pdfPreviewDoc} />
                  </div>
                ) : (
                  <iframe
                    src={`/api/assets/transfer/${pdfPreviewTarget.id}/pdf`}
                    className="w-full h-full border-0 rounded-lg bg-white"
                    title={`Pratinjau PDF ${pdfPreviewTarget.transferNumber}`}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
