'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCheck, CheckCircle2, ChevronDown, Clock, Clock3, Download, Eye, FileCheck, FileSignature, FileText, Flame, HardHat, History, Loader2, MapPin, Pencil, Plus, PlusCircle, Search, ShieldAlert, ShieldCheck, Sparkles, Trash2, UserCheck, X } from 'lucide-react'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MobileApprovalCenter } from '@/components/mobile/mobile-approval-center'

import { createIncidentRecord, deleteIncidentRecord, updateIncidentRecord } from '@/app/dashboard/hse/incident-report/actions'
import { deleteJsa, getJsaById, saveJsa } from '@/app/dashboard/hse/jsa/actions'
import { deleteMobileCorrectiveAction, saveMobileCorrectiveAction } from '@/app/mobile/hse/corrective-action/actions'
import { deleteMobilePtwPermit, saveMobilePtwPermit } from '@/app/mobile/hse/ptw/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea"
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  PERMIT_TYPE_OPTIONS,
  EQUIPMENT_CHECKLIST_PER_TYPE,
  HIRADC_PRESETS,
  getActivePermitTypeKeys,
  isItemChecked,
  getDefaultSubTypes,
  getPermitSubTypes,
  extractCheckedEquipment,
} from '@/lib/ptw-helpers'
import { PtwSubTypesEditor } from '@/components/ptw-sub-types-editor'

type Access = { canView: boolean; canEdit: boolean; canDelete: boolean; canSelectAll?: boolean }
type Incident = { id: number; title: string; category: string; severity: string; description: string; investigationStatus: string; incidentDate: Date; picName: string; rootCauseAnalysis: string; immediateCorrectiveAction: string; documentationUrl: string }
type JsaRow = { id: string; jsaNumber: string; jobDescription: string; equipmentNumber: string; teamMembers: string; riskLevel: string; createdAt: Date }
type HiradcEntry = { id: number; activityName: string; department: string; location: string; hazardCategory: string; hazardDetails: string; riskConsequence: string; riskLevelBefore: string; riskLevelAfter: string; existingControl: string; additionalControl: string }
type PtwRecord = { id: number; permitNumber: string; projectName: string; permitType: string; location: string; area: string; status: string; riskLevel: string; description: string; controlSteps: string; applicantName?: string; fieldPicName?: string; authorizedByName?: string; ppe?: string[]; subTypes?: Record<string, string[]> | string[]; startAt?: any; endAt?: any }
type CorrectiveAction = { id: number; sourceType: string; sourceId: string; title: string; description: string; actionPlan: string; assigneeName: string; priority: string; status: string; closeOutNote: string }

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const APD_OPTIONS = [
  'Helmet',
  'Safety Shoes',
  'Respirator',
  'Full Body Harness',
  'Safety Glasses',
  'Ear Plug',
  'Face Shield',
  'Welding Gloves',
  'Leather Gloves',
  'Dust Mask',
]

function CardShell({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof ShieldCheck; children: React.ReactNode }) {
  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">HSE Mobile • Permit to Work</p>
            <h1 className="mt-1 text-xl font-black tracking-tight">{title}</h1>
            <p className="mt-1 text-xs leading-relaxed text-blue-100">{subtitle}</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-inner">
            <Icon className="size-5 text-blue-200" />
          </span>
        </div>
      </section>
      {children}
    </div>
  )
}

function PtwStatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  if (s === 'approved' || s === 'completed') {
    return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</span>
  }
  if (s === 'rejected') {
    return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>
  }
  if (s === 'reverted') {
    return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">Reverted</span>
  }
  if (s === 'submitted') {
    return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Submitted</span>
  }
  if (s === 'draft') {
    return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Draft</span>
  }
  return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending Approval</span>
}

function PtwRiskBadge({ risk }: { risk: string }) {
  const r = (risk || '').toLowerCase()
  if (r === 'critical') return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Critical</span>
  if (r === 'high') return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">High</span>
  if (r === 'medium') return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Medium</span>
  return <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">Low</span>
}

