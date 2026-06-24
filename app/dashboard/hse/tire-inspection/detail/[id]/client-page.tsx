"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2, FileEdit, Wand2, FileText, Download, ImageOff } from "lucide-react"
import { generateAiReport } from "../../actions"

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""))
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function labelSection(value: string) {
  return value.replace(/_/g, " ")
}

function scoreCardClass(score: number) {
  if (score >= 85) return "border-emerald-100 bg-emerald-50 text-emerald-900"
  if (score >= 70) return "border-sky-100 bg-sky-50 text-sky-900"
  if (score >= 50) return "border-amber-100 bg-amber-50 text-amber-900"
  return "border-red-100 bg-red-50 text-red-900"
}

export function TireInspectionDetailClient({ detail, access, basePath = "/dashboard/hse/tire-inspection" }: { detail: any, access: any, basePath?: string }) {
  const router = useRouter()
  const [loadingAi, setLoadingAi] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<any>(null)
  
  const { inspection, checklists, photos } = detail

  const handleGenerateAi = async () => {
    if (!confirm("Apakah Anda yakin ingin menghasilkan ulang laporan menggunakan AI? Ini akan menimpa laporan sebelumnya.")) return;
    setLoadingAi(true)
    try {
      await generateAiReport(inspection.id)
      toast.success("Laporan AI berhasil di-generate!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Gagal menghasilkan laporan AI")
    } finally {
      setLoadingAi(false)
    }
  }

  const getScoreVariant = (score: number) => {
    if (score >= 85) return "success"
    if (score >= 70) return "secondary"
    if (score >= 50) return "warning"
    return "destructive"
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-12 md:space-y-6 pdf-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}} />
      
      {/* Header Actions */}
      <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:flex md:flex-wrap md:items-center md:justify-between md:gap-4 md:rounded-xl no-print">
        <div>
          <h2 className="text-lg font-black text-[#082033] md:text-xl">{inspection.siteName} - {inspection.customerName}</h2>
          <p className="text-sm font-semibold text-[#486275]">Shift: {inspection.shift} | Unit: {inspection.unitName}</p>
        </div>
        <div className="mt-4 grid gap-2 md:mt-0 md:flex md:items-center">
          {access.canEdit && (
            <Button variant="outline" onClick={handleGenerateAi} disabled={loadingAi}>
              {loadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate AI Report
            </Button>
          )}
          {access.canEdit && inspection.status !== "draft" && (
            <Button variant="outline" onClick={() => router.push(`${basePath}/editor/${inspection.id}`)}>
              <FileEdit className="mr-2 h-4 w-4" />
              Edit Laporan
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total Skor", score: inspection.totalScore },
          { label: "Loading Area", score: inspection.loadingScore },
          { label: "Haul Road", score: inspection.haulRoadScore },
          { label: "Dumping Area", score: inspection.dumpingScore },
        ].map((s, i) => {
          const score = Number(s.score || 0)
          return (
          <div key={i} className={`min-h-[128px] rounded-[1.2rem] border p-4 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)] ${scoreCardClass(score)}`}>
            <h3 className="min-h-8 text-[10px] font-black uppercase tracking-[0.12em] opacity-70 md:min-h-0 md:text-sm md:normal-case md:tracking-normal">{s.label}</h3>
            <div className="mt-2 text-2xl font-black leading-none md:text-3xl">{score.toFixed(1)}</div>
            <Badge variant={getScoreVariant(score) as any} className="mt-3 max-w-full truncate px-2 text-[10px] md:text-xs">
              {score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Moderate" : "High Risk"}
            </Badge>
          </div>
          )
        })}
      </div>

      <section className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
        <h3 className="text-lg font-black text-[#082033]">Detail Inspeksi</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          {[
            ["Site", inspection.siteName],
            ["Customer", inspection.customerName],
            ["Tanggal", formatDate(inspection.inspectionDate)],
            ["Shift", inspection.shift],
            ["Unit", inspection.unitName],
            ["Status", inspection.status?.replace(/_/g, " ") || "draft"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[0.95rem] bg-[#f3faff] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]/60">{label}</p>
              <p className="mt-1 break-words font-black text-[#082033]">{value || "-"}</p>
            </div>
          ))}
        </div>
        {inspection.notes ? (
          <div className="mt-3 rounded-[0.95rem] bg-[#fff8e8] p-3 text-sm font-semibold leading-6 text-[#8a5a00]">
            {inspection.notes}
          </div>
        ) : null}
      </section>

      {checklists.length > 0 ? (
        <section className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
          <h3 className="text-lg font-black text-[#082033]">Checklist Lapangan</h3>
          <div className="mt-4 space-y-4">
            {["loading_area", "haul_road", "dumping_area"].map((section) => {
              const rows = checklists.filter((item: any) => item.section === section)
              if (!rows.length) return null
              return (
                <div key={section} className="space-y-2">
                  <p className="rounded-xl bg-[#f3faff] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#082033]">{labelSection(section)}</p>
                  {rows.map((item: any) => (
                    <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold leading-5 text-[#082033]">{item.question}</p>
                        <Badge variant={item.answer ? "secondary" : "destructive"} className="shrink-0">{item.answer ? "YA" : "TDK"}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-[#486275]">
                        <span>Skor {item.score ?? 0}/10</span>
                        {item.remarks ? <span className="text-right">{item.remarks}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* AI Report Section */}
      {inspection.status !== "draft" ? (
        <div className="space-y-4">
          <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
            <h3 className="text-lg font-bold flex items-center mb-4"><FileText className="mr-2" /> Executive Summary</h3>
            <p className="whitespace-pre-wrap">{inspection.summary}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
            <h3 className="text-lg font-bold flex items-center mb-4"><FileText className="mr-2" /> Findings (Temuan Lapangan)</h3>
            <p className="whitespace-pre-wrap">{inspection.findings}</p>
          </div>
          <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6">
            <h3 className="text-lg font-bold flex items-center mb-4"><FileText className="mr-2" /> Recommendations (Rekomendasi)</h3>
            <p className="whitespace-pre-wrap">{inspection.recommendations}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.2rem] border border-dashed bg-white p-6 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:p-12">
          <Wand2 className="mx-auto h-8 w-8 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-muted-foreground">Laporan AI belum di-generate</h3>
          <p className="text-sm text-muted-foreground mb-4">Klik tombol "Generate AI Report" untuk mulai menyusun laporan otomatis.</p>
          {access.canEdit && (
            <Button onClick={handleGenerateAi} disabled={loadingAi}>
              {loadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Sekarang"}
            </Button>
          )}
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:rounded-xl md:p-6 pdf-wrapper">
          <h3 className="text-lg font-bold mb-4">Dokumentasi Foto</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {photos.map((p: any) => (
              <div key={p.id} className="overflow-hidden rounded-[1.1rem] border border-slate-100 bg-white shadow-[0_10px_24px_rgba(8,32,51,0.06)]">
                {p.readableImageUrl || p.imageUrl ? (
                  <button type="button" onClick={() => setPreviewPhoto(p)} className="block w-full bg-slate-100 text-left">
                    <img src={p.readableImageUrl || p.imageUrl} alt={p.caption || "Foto inspeksi"} className="h-48 w-full object-cover md:h-56" />
                  </button>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 bg-slate-100 text-sm font-semibold text-slate-500 md:h-56">
                    <ImageOff className="size-6" />
                    Foto tidak tersedia
                  </div>
                )}
                <div className="p-3 bg-muted/30">
                  <Badge variant="outline" className="mb-2">{p.section.replace("_", " ")}</Badge>
                  {p.caption && <p className="text-sm font-medium">{p.caption}</p>}
                  {p.aiCaption && <p className="text-sm text-muted-foreground mt-2 border-t pt-2 border-dashed"><strong>AI:</strong> {p.aiCaption}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!previewPhoto} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-[1.2rem] p-0">
          {previewPhoto ? (
            <div className="bg-white">
              <DialogHeader className="p-4 pb-2 text-left">
                <DialogTitle className="text-base font-black text-[#082033]">Dokumentasi Foto</DialogTitle>
              </DialogHeader>
              <img src={previewPhoto.readableImageUrl || previewPhoto.imageUrl} alt={previewPhoto.caption || "Foto inspeksi"} className="max-h-[72vh] w-full object-contain bg-slate-100" />
              <div className="space-y-2 p-4">
                <Badge variant="outline">{labelSection(previewPhoto.section || "-")}</Badge>
                {previewPhoto.caption ? <p className="text-sm font-semibold text-[#082033]">{previewPhoto.caption}</p> : null}
                {previewPhoto.aiCaption ? <p className="rounded-xl bg-[#f3faff] p-3 text-sm font-semibold text-[#486275]">AI: {previewPhoto.aiCaption}</p> : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
