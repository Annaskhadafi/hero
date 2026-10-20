'use client'

import { useState, useTransition, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  Users,
  Home,
  Star,
  MapPin,
  TrendingUp,
  Pencil,
  Trash2,
  PlusCircle,
  Building2,
  Briefcase,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  HeroDataTable,
  HeroKpiCard,
  HeroSearchableSelect,
  HeroFormDialog,
  HeroConfirmDialog,
  HeroFormField,
  HeroInput,
  HeroNumberInput,
  HeroTextarea,
  type HeroColumnDef,
} from '@/components/templates'
import { Badge } from '@/components/ui/badge'
import {
  getCompensationList,
  upsertCompensation,
  deleteCompensation,
  type CompensationRow,
  type CompensationMetrics,
} from '@/app/actions/compensation'
import { COMPENSATION_TYPES, COMPENSATION_TYPE_LABELS } from '@/db/schema/compensation'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type EmployeeOption = {
  id: number
  employeeSn: string
  name: string
  levelName: string
  department: string
  section: string
  site: string
}

type SiteOption = { id: number; name: string }

type Props = {
  initialData: CompensationRow[]
  metrics: CompensationMetrics
  employees: EmployeeOption[]
  sites: SiteOption[]
  levelNames: string[]
  availableTypes?: { value: string; label: string }[]
  canManage: boolean
}

// ─── Badge Renderer ───────────────────────────────────────────────────────────

const STANDARD_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  leadership_allowance: {
    label: 'Leadership Allowance',
    className: 'bg-purple-50 text-purple-700 border-purple-200/80',
  },
  housing_allowance: {
    label: 'Housing Allowance',
    className: 'bg-blue-50 text-blue-700 border-blue-200/80',
  },
  position_site_allowance: {
    label: 'Position Site Allowance',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
}

function CompensationTypeBadge({ type }: { type: string }) {
  const std = STANDARD_BADGE_CONFIG[type]
  if (std) {
    return (
      <Badge
        variant="outline"
        className={cn('px-2.5 py-0.5 text-xs font-medium rounded-md shadow-2xs', std.className)}
      >
        {std.label}
      </Badge>
    )
  }

  // Custom compensation type
  const displayLabel = type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <Badge
      variant="outline"
      className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs"
    >
      {displayLabel}
    </Badge>
  )
}

function formatRupiah(nominal: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(nominal)
}

