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
  RotateCcw,
  UserCheck,
  Layers,
  FileText,
  AlertTriangle,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { AssetDisposalFormDialog } from './asset-disposal-form-dialog'
import { AssetDisposalDetailModal } from './asset-disposal-detail-modal'
import { AssetApprovalDialog, type AssetApprovalDialogTarget } from '@/components/asset-approval-dialog'
import {
  getAssetDisposals,
  getAssetDisposalDetail,
  approveAssetDisposal,
  rejectAssetDisposal,
  revertAssetDisposalAction,
  cancelAssetDisposal,
} from '../actions'

export interface AssetDisposalDashboardProps {
  initialItems?: any[]
  totalItems?: number
  kpiStats?: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  initialData?: {
    items: any[]
    total: number
    kpi: {
      total: number
      pending: number
      approved: number
      rejected: number
    }
    currentAuth?: {
      userId?: string
      employeeId?: number | null
      isSuperAdmin?: boolean
    }
  }
  sites: any[]
  departments: any[]
  sections: any[]
  assets: any[]
  currentEmployee: any | null
  defaultApprovers: any[]
  allEmployees?: any[]
}

export function AssetDisposalDashboard({
  initialItems,
  totalItems,
  kpiStats,
  initialData,
  sites,
  departments,
  sections,
  assets,
  currentEmployee,
  defaultApprovers,
  allEmployees = [],
}: AssetDisposalDashboardProps) {
  const router = useRouter()

  const items = initialData?.items || initialItems || []
  const initialKpi = initialData?.kpi || kpiStats || { total: 0, pending: 0, approved: 0, rejected: 0 }

  const [data, setData] = React.useState(items)
  const [kpi, setKpi] = React.useState(initialKpi)
  const [isLoading, setIsLoading] = React.useState(false)

  // Auth Context
  const isAdmin = Boolean(initialData?.currentAuth?.isSuperAdmin)
  const currentUserId = initialData?.currentAuth?.userId
  const currentEmpId = initialData?.currentAuth?.employeeId || currentEmployee?.id

  // Two Tabs: 'my_disposals' (Disposal Saya) vs 'all_disposals' (Daftar Disposal)
  const [activeTab, setActiveTab] = React.useState<'my_disposals' | 'all_disposals'>('my_disposals')

  // Date Range filter for export / general filtering
  const [dateRange, setDateRange] = React.useState<{ from: Date; to?: Date } | undefined>(undefined)

  const displayData = React.useMemo(() => {
    if (!dateRange?.from) return data
    const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0)
    const toTime = dateRange.to
      ? new Date(dateRange.to).setHours(23, 59, 59, 999)
      : new Date(dateRange.from).setHours(23, 59, 59, 999)
    return data.filter((item) => {
      const itemDate = new Date(item.disposalDate || item.submittedAt || item.createdAt).getTime()
      return itemDate >= fromTime && itemDate <= toTime
    })
  }, [data, dateRange])

  // "Disposal Saya": history disposal si pengaju / pemilik akun (atau approver yang sedang bertugas)
  const myDisposalsData = React.useMemo(() => {
    if (isAdmin) return displayData
    return displayData.filter((item) => {
      const isCreator = Boolean(
        (currentEmpId && item.applicantEmployeeId === currentEmpId) ||
        (currentUserId && item.createdById === currentUserId)
      )
      const isCurrentApprover = Boolean(
        currentEmpId && item.currentApproverEmployeeId === currentEmpId
      )
      return isCreator || isCurrentApprover
    })
  }, [displayData, isAdmin, currentUserId, currentEmpId])

  // Dialog & Modal states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingDisposal, setEditingDisposal] = React.useState<any | null>(null)
  const [selectedDisposal, setSelectedDisposal] = React.useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  // AssetApprovalDialog (Split 2-Panel Review seperti Asset Borrow)
  const [reviewTarget, setReviewTarget] = React.useState<AssetApprovalDialogTarget | null>(null)
  const [isAssetApprovalOpen, setIsAssetApprovalOpen] = React.useState(false)
  const [isAssetSubmitting, setIsAssetSubmitting] = React.useState(false)

  // Cancel / Delete Confirm Dialog (Auto-hapus)
  const [disposalToCancel, setDisposalToCancel] = React.useState<any | null>(null)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const res = await getAssetDisposals()
      if (res.success) {
        setData(res.items || [])
        setKpi(res.kpi || { total: 0, pending: 0, approved: 0, rejected: 0 })
      }
    } catch (err: any) {
      console.error('[AssetDisposalDashboard] Refresh error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Open Approval Dialog (Tinjau)
  const handleOpenReview = (row: any) => {
    setReviewTarget({
      id: row.id,
      approvalId: row.currentStepOrder || 1,
      targetId: row.id,
      subType: 'ASSET_DISPOSAL',
      documentNumber: row.disposalNumber,
      title: `Disposal: ${row.assetName}`,
      employeeName: row.applicantName,
      siteName: row.siteName,
    })
    setIsAssetApprovalOpen(true)
  }

  // Open View: opens AssetDisposalDetailModal
  const handleOpenView = async (item: any) => {
    try {
      const res = await getAssetDisposalDetail(item.id)
      if (res.success && res.data) {
        setSelectedDisposal(res.data)
      } else {
        setSelectedDisposal(item)
      }
    } catch {
      setSelectedDisposal(item)
    }
    setIsDetailOpen(true)
  }

  // Open Edit / Revision
  const handleOpenRevision = (item: any) => {
    setEditingDisposal(item)
    setIsCreateOpen(true)
  }

  // Prompt cancel confirmation
  const handlePromptCancel = (row: any) => {
    setDisposalToCancel(row)
    setIsCancelConfirmOpen(true)
  }

  // Confirm cancel & auto-delete
  const handleConfirmCancel = async () => {
    if (!disposalToCancel) return
    setIsCancelling(true)
    try {
      const res = await cancelAssetDisposal(disposalToCancel.id)
      if (res.success) {
        toast.success(res.message || 'Pengajuan disposal berhasil dibatalkan dan dihapus.')
        setIsCancelConfirmOpen(false)
        setDisposalToCancel(null)
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
      timeZone: 'Asia/Makassar',
    }).format(d)
  }

  const formatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return '-'
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(d)
  }

  const getStatusTone = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return { label: 'Disetujui Penuh', status: 'approved' as const }
      case 'rejected':
        return { label: 'Ditolak', status: 'rejected' as const }
      case 'cancelled':
        return { label: 'Dibatalkan', status: 'draft' as const }
      case 'needs_revision':
        return { label: 'Perlu Revisi', status: 'pending' as const }
      case 'pending':
      default:
        return { label: 'Menunggu Persetujuan', status: 'pending' as const }
    }
  }

  // Table Columns
  const columns: HeroColumnDef<any>[] = React.useMemo(() => [
    {
      key: 'disposalNumber',
      header: 'No. Disposal & Tanggal',
      sortable: true,
      render: (row: any) => (
        <div>
          <span className="font-bold font-mono text-xs text-primary block">{row.disposalNumber}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDate(row.disposalDate || row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'assetName',
      header: 'Rincian Aset yang Dihapus',
      sortable: true,
      render: (row: any) => {
        const parsedItems = row.items && Array.isArray(row.items) ? row.items : []
        const itemCount = parsedItems.length
        return (
          <div className="max-w-[260px]">
            <span className="font-semibold text-xs text-foreground block truncate" title={row.assetName}>
              {row.assetName}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
              {row.assetNumber && <span className="font-mono">No: {row.assetNumber}</span>}
              {row.purchaseYear && <span>• Thn: {row.purchaseYear}</span>}
              {itemCount > 1 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-100 text-slate-700 border-slate-300">
                  {itemCount} Unit
                </Badge>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'unitKerja',
      header: 'Unit Kerja & Site',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 block">{row.departmentName}</span>
          <span className="text-[10px] text-muted-foreground">
            {row.siteName} {row.sectionName ? `• ${row.sectionName}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'applicantName',
      header: 'Pemohon',
      sortable: true,
      render: (row: any) => (
        <div>
          <span className="font-medium text-xs text-foreground block">{row.applicantName}</span>
          <span className="text-[10px] text-muted-foreground">{row.applicantJobTitle || 'Pemohon'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status & Approver',
      sortable: true,
      exportValue: (row: any) => getStatusTone(row.status).label,
      render: (row: any) => {
        const tone = getStatusTone(row.status)
        return (
          <div className="flex flex-col items-start gap-1">
            <HeroStatusBadge status={tone.status} label={tone.label} />
            {row.status === 'pending' && row.currentApproverName && (
              <span className="text-[10px] text-slate-500 truncate max-w-[160px]" title={row.currentApproverName}>
                Tahap {row.currentStepOrder}: {row.currentApproverName}
              </span>
            )}
            {row.status === 'needs_revision' && (
              <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                ⚠️ Menunggu Revisi Pengaju
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
      label: 'Status Disposal',
      options: [
        { label: 'Semua Status', value: 'all' },
        { label: 'Menunggu Persetujuan', value: 'pending' },
        { label: 'Perlu Revisi', value: 'needs_revision' },
        { label: 'Disetujui Penuh', value: 'approved' },
        { label: 'Ditolak', value: 'rejected' },
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
              Asset Disposal
            </h1>
            <Badge variant="secondary" className="text-xs">
              Asset Management
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Penghapusan aktiva dan aset inventaris dengan verifikasi Finance &amp; Accounting serta otorisasi bertingkat hingga Direksi.
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
            onClick={() => {
              setEditingDisposal(null)
              setIsCreateOpen(true)
            }}
            className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
          >
            <Plus className="size-4" />
            Buat Pengajuan Disposal
          </Button>
        </div>
      </div>

      {/* KPI SCORECARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HeroKpiCard
          title="Total Pengajuan"
          value={kpi.total}
          tone="blue"
          icon={<FileText className="size-5" />}
          description="Seluruh permohonan disposal"
        />
        <HeroKpiCard
          title="Menunggu Persetujuan"
          value={kpi.pending}
          tone="amber"
          icon={<Clock className="size-5" />}
          description="Proses rantai otorisasi"
        />
        <HeroKpiCard
          title="Disetujui Penuh"
          value={kpi.approved}
          tone="emerald"
          icon={<CheckCircle2 className="size-5" />}
          description="Aset resmi dihapus (Disposed)"
        />
        <HeroKpiCard
          title="Ditolak / Batal"
          value={kpi.rejected}
          tone="rose"
          icon={<AlertTriangle className="size-5" />}
          description="Pengajuan tidak disetujui"
        />
      </div>

      {/* TABS SECTION: "Disposal Saya" & "Daftar Disposal" (SEPERTI ASSET BORROW) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'my_disposals' | 'all_disposals')}
        className="space-y-4"
      >
        <TabsList className="bg-muted/70 p-1 rounded-lg h-10 border border-border/40">
          <TabsTrigger
            value="my_disposals"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <UserCheck className="size-3.5 text-emerald-600" />
            <span>Disposal Saya</span>
            <Badge className="ml-1 rounded-full border-0 bg-emerald-100 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {myDisposalsData.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="all_disposals"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
          >
            <Layers className="size-3.5 text-blue-600" />
            <span>Daftar Disposal</span>
            <Badge className="ml-1 rounded-full border-0 bg-blue-100 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {displayData.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DISPOSAL SAYA (DENGAN AKSI TINJAU, VIEW, REVISI, & BATALKAN AUTO-HAPUS) */}
        <TabsContent value="my_disposals" className="space-y-4">
          <TooltipProvider>
            <HeroDataTable
              data={myDisposalsData}
              columns={columns}
              idField="id"
              title="Disposal Saya &amp; Tindakan"
              description={
                isAdmin
                  ? `Seluruh pengajuan disposal aset dengan kontrol operasional approval, view, & pembatalan (${myDisposalsData.length} data)`
                  : `Daftar pengajuan disposal terkait Anda beserta kontrol operasional (${myDisposalsData.length} data)`
              }
              searchPlaceholder="Cari no disposal, nama aset, nomor aset, atau pemohon..."
              searchKeys={[
                'disposalNumber',
                'assetName',
                'assetNumber',
                'applicantName',
                'departmentName',
                'siteName',
                'notes',
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
              exportFileName={`Laporan-Disposal-Saya${dateRange?.from ? `-${new Date(dateRange.from).toISOString().slice(0, 10)}` : ''}`}
              pdfTitle="Laporan Asset Disposal Saya - PT Chitra Paratama"
              renderRowActions={(row) => {
                const isCreator = Boolean(
                  (currentEmpId && row.applicantEmployeeId === currentEmpId) ||
                  (currentUserId && row.createdById === currentUserId)
                )
                const isCurrentApprover = Boolean(
                  currentEmpId && row.currentApproverEmployeeId === currentEmpId
                )

                const canReview = Boolean(
                  row.status === 'pending' && (isCurrentApprover || isAdmin)
                )
                const canEditRevision = Boolean(
                  row.status === 'needs_revision' && (isCreator || isAdmin)
                )
                const canCancel = Boolean(
                  (row.status === 'pending' || row.status === 'needs_revision') &&
                  (isCreator || isAdmin)
                )

                return (
                  <div className="flex items-center gap-1.5">
                    {/* 1. Tinjau (Approver & Super Admin) */}
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

                    {/* 2. Revisi / Resubmit (Jika status = needs_revision) */}
                    {canEditRevision && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRevision(row)}
                        className="h-8 gap-1 border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 shadow-2xs"
                      >
                        <RotateCcw className="size-3.5 text-amber-600" />
                        Revisi
                      </Button>
                    )}

                    {/* 3. View Detail */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenView(row)}
                          className="h-8 w-8 text-slate-500 hover:text-blue-700"
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lihat Detail &amp; Dokumen</TooltipContent>
                    </Tooltip>

                    {/* 4. Batalkan Pengajuan (Auto Hapus dari DB) */}
                    {canCancel && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePromptCancel(row)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="size-4" />
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

        {/* TAB 2: DAFTAR DISPOSAL (SEMUA PENGGUNA - TANPA TOMBOL AKSI APAPUN) */}
        <TabsContent value="all_disposals" className="space-y-4">
          <TooltipProvider>
            <HeroDataTable
              data={displayData}
              columns={columns}
              idField="id"
              title="Daftar Semua Disposal Aset"
              description="Direktori riwayat permohonan penghapusan aset seluruh site dan departemen (Semua Pengguna)"
              searchPlaceholder="Cari no disposal, nama aset, nomor aset, atau pemohon..."
              searchKeys={[
                'disposalNumber',
                'assetName',
                'assetNumber',
                'applicantName',
                'departmentName',
                'siteName',
                'notes',
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
              exportFileName={`Laporan-Asset-Disposal${dateRange?.from ? `-${new Date(dateRange.from).toISOString().slice(0, 10)}` : ''}`}
              pdfTitle="Laporan Resmi Asset Disposal - PT Chitra Paratama"
              // Read-only: Tanpa tombol action apapun per instruksi
              renderRowActions={() => (
                <span className="text-muted-foreground text-xs font-mono">-</span>
              )}
            />
          </TooltipProvider>
        </TabsContent>
      </Tabs>

      {/* FORM MODAL: BUAT / REVISI PENGATURAN DISPOSAL */}
      <AssetDisposalFormDialog
        open={isCreateOpen}
        onOpenChange={(isOpen) => {
          setIsCreateOpen(isOpen)
          if (!isOpen) setEditingDisposal(null)
        }}
        onSuccess={refreshData}
        sites={sites}
        departments={departments}
        sections={sections}
        assets={assets}
        currentEmployee={currentEmployee}
        defaultApprovers={defaultApprovers}
        allEmployees={allEmployees}
        initialData={editingDisposal}
      />

      {/* DETAIL MODAL (VIEW / PRATINJAU DOKUMEN / DOWNLOAD PDF) */}
      {selectedDisposal && (
        <AssetDisposalDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          item={selectedDisposal}
          onSuccess={refreshData}
        />
      )}

      {/* ASSET APPROVAL DIALOG (SPLIT 2-PANEL REVIEW SEPERTI ASSET BORROW: PREVIEW A4 LANDSCAPE, DIGITAL SIGNATURE, SUPPORTING ATTACHMENTS, APPROVE/REJECT/REVERT) */}
      <AssetApprovalDialog
        open={isAssetApprovalOpen}
        onOpenChange={setIsAssetApprovalOpen}
        item={reviewTarget}
        allowRevert={true}
        isSubmitting={isAssetSubmitting}
        onApprove={async ({ decisionNote, signatureUrl }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await approveAssetDisposal(reviewTarget.targetId, decisionNote, signatureUrl)
            if (res.success) {
              toast.success(res.message || 'Persetujuan disposal berhasil dicatat.')
              setIsAssetApprovalOpen(false)
              setReviewTarget(null)
              refreshData()
            } else {
              toast.error(res.message || 'Gagal menyetujui disposal.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem saat menyetujui.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
        onReject={async ({ rejectionReason }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await rejectAssetDisposal(reviewTarget.targetId, rejectionReason)
            if (res.success) {
              toast.success(res.message || 'Permohonan disposal telah ditolak.')
              setIsAssetApprovalOpen(false)
              setReviewTarget(null)
              refreshData()
            } else {
              toast.error(res.message || 'Gagal menolak disposal.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem saat menolak.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
        onRevert={async ({ revertReason }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await revertAssetDisposalAction(reviewTarget.targetId, revertReason)
            if (res.success) {
              toast.success(res.message || 'Permohonan disposal berhasil dikembalikan untuk revisi.')
              setIsAssetApprovalOpen(false)
              setReviewTarget(null)
              refreshData()
            } else {
              toast.error(res.message || 'Gagal merevert permohonan.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem saat merevert.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
      />

      {/* CONFIRM DIALOG: BATALKAN & HAPUS PENGAJUAN (AUTO-HAPUS) */}
      <HeroConfirmDialog
        open={isCancelConfirmOpen}
        onOpenChange={setIsCancelConfirmOpen}
        title="Batalkan & Hapus Pengajuan Disposal?"
        description={`Apakah Anda yakin ingin membatalkan pengajuan "${disposalToCancel?.disposalNumber}"? Tindakan ini akan menghapus riwayat pengajuan dan rantai persetujuan secara permanen.`}
        confirmLabel="Ya, Batalkan & Hapus"
        cancelLabel="Batal"
        tone="destructive"
        isSubmitting={isCancelling}
        onConfirm={handleConfirmCancel}
      />
    </div>
  )
}
