'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { importSioCertAction } from "@/app/dashboard/admin-actions"

interface PreviewRow {
  employeeName: string
  employeeSn: string
  certType: string
  certName: string
  issuingBody: string
  certDate: string | null
  expiryDate: string | null
}

const INITIAL_IMPORT_STATE = { status: 'idle' as const, message: '', importedCount: 0, updatedCount: 0, skippedCount: 0 }

export function SioImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rawCsv, setRawCsv] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [actionState, formAction, isPending] = useActionState(importSioCertAction, INITIAL_IMPORT_STATE)

  const previewRows = useMemo(() => {
    if (!rawCsv) return []
    const lines = rawCsv.split('\n').filter(Boolean)
    if (lines.length < 2) return []
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim())
      return {
        employeeName: cols[0] || '',
        employeeSn: cols[1] || '',
        certType: cols[2] || '',
        certName: cols[3] || '',
        issuingBody: cols[4] || '',
        certDate: cols[5] || null,
        expiryDate: cols[6] || null,
      }
    }).slice(0, 20)
  }, [rawCsv])

  useEffect(() => {
    if (actionState.status === 'success') {
      setRawCsv('')
      setTimeout(() => { setOpen(false); onSuccess() }, 1500)
    }
  }, [actionState.status])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      if (!data) return

      try {
        const wb = XLSX.read(data, { type: 'array' })
        const allRows: PreviewRow[] = []

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' })
          if (json.length < 5) continue

          const headers = (json[4] as string[]).map((h: string) => (h || '').toString().toLowerCase().trim())
          const ni = headers.findIndex((h: string) => h === 'name')
          const si = headers.findIndex((h: string) => h === 'sn')
          const jti = headers.findIndex((h: string) => h.includes('jenis'))
          const tgi = headers.findIndex((h: string) => h.includes('tanggal'))
          const mbi = headers.findIndex((h: string) => h.includes('masa'))
          const noi = headers.findIndex((h: string) => h.includes('note'))
          const certType = sheetName.toLowerCase().includes('pop') ? 'POP' : sheetName.toLowerCase().includes('pom') ? 'POM' : 'SIO'

          for (let i = 5; i < json.length; i++) {
            const row = json[i] as any[]
            if (!row[ni]) continue
            allRows.push({
              employeeName: `${row[ni] || ''}`,
              employeeSn: si >= 0 ? `${row[si] || ''}` : '',
              certType,
              certName: jti >= 0 ? `${row[jti] || ''}` : '',
              issuingBody: noi >= 0 ? `${row[noi] || ''}` : '',
              certDate: parseExcelDate(row[tgi]),
              expiryDate: parseExcelDate(row[mbi]),
            })
          }
        }

        if (allRows.length === 0) return
        setRawCsv(rowsToCsv(allRows))
      } catch (err) {
        console.error('Parse error:', err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function reset() {
    setRawCsv('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs gap-1.5 border-muted">
          <Upload className="size-4" />
          Import SIO Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Sertifikasi SIO/POP/POM</DialogTitle>
          <DialogDescription>Upload file Excel Sertifikasi SIO dan POP.xlsx. Sistem membaca sheet &quot;SIO&quot; dan &quot;POP dan POM&quot;.</DialogDescription>
        </DialogHeader>

        {!rawCsv && (
          <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" id="sio-file-input" />
            <label htmlFor="sio-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <FileSpreadsheet className="size-10 text-muted-foreground" />
              <span className="text-sm font-medium">Klik untuk pilih file Excel</span>
              <span className="text-xs text-muted-foreground">Format: Sertifikasi SIO dan POP.xlsx</span>
            </label>
          </div>
        )}

        {rawCsv && actionState.status !== 'success' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 text-primary" />
              <span className="font-medium">{previewRows.length} baris pratinjau</span>
              <Badge variant="outline" className="text-[10px]">{rawCsv.split('\n').length - 1} records</Badge>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="p-2 text-left">Nama</th>
                    <th className="p-2 text-left">SN</th>
                    <th className="p-2 text-left">Tipe</th>
                    <th className="p-2 text-left">Jenis</th>
                    <th className="p-2 text-left">Tgl</th>
                    <th className="p-2 text-left">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t border-muted/30">
                      <td className="p-2">{r.employeeName}</td>
                      <td className="p-2 text-muted-foreground">{r.employeeSn}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[9px]">{r.certType}</Badge></td>
                      <td className="p-2">{r.certName || '-'}</td>
                      <td className="p-2 text-muted-foreground">{r.certDate || '-'}</td>
                      <td className="p-2 text-muted-foreground">{r.expiryDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form action={formAction}>
              <input type="hidden" name="rawCsv" value={rawCsv} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={reset}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Mengimpor...' : 'Konfirmasi Import'}</Button>
              </DialogFooter>
            </form>
          </div>
        )}

        {rawCsv && actionState.status === 'success' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 text-emerald-800">
              <CheckCircle className="size-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Import Berhasil</p>
                <p className="text-xs mt-1">{actionState.message}</p>
                <div className="flex gap-3 mt-2 text-xs">
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-0">{actionState.importedCount} Baru</Badge>
                  <Badge className="bg-blue-500/10 text-blue-700 border-0">{actionState.updatedCount} Update</Badge>
                  <Badge className="bg-slate-500/10 text-slate-700 border-0">{actionState.skippedCount} Skip</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {actionState.status === 'error' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 text-rose-800">
            <AlertCircle className="size-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Gagal</p>
              <p className="text-xs mt-1">{actionState.message}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function parseExcelDate(value: any): string | null {
  if (!value || value === '-' || value === '') return null
  const num = Number(value)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    return new Date((num - 25569) * 86400 * 1000).toISOString().split('T')[0]
  }
  const d = new Date(value)
  return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null
}

function rowsToCsv(rows: PreviewRow[]): string {
  const header = 'name,sn,cert_type,cert_name,issuing_body,cert_date,expiry_date'
  const lines = rows.map((r) => [r.employeeName, r.employeeSn, r.certType, r.certName, r.issuingBody, r.certDate || '', r.expiryDate || ''].map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(','))
  return [header, ...lines].join('\n')
}