export function MobilePtwClient({
  sources,
  access,
  permits = [],
  employees = [],
  approvalData,
  initialExtendPermit,
}: {
  sources: HiradcEntry[]
  access: Access
  permits: PtwRecord[]
  employees?: Array<{ id: number; name: string; email?: string; jobTitle?: string; employeeSn?: string }>
  approvalData?: any
  initialExtendPermit?: PtwRecord | null
}) {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = React.useState(Boolean(initialExtendPermit))
  const [editingId, setEditingId] = React.useState<number | null>(initialExtendPermit?.id ?? null)
  const [viewTarget, setViewTarget] = React.useState<PtwRecord | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')

  const initialForm = {
    projectName: '',
    hiradcReference: '',
    permitType: 'Hot Work Permit',
    location: '',
    area: '',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '08:00',
    endDate: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10),
    endTime: '17:00',
    description: '',
    controlSteps: '',
    additionalNotes: '',
    applicantName: '',
    fieldPicName: '',
    authorizedByName: '',
    status: 'Pending Approval',
    riskLevel: 'High',
    ppe: ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness'],
  }

  const [form, setForm] = React.useState(initialForm)
  const [checkedEquipment, setCheckedEquipment] = React.useState<string[]>([])
  const [mobileSubTypes, setMobileSubTypes] = React.useState<Record<string, string[]>>(() => getDefaultSubTypes())

  const resetForm = () => {
    setForm(initialForm)
    setCheckedEquipment([])
    setMobileSubTypes(getDefaultSubTypes())
    setEditingId(null)
  }

  // Auto-populate form when editing a reverted PTW permit
  React.useEffect(() => {
    if (!initialExtendPermit) return
    const p = initialExtendPermit
    setForm({
      projectName: (p as any).projectName || '',
      hiradcReference: (p as any).hiradcReference || '',
      permitType: (p as any).permitType || 'Hot Work Permit',
      location: (p as any).location || '',
      area: (p as any).area || '',
      startDate: (p as any).startDate || new Date().toISOString().slice(0, 10),
      startTime: (p as any).startTime || '08:00',
      endDate: (p as any).endDate || new Date().toISOString().slice(0, 10),
      endTime: (p as any).endTime || '17:00',
      description: (p as any).description || '',
      controlSteps: (p as any).controlSteps || '',
      additionalNotes: (p as any).additionalNotes || '',
      applicantName: (p as any).applicantName || '',
      fieldPicName: (p as any).fieldPicName || '',
      authorizedByName: (p as any).authorizedByName || '',
      status: 'Pending Approval',
      riskLevel: (p as any).riskLevel || 'High',
      ppe: (p as any).ppe || ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness'],
    })
    setCheckedEquipment(extractCheckedEquipment((p as any).controlSteps, (p as any).checkedEquipment, (p as any).permitType))
    if ((p as any).subTypes && typeof (p as any).subTypes === 'object') {
      setMobileSubTypes({ ...getDefaultSubTypes(), ...(p as any).subTypes })
    }
    setEditingId(p.id)
  }, [initialExtendPermit])

  const handleHiradcPresetSelect = (presetValue: string) => {
    const preset = HIRADC_PRESETS.find((p) => p.value === presetValue)
    if (!preset) return
    setForm((prev) => ({
      ...prev,
      hiradcReference: preset.value,
      permitType: preset.permitType,
      location: preset.location,
      area: preset.area,
      riskLevel: preset.riskLevel,
      description: preset.description,
      controlSteps: preset.controlSteps,
      ppe: preset.ppe,
    }))
  }

  const togglePermitType = (typeValue: string) => {
    const currentTypes = form.permitType ? form.permitType.split(', ').map((t) => t.trim()) : []
    const isSelected = currentTypes.includes(typeValue)
    let updated: string[]
    if (isSelected) {
      updated = currentTypes.filter((t) => t !== typeValue)
    } else {
      updated = [...currentTypes, typeValue]
    }
    setForm((prev) => ({ ...prev, permitType: updated.join(', ') || 'Hot Work Permit' }))
  }

  const togglePpe = (item: string) => {
    setForm((prev) => {
      const isChecked = prev.ppe.includes(item)
      return {
        ...prev,
        ppe: isChecked ? prev.ppe.filter((p) => p !== item) : [...prev.ppe, item],
      }
    })
  }

  const toggleEquipmentItem = (itemLabel: string) => {
    setCheckedEquipment((prev) => {
      const isChecked = isItemChecked(itemLabel, prev)
      if (isChecked) {
        return prev.filter((i) => i.toLowerCase().trim() !== itemLabel.toLowerCase().trim())
      }
      return [...prev, itemLabel]
    })
  }

  const handleEdit = (row: PtwRecord) => {
    setEditingId(row.id)
    setForm({
      projectName: row.projectName || '',
      hiradcReference: '',
      permitType: row.permitType || 'Hot Work Permit',
      location: row.location || '',
      area: row.area || '',
      startDate: row.startAt ? new Date(row.startAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      startTime: row.startAt ? new Date(row.startAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '08:00',
      endDate: row.endAt ? new Date(row.endAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      endTime: row.endAt ? new Date(row.endAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') : '17:00',
      description: row.description || '',
      controlSteps: row.controlSteps || '',
      additionalNotes: (row as any).additionalNotes || '',
      applicantName: row.applicantName || '',
      fieldPicName: row.fieldPicName || '',
      authorizedByName: row.authorizedByName || '',
      status: row.status || 'Pending Approval',
      riskLevel: row.riskLevel || 'High',
      ppe: Array.isArray(row.ppe) ? row.ppe : ['Helmet', 'Safety Shoes'],
    })
    if (row.subTypes && typeof row.subTypes === 'object' && !Array.isArray(row.subTypes)) {
      setMobileSubTypes({ ...getDefaultSubTypes(), ...row.subTypes })
    } else {
      setMobileSubTypes(getDefaultSubTypes())
    }
    setIsFormOpen(true)
  }

  const save = async () => {
    if (!access.canEdit) return toast.error('Role Anda tidak berhak mengubah PTW.')
    if (!form.projectName.trim()) return toast.error('Nama pekerjaan / proyek wajib diisi.')
    setIsSaving(true)
    try {
      const finalDescription = form.hiradcReference.trim()
        ? `[Referensi HIRADC: ${form.hiradcReference.trim()}]\n${form.description}`
        : form.description

      const finalControlSteps = checkedEquipment.length > 0
        ? checkedEquipment.map((l, i) => `${i + 1}. ${l}`).join('\n')
        : form.controlSteps

      await saveMobilePtwPermit({
        id: editingId || undefined,
        projectName: form.projectName,
        permitType: form.permitType,
        location: form.location,
        area: form.area,
        status: form.status,
        riskLevel: form.riskLevel,
        description: finalDescription,
        controlSteps: finalControlSteps,
        additionalNotes: form.additionalNotes,
        applicantName: form.applicantName,
        fieldPicName: form.fieldPicName,
        authorizedByName: form.authorizedByName,
        ppe: form.ppe,
        subTypes: mobileSubTypes,
      })
      toast.success(editingId ? 'Permit PTW berhasil diperbarui!' : 'Permit PTW berhasil diajukan!')
      resetForm()
      setIsFormOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan PTW.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!access.canDelete) return toast.error('Role Anda tidak berhak menghapus PTW.')
    if (!confirm('Apakah Anda yakin ingin menghapus Izin Kerja PTW ini?')) return
    try {
      await deleteMobilePtwPermit(id)
      toast.success('Izin Kerja PTW berhasil dihapus.')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus PTW.')
    }
  }

  const totalPtw = permits.length
  const pendingCount = permits.filter((r) => ['pending', 'submitted'].includes((r.status || '').toLowerCase())).length
  const approvedCount = permits.filter((r) => (r.status || '').toLowerCase() === 'approved').length
  const criticalCount = permits.filter((r) => (r.riskLevel || '').toLowerCase() === 'critical').length

  const applicantOptions = React.useMemo(() => employees.map((emp) => ({
    value: `${emp.name} — ${emp.jobTitle || 'Technician'}`,
    label: `${emp.name.toUpperCase()} — ${(emp.jobTitle || 'TECHNICIAN').toUpperCase()}`,
  })), [employees])

  const fieldPicOptions = React.useMemo(() => employees.map((emp) => ({
    value: `${emp.name} — ${emp.jobTitle || 'Supervisor'}`,
    label: `${emp.name.toUpperCase()} — ${(emp.jobTitle || 'SUPERVISOR').toUpperCase()}`,
  })), [employees])

  const safetyDeptOptions = React.useMemo(() => employees.map((emp) => ({
    value: `${emp.name} — ${emp.jobTitle || 'HSE Dept'}`,
    label: `${emp.name.toUpperCase()} — ${(emp.jobTitle || 'HSE DEPT').toUpperCase()}`,
  })), [employees])

  const filteredPermits = permits.filter((r) => {
    const textMatch = `${r.permitNumber} ${r.projectName} ${r.location} ${r.area} ${r.applicantName}`.toLowerCase().includes(searchQuery.toLowerCase())
    const typeMatch = typeFilter === 'all' || (r.permitType || '').toLowerCase().includes(typeFilter.toLowerCase())
    const statusMatch = statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter.toLowerCase()
    return textMatch && typeMatch && statusMatch
  })

  return (
    <div className="space-y-4 pb-6">
      {/* Header section persis SPL Mobile */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.24em] text-[#486275] uppercase">
              Izin Kerja Aman
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">PTW Mobile</h1>
          </div>
          <Badge className="border-0 bg-[#eaf4fb] text-[#003f78] font-bold text-xs">{totalPtw} PTW</Badge>
        </div>
        <p className="text-sm leading-6 font-semibold text-[#486275]">
          Ajukan, approve, pantau PTW aktif, dan kelola riwayat Izin Kerja Aman tanpa membuka desktop.
        </p>
      </section>

      {/* Sub-Navbar Tabs Bar persis SPL Mobile */}
      <Tabs defaultValue="apply" className="w-full space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-white p-1 shadow-[0_12px_30px_rgba(8,32,51,0.08)]">
          <TabsTrigger
            value="apply"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs"
          >
            <PlusCircle className="size-4 shrink-0" />
            <span>Ajukan</span>
          </TabsTrigger>

          <TabsTrigger
            value="approval"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs relative"
          >
            <div className="relative flex items-center">
              <CheckCheck className="size-4 shrink-0" />
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                  {pendingCount}
                </span>
              )}
            </div>
            <span>Approval</span>
          </TabsTrigger>

          <TabsTrigger
            value="active"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs relative"
          >
            <div className="relative flex items-center">
              <Clock3 className="size-4 shrink-0" />
              {approvedCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white ring-2 ring-white">
                  {approvedCount}
                </span>
              )}
            </div>
            <span>PTW Aktif</span>
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs"
          >
            <History className="size-4 shrink-0" />
            <span>Riwayat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply">
          {access.canEdit ? (
            <section className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    {editingId ? 'Edit Izin Kerja Aman (PTW)' : 'Formulir Izin Kerja Aman (PTW)'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Isi formulir resmi PTW untuk kontrol pekerjaan berisiko tinggi.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  18 FIELDS
                </span>
              </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Nama Pekerjaan / Proyek / Kontrak *
            </label>
            <Input
              className="h-10 rounded-xl border-slate-200 bg-slate-50/60 text-xs font-medium"
              placeholder="Contoh: Pengelasan Rangka Dump Body HD"
              value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Referensi HIRADC</label>
            <Input
              className="h-10 rounded-xl border-slate-200 bg-slate-50/60 text-xs font-medium"
              placeholder="Ketik referensi HIRADC / judul aktivitas..."
              value={form.hiradcReference}
              onChange={(e) => setForm({ ...form, hiradcReference: e.target.value })}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-900">
                Tipe Izin Kerja (Multi-Select)
              </label>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {form.permitType ? form.permitType.split(', ').length : 0} Terpilih
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {PERMIT_TYPE_OPTIONS.map((opt) => {
                const activeTypes = form.permitType ? form.permitType.split(', ').map(t => t.trim()) : []
                const isSelected = activeTypes.includes(opt.value)
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => togglePermitType(opt.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shadow-2xs flex items-center gap-1",
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>{isSelected ? "☑" : "☐"}</span>
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Sub-Jenis Pekerjaan (Aktivitas) Manual CRUD */}
            <PtwSubTypesEditor
              activePermitTypes={getActivePermitTypeKeys(form.permitType)}
              subTypes={mobileSubTypes}
              onChange={setMobileSubTypes}
              className="mt-3 pt-2.5 border-t border-slate-200"
            />

            {(() => {
              const activeTypes = getActivePermitTypeKeys(form.permitType)
              if (activeTypes.length === 0) return null
              return (
                <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-900">Peralatan & Checklist K3 Terkait</p>
                  <div className="space-y-2">
                    {activeTypes.map((pType) => {
                      const data = EQUIPMENT_CHECKLIST_PER_TYPE[pType]
                      if (!data) return null
                      return (
                        <div key={pType} className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5">
                          <div className="font-bold text-[11px] text-slate-900 uppercase border-b border-slate-100 pb-1 flex justify-between">
                            <span>{pType}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{data.items.length} Item</span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            {data.items.map((item) => {
                              const isChecked = isItemChecked(item.label, checkedEquipment)
                              return (
                                <label
                                  key={item.id}
                                  className={cn(
                                    "flex items-center gap-2 p-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                                    isChecked
                                      ? "bg-slate-900 border-slate-900 text-white font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-700"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleEquipmentItem(item.label)}
                                    className="size-3.5 rounded border-slate-300 text-slate-900 shrink-0"
                                  />
                                  <span>{item.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Lokasi Spesifik *</label>
              <Input
                className="h-10 rounded-xl border-slate-200 bg-slate-50/60 text-xs font-medium"
                placeholder="Lokasi (mis: Silo Material)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Area Kerja</label>
              <Input
                className="h-10 rounded-xl border-slate-200 bg-slate-50/60 text-xs font-medium"
                placeholder="Area (mis: Sector Utara)"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tgl & Jam Mulai</label>
              <div className="grid grid-cols-2 gap-1">
                <Input
                  type="date"
                  className="h-9 px-1.5 rounded-lg border-slate-200 bg-slate-50/60 text-[11px] font-medium"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                <Input
                  type="time"
                  className="h-9 px-1.5 rounded-lg border-slate-200 bg-slate-50/60 text-[11px] font-medium"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tgl & Jam Selesai</label>
              <div className="grid grid-cols-2 gap-1">
                <Input
                  type="date"
                  className="h-9 px-1.5 rounded-lg border-slate-200 bg-slate-50/60 text-[11px] font-medium"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                <Input
                  type="time"
                  className="h-9 px-1.5 rounded-lg border-slate-200 bg-slate-50/60 text-[11px] font-medium"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Deskripsi Kerja</label>
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium min-h-20"
              placeholder="Jelaskan detail aktivitas pekerjaan berisiko..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="size-2 rounded-full bg-amber-600" />
              <p className="text-xs font-bold text-slate-900">Penandatangan Signatories</p>
            </div>
            
            {/* 1. Pemberi Kerja / Field PIC */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">1. Pemberi Kerja / Field PIC</label>
              <SearchableSelect
                label="Pemberi Kerja"
                value={form.fieldPicName}
                onValueChange={(val) => setForm({ ...form, fieldPicName: val })}
                options={fieldPicOptions}
                placeholder="-- PILIH PEMBERI KERJA --"
                widthClassName="w-full"
              />
            </div>

            {/* 2. Pelaksana Kerja (Multi-Person) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">2. Pelaksana Kerja (Multi-Person)</label>
                <span className="text-[9px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full font-bold">
                  {(form.applicantName ? form.applicantName.split(',').map(s => s.trim()).filter(Boolean).length : 0)} Orang Ditugaskan
                </span>
              </div>
              <div className="flex flex-wrap gap-1 p-2 rounded-xl border border-slate-200 bg-white min-h-10">
                {(form.applicantName ? form.applicantName.split(',').map(s => s.trim()).filter(Boolean) : []).map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold bg-slate-900 text-white shadow-2xs"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = form.applicantName.split(',').map(s => s.trim()).filter(Boolean)
                        const next = current.filter(n => n !== name)
                        setForm({ ...form, applicantName: next.join(', ') })
                      }}
                      className="hover:text-rose-300 font-bold ml-1 text-xs"
                      title={`Hapus ${name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="w-full pt-1">
                  <SearchableSelect
                    label="Tambah Pelaksana"
                    placeholder="+ PILIH / TAMBAH PELAKSANA KERJA..."
                    value=""
                    onValueChange={(val) => {
                      if (!val) return
                      const clean = val.includes(' — ') ? val.split(' — ')[0].trim() : val.trim()
                      const current = form.applicantName ? form.applicantName.split(',').map(s => s.trim()).filter(Boolean) : []
                      if (clean && !current.includes(clean)) {
                        const next = [...current, clean]
                        setForm({ ...form, applicantName: next.join(', ') })
                      }
                    }}
                    options={applicantOptions}
                    widthClassName="w-full"
                  />
                </div>
              </div>
            </div>

            {/* 3. Safety Dept / Pengawas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">3. Safety Dept / Pengawas</label>
              <SearchableSelect
                label="Safety Dept"
                value={form.authorizedByName}
                onValueChange={(val) => setForm({ ...form, authorizedByName: val })}
                options={safetyDeptOptions}
                placeholder="-- PILIH SAFETY DEPT --"
                widthClassName="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Status Approval</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Pending Approval">Pending Approval</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Risk Level</label>
              <select
                value={form.riskLevel}
                onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">APD Wajib (Multi-Select)</label>
            <div className="flex flex-wrap gap-1 p-2 rounded-xl border border-slate-200 bg-slate-50/60">
              {APD_OPTIONS.map((item) => {
                const isChecked = form.ppe.includes(item)
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => togglePpe(item)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
                      isChecked
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {item} {isChecked && <span className="text-[10px]">×</span>}
                  </button>
                )
              })}
            </div>
          </div>


          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Langkah Pengendalian K3 / LOTO / Gas Test</label>
            <Textarea
              className="rounded-xl border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium min-h-16"
              placeholder="Instruksi pengendalian keselamatan, isolasi energi (LOTO), atau gas test..."
              value={form.controlSteps}
              onChange={(e) => setForm({ ...form, controlSteps: e.target.value })}
            />
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all"
            disabled={isSaving}
            onClick={() => void save()}
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> MENYIMPAN PTW...
              </span>
            ) : (
              'SIMPAN PTW'
            )}
          </Button>
        </section>
      ) : null}
      </TabsContent>

        <TabsContent value="approval" className="space-y-3">
          {approvalData ? (
            <MobileApprovalCenter data={approvalData} categoryFilter="PTW" hideHeader />
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-center justify-between text-xs font-bold text-amber-900">
                <span>Daftar PTW Menunggu Approval / Verifikasi ({pendingCount})</span>
                <Badge className="bg-amber-600 text-white border-0 text-[10px]">{pendingCount} PENDING</Badge>
              </div>
              {permits.filter((r) => ['pending', 'submitted'].includes((r.status || '').toLowerCase())).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-500">
                  Tidak ada Izin Kerja PTW yang menunggu approval.
                </div>
              ) : (
                permits.filter((r) => ['pending', 'submitted'].includes((r.status || '').toLowerCase())).map((row) => (
                  <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] font-extrabold text-blue-700">{row.permitNumber}</span>
                        <h2 className="text-xs font-extrabold text-slate-900 mt-0.5 leading-tight">{row.projectName}</h2>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <PtwStatusBadge status={row.status} />
                        <PtwRiskBadge risk={row.riskLevel} />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <MapPin className="size-3 text-blue-600 shrink-0" />
                        <span className="truncate">{row.permitType}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 pl-4">{row.location}{row.area ? ` • ${row.area}` : ''}</div>
                      {row.applicantName && (
                        <div className="text-[10px] text-slate-500 pl-4">Pelaksana: <span className="font-semibold text-slate-800">{row.applicantName}</span></div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                      <Button
                        asChild
                        size="sm"
                        className="h-8.5 w-full rounded-xl bg-[#003461] hover:bg-[#002647] text-white font-extrabold text-xs shadow-xs"
                      >
                        <Link href={`/mobile/approval?category=PTW&doc=${row.permitNumber || row.id}`}>
                          <FileSignature className="size-4 mr-1.5 text-amber-400" /> BUKA TTD ↗
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-center justify-between text-xs font-bold text-emerald-900">
            <span>Daftar PTW Approved / Aktif Berjalan ({approvedCount})</span>
            <Badge className="bg-emerald-600 text-white border-0 text-[10px]">{approvedCount} APPROVED</Badge>
          </div>
          {permits.filter((r) => (r.status || '').toLowerCase() === 'approved').length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-500">
              Tidak ada Izin Kerja PTW yang sedang aktif approved.
            </div>
          ) : (
            permits.filter((r) => (r.status || '').toLowerCase() === 'approved').map((row) => (
              <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-extrabold text-blue-700">{row.permitNumber}</span>
                    <h2 className="text-xs font-extrabold text-slate-900 mt-0.5 leading-tight">{row.projectName}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <PtwStatusBadge status={row.status} />
                    <PtwRiskBadge risk={row.riskLevel} />
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                    <MapPin className="size-3 text-blue-600 shrink-0" />
                    <span className="truncate">{row.permitType}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-4">{row.location}{row.area ? ` • ${row.area}` : ''}</div>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <Button size="sm" variant="outline" className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold text-slate-700" onClick={() => setViewTarget(row)}>
                    <Eye className="size-3 text-slate-500 mr-1" /> VIEW
                  </Button>
                </div>
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 rounded-xl border-slate-200 bg-slate-50/60 pl-9 text-xs font-medium"
                placeholder="Cari No. PTW / Pekerjaan / Lokasi / Pelaksana..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => { setTypeFilter('all'); setStatusFilter('all'); }}
                className={cn('h-7 shrink-0 rounded-lg px-2.5', typeFilter === 'all' && statusFilter === 'all' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600')}
              >
                Semua PTW ({permits.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('hot work')}
                className={cn('h-7 shrink-0 rounded-lg px-2.5', typeFilter === 'hot work' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600')}
              >
                Hot Work
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('confined space')}
                className={cn('h-7 shrink-0 rounded-lg px-2.5', typeFilter === 'confined space' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600')}
              >
                Confined Space
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending approval')}
                className={cn('h-7 shrink-0 rounded-lg px-2.5', statusFilter === 'pending approval' ? 'bg-amber-600 text-white' : 'border border-slate-200 bg-white text-slate-600')}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={cn('h-7 shrink-0 rounded-lg px-2.5', statusFilter === 'approved' ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600')}
              >
                Approved ({approvedCount})
              </button>
            </div>
          </section>

          <section className="space-y-2.5">
            {filteredPermits.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-500">
                Belum ada Izin Kerja PTW yang cocok.
              </div>
            ) : (
              filteredPermits.map((row) => (
                <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] font-extrabold text-blue-700">{row.permitNumber}</span>
                      <h2 className="text-xs font-extrabold text-slate-900 mt-0.5 leading-tight">{row.projectName}</h2>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <PtwStatusBadge status={row.status} />
                      <PtwRiskBadge risk={row.riskLevel} />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-0.5 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <MapPin className="size-3 text-blue-600 shrink-0" />
                      <span className="truncate">{row.permitType}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pl-4">{row.location}{row.area ? ` • ${row.area}` : ''}</div>
                    {row.applicantName ? (
                      <div className="text-[10px] text-slate-500 pl-4">
                        Pelaksana: <span className="font-semibold text-slate-800">{row.applicantName}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                      onClick={() => setViewTarget(row)}
                    >
                      <Eye className="size-3 text-slate-500 mr-1" /> VIEW
                    </Button>
                    {access.canEdit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleEdit(row)}
                      >
                        <Pencil className="size-3 text-blue-600 mr-1" /> EDIT
                      </Button>
                    ) : null}
                    {access.canDelete ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 rounded-lg text-[10.5px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => void handleDelete(row.id)}
                      >
                        <Trash2 className="size-3 text-rose-500 mr-1" /> HAPUS
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </section>
        </TabsContent>
      </Tabs>

      {viewTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700">{viewTarget.permitNumber}</span>
                <h3 className="text-sm font-extrabold text-slate-900">{viewTarget.projectName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <PtwStatusBadge status={viewTarget.status} />
              <PtwRiskBadge risk={viewTarget.riskLevel} />
              <span className="text-xs font-semibold text-slate-700">{viewTarget.permitType}</span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
              <p><span className="font-bold text-slate-500">Lokasi:</span> <span className="font-semibold text-slate-900">{viewTarget.location} {viewTarget.area ? `(${viewTarget.area})` : ''}</span></p>
              <p><span className="font-bold text-slate-500">Pelaksana:</span> <span className="font-semibold text-slate-900">{viewTarget.applicantName || '—'}</span></p>
              <p><span className="font-bold text-slate-500">Pemberi Kerja:</span> <span className="font-semibold text-slate-900">{viewTarget.fieldPicName || '—'}</span></p>
              <p><span className="font-bold text-slate-500">Safety Dept:</span> <span className="font-semibold text-slate-900">{viewTarget.authorizedByName || '—'}</span></p>
            </div>

            {viewTarget.description ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Deskripsi Pekerjaan:</p>
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 whitespace-pre-wrap">
                  {viewTarget.description}
                </p>
              </div>
            ) : null}

            {viewTarget.controlSteps ? (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Langkah Pengendalian / Checklist K3:</p>
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 whitespace-pre-wrap">
                  {viewTarget.controlSteps}
                </p>
              </div>
            ) : null}

            <Button
              type="button"
              className="w-full h-10 rounded-xl bg-slate-900 text-white font-bold text-xs"
              onClick={() => setViewTarget(null)}
            >
              TUTUP DETAIL PTW
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  return <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">{value}</span>
}

export function MobileIncidentClient({ records, access }: { records: Incident[]; access: Access }) {
  const router = useRouter()
  const [openForm, setOpenForm] = React.useState(false)
  const [selected, setSelected] = React.useState<Incident | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({ title: '', category: 'Near Miss', severity: 'Medium', description: '', picName: '', rootCauseAnalysis: '', immediateCorrectiveAction: '' })

  const startCreate = () => { setSelected(null); setForm({ title: '', category: 'Near Miss', severity: 'Medium', description: '', picName: '', rootCauseAnalysis: '', immediateCorrectiveAction: '' }); setOpenForm(true) }
  const startEdit = (row: Incident) => { setSelected(row); setForm({ title: row.title, category: row.category, severity: row.severity, description: row.description, picName: row.picName, rootCauseAnalysis: row.rootCauseAnalysis, immediateCorrectiveAction: row.immediateCorrectiveAction }); setOpenForm(true) }
  const save = async () => {
    if (!access.canEdit) return toast.error('Role tidak boleh edit incident.')
    setSaving(true)
    try {
      const payload = { ...form, investigationStatus: selected?.investigationStatus ?? 'Open', incidentDate: selected?.incidentDate ?? new Date(), documentationUrl: selected?.documentationUrl ?? '' }
      const result = selected ? await updateIncidentRecord(selected.id, payload) : await createIncidentRecord(payload)
      if (!result.success) throw new Error(result.error)
      toast.success('Incident tersimpan.'); setOpenForm(false); router.refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Gagal simpan incident.') } finally { setSaving(false) }
  }
  const remove = async (id: number) => {
    if (!access.canDelete) return toast.error('Role tidak boleh delete incident.')
    if (!confirm('Hapus incident ini?')) return
    const result = await deleteIncidentRecord(id)
    if (result.success) { toast.success('Incident dihapus.'); router.refresh() } else toast.error(result.error)
  }

  return <CardShell title="Incident Report" subtitle="" icon={AlertTriangle}>
    {access.canEdit ? <Button className="h-11 w-full rounded-xl bg-blue-600 text-white" onClick={startCreate}><Plus className="size-4" />Buat Incident</Button> : null}
    {openForm ? <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Judul incident" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} /></div>
      <Textarea className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" placeholder="Kronologi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Textarea className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" placeholder="Root cause analysis" value={form.rootCauseAnalysis} onChange={(e) => setForm({ ...form, rootCauseAnalysis: e.target.value })} />
      <Textarea className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" placeholder="Corrective action" value={form.immediateCorrectiveAction} onChange={(e) => setForm({ ...form, immediateCorrectiveAction: e.target.value })} />
      <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="PIC" value={form.picName} onChange={(e) => setForm({ ...form, picName: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={() => setOpenForm(false)}>Batal</Button><Button className="h-11 rounded-xl bg-blue-600 text-white" disabled={saving} onClick={save}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Simpan</Button></div>
    </section> : null}
    <section className="grid gap-2">{records.map((row) => <article key={row.id} className="rounded-xl border border-gray-100 bg-white p-4"><div className="flex justify-between gap-3"><div><h2 className="text-sm font-semibold text-gray-900">{row.title}</h2><p className="mt-1 text-xs text-gray-500">{row.category} • {formatDate(row.incidentDate)}</p></div><StatusPill value={row.investigationStatus} /></div><p className="mt-3 line-clamp-3 text-xs leading-relaxed text-gray-600">{row.description}</p><p className="mt-2 text-xs text-orange-600">Action: {row.immediateCorrectiveAction || '-'}</p><div className="mt-3 grid grid-cols-2 gap-2">{access.canEdit ? <Button variant="outline" className="h-9 rounded-lg" onClick={() => startEdit(row)}>Edit/View</Button> : null}{access.canDelete ? <Button variant="outline" className="h-9 rounded-lg text-orange-600" onClick={() => void remove(row.id)}><Trash2 className="size-4" /></Button> : null}</div></article>)}</section>
  </CardShell>
}

export function MobileCorrectiveActionClient({ records, access }: { records: CorrectiveAction[]; access: Access }) {
  const router = useRouter()
  const [form, setForm] = React.useState({ title: '', sourceType: 'manual', actionPlan: '', assigneeName: '', priority: 'Medium' })
  const save = async () => { if (!access.canEdit) return; await saveMobileCorrectiveAction(form); toast.success('Corrective action tersimpan.'); setForm({ title: '', sourceType: 'manual', actionPlan: '', assigneeName: '', priority: 'Medium' }); router.refresh() }
  return (
    <CardShell title="Corrective Action" subtitle="" icon={CheckCircle2}>
      {access.canEdit ? (
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Judul action" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" placeholder="Rencana tindakan" value={form.actionPlan} onChange={(e) => setForm({ ...form, actionPlan: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="PIC" value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} />
            <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          </div>
          <Button className="h-11 w-full rounded-xl bg-blue-600 text-white" onClick={() => void save()}>Simpan Action</Button>
        </section>
      ) : null}
      <section className="grid gap-2">
        {records.map((row) => (
          <article key={row.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">{row.title}</h2>
              <StatusPill value={row.status} />
            </div>
            <p className="mt-2 text-xs text-gray-500">{row.sourceType} &bull; PIC {row.assigneeName || '-'}</p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">{row.actionPlan || '-'}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {access.canEdit ? <Button className="h-9 rounded-lg bg-blue-600 text-white" onClick={() => void saveMobileCorrectiveAction({ ...row, status: 'Closed' }).then(() => router.refresh())}>Close</Button> : null}
              {access.canDelete ? <Button variant="outline" className="h-9 rounded-lg text-orange-600" onClick={() => void deleteMobileCorrectiveAction(row.id).then(() => router.refresh())}><Trash2 className="size-4" /></Button> : null}
            </div>
          </article>
        ))}
      </section>
    </CardShell>
  )
}

export function MobileJsaClient({ rows, access }: { rows: JsaRow[]; access: Access }) {
  const router = useRouter()
  const equipmentOptions = ['Hand Tools', 'Power Tools', 'Lifting Tools', 'Welding Set', 'Crane / Hoist', 'Vehicle / Unit']
  const requirementOptions = ['Toolbox Meeting', 'Barricade Area', 'LOTO', 'Fire Watch', 'Gas Test', 'Standby Man']
  const permitOptions = ['Hot Work', 'Working at Height', 'Confined Space', 'Lifting Permit', 'Electrical Work', 'Excavation']
  const ppeOptions = ['Helmet', 'Safety Shoes', 'Gloves', 'Safety Glasses', 'Face Shield', 'Respirator', 'Full Body Harness', 'Hearing Protection']
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<'create' | 'edit' | 'view'>('create')
  const [editingId, setEditingId] = React.useState<string | undefined>()
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({ jsaNumber: 'AUTO', jobDescription: '', equipmentNumber: '', teamMembers: '', riskLevel: 'Medium', equipmentUsed: [] as string[], requirements: [] as string[], permits: [] as string[], ppeRequirements: [] as string[], steps: [{ workStep: '', hazard: '', consequence: '', control: '', residualRisk: 'Medium', pic: '' }] })
  const readOnly = mode === 'view' || !access.canEdit

  function resetCreate() {
    setMode('create'); setEditingId(undefined); setForm({ jsaNumber: 'AUTO', jobDescription: '', equipmentNumber: '', teamMembers: '', riskLevel: 'Medium', equipmentUsed: [], requirements: [], permits: [], ppeRequirements: [], steps: [{ workStep: '', hazard: '', consequence: '', control: '', residualRisk: 'Medium', pic: '' }] }); setOpen(true)
  }
  async function openExisting(id: string, nextMode: 'view' | 'edit') {
    const detail = await getJsaById(id)
    if (!detail) return toast.error('JSA tidak ditemukan.')
    setMode(nextMode); setEditingId(id); setForm({ jsaNumber: detail.jsaNumber, jobDescription: detail.jobDescription, equipmentNumber: detail.equipmentNumber, teamMembers: detail.teamMembers, riskLevel: detail.riskLevel, equipmentUsed: (detail.equipmentUsed as string[]) ?? [], requirements: (detail.requirements as string[]) ?? [], permits: (detail.permits as string[]) ?? [], ppeRequirements: (detail.ppeRequirements as string[]) ?? [], steps: detail.steps.map((step) => ({ workStep: step.workStep, hazard: step.hazard, consequence: step.consequence, control: step.control, residualRisk: step.residualRisk, pic: step.pic })) })
    setOpen(true)
  }
  function toggleArray(key: 'equipmentUsed' | 'requirements' | 'permits' | 'ppeRequirements', value: string) {
    setForm((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((entry) => entry !== value) : [...current[key], value] }))
  }
  const save = async () => {
    if (!access.canEdit) return toast.error('Role tidak boleh simpan JSA.')
    setSaving(true)
    try {
      const cleanSteps = form.steps.filter((step) => step.workStep.trim() || step.hazard.trim() || step.control.trim())
      await saveJsa({ jsaNumber: form.jsaNumber || 'AUTO', jobDescription: form.jobDescription, equipmentNumber: form.equipmentNumber, teamMembers: form.teamMembers, equipmentUsed: form.equipmentUsed, requirements: form.requirements, permits: form.permits, ppeRequirements: form.ppeRequirements, riskLevel: form.riskLevel, signatures: {} }, cleanSteps.map((step, index) => ({ stepOrder: index, ...step })), editingId)
      toast.success('JSA tersimpan.'); setOpen(false); router.refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Gagal simpan JSA.') } finally { setSaving(false) }
  }

  function renderForm() {
    if (!open) return null;
    return (
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">{mode} JSA</p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">{form.jsaNumber}</h2>
          </div>
          <button className="text-xs text-gray-500" onClick={() => setOpen(false)}>Tutup</button>
        </div>

        <div className="grid gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-gray-500">No. JSA</span>
            <Input disabled={readOnly} className="h-11 rounded-xl border border-gray-200 bg-white px-3" value={form.jsaNumber} onChange={(e) => setForm({ ...form, jsaNumber: e.target.value })} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-gray-500">Deskripsi Pekerjaan</span>
            <Textarea disabled={readOnly} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Input disabled={readOnly} className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Equipment No." value={form.equipmentNumber} onChange={(e) => setForm({ ...form, equipmentNumber: e.target.value })} />
            <Input disabled={readOnly} className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Risk Level" value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })} />
          </div>
          <Textarea disabled={readOnly} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" placeholder="Anggota team JSA" value={form.teamMembers} onChange={(e) => setForm({ ...form, teamMembers: e.target.value })} />
        </div>

        <ChoiceGroup title="Equipment Used" options={equipmentOptions} values={form.equipmentUsed} disabled={readOnly} onToggle={(v) => toggleArray('equipmentUsed', v)} />
        <ChoiceGroup title="Requirements" options={requirementOptions} values={form.requirements} disabled={readOnly} onToggle={(v) => toggleArray('requirements', v)} />
        <ChoiceGroup title="Permit Required" options={permitOptions} values={form.permits} disabled={readOnly} onToggle={(v) => toggleArray('permits', v)} />
        <ChoiceGroup title="PPE Required" options={ppeOptions} values={form.ppeRequirements} disabled={readOnly} onToggle={(v) => toggleArray('ppeRequirements', v)} />

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Langkah Kerja</p>
          {form.steps.map((step, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500">Step {i + 1}</span>
                {form.steps.length > 1 && !readOnly ? (
                  <button type="button" className="text-xs text-orange-600" onClick={() => setForm((prev) => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }))}>Hapus</button>
                ) : null}
              </div>
              <Input disabled={readOnly} className="h-11 rounded-lg border border-gray-200 bg-white px-3" placeholder="Langkah kerja" value={step.workStep} onChange={(e) => setStepField(i, 'workStep', e.target.value)} />
              <Input disabled={readOnly} className="h-11 rounded-lg border border-gray-200 bg-white px-3" placeholder="Bahaya" value={step.hazard} onChange={(e) => setStepField(i, 'hazard', e.target.value)} />
              <Input disabled={readOnly} className="h-11 rounded-lg border border-gray-200 bg-white px-3" placeholder="Akibat" value={step.consequence} onChange={(e) => setStepField(i, 'consequence', e.target.value)} />
              <Input disabled={readOnly} className="h-11 rounded-lg border border-gray-200 bg-white px-3" placeholder="Pengendalian" value={step.control} onChange={(e) => setStepField(i, 'control', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input disabled={readOnly} className="h-11 rounded-lg border border-gray-200 bg-white px-3" placeholder="Residual Risk" value={step.residualRisk} onChange={(e) => setStepField(i, 'residualRisk', e.target.value)} />
                <Input disabled={readOnly} className="h-11 rounded-lg border border-gray-200 bg-white px-3" placeholder="PIC" value={step.pic} onChange={(e) => setStepField(i, 'pic', e.target.value)} />
              </div>
            </div>
          ))}
          {!readOnly ? (
            <Button variant="outline" className="h-10 w-full rounded-lg" onClick={() => setForm((prev) => ({ ...prev, steps: [...prev.steps, { workStep: '', hazard: '', consequence: '', control: '', residualRisk: 'Medium', pic: '' }] }))}>
              + Tambah Step
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {!readOnly ? <Button variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>Batal</Button> : null}
          {!readOnly ? (
            <Button className="h-11 rounded-xl bg-blue-600 text-white" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Simpan
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  function setStepField(i: number, field: string, value: string) {
    const s = [...form.steps];
    s[i] = { ...s[i], [field]: value };
    setForm({ ...form, steps: s });
  }

  return (
    <CardShell title="JSA Mobile" subtitle="" icon={FileText}>
      {access.canEdit ? (
        <Button className="h-11 rounded-xl bg-blue-600 text-white" onClick={resetCreate}>
          <Plus className="size-4" /> Buat JSA
        </Button>
      ) : null}
      {renderForm()}
      <section className="grid gap-2">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">{row.jsaNumber}</h2>
              <StatusPill value={row.riskLevel} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{row.jobDescription}</p>
            <div className="mt-3 flex gap-2">
              {access.canView ? <Button variant="outline" className="h-9 flex-1 rounded-lg" onClick={() => void openExisting(row.id, 'view')}><Eye className="size-4" /> View</Button> : null}
              {access.canEdit ? <Button variant="outline" className="h-9 flex-1 rounded-lg" onClick={() => void openExisting(row.id, 'edit')}>Edit</Button> : null}
              {access.canDelete ? <Button variant="outline" className="h-9 rounded-lg text-orange-600" onClick={() => void deleteJsa(row.id).then(() => router.refresh())}><Trash2 className="size-4" /></Button> : null}
            </div>
          </article>
        ))}
      </section>
    </CardShell>
  )
}



export function MobileHiradcClient({ entries }: { entries: HiradcEntry[] }) {
  const [query, setQuery] = React.useState('')
  const [riskFilter, setRiskFilter] = React.useState('all')
  const [selected, setSelected] = React.useState<HiradcEntry | null>(null)
  const documentRef = React.useRef<HTMLDivElement>(null)
  const [busy, setBusy] = React.useState<'pdf' | null>(null)

  const risks = Array.from(new Set(entries.flatMap((row) => [row.riskLevelBefore, row.riskLevelAfter]).filter(Boolean))).sort()
  const rows = entries.filter((row) => {
    const textMatch = `${row.activityName} ${row.department} ${row.location} ${row.hazardDetails} ${row.existingControl} ${row.additionalControl}`.toLowerCase().includes(query.toLowerCase())
    const riskMatch = riskFilter === 'all' || row.riskLevelBefore === riskFilter || row.riskLevelAfter === riskFilter
    return textMatch && riskMatch
  })

  async function renderCanvas() {
    const element = documentRef.current
    if (!element) return null
    const clone = element.cloneNode(true) as HTMLDivElement
    clone.style.position = 'fixed'; clone.style.left = '0'; clone.style.top = '-10000px'; clone.style.width = '794px'; clone.style.maxWidth = '794px'; clone.style.backgroundColor = '#ffffff'
    document.body.appendChild(clone)
    try {
      await document.fonts?.ready
      const { default: html2canvas } = await import('html2canvas-pro')
      return await html2canvas(clone, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 794 })
    } finally { clone.remove() }
  }

  async function downloadPdf() {
    if (!selected) return; setBusy('pdf')
    try {
      const canvas = await renderCanvas(); if (!canvas) return
      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const width = pdf.internal.pageSize.getWidth(); const height = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * width) / canvas.width
      const imgData = canvas.toDataURL('image/png')
      let left = imgHeight; let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, width, imgHeight); left -= height
      while (left > 0) { position -= height; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, position, width, imgHeight); left -= height }
      pdf.save(`HIRADC_${selected.id}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally { setBusy(null) }
  }

  return <CardShell title="HIRADC Viewer" subtitle="" icon={Flame}>
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /><Input className="h-11 rounded-xl border border-gray-200 bg-white pl-10" placeholder="Cari aktivitas / bahaya / kontrol..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setRiskFilter('all')} className={cn('h-8 shrink-0 rounded-lg px-3 text-xs font-medium', riskFilter === 'all' ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600')}>All</button>
        {risks.map((risk) => <button key={risk} type="button" onClick={() => setRiskFilter(risk)} className={cn('h-8 shrink-0 rounded-lg px-3 text-xs font-medium', riskFilter === risk ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600')}>{risk}</button>)}
      </div>
      <p className="text-xs text-gray-500">{rows.length} of {entries.length} rows</p>
    </section>

    {selected ? <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Detail HIRADC</p><h2 className="mt-1 text-base font-semibold text-gray-900">{selected.activityName}</h2></div><button type="button" className="text-xs text-gray-500" onClick={() => setSelected(null)}>Tutup</button></div>
      <Button variant="outline" className="w-full h-11 rounded-xl" disabled={Boolean(busy)} onClick={() => void downloadPdf()}>{busy === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Download PDF</Button>
      <div className="overflow-x-auto -mx-4 px-4">
      <div ref={documentRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden" style={{ width: '794px' }}>
        <div className="absolute top-12 right-12 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48" />
        </div>

        <div className="flex items-center gap-6 pb-6 border-b border-slate-200">
          <img src="/cp_logo-removebg-preview.png" alt="PT Chitra Paratama Logo" className="w-[120px] h-[60px] object-contain shrink-0" />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">PT. CHITRA PARATAMA</h1>
            <p className="text-blue-700 font-bold text-sm tracking-wide">SAFETY FIRST | COLLABORATE -INNOVATE - DOMINATE</p>
            <p className="text-[10px] text-slate-600 mt-1 font-bold">OFFICIAL HSE SYSTEM</p>
          </div>
          <div className="ml-auto">
            <div className="w-16 h-16 border-2 border-slate-800 rounded-full flex items-center justify-center rotate-12">
              <div className="text-[10px] font-bold text-center leading-tight">VERIFIED<br />DOCUMENT</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 py-6 border-b border-slate-100">
          {[["NO. DOKUMEN", `HSE/HIRADC/00${selected.id}`], ["CLASSIFICATION", "HIRADC REPORT"], ["LOCATION / SITE", selected.location || "N/A"], ["DATE / PERIOD", new Date().toLocaleDateString("id-ID")], ["PIC / AUDITOR", "PIC / Auditor"]].map(([label, value]) => (
            <div key={label}>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="font-bold text-slate-900 text-[11px] leading-tight break-words">{value}</p>
            </div>
          ))}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DOC STATUS</p>
            <span className="inline-block rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 uppercase">ACTIVE</span>
          </div>
        </div>

        <div className="py-8 flex justify-between items-start gap-6">
          <div className="max-w-2xl">
            <p className="text-blue-600 font-bold text-sm tracking-widest uppercase mb-2">HAZARD IDENTIFICATION & RISK ASSESSMENT</p>
            <h2 className="text-3xl font-black text-slate-900 leading-tight uppercase mb-4">{selected.activityName}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="inline-block rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">ID: {selected.id}</span>
              <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">{selected.department || "ACTIVE"}</span>
              <span className="inline-block rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">&#x1F4CD; {selected.location}</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CURRENT RISK STATUS</p>
            {(() => {
              const rl = (selected.riskLevelBefore || '').toUpperCase();
              const isHigh = rl === 'HIGH' || rl === 'EXTREME';
              const isModerate = rl === 'MODERATE';
              return (
                <div className={`px-6 py-4 rounded-xl border-2 text-center ${isHigh ? 'bg-red-50 border-red-200 text-red-700' : isModerate ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                  <p className="text-2xl font-black leading-none">{rl || "N/A"}</p>
                  <p className="text-xs font-bold mt-1 opacity-80">RISK</p>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6"><span className="text-amber-500 text-sm">&#x26A0;&#xFE0F;</span><h3 className="font-bold text-slate-700 tracking-wide uppercase text-sm">HAZARD & CONSEQUENCE</h3></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">HAZARD DETAIL (BAHAYA)</p>
              <p className="text-slate-900 font-bold uppercase leading-relaxed mb-6">{selected.hazardDetails || selected.hazardCategory || "N/A"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CONSEQUENCE / IMPACT (DAMPAK)</p>
              <p className="text-slate-600 italic leading-relaxed">&quot;{selected.riskConsequence || "N/A"}&quot;</p>
            </div>
            <div className="border border-blue-100 bg-white rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4 text-blue-600" /><h3 className="font-bold text-blue-700 tracking-wide uppercase text-sm">CONTROL MEASURES (PENGENDALIAN RISIKO)</h3></div>
              <div className="text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">{selected.existingControl || "Belum ada tindakan pengendalian."}</div>
            </div>
            <div className="border border-emerald-100 bg-white rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <div className="flex items-center gap-2 mb-4"><ShieldAlert className="w-4 h-4 text-emerald-600" /><h3 className="font-bold text-emerald-700 tracking-wide uppercase text-sm">ADDITIONAL CONTROL (PENGENDALIAN TAMBAHAN)</h3></div>
              <div className="text-slate-700 font-medium text-sm leading-relaxed">{selected.additionalControl || "Tidak ada pengendalian tambahan."}</div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="border border-slate-200 rounded-2xl p-6 bg-white text-center shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">RISK MATRIX ANALYSIS</p>
              <div className="text-6xl font-black text-slate-900 tracking-tighter mb-6">-</div>
              <div className="flex items-center justify-center gap-6 border-t border-slate-100 pt-6">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">LIKELIHOOD</p><p className="text-xl font-bold text-slate-800">-</p></div>
                <div className="w-px h-8 bg-slate-200" />
                <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">SEVERITY</p><p className="text-xl font-bold text-slate-800">-</p></div>
              </div>
            </div>
            <div className="bg-[#1a2332] rounded-2xl p-6 text-white shadow-lg">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">VERIFICATION INFO</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-sm">&#x1F464;</div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase">PIC REPORTER</p><p className="font-bold text-slate-100 text-sm">PIC / Auditor</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-sm">&#x1F4C5;</div>
                  <div><p className="text-[10px] font-bold text-slate-400 uppercase">LAST REVIEW</p><p className="font-bold text-slate-100 text-sm">{new Date().toLocaleDateString("id-ID")}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section> : null}

    <section className="grid gap-2">{rows.map((row) => <article key={row.id} className="rounded-xl border border-gray-100 bg-white p-4"><div className="flex justify-between gap-3"><h2 className="text-sm font-semibold text-gray-900">{row.activityName}</h2><StatusPill value={row.riskLevelAfter || row.riskLevelBefore} /></div><p className="mt-1 text-xs text-gray-500">{row.department} • {row.location}</p><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-amber-800">Hazard: {row.hazardDetails || row.hazardCategory}</p><p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">Control: {row.existingControl || '-'}</p><Button variant="outline" className="mt-3 h-9 w-full rounded-lg" onClick={() => setSelected(row)}><Eye className="size-4" />View Detail</Button></article>)}</section>
  </CardShell>
}

function ChoiceGroup({ title, options, values, disabled, onToggle }: { title: string; options: string[]; values: string[]; disabled: boolean; onToggle: (value: string) => void }) {
  return <div className="space-y-2"><p className="text-xs font-medium text-gray-500">{title}</p><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" disabled={disabled} onClick={() => onToggle(option)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', values.includes(option) ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600')}>{option}</button>)}</div></div>
}

function ReportBlock({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{title}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-900">{value || '-'}</p></div>
}
