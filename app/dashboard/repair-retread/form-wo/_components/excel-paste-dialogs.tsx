'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  ClipboardPaste,
  FileSpreadsheet,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ─── Column Definitions ────────────────────────────────────────────────────────

export type ColumnDef = {
  key: string
  label: string
  synonyms: string[]
}

export const SERVICE_EXCEL_COLUMNS: ColumnDef[] = [
  { key: 'description', label: 'Description', synonyms: ['description', 'desc', 'deskripsi', 'rincian', 'pekerjaan'] },
  { key: 'job', label: 'Job', synonyms: ['job', 'pekerjaan', 'job type', 'jenis pekerjaan', 'jenis'] },
  { key: 'customer', label: 'Customer', synonyms: ['customer', 'pelanggan', 'client', 'perusahaan'] },
  { key: 'site', label: 'Site', synonyms: ['site', 'lokasi', 'area', 'proyek'] },
  { key: 'serialNo', label: 'Serial No', synonyms: ['serial no', 'serial', 'sn', 'no seri', 'sn tire', 'tire sn', 'serial number'] },
  { key: 'refNo', label: 'No Surat Jalan / Ref', synonyms: ['no surat jalan / ref', 'surat jalan', 'no surat jalan', 'ref', 'ref no', 'no ref', 'no sj', 'sj'] },
  { key: 'noPo', label: 'Nomor PO', synonyms: ['nomor po', 'no po', 'po number', 'po', 'no. po'] },
  { key: 'tanggalPo', label: 'Date PO', synonyms: ['date po', 'tanggal po', 'tgl po', 'po date'] },
  { key: 'noWoCp', label: 'No WO CP', synonyms: ['no wo cp', 'wo cp', 'wo', 'no wo'] },
  { key: 'price', label: 'Price / Amount', synonyms: ['price / amount', 'price', 'amount', 'harga', 'nominal', 'total'] },
]

export const REPAIR_EXCEL_COLUMNS: ColumnDef[] = [
  { key: 'customer', label: 'Customer', synonyms: ['customer', 'pelanggan', 'client', 'perusahaan'] },
  { key: 'site', label: 'Site', synonyms: ['site', 'lokasi', 'area', 'proyek'] },
  { key: 'size', label: 'Tire Size', synonyms: ['tire size', 'size', 'ukuran', 'ukuran ban', 'tire'] },
  { key: 'description', label: 'SN Tire', synonyms: ['sn tire', 'sn', 'serial no', 'tire sn', 'serial', 'no seri', 'description', 'sn ban'] },
  { key: 'noUnit', label: 'ID Unit', synonyms: ['id unit', 'unit', 'no unit', 'equipment no', 'eq no', 'unit no'] },
  { key: 'brand', label: 'Brand', synonyms: ['brand', 'merk', 'merek'] },
  { key: 'category', label: 'Cat. Injury', synonyms: ['cat. injury', 'category', 'injury', 'kategori', 'kerusakan', 'cat injury'] },
  { key: 'price', label: 'Price', synonyms: ['price', 'harga', 'amount', 'nominal'] },
  { key: 'noWoCp', label: 'WO CP', synonyms: ['wo cp', 'no wo cp', 'wo', 'no wo'] },
  { key: 'noPo', label: 'Number PO', synonyms: ['number po', 'nomor po', 'no po', 'po number', 'po', 'no. po'] },
  { key: 'tanggalPo', label: 'Date PO', synonyms: ['date po', 'tanggal po', 'tgl po', 'po date'] },
  { key: 'pos', label: 'POS', synonyms: ['pos', 'posisi', 'position'] },
]

// ─── Format & Normalization Helpers ─────────────────────────────────────────────

