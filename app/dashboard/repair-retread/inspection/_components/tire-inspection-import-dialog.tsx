"use client"

import * as React from "react"
import { useState, useRef } from "react"
import {
  Upload,
  FileSpreadsheet,
  Download,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  FileText,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { bulkCreateTireRepairInspectionsAction } from "@/app/actions/tire-repair-actions"
import type { CreateTireRepairInspectionPayload, DurationTag } from "@/lib/tire-repair-constants"

const PHOTO_AREAS_FALLBACK = [
  "Serial Number",
  "Area Sidewall",
  "Area Shoulder",
  "Area Tread",
  "Area Bead",
  "Area Inner Linner",
  "Area Chaffer",
]

interface ImportResultSummary {
  total: number
  insertedCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  errors: Array<{ row: number; serialNumber: string; reason: string }>
}

interface TireInspectionImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultCustomer?: string
  defaultSite?: string
}

export function TireInspectionImportDialog({
  isOpen,
  onClose,
  onSuccess,
  defaultCustomer = "PT Kaltim Prima Coal",
  defaultSite = "Sangatta KPC",
}: TireInspectionImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parsedRecords, setParsedRecords] = useState<CreateTireRepairInspectionPayload[]>([])
  const [invalidRows, setInvalidRows] = useState<Array<{ row: number; serialNumber: string; reason: string }>>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [overrideCustomer, setOverrideCustomer] = useState(defaultCustomer)
  const [overrideSite, setOverrideSite] = useState(defaultSite)
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(true)
  const [importSummary, setImportSummary] = useState<ImportResultSummary | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setFile(null)
    setIsParsing(false)
    setIsImporting(false)
    setParsedRecords([])
    setInvalidRows([])
    setErrorMsg(null)
    setImportSummary(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  // Parse Excel / CSV File
  const processFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsParsing(true)
    setErrorMsg(null)
    setParsedRecords([])
    setInvalidRows([])
    setImportSummary(null)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const [XLSX, ExcelJSModule] = await Promise.all([
        import("xlsx"),
        import("exceljs"),
      ])
      const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        throw new Error("File Excel/CSV tidak memiliki sheet data valid.")
      }

      const worksheet = workbook.Sheets[firstSheetName]
      const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" })

      if (!rawData || rawData.length === 0) {
        throw new Error("File kosong atau tidak berisi data.")
      }

      // Locate header row dynamically (tolerates title & logo rows at top)
      let headerRowIndex = -1
      for (let i = 0; i < Math.min(15, rawData.length); i++) {
        const row = rawData[i]
        if (
          Array.isArray(row) &&
          row.some((cell) => {
            const str = String(cell).toUpperCase().trim()
            return str === "NO" || str === "ID" || str === "SERIAL NUMBER" || str === "SN" || str === "ID (SERIAL NUMBER)"
          })
        ) {
          headerRowIndex = i
          break
        }
      }

      if (headerRowIndex === -1) {
        headerRowIndex = 0
      }

      const headers = rawData[headerRowIndex].map((h: any) => String(h).trim())
      const headersUpper = headers.map((h) => h.toUpperCase())

      // Header Structure Validation
      const findHeaderIndex = (...possibleNames: string[]): number => {
        return headersUpper.findIndex((h) =>
          possibleNames.some((name) => h === name.toUpperCase() || h.includes(name.toUpperCase()))
        )
      }

      const idHeaderIdx = findHeaderIndex("ID", "SERIAL NUMBER", "SN")
      const sizeHeaderIdx = findHeaderIndex("SIZE", "UKURAN BAN", "TIRE SIZE")
      const statusHeaderIdx = findHeaderIndex("STATUS", "STATUS BAN")
      const priorityHeaderIdx = findHeaderIndex("PRIORITY", "R-TAG", "REPAIR DURATION")

      const missingHeaders: string[] = []
      if (idHeaderIdx < 0) missingHeaders.push("ID (Serial Number)")
      if (sizeHeaderIdx < 0) missingHeaders.push("Size (Tire Size)")
      if (statusHeaderIdx < 0) missingHeaders.push("Status")
      if (priorityHeaderIdx < 0) missingHeaders.push("Priority")

      if (missingHeaders.length > 0) {
        throw new Error(
          `Header file tidak sesuai template: Kolom wajib (${missingHeaders.join(", ")}) tidak ditemukan pada baris header file.`
        )
      }

      const getColValue = (row: any[], ...possibleNames: string[]): string => {
        const idx = findHeaderIndex(...possibleNames)
        return idx >= 0 ? String(row[idx] ?? "").trim() : ""
      }

      // Extract embedded images from worksheet using ExcelJS
      const embeddedImageMap: Record<string, string> = {}
      try {
        const excelJsWorkbook = new ExcelJS.Workbook()
        await excelJsWorkbook.xlsx.load(buffer)
        const excelJsSheet = excelJsWorkbook.worksheets[0]
        if (excelJsSheet) {
          const images = excelJsSheet.getImages()
          images.forEach((img: any) => {
            const imgData = excelJsWorkbook.getImage(img.imageId as any)
            if (imgData && imgData.buffer) {
              const rowIdx = Math.floor(img.range.tl.row)
              const colIdx = Math.floor(img.range.tl.col)
              const base64 = Buffer.from(imgData.buffer).toString("base64")
              const mimeType = imgData.extension === "png" ? "image/png" : "image/jpeg"
              const dataUrl = `data:${mimeType};base64,${base64}`
              embeddedImageMap[`${rowIdx}_${colIdx}`] = dataUrl
            }
          })
        }
      } catch (excelJsErr) {
        console.warn("Extraction of embedded cell images skipped/failed:", excelJsErr)
      }

      const records: CreateTireRepairInspectionPayload[] = []
      const errors: Array<{ row: number; serialNumber: string; reason: string }> = []

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i]
        const fileLineNo = i + 1
        if (!row || row.length === 0 || row.every((c) => String(c).trim() === "")) continue

        // Extract mandatory fields
        let id = getColValue(row, "ID", "SERIAL NUMBER", "SN")
        let tireSize = getColValue(row, "SIZE", "UKURAN BAN", "TIRE SIZE")
        let rawStatus = getColValue(row, "STATUS", "STATUS BAN").toUpperCase()
        let rawPriority = getColValue(row, "PRIORITY", "R-TAG", "REPAIR DURATION").toUpperCase()

        // Validation per row
        if (!id) {
          errors.push({ row: fileLineNo, serialNumber: "-", reason: "ID / Serial Number kosong" })
          continue
        }
        id = id.toUpperCase()

        if (!tireSize) {
          errors.push({ row: fileLineNo, serialNumber: id, reason: "Size / Ukuran Ban kosong" })
          continue
        }

        if (!rawStatus) {
          errors.push({ row: fileLineNo, serialNumber: id, reason: "Status ban kosong" })
          continue
        }

        // Status mapping
        let status: "Repair" | "Retread" | "Reject" = "Repair"
        if (rawStatus === "C" || rawStatus.includes("REJECT") || rawStatus.includes("SCRAP")) {
          status = "Reject"
        } else if (rawStatus.includes("RETREAD")) {
          status = "Retread"
        } else {
          status = "Repair"
        }

        // Priority / Repair Duration mapping
        const repairDuration: DurationTag = (["R1", "R2", "R3", "R4"].includes(rawPriority)
          ? rawPriority
          : "R1") as DurationTag

        // Specification mapping ("BRIDGESTONE, 27.00R49, VMTP, E3A, **")
        const spec = getColValue(row, "SPECIFICATION")
        let brand = getColValue(row, "BRAND") || "MICHELIN"
        let pattern = getColValue(row, "PATTERN") || "E4"

        if (spec && spec.includes(",")) {
          const parts = spec.split(",").map((s) => s.trim())
          if (parts[0]) brand = parts[0]
          if (parts[1] && !tireSize) tireSize = parts[1]
          if (parts[2]) pattern = parts[2]
        }

        // Extract "kosong dulu" and all columns
        const removalReason = getColValue(row, "REMOVAL REASON")
        const scrapReason = getColValue(row, "SCRAP - REASON", "SCRAP REASON")
        const deffectexRepair = getColValue(row, "DEFFECTEX-REPAIR", "DEFECTEX-REPAIR", "DEFECT")
        const vehicle = getColValue(row, "VEHICLE")
        const wheelPosition = getColValue(row, "WHEEL POSITION", "WHEEL POS")
        const hours = getColValue(row, "HOURS")
        const hoursSinceLastRepair = getColValue(row, "HOURS SINCE LAST REPAIR")
        const pitLocation = getColValue(row, "PIT LOCATION", "REPAIR LOCATION", "WORKSHOP") || "Workshop Sangatta"
        const marking = getColValue(row, "MARKING")

        // RTD mapping
        const rtdRaw = getColValue(row, "RTD", "RTD (MM)")
        let rtd1 = ""
        let rtd2 = ""
        if (rtdRaw.includes(":")) {
          const [r1, r2] = rtdRaw.split(":").map((s) => s.trim())
          rtd1 = r1
          rtd2 = r2
        } else if (rtdRaw.includes("/")) {
          const [r1, r2] = rtdRaw.split("/").map((s) => s.trim())
          rtd1 = r1
          rtd2 = r2
        } else if (rtdRaw) {
          rtd1 = rtdRaw
          rtd2 = rtdRaw
        }

        // Remarks
        const remarksCombined = [removalReason, deffectexRepair, scrapReason].filter(Boolean).join(" | ")

        // Customer & Site
        const customer = getColValue(row, "CUSTOMER") || overrideCustomer
        const customerSite = getColValue(row, "SITE", "CUSTOMER SITE") || overrideSite

        // Photos mapping (Foto1 .. Foto5) - Text URL or Embedded Cell Image
        const photos: Array<{ photoArea: string; photoUrl: string }> = []
        ;["FOTO1", "FOTO2", "FOTO3", "FOTO4", "FOTO5"].forEach((fName, fIdx) => {
          let pUrl = getColValue(row, fName)
          const fColIdx = findHeaderIndex(fName)
          if (!pUrl && fColIdx >= 0) {
            pUrl = embeddedImageMap[`${i}_${fColIdx}`] || ""
          }

          if (pUrl && pUrl.length > 5) {
            photos.push({
              photoArea: PHOTO_AREAS_FALLBACK[fIdx % PHOTO_AREAS_FALLBACK.length],
              photoUrl: pUrl,
            })
          }
        })

        records.push({
          serialNumber: id,
          tireSize,
          brand: brand.toUpperCase(),
          typeConstruction: "RADIAL",
          pattern,
          customer,
          customerSite,
          status,
          repairDuration,
          inspectLocation: pitLocation,
          reportBy: getColValue(row, "REPORT BY", "REPORTBY") || "Inspector",
          rtd1,
          rtd2,
          remarks: remarksCombined || undefined,
          removalReason: removalReason || undefined,
          scrapReason: scrapReason || undefined,
          deffectexRepair: deffectexRepair || undefined,
          vehicle: vehicle || undefined,
          wheelPosition: wheelPosition || undefined,
          hours: hours || undefined,
          hoursSinceLastRepair: hoursSinceLastRepair || undefined,
          pitLocation: pitLocation || undefined,
          marking: marking || undefined,
          photos: photos.length > 0 ? photos : undefined,
        })
      }

      setInvalidRows(errors)

      if (records.length === 0) {
        throw new Error(
          `Tidak ada data inspeksi valid yang berhasil diekstrak.${
            errors.length > 0 ? ` (${errors.length} baris ditolak karena field wajib tidak lengkap)` : ""
          }`
        )
      }

      setParsedRecords(records)
      toast.success(`Berhasil membaca ${records.length} data inspeksi valid dari file.`)
    } catch (err: any) {
      console.error("Error parsing Excel/CSV:", err)
      setErrorMsg(err?.message || "Gagal membaca format file. Pastikan format sesuai template KPC.")
      toast.error(err?.message || "Gagal membaca file")
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }

  // Execute Bulk Create Action
  const handleSubmitImport = async () => {
    if (parsedRecords.length === 0) return
    setIsImporting(true)
    try {
      const res = await bulkCreateTireRepairInspectionsAction(parsedRecords, {
        overwriteDuplicates,
      })

      if (res.success || res.insertedCount > 0 || res.updatedCount > 0 || res.skippedCount > 0) {
        const combinedErrors = [...invalidRows, ...(res.errors || [])]
        const summary: ImportResultSummary = {
          total: parsedRecords.length + invalidRows.length,
          insertedCount: res.insertedCount || 0,
          updatedCount: res.updatedCount || 0,
          skippedCount: res.skippedCount || 0,
          failedCount: (res.failedCount || 0) + invalidRows.length,
          errors: combinedErrors,
        }

        setImportSummary(summary)
        toast.success(
          `Import Selesai! (${summary.insertedCount} Baru, ${summary.updatedCount} Di-update, ${summary.skippedCount} Dilewati)`
        )
        onSuccess()
      } else {
        toast.error(res.message || "Gagal menyimpan data import ke database.")
      }
    } catch (err: any) {
      console.error("Error executing bulk import action:", err)
      toast.error("Terjadi kesalahan koneksi/sistem saat import data.")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border-slate-200">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-[#f6fbff] dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#003f78]/10 text-[#003f78] dark:bg-sky-500/20 dark:text-sky-300 flex items-center justify-center border border-[#003f78]/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#082033] dark:text-slate-100 flex items-center gap-2">
                  Import Tyre Inspection Report
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    Excel (.xlsx) Standard KPC
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#486275] dark:text-slate-400 mt-0.5">
                  Upload file Excel (.xlsx) sesuai format standar CP-KPC.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Post-Import Summary Screen */}
          {importSummary ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                      Proses Import Berhasil Diselesaikan!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Ringkasan eksekusi data laporan inspeksi ban dari file Excel.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 text-center">
                  <div className="bg-white/80 dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Berhasil Tambah</p>
                    <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                      {importSummary.insertedCount}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Berhasil Update</p>
                    <p className="text-lg font-extrabold text-blue-700 dark:text-blue-400">
                      {importSummary.updatedCount}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Dilewati (Skip)</p>
                    <p className="text-lg font-extrabold text-amber-700 dark:text-amber-400">
                      {importSummary.skippedCount}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Gagal / Penolakan</p>
                    <p className="text-lg font-extrabold text-rose-700 dark:text-rose-400">
                      {importSummary.failedCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Details if any */}
              {importSummary.errors.length > 0 && (
                <div className="border border-rose-200 dark:border-rose-900 rounded-xl overflow-hidden bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="p-3 bg-rose-100/80 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Detail Rincian Baris Gagal / Ditolak ({importSummary.errors.length} Baris)
                    </span>
                  </div>
                  <div className="max-h-[180px] overflow-y-auto p-2">
                    <Table className="text-xs">
                      <TableHeader className="bg-white dark:bg-slate-800">
                        <TableRow>
                          <TableHead className="w-16">Baris</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Alasan Penolakan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importSummary.errors.map((err, idx) => (
                          <TableRow key={idx} className="hover:bg-rose-100/30">
                            <TableCell className="font-mono font-bold text-rose-700">#{err.row}</TableCell>
                            <TableCell className="font-mono font-semibold">{err.serialNumber}</TableCell>
                            <TableCell className="text-rose-600">{err.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* File Upload / Drag-Drop Zone */}
              {!file && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/30 hover:bg-[#f6fbff] hover:border-[#003f78]/40 transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-md text-[#003f78] dark:text-sky-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform border border-slate-100">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[#082033] dark:text-slate-200">
                    Klik untuk memilih file Excel atau tarik & lepas (Drag & Drop) di sini
                  </p>
                  <p className="text-xs text-[#486275] dark:text-slate-400 mt-1">
                    Format yang didukung: <span className="font-semibold text-[#003f78]">.xlsx, .xls</span> (Format Standar KPC)
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <a
                      href="/api/export/tire-inspection"
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#003f78] dark:text-sky-400 hover:underline bg-white dark:bg-slate-800 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Template Excel Format Standar KPC</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Selected File Status Bar & Overwrite Options */}
              {file && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-[#f6fbff] dark:bg-slate-800/60 rounded-xl border border-[#003f78]/20 text-xs">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#003f78] dark:text-sky-400" />
                      <div>
                        <p className="font-bold text-[#082033] dark:text-slate-200">{file.name}</p>
                        <p className="text-[11px] text-[#486275] dark:text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB · {parsedRecords.length} Data inspeksi valid terekstrak
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetState}
                      className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Ganti File
                    </Button>
                  </div>

                  {/* Duplicate Handling Mode Toggle */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#003f78] dark:text-sky-400 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Opsi Penanganan Duplikasi (Serial Number sama):
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setOverwriteDuplicates(true)}
                        className={`px-3 py-1 rounded-md font-bold transition-all ${
                          overwriteDuplicates
                            ? "bg-[#003f78] text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Update Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverwriteDuplicates(false)}
                        className={`px-3 py-1 rounded-md font-bold transition-all ${
                          !overwriteDuplicates
                            ? "bg-[#003f78] text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Skip / Abaikan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Gagal Mengolah File Excel</p>
                    <p className="mt-0.5">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {isParsing && (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-[#003f78] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-[#082033]">Membaca & Mengekstrak Data Laporan Ban...</p>
                </div>
              )}

              {/* Parsed Preview Table */}
              {!isParsing && parsedRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#082033] dark:text-slate-200 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Pratinjau Data ({parsedRecords.length} Rekam Inspeksi Siap Import)
                    </span>
                    {invalidRows.length > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                        {invalidRows.length} Baris Ditolak (Field Wajib Kosong)
                      </Badge>
                    )}
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table className="text-xs">
                      <TableHeader className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-10">No</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Specification</TableHead>
                          <TableHead>Vehicle & Pos</TableHead>
                          <TableHead>Pit Location</TableHead>
                          <TableHead>Removal / Scrap Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRecords.map((rec, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/80">
                            <TableCell className="font-mono text-[11px] text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="font-mono font-bold text-[#003f78] dark:text-sky-400">
                              {rec.serialNumber}
                            </TableCell>
                            <TableCell className="font-semibold">{rec.tireSize}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  rec.status === "Repair"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    : rec.status === "Retread"
                                    ? "bg-sky-50 text-sky-700 border-sky-300"
                                    : "bg-rose-50 text-rose-700 border-rose-300"
                                }`}
                              >
                                {rec.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                {rec.repairDuration || "R1"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[11px] text-slate-600">
                              {rec.brand} {rec.tireSize} {rec.pattern}
                            </TableCell>
                            <TableCell className="text-[11px]">
                              {rec.vehicle || "-"}{rec.wheelPosition ? ` (${rec.wheelPosition})` : ""}
                            </TableCell>
                            <TableCell className="text-[11px]">{rec.pitLocation || rec.inspectLocation}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-[11px] text-slate-600" title={rec.removalReason || rec.scrapReason || rec.remarks}>
                              {rec.removalReason || rec.scrapReason || rec.remarks || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isImporting} className="h-9">
            {importSummary ? "Tutup" : "Batal"}
          </Button>

          {!importSummary && (
            <Button
              size="sm"
              onClick={handleSubmitImport}
              disabled={parsedRecords.length === 0 || isImporting || isParsing}
              className="h-9 gap-1.5 bg-[#003f78] hover:bg-[#002e59] text-white shadow-md font-bold px-5"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengimport Data...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Proses Import ({parsedRecords.length} Data)</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

