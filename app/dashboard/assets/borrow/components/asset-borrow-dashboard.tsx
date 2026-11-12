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
  PlusCircle,
  RefreshCw,
  Eye,
  CheckCircle2,
  RotateCcw,
  Download,
  Clock,
  Box,
  HandHelping,
  FileText,
} from 'lucide-react'
import { AssetBorrowFormDialog } from './asset-borrow-form-dialog'
import { AssetBorrowDetailModal } from './asset-borrow-detail-modal'
import { getAssetBorrowDetail } from '../actions'

export interface AssetBorrowDashboardProps {
  initialItems: any[]
  totalItems: number
  kpiStats: {
    total: number
    pending: number
    borrowed: number
    returned: number
  }
  masterAssets: any[]
  employees: any[]
}

export function AssetBorrowDashboard({
  initialItems,
  totalItems,
  kpiStats,
  masterAssets,
  employees,
}: AssetBorrowDashboardProps) {
  const router = useRouter()

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [selectedBorrow, setSelectedBorrow] = React.useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  const handleRefresh = () => {
    router.refresh()
  }

  const handleViewDetail = async (item: any) => {
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

  // Define Table Columns for HeroDataTable
  const columns = [
    {
      key: 'borrowNumber',
      header: 'No. Peminjaman',
      render: (row: any) => (
        <div>
          <span className="font-bold text-xs text-primary block">{row.borrowNumber}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'assetName',
      header: 'Aset yang Dipinjam',
      render: (row: any) => (
        <div className="max-w-[220px]">
          <span className="font-semibold text-xs text-foreground block truncate" title={row.assetName}>
            {row.assetName}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            {row.assetNumber && <span>No: {row.assetNumber}</span>}
            {row.serialNumber && <span>SN: {row.serialNumber}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'borrowerName',
      header: 'Peminjam',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-xs text-foreground block">{row.borrowerName}</span>
          <span className="text-[10px] text-muted-foreground block truncate max-w-[180px]" title={row.purpose}>
            {row.purpose}
          </span>
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
      render: (row: any) => {
        const tone = getStatusTone(row.status)
        return <HeroStatusBadge status={tone.status} label={tone.label} />
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row: any) => (
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetail(row)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Eye className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lihat Detail Peminjaman</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {row.canApprove && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(row)}
                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Setujui Peminjaman</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {row.canReturn && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(row)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Kembalikan Aset</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* HEADER & TOP ACTION BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Asset Borrow
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
              Asset Management
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Formulir peminjaman aset operasional, persetujuan langsung holder fisik, dan pemantauan pengembalian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 gap-1.5 border-border/80 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
          >
            <PlusCircle className="size-4" />
            Buat Peminjaman Aset
          </Button>
        </div>
      </div>

      {/* KPI SCORECARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HeroKpiCard
          title="Total Peminjaman"
          value={kpiStats.total}
          description="Semua catatan peminjaman aset"
          tone="blue"
          icon={<HandHelping className="size-5" />}
        />
        <HeroKpiCard
          title="Menunggu Persetujuan"
          value={kpiStats.pending}
          description="Menunggu approval holder aset"
          tone="amber"
          icon={<Clock className="size-5" />}
        />
        <HeroKpiCard
          title="Sedang Dipinjam"
          value={kpiStats.borrowed}
          description="Aset aktif digunakan peminjam"
          tone="purple"
          icon={<Box className="size-5" />}
        />
        <HeroKpiCard
          title="Selesai Dikembalikan"
          value={kpiStats.returned}
          description="Aset telah kembali ke holder"
          tone="emerald"
          icon={<CheckCircle2 className="size-5" />}
        />
      </div>

      {/* TABLE VIEW */}
      <div className="space-y-4">
        <HeroDataTable
          data={initialItems}
          columns={columns}
          searchPlaceholder="Cari no peminjaman, nama aset, peminjam, atau holder..."
          filterOptions={[
            {
              columnId: 'status',
              title: 'Status',
              options: [
                { label: 'Semua Status', value: 'all' },
                { label: 'Menunggu Persetujuan', value: 'pending' },
                { label: 'Sedang Dipinjam', value: 'borrowed' },
                { label: 'Selesai Dikembalikan', value: 'returned' },
                { label: 'Ditolak', value: 'rejected' },
              ],
            },
          ]}
          emptyState={{
            title: 'Belum Ada Peminjaman Aset',
            description: 'Belum ada data peminjaman aset yang tercatat. Klik "Buat Peminjaman Aset" untuk memulai.',
          }}
        />
      </div>

      {/* POP-UP FORM MODAL */}
      <AssetBorrowFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleRefresh}
        masterAssets={masterAssets}
        employees={employees}
      />

      {/* DETAIL & ACTION MODAL */}
      <AssetBorrowDetailModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        borrow={selectedBorrow}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
