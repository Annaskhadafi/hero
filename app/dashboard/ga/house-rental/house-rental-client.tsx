'use client'

import * as React from 'react'
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  Edit,
  Eye,
  FileText,
  Home,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  type HouseRentalInput,
  type HouseRentalItem,
  type HouseRentalMetrics,
  bulkDeleteHouseRentals,
  bulkUpdateHouseRentalStatus,
  createHouseRental,
  deleteHouseRental,
  getHouseRentalMetrics,
  getHouseRentalsList,
  updateHouseRental,
} from '@/app/actions/house-rental'
import {
  HeroConfirmDialog,
  HeroDataTable,
  HeroDatePicker,
  HeroDetailModal,
  HeroFileUpload,
  HeroFormField,
  HeroFormDialog,
  HeroInput,
  HeroKpiCard,
  HeroNumberInput,
  HeroSearchableSelect,
  HeroStatusBadge,
  HeroTextarea,
  type HeroColumnDef,
  type HeroTableFilter,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  calculateRemainingDays,
  calculateRentalDuration,
  computeHouseRentalStatus,
  formatIndoDate,
  formatRupiah,
} from '@/lib/ga-house-rental-utils'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

interface HouseRentalClientProps {
  initialRentals: HouseRentalItem[]
  initialMetrics: HouseRentalMetrics
  sitesList: { id: number; name: string; code?: string | null }[]
  employeesList: {
    id: number
    name: string
    employeeSn: string | null
    jobTitle: string | null
    department: string | null
  }[]
  canManage: boolean
  userRole: string
}

const PROPERTY_TYPES = [
  { value: 'Mess Karyawan', label: 'Mess Karyawan' },
  { value: 'Rumah Karyawan', label: 'Rumah Dinas / Karyawan' },
  { value: 'Sewa Lahan & Bangunan', label: 'Sewa Lahan & Bangunan' },
  { value: 'Wisma', label: 'Wisma / Guest House' },
  { value: 'Lainnya', label: 'Lainnya' },
]

const PAYMENT_CYCLES = [
  { value: 'yearly', label: 'Tahunan (1 Tahun)' },
  { value: '6_months', label: 'Semester (6 Bulan)' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'custom', label: 'Kustom / Periode Tertentu' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'expiring_soon', label: 'Segera Berakhir' },
  { value: 'expired', label: 'Selesai / Expired' },
  { value: 'terminated', label: 'Tidak Lanjut Sewa' },
  { value: 'extended', label: 'Diperpanjang' },
]

const STATUS_CUSTOM_LABELS = {
  active: 'Aktif',
  expiring_soon: 'Segera Berakhir',
  expired: 'Selesai / Expired',
  terminated: 'Tidak Lanjut Sewa',
  extended: 'Diperpanjang',
}

const defaultFormState: HouseRentalInput = {
  rentalCode: '',
  workLocation: '',
  siteId: null,
  description: '',
  propertyType: 'Mess Karyawan',
  ownerName: '',
  ownerPhone: '',
  ownerBank: '',
  contractStart: '',
  contractEnd: '',
  costRent: 0,
  paymentCycle: 'yearly',
  status: 'active',
  extensionNotes: '',
  address: '',
  capacity: 0,
  contractDocumentUrl: '',
  contractDocumentName: '',
  propertyPhotoUrl: '',
  assignedEmployeeId: null,
  assignedEmployeeName: '',
  notes: '',
}

