"use client"

import * as React from "react"
import { CheckCircle2, FileSpreadsheet, Upload, Wand2 } from "lucide-react"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type AdminImportField = {
  key: string
  label: string
  required?: boolean
}

export type AdminImportPayload = {
  file: File | null
  headers: string[]
  rows: string[][]
  mapping: Record<string, string>
}

type AdminImportDialogProps = {
  title: string
  description?: string
  fields: AdminImportField[]
  trigger?: React.ReactNode
  onConfirm?: (payload: AdminImportPayload) => void
}

const sampleColumns = ["Column A", "Column B", "Column C"]

function normalizeImportToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function parseWorkbookRows(file: File, buffer: ArrayBuffer) {
  const lowerName = file.name.toLowerCase()

  if (lowerName.endsWith(".csv")) {
    const text = new TextDecoder().decode(buffer)
    const workbook = XLSX.read(text, { type: "string" })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    return XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    })
  }

  const workbook = XLSX.read(buffer, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  return XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  })
}

function normalizeParsedRows(rows: (string | number | boolean | null)[][]) {
  return rows
    .map((row) => row.map((cell) => `${cell ?? ""}`.trim()))
    .filter((row) => row.some((cell) => cell.length > 0))
}

function buildAutoMapping(fields: AdminImportField[], columns: string[]) {
  const normalizedColumns = columns.map((column) => ({
    raw: column,
    normalized: normalizeImportToken(column),
  }))

  const next: Record<string, string> = {}
  for (const field of fields) {
    const normalizedFieldKey = normalizeImportToken(field.key)
    const normalizedFieldLabel = normalizeImportToken(field.label)
    const matchedColumn = normalizedColumns.find(
      (column) =>
        normalizedFieldLabel.includes(column.normalized) ||
        column.normalized.includes(normalizedFieldLabel) ||
        normalizedFieldKey.includes(column.normalized) ||
        column.normalized.includes(normalizedFieldKey),
    )
    next[field.key] = matchedColumn?.raw ?? ""
  }

  return next
}

export function AdminImportDialog({
  title,
  description,
  fields,
  trigger,
  onConfirm,
}: AdminImportDialogProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [fileName, setFileName] = React.useState("")
  const [fileTypeNote, setFileTypeNote] = React.useState("Upload CSV/XLSX untuk preview header live, sample row, dan mapping field.")
  const [detectedColumns, setDetectedColumns] = React.useState<string[]>(sampleColumns)
  const [parsedRows, setParsedRows] = React.useState<string[][]>([])
  const [sampleRows, setSampleRows] = React.useState<string[][]>([])
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const missingRequired = fields.filter((field) => field.required && !mapping[field.key])
  const mappedCount = fields.filter((field) => mapping[field.key]).length

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setSelectedFile(file ?? null)
    setFileName(file?.name ?? "")

    if (!file) {
      setDetectedColumns(sampleColumns)
      setParsedRows([])
      setSampleRows([])
      setFileTypeNote("Upload CSV/XLSX untuk preview header live, sample row, dan mapping field.")
      setMapping({})
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const parsedRows = normalizeParsedRows(parseWorkbookRows(file, buffer))
      const nextColumns = parsedRows[0]?.length ? parsedRows[0] : sampleColumns
      const nextDataRows = parsedRows.slice(1)
      const nextSampleRows = nextDataRows.slice(0, 3)

      setDetectedColumns(nextColumns)
      setParsedRows(nextDataRows)
      setSampleRows(nextSampleRows)
      setFileTypeNote(
        parsedRows.length > 0
          ? `Header ${file.name.toLowerCase().endsWith(".csv") ? "CSV" : "Excel"} terdeteksi. Mapping bisa disesuaikan sebelum import.`
          : "File terbaca, tapi header tidak ditemukan. Tetap lanjut dengan mapping manual.",
      )
      setMapping(buildAutoMapping(fields, nextColumns))
    } catch (error) {
      setDetectedColumns(sampleColumns)
      setParsedRows([])
      setSampleRows([])
      setFileTypeNote("File gagal diparse. Cek format file lalu coba lagi.")
      setMapping({})
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="dense">
            <Upload className="size-4" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-[720px]">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Upload Excel/CSV, preview kolom, mapping field HERO, lalu validasi sebelum import."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 p-5">
          <Label className="grid gap-2">
            File Excel/CSV
            <Input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
            />
          </Label>

          <div className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <FileSpreadsheet className="size-4 text-primary" />
              {fileName || "Belum ada file dipilih"}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {fileTypeNote}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {detectedColumns.map((column) => (
                <span key={column} className="inline-flex rounded-full border border-border/70 bg-white px-2.5 py-1 text-xs text-foreground">
                  {column}
                </span>
              ))}
            </div>
            {sampleRows.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border/70 bg-white">
                <div className="border-b border-border/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                  Sample data
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        {detectedColumns.map((column) => (
                          <th key={column} className="border-b border-border/70 px-3 py-2 text-left font-semibold text-foreground">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleRows.map((row, rowIndex) => (
                        <tr key={`sample-row-${rowIndex}`} className="border-b border-border/60 last:border-b-0">
                          {detectedColumns.map((column, columnIndex) => (
                            <td key={`${column}-${rowIndex}-${columnIndex}`} className="px-3 py-2 text-muted-foreground">
                              {row[columnIndex] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            {fields.map((field) => (
              <div
                key={field.key}
                className="grid gap-2 rounded-xl border border-border/70 bg-white p-3 sm:grid-cols-[1fr_240px] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {field.label}
                    {field.required ? <span className="text-destructive"> *</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{field.key}</p>
                </div>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}
                  className="h-9 rounded-lg border border-border/70 bg-muted/30 px-3 text-sm shadow-none"
                >
                  <option value="">Pilih kolom</option>
                  {detectedColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/70 bg-white px-4 py-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span>Mapped {mappedCount}/{fields.length} field</span>
              <span>
                Validation: {missingRequired.length === 0 ? "mapping required lengkap" : `${missingRequired.length} required field belum mapped`}
              </span>
              {missingRequired.length === 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  Siap import
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 p-4">
          <Button type="button" variant="outline" size="dense">
            Batal
          </Button>
          <Button
            type="button"
            size="dense"
            disabled={missingRequired.length > 0}
            onClick={() =>
              onConfirm?.({
                file: selectedFile,
                headers: detectedColumns,
                rows: parsedRows,
                mapping,
              })
            }
          >
            <Wand2 className="size-4" />
            Confirm import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
