'use client'

import * as React from 'react'
import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  PieChart,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  Building2,
  Layers,
  Pencil,
  Trash2,
  Filter,
  Coins,
  AlertCircle,
  Calendar,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  HeroKpiCard,
  HeroFormDialog,
  HeroConfirmDialog,
  HeroEmptyState,
  HeroFormField,
  HeroInput,
  HeroNumberInput,
  HeroTextarea,
  HeroSearchableSelect,
  type HeroSearchableSelectOption,
} from '@/components/templates'
import {
  saveCapexBudgetAction,
  deleteCapexBudgetAction,
  type BudgetControllerPageData,
} from '../actions'
import type { CerCapexBudget } from '@/db/schema/cer'

export interface BudgetControllerViewProps {
  data: BudgetControllerPageData
}

const ASSET_CATEGORIES = [
  'IT Device',
  'Operational Equipment',
  'Vehicle / Alat Berat',
  'Tools & Workshop',
  'Office Facility',
  'Safety & Emergency',
  'Other',
]

const FISCAL_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

export function BudgetControllerView({ data }: BudgetControllerViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filters state
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<CerCapexBudget | null>(null)
  const [formFiscalYear, setFormFiscalYear] = useState<number>(currentYear)
  const [formSiteId, setFormSiteId] = useState<number | undefined>(undefined)
  const [formDeptId, setFormDeptId] = useState<number | undefined>(undefined)
  const [formCategory, setFormCategory] = useState<string>('IT Device')
  const [formBudgetCode, setFormBudgetCode] = useState<string>('')
  const [formBudgetName, setFormBudgetName] = useState<string>('')
  const [formAllocatedAmount, setFormAllocatedAmount] = useState<number>(50000000)
  const [formNotes, setFormNotes] = useState<string>('')

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<CerCapexBudget | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Options for HeroSearchableSelect
  const fiscalYearOptions = useMemo<HeroSearchableSelectOption[]>(() => {
    return FISCAL_YEARS.map((y) => ({
      value: String(y),
      label: `Tahun ${y}`,
    }))
  }, [])

  const categoryFilterOptions = useMemo<HeroSearchableSelectOption[]>(() => {
    return [
      { value: 'all', label: 'Semua Kategori' },
      ...ASSET_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
    ]
  }, [])

  const categoryFormOptions = useMemo<HeroSearchableSelectOption[]>(() => {
    return ASSET_CATEGORIES.map((cat) => ({ value: cat, label: cat }))
  }, [])

  const siteSelectOptions = useMemo<HeroSearchableSelectOption[]>(() => {
    return [
      { value: '', label: 'Semua Site (Global)' },
      ...data.sites.map((s) => ({ value: String(s.id), label: s.name })),
    ]
  }, [data.sites])

  const deptSelectOptions = useMemo<HeroSearchableSelectOption[]>(() => {
    return [
      { value: '', label: 'Semua Departemen' },
      ...data.departments.map((d) => ({ value: String(d.id), label: d.name })),
    ]
  }, [data.departments])

  // Filter budgets
  const filteredBudgets = useMemo(() => {
    return data.budgets.filter((b) => {
      const matchYear = b.fiscalYear === selectedYear
      const matchCategory =
        selectedCategory === 'all' ||
        b.assetCategory.toLowerCase() === selectedCategory.toLowerCase()
      const q = searchQuery.trim().toLowerCase()
      const matchSearch =
        !q ||
        b.budgetCode.toLowerCase().includes(q) ||
        b.budgetName.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q)) ||
        b.assetCategory.toLowerCase().includes(q)

      return matchYear && matchCategory && matchSearch
    })
  }, [data.budgets, selectedYear, selectedCategory, searchQuery])

  // Summary Metrics
  const totalAllocated = useMemo(() => {
    return filteredBudgets.reduce((acc, b) => acc + (Number(b.allocatedAmount) || 0), 0)
  }, [filteredBudgets])

  const totalUsed = useMemo(() => {
    return filteredBudgets.reduce((acc, b) => acc + (Number(b.usedAmount) || 0), 0)
  }, [filteredBudgets])

  const totalRemaining = totalAllocated - totalUsed
  const usagePercentage = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleOpenCreate = () => {
    setEditingBudget(null)
    setFormFiscalYear(selectedYear || currentYear)
    setFormSiteId(undefined)
    setFormDeptId(undefined)
    setFormCategory('IT Device')
    setFormBudgetCode('')
    setFormBudgetName('')
    setFormAllocatedAmount(50000000)
    setFormNotes('')
    setIsFormOpen(true)
  }

  const handleOpenEdit = (budget: CerCapexBudget) => {
    setEditingBudget(budget)
    setFormFiscalYear(budget.fiscalYear)
    setFormSiteId(budget.siteId ?? undefined)
    setFormDeptId(budget.departmentId ?? undefined)
    setFormCategory(budget.assetCategory)
    setFormBudgetCode(budget.budgetCode)
    setFormBudgetName(budget.budgetName)
    setFormAllocatedAmount(Number(budget.allocatedAmount) || 0)
    setFormNotes(budget.notes || '')
    setIsFormOpen(true)
  }

  const handleSaveSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!formBudgetCode.trim()) {
      toast.error('Kode Anggaran wajib diisi.')
      return
    }
    if (!formBudgetName.trim()) {
      toast.error('Nama Anggaran wajib diisi.')
      return
    }
    if (formAllocatedAmount <= 0) {
      toast.error('Pagu Anggaran harus lebih besar dari Rp 0.')
      return
    }

    startTransition(async () => {
      const res = await saveCapexBudgetAction({
        id: editingBudget?.id,
        fiscalYear: formFiscalYear,
        siteId: formSiteId || null,
        departmentId: formDeptId || null,
        assetCategory: formCategory,
        budgetCode: formBudgetCode.trim().toUpperCase(),
        budgetName: formBudgetName.trim(),
        allocatedAmount: formAllocatedAmount,
        notes: formNotes.trim(),
      })

      if (res.success) {
        toast.success(res.message)
        setIsFormOpen(false)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return

    startTransition(async () => {
      const res = await deleteCapexBudgetAction(deleteTarget.id)
      if (res.success) {
        toast.success(res.message)
        setIsDeleteOpen(false)
        setDeleteTarget(null)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
              <PieChart className="size-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Budget Controller
              </h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Database Pagu Anggaran Capital Expenditure (CapEx) &amp; Kontrol Penyerapan Biaya Pengadaan Aset Perusahaan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="h-9 gap-1.5 border-slate-200 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>

            {data.permissions.canEdit && (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Tambah Pagu CapEx
              </Button>
            )}
          </div>
        </div>

        {/* 4 STANDAR KPI SCORECARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroKpiCard
            title={`Total Pagu CapEx (${selectedYear})`}
            value={formatRupiah(totalAllocated)}
            description={`${filteredBudgets.length} akun anggaran aktif`}
            tone="blue"
            icon={<DollarSign className="size-5" />}
          />

          <HeroKpiCard
            title="Total Terpakai / Komitmen"
            value={formatRupiah(totalUsed)}
            description={`${usagePercentage}% dari total pagu anggaran`}
            tone="amber"
            icon={<TrendingDown className="size-5" />}
          />

          <HeroKpiCard
            title="Sisa Saldo Pagu"
            value={formatRupiah(totalRemaining)}
            description="Tersedia untuk alokasi pengadaan aset"
            tone="emerald"
            icon={<CheckCircle2 className="size-5" />}
          />

          <HeroKpiCard
            title="Realisasi Penyerapan"
            value={`${usagePercentage}%`}
            description={`${100 - usagePercentage}% saldo pagu tersisa`}
            tone="purple"
            icon={<PieChart className="size-5" />}
          />
        </div>

        {/* MAIN CARD: FILTERS & TABLE */}
        <Card className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          {/* TOOLBAR & FILTERS */}
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Search input */}
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode, nama anggaran, kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Right: Select Year & Category Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Year Select */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Tahun:</span>
                  <div className="w-36">
                    <HeroSearchableSelect
                      options={fiscalYearOptions}
                      value={String(selectedYear)}
                      onChange={(val) => setSelectedYear(Number(val))}
                      placeholder="Pilih Tahun"
                    />
                  </div>
                </div>

                {/* Category Select */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Kategori:</span>
                  <div className="w-48">
                    <HeroSearchableSelect
                      options={categoryFilterOptions}
                      value={selectedCategory}
                      onChange={(val) => setSelectedCategory(val)}
                      placeholder="Semua Kategori"
                    />
                  </div>
                </div>

                {/* Reset filter button if modified */}
                {(selectedCategory !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory('all')
                      setSearchQuery('')
                    }}
                    className="h-9 gap-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    <X className="size-3.5" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* TABLE CONTENT */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="w-12 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    No
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Kode &amp; Nama Anggaran
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Kategori Aset
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Site / Departemen
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Total Pagu (Rp)
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Terpakai (Rp)
                  </TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Sisa Saldo (Rp)
                  </TableHead>
                  <TableHead className="w-36 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Penyerapan
                  </TableHead>
                  <TableHead className="w-24 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredBudgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12">
                      <HeroEmptyState
                        title="Tidak Ada Data Pagu Anggaran"
                        description={
                          searchQuery || selectedCategory !== 'all'
                            ? 'Tidak ada akun anggaran yang cocok dengan kriteria filter Anda.'
                            : `Belum ada data pagu CapEx untuk tahun ${selectedYear}. Silakan tambahkan pagu anggaran baru.`
                        }
                        actionLabel={data.permissions.canEdit ? 'Tambah Pagu CapEx' : undefined}
                        onAction={data.permissions.canEdit ? handleOpenCreate : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBudgets.map((b, idx) => {
                    const alloc = Number(b.allocatedAmount) || 0
                    const used = Number(b.usedAmount) || 0
                    const rem = Number(b.remainingAmount) || 0
                    const pct = alloc > 0 ? Math.min(100, Math.round((used / alloc) * 100)) : 0
                    const siteName = data.sites.find((s) => s.id === b.siteId)?.name || 'Semua Site (Global)'
                    const deptName = data.departments.find((d) => d.id === b.departmentId)?.name || 'Semua Dept'
                    const isUsed = used > 0

                    return (
                      <TableRow key={b.id} className="hover:bg-slate-50/70">
                        {/* No */}
                        <TableCell className="text-center font-mono text-xs text-slate-500">
                          {idx + 1}
                        </TableCell>

                        {/* Kode & Nama Anggaran */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-xs text-slate-900">{b.budgetName}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                                {b.budgetCode}
                              </span>
                              {b.notes && (
                                <span className="truncate text-[10px] text-slate-400" title={b.notes}>
                                  • {b.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Kategori */}
                        <TableCell>
                          <Badge variant="outline" className="border-slate-200 bg-slate-50/70 text-[10px] font-medium text-slate-700">
                            {b.assetCategory}
                          </Badge>
                        </TableCell>

                        {/* Site / Dept */}
                        <TableCell>
                          <div className="flex flex-col text-xs text-slate-600">
                            <span className="font-medium text-slate-700">{siteName}</span>
                            <span className="text-[10px] text-slate-400">{deptName}</span>
                          </div>
                        </TableCell>

                        {/* Pagu (Allocated) */}
                        <TableCell className="text-right font-medium text-xs text-slate-900">
                          {formatRupiah(alloc)}
                        </TableCell>

                        {/* Terpakai (Used) */}
                        <TableCell className="text-right font-medium text-xs text-amber-600">
                          {formatRupiah(used)}
                        </TableCell>

                        {/* Sisa Saldo (Remaining) */}
                        <TableCell className="text-right font-bold text-xs text-emerald-700">
                          {formatRupiah(rem)}
                        </TableCell>

                        {/* Penyerapan Progress */}
                        <TableCell>
                          <div className="space-y-1">
                            <Progress
                              value={pct}
                              className={`h-2 ${
                                pct > 90 ? 'bg-rose-100 [&>div]:bg-rose-600' : pct > 70 ? 'bg-amber-100 [&>div]:bg-amber-500' : 'bg-slate-100 [&>div]:bg-emerald-600'
                              }`}
                            />
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                              <span>{pct}%</span>
                              <span className={pct > 90 ? 'text-rose-600' : 'text-slate-400'}>
                                {pct > 90 ? 'Kritis' : 'Normal'}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {data.permissions.canEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEdit(b)}
                                    className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Edit Pagu Anggaran</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {data.permissions.canDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={isUsed}
                                    onClick={() => {
                                      setDeleteTarget(b)
                                      setIsDeleteOpen(true)
                                    }}
                                    className={`h-8 w-8 ${
                                      isUsed
                                        ? 'cursor-not-allowed opacity-40'
                                        : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                                    }`}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">
                                    {isUsed
                                      ? 'Tidak dapat dihapus: telah ada transaksi pemakaian'
                                      : 'Hapus Pagu Anggaran'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* CREATE / EDIT HERO FORM DIALOG */}
        <HeroFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title={editingBudget ? 'Edit Pagu Anggaran CapEx' : 'Tambah Pagu Anggaran CapEx'}
          description="Atur batasan pagu anggaran untuk mengontrol pengadaan aset modal (CER) per tahun, kategori, dan lokasi."
          submitLabel={editingBudget ? 'Perbarui Pagu Anggaran' : 'Simpan Pagu Anggaran'}
          isSubmitting={isPending}
          onSubmit={handleSaveSubmit}
          maxWidth="lg"
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tahun Anggaran */}
              <HeroFormField label="Tahun Anggaran" required>
                <HeroSearchableSelect
                  options={fiscalYearOptions}
                  value={String(formFiscalYear)}
                  onChange={(val) => setFormFiscalYear(Number(val))}
                  placeholder="Pilih Tahun"
                />
              </HeroFormField>

              {/* Kategori Aset */}
              <HeroFormField label="Kategori Aset" required>
                <HeroSearchableSelect
                  options={categoryFormOptions}
                  value={formCategory}
                  onChange={(val) => setFormCategory(val)}
                  placeholder="Pilih Kategori"
                />
              </HeroFormField>
            </div>

            {/* Kode Anggaran */}
            <HeroFormField label="Kode Anggaran" required tooltip="Format unik kode CapEx, misal CAPEX-2026-IT-001">
              <HeroInput
                placeholder="Contoh: CAPEX-2026-IT-001"
                value={formBudgetCode}
                onChange={(e) => setFormBudgetCode(e.target.value.toUpperCase())}
                className="font-mono text-xs font-semibold tracking-wider"
              />
            </HeroFormField>

            {/* Nama Anggaran */}
            <HeroFormField label="Nama / Deskripsi Anggaran" required>
              <HeroInput
                placeholder="Contoh: Pengadaan Laptop & Workstation Developer"
                value={formBudgetName}
                onChange={(e) => setFormBudgetName(e.target.value)}
                className="text-xs font-medium"
              />
            </HeroFormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Site Scope */}
              <HeroFormField label="Site (Opsional)" tooltip="Kosongkan jika berlaku untuk seluruh site (Global)">
                <HeroSearchableSelect
                  options={siteSelectOptions}
                  value={formSiteId ? String(formSiteId) : ''}
                  onChange={(val) => setFormSiteId(val ? Number(val) : undefined)}
                  placeholder="Semua Site (Global)"
                />
              </HeroFormField>

              {/* Department Scope */}
              <HeroFormField label="Departemen (Opsional)" tooltip="Kosongkan jika berlaku untuk semua departemen">
                <HeroSearchableSelect
                  options={deptSelectOptions}
                  value={formDeptId ? String(formDeptId) : ''}
                  onChange={(val) => setFormDeptId(val ? Number(val) : undefined)}
                  placeholder="Semua Departemen"
                />
              </HeroFormField>
            </div>

            {/* Pagu Anggaran (Allocated Amount) */}
            <HeroFormField label="Total Pagu Anggaran (Rp)" required>
              <HeroNumberInput
                value={formAllocatedAmount}
                onChange={(val) => setFormAllocatedAmount(val || 0)}
              />
              <span className="block text-[11px] font-semibold text-emerald-700">
                Terbilang: {formatRupiah(formAllocatedAmount)}
              </span>
            </HeroFormField>

            {/* Catatan / Keterangan */}
            <HeroFormField label="Catatan / Justifikasi">
              <HeroTextarea
                rows={2}
                placeholder="Catatan tambahan mengenai alokasi pagu anggaran ini..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </HeroFormField>
          </div>
        </HeroFormDialog>

        {/* DELETE CONFIRM DIALOG */}
        <HeroConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Hapus Pagu Anggaran CapEx"
          description={`Apakah Anda yakin ingin menghapus akun anggaran "${deleteTarget?.budgetCode} - ${deleteTarget?.budgetName}"? Data pagu yang sudah dihapus tidak dapat dipulihkan.`}
          confirmLabel="Hapus Pagu Anggaran"
          cancelLabel="Batal"
          tone="destructive"
          isProcessing={isPending}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </TooltipProvider>
  )
}
