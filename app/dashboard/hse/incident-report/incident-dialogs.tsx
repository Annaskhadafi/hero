"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { FileText, Download, Edit3, Printer, Loader2, Upload, Search, Check, X } from "lucide-react"
import { uploadFile } from "@/app/actions/upload"
import { createIncidentRecord, updateIncidentRecord } from "./actions"

type Site = { id: number; name: string }

type IncidentRecord = {
  id: number
  title: string
  category: string
  severity: string
  description: string
  siteId: number | null
  investigationStatus: string
  incidentDate: Date
  picEmployeeId: number | null
  picName: string
  rootCauseAnalysis: string
  immediateCorrectiveAction: string
  documentationUrl: string
  createdAt: Date
  updatedAt: Date
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: IncidentRecord | null
  sites: Site[]
  onSuccess: () => void
}

const CATEGORIES = [
  "Near Miss",
  "Minor Accident",
  "Medical Treatment",
  "Restricted Work",
  "Lost Time Injury",
  "Fatality",
  "Property Damage",
  "Environmental Incident",
  "Dangerous Occurrence",
]

const SEVERITIES = ["Low", "Medium", "High", "Critical"]
const STATUSES = ["Open", "Investigation", "Closed"]

export function IncidentFormDialog({ open, onOpenChange, item, sites, onSuccess }: FormDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const [title, setTitle] = React.useState("")
  const [category, setCategory] = React.useState(CATEGORIES[0])
  const [severity, setSeverity] = React.useState(SEVERITIES[0])
  const [description, setDescription] = React.useState("")
  const [siteId, setSiteId] = React.useState<number | null>(null)
  const [investigationStatus, setInvestigationStatus] = React.useState(STATUSES[0])
  const [incidentDate, setIncidentDate] = React.useState("")
  const [picName, setPicName] = React.useState("")
  const [rootCauseAnalysis, setRootCauseAnalysis] = React.useState("")
  const [immediateCorrectiveAction, setImmediateCorrectiveAction] = React.useState("")
  const [documentationUrl, setDocumentationUrl] = React.useState("")

  React.useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title)
        setCategory(item.category)
        setSeverity(item.severity)
        setDescription(item.description)
        setSiteId(item.siteId)
        setInvestigationStatus(item.investigationStatus)
        setIncidentDate(new Date(item.incidentDate).toISOString().slice(0, 16))
        setPicName(item.picName)
        setRootCauseAnalysis(item.rootCauseAnalysis)
        setImmediateCorrectiveAction(item.immediateCorrectiveAction)
        setDocumentationUrl(item.documentationUrl)
      } else {
        setTitle("")
        setCategory(CATEGORIES[0])
        setSeverity(SEVERITIES[0])
        setDescription("")
        setSiteId(null)
        setInvestigationStatus(STATUSES[0])
        setIncidentDate(new Date().toISOString().slice(0, 16))
        setPicName("")
        setRootCauseAnalysis("")
        setImmediateCorrectiveAction("")
        setDocumentationUrl("")
      }
    }
  }, [open, item])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB")
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setDocumentationUrl(res.url)
        toast.success("File berhasil diunggah")
      } else {
        toast.error("Gagal mengunggah file")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat unggah")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      title,
      category,
      severity,
      description,
      siteId: siteId ?? undefined,
      investigationStatus,
      incidentDate: new Date(incidentDate),
      picName,
      rootCauseAnalysis,
      immediateCorrectiveAction,
      documentationUrl,
    }

    try {
      let res
      if (item) {
        res = await updateIncidentRecord(item.id, payload)
      } else {
        res = await createIncidentRecord(payload)
      }

      if (res.success) {
        toast.success(item ? "Laporan berhasil diperbarui" : "Laporan berhasil dibuat")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(res.error || "Gagal menyimpan laporan")
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Laporan Insiden" : "Buat Laporan Insiden Baru"}</DialogTitle>
          <DialogDescription>
            Isi formulir berikut dengan lengkap untuk mendokumentasikan insiden K3.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase">Judul / Nama Insiden</Label>
            <Input
              id="title"
              placeholder="Contoh: Pekerja Tersandung Kabel di Area Produksi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tingkat Keparahan" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((sev) => (
                    <SelectItem key={sev} value={sev}>{sev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Proyek / Lokasi</Label>
              <Select value={siteId ? String(siteId) : "none"} onValueChange={(val) => setSiteId(val === "none" ? null : Number(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Proyek/Lokasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ditentukan / Kantor Pusat</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incidentDate" className="text-xs font-semibold text-muted-foreground uppercase">Waktu Kejadian</Label>
              <Input
                id="incidentDate"
                type="datetime-local"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase">Deskripsi Kronologi</Label>
            <Textarea
              id="description"
              placeholder="Ceritakan kronologi kejadian secara detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="border-t border-dashed border-border/80 my-2 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Investigasi & Analisis</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Status Investigasi</Label>
                <Select value={investigationStatus} onValueChange={setInvestigationStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="picName" className="text-xs font-semibold text-muted-foreground uppercase">PIC Investigasi</Label>
                <Input
                  id="picName"
                  placeholder="Nama Investigator / Petugas"
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rootCauseAnalysis" className="text-xs font-semibold text-muted-foreground uppercase">Root Cause Analysis (RCA)</Label>
              <Textarea
                id="rootCauseAnalysis"
                placeholder="Analisis akar masalah..."
                value={rootCauseAnalysis}
                onChange={(e) => setRootCauseAnalysis(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="immediateCorrectiveAction" className="text-xs font-semibold text-muted-foreground uppercase">Tindakan Perbaikan</Label>
              <Textarea
                id="immediateCorrectiveAction"
                placeholder="Tindakan yang langsung dilakukan atau direkomendasikan..."
                value={immediateCorrectiveAction}
                onChange={(e) => setImmediateCorrectiveAction(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-2 border-t border-dashed border-border/80 pt-4 mt-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Lampiran Foto/Dokumen (Max 2MB)</Label>
            <div className="flex items-center gap-4">
              <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input px-3 py-2 text-sm font-semibold shadow-sm hover:bg-muted">
                {uploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="mr-2 size-4 text-muted-foreground" />
                )}
                {documentationUrl ? "Ganti File" : "Pilih File"}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {documentationUrl && (
                <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                  {documentationUrl}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading || uploading} className="bg-primary text-white hover:bg-primary/90">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {item ? "Perbarui Laporan" : "Simpan Laporan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: IncidentRecord | null
  sites: Site[]
  onEditClick: () => void
  canEdit: boolean
}

export function IncidentDetailDialog({
  open,
  onOpenChange,
  item,
  sites,
  onEditClick,
  canEdit,
}: DetailDialogProps) {
  if (!item) return null

  const handlePrint = () => {
    const printContent = document.getElementById("printable-document-hse-incident")?.innerHTML
    if (!printContent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>INCIDENT REPORT - ${item.title}</title>
          <style>
            @media print {
              @page { size: A4; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, sans-serif; font-size: 10pt; color: #0f172a; margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .pdf-wrapper { padding: 0; box-shadow: none !important; border: none !important; }
            }
            body { font-family: Arial, sans-serif; font-size: 10pt; color: #0f172a; margin: 20px; }
            .pdf-wrapper { max-width: 800px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .header-title { font-size: 16px; font-weight: bold; margin: 0; color: #0f172a; }
            .header-subtitle { font-size: 10px; font-weight: bold; margin: 2px 0 0; color: #1e3a8a; letter-spacing: 0.5px; }
            .header-meta { font-size: 9px; color: #64748b; margin-top: 4px; }
            .badge-verified { border: 2px solid #0f172a; border-radius: 50%; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #0f172a; transform: rotate(-5deg); }
            .meta-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; font-size: 9px; }
            .meta-item { display: flex; flex-direction: column; gap: 2px; }
            .meta-label { font-weight: bold; text-transform: uppercase; color: #64748b; font-size: 8px; letter-spacing: 0.5px; }
            .meta-val { font-weight: bold; color: #0f172a; }
            .banner-strip { background-color: #1e293b; color: white; padding: 12px 16px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
            .banner-left { flex: 1; }
            .banner-label { font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: bold; letter-spacing: 1px; }
            .banner-title { font-size: 14px; font-weight: bold; margin: 2px 0 0; text-transform: uppercase; }
            .banner-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
            .badge-severity { background: #f59e0b; color: white; padding: 4px 10px; border-radius: 9999px; font-size: 9px; font-weight: bold; }
            .badge-severity.critical { background: #e11d48; }
            .badge-severity.high { background: #f97316; }
            .badge-severity.medium { background: #f59e0b; }
            .badge-severity.low { background: #3b82f6; }
            .box-section { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; page-break-inside: avoid; }
            .box-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
            .box-content { font-size: 10px; color: #0f172a; line-height: 1.5; white-space: pre-wrap; }
            .photo-section { border-top: 1px dashed #cbd5e1; padding-top: 16px; page-break-inside: avoid; }
            .photo-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px; }
            .photo-img { max-width: 100%; max-height: 300px; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain; }
          </style>
        </head>
        <body>
          <div class="pdf-wrapper">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const getSiteName = (siteId: number | null) => {
    if (!siteId) return "-"
    const site = sites.find((s) => s.id === siteId)
    return site ? site.name : "-"
  }

  const incDateStr = new Date(item.incidentDate).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short"
  })

  const getSeverityClass = (sev: string) => {
    const s = sev.toLowerCase()
    if (s.includes("critical")) return "critical"
    if (s.includes("high")) return "high"
    if (s.includes("low")) return "low"
    return "medium"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Preview Dokumen Laporan Insiden</DialogTitle>
          <DialogDescription>
            Tampilan laporan insiden K3 resmi untuk cetak dokumen fisik.
          </DialogDescription>
        </DialogHeader>

        {/* Action Buttons Top */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3 mb-2 no-print">
          <div className="flex items-center gap-2 bg-surface-container-low rounded-lg p-1.5 text-xs text-muted-foreground border">
            <FileText className="size-4 text-primary" />
            <span className="font-semibold">INC-{item.id.toString().padStart(4, '0')}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Verified
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEditClick}>
                <Edit3 className="mr-1.5 size-4" />
                Edit Laporan
              </Button>
            )}
            {item.documentationUrl && (
              <a href={item.documentationUrl} target="_blank" rel="noreferrer" className="no-underline">
                <Button variant="outline" size="sm" type="button">
                  <Download className="mr-1.5 size-4" />
                  Lihat Lampiran
                </Button>
              </a>
            )}
            <Button size="sm" onClick={handlePrint} className="bg-primary text-white hover:bg-primary/90">
              <Printer className="mr-1.5 size-4" />
              Cetak Dokumen
            </Button>
          </div>
        </div>

        {/* WYSIWYG PDF-WRAPPER */}
        <div
          id="printable-document-hse-incident"
          className="pdf-wrapper border rounded-xl bg-white p-6 shadow-sm max-w-[800px] mx-auto text-[#0f172a]"
        >
          {/* Header PT (Same as Inventaris) */}
          <div className="header-container flex items-center justify-between border-b-2 border-[#0f172a] pb-3 mb-4">
            <div className="header-left flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <FileText className="size-6" />
              </div>
              <div>
                <h3 className="header-title text-base font-extrabold text-[#0f172a] uppercase leading-none">
                  PT. NUSANTARA PRATAMA HSEK3
                </h3>
                <p className="header-subtitle text-[10px] font-bold text-blue-900 tracking-wider uppercase mt-1">
                  Safety is our core value. Protect your future.
                </p>
                <p className="header-meta text-[9px] text-[#64748b] leading-tight mt-1">
                  Kawasan Industri Jababeka XI, Cikarang, Indonesia<br />
                  Phone: +62 21 8989 7788 | Email: hseinsight@gmail.com • OFFICIAL HSE SYSTEM
                </p>
              </div>
            </div>
            <div className="badge-verified border-2 border-[#0f172a] rounded-full size-14 flex flex-col items-center justify-center text-[8px] font-extrabold text-[#0f172a] uppercase select-none -rotate-6">
              <span>Verified</span>
              <span className="text-[6px] text-muted-foreground mt-0.5">System</span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="meta-grid grid grid-cols-4 gap-2 border-b border-border/80 pb-3 mb-4 text-[9px] leading-tight">
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Report ID</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">INC-{item.id.toString().padStart(4, '0')}</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Location / Site</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{getSiteName(item.siteId)}</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Incident Date</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{incDateStr}</span>
            </div>
            <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">PIC Investigator</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{item.picName}</span>
            </div>
          </div>

          {/* Banner Log */}
          <div className="banner-strip bg-[#1e293b] text-white p-3 rounded-lg flex items-center justify-between mb-4">
            <div className="banner-left">
              <span className="banner-label text-[9px] uppercase tracking-wider text-[#94a3b8] font-bold">HSE Incident Report</span>
              <h2 className="banner-title text-base font-extrabold text-white mt-0.5 uppercase">
                {item.title}
              </h2>
            </div>
            <div className="banner-right flex flex-col items-end">
              <span className="text-[10px] text-white/80 font-semibold mb-1 uppercase tracking-wider">{item.category}</span>
              <span className={`badge-severity text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${getSeverityClass(item.severity)}`}>
                {item.severity}
              </span>
            </div>
          </div>

          <div className="box-section bg-slate-50/50">
            <div className="box-title">Deskripsi Kronologi Kejadian</div>
            <div className="box-content">{item.description}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="box-section">
              <div className="box-title text-rose-700 border-rose-200">Root Cause Analysis (RCA)</div>
              <div className="box-content">{item.rootCauseAnalysis || "-"}</div>
            </div>
            <div className="box-section">
              <div className="box-title text-emerald-700 border-emerald-200">Tindakan Perbaikan & Pencegahan</div>
              <div className="box-content">{item.immediateCorrectiveAction || "-"}</div>
            </div>
          </div>

          <div className="meta-grid grid grid-cols-2 mt-4 pt-4 border-t-2 border-[#0f172a] border-dashed">
             <div className="meta-item flex flex-col">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Investigation Status</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{item.investigationStatus}</span>
            </div>
             <div className="meta-item flex flex-col items-end">
              <span className="meta-label font-bold text-[8px] uppercase text-[#64748b] tracking-wider">Doc Created At</span>
              <span className="meta-val font-bold text-[#0f172a] mt-0.5">{new Date(item.createdAt).toLocaleString("id-ID")}</span>
            </div>
          </div>

          {item.documentationUrl && (
            <div className="photo-section mt-4 pt-4 text-center">
              <div className="photo-title mb-2 text-left">Lampiran Dokumen/Bukti</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {item.documentationUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                 // eslint-disable-next-line @next/next/no-img-element
                <img src={item.documentationUrl} alt="Lampiran" className="photo-img inline-block" />
              ) : (
                <div className="bg-slate-100 p-4 border border-slate-200 rounded-md text-sm font-semibold text-slate-700 flex items-center justify-center gap-2">
                  <FileText className="size-5" /> Terlampir Dokumen Digital (Tidak ditampilkan di cetak fisik)
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
