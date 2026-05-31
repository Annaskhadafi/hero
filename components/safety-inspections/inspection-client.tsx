"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Eye, Pencil, Trash2 } from "lucide-react"

import { AdminPageShell } from "@/components/admin-page-shell"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { EnterpriseScorecards } from "@/components/ui/enterprise-table-kit"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InspectionFormDialog } from "./inspection-form-dialog"
import { InspectionPreviewDialog } from "./inspection-preview-dialog"
import { deleteSafetyInspection, type SafetyInspection } from "@/app/actions/safety-inspections"

export type SafetyInspectionWithAttachments = SafetyInspection & {
  reportAttachmentSignedUrl?: string
  resultAttachmentSignedUrl?: string
}

interface InspectionClientProps {
  inspections: SafetyInspectionWithAttachments[]
  categories: string[]
  pics: string[]
  currentUser: string
}

export function InspectionClient({ inspections, categories, pics, currentUser }: InspectionClientProps) {
  const [selectedInspection, setSelectedInspection] = useState<SafetyInspectionWithAttachments | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Dashboard Metrics
  const total = inspections.length
  const completed = inspections.filter(i => i.status === "Completed").length
  const inProgress = inspections.filter(i => i.status === "In Progress").length
  const pending = inspections.filter(i => i.status === "Pending").length
  
  const assessments = inspections.map(i => i.assessmentScore).filter((s): s is number => s !== null && s !== undefined)
  const avgScore = assessments.length ? Math.round(assessments.reduce((a, b) => a + b, 0) / assessments.length) : 0

  const kpis = [
    { label: "Total Inspeksi", value: total.toString() },
    { label: "Completed", value: completed.toString(), description: "Selesai ditindaklanjuti" },
    { label: "In Progress", value: inProgress.toString(), description: "Sedang dikerjakan" },
    { label: "Rata-Rata Nilai", value: `${avgScore}/100`, description: "Assessment Score" },
  ]

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus inspeksi ini?")) {
      await deleteSafetyInspection(id)
    }
  }

  const handleEdit = (inspection: SafetyInspectionWithAttachments) => {
    setSelectedInspection(inspection)
    setIsDialogOpen(true)
  }

  const handleView = (inspection: SafetyInspectionWithAttachments) => {
    setSelectedInspection(inspection)
    setIsPreviewOpen(true)
  }

  const handleAdd = () => {
    setSelectedInspection(undefined)
    setIsDialogOpen(true)
  }

  return (
    <AdminPageShell
      eyebrow="Safety Inspections"
      title="Manajemen Inspeksi"
      description="Dashboard dan riwayat inspeksi K3 di lapangan."
      actions={
        <Button onClick={handleAdd} className="bg-sky-500 hover:bg-sky-600">
          + Tambah Data
        </Button>
      }
    >
      <EnterpriseScorecards items={kpis} />

      <div className="mt-8 bg-card border rounded-lg shadow-sm">
        <MinimalTableShell
          label="inspeksi"
          fileName="safety-inspections"
          searchPlaceholder="Cari inspeksi..."
          showImport={false}
          dateFilter={true}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                <th className="p-3">ID</th>
                <th className="p-3">JUDUL INSPEKSI</th>
                <th className="p-3">TANGGAL</th>
                <th className="p-3">LOKASI</th>
                <th className="p-3">TEMUAN</th>
                <th className="p-3">REKOMENDASI</th>
                <th className="p-3">STATUS</th>
                <th className="p-3">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((row) => {
                const isCompleted = row.status === "Completed"
                const isPending = row.status === "Pending"
                return (
                  <tr key={row.id} className="border-b hover:bg-muted/50" data-date-value={row.date ? new Date(row.date).toISOString() : ""}>
                    <td className="p-3">{row.id}</td>
                    <td className="p-3">{row.title}</td>
                    <td className="p-3">{row.date ? format(new Date(row.date), "yyyy-MM-dd") : "-"}</td>
                    <td className="p-3">{row.location}</td>
                    <td className="p-3"><div className="max-w-xs truncate" title={row.findings}>{row.findings}</div></td>
                    <td className="p-3"><div className="max-w-xs truncate text-sky-600 italic" title={row.recommendation}>{row.recommendation}</div></td>
                    <td className="p-3">
                      <Badge variant={isCompleted ? "default" : isPending ? "destructive" : "secondary"} className={isCompleted ? "bg-emerald-500" : isPending ? "bg-amber-500" : "bg-sky-500"}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-500 bg-sky-50 hover:bg-sky-100" onClick={() => handleView(row)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 bg-emerald-50 hover:bg-emerald-100" onClick={() => handleEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 bg-rose-50 hover:bg-rose-100" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MinimalTableShell>
      </div>

      <InspectionFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        inspection={selectedInspection}
        categories={categories}
        pics={pics}
        currentUser={currentUser}
      />
      <InspectionPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        inspection={selectedInspection}
        onEdit={() => {
          setIsPreviewOpen(false)
          setIsDialogOpen(true)
        }}
      />
    </AdminPageShell>
  )
}
