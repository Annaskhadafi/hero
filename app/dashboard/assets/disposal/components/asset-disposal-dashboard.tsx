'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  HeroDataTable,
  HeroKpiCard,
  HeroStatusBadge,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Trash2,
  PlusCircle,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  Ban,
  Download,
  Building2,
  FileText,
} from 'lucide-react'
import { AssetDisposalFormDialog } from './asset-disposal-form-dialog'
import { AssetDisposalDetailModal } from './asset-disposal-detail-modal'
import { getAssetDisposalDetail } from '../actions'

export interface AssetDisposalDashboardProps {
  initialItems: any[]
  totalItems: number
  kpiStats: {
    total: number
    pending: number
    approved: number
    rejected: number
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
  sites,
  departments,
  sections,
  assets,
  currentEmployee,
  defaultApprovers,
  allEmployees = [],
}: AssetDisposalDashboardProps) {
  const router = useRouter()

  // Dialog & Modal states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [selectedDisposal, setSelectedDisposal] = React.useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  const handleRefresh = () => {
    router.refresh()
  }

  const handleViewDetail = async (item: any) => {
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

  const handleDownloadPdf = (e: React.MouseEvent, item: any) => {
    e.stopPropagation()
    if (!item.id) return
    window.open(`/api/assets/disposal/${item.id}/pdf`, '_blank')
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
      case 'pending':
      default:
        return { label: 'Menunggu Persetujuan', status: 'pending' as const }
    }
  }

  // Define Table Columns for HeroDataTable
  const columns = [
    {
      key: 'disposalNumber',
      header: 'No. Disposal & Tanggal',
      render: (row: any) => (
        <div>
          <span className="font-bold text-xs text-primary block">{row.disposalNumber}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDate(row.disposalDate || row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'assetName',
      header: 'Aset yang Dihapus',
      render: (row: any) => (
        <div className="max-w-[220px]">
          <span className="font-semibold text-xs text-foreground block truncate" title={row.assetName}>
            {row.assetName}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            {row.assetNumber && <span>No: {row.assetNumber}</span>}
            {row.purchaseYear && <span>Thn: {row.purchaseYear}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'unitKerja',
      header: 'Unit Kerja & Lokasi',
      render: (row: any) => (
        <div className="max-w-[180px]">
          <span className="font-medium text-xs text-foreground block truncate">
            {row.departmentName}
          </span>
          <span className="text-[10px] text-muted-foreground block truncate">
            {row.siteName} {row.sectionName ? `• ${row.sectionName}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'applicant',
      header: 'Dibuat Oleh',
      render: (row: any) => (
        <div>
          <span className="font-medium text-xs text-foreground block">
            {row.applicantName}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {row.applicantJobTitle || 'Staff'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status Pengajuan',
      render: (row: any) => {
        const tone = getStatusTone(row.status)
        return <HeroStatusBadge status={tone.status} label={tone.label} />
      },
    },
    {
      key: 'currentApprover',
      header: 'Approver Aktif',
      render: (row: any) => (
        <div>
          {row.status === 'pending' ? (
            <>
              <span className="font-medium text-xs text-foreground block">
                {row.currentApproverName || 'Approver'}
              </span>
              <span className="text-[10px] text-amber-600 block">
                Tahap {row.currentStepOrder} dari {row.totalSteps}
              </span>
            </>
          ) : row.status === 'approved' ? (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              Selesai (Director)
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row: any) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-primary hover:bg-primary/10"
                  onClick={() => handleViewDetail(row)}
                >
                  <Eye className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lihat Detail Pengajuan</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-slate-600 hover:text-primary hover:bg-muted"
                  onClick={(e) => handleDownloadPdf(e, row)}
                >
                  <Download className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download PDF (A4)</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Trash2 className="size-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Asset Disposal
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kelola dan lacak permohonan penghapusan aset dengan verifikasi Finance & Accounting dan otorisasi bertingkat hingga Director.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <PlusCircle className="size-4" />
            Buat Pengajuan Disposal
          </Button>
        </div>
      </div>

      {/* 2. KPI Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Permohonan"
          value={kpiStats.total}
          subtitle="Keseluruhan disposal aset"
          tone="blue"
          icon={<Trash2 className="size-5" />}
        />
        <HeroKpiCard
          title="Menunggu Persetujuan"
          value={kpiStats.pending}
          subtitle="Membutuhkan review approver"
          tone="amber"
          icon={<Clock className="size-5" />}
        />
        <HeroKpiCard
          title="Disetujui Penuh"
          value={kpiStats.approved}
          subtitle="Status master aset DISPOSED"
          tone="emerald"
          icon={<CheckCircle2 className="size-5" />}
        />
        <HeroKpiCard
          title="Ditolak / Batal"
          value={kpiStats.rejected}
          subtitle="Permohonan tidak berlanjut"
          tone="rose"
          icon={<Ban className="size-5" />}
        />
      </div>

      {/* 3. HeroDataTable Table Section */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <HeroDataTable
          data={initialItems}
          columns={columns}
          searchPlaceholder="Cari nomor disposal, nama aset, pemohon, departemen..."
          filters={[
            {
              key: 'status',
              label: 'Status Pengajuan',
              options: [
                { label: 'Menunggu Persetujuan', value: 'pending' },
                { label: 'Disetujui Penuh', value: 'approved' },
                { label: 'Ditolak', value: 'rejected' },
                { label: 'Dibatalkan', value: 'cancelled' },
              ],
            },
          ]}
        />
      </div>

      {/* 4. Form Dialog Modal */}
      <AssetDisposalFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleRefresh}
        sites={sites}
        departments={departments}
        sections={sections}
        assets={assets}
        currentEmployee={currentEmployee}
        defaultApprovers={defaultApprovers}
        allEmployees={allEmployees}
      />

      {/* 5. Detail Modal */}
      <AssetDisposalDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        item={selectedDisposal}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
