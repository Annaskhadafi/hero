'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck,
  Loader2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  importCapexBudgetsAction,
  type ImportCapexBudgetItem,
  type ImportCapexBudgetResult,
} from '../actions'
import { downloadCapexBudgetTemplate } from '@/lib/excel/capex-budget-template'

interface BudgetImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function normalizeHeaderKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function BudgetImportDialog({ open, onOpenChange }: BudgetImportDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedItems, setParsedItems] = useState<ImportCapexBudgetItem[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [resultReport, setResultReport] = useState<ImportCapexBudgetResult | null>(null)

  const handleReset = () => {
    setSelectedFile(null)
    setParsedItems([])
    setPreviewRows([])
    setParseError(null)
    setResultReport(null)
  }

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleReset()
    }
    onOpenChange(isOpen)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setParseError(null)
    setResultReport(null)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      if (!worksheet) {
        setParseError('Lembar kerja (sheet) pada file kosong atau tidak terbaca.')
        return
      }

      // Read raw array of objects
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

      if (rawRows.length === 0) {
        setParseError('File Excel tidak memuat baris data yang valid.')
        return
      }

      // Map rows to canonical items
      const items: ImportCapexBudgetItem[] = []
      const currentYear = new Date().getFullYear()

      for (const row of rawRows) {
        let fiscalYear = currentYear
        let budgetCode = ''
        let budgetName = ''
        let assetCategory = 'IT Device'
        let siteName = ''
        let departmentName = ''
        let allocatedAmount = 0
        let notes = ''

        for (const [key, value] of Object.entries(row)) {
          const normKey = normalizeHeaderKey(key)
          const valStr = String(value ?? '').trim()

          if (normKey.includes('tahun') || normKey.includes('fiscalyear') || normKey === 'year') {
            const yr = parseInt(valStr, 10)
            if (!isNaN(yr) && yr > 2000 && yr < 2100) fiscalYear = yr
          } else if (normKey.includes('kode') || normKey.includes('code')) {
            budgetCode = valStr.toUpperCase()
          } else if (normKey.includes('nama') || normKey.includes('name') || normKey.includes('deskripsi')) {
            budgetName = valStr
          } else if (normKey.includes('kategori') || normKey.includes('category')) {
            if (valStr) assetCategory = valStr
          } else if (normKey.includes('site') || normKey.includes('lokasi')) {
            siteName = valStr
          } else if (normKey.includes('dept') || normKey.includes('departemen') || normKey.includes('department')) {
            departmentName = valStr
          } else if (normKey.includes('pagu') || normKey.includes('allocated') || normKey.includes('amount') || normKey.includes('total')) {
            const cleanNum = valStr.replace(/[^0-9.-]/g, '')
            const num = parseFloat(cleanNum)
            if (!isNaN(num)) allocatedAmount = num
          } else if (normKey.includes('catatan') || normKey.includes('notes') || normKey.includes('keterangan')) {
            notes = valStr
          }
        }

        if (budgetCode || budgetName || allocatedAmount > 0) {
          items.push({
            fiscalYear,
            budgetCode,
            budgetName,
            assetCategory,
            siteName: siteName || undefined,
            departmentName: departmentName || undefined,
            allocatedAmount,
            notes: notes || undefined,
          })
        }
      }

      if (items.length === 0) {
        setParseError('Tidak ditemukan baris data yang memiliki kolom Kode Anggaran, Nama, atau Pagu.')
        return
      }

      setParsedItems(items)
      setPreviewRows(items.slice(0, 5))
    } catch (err: any) {
      setParseError(`Gagal membaca berkas Excel: ${err?.message || 'Format tidak didukung'}`)
    }
  }

  const handleExecuteImport = () => {
    if (parsedItems.length === 0) {
      toast.error('Tidak ada data yang siap diimpor.')
      return
    }

    startTransition(async () => {
      const res = await importCapexBudgetsAction(parsedItems)
      setResultReport(res)

      if (res.success) {
        toast.success(res.message)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:rounded-xl">
        {/* HEADER */}
        <DialogHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
                <FileSpreadsheet className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Import Pagu Anggaran CapEx
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Unggah berkas spreadsheet Excel (.xlsx, .xls) atau CSV untuk input massal akun anggaran.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCapexBudgetTemplate}
              className="h-9 gap-1.5 border-slate-200 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              <Download className="size-3.5 text-emerald-600" />
              Download Template (.xlsx)
            </Button>
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {/* UPLOAD DROPZONE */}
          {!resultReport && (
            <div className="space-y-3">
              <label
                htmlFor="budget-import-file-input"
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  selectedFile
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  id="budget-import-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`grid size-12 place-items-center rounded-full ${
                      selectedFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {selectedFile ? <FileCheck className="size-6" /> : <Upload className="size-6" />}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedFile ? selectedFile.name : 'Pilih atau Tarik Berkas Excel / CSV ke Sini'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Format didukung: .xlsx, .xls, .csv · Maksimal 10 MB
                    </p>
                  </div>

                  {selectedFile && (
                    <Badge variant="outline" className="mt-1 border-emerald-200 bg-white font-mono text-[10px] text-emerald-700">
                      {parsedItems.length} baris data terdeteksi
                    </Badge>
                  )}
                </div>
              </label>

              {parseError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* PREVIEW TABLE (TOP 5 ROWS) */}
          {!resultReport && previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pratinjau Data (5 Baris Pertama)
                </span>
                <span className="text-[11px] text-slate-500">
                  Total: <strong className="text-slate-800">{parsedItems.length}</strong> akun anggaran
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="text-[10px] font-bold uppercase text-slate-600">Thn</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-600">Kode</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-600">Nama Anggaran</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-600">Kategori</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-600">Site</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-slate-600">Departemen</TableHead>
                      <TableHead className="text-right text-[10px] font-bold uppercase text-slate-600">Pagu (Rp)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-mono text-[11px] text-slate-500">{row.fiscalYear}</TableCell>
                        <TableCell className="font-mono text-[11px] font-bold text-blue-700">{row.budgetCode || '-'}</TableCell>
                        <TableCell className="max-w-[180px] truncate font-medium text-slate-800" title={row.budgetName}>
                          {row.budgetName || '-'}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600">{row.assetCategory}</TableCell>
                        <TableCell className="text-[11px] text-slate-700 font-medium">{row.siteName || 'Global'}</TableCell>
                        <TableCell className="text-[11px] text-slate-500">{row.departmentName || 'Semua Dept'}</TableCell>
                        <TableCell className="text-right font-medium text-slate-900">
                          {formatRupiah(row.allocatedAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-[11px] text-slate-400">
                * Sistem otomatis memperbarui data jika Kode Anggaran sudah terdaftar, atau menambahkan data baru jika belum ada.
              </p>
            </div>
          )}

          {/* RESULT REPORT / SUMMARY */}
          {resultReport && (
            <div className="space-y-4">
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  resultReport.success ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                    resultReport.success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {resultReport.success ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">
                    {resultReport.success ? 'Proses Import Selesai' : 'Gagal Menyimpan Data'}
                  </h4>
                  <p className="text-xs text-slate-600">{resultReport.message}</p>
                </div>
              </div>

              {/* STATS BADGES */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                  <span className="block text-[11px] font-semibold text-slate-500">Pagu Baru Ditambahkan</span>
                  <span className="text-lg font-bold text-emerald-700">{resultReport.insertedCount}</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                  <span className="block text-[11px] font-semibold text-slate-500">Pagu Diperbarui</span>
                  <span className="text-lg font-bold text-blue-700">{resultReport.updatedCount}</span>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                  <span className="block text-[11px] font-semibold text-slate-500">Baris Dilewati</span>
                  <span className="text-lg font-bold text-slate-600">{resultReport.skippedCount}</span>
                </div>
              </div>

              {/* WARNINGS LIST IF ANY */}
              {resultReport.warnings && resultReport.warnings.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="size-4 text-amber-600" />
                    <span>Catatan &amp; Baris yang Dilewati ({resultReport.warnings.length})</span>
                  </div>
                  <ul className="max-h-36 list-disc space-y-1 overflow-y-auto pl-5 text-[11px] text-amber-800">
                    {resultReport.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          {resultReport ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleDialogChange(false)}
              className="h-9 bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Selesai &amp; Tutup
            </Button>
          ) : (
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDialogChange(false)}
                className="h-9 border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPending || parsedItems.length === 0}
                onClick={handleExecuteImport}
                className="h-9 gap-1.5 bg-slate-900 px-5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Memproses {parsedItems.length} Pagu...
                  </>
                ) : (
                  <>
                    <Upload className="size-3.5" />
                    Impor {parsedItems.length} Pagu Anggaran
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
