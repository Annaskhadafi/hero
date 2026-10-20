'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  DollarSign,
  TrendingDown,
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PieChart,
} from 'lucide-react'
import { toast } from 'sonner'
import { saveCapexBudgetAction } from '../actions'
import type { CerCapexBudget } from '@/db/schema/cer'

export interface CerBudgetControllerPanelProps {
  budgets: CerCapexBudget[]
  sites: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string }>
  onRefresh?: () => void
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

export function CerBudgetControllerPanel({
  budgets,
  sites,
  departments,
  onRefresh,
}: CerBudgetControllerPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Form State for Adding / Editing Budget
  const [formFiscalYear, setFormFiscalYear] = useState<number>(new Date().getFullYear())
  const [formSiteId, setFormSiteId] = useState<number | undefined>(undefined)
  const [formDeptId, setFormDeptId] = useState<number | undefined>(undefined)
  const [formCategory, setFormCategory] = useState<string>('IT Device')
  const [formBudgetCode, setFormBudgetCode] = useState<string>('')
  const [formBudgetName, setFormBudgetName] = useState<string>('')
  const [formAllocatedAmount, setFormAllocatedAmount] = useState<number>(50000000)
  const [formNotes, setFormNotes] = useState<string>('')

  // Filter budgets
  const filteredBudgets = budgets.filter((b) => {
    const matchYear = b.fiscalYear === selectedYear
    const matchSearch =
      !searchQuery ||
      b.budgetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.budgetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.assetCategory.toLowerCase().includes(searchQuery.toLowerCase())
    return matchYear && matchSearch
  })

  // Summary KPIs
  const totalAllocated = filteredBudgets.reduce((sum, b) => sum + (Number(b.allocatedAmount) || 0), 0)
  const totalUsed = filteredBudgets.reduce((sum, b) => sum + (Number(b.usedAmount) || 0), 0)
  const totalRemaining = totalAllocated - totalUsed
  const usagePercentage = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0

  const handleSaveBudget = () => {
    if (!formBudgetCode.trim()) {
      toast.error('Kode Anggaran wajib diisi.')
      return
    }
    if (!formBudgetName.trim()) {
      toast.error('Nama Anggaran wajib diisi.')
      return
    }
    if (formAllocatedAmount <= 0) {
      toast.error('Pagu Anggaran harus lebih besar dari 0.')
      return
    }

    startTransition(async () => {
      const res = await saveCapexBudgetAction({
        fiscalYear: formFiscalYear,
        siteId: formSiteId || null,
        departmentId: formDeptId || null,
        assetCategory: formCategory,
        budgetCode: formBudgetCode,
        budgetName: formBudgetName,
        allocatedAmount: formAllocatedAmount,
        notes: formNotes,
      })

      if (res.success) {
        toast.success(res.message)
        setIsModalOpen(false)
        setFormBudgetCode('')
        setFormBudgetName('')
        if (onRefresh) onRefresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Pagu CapEx ({selectedYear})</span>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900">
              Rp {new Intl.NumberFormat('id-ID').format(totalAllocated)}
            </p>
            <span className="text-[11px] text-slate-400">{filteredBudgets.length} Akun Anggaran</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Terpakai / Komitmen</span>
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-lg font-bold text-amber-600">
              Rp {new Intl.NumberFormat('id-ID').format(totalUsed)}
            </p>
            <span className="text-[11px] text-slate-400">{usagePercentage}% dari total pagu</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Sisa Saldo Pagu</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-lg font-bold text-emerald-700">
              Rp {new Intl.NumberFormat('id-ID').format(totalRemaining)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">Tersedia untuk pengadaan</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Realisasi Anggaran</span>
              <PieChart className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-3 space-y-1">
              <Progress value={usagePercentage} className="h-2" />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{usagePercentage}%</span>
                <span>{100 - usagePercentage}% Tersisa</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Budget Table Shell */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Database Anggaran CapEx (Budget Controller)
              </CardTitle>
              <CardDescription className="text-xs">
                Kelola pagu anggaran pengadaan aset modal per tahun, site, dan kategori.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>

              <Input
                placeholder="Cari kode/nama anggaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 text-xs"
              />

              <Button
                type="button"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-8 gap-1 bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Pagu CapEx
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-12 text-center text-xs">No</TableHead>
                <TableHead className="text-xs">Kode &amp; Nama Anggaran</TableHead>
                <TableHead className="text-xs">Kategori Aset</TableHead>
                <TableHead className="text-xs">Site / Dept</TableHead>
                <TableHead className="text-right text-xs">Total Pagu (Rp)</TableHead>
                <TableHead className="text-right text-xs">Terpakai (Rp)</TableHead>
                <TableHead className="text-right text-xs">Sisa Saldo (Rp)</TableHead>
                <TableHead className="w-28 text-center text-xs">Penyerapan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-500">
                    Belum ada data pagu CapEx untuk tahun {selectedYear}. Klik &quot;Tambah Pagu CapEx&quot; untuk
                    menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBudgets.map((b, idx) => {
                  const alloc = Number(b.allocatedAmount)
                  const used = Number(b.usedAmount)
                  const rem = Number(b.remainingAmount)
                  const pct = alloc > 0 ? Math.min(100, Math.round((used / alloc) * 100)) : 0
                  const siteName = sites.find((s) => s.id === b.siteId)?.name || 'Semua Site'
                  const deptName = departments.find((d) => d.id === b.departmentId)?.name || 'Semua Dept'

                  return (
                    <TableRow key={b.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-center text-xs text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-slate-800">{b.budgetName}</span>
                          <span className="font-mono text-[11px] text-blue-600">{b.budgetCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {b.assetCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {siteName} / {deptName}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs text-slate-800">
                        Rp {new Intl.NumberFormat('id-ID').format(alloc)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs text-amber-600">
                        Rp {new Intl.NumberFormat('id-ID').format(used)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs text-emerald-700">
                        Rp {new Intl.NumberFormat('id-ID').format(rem)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress
                            value={pct}
                            className={`h-1.5 ${pct > 90 ? 'bg-amber-100' : 'bg-slate-100'}`}
                          />
                          <span className="block text-center text-[10px] text-slate-500">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add CapEx Budget Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tambah Pagu Anggaran CapEx</DialogTitle>
            <DialogDescription className="text-xs">
              Buat pagu anggaran baru untuk validasi Budget Controller pengadaan aset modal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Tahun Anggaran</Label>
                <Input
                  type="number"
                  value={formFiscalYear}
                  onChange={(e) => setFormFiscalYear(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Kategori Aset</Label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Kode Anggaran</Label>
              <Input
                placeholder="Contoh: CAPEX-2026-IT-001"
                value={formBudgetCode}
                onChange={(e) => setFormBudgetCode(e.target.value.toUpperCase())}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Nama / Deskripsi Anggaran</Label>
              <Input
                placeholder="Contoh: Pengadaan Laptop & Workstation Developer"
                value={formBudgetName}
                onChange={(e) => setFormBudgetName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Site (Opsional)</Label>
                <select
                  value={formSiteId ?? ''}
                  onChange={(e) => setFormSiteId(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="">Semua Site (Global)</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Departemen (Opsional)</Label>
                <select
                  value={formDeptId ?? ''}
                  onChange={(e) => setFormDeptId(e.target.value ? Number(e.target.value) : undefined)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="">Semua Departemen</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Total Pagu Anggaran (Rp)</Label>
              <Input
                type="number"
                min={0}
                step={1000000}
                value={formAllocatedAmount}
                onChange={(e) => setFormAllocatedAmount(Number(e.target.value))}
                className="h-8 text-xs font-semibold"
              />
              <span className="text-[11px] text-slate-500">
                Terbilang: Rp {new Intl.NumberFormat('id-ID').format(formAllocatedAmount)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBudget}
              disabled={isPending}
              className="bg-blue-700 text-xs font-bold text-white hover:bg-blue-800"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                'Simpan Pagu Anggaran'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
