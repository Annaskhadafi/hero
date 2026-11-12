'use client'

import * as React from 'react'
import {
  HeroDataTable,
  HeroKpiCard,
  HeroStatusBadge,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Ban,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { AssetTransferFormDialog } from './asset-transfer-form-dialog'
import { AssetTransferDetailModal } from './asset-transfer-detail-modal'
import { getAssetTransfers, getAssetTransferDetail } from '../actions'

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

  // Dialog & Modal states
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [selectedTransfer, setSelectedTransfer] = React.useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

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

  // Open detail modal with full data
  const handleOpenDetail = async (row: any) => {
    try {
      const res = await getAssetTransferDetail(row.id)
      if (res.success) {
        setSelectedTransfer(res.data)
        setIsDetailOpen(true)
      } else {
        toast.error(res.message || 'Gagal memuat detail')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan')
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
      header: 'Nama & No. Aset',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-xs font-medium text-foreground">{row.assetName}</div>
          <div className="text-[11px] font-mono text-muted-foreground">
            {row.assetNumber || 'Tanpa No. Aset'}
          </div>
        </div>
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

      {/* DATA TABLE */}
      <TooltipProvider>
        <HeroDataTable
          data={data}
          columns={columns}
          idField="id"
          title="Daftar Pengajuan Transfer Aset"
          description="Pencarian, pemfilteran, dan riwayat mutasi aset seluruh site"
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
          enableExport
          exportFileName="Laporan-Transfer-Aset"
          pdfTitle="Laporan Resmi Transfer Aset - PT Chitra Paratama"
          renderRowActions={(row) => (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenDetail(row)}
                  >
                    <Eye className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lihat Detail Transfer</TooltipContent>
              </Tooltip>
              {row.canCancel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                      onClick={() => handleOpenDetail(row)}
                    >
                      <Ban className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Batalkan Pengajuan</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        />
      </TooltipProvider>

      {/* FORM CREATE DIALOG */}
      <AssetTransferFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={refreshData}
        masterAssets={masterAssets}
        employees={employees}
        sites={sites}
      />

      {/* DETAIL MODAL */}
      <AssetTransferDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        transfer={selectedTransfer}
        onRefresh={refreshData}
      />
    </div>
  )
}
