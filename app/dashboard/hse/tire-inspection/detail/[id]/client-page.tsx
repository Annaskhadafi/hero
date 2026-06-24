"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, FileEdit, Wand2, FileText, Download } from "lucide-react"
import { generateAiReport } from "../../actions"

export function TireInspectionDetailClient({ detail, access, basePath = "/dashboard/hse/tire-inspection" }: { detail: any, access: any, basePath?: string }) {
  const router = useRouter()
  const [loadingAi, setLoadingAi] = useState(false)
  
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12 pdf-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}} />
      
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm no-print">
        <div>
          <h2 className="text-xl font-bold">{inspection.siteName} - {inspection.customerName}</h2>
          <p className="text-muted-foreground text-sm">Shift: {inspection.shift} | Unit: {inspection.unitName}</p>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Skor", score: inspection.totalScore },
          { label: "Loading Area", score: inspection.loadingScore },
          { label: "Haul Road", score: inspection.haulRoadScore },
          { label: "Dumping Area", score: inspection.dumpingScore },
        ].map((s, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 text-center shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">{s.label}</h3>
            <div className="mt-2 text-3xl font-bold">{Number(s.score).toFixed(1)}</div>
            <Badge variant={getScoreVariant(s.score) as any} className="mt-2">
              {s.score >= 85 ? "Excellent" : s.score >= 70 ? "Good" : s.score >= 50 ? "Moderate" : "High Risk"}
            </Badge>
          </div>
        ))}
      </div>

      {/* AI Report Section */}
      {inspection.status !== "draft" ? (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center mb-4"><FileText className="mr-2" /> Executive Summary</h3>
            <p className="whitespace-pre-wrap">{inspection.summary}</p>
          </div>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center mb-4"><FileText className="mr-2" /> Findings (Temuan Lapangan)</h3>
            <p className="whitespace-pre-wrap">{inspection.findings}</p>
          </div>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center mb-4"><FileText className="mr-2" /> Recommendations (Rekomendasi)</h3>
            <p className="whitespace-pre-wrap">{inspection.recommendations}</p>
          </div>
        </div>
      ) : (
        <div className="bg-muted border border-dashed rounded-xl p-12 text-center">
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
        <div className="bg-card border rounded-xl p-6 shadow-sm pdf-wrapper">
          <h3 className="text-lg font-bold mb-4">Dokumentasi Foto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((p: any) => (
              <div key={p.id} className="border rounded-lg overflow-hidden">
                <img src={p.imageUrl} alt={p.caption} className="w-full h-48 object-cover" />
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
    </div>
  )
}
