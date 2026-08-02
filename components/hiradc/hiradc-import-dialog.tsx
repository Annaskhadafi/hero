"use client"

import * as React from "react"
import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileSpreadsheet, Upload } from "lucide-react"

import {
  importHiradcAction,
  type HiradcImportState,
} from "@/app/dashboard/hse/hiradc/actions"

const INITIAL_HIRADC_IMPORT_STATE: HiradcImportState = { ok: false, message: "" }
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const MAPPING: Array<{ source: string; target: string; note: string }> = [
  { source: "Departemen", target: "Departemen", note: "Normalisasi typo (Miantenance → Maintenance)" },
  { source: "Lokasi", target: "Lokasi / Area", note: "Teks" },
  { source: "Aktifitas / Produk / Jasa", target: "Nama Kegiatan", note: "Teks" },
  { source: "Aktifitas R / RR", target: "Rutin / Tidak Rutin", note: "Normalisasi (No Rutin → Tidak Rutin)" },
  { source: "Alat (Equipment)", target: "Alat", note: "Teks" },
  { source: "Bahaya", target: "Bahaya (Kategori)", note: "Teks" },
  { source: "Rinci", target: "Rincian Bahaya", note: "Teks" },
  { source: "Resiko", target: "Resiko / Konsekuensi", note: "Teks" },
  { source: "Kemungkinan (1–5)", target: "Peluang (A–E)", note: "Konversi 1→A, 2→B … 5→E" },
  { source: "Keparahan (A–E)", target: "Akibat (1–5)", note: "Konversi A→5, B→4 … E→1" },
  { source: "Nilai Resiko", target: "Nilai Risiko (Score)", note: "Dihitung ulang Peluang × Akibat (sumber disimpan audit)" },
  { source: "Tingkat Resiko", target: "Tingkat Risiko", note: "SIGNIFIKAN→EXTREME, TINGGI→HIGH, SEDANG→MODERATE, RENDAH→LOW" },
  { source: "Kontrol Yang Ada", target: "Pengendalian yang Ada", note: "Teks" },
  { source: "Legal", target: "Referensi Legal", note: "Teks" },
  { source: "Kemungkinan/Keparahan (After)", target: "Peluang/Akibat – After", note: "Konversi sama" },
  { source: "Pengendalian Tambahan", target: "Pengendalian Tambahan", note: "Teks / Kode IK / WIN" },
]

export function HiradcImportDialog({ canEdit }: { canEdit: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const [state, formAction, isPending] = useActionState(importHiradcAction, INITIAL_HIRADC_IMPORT_STATE)

  useEffect(() => {
    if (state.ok) {
      router.refresh()
    }
  }, [state.ok, state, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="dense" disabled={!canEdit}>
          <Upload className="size-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="grid max-h-[calc(100vh-2rem)] w-[min(820px,96vw)] gap-0 overflow-hidden p-0 sm:max-w-[820px]">
        <DialogHeader className="border-b bg-surface-container-low px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4" /> Import HIRADC dari Excel
          </DialogTitle>
          <DialogDescription>
            Unggah workbook HIRADC (sheet &quot;HIRA Import Data&quot;). Mapping kolom + konversi skala risiko diterapkan otomatis.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex max-h-[72vh] flex-col overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">File Excel (.xlsx)</span>
                <input
                  type="file"
                  name="file"
                  accept=".xlsx,.xls"
                  required
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                  className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Pengelompokan Register</span>
                <select
                  name="grouping"
                  defaultValue="department"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="department">Per Departemen (disarankan)</option>
                  <option value="single">Satu Register Master</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="replaceExisting" value="true" className="size-4 rounded border-input" />
              Ganti semua data HIRADC yang ada (replace existing)
            </label>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Field Mapping</p>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 text-[0.68rem] uppercase">Kolom Excel</TableHead>
                      <TableHead className="h-9 text-[0.68rem] uppercase">Field Sistem</TableHead>
                      <TableHead className="h-9 text-[0.68rem] uppercase">Konversi / Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MAPPING.map((m) => (
                      <TableRow key={m.source}>
                        <TableCell className="py-2 text-xs font-medium">{m.source}</TableCell>
                        <TableCell className="py-2 text-xs">{m.target}</TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground">{m.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {state.message ? (
              <Alert variant={state.ok ? "default" : "destructive"}>
                <AlertTitle>{state.ok ? "Import berhasil" : "Import gagal"}</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter className="border-t bg-surface-container-low px-5 py-4">
            <span className="mr-auto truncate text-xs text-muted-foreground">{fileName || "Belum ada file"}</span>
            <Button type="button" variant="outline" size="dense" onClick={() => setOpen(false)}>
              Tutup
            </Button>
            <Button type="submit" size="dense" disabled={isPending || !canEdit}>
              {isPending ? "Memproses..." : "Import Sekarang"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
