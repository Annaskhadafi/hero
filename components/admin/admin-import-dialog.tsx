"use client"

import * as React from "react"
import { FileSpreadsheet, Upload, Wand2 } from "lucide-react"

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

type AdminImportDialogProps = {
  title: string
  description?: string
  fields: AdminImportField[]
  trigger?: React.ReactNode
  onConfirm?: (mapping: Record<string, string>) => void
}

const sampleColumns = ["Column A", "Column B", "Column C"]

export function AdminImportDialog({
  title,
  description,
  fields,
  trigger,
  onConfirm,
}: AdminImportDialogProps) {
  const [fileName, setFileName] = React.useState("")
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const missingRequired = fields.filter((field) => field.required && !mapping[field.key])

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
        <DialogHeader className="border-b border-outline-ghost/70 px-4 py-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Upload Excel/CSV, preview kolom, mapping field HERO, lalu validasi sebelum import."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 p-4">
          <Label className="grid gap-2">
            File Excel/CSV
            <Input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
          </Label>

          <div className="rounded-lg bg-surface-container-low p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <FileSpreadsheet className="size-4 text-primary" />
              {fileName || "Belum ada file dipilih"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Preview mapping memakai sample kolom sampai parser page-specific tersambung.
            </p>
          </div>

          <div className="grid gap-2">
            {fields.map((field) => (
              <div
                key={field.key}
                className="grid gap-2 rounded-lg bg-surface-container-lowest p-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)] sm:grid-cols-[1fr_220px] sm:items-center"
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
                  className="h-9 rounded-md border-0 bg-surface-container-low px-3 text-sm shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
                >
                  <option value="">Pilih kolom</option>
                  {sampleColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-muted-foreground">
            Validation: {missingRequired.length === 0 ? "mapping required lengkap" : `${missingRequired.length} required field belum mapped`}
          </div>
        </div>

        <DialogFooter className="border-t border-outline-ghost/70 p-4">
          <Button type="button" variant="outline" size="dense">
            Batal
          </Button>
          <Button type="button" size="dense" disabled={missingRequired.length > 0} onClick={() => onConfirm?.(mapping)}>
            <Wand2 className="size-4" />
            Confirm import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