// Suggestions for custom types
const CUSTOM_SUGGESTIONS = [
  'Communication Allowance',
  'Field Hardship Allowance',
  'Transport Allowance',
  'Meal Allowance',
  'Shift Allowance',
  'Retention Bonus',
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function CompensationClient({
  initialData,
  metrics,
  employees,
  sites,
  levelNames,
  availableTypes = [],
  canManage,
}: Props) {
  const [data, setData] = useState<CompensationRow[]>(initialData)
  const [currentMetrics, setCurrentMetrics] = useState<CompensationMetrics>(metrics)
  const [isPending, startTransition] = useTransition()

  // Filter state
  const [filterSite, setFilterSite] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterType, setFilterType] = useState('')

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<CompensationRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CompensationRow | null>(null)

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [formType, setFormType] = useState('') // 'leadership_allowance' | 'housing_allowance' | 'position_site_allowance' | 'custom'
  const [formCustomType, setFormCustomType] = useState('')
  const [formNominal, setFormNominal] = useState<number | undefined>(0)
  const [formRemarks, setFormRemarks] = useState('')

  // Selected employee helper
  const selectedEmployee = useMemo(() => {
    if (!formEmployeeId) return null
    return employees.find((e) => String(e.id) === formEmployeeId) || null
  }, [formEmployeeId, employees])

  // ── Refresh data ─────────────────────────────────────────────────────────────
  const refreshData = useCallback(
    (siteId?: string, level?: string, type?: string) => {
      startTransition(async () => {
        const fresh = await getCompensationList({
          siteId: siteId ? parseInt(siteId) : undefined,
          levelName: level || undefined,
          compensationType: type || undefined,
        })
        setData(fresh)
      })
    },
    []
  )

  // ── Open add dialog ───────────────────────────────────────────────────────────
  function handleAdd() {
    setEditingRow(null)
    setFormEmployeeId('')
    setFormType('leadership_allowance')
    setFormCustomType('')
    setFormNominal(0)
    setFormRemarks('')
    setIsFormOpen(true)
  }

  // ── Open edit dialog ──────────────────────────────────────────────────────────
  function handleEdit(row: CompensationRow) {
    setEditingRow(row)
    setFormEmployeeId(String(row.employeeId))

    const isStandard = ['leadership_allowance', 'housing_allowance', 'position_site_allowance'].includes(
      row.compensationType
    )
    if (isStandard) {
      setFormType(row.compensationType)
      setFormCustomType('')
    } else {
      setFormType('custom')
      setFormCustomType(row.compensationType)
    }

    setFormNominal(row.nominal)
    setFormRemarks(row.remarks)
    setIsFormOpen(true)
  }

  // ── Submit form ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!formEmployeeId) {
      toast.error('Pilih karyawan terlebih dahulu')
      return
    }

    let finalType = formType
    if (formType === 'custom') {
      const trimmed = formCustomType.trim()
      if (!trimmed) {
        toast.error('Ketik nama jenis kompensasi kustom yang ingin ditambahkan')
        return
      }
      finalType = trimmed
    }

    if (!finalType) {
      toast.error('Jenis kompensasi wajib dipilih atau diisi')
      return
    }

    const nominalValue = Number(formNominal || 0)
    if (nominalValue <= 0) {
      toast.error('Nominal kompensasi harus lebih dari Rp 0')
      return
    }

    const result = await upsertCompensation({
      id: editingRow?.id,
      employeeId: parseInt(formEmployeeId),
      compensationType: finalType,
      nominal: nominalValue,
      remarks: formRemarks,
    })

    if (result.success) {
      toast.success(editingRow ? 'Data kompensasi berhasil diperbarui' : 'Data kompensasi berhasil ditambahkan')
      setIsFormOpen(false)
      refreshData(filterSite, filterLevel, filterType)
    } else {
      toast.error(result.error ?? 'Terjadi kesalahan saat menyimpan')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    const result = await deleteCompensation(deleteTarget.id)
    if (result.success) {
      toast.success('Data kompensasi berhasil dihapus')
      setDeleteTarget(null)
      refreshData(filterSite, filterLevel, filterType)
    } else {
      toast.error(result.error ?? 'Gagal menghapus data')
    }
  }

  // ── Apply / Reset filters ─────────────────────────────────────────────────────
  function handleApplyFilters() {
    refreshData(filterSite, filterLevel, filterType)
  }

  function handleResetFilters() {
    setFilterLevel('')
    setFilterSite('')
    setFilterType('')
    refreshData('', '', '')
  }

  // ── Quick Nominal Presets ─────────────────────────────────────────────────────
  function addNominal(amount: number) {
    setFormNominal((prev) => (Number(prev || 0) + amount))
  }

  // ─── Column definitions ───────────────────────────────────────────────────────
  const columns: HeroColumnDef<CompensationRow>[] = [
    {
      key: 'employeeSn',
      header: 'SN',
      sortable: true,
      className: 'w-[110px]',
      render: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80">
          {row.employeeSn}
        </span>
      ),
      exportValue: (row) => row.employeeSn,
    },
    {
      key: 'name',
      header: 'Nama Karyawan',
      sortable: true,
      className: 'min-w-[180px]',
      render: (row) => (
        <p className="font-semibold text-sm text-slate-900 leading-tight">{row.name}</p>
      ),
      exportValue: (row) => row.name,
    },
    {
      key: 'levelRank',
      header: 'Level',
      sortable: true,
      className: 'w-[130px]',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          {row.levelName || '-'}
        </span>
      ),
      exportValue: (row) => row.levelName || '-',
    },
    {
      key: 'site',
      header: 'Site',
      sortable: true,
      className: 'w-[140px]',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
          <Building2 className="size-3 text-slate-400" />
          {row.site}
        </span>
      ),
      exportValue: (row) => row.site,
    },
    {
      key: 'department',
      header: 'Dept',
      sortable: true,
      className: 'w-[150px]',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-700">
          <Briefcase className="size-3 text-slate-400" />
          {row.department}
        </span>
      ),
      exportValue: (row) => row.department,
    },
    {
      key: 'section',
      header: 'Section',
      sortable: true,
      className: 'w-[140px]',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.section || '-'}</span>
      ),
      exportValue: (row) => row.section || '-',
    },
    {
      key: 'compensationType',
      header: 'Jenis Kompensasi',
      sortable: true,
      className: 'w-[220px]',
      render: (row) => <CompensationTypeBadge type={row.compensationType} />,
      exportValue: (row) =>
        COMPENSATION_TYPE_LABELS[row.compensationType] ?? row.compensationType,
    },
    {
      key: 'nominal',
      header: 'Nominal',
      sortable: true,
      align: 'right',
      className: 'w-[160px]',
      render: (row) => (
        <span className="font-bold text-sm tabular-nums text-slate-900">
          {formatRupiah(row.nominal)}
        </span>
      ),
      exportValue: (row) => row.nominal,
    },
    {
      key: 'remarks',
      header: 'Remarks',
      className: 'min-w-[160px]',
      render: (row) => (
        <span className="text-xs text-muted-foreground line-clamp-2">
          {row.remarks || '-'}
        </span>
      ),
      exportValue: (row) => row.remarks || '-',
    },
    ...(canManage
      ? [
          {
            key: 'actions' as keyof CompensationRow,
            header: 'Aksi',
            align: 'right' as const,
            className: 'w-[90px]',
            render: (row: CompensationRow) => (
              <div className="flex items-center justify-end gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(row)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Kompensasi</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-rose-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(row)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus Data</TooltipContent>
                </Tooltip>
              </div>
            ),
          },
        ]
      : []),
  ]

  // ─── Select options ───────────────────────────────────────────────────────────
  const employeeSelectOptions = employees.map((emp) => ({
    value: String(emp.id),
    label: `${emp.employeeSn} — ${emp.name}`,
    description: `${emp.levelName} · ${emp.department} · ${emp.site}`,
  }))

  const siteFilterOptions = sites.map((s) => ({ value: String(s.id), label: s.name }))
  const levelFilterOptions = levelNames.map((l) => ({ value: l, label: l }))

  // Filter types combining standard and any custom from availableTypes
  const typeFilterOptions = useMemo(() => {
    const list = availableTypes.length > 0 ? availableTypes : COMPENSATION_TYPES
    return list.map((t) => ({
      value: t.value,
      label: COMPENSATION_TYPE_LABELS[t.value] || t.label || t.value,
    }))
  }, [availableTypes])

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Banknote className="size-6 text-blue-600" />
            Compensation &amp; Benefit
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola data kompensasi, tunjangan jabatan, dan benefit seluruh karyawan
          </p>
        </div>
        {canManage && (
          <Button onClick={handleAdd} className="h-9 px-4 shadow-sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Tambah Kompensasi
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Karyawan Terdaftar"
          value={currentMetrics.totalEmployees}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
          description="Total karyawan memiliki tunjangan"
        />
        <HeroKpiCard
          title="Leadership Allowance"
          value={formatRupiah(currentMetrics.totalLeadership)}
          icon={<Star className="h-5 w-5" />}
          tone="purple"
          description="Total alokasi leadership allowance"
        />
        <HeroKpiCard
          title="Housing Allowance"
          value={formatRupiah(currentMetrics.totalHousing)}
          icon={<Home className="h-5 w-5" />}
          tone="emerald"
          description="Total alokasi housing allowance"
        />
        <HeroKpiCard
          title="Position Site Allowance"
          value={formatRupiah(currentMetrics.totalPositionSite)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="amber"
          description="Total alokasi position site allowance"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2.5 items-center bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
        <HeroSearchableSelect
          options={levelFilterOptions}
          value={filterLevel}
          onChange={setFilterLevel}
          placeholder="Semua Level"
          className="h-9 w-[180px]"
        />
        <HeroSearchableSelect
          options={siteFilterOptions}
          value={filterSite}
          onChange={setFilterSite}
          placeholder="Semua Site"
          className="h-9 w-[180px]"
        />
        <HeroSearchableSelect
          options={typeFilterOptions}
          value={filterType}
          onChange={setFilterType}
          placeholder="Semua Jenis Kompensasi"
          className="h-9 w-[220px]"
        />
        <Button
          variant="outline"
          onClick={handleApplyFilters}
          disabled={isPending}
          className="h-9 font-medium"
        >
          Terapkan Filter
        </Button>
        {(filterLevel || filterSite || filterType) && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="h-9 text-muted-foreground hover:text-slate-900"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Data Table */}
      <HeroDataTable
        data={data}
        columns={columns}
        idField="id"
        loading={isPending}
        exportFileName="Compensation_Benefit"
        pdfTitle="Laporan Compensation & Benefit Karyawan"
        emptyMessage="Belum ada data kompensasi. Klik 'Tambah Kompensasi' untuk memulai."
        showSelection={false}
        showPagination={true}
      />

      {/* Form Dialog — Add / Edit */}
      <HeroFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingRow ? 'Edit Kompensasi Karyawan' : 'Tambah Kompensasi Karyawan'}
        description={
          editingRow
            ? `Perbarui rincian tunjangan dan benefit untuk ${editingRow.name}`
            : 'Masukkan detail tunjangan dan benefit baru untuk karyawan yang dipilih'
        }
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        submitLabel={editingRow ? 'Simpan Perubahan' : 'Simpan Kompensasi'}
        isSubmitting={isPending}
        maxWidth="xl"
      >
        <div className="space-y-5 py-1">
          {/* Section 1: Pilih Karyawan */}
          <div className="space-y-2">
            <HeroFormField
              label="Pilih Karyawan"
              required
              helperText={editingRow ? 'Karyawan tidak dapat diganti saat mode edit' : undefined}
            >
              <HeroSearchableSelect
                options={employeeSelectOptions}
                value={formEmployeeId}
                onChange={setFormEmployeeId}
                placeholder="Cari berdasarkan SN atau nama karyawan..."
                disabled={!!editingRow}
              />
            </HeroFormField>

            {/* Employee Preview Card */}
            {selectedEmployee && (
              <div className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    {selectedEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{selectedEmployee.name}</p>
                    <p className="font-mono text-[11px] text-slate-500">SN: {selectedEmployee.employeeSn}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="bg-white text-[11px] font-medium border-slate-200">
                    <ShieldCheck className="size-3 mr-1 text-blue-500" />
                    {selectedEmployee.levelName}
                  </Badge>
                  <Badge variant="outline" className="bg-white text-[11px] font-medium border-slate-200">
                    <Briefcase className="size-3 mr-1 text-slate-500" />
                    {selectedEmployee.department}
                  </Badge>
                  <Badge variant="outline" className="bg-white text-[11px] font-medium border-slate-200">
                    <Building2 className="size-3 mr-1 text-slate-500" />
                    {selectedEmployee.site}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Jenis Kompensasi (Interactive Option Cards) */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              Jenis Kompensasi <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Card 1: Leadership Allowance */}
              <button
                type="button"
                onClick={() => setFormType('leadership_allowance')}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer',
                  formType === 'leadership_allowance'
                    ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-400/20 shadow-xs'
                    : 'border-slate-200/90 hover:border-purple-300 hover:bg-slate-50/60'
                )}
              >
                <div
                  className={cn(
                    'size-7 rounded-md flex items-center justify-center shrink-0 text-xs',
                    formType === 'leadership_allowance'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-700'
                  )}
                >
                  <Star className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">Leadership Allowance</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Tunjangan kepemimpinan</div>
                </div>
              </button>

              {/* Card 2: Housing Allowance */}
              <button
                type="button"
                onClick={() => setFormType('housing_allowance')}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer',
                  formType === 'housing_allowance'
                    ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-400/20 shadow-xs'
                    : 'border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/60'
                )}
              >
                <div
                  className={cn(
                    'size-7 rounded-md flex items-center justify-center shrink-0 text-xs',
                    formType === 'housing_allowance'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700'
                  )}
                >
                  <Home className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">Housing Allowance</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Tunjangan tempat tinggal</div>
                </div>
              </button>

              {/* Card 3: Position Site Allowance */}
              <button
                type="button"
                onClick={() => setFormType('position_site_allowance')}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer',
                  formType === 'position_site_allowance'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/20 shadow-xs'
                    : 'border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/60'
                )}
              >
                <div
                  className={cn(
                    'size-7 rounded-md flex items-center justify-center shrink-0 text-xs',
                    formType === 'position_site_allowance'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  <MapPin className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">Position Site Allowance</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Tunjangan penempatan site</div>
                </div>
              </button>

              {/* Card 4: Kustom / Tambah Sendiri */}
              <button
                type="button"
                onClick={() => setFormType('custom')}
                className={cn(
                  'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer',
                  formType === 'custom'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/20 shadow-xs'
                    : 'border-slate-200/90 hover:border-amber-300 hover:bg-slate-50/60'
                )}
              >
                <div
                  className={cn(
                    'size-7 rounded-md flex items-center justify-center shrink-0 text-xs',
                    formType === 'custom'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  <PlusCircle className="size-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-900">+ Tambah Sendiri</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Jenis kompensasi kustom</div>
                </div>
              </button>
            </div>

            {/* Custom Input Field (Appears when 'custom' is active) */}
            {formType === 'custom' && (
              <div className="p-3.5 rounded-lg border border-amber-200/90 bg-amber-50/40 space-y-2.5 animate-in fade-in-50 duration-200">
                <HeroFormField
                  label="Nama Jenis Kompensasi Kustom"
                  required
                  helperText="Ketik nama tunjangan kustom yang ingin ditambahkan"
                >
                  <HeroInput
                    value={formCustomType}
                    onChange={(e) => setFormCustomType(e.target.value)}
                    placeholder="Contoh: Communication Allowance, Field Hardship, dll"
                    autoFocus
                  />
                </HeroFormField>

                {/* Suggestions chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">Saran cepat:</span>
                  {CUSTOM_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFormCustomType(sug)}
                      className={cn(
                        'text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer',
                        formCustomType === sug
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50'
                      )}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Nominal (Rp) with Quick Presets */}
          <div className="space-y-2">
            <HeroFormField
              label="Nominal Kompensasi (Rp)"
              required
              helperText="Besaran nominal tunjangan per bulan"
            >
              <HeroNumberInput
                value={formNominal}
                onChange={setFormNominal}
                placeholder="0"
              />
            </HeroFormField>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-slate-500 font-medium">Preset cepat:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => addNominal(500000)}
              >
                +500 rb
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => addNominal(1000000)}
              >
                +1 jt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => addNominal(2500000)}
              >
                +2.5 jt
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => addNominal(5000000)}
              >
                +5 jt
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-slate-500 hover:text-slate-900"
                onClick={() => setFormNominal(0)}
              >
                <RotateCcw className="size-3 mr-1" />
                Reset (0)
              </Button>
            </div>
          </div>

          {/* Section 4: Remarks */}
          <HeroFormField label="Remarks / Catatan" helperText="Dasar SK, no memo, atau catatan persetujuan (opsional)">
            <HeroTextarea
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Contoh: Berdasarkan SK Penugasan Site No. 12/SK/HR/2026..."
              rows={2}
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* Confirm Delete Dialog */}
      <HeroConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Data Kompensasi"
        description={
          deleteTarget
            ? `Yakin ingin menghapus kompensasi "${COMPENSATION_TYPE_LABELS[deleteTarget.compensationType] || deleteTarget.compensationType}" untuk ${deleteTarget.name}? Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        onConfirm={handleDelete}
        tone="destructive"
        confirmLabel="Ya, Hapus Data"
      />
    </div>
  )
}
