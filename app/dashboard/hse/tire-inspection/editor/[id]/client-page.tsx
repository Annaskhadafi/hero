"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { updateInspectionReport } from "../../actions"

export function TireInspectionEditorClient({ detail, basePath = "/dashboard/hse/tire-inspection" }: { detail: any, basePath?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const { inspection } = detail

  const [formData, setFormData] = useState({
    summary: inspection.summary || "",
    findings: inspection.findings || "",
    recommendations: inspection.recommendations || "",
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateInspectionReport(inspection.id, {
        summary: formData.summary,
        findings: formData.findings,
        recommendations: formData.recommendations,
      })
      toast.success("Laporan berhasil diperbarui.")
      router.push(`${basePath}/detail/${detail.inspection.id}`)
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12 md:space-y-6">
      <div className="space-y-5 rounded-[1.2rem] border border-slate-100 bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] md:space-y-6 md:rounded-xl md:p-6">
        <div className="space-y-2">
          <Label className="text-base font-black text-[#082033] md:text-lg">Executive Summary</Label>
          <Textarea 
            className="min-h-[150px] rounded-xl"
            value={formData.summary} 
            onChange={e => setFormData({ ...formData, summary: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-black text-[#082033] md:text-lg">Findings (Temuan Lapangan)</Label>
          <Textarea 
            className="min-h-[200px] rounded-xl"
            value={formData.findings} 
            onChange={e => setFormData({ ...formData, findings: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-black text-[#082033] md:text-lg">Recommendations (Rekomendasi)</Label>
          <Textarea 
            className="min-h-[150px] rounded-xl"
            value={formData.recommendations} 
            onChange={e => setFormData({ ...formData, recommendations: e.target.value })} 
          />
        </div>

        <div className="grid gap-3 border-t pt-4 md:flex md:justify-end md:gap-4">
          <Button className="h-11 rounded-xl" variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button className="h-11 rounded-xl bg-[#003f78] text-white" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  )
}
