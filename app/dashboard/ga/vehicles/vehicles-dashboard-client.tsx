'use client'

import React, { useState, useMemo, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Car,
  Truck,
  Plus,
  Download,
  Search,
  Filter,
  Printer,
  Edit,
  Trash2,
  Wrench,
  AlertTriangle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
  CheckCircle2,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { VehicleStatusBadge } from '@/components/vehicles/vehicle-status-badge'
import { HeroKpiCard } from '@/components/templates'
import { VehiclePrintDialog } from '@/components/vehicles/vehicle-print-dialog'
import { VehicleFormDialog } from '@/components/vehicles/vehicle-form-dialog'
import { VehicleServiceDialog } from '@/components/vehicles/vehicle-service-dialog'
import {
  deleteVehicle,
  updateVehicle,
  triggerVehicleReminderCheck,
  getVehicleById,
} from '@/app/actions/vehicles'
import { toast } from 'sonner'
import type { HeroVehicle, HeroVehicleServiceLog } from '@/db/schema/vehicles'
import type { VehicleComputedRow, DocumentAlertStatus } from '@/lib/vehicle-status'

export type VehicleWithStatus = VehicleComputedRow

function toBadgeStatus(status: DocumentAlertStatus): 'valid' | 'warning' | 'expired' | 'none' {
  if (status === 'safe') return 'valid'
  if (status === 'warning') return 'warning'
  if (status === 'expired') return 'expired'
  return 'none'
}

function toServiceBadgeStatus(status: 'due' | 'safe' | 'not_recorded'): 'valid' | 'warning' | 'due' | 'none' {
  if (status === 'safe') return 'valid'
  if (status === 'due') return 'due'
  return 'none'
}

function hasVehicleAlert(v: VehicleComputedRow): boolean {
  return (
    v.stnkAlertStatus === 'expired' ||
    v.stnkAlertStatus === 'warning' ||
    v.taxAlertStatus === 'expired' ||
    v.taxAlertStatus === 'warning' ||
    v.kirAlertStatus === 'expired' ||
    v.kirAlertStatus === 'warning' ||
    v.serviceAlertStatus === 'due'
  )
}

interface VehiclesDashboardClientProps {
  initialVehicles: VehicleComputedRow[]
  initialMetrics: {
    total: number
    owned: number
    rented: number
    stnkExpired: number
    stnkWarning: number
    taxExpired: number
    taxWarning: number
    kirExpired: number
    kirWarning: number
    serviceDue: number
    serviceWarning: number
    activeCount: number
    maintenanceCount: number
  }
  sites: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string }>
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  currentEmployeeName?: string
}

