"use client"

import { useState, useEffect, useTransition } from "react"
import {
  getSopWinDepartmentWorkflowsAction,
  upsertSopWinDepartmentWorkflowAction,
  seedDefaultSopWinDepartmentWorkflowsAction,
} from "@/app/dashboard/sop-win/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Building2,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  ShieldCheck,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Search,
} from "lucide-react"

interface StepConfig {
  stepOrder: number
  stepLabel: string
  approverRole: string
  approverName?: string
  approverEmail?: string
}

interface DeptWorkflow {
  id: number
  departmentCode: string
  departmentName: string
  steps: StepConfig[]
  isActive?: boolean
}

interface SopWinApprovalMatrixPanelProps {
  initialWorkflows?: DeptWorkflow[]
}

export function SopWinApprovalMatrixPanel({ initialWorkflows = [] }: SopWinApprovalMatrixPanelProps) {
  const [workflows, setWorkflows] = useState<DeptWorkflow[]>(initialWorkflows)
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(initialWorkflows.length === 0)
  const [isPending, startTransition] = useTransition()

  // Edit Modal State
  const [selectedWorkflow, setSelectedWorkflow] = useState<DeptWorkflow | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingSteps, setEditingSteps] = useState<StepConfig[]>([])

  useEffect(() => {
    if (initialWorkflows && initialWorkflows.length > 0) {
      setWorkflows(initialWorkflows)
      setIsLoading(false)
    } else {
      fetchWorkflows()
    }
  }, [initialWorkflows])

  const fetchWorkflows = async () => {
    setIsLoading(true)
    try {
      const res = await getSopWinDepartmentWorkflowsAction()
      if (res.success && res.data && res.data.length > 0) {
        setWorkflows(res.data)
      } else {
        toast.error(res.message || "Gagal memuat workflow departemen.")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenEdit = (wf: DeptWorkflow) => {
    setSelectedWorkflow(wf)
    setEditingSteps(JSON.parse(JSON.stringify(wf.steps)))
    setIsEditOpen(true)
  }

  const handleAddStep = () => {
    const nextOrder = editingSteps.length + 1
    setEditingSteps([
      ...editingSteps,
      {
        stepOrder: nextOrder,
        stepLabel: `Tahap ${nextOrder}`,
        approverRole: "Approver Role",
        approverName: "",
        approverEmail: "",
      },
    ])
  }

  const handleRemoveStep = (index: number) => {
    if (editingSteps.length <= 1) {
      toast.error("Minimal harus ada 1 tahap approval.")
      return
    }
    const updated = editingSteps.filter((_, i) => i !== index).map((s, idx) => ({ ...s, stepOrder: idx + 1 }))
    setEditingSteps(updated)
  }

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= editingSteps.length) return

    const copy = [...editingSteps]
    const temp = copy[index]
    copy[index] = copy[targetIdx]
    copy[targetIdx] = temp

    setEditingSteps(copy.map((s, idx) => ({ ...s, stepOrder: idx + 1 })))
  }

  const handleStepChange = (index: number, field: keyof StepConfig, value: string) => {
    const updated = [...editingSteps]
    updated[index] = { ...updated[index], [field]: value }
    setEditingSteps(updated)
  }

  const handleSaveWorkflow = () => {
    if (!selectedWorkflow) return

    startTransition(async () => {
      const res = await upsertSopWinDepartmentWorkflowAction({
        departmentCode: selectedWorkflow.departmentCode,
        departmentName: selectedWorkflow.departmentName,
        steps: editingSteps,
      })

      if (res.success) {
        toast.success(res.message)
        setIsEditOpen(false)
        fetchWorkflows()
      } else {
        toast.error(res.message || "Gagal menyimpan workflow.")
      }
    })
  }

  const handleSeedDefaults = () => {
    startTransition(async () => {
      const res = await seedDefaultSopWinDepartmentWorkflowsAction()
      if (res.success) {
        toast.success(res.message)
        fetchWorkflows()
      } else {
        toast.error(res.message || "Gagal memuat preset default.")
      }
    })
  }

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.departmentName.toLowerCase().includes(search.toLowerCase()) ||
      w.departmentCode.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-slate-900 via-[#003461] to-blue-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-black tracking-tight">Konfigurasi Approval Matrix SOP & WIN</h2>
            </div>
            <p className="text-xs text-blue-100/90">
              Atur urutan penandatanganan resmi dokumen per departemen (Total {workflows.length} Departemen).
              Dapat menyertakan nama karyawan spesifik (misal Ria Annisa) maupun role jabatan.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={isPending}
              className="h-9 gap-1.5 rounded-xl border-blue-300/30 bg-white/10 text-xs font-bold text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Muat Preset Default
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari departemen (misal HSE, Technical)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-xl border-slate-200 pl-9 text-xs font-medium focus-visible:ring-[#003461]"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          Menampilkan <span className="text-slate-900">{filteredWorkflows.length}</span> dari {workflows.length} Departemen
        </div>
      </div>

      {/* Department Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">Departemen tidak ditemukan</p>
          <p className="text-xs text-slate-500">Coba ganti kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map((wf) => (
            <div
              key={wf.departmentCode}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 border border-blue-200">
                      {wf.departmentCode}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{wf.departmentName}</h3>
                  </div>
                  <Badge variant="outline" className="rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 border-emerald-200">
                    {wf.steps.length} Step TTD
                  </Badge>
                </div>

                {/* Steps Preview List */}
                <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
                  {wf.steps.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {s.stepOrder}
                        </span>
                        <span className="font-semibold truncate text-[11px] text-slate-900">{s.stepLabel}</span>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium text-slate-500">
                        {s.approverName || s.approverRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {wf.id > 0 ? "Workflow Kustom Active" : "Preset Default"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(wf)}
                  className="h-8 gap-1 rounded-lg border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Alur
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Workflow Steps Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Building2 className="h-5 w-5 text-blue-600" />
              Kelola Alur Approval — {selectedWorkflow?.departmentName} ({selectedWorkflow?.departmentCode})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-xs text-slate-500">
              Urutkan tahapan penandatanganan dokumen dari Step 1 sampai selesai.
              Isi <span className="font-semibold text-slate-700">Nama Approver</span> jika ingin menentukan orang spesifik (misal Ria Annisa), atau biarkan kosong jika berdasarkan Role/Jabatan.
            </p>

            <div className="space-y-3">
              {editingSteps.map((step, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003461] text-xs font-bold text-white">
                        {step.stepOrder}
                      </span>
                      <span className="text-xs font-bold text-slate-800">Tahap ke-{step.stepOrder}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => handleMoveStep(index, "up")}
                        className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-200"
                        title="Naikkan"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={index === editingSteps.length - 1}
                        onClick={() => handleMoveStep(index, "down")}
                        className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-200"
                        title="Turunkan"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStep(index)}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                        title="Hapus Step"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Nama Label Step</label>
                      <Input
                        type="text"
                        value={step.stepLabel}
                        onChange={(e) => handleStepChange(index, "stepLabel", e.target.value)}
                        placeholder="Misal: Verifikasi Teknis"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Role / Jabatan Approver</label>
                      <Input
                        type="text"
                        value={step.approverRole}
                        onChange={(e) => handleStepChange(index, "approverRole", e.target.value)}
                        placeholder="Misal: Head of Dept / Admin SOP"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Nama Orang Spesifik (Opsional)</label>
                      <Input
                        type="text"
                        value={step.approverName || ""}
                        onChange={(e) => handleStepChange(index, "approverName", e.target.value)}
                        placeholder="Misal: Ria Annisa"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Email Approver (Opsional)</label>
                      <Input
                        type="email"
                        value={step.approverEmail || ""}
                        onChange={(e) => handleStepChange(index, "approverEmail", e.target.value)}
                        placeholder="Misal: ria.annisa@chitraparatama.com"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddStep}
              className="w-full h-9 border-dashed border-slate-300 text-xs font-bold text-blue-700 hover:bg-blue-50 gap-1.5"
            >
              <Plus className="h-4 w-4" /> Tambah Tahap Penandatangan
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="h-9 text-xs font-bold rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveWorkflow}
              disabled={isPending}
              className="h-9 text-xs font-bold bg-[#003461] hover:bg-[#00274a] text-white rounded-xl gap-1.5"
            >
              {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Simpan Workflow Departemen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
