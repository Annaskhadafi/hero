'use client'

import { useEffect, useMemo, useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  Fuel,
  Truck,
  Calendar,
  MapPin,
  Search,
  Download,
  Upload,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Gauge,
  Award,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react'

import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

import {
  getRefuelingLogs,
  getRefuelingSummaryKPI,
  deleteRefuelingLog,
  updateRefuelingLog,
  importRefuelingGFormRecords,
  getCurrentRefuelingUserContext,
  type RefuelingSummaryKPI,
  type RefuelingUserContext,
} from '@/app/actions/central-service-refueling'
import { type CentralServiceRefuelingLog } from '@/db/schema/central-service'
import { getSites } from '@/app/dashboard/360-service/service-form/actions'

const SITE_PRESETS = [
  'CK KIM',
  'CK DMP',
  'CK BIB',
  'CK BMB',
  'CK MHU',
  'VALE SOROWAKU',
]

const EXPENDITURE_TYPES = [
  'Di bebankan ke PT Chitra Paratama (Internal)',
  'Di bebankan ke Customer (External)',
]

export default function CentralServiceRefuelingPage() {
  const [logs, setLogs] = useState<CentralServiceRefuelingLog[]>([])
  const [userContext, setUserContext] = useState<RefuelingUserContext | null>(null)
  const [kpi, setKpi] = useState<RefuelingSummaryKPI>({
    totalRecords: 0,
    totalLiters: 0,
    avgLitersPerFill: 0,
    topSite: null,
    siteBreakdown: [],
  })
  const [siteOptions, setSiteOptions] = useState<string[]>(SITE_PRESETS)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Filters
  const [filterSite, setFilterSite] = useState<string>('ALL')
  const [filterExpenditure, setFilterExpenditure] = useState<string>('ALL')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // Modals state
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; url: string } | null>(null)
  const [editingRecord, setEditingRecord] = useState<CentralServiceRefuelingLog | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load sites from master data & user context
  useEffect(() => {
    getCurrentRefuelingUserContext().then((ctx) => {
      setUserContext(ctx)
    })

    getSites().then((res) => {
      if (res.success && res.data.length > 0) {
        const names = Array.from(
          new Set([...SITE_PRESETS, ...res.data.map((s) => s.name).filter(Boolean)])
        )
        setSiteOptions(names)
      }
    })
  }, [])

  const canManage = Boolean(userContext?.isSuperAdmin || userContext?.canEdit)

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [logsRes, kpiRes] = await Promise.all([
        getRefuelingLogs({
          siteName: filterSite,
          fuelExpenditureType: filterExpenditure,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          search: searchTerm || undefined,
        }),
        getRefuelingSummaryKPI({
          siteName: filterSite,
          fuelExpenditureType: filterExpenditure,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
        }),
      ])

      if (logsRes.success) {
        setLogs(logsRes.data)
      } else {
        toast.error('Gagal memuat daftar log Re-Fueling.')
      }

      setKpi(kpiRes)
    } catch (e) {
      console.error('[CentralServiceRefuelingPage] fetch error:', e)
      toast.error('Terjadi kesalahan saat memuat data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterSite, filterExpenditure, filterStartDate, filterEndDate])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Pagination slice
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return logs.slice(start, start + pageSize)
  }, [logs, currentPage, pageSize])

  const totalPages = Math.ceil(logs.length / pageSize) || 1

  // Handle Delete
  const handleDelete = async (id: number) => {
    if (!canManage) {
      toast.error('Anda tidak memiliki izin untuk menghapus data.')
      return
    }
    if (!window.confirm('Hapus baris log pengisian bahan bakar ini?')) return
    startTransition(async () => {
      const res = await deleteRefuelingLog(id)
      if (res.success) {
        toast.success(res.message)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menghapus data.')
      }
    })
  }

  // Handle Edit Save
  const handleSaveEdit = async () => {
    if (!editingRecord) return
    if (!canManage) {
      toast.error('Anda tidak memiliki izin untuk mengedit data.')
      return
    }
    startTransition(async () => {
      const res = await updateRefuelingLog(editingRecord.id, {
        siteName: editingRecord.siteName,
        driverName: editingRecord.driverName,
        refuelDate: editingRecord.refuelDate,
        unitNumber: editingRecord.unitNumber,
        odometerKm: editingRecord.odometerKm,
        fuelExpenditureType: editingRecord.fuelExpenditureType,
        fuelAmountLiters: editingRecord.fuelAmountLiters,
        fuelmanName: editingRecord.fuelmanName,
        remarks: editingRecord.remarks,
      })
      if (res.success) {
        toast.success('Data berhasil diperbarui.')
        setEditingRecord(null)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menyimpan perubahan.')
      }
    })
  }

  // Export to Excel / CSV
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const excelRows = logs.map((r, index) => ({
        No: index + 1,
        Timestamp: new Date(r.timestamp).toLocaleString('id-ID'),
        'Pilih Lokasi Site': r.siteName,
        'Nama Pengemudi': r.driverName,
        'Tanggal Pengisian Bahan Bakar': r.refuelDate,
        'Nomer Lambung LV': r.unitNumber,
        'Kilometer LV pada Saat Pengisian': Number(r.odometerKm || 0),
        'Jumlah Liter Pengisian': Number(r.fuelAmountLiters || 0),
        'Nama Petugas Fuelman': r.fuelmanName,
        'Foto Kilometer LV': r.odometerPhotoUrl
          ? (r.odometerPhotoUrl.startsWith('http') ? r.odometerPhotoUrl : 'Lampiran Tersimpan di HERO')
          : '-',
        'Foto Flowmeter': r.flowmeterPhotoUrl
          ? (r.flowmeterPhotoUrl.startsWith('http') ? r.flowmeterPhotoUrl : 'Lampiran Tersimpan di HERO')
          : '-',
        'Tipe Pengeluaran Bahan Bakar': r.fuelExpenditureType,
        'Remarks (Catatan)': r.remarks || '-',
      }))

      const worksheet = XLSX.utils.json_to_sheet(excelRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Re-Fueling Log')

      const fileName = `Re-Fueling-Central-Service-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      toast.success(`Berhasil mengunduh ${logs.length} data ke Excel.`)
    } catch (e) {
      console.error('Export failed:', e)
      toast.error('Gagal mengekspor file Excel.')
    }
  }

  // Parse Excel / CSV for Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)

    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (!json || json.length === 0) {
        toast.error('File Excel/CSV kosong.')
        setParsedImportRows([])
        return
      }

      // Map GForm columns flexibly
      const mapped = json.map((row: any) => {
        const findVal = (keys: string[]) => {
          for (const k of Object.keys(row)) {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '')
            for (const target of keys) {
              if (cleanKey.includes(target.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                return row[k]
              }
            }
          }
          return ''
        }

        return {
          timestamp: findVal(['timestamp', 'waktu', 'tanggal']),
          siteName: findVal(['lokasi site', 'site', 'lokasi']) || 'CK MHU',
          driverName: findVal(['nama pengemudi', 'pengemudi', 'driver']) || '-',
          refuelDate: findVal(['tanggal pengisian', 'tanggal', 'date']) || new Date().toISOString().split('T')[0],
          unitNumber: findVal(['nomer lambung', 'nomor lambung', 'lambung', 'unit']) || 'CP-06',
          odometerKm: findVal(['kilometer', 'odometer', 'km']) || 0,
          fuelAmountLiters: findVal(['jumlah liter', 'liter', 'volume']) || 0,
          fuelmanName: findVal(['petugas fuelman', 'fuelman', 'petugas']) || '-',
          odometerPhotoUrl: findVal(['foto kilometer', 'foto km']) || null,
          flowmeterPhotoUrl: findVal(['foto flowmeter', 'flowmeter']) || null,
          fuelExpenditureType: findVal(['tipe pengeluaran', 'pengeluaran', 'tipe']) || 'Di bebankan ke PT Chitra Paratama (Internal)',
          remarks: findVal(['remarks', 'catatan', 'keterangan']) || '',
        }
      })

      setParsedImportRows(mapped)
      toast.success(`Terbaca ${mapped.length} baris data dari file.`)
    } catch (err) {
      console.error('Failed to parse file:', err)
      toast.error('Gagal membaca file spreadsheet. Pastikan format valid.')
      setParsedImportRows([])
    }
  }

  // Execute Import
  const handleProcessImport = async () => {
    if (parsedImportRows.length === 0) return
    setIsImporting(true)
    try {
      const res = await importRefuelingGFormRecords(parsedImportRows)
      if (res.success) {
        toast.success(res.message)
        setIsImportModalOpen(false)
        setParsedImportRows([])
        setImportFile(null)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal mengimpor data.')
      }
    } catch (e) {
      console.error('Import error:', e)
      toast.error('Terjadi kesalahan saat menyimpan data impor.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <AdminPageShell
      title="Re-Fueling LV Monitoring"
      description="Monitoring terpusat seluruh transaksi pengisian bahan bakar Light Vehicle (LV) dari semua site operasional."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Upload className="mr-1.5 size-3.5 text-blue-600" />
            Import Data GForm
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={logs.length === 0}
            className="h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600" />
            Export Excel ({logs.length})
          </Button>

          <Link href="/dashboard/360-service/service-form">
            <Button size="sm" className="h-9 bg-teal-700 hover:bg-teal-800 text-white">
              <Plus className="mr-1.5 size-3.5" />
              + Form Input Baru
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── KPI Metric Grid ─────────────────────────────────────────────── */}
        <AdminMetricGrid
          items={[
            {
              label: 'Total Bahan Bakar',
              value: `${kpi.totalLiters.toLocaleString('id-ID')} L`,
              meta: `${kpi.totalRecords} kali pengisian tercatat`,
            },
            {
              label: 'Total Transaksi Pengisian',
              value: `${kpi.totalRecords.toLocaleString('id-ID')}`,
              meta: 'Transaksi pengisian LV',
            },
            {
              label: 'Rata-rata per Pengisian',
              value: `${kpi.avgLitersPerFill.toLocaleString('id-ID')} L`,
              meta: 'Rata-rata volume per isi',
            },
            {
              label: 'Site Konsumsi Tertinggi',
              value: kpi.topSite ? kpi.topSite.siteName : '—',
              meta: kpi.topSite
                ? `${kpi.topSite.totalLiters.toLocaleString('id-ID')} Liter (${kpi.topSite.fillCount}x)`
                : 'Belum ada data',
            },
          ]}
        />

        {/* ── Filter & Action Card ────────────────────────────────────────── */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-slate-500" />
                <CardTitle className="text-sm font-bold text-slate-800">
                  Filter & Pencarian Log
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-500"
                onClick={() => {
                  setFilterSite('ALL')
                  setFilterExpenditure('ALL')
                  setFilterStartDate('')
                  setFilterEndDate('')
                  setSearchTerm('')
                }}
              >
                Reset Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-slate-400" />
                <Input
                  placeholder="Cari pengemudi, unit, fuelman..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 text-xs rounded-xl"
                />
              </div>

              {/* Site Select */}
              <div>
                <Select value={filterSite} onValueChange={setFilterSite}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Semua Site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Site</SelectItem>
                    {siteOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipe Pengeluaran */}
              <div>
                <Select value={filterExpenditure} onValueChange={setFilterExpenditure}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Semua Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Tipe Pengeluaran</SelectItem>
                    {EXPENDITURE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  placeholder="Tanggal Mulai"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* End Date */}
              <div>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  placeholder="Tanggal Akhir"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Spreadsheet Data Table Card ─────────────────────────────────── */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Data Master Re-Fueling (Spreadsheet View)
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Menampilkan {logs.length} baris data transaksi bahan bakar yang tersinkronisasi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white text-xs font-mono">
                  Halaman {currentPage} dari {totalPages}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs">
                <TableHeader className="bg-slate-100/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="w-12 text-center font-bold text-slate-700">No</TableHead>
                    <TableHead className="whitespace-nowrap font-bold text-slate-700">Timestamp</TableHead>
                    <TableHead className="whitespace-nowrap font-bold text-slate-700">Pilih Lokasi Site</TableHead>
                    <TableHead className="whitespace-nowrap font-bold text-slate-700">Nama Pengemudi</TableHead>
                    <TableHead className="whitespace-nowrap font-bold text-slate-700">Tanggal Pengisian</TableHead>
                    <TableHead className="whitespace-nowrap font-bold text-slate-700">Nomer Lambung LV</TableHead>
                    <TableHead className="whitespace-nowrap text-right font-bold text-slate-700">Kilometer LV</TableHead>
                    <TableHead className="whitespace-nowrap text-right font-bold text-slate-700">Jumlah Liter</TableHead>
                    <TableHead className="whitespace-nowrap font-bold text-slate-700">Nama Petugas Fuelman</TableHead>
                    <TableHead className="whitespace-nowrap text-center font-bold text-slate-700">Foto KM LV</TableHead>
                    <TableHead className="whitespace-nowrap text-center font-bold text-slate-700">Foto Flowmeter</TableHead>
                    <TableHead className="whitespace-nowrap font-bold text-slate-700">Tipe Pengeluaran</TableHead>
                    <TableHead className="min-w-[150px] font-bold text-slate-700">Remarks (Catatan)</TableHead>
                    <TableHead className="w-24 text-right font-bold text-slate-700 pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={14} className="h-32 text-center text-slate-500">
                        <Loader2 className="mx-auto size-6 animate-spin text-teal-600 mb-2" />
                        Memuat data transaksi Re-Fueling...
                      </TableCell>
                    </TableRow>
                  ) : paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="h-32 text-center text-slate-400">
                        Tidak ada data transaksi pengisian bahan bakar yang sesuai filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((row, idx) => {
                      const rowNum = (currentPage - 1) * pageSize + idx + 1
                      return (
                        <TableRow
                          key={row.id}
                          className="hover:bg-teal-50/40 transition-colors border-b border-slate-100"
                        >
                          <TableCell className="text-center font-mono text-slate-400">
                            {rowNum}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(row.timestamp).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-semibold text-slate-900">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                              <MapPin className="size-3 text-slate-400" />
                              {row.siteName}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium text-slate-800">
                            {row.driverName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-600 font-mono">
                            {row.refuelDate}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-bold text-blue-700">
                            {row.unitNumber}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono font-semibold text-slate-900">
                            {Number(row.odometerKm || 0).toLocaleString('id-ID')} KM
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono font-bold text-amber-700">
                            {row.fuelAmountLiters} L
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-slate-700">
                            {row.fuelmanName}
                          </TableCell>

                          {/* Foto KM */}
                          <TableCell className="text-center">
                            {row.odometerPhotoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    title: `Foto KM LV - ${row.unitNumber} (${row.refuelDate})`,
                                    url: row.odometerPhotoUrl!,
                                  })
                                }
                                className="group relative inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1 hover:border-teal-500 transition-colors"
                                title="Klik untuk perbesar"
                              >
                                <img
                                  src={row.odometerPhotoUrl}
                                  alt="KM"
                                  className="size-8 rounded object-cover"
                                />
                                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-teal-600 text-[8px] text-white">
                                  <Eye className="size-2.5" />
                                </span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </TableCell>

                          {/* Foto Flowmeter */}
                          <TableCell className="text-center">
                            {row.flowmeterPhotoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    title: `Foto Flowmeter - ${row.siteName} (${row.refuelDate})`,
                                    url: row.flowmeterPhotoUrl!,
                                  })
                                }
                                className="group relative inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1 hover:border-teal-500 transition-colors"
                                title="Klik untuk perbesar"
                              >
                                <img
                                  src={row.flowmeterPhotoUrl}
                                  alt="Flowmeter"
                                  className="size-8 rounded object-cover"
                                />
                                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-teal-600 text-[8px] text-white">
                                  <Eye className="size-2.5" />
                                </span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200/60">
                              {row.fuelExpenditureType}
                            </span>
                          </TableCell>

                          <TableCell className="text-slate-600 max-w-[200px] truncate" title={row.remarks || ''}>
                            {row.remarks || '-'}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right pr-4">
                            {canManage ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRecord({ ...row })}
                                  className="size-7 p-0 text-slate-500 hover:text-slate-900"
                                  title="Edit Baris"
                                >
                                  <Edit2 className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(row.id)}
                                  disabled={isPending}
                                  className="size-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Hapus Baris"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-mono">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3">
                <p className="text-xs text-slate-500">
                  Menampilkan{' '}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  -{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.min(currentPage * pageSize, logs.length)}
                  </span>{' '}
                  dari <span className="font-semibold text-slate-700">{logs.length}</span> data
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 text-xs"
                  >
                    <ChevronLeft className="size-3.5 mr-1" />
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 text-xs"
                  >
                    Berikutnya
                    <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Photo Preview Dialog ──────────────────────────────────────────── */}
      <Dialog open={Boolean(previewPhoto)} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="max-w-2xl bg-white p-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm font-bold text-slate-900">
              {previewPhoto?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2 bg-slate-950 rounded-xl overflow-hidden min-h-[300px]">
            {previewPhoto?.url ? (
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[70vh] w-full object-contain rounded"
              />
            ) : null}
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewPhoto(null)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import GForm Excel/CSV Modal ─────────────────────────────────── */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="size-5 text-teal-600" />
              Import Data Riwayat Google Form
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Unggah file spreadsheet (.xlsx atau .csv) hasil download dari Google Forms response Re-Fueling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
                id="gform-file-input"
              />
              <label
                htmlFor="gform-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <FileSpreadsheet className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {importFile ? importFile.name : 'Klik untuk memilih file spreadsheet (.xlsx / .csv)'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Mendukung format kolom otomatis dari respon Google Forms
                  </p>
                </div>
              </label>
            </div>

            {parsedImportRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Preview Data ({parsedImportRows.length} baris terdeteksi)
                  </span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs">
                    Siap Diimpor
                  </Badge>
                </div>
                <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
                  <Table className="text-[11px]">
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Pengemudi</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Liter</TableHead>
                        <TableHead>Fuelman</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedImportRows.slice(0, 5).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.siteName}</TableCell>
                          <TableCell>{r.driverName}</TableCell>
                          <TableCell>{r.refuelDate}</TableCell>
                          <TableCell>{r.unitNumber}</TableCell>
                          <TableCell>{r.fuelAmountLiters} L</TableCell>
                          <TableCell>{r.fuelmanName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedImportRows.length > 5 && (
                  <p className="text-[11px] text-slate-500 italic">
                    ...dan {parsedImportRows.length - 5} baris lainnya.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsImportModalOpen(false)
                setParsedImportRows([])
                setImportFile(null)
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleProcessImport}
              disabled={parsedImportRows.length === 0 || isImporting}
              className="bg-teal-700 hover:bg-teal-800 text-white"
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Mengimpor {parsedImportRows.length} Data...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Proses Simpan ke Database ({parsedImportRows.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Record Modal ────────────────────────────────────────────── */}
      <Dialog open={Boolean(editingRecord)} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base font-bold text-slate-900">
              Ubah Data Re-Fueling
            </DialogTitle>
          </DialogHeader>

          {editingRecord && (
            <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Lokasi Site</Label>
                <Select
                  value={editingRecord.siteName}
                  onValueChange={(val) => setEditingRecord({ ...editingRecord, siteName: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {siteOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nama Pengemudi</Label>
                <Input
                  value={editingRecord.driverName}
                  onChange={(e) => setEditingRecord({ ...editingRecord, driverName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tanggal Pengisian</Label>
                <Input
                  type="date"
                  value={editingRecord.refuelDate}
                  onChange={(e) => setEditingRecord({ ...editingRecord, refuelDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nomer Lambung LV</Label>
                <Input
                  value={editingRecord.unitNumber}
                  onChange={(e) => setEditingRecord({ ...editingRecord, unitNumber: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Kilometer LV</Label>
                <Input
                  type="number"
                  value={editingRecord.odometerKm}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, odometerKm: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Jumlah Liter</Label>
                <Input
                  value={editingRecord.fuelAmountLiters}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, fuelAmountLiters: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Petugas Fuelman</Label>
                <Input
                  value={editingRecord.fuelmanName}
                  onChange={(e) => setEditingRecord({ ...editingRecord, fuelmanName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Tipe Pengeluaran</Label>
                <Select
                  value={editingRecord.fuelExpenditureType}
                  onValueChange={(val) =>
                    setEditingRecord({ ...editingRecord, fuelExpenditureType: val })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENDITURE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Remarks (Catatan)</Label>
                <Textarea
                  value={editingRecord.remarks || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, remarks: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingRecord(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isPending}
              className="bg-teal-700 hover:bg-teal-800 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