export function VehiclesDashboardClient({
  initialVehicles,
  initialMetrics,
  sites,
  departments,
  canCreate,
  canEdit,
  canDelete,
  currentEmployeeName = 'User',
}: VehiclesDashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const [vehicles, setVehicles] = useState<VehicleWithStatus[]>(initialVehicles)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [search, setSearch] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [siteFilter, setSiteFilter] = useState('all')
  const [alertFilter, setAlertFilter] = useState('all')

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<HeroVehicle | null>(null)

  const [serviceOpen, setServiceOpen] = useState(false)
  const [servicingVehicle, setServicingVehicle] = useState<HeroVehicle | null>(null)

  const [printOpen, setPrintOpen] = useState(false)
  const [printVehicle, setPrintVehicle] = useState<(HeroVehicle & { serviceLogs?: HeroVehicleServiceLog[] }) | null>(null)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState<HeroVehicle | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [reminderChecking, setReminderChecking] = useState(false)

  // Filtered rows
  const filteredRows = useMemo(() => {
    return vehicles.filter((v) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const plate = (v.plateNumber || '').toLowerCase()
        const holder = (v.holderName || '').toLowerCase()
        const site = (v.siteNameFallback || v.locationName || '').toLowerCase()
        const matchPlate = plate.includes(q)
        const matchType = v.vehicleType?.toLowerCase().includes(q)
        const matchHolder = holder.includes(q)
        const matchSite = site.includes(q)
        if (!matchPlate && !matchType && !matchHolder && !matchSite) {
          return false
        }
      }

      // Ownership
      if (ownershipFilter !== 'all') {
        const own = (v.ownership || '').toLowerCase()
        if (own !== ownershipFilter.toLowerCase()) return false
      }

      // Category
      if (categoryFilter !== 'all' && v.category !== categoryFilter) {
        return false
      }

      // Site
      if (siteFilter !== 'all') {
        const sName = v.siteNameFallback || v.locationName || ''
        if (sName !== siteFilter) return false
      }

      // Alert Filter
      if (alertFilter === 'alerts') {
        return hasVehicleAlert(v)
      }
      if (alertFilter === 'stnk_expired') {
        return v.stnkAlertStatus === 'expired'
      }
      if (alertFilter === 'tax_expired') {
        return v.taxAlertStatus === 'expired'
      }
      if (alertFilter === 'kir_expired') {
        return v.kirAlertStatus === 'expired'
      }
      if (alertFilter === 'service_due') {
        return v.serviceAlertStatus === 'due'
      }

      return true
    })
  }, [vehicles, search, ownershipFilter, categoryFilter, siteFilter, alertFilter])

  const [sortColumn, setSortColumn] = useState<string>('plateNumber')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      switch (sortColumn) {
        case 'plateNumber':
          valA = a.plateNumber || ''
          valB = b.plateNumber || ''
          break
        case 'holder':
          valA = a.holderName || ''
          valB = b.holderName || ''
          break
        case 'stnk':
          valA = a.stnkDaysRemaining ?? 99999
          valB = b.stnkDaysRemaining ?? 99999
          break
        case 'tax':
          valA = a.taxDaysRemaining ?? 99999
          valB = b.taxDaysRemaining ?? 99999
          break
        case 'kir':
          valA = a.kirDaysRemaining ?? 99999
          valB = b.kirDaysRemaining ?? 99999
          break
        case 'odometer':
          valA = a.lastServiceOdometer ?? 0
          valB = b.lastServiceOdometer ?? 0
          break
        case 'status':
          valA = a.status || ''
          valB = b.status || ''
          break
        default:
          return 0
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredRows, sortColumn, sortDirection])

  const renderSortHeader = (label: string, colKey: string) => {
    const isSorted = sortColumn === colKey
    return (
      <button
        type="button"
        onClick={() => handleSort(colKey)}
        className="inline-flex items-center gap-1.5 font-bold uppercase hover:text-foreground transition-colors group cursor-pointer"
      >
        <span>{label}</span>
        {isSorted ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="size-3 text-blue-600" />
          ) : (
            <ArrowDown className="size-3 text-blue-600" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40 group-hover:opacity-100" />
        )}
      </button>
    )
  }

  // TanStack Virtualizer
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const before = virtualItems.length > 0 ? virtualItems[0].start : 0
  const after =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0

  // Refresh page
  const refreshData = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  // Open Edit
  const handleOpenEdit = (v: HeroVehicle) => {
    setEditingVehicle(v)
    setFormOpen(true)
  }

  // Open Create
  const handleOpenCreate = () => {
    setEditingVehicle(null)
    setFormOpen(true)
  }

  // Open Service
  const handleOpenService = (v: HeroVehicle) => {
    setServicingVehicle(v)
    setServiceOpen(true)
  }

  // Open Print Preview
  const handleOpenPrint = async (v: HeroVehicle) => {
    try {
      const full = await getVehicleById(v.id)
      if (full) {
        setPrintVehicle(full)
      } else {
        setPrintVehicle(v)
      }
      setPrintOpen(true)
    } catch {
      setPrintVehicle(v)
      setPrintOpen(true)
    }
  }

  // Delete
  const confirmDelete = async () => {
    if (!vehicleToDelete) return
    setDeleting(true)
    try {
      const res = await deleteVehicle(vehicleToDelete.id)
      if (res.success) {
        toast.success(`Kendaraan ${vehicleToDelete.plateNumber} berhasil dihapus`)
        setVehicles((prev) => prev.filter((item) => item.id !== vehicleToDelete.id))
        setDeleteConfirmOpen(false)
        setVehicleToDelete(null)
        refreshData()
      } else {
        toast.error('Gagal menghapus kendaraan')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem')
    } finally {
      setDeleting(false)
    }
  }

  // Inline Status Change
  const handleInlineStatusChange = async (vehicleId: number, newStatus: any) => {
    try {
      const res = await updateVehicle(vehicleId, { status: newStatus })
      if (res) {
        toast.success('Status kendaraan diperbarui')
        setVehicles((prev) =>
          prev.map((item) => (item.id === vehicleId ? { ...item, status: newStatus } : item))
        )
      } else {
        toast.error('Gagal memperbarui status')
      }
    } catch {
      toast.error('Gagal memperbarui status')
    }
  }

  // Trigger Reminder Check
  const handleTriggerReminder = async () => {
    setReminderChecking(true)
    try {
      const res = await triggerVehicleReminderCheck()
      if (res) {
        toast.success(
          `Pemeriksaan surat selesai: ${res.alertsCount} alert terdeteksi.`
        )
        refreshData()
      } else {
        toast.error('Gagal menjalankan reminder')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setReminderChecking(false)
    }
  }

  // CSV Export
  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    const headers = [
      'No',
      'No Polisi',
      'Merk',
      'Tipe / Model',
      'Kategori',
      'Kepemilikan',
      'Vendor Rental',
      'Site / Lokasi',
      'Departemen',
      'Pemegang Unit',
      'No Telp',
      'Masa Berlaku STNK',
      'Status STNK',
      'Masa Berlaku Pajak',
      'Status Pajak',
      'Masa Berlaku KIR',
      'Status KIR',
      'Odometer (KM)',
      'Next Servis (KM)',
      'Next Servis (Tgl)',
      'Status Operasional',
      'Catatan',
    ]

    const csvRows = [headers.join(',')]

    filteredRows.forEach((row, idx) => {
      const clean = (val: any) => {
        if (val === null || val === undefined) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
      }

      csvRows.push(
        [
          idx + 1,
          clean(row.plateNumber),
          clean(row.vehicleType),
          clean(row.category),
          clean(row.ownership),
          clean(row.rentalVendor || '-'),
          clean(row.siteNameFallback || row.locationName || '-'),
          clean(row.locationName || '-'),
          clean(row.holderName || '-'),
          clean('-'),
          clean(row.stnkExpiryDate || '-'),
          clean(row.stnkAlertStatus),
          clean(row.taxExpiryDate || '-'),
          clean(row.taxAlertStatus),
          clean(row.kirExpiryDate || '-'),
          clean(row.kirAlertStatus),
          clean(row.lastServiceOdometer || 0),
          clean(row.nextServiceOdometer || '-'),
          clean(row.nextServiceDate || '-'),
          clean(row.status),
          clean(row.notes || '-'),
        ].join(',')
      )
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `GA_Armada_Kendaraan_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('File CSV berhasil diunduh')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-lg">
              <Truck className="size-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                GA &bull; Armada Kendaraan Operasional
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitoring unit armada (Owned & Rented), masa berlaku STNK, Pajak PKB, Uji KIR, dan Servis Berkala
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerReminder}
            disabled={reminderChecking}
            className="text-xs h-9 gap-1.5"
            title="Periksa dan update status notifikasi masa berlaku surat"
          >
            <RefreshCw className={`size-3.5 ${reminderChecking ? 'animate-spin' : ''}`} />
            Cek Masa Surat
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-9 gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>

          {canCreate && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9 gap-1.5 shadow-sm"
            >
              <Plus className="size-3.5" />
              Tambah Kendaraan
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards (HeroKpiCard Standardized) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <HeroKpiCard
          title="Total Armada"
          value={metrics.total}
          unit="unit"
          icon={<Truck className="size-5" />}
          watermarkIcon={<Truck className="size-16" />}
          tone="blue"
          variant="colorful"
          description={`${metrics.owned} Owned • ${metrics.rented} Rented`}
        />

        <HeroKpiCard
          title="STNK (5 Thn)"
          value={metrics.stnkExpired}
          unit="kedaluwarsa"
          icon={<ShieldCheck className="size-5" />}
          watermarkIcon={<ShieldCheck className="size-16" />}
          tone={metrics.stnkExpired > 0 ? 'rose' : 'emerald'}
          variant="colorful"
          badge={metrics.stnkExpired > 0 ? 'Perlu Tindakan' : undefined}
          description={
            metrics.stnkWarning > 0
              ? `${metrics.stnkWarning} mendekati jatuh tempo (H-30)`
              : 'Semua aman terkelola'
          }
        />

        <HeroKpiCard
          title="Pajak PKB (1 Thn)"
          value={metrics.taxExpired}
          unit="kedaluwarsa"
          icon={<AlertCircle className="size-5" />}
          watermarkIcon={<AlertCircle className="size-16" />}
          tone={metrics.taxExpired > 0 ? 'rose' : 'amber'}
          variant="colorful"
          badge={metrics.taxExpired > 0 ? 'Perlu Bayar' : undefined}
          description={
            metrics.taxWarning > 0
              ? `${metrics.taxWarning} mendekati batas bayar`
              : 'Pajak aktif tercatat'
          }
        />

        <HeroKpiCard
          title="Uji KIR Dishub"
          value={metrics.kirExpired}
          unit="kedaluwarsa"
          icon={<AlertTriangle className="size-5" />}
          watermarkIcon={<AlertTriangle className="size-16" />}
          tone={metrics.kirExpired > 0 ? 'rose' : 'cyan'}
          variant="colorful"
          badge={metrics.kirExpired > 0 ? 'Jatuh Tempo' : undefined}
          description={
            metrics.kirWarning > 0
              ? `${metrics.kirWarning} unit warning`
              : 'KIR unit komersial aman'
          }
        />

        <HeroKpiCard
          title="Jadwal Servis"
          value={metrics.serviceDue}
          unit="perlu servis"
          icon={<Wrench className="size-5" />}
          watermarkIcon={<Wrench className="size-16" />}
          tone={metrics.serviceDue > 0 ? 'purple' : 'blue'}
          variant="colorful"
          badge={metrics.serviceDue > 0 ? 'Overdue' : undefined}
          description={
            metrics.serviceWarning > 0
              ? `${metrics.serviceWarning} mendekati KM servis`
              : 'Perawatan terjadwal berkala'
          }
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari plat nomor (KT...), tipe mobil, merk, pemegang unit, atau site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
              <SelectTrigger className="w-[140px] text-xs h-9">
                <SelectValue placeholder="Kepemilikan" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Semua Milik</SelectItem>
                <SelectItem value="Owned">Owned (Milik PT)</SelectItem>
                <SelectItem value="Rented">Rented (Sewa)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] text-xs h-9">
                <SelectValue placeholder="Kategori Unit" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="Passenger">Passenger</SelectItem>
                <SelectItem value="Light Commercial">Light Commercial</SelectItem>
                <SelectItem value="Heavy Truck">Heavy Truck</SelectItem>
                <SelectItem value="Crane Truck">Crane Truck</SelectItem>
                <SelectItem value="Special">Special Purpose</SelectItem>
              </SelectContent>
            </Select>

            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[150px] text-xs h-9">
                <SelectValue placeholder="Semua Site" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Semua Site</SelectItem>
                {Array.from(new Set(vehicles.map((v) => v.siteNameFallback || v.locationName).filter(Boolean))).map((s) => (
                  <SelectItem key={s!} value={s!}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-[180px] text-xs h-9">
                <SelectValue placeholder="Filter Masa Dokumen" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="all">Semua Status Dokumen</SelectItem>
                <SelectItem value="alerts">Ada Warning / Expired</SelectItem>
                <SelectItem value="stnk_expired">STNK Expired</SelectItem>
                <SelectItem value="tax_expired">Pajak Expired</SelectItem>
                <SelectItem value="kir_expired">KIR Expired</SelectItem>
                <SelectItem value="service_due">Perlu Servis Segera</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
          <span>Menampilkan <strong className="text-foreground">{filteredRows.length}</strong> dari {vehicles.length} kendaraan operasional</span>
          {(search || ownershipFilter !== 'all' || categoryFilter !== 'all' || siteFilter !== 'all' || alertFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('')
                setOwnershipFilter('all')
                setCategoryFilter('all')
                setSiteFilter('all')
                setAlertFilter('all')
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              Reset Semua Filter
            </button>
          )}
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
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4 w-44">{renderSortHeader('Plat & Kendaraan', 'plateNumber')}</th>
                <th className="py-3 px-4 w-40">{renderSortHeader('Lokasi & Pemegang', 'holder')}</th>
                <th className="py-3 px-3 w-32">{renderSortHeader('STNK (5 Thn)', 'stnk')}</th>
                <th className="py-3 px-3 w-32">{renderSortHeader('Pajak (1 Thn)', 'tax')}</th>
                <th className="py-3 px-3 w-28">{renderSortHeader('Uji KIR', 'kir')}</th>
                <th className="py-3 px-3 w-36">{renderSortHeader('Servis & KM', 'odometer')}</th>
                <th className="py-3 px-3 w-32">{renderSortHeader('Status Unit', 'status')}</th>
                <th className="py-3 px-3 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Truck className="size-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">Tidak ada kendaraan yang sesuai</p>
                    <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                  </td>
                </tr>
              ) : (
                <>
                  {before > 0 && (
                    <tr>
                      <td colSpan={9} style={{ height: `${before}px` }} />
                    </tr>
                  )}
                  {virtualItems.map((virtualRow) => {
                    const row = sortedRows[virtualRow.index]
                    const isRented = (row.ownership || '').toLowerCase() === 'rented'
                    const plate = row.plateNumber || (row as any).policeNumber || '-'
                    const holder = row.holderName || (row as any).assignedEmployeeName || 'Pool Kendaraan'
                    const site = row.siteNameFallback || (row as any).siteName || row.locationName || 'Belum di-assign'
                    const year = row.manufactureYear || (row as any).year
                    const odo = row.lastServiceOdometer || (row as any).currentOdometer

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/40 transition-colors h-[72px]"
                      >
                        {/* No */}
                        <td className="py-3 px-3 text-center font-medium text-muted-foreground">
                          {virtualRow.index + 1}
                        </td>

                        {/* Plat & Kendaraan */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-foreground text-[12px] tracking-wide">
                              {plate}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 font-bold ${
                                isRented
                                  ? 'bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-800'
                                  : 'bg-blue-500/10 text-blue-700 border-blue-300 dark:border-blue-800'
                              }`}
                            >
                              {isRented ? 'Rented' : 'Owned'}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                            {row.vehicleType}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {row.category} {year ? `• Thn ${year}` : ''}
                          </p>
                        </td>

                        {/* Lokasi & Pemegang */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-foreground truncate max-w-[150px]">
                            {holder}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                            {site}
                          </p>
                        </td>

                        {/* STNK 5 Thn */}
                        <td className="py-3 px-3">
                          <VehicleStatusBadge
                            status={toBadgeStatus(row.stnkAlertStatus)}
                            remainingDays={row.stnkDaysRemaining}
                            dateStr={row.stnkExpiryDate}
                            showDate
                          />
                        </td>

                        {/* Pajak 1 Thn */}
                        <td className="py-3 px-3">
                          <VehicleStatusBadge
                            status={toBadgeStatus(row.taxAlertStatus)}
                            remainingDays={row.taxDaysRemaining}
                            dateStr={row.taxExpiryDate}
                            showDate
                          />
                        </td>

                        {/* Uji KIR */}
                        <td className="py-3 px-3">
                          <VehicleStatusBadge
                            status={toBadgeStatus(row.kirAlertStatus)}
                            remainingDays={row.kirDaysRemaining}
                            dateStr={row.kirExpiryDate}
                            showDate
                          />
                        </td>

                        {/* Servis & KM */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {odo ? `${new Intl.NumberFormat('id-ID').format(odo)} KM` : '-'}
                            </span>
                            {row.nextServiceOdometer ? (
                              <span className="text-[10px] text-muted-foreground">
                                Next: {new Intl.NumberFormat('id-ID').format(row.nextServiceOdometer)} KM
                              </span>
                            ) : null}
                            <VehicleStatusBadge
                              status={toServiceBadgeStatus(row.serviceAlertStatus)}
                              remainingDays={row.serviceDaysSince}
                              dateStr={row.nextServiceDate}
                              compact
                            />
                          </div>
                        </td>

                        {/* Status Unit (Inline Change) */}
                        <td className="py-3 px-3">
                          {canEdit ? (
                            <Select
                              value={row.status}
                              onValueChange={(val: any) => handleInlineStatusChange(row.id, val)}
                            >
                              <SelectTrigger className="h-7 text-[10px] font-semibold w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="text-xs">
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Under Maintenance">Maintenance</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                                <SelectItem value="Returned">Returned</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {row.status}
                            </Badge>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Cetak Kartu A4 */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-blue-600"
                              onClick={() => handleOpenPrint(row)}
                              title="Cetak Lembar Dokumen Kendaraan (A4)"
                            >
                              <Printer className="size-3.5" />
                            </Button>

                            {/* Catat Servis */}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-emerald-600"
                                onClick={() => handleOpenService(row)}
                                title="Catat Servis & Odometer"
                              >
                                <Wrench className="size-3.5" />
                              </Button>
                            )}

                            {/* Edit */}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-amber-600"
                                onClick={() => handleOpenEdit(row)}
                                title="Edit Data Kendaraan"
                              >
                                <Edit className="size-3.5" />
                              </Button>
                            )}

                            {/* Delete */}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-rose-600"
                                onClick={() => {
                                  setVehicleToDelete(row)
                                  setDeleteConfirmOpen(true)
                                }}
                                title="Hapus Kendaraan"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {after > 0 && (
                    <tr>
                      <td colSpan={9} style={{ height: `${after}px` }} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {/* 1. Add / Edit Vehicle Dialog */}
      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicleToEdit={editingVehicle}
        onSuccess={refreshData}
      />

      {/* 2. Service Log Dialog */}
      <VehicleServiceDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        vehicle={servicingVehicle}
        onSuccess={refreshData}
      />

      {/* 3. A4 Document Print Dialog */}
      <VehiclePrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        vehicle={printVehicle}
      />

      {/* 4. Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 font-bold flex items-center gap-2">
              <Trash2 className="size-5" />
              Hapus Data Kendaraan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Apakah Anda yakin ingin menghapus data kendaraan{' '}
              <strong className="text-foreground">{vehicleToDelete?.plateNumber}</strong> (
              {vehicleToDelete?.vehicleType})? Tindakan ini bersifat permanen
              dan riwayat servis terkait akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