export function HouseRentalClient({
  initialRentals,
  initialMetrics,
  sitesList,
  employeesList,
  canManage,
  userRole,
}: HouseRentalClientProps) {
  const [rentals, setRentals] = React.useState<HouseRentalItem[]>(initialRentals)
  const [metrics, setMetrics] = React.useState<HouseRentalMetrics>(initialMetrics)
  const [isLoading, setIsLoading] = React.useState(false)

  // Dialog & Detail states
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<HouseRentalItem | null>(null)
  const [formData, setFormData] = React.useState<HouseRentalInput>(defaultFormState)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [detailItem, setDetailItem] = React.useState<HouseRentalItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  const [deleteItem, setDeleteItem] = React.useState<HouseRentalItem | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const [bulkDeleteIds, setBulkDeleteIds] = React.useState<string[]>([])
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = React.useState(false)

  // Refresh data helper
  const refreshData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [rentalsRes, metricsRes] = await Promise.all([
        getHouseRentalsList(),
        getHouseRentalMetrics(),
      ])
      if (rentalsRes.success && rentalsRes.data) {
        setRentals(rentalsRes.data)
      }
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data)
      }
    } catch {
      toast.error('Gagal memperbarui data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData(defaultFormState)
    setIsFormOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (item: HouseRentalItem) => {
    setEditingItem(item)
    setFormData({
      rentalCode: item.rentalCode,
      workLocation: item.workLocation,
      siteId: item.siteId,
      description: item.description,
      propertyType: item.propertyType,
      ownerName: item.ownerName,
      ownerPhone: item.ownerPhone || '',
      ownerBank: item.ownerBank || '',
      contractStart: item.contractStart,
      contractEnd: item.contractEnd,
      costRent: item.costRent ? Number(item.costRent) : 0,
      paymentCycle: item.paymentCycle || 'yearly',
      status: item.status || 'active',
      extensionNotes: item.extensionNotes || '',
      address: item.address || '',
      capacity: item.capacity || 0,
      contractDocumentUrl: item.contractDocumentUrl || '',
      contractDocumentName: item.contractDocumentName || '',
      propertyPhotoUrl: item.propertyPhotoUrl || '',
      assignedEmployeeId: item.assignedEmployeeId,
      assignedEmployeeName: item.assignedEmployeeName || '',
      notes: item.notes || '',
    })
    setIsFormOpen(true)
  }

  // Open Detail Modal
  const handleOpenDetail = (item: HouseRentalItem) => {
    setDetailItem(item)
    setIsDetailOpen(true)
  }

  // Submit Create or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.workLocation.trim()) {
      toast.error('Lokasi kerja wajib diisi')
      return
    }
    if (!formData.description.trim()) {
      toast.error('Keterangan unit / nama rumah wajib diisi')
      return
    }
    if (!formData.ownerName.trim()) {
      toast.error('Nama pemilik (Owner) wajib diisi')
      return
    }
    if (!formData.contractStart || !formData.contractEnd) {
      toast.error('Periode kontrak (Mulai & Selesai) wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingItem) {
        const res = await updateHouseRental(editingItem.id, formData)
        if (res.success) {
          toast.success('Data sewa rumah berhasil diperbarui')
          setIsFormOpen(false)
          refreshData()
        } else {
          toast.error(res.error || 'Gagal memperbarui data')
        }
      } else {
        const res = await createHouseRental(formData)
        if (res.success) {
          toast.success('Sewa rumah baru berhasil ditambahkan')
          setIsFormOpen(false)
          refreshData()
        } else {
          toast.error(res.error || 'Gagal menambahkan data')
        }
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Single Delete
  const handleDeleteConfirm = async () => {
    if (!deleteItem) return
    setIsDeleting(true)
    try {
      const res = await deleteHouseRental(deleteItem.id)
      if (res.success) {
        toast.success(`Unit ${deleteItem.rentalCode} berhasil dihapus`)
        setIsDeleteOpen(false)
        setDeleteItem(null)
        refreshData()
      } else {
        toast.error(res.error || 'Gagal menghapus data')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus')
    } finally {
      setIsDeleting(false)
    }
  }

  // Bulk Delete
  const handleBulkDelete = (selectedIds: string[]) => {
    setBulkDeleteIds(selectedIds)
    setIsBulkDeleteOpen(true)
  }

  const handleBulkDeleteConfirm = async () => {
    if (bulkDeleteIds.length === 0) return
    setIsBulkProcessing(true)
    try {
      const ids = bulkDeleteIds.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n))
      const res = await bulkDeleteHouseRentals(ids)
      if (res.success) {
        toast.success(`${ids.length} data sewa rumah berhasil dihapus`)
        setIsBulkDeleteOpen(false)
        setBulkDeleteIds([])
        refreshData()
      } else {
        toast.error(res.error || 'Gagal menghapus data')
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  // Inline Status Change via StatusBadge
  const handleInlineStatusChange = async (item: HouseRentalItem, newStatus: string) => {
    try {
      const res = await updateHouseRental(item.id, { status: newStatus })
      if (res.success) {
        toast.success(`Status ${item.rentalCode} diperbarui ke ${STATUS_CUSTOM_LABELS[newStatus as keyof typeof STATUS_CUSTOM_LABELS] || newStatus}`)
        refreshData()
      } else {
        toast.error(res.error || 'Gagal mengubah status')
      }
    } catch {
      toast.error('Gagal memperbarui status')
    }
  }

  // Bulk Status Change
  const handleBulkEdit = async (selectedIds: string[]) => {
    const ids = selectedIds.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n))
    if (ids.length === 0) return
    try {
      const res = await bulkUpdateHouseRentalStatus(ids, 'terminated')
      if (res.success) {
        toast.success(`Status ${ids.length} data diubah ke Tidak Lanjut Sewa`)
        refreshData()
      } else {
        toast.error(res.error || 'Gagal memperbarui status')
      }
    } catch {
      toast.error('Gagal memperbarui status')
    }
  }

  // Unique Location Filter Options
  const uniqueLocations = React.useMemo(() => {
    const locSet = new Set<string>()
    rentals.forEach((r) => {
      if (r.workLocation) locSet.add(r.workLocation)
    })
    return Array.from(locSet).map((loc) => ({ value: loc, label: loc }))
  }, [rentals])

  // Table Filters
  const tableFilters: HeroTableFilter[] = React.useMemo(
    () => [
      {
        key: 'workLocation',
        label: 'Lokasi Kerja',
        options: uniqueLocations,
      },
      {
        key: 'propertyType',
        label: 'Tipe Properti',
        options: PROPERTY_TYPES,
      },
      {
        key: 'status',
        label: 'Status Sewa',
        options: STATUS_OPTIONS,
      },
    ],
    [uniqueLocations]
  )

  // Table Columns Definition
  const columns: HeroColumnDef<HouseRentalItem>[] = React.useMemo(
    () => [
      {
        key: 'no',
        header: 'No',
        width: '50px',
        align: 'center',
        render: (_row, index) => (
          <span className="text-xs font-medium text-slate-500">{index + 1}</span>
        ),
      },
      {
        key: 'workLocation',
        header: 'Lokasi Kerja',
        sortable: true,
        width: '140px',
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-foreground">
              {row.workLocation}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {row.rentalCode}
            </span>
          </div>
        ),
        exportValue: (row) => `${row.workLocation} (${row.rentalCode})`,
      },
      {
        key: 'description',
        header: 'Keterangan',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col gap-1 max-w-[260px]">
            <span className="font-medium text-xs text-foreground truncate" title={row.description}>
              {row.description}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                {row.propertyType}
              </Badge>
              {row.assignedEmployeeName && (
                <span className="text-[10px] text-blue-600 font-medium inline-flex items-center gap-0.5">
                  <User className="size-2.5" />
                  {row.assignedEmployeeName}
                </span>
              )}
            </div>
          </div>
        ),
        exportValue: (row) => row.description,
      },
      {
        key: 'ownerName',
        header: 'Owner (Pemilik)',
        sortable: true,
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-xs text-foreground">
              {row.ownerName}
            </span>
            {row.ownerPhone && (
              <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                <Phone className="size-2.5 text-slate-400" />
                {row.ownerPhone}
              </span>
            )}
          </div>
        ),
        exportValue: (row) => `${row.ownerName} ${row.ownerPhone ? `(${row.ownerPhone})` : ''}`,
      },
      {
        key: 'contractPeriod',
        header: 'Contract Period',
        sortable: true,
        render: (row) => {
          const remaining = calculateRemainingDays(row.contractEnd)
          const duration = calculateRentalDuration(row.contractStart, row.contractEnd)
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-foreground whitespace-nowrap">
                {formatIndoDate(row.contractStart)} &ndash; {formatIndoDate(row.contractEnd)}
              </span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-500">{duration}</span>
                <span className="text-slate-300">&bull;</span>
                {remaining < 0 ? (
                  <span className="text-rose-600 font-medium">Lewat {Math.abs(remaining)} hari</span>
                ) : remaining <= 60 ? (
                  <span className="text-amber-600 font-medium">Sisa {remaining} hari</span>
                ) : (
                  <span className="text-emerald-600 font-medium">Sisa {remaining} hari</span>
                )}
              </div>
            </div>
          )
        },
        exportValue: (row) => `${formatIndoDate(row.contractStart)} s/d ${formatIndoDate(row.contractEnd)}`,
      },
      {
        key: 'costRent',
        header: 'Cost Rent',
        sortable: true,
        align: 'right',
        render: (row) => (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-bold text-xs text-foreground">
              {formatRupiah(row.costRent)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {row.paymentCycle === 'yearly'
                ? 'per tahun'
                : row.paymentCycle === 'monthly'
                ? 'per bulan'
                : row.paymentCycle === '6_months'
                ? 'per 6 bulan'
                : 'kustom'}
            </span>
          </div>
        ),
        exportValue: (row) => Number(row.costRent) || 0,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => (
          <HeroStatusBadge
            status={row.status || 'active'}
            editable={canManage}
            options={STATUS_OPTIONS}
            onChange={(newStatus) => handleInlineStatusChange(row, newStatus)}
          />
        ),
        exportValue: (row) => STATUS_CUSTOM_LABELS[row.status as keyof typeof STATUS_CUSTOM_LABELS] || row.status,
      },
      {
        key: 'extensionNotes',
        header: 'Catatan / Status Lanjut',
        render: (row) => {
          if (!row.extensionNotes) {
            return <span className="text-xs text-slate-300">-</span>
          }
          const isTerminated = row.extensionNotes.toLowerCase().includes('tidak lanjut')
          return (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-md inline-block ${
                isTerminated
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {row.extensionNotes}
            </span>
          )
        },
        exportValue: (row) => row.extensionNotes || '-',
      },
    ],
    [canManage]
  )

  return (
    <div className="w-full space-y-6" suppressHydrationWarning>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Home className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                House Rental (General Affairs)
              </h1>
              <p className="text-xs text-muted-foreground">
                Manajemen sewa rumah, mess karyawan, kontrak akomodasi & fasilitas operasional HERO
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="dense"
            onClick={refreshData}
            disabled={isLoading}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canManage && (
            <Button
              onClick={handleOpenCreate}
              size="dense"
              className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="size-3.5" />
              Tambah Sewa Rumah
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Total Unit Sewa"
          value={metrics.totalUnits}
          description="Rumah, mess, & lahan aktif"
          icon={<Home className="size-5" />}
          tone="blue"
        />
        <HeroKpiCard
          title="Unit Aktif Tersewa"
          value={metrics.activeUnits}
          description="Berjalan & dihuni"
          icon={<CheckCircle2 className="size-5" />}
          tone="emerald"
        />
        <HeroKpiCard
          title="Segera Berakhir"
          value={metrics.expiringSoonUnits}
          description="Kontrak <= 60 hari"
          icon={<AlertTriangle className="size-5" />}
          tone="amber"
        />
        <HeroKpiCard
          title="Total Biaya Sewa"
          value={formatRupiah(metrics.totalCostRent)}
          description="Komitmen seluruh unit"
          icon={<Coins className="size-5" />}
          tone="purple"
        />
      </div>

      {/* ── Main Data Table ────────────────────────────────────────────────── */}
      <div className="w-full">
        <HeroDataTable
          data={rentals}
          columns={columns}
          idField="id"
          title="Daftar Sewa Rumah & Mess Operasional"
          description="Seluruh catatan sewa fasilitas akomodasi karyawan PT Chitra Paratama"
          searchPlaceholder="Cari lokasi, keterangan, owner, catatan..."
          searchKeys={['rentalCode', 'workLocation', 'description', 'ownerName', 'extensionNotes', 'assignedEmployeeName']}
          filters={tableFilters}
          exportFileName="Data_Sewa_Rumah_HRGA"
          pdfTitle="DAFTAR SEWA RUMAH & MESS KARYAWAN (HRGA)"
          showSelection={canManage}
          onRowClick={(row) => handleOpenDetail(row)}
          onBulkDelete={canManage ? handleBulkDelete : undefined}
          onBulkEdit={canManage ? handleBulkEdit : undefined}
          renderRowActions={(row) => (
            <TooltipProvider>
              <div className="flex items-center gap-1 justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetail(row)
                      }}
                      className="size-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Lihat Detail</TooltipContent>
                </Tooltip>

                {canManage && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(row)
                          }}
                          className="size-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                        >
                          <Edit className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit Data</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteItem(row)
                            setIsDeleteOpen(true)
                          }}
                          className="size-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Hapus</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </TooltipProvider>
          )}
        />
      </div>

      {/* ── Form Dialog (Create / Edit) ─────────────────────────────────────── */}
      <HeroFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingItem ? `Edit Sewa Rumah (${editingItem.rentalCode})` : 'Tambah Sewa Rumah & Mess Baru'}
        description="Lengkapi data sewa properti akomodasi operasional General Affairs"
        onSubmit={handleSubmitForm}
        isSubmitting={isSubmitting}
        submitLabel={editingItem ? 'Simpan Perubahan' : 'Tambahkan Sewa Rumah'}
        maxWidth="2xl"
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroFormField label="Kode Unit / Rental Code" tooltip="Opsional, akan dibuat otomatis jika dikosongkan (contoh: HR-009)">
              <HeroInput
                placeholder="Contoh: HR-001 (Otomatis jika kosong)"
                value={formData.rentalCode || ''}
                onChange={(e) => setFormData((p) => ({ ...p, rentalCode: e.target.value }))}
              />
            </HeroFormField>

            <HeroFormField label="Lokasi Kerja" required tooltip="Nama site atau kota operasional">
              <HeroInput
                placeholder="Contoh: CK MHU, PT Vale Sorowako, Balikpapan"
                value={formData.workLocation}
                onChange={(e) => setFormData((p) => ({ ...p, workLocation: e.target.value }))}
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroFormField label="Keterangan / Nama Properti" required tooltip="Contoh: Mess Karyawan (2), Sewa Rumah M. Asprin">
              <HeroInput
                placeholder="Contoh: Mess Karyawan (1)"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </HeroFormField>

            <HeroFormField label="Tipe Properti" required>
              <HeroSearchableSelect
                value={formData.propertyType}
                onChange={(val) => setFormData((p) => ({ ...p, propertyType: String(val) }))}
                options={PROPERTY_TYPES}
                placeholder="Pilih tipe properti"
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HeroFormField label="Nama Pemilik (Owner)" required>
              <HeroInput
                placeholder="Nama pemilik rumah / landlord"
                value={formData.ownerName}
                onChange={(e) => setFormData((p) => ({ ...p, ownerName: e.target.value }))}
              />
            </HeroFormField>

            <HeroFormField label="No. Telepon / WA Pemilik">
              <HeroInput
                placeholder="Contoh: 08123456789"
                value={formData.ownerPhone || ''}
                onChange={(e) => setFormData((p) => ({ ...p, ownerPhone: e.target.value }))}
              />
            </HeroFormField>

            <HeroFormField label="Bank & Rekening Pemilik">
              <HeroInput
                placeholder="Contoh: BCA 1234567890 a.n Triyanto"
                value={formData.ownerBank || ''}
                onChange={(e) => setFormData((p) => ({ ...p, ownerBank: e.target.value }))}
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroFormField label="Tanggal Mulai Sewa" required>
              <HeroDatePicker
                value={formData.contractStart}
                onChange={(val) => setFormData((p) => ({ ...p, contractStart: typeof val === 'string' ? val : val instanceof Date ? val.toISOString() : '' }))}
                placeholder="Pilih tanggal mulai"
              />
            </HeroFormField>

            <HeroFormField label="Tanggal Berakhir Sewa" required>
              <HeroDatePicker
                value={formData.contractEnd}
                onChange={(val) => setFormData((p) => ({ ...p, contractEnd: typeof val === 'string' ? val : val instanceof Date ? val.toISOString() : '' }))}
                placeholder="Pilih tanggal berakhir"
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroFormField label="Biaya Sewa (Cost Rent)" required>
              <HeroNumberInput
                value={formData.costRent}
                onChange={(val) => setFormData((p) => ({ ...p, costRent: val ?? 0 }))}
                placeholder="Nominal biaya sewa (Rp)"
              />
            </HeroFormField>

            <HeroFormField label="Siklus Pembayaran">
              <HeroSearchableSelect
                value={formData.paymentCycle || 'yearly'}
                onChange={(val) => setFormData((p) => ({ ...p, paymentCycle: String(val) }))}
                options={PAYMENT_CYCLES}
                placeholder="Pilih siklus pembayaran"
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroFormField label="Status Kontrak Sewa">
              <HeroSearchableSelect
                value={formData.status || 'active'}
                onChange={(val) => setFormData((p) => ({ ...p, status: String(val) }))}
                options={STATUS_OPTIONS}
                placeholder="Pilih status"
              />
            </HeroFormField>

            <HeroFormField label="Catatan Perpanjangan / Lanjut Sewa" tooltip="Contoh: Perpanjangan bulanan Rp 4.000.000 / bulan, Tidak lanjut sewa">
              <HeroInput
                placeholder="Contoh: Perpanjangan bulanan Rp 4.000.000 / bulan"
                value={formData.extensionNotes || ''}
                onChange={(e) => setFormData((p) => ({ ...p, extensionNotes: e.target.value }))}
              />
            </HeroFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroFormField label="Kapasitas Penghuni (Orang)">
              <HeroInput
                type="number"
                placeholder="Jumlah kapasitas orang"
                value={formData.capacity ? String(formData.capacity) : ''}
                onChange={(e) => setFormData((p) => ({ ...p, capacity: parseInt(e.target.value, 10) || 0 }))}
              />
            </HeroFormField>

            <HeroFormField label="Karyawan Penghuni Khusus (Opsional)" tooltip="Jika rumah dinas diperuntukkan karyawan tertentu">
              <HeroSearchableSelect
                value={formData.assignedEmployeeId ? String(formData.assignedEmployeeId) : ''}
                onChange={(val) => {
                  const emp = employeesList.find((e) => String(e.id) === String(val))
                  setFormData((p) => ({
                    ...p,
                    assignedEmployeeId: val ? Number(val) : null,
                    assignedEmployeeName: emp?.name || '',
                  }))
                }}
                options={employeesList.map((e) => ({
                  value: String(e.id),
                  label: `${e.name} (${e.employeeSn || '-'}) - ${e.jobTitle || e.department || ''}`,
                }))}
                placeholder="Pilih karyawan penghuni"
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Alamat Lengkap Properti">
            <HeroInput
              placeholder="Alamat lengkap jalan, RT/RW, kelurahan/kecamatan"
              value={formData.address || ''}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
            />
          </HeroFormField>

          <HeroFormField label="Berkas Dokumen Perjanjian Sewa / Kontrak (PDF/Doc)">
            <HeroFileUpload
              value={formData.contractDocumentUrl || ''}
              accept=".pdf,.doc,.docx"
              maxSizeMb={10}
              onChange={(url) => setFormData((p) => ({ ...p, contractDocumentUrl: url || '' }))}
            />
          </HeroFormField>

          <HeroFormField label="Catatan Tambahan GA">
            <HeroTextarea
              placeholder="Catatan tambahan mengenai fasilitas mess, kondisi bangunan, dll."
              value={formData.notes || ''}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* ── Detail Modal (Official Document-Style Preview) ───────────────────── */}
      {detailItem && (
        <HeroDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={`${detailItem.rentalCode} - ${detailItem.description}`}
          subtitle={`Lokasi Kerja: ${detailItem.workLocation} | Pemilik: ${detailItem.ownerName}`}
          statusBadge={
            <HeroStatusBadge
              status={detailItem.status || 'active'}
              editable={canManage}
              options={STATUS_OPTIONS}
              onChange={(st) => {
                handleInlineStatusChange(detailItem, st)
                setDetailItem((prev) => (prev ? { ...prev, status: st } : null))
              }}
            />
          }
          onEdit={
            canManage
              ? () => {
                  setIsDetailOpen(false)
                  handleOpenEdit(detailItem)
                }
              : undefined
          }
        >
          <div className="space-y-5 py-2">
            {/* Status & Highlights */}
            {detailItem.extensionNotes && (
              <div
                className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
                  detailItem.extensionNotes.toLowerCase().includes('tidak lanjut')
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>
                    <strong>Catatan Perpanjangan / Status Lanjut:</strong> {detailItem.extensionNotes}
                  </span>
                </div>
              </div>
            )}

            {/* Grid 1: Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border bg-slate-50/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="size-3.5 text-blue-600" />
                  Informasi Properti
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kode Rental:</span>
                    <span className="font-semibold text-foreground font-mono">{detailItem.rentalCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lokasi Kerja:</span>
                    <span className="font-semibold text-foreground">{detailItem.workLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipe Properti:</span>
                    <span className="font-medium text-foreground">{detailItem.propertyType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kapasitas:</span>
                    <span className="font-medium text-foreground">
                      {detailItem.capacity ? `${detailItem.capacity} Orang` : '-'}
                    </span>
                  </div>
                  {detailItem.assignedEmployeeName && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Penghuni Utama:</span>
                      <span className="font-semibold text-blue-600">{detailItem.assignedEmployeeName}</span>
                    </div>
                  )}
                  {detailItem.address && (
                    <div className="pt-1 border-t text-[11px] text-slate-600">
                      <span className="text-slate-400 block mb-0.5">Alamat Lengkap:</span>
                      {detailItem.address}
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 2: Owner & Finance */}
              <div className="p-4 rounded-xl border bg-slate-50/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="size-3.5 text-blue-600" />
                  Pemilik & Finansial
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Pemilik:</span>
                    <span className="font-semibold text-foreground">{detailItem.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Kontak:</span>
                    <span className="font-medium text-foreground">{detailItem.ownerPhone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rekening Pembayaran:</span>
                    <span className="font-medium text-foreground">{detailItem.ownerBank || '-'}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-slate-500">Biaya Sewa:</span>
                    <span className="font-bold text-sm text-foreground">{formatRupiah(detailItem.costRent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Siklus Pembayaran:</span>
                    <span className="font-medium text-foreground uppercase text-[11px]">
                      {detailItem.paymentCycle === 'yearly'
                        ? 'Tahunan'
                        : detailItem.paymentCycle === 'monthly'
                        ? 'Bulanan'
                        : detailItem.paymentCycle === '6_months'
                        ? '6 Bulan'
                        : 'Kustom'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 3: Contract Period & Duration */}
            <div className="p-4 rounded-xl border bg-slate-50/60 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5 text-blue-600" />
                Periode & Durasi Kontrak
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border">
                  <span className="text-slate-400 block text-[10px] uppercase">Mulai Sewa</span>
                  <span className="font-bold text-sm text-foreground">{formatIndoDate(detailItem.contractStart)}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <span className="text-slate-400 block text-[10px] uppercase">Berakhir Sewa</span>
                  <span className="font-bold text-sm text-foreground">{formatIndoDate(detailItem.contractEnd)}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <span className="text-slate-400 block text-[10px] uppercase">Durasi Total</span>
                  <span className="font-bold text-sm text-blue-600">
                    {calculateRentalDuration(detailItem.contractStart, detailItem.contractEnd)}
                  </span>
                </div>
              </div>
            </div>

            {/* Attached Documents */}
            {detailItem.contractDocumentUrl && (
              <div className="p-4 rounded-xl border bg-slate-50/60 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="size-3.5 text-blue-600" />
                  Dokumen Kontrak Perjanjian Sewa
                </h4>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <FileText className="size-5 text-rose-500" />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {detailItem.contractDocumentName || `Dokumen Kontrak - ${detailItem.rentalCode}.pdf`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Tersimpan di S3 Cloud Storage</p>
                    </div>
                  </div>
                  <a
                    href={resolveUploadUrl(detailItem.contractDocumentUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Download className="size-3.5" />
                    Unduh / Lihat PDF
                  </a>
                </div>
              </div>
            )}

            {detailItem.notes && (
              <div className="p-3 rounded-lg border bg-slate-50 text-xs text-slate-700">
                <span className="font-semibold block text-slate-500 mb-0.5">Catatan GA:</span>
                {detailItem.notes}
              </div>
            )}
          </div>
        </HeroDetailModal>
      )}

      {/* ── Confirm Delete Single Dialog ────────────────────────────────────── */}
      <HeroConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Hapus Data Sewa Rumah?"
        description={
          deleteItem
            ? `Apakah Anda yakin ingin menghapus ${deleteItem.rentalCode} (${deleteItem.description} di ${deleteItem.workLocation})? Tindakan ini tidak dapat dibatalkan.`
            : 'Tindakan ini tidak dapat dibatalkan.'
        }
        confirmLabel="Hapus Data"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Confirm Bulk Delete Dialog ──────────────────────────────────────── */}
      <HeroConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`Hapus ${bulkDeleteIds.length} Data Sewa Rumah?`}
        description={`Apakah Anda yakin ingin menghapus ${bulkDeleteIds.length} unit sewa rumah terpilih secara permanen? Data yang telah dihapus tidak dapat dipulihkan.`}
        confirmLabel="Hapus Semua Terpilih"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isBulkProcessing}
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  )
}