export function formatDateForInput(val: string): string {
  if (!val) return ''
  const trimmed = val.replace(/^["']|["']$/g, '').trim()
  if (!trimmed) return ''

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    const year = dmyMatch[3]
    return `${year}-${month}-${day}`
  }

  // YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (ymdMatch) {
    const year = ymdMatch[1]
    const month = ymdMatch[2].padStart(2, '0')
    const day = ymdMatch[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Fallback: try JS Date
  const parsed = Date.parse(trimmed)
  if (!isNaN(parsed)) {
    try {
      const d = new Date(parsed)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return trimmed
    }
  }

  return trimmed
}

export function formatPriceValue(val: string): string {
  if (!val) return ''
  const trimmed = val.replace(/^["']|["']$/g, '').trim()
  if (!trimmed) return ''

  // Strip non-numeric characters except dot, comma, minus
  const clean = trimmed.replace(/[^0-9.,-]+/g, '')
  if (!clean) return trimmed

  let numStr = clean
  if (numStr.includes(',') && numStr.includes('.')) {
    if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
      numStr = numStr.replace(/\./g, '').replace(',', '.')
    } else {
      numStr = numStr.replace(/,/g, '')
    }
  } else if (numStr.includes('.')) {
    const parts = numStr.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      numStr = numStr.replace(/\./g, '')
    }
  } else if (numStr.includes(',')) {
    const parts = numStr.split(',')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      numStr = numStr.replace(/,/g, '')
    } else {
      numStr = numStr.replace(',', '.')
    }
  }

  const parsed = parseFloat(numStr)
  if (!isNaN(parsed) && parsed > 0) {
    return parsed.toLocaleString('en-US')
  }
  return trimmed
}

export function matchCategory(val: string): string {
  if (!val) return 'R1'
  const trimmed = val.replace(/^["']|["']$/g, '').trim().toUpperCase()
  if (trimmed.includes('R3') || trimmed.includes('MAJOR')) return 'R3'
  if (trimmed.includes('R2') || trimmed.includes('MEDIUM')) return 'R2'
  if (trimmed.includes('R1') || trimmed.includes('MINOR')) return 'R1'
  return trimmed || 'R1'
}

export function matchCustomerOption(val: string, options: string[]): string {
  if (!val) return ''
  const trimmed = val.replace(/^["']|["']$/g, '').trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  const exact = options.find((opt) => opt.toLowerCase() === lower)
  if (exact) return exact
  const partial = options.find(
    (opt) => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase())
  )
  if (partial) return partial
  return trimmed
}

export function parseExcelColumn(
  rawText: string,
  colKey: string,
  colTitle: string,
  hasHeader: boolean
): { lines: string[]; detectedHeader: boolean } {
  if (!rawText) return { lines: [], detectedHeader: false }
  const rawLines = rawText.split(/\r\n|\r|\n/)
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') {
    rawLines.pop()
  }
  if (rawLines.length === 0) return { lines: [], detectedHeader: false }

  let lines = rawLines.map((l) => l.split('\t')[0]?.replace(/^["']|["']$/g, '').trim() ?? '')
  let detectedHeader = false

  if (hasHeader && lines.length > 1) {
    detectedHeader = true
    lines = lines.slice(1)
  } else if (!hasHeader && lines.length > 1) {
    const firstLower = lines[0].toLowerCase()
    if (
      firstLower === colTitle.toLowerCase() ||
      firstLower === colKey.toLowerCase() ||
      firstLower.replace(/[^a-z0-9]/g, '') === colTitle.toLowerCase().replace(/[^a-z0-9]/g, '')
    ) {
      detectedHeader = true
      lines = lines.slice(1)
    }
  }
  return { lines, detectedHeader }
}

export function parseExcelTable(
  rawText: string,
  columnDefs: ColumnDef[],
  forceHasHeader?: boolean
): {
  headers: string[]
  detectedHasHeader: boolean
  mappedKeys: (string | null)[]
  rows: Record<string, string>[]
} {
  if (!rawText) {
    return { headers: [], detectedHasHeader: false, mappedKeys: [], rows: [] }
  }

  const rawLines = rawText.split(/\r\n|\r|\n/)
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') {
    rawLines.pop()
  }
  if (rawLines.length === 0) {
    return { headers: [], detectedHasHeader: false, mappedKeys: [], rows: [] }
  }

  const grid = rawLines.map((line) =>
    line.split('\t').map((c) => c.replace(/^["']|["']$/g, '').trim())
  )

  const firstRow = grid[0]
  // Detect if first row looks like headers
  const matchingHeaderCount = firstRow.filter((cell) => {
    const lower = cell.toLowerCase()
    return (
      lower === 'no' ||
      lower === 'no.' ||
      columnDefs.some(
        (def) =>
          def.label.toLowerCase() === lower ||
          def.key.toLowerCase() === lower ||
          def.synonyms.some((s) => s.toLowerCase() === lower)
      )
    )
  }).length

  const detectedHasHeader =
    forceHasHeader !== undefined ? forceHasHeader : matchingHeaderCount >= 1 && grid.length > 1

  const headerCells = detectedHasHeader ? firstRow : []
  const dataRows = detectedHasHeader ? grid.slice(1) : grid

  const numCols = Math.max(...grid.map((r) => r.length))
  const mappedKeys: (string | null)[] = []

  let unmappedDefIndex = 0
  for (let c = 0; c < numCols; c++) {
    if (detectedHasHeader && headerCells[c]) {
      const hLower = headerCells[c].toLowerCase().trim()
      if (hLower === 'no' || hLower === 'no.') {
        mappedKeys.push(null) // skip 'No' column
        continue
      }
      const matchedDef = columnDefs.find(
        (def) =>
          def.label.toLowerCase() === hLower ||
          def.key.toLowerCase() === hLower ||
          def.synonyms.some((s) => s.toLowerCase() === hLower)
      )
      mappedKeys.push(matchedDef ? matchedDef.key : null)
    } else {
      // Natural order mapping, skipping index if already consumed
      while (
        unmappedDefIndex < columnDefs.length &&
        mappedKeys.includes(columnDefs[unmappedDefIndex].key)
      ) {
        unmappedDefIndex++
      }
      mappedKeys.push(columnDefs[unmappedDefIndex]?.key ?? null)
      unmappedDefIndex++
    }
  }

  const rows: Record<string, string>[] = []
  for (const rowCells of dataRows) {
    const rowObj: Record<string, string> = {}
    for (let c = 0; c < rowCells.length; c++) {
      const key = mappedKeys[c]
      if (key) {
        rowObj[key] = rowCells[c] || ''
      }
    }
    if (Object.values(rowObj).some((v) => v.trim() !== '')) {
      rows.push(rowObj)
    }
  }

  return {
    headers: headerCells,
    detectedHasHeader,
    mappedKeys,
    rows,
  }
}

// ─── Component: Column Header With Paste Button ────────────────────────────────

export function ColumnHeaderWithPaste({
  title,
  columnKey,
  onPaste,
  align = 'left',
  className,
}: {
  title: string
  columnKey: string
  onPaste: (key: string, title: string) => void
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 py-1',
        align === 'right'
          ? 'justify-end'
          : align === 'center'
            ? 'justify-center'
            : 'justify-between',
        className
      )}
    >
      <span className="truncate font-bold text-slate-700">{title}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPaste(columnKey, title)
        }}
        title={`Paste kolom ${title} dari Excel`}
        className="inline-flex shrink-0 items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 transition-all hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 shadow-2xs cursor-pointer"
      >
        <ClipboardPaste className="h-3 w-3 text-emerald-600" />
        <span>Paste</span>
      </button>
    </div>
  )
}

// ─── Component: Single Column Paste Dialog ──────────────────────────────────────

export function ColumnPasteModal({
  open,
  onOpenChange,
  columnKey,
  columnTitle,
  initialText = '',
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  columnKey: string
  columnTitle: string
  initialText?: string
  onApply: (lines: string[]) => void
}) {
  const [text, setText] = useState(initialText)
  const [hasHeader, setHasHeader] = useState(false)

  useEffect(() => {
    if (open) {
      setText(initialText || '')
      setHasHeader(false)
    }
  }, [open, initialText])

  const { lines, detectedHeader } = useMemo(() => {
    return parseExcelColumn(text, columnKey, columnTitle, hasHeader)
  }, [text, columnKey, columnTitle, hasHeader])

  const handleReadClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText()
        if (clipText) {
          setText(clipText)
          toast.success('Berhasil membaca teks dari clipboard.')
          return
        }
      }
      toast.error('Clipboard kosong atau browser membatasi akses clipboard.')
    } catch {
      toast.error('Gagal mengakses clipboard. Silakan tempel manual dengan Ctrl+V.')
    }
  }

  const handleApply = () => {
    if (lines.length === 0) {
      toast.error('Tidak ada data yang valid untuk ditempel.')
      return
    }
    onApply(lines)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <ClipboardPaste className="h-4 w-4 text-emerald-600" />
            Paste Kolom &quot;{columnTitle}&quot; dari Excel
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Salin 1 kolom data dari Excel (Ctrl+C), lalu tempelkan (Ctrl+V) ke dalam kotak di bawah ini.
            Jumlah baris pada tabel akan otomatis mengikuti jumlah data yang di-paste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700">
              Isi Data Excel (Kolom: {columnTitle})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReadClipboard}
              className="h-7 border-emerald-300 bg-emerald-50 px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <ClipboardPaste className="mr-1 h-3.5 w-3.5 text-emerald-600" />
              Ambil dari Clipboard
            </Button>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Tempel data kolom ${columnTitle} di sini (Ctrl+V)...\nContoh:\nBaris 1\nBaris 2\nBaris 3`}
            className="min-h-[140px] font-mono text-xs"
            autoFocus
          />

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-header-col"
                checked={hasHeader}
                onCheckedChange={(c) => setHasHeader(Boolean(c))}
              />
              <label
                htmlFor="has-header-col"
                className="cursor-pointer text-xs font-medium text-slate-700"
              >
                Baris pertama adalah nama kolom/header (Abaikan baris 1)
              </label>
            </div>
            {detectedHeader && !hasHeader && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800">
                Header otomatis diabaikan
              </Badge>
            )}
          </div>

          {lines.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-800">
                  ✓ {lines.length} Baris Data Terdeteksi
                </span>
                <span className="text-[11px] text-slate-500">
                  Pratinjau {Math.min(lines.length, 5)} dari {lines.length} baris
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto rounded border border-slate-200 bg-white p-1 text-xs">
                {lines.slice(0, 8).map((line, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 border-b border-slate-100 px-2 py-1 font-mono text-[11px] last:border-0"
                  >
                    <span className="w-6 text-slate-400 font-semibold">{idx + 1}.</span>
                    <span className="truncate text-slate-800">{line || <i className="text-slate-400">(kosong)</i>}</span>
                  </div>
                ))}
                {lines.length > 8 && (
                  <div className="px-2 py-1 text-center text-[10px] font-medium text-slate-400">
                    ... dan {lines.length - 8} baris lainnya
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={lines.length === 0}
            onClick={handleApply}
            className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          >
            Terapkan ke Kolom ({lines.length} Baris)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Component: Table (Multi-Column) Paste Dialog ──────────────────────────────

export function TablePasteModal({
  open,
  onOpenChange,
  jenisPengajuan,
  initialText = '',
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jenisPengajuan: 'service' | 'repair' | 'retread' | 'non_repair'
  initialText?: string
  onApply: (rows: Record<string, string>[], mode: 'replace' | 'append') => void
}) {
  const [text, setText] = useState(initialText)
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [hasHeader, setHasHeader] = useState<boolean | undefined>(undefined)

  const columnDefs = useMemo(() => {
    return jenisPengajuan === 'service' ? SERVICE_EXCEL_COLUMNS : REPAIR_EXCEL_COLUMNS
  }, [jenisPengajuan])

  useEffect(() => {
    if (open) {
      setText(initialText || '')
      setMode('replace')
      setHasHeader(undefined)
      // Auto-read clipboard if initialText is empty
      if (!initialText && navigator?.clipboard?.readText) {
        navigator.clipboard
          .readText()
          .then((clipText) => {
            if (clipText && (clipText.includes('\t') || clipText.includes('\n'))) {
              setText(clipText)
            }
          })
          .catch(() => {})
      }
    }
  }, [open, initialText])

  const parsed = useMemo(() => {
    return parseExcelTable(text, columnDefs, hasHeader)
  }, [text, columnDefs, hasHeader])

  const handleReadClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText()
        if (clipText) {
          setText(clipText)
          toast.success('Berhasil membaca teks dari clipboard.')
          return
        }
      }
      toast.error('Clipboard kosong atau browser membatasi akses clipboard.')
    } catch {
      toast.error('Gagal mengakses clipboard. Silakan tempel manual dengan Ctrl+V.')
    }
  }

  const handleApply = () => {
    if (parsed.rows.length === 0) {
      toast.error('Tidak ada data baris yang valid untuk ditempel.')
      return
    }
    onApply(parsed.rows, mode)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Paste Tabel Pekerjaan dari Excel ({jenisPengajuan === 'service' ? 'WO Service' : 'WO Repair'})
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Salin seluruh baris dan kolom tabel pekerjaan dari Excel (Ctrl+C), lalu tempelkan (Ctrl+V) ke dalam kotak di bawah ini.
            Kolom dan jumlah baris akan otomatis disesuaikan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Format Guidance */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Info className="h-3.5 w-3.5 text-indigo-600" />
              <span>Urutan Kolom yang Didukung ({columnDefs.length} Kolom):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {columnDefs.map((col, idx) => (
                <Badge
                  key={col.key}
                  variant="outline"
                  className="bg-white text-[11px] font-mono text-slate-700"
                >
                  <span className="mr-1 text-slate-400 font-bold">{idx + 1}.</span>
                  {col.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Textarea Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Tempel Data Excel (Tabel / Multi-Kolom)
              </Label>
              <div className="flex items-center gap-2">
                {text && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setText('')}
                    className="h-7 px-2 text-xs text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Hapus
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReadClipboard}
                  className="h-7 border-emerald-300 bg-emerald-50 px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  <ClipboardPaste className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                  Ambil dari Clipboard
                </Button>
              </div>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Klik di sini lalu tekan Ctrl+V untuk menempel data tabel dari Excel..."
              className="min-h-[140px] font-mono text-xs"
              autoFocus
            />
          </div>

          {/* Settings: Header & Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-header-table"
                checked={parsed.detectedHasHeader}
                onCheckedChange={(c) => setHasHeader(Boolean(c))}
              />
              <label
                htmlFor="has-header-table"
                className="cursor-pointer text-xs font-medium text-slate-700"
              >
                Baris pertama berisi nama kolom / Header (Abaikan baris 1)
              </label>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold text-slate-700">Mode Tempel:</span>
              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as 'replace' | 'append')}
                className="flex items-center gap-3"
              >
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="replace" id="mode-replace" />
                  <Label htmlFor="mode-replace" className="cursor-pointer text-xs font-medium">
                    Ganti Baris yang Ada (Replace)
                  </Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="append" id="mode-append" />
                  <Label htmlFor="mode-append" className="cursor-pointer text-xs font-medium">
                    Tambahkan ke Baris Saat Ini (Append)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parsed.rows.length > 0 && (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Berhasil Membaca {parsed.rows.length} Baris Data
                </span>
                <span className="text-[11px] text-slate-500">
                  Menampilkan pratinjau {Math.min(parsed.rows.length, 5)} dari {parsed.rows.length} baris
                </span>
              </div>

              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-100 font-semibold text-slate-700">
                    <TableRow>
                      <TableHead className="w-10 text-center">No</TableHead>
                      {columnDefs.map((col) => (
                        <TableHead key={col.key} className="whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 5).map((row, rIdx) => (
                      <TableRow key={rIdx} className="hover:bg-slate-50/60 font-mono text-[11px]">
                        <TableCell className="text-center font-bold text-slate-400">
                          {rIdx + 1}
                        </TableCell>
                        {columnDefs.map((col) => (
                          <TableCell key={col.key} className="max-w-[180px] truncate">
                            {row[col.key] || <span className="text-slate-300">-</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={parsed.rows.length === 0}
            onClick={handleApply}
            className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          >
            Terapkan ke Formulir ({parsed.rows.length} Baris)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
