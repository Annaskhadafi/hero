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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <div className="space-y-2">
          <Label className="text-lg font-bold">Executive Summary</Label>
          <Textarea 
            className="min-h-[150px]"
            value={formData.summary} 
            onChange={e => setFormData({ ...formData, summary: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-lg font-bold">Findings (Temuan Lapangan)</Label>
          <Textarea 
            className="min-h-[200px]"
            value={formData.findings} 
            onChange={e => setFormData({ ...formData, findings: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-lg font-bold">Recommendations (Rekomendasi)</Label>
          <Textarea 
            className="min-h-[150px]"
            value={formData.recommendations} 
            onChange={e => setFormData({ ...formData, recommendations: e.target.value })} 
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  )
}
