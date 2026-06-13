'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, Eye, FileText, Flame, HardHat, Loader2, Plus, Printer, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createIncidentRecord, deleteIncidentRecord, updateIncidentRecord } from '@/app/dashboard/hse/incident-report/actions'
import { deleteJsa, getJsaById, saveJsa } from '@/app/dashboard/hse/jsa/actions'
import { deleteMobileCorrectiveAction, saveMobileCorrectiveAction } from '@/app/mobile/hse/corrective-action/actions'
import { deleteMobilePtwPermit, saveMobilePtwPermit } from '@/app/mobile/hse/ptw/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Access = { canView: boolean; canEdit: boolean; canDelete: boolean; canSelectAll?: boolean }
type Incident = {
  id: number
  title: string
  category: string
  severity: string
  description: string
  investigationStatus: string
  incidentDate: Date
  picName: string
  rootCauseAnalysis: string
  immediateCorrectiveAction: string
  documentationUrl: string
}
type JsaRow = {
  id: string
  jsaNumber: string
  jobDescription: string
  equipmentNumber: string
  teamMembers: string
  riskLevel: string
  createdAt: Date
}
type HiradcEntry = {
  id: number
  activityName: string
  department: string
  location: string
  hazardCategory: string
  hazardDetails: string
  riskConsequence: string
  riskLevelBefore: string
  riskLevelAfter: string
  existingControl: string
  additionalControl: string
}
type PtwRecord = {
  id: number
  permitNumber: string
  projectName: string
  permitType: string
  location: string
  area: string
  status: string
  riskLevel: string
  description: string
  controlSteps: string
}
type CorrectiveAction = {
  id: number
  sourceType: string
  sourceId: string
  title: string
  description: string
  actionPlan: string
  assigneeName: string
  priority: string
  status: string
  closeOutNote: string
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function CardShell({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof ShieldCheck; children: React.ReactNode }) {
  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-[1.35rem] bg-gradient-to-br from-[#003f78] to-[#0f172a] p-4 text-white shadow-[0_18px_38px_rgba(0,63,120,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b9dff6]">HSE Mobile</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{title}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#d8efff]">{subtitle}</p>
          </div>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12"><Icon className="size-5" /></span>
        </div>
      </section>
      {children}
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  return <span className="rounded-full bg-[#f6fbff] px-2.5 py-1 text-[10px] font-black uppercase text-[#486275]">{value}</span>
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

  return <CardShell title="Incident Report" subtitle="Lapor, lihat, edit, dan close tindak lanjut incident dari HP." icon={AlertTriangle}>
    {access.canEdit ? <Button className="h-12 w-full rounded-2xl bg-[#003f78] text-white" onClick={startCreate}><Plus className="size-4" />Buat Incident</Button> : null}
    {openForm ? <section className="space-y-3 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
      <Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Judul incident" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} /></div>
      <Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Kronologi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Root cause analysis" value={form.rootCauseAnalysis} onChange={(e) => setForm({ ...form, rootCauseAnalysis: e.target.value })} />
      <Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Corrective action" value={form.immediateCorrectiveAction} onChange={(e) => setForm({ ...form, immediateCorrectiveAction: e.target.value })} />
      <Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="PIC" value={form.picName} onChange={(e) => setForm({ ...form, picName: e.target.value })} />
      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12 rounded-2xl" onClick={() => setOpenForm(false)}>Batal</Button><Button className="h-12 rounded-2xl bg-[#003f78] text-white" disabled={saving} onClick={save}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Simpan</Button></div>
    </section> : null}
    <section className="grid gap-3">{records.map((row) => <article key={row.id} className="rounded-[1.15rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"><div className="flex justify-between gap-3"><div><h2 className="text-sm font-black text-[#082033]">{row.title}</h2><p className="mt-1 text-xs font-semibold text-[#486275]">{row.category} • {formatDate(row.incidentDate)}</p></div><StatusPill value={row.investigationStatus} /></div><p className="mt-3 line-clamp-3 text-xs font-semibold text-[#486275]">{row.description}</p><p className="mt-2 text-xs font-semibold text-[#8a3d00]">Action: {row.immediateCorrectiveAction || '-'}</p><div className="mt-3 grid grid-cols-2 gap-2">{access.canEdit ? <Button variant="outline" className="h-10 rounded-2xl" onClick={() => startEdit(row)}>Edit/View</Button> : null}{access.canDelete ? <Button variant="outline" className="h-10 rounded-2xl text-[#8a3d00]" onClick={() => void remove(row.id)}><Trash2 className="size-4" /></Button> : null}</div></article>)}</section>
  </CardShell>
}

export function MobileCorrectiveActionClient({ records, access }: { records: CorrectiveAction[]; access: Access }) {
  const router = useRouter()
  const [form, setForm] = React.useState({ title: '', sourceType: 'manual', actionPlan: '', assigneeName: '', priority: 'Medium' })
  const save = async () => { if (!access.canEdit) return; await saveMobileCorrectiveAction(form); toast.success('Corrective action tersimpan.'); setForm({ title: '', sourceType: 'manual', actionPlan: '', assigneeName: '', priority: 'Medium' }); router.refresh() }
  return <CardShell title="Corrective Action" subtitle="Universal action tracker untuk semua sumber HSE." icon={CheckCircle2}>{access.canEdit ? <section className="space-y-3 rounded-[1.25rem] bg-white p-4"><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Judul action" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Rencana tindakan" value={form.actionPlan} onChange={(e) => setForm({ ...form, actionPlan: e.target.value })} /><div className="grid grid-cols-2 gap-2"><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="PIC" value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} /><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div><Button className="h-12 w-full rounded-2xl bg-[#003f78] text-white" onClick={() => void save()}>Simpan Action</Button></section> : null}<section className="grid gap-3">{records.map((row) => <article key={row.id} className="rounded-[1.15rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"><div className="flex justify-between gap-3"><h2 className="text-sm font-black text-[#082033]">{row.title}</h2><StatusPill value={row.status} /></div><p className="mt-2 text-xs font-semibold text-[#486275]">{row.sourceType} • PIC {row.assigneeName || '-'}</p><p className="mt-3 rounded-2xl bg-[#fff8e8] p-3 text-xs font-semibold leading-5 text-[#8c5818]">{row.actionPlan || '-'}</p><div className="mt-3 grid grid-cols-2 gap-2">{access.canEdit ? <Button className="h-10 rounded-2xl bg-[#003f78] text-white" onClick={() => void saveMobileCorrectiveAction({ ...row, status: 'Closed' }).then(() => router.refresh())}>Close</Button> : null}{access.canDelete ? <Button variant="outline" className="h-10 rounded-2xl text-[#8a3d00]" onClick={() => void deleteMobileCorrectiveAction(row.id).then(() => router.refresh())}>Delete</Button> : null}</div></article>)}</section></CardShell>
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
  return <CardShell title="JSA Mobile" subtitle="Form Job Safety Analysis lengkap seperti desktop, dibuat nyaman untuk HP." icon={FileText}>{access.canEdit ? <Button className="h-12 rounded-2xl bg-[#003f78] text-white" onClick={resetCreate}><Plus className="size-4" />Buat JSA</Button> : null}{open ? <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">{mode} JSA</p><h2 className="mt-1 text-lg font-black text-[#082033]">{form.jsaNumber}</h2></div><button className="text-xs font-black text-[#486275]" onClick={() => setOpen(false)}>Tutup</button></div><div className="grid gap-3"><Label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">No. JSA</span><Input disabled={readOnly} className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" value={form.jsaNumber} onChange={(e) => setForm({ ...form, jsaNumber: e.target.value })} /></Label><Label className="space-y-2"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Deskripsi Pekerjaan</span><Textarea disabled={readOnly} className="rounded-2xl border-0 bg-[#e9f6fd]" value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} /></Label><div className="grid grid-cols-2 gap-2"><Input disabled={readOnly} className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Equipment No." value={form.equipmentNumber} onChange={(e) => setForm({ ...form, equipmentNumber: e.target.value })} /><Input disabled={readOnly} className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Risk Level" value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })} /></div><Textarea disabled={readOnly} className="rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Anggota team JSA" value={form.teamMembers} onChange={(e) => setForm({ ...form, teamMembers: e.target.value })} /></div><ChoiceGroup title="Equipment Used" options={equipmentOptions} values={form.equipmentUsed} disabled={readOnly} onToggle={(value) => toggleArray('equipmentUsed', value)} /><ChoiceGroup title="Requirements" options={requirementOptions} values={form.requirements} disabled={readOnly} onToggle={(value) => toggleArray('requirements', value)} /><ChoiceGroup title="Permits" options={permitOptions} values={form.permits} disabled={readOnly} onToggle={(value) => toggleArray('permits', value)} /><ChoiceGroup title="PPE" options={ppeOptions} values={form.ppeRequirements} disabled={readOnly} onToggle={(value) => toggleArray('ppeRequirements', value)} /><div className="space-y-3"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">Job Steps</p>{!readOnly ? <Button variant="outline" className="h-9 rounded-2xl" onClick={() => setForm({ ...form, steps: [...form.steps, { workStep: '', hazard: '', consequence: '', control: '', residualRisk: 'Medium', pic: '' }] })}><Plus className="size-4" />Step</Button> : null}</div>{form.steps.map((step, index) => <article key={index} className="space-y-2 rounded-[1rem] bg-[#f8fbff] p-3"><p className="text-xs font-black text-[#486275]">Step {index + 1}</p><Textarea disabled={readOnly} className="rounded-2xl border-0 bg-white" placeholder="Langkah kerja" value={step.workStep} onChange={(e) => setForm({ ...form, steps: form.steps.map((entry, i) => i === index ? { ...entry, workStep: e.target.value } : entry) })} /><Textarea disabled={readOnly} className="rounded-2xl border-0 bg-white" placeholder="Hazard" value={step.hazard} onChange={(e) => setForm({ ...form, steps: form.steps.map((entry, i) => i === index ? { ...entry, hazard: e.target.value } : entry) })} /><Textarea disabled={readOnly} className="rounded-2xl border-0 bg-white" placeholder="Consequence" value={step.consequence} onChange={(e) => setForm({ ...form, steps: form.steps.map((entry, i) => i === index ? { ...entry, consequence: e.target.value } : entry) })} /><Textarea disabled={readOnly} className="rounded-2xl border-0 bg-white" placeholder="Control" value={step.control} onChange={(e) => setForm({ ...form, steps: form.steps.map((entry, i) => i === index ? { ...entry, control: e.target.value } : entry) })} /><div className="grid grid-cols-2 gap-2"><Input disabled={readOnly} className="h-11 rounded-2xl border-0 bg-white" placeholder="Residual risk" value={step.residualRisk} onChange={(e) => setForm({ ...form, steps: form.steps.map((entry, i) => i === index ? { ...entry, residualRisk: e.target.value } : entry) })} /><Input disabled={readOnly} className="h-11 rounded-2xl border-0 bg-white" placeholder="PIC" value={step.pic} onChange={(e) => setForm({ ...form, steps: form.steps.map((entry, i) => i === index ? { ...entry, pic: e.target.value } : entry) })} /></div>{!readOnly && form.steps.length > 1 ? <Button variant="outline" className="h-9 rounded-2xl text-[#8a3d00]" onClick={() => setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) })}>Hapus Step</Button> : null}</article>)}</div>{!readOnly ? <Button className="h-12 w-full rounded-2xl bg-[#003f78] text-white" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Simpan JSA</Button> : null}</section> : null}<section className="grid gap-3">{rows.map((row) => <article key={row.id} className="rounded-[1.15rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"><h2 className="text-sm font-black text-[#082033]">{row.jobDescription}</h2><p className="mt-1 text-xs font-semibold text-[#486275]">{row.jsaNumber} • {row.riskLevel}</p><p className="mt-2 text-xs font-semibold text-[#486275]">Team: {row.teamMembers}</p><div className="mt-3 grid grid-cols-3 gap-2"><Button variant="outline" className="h-10 rounded-2xl" title="View" aria-label="View JSA" onClick={() => void openExisting(row.id, 'view')}><Eye className="size-4" /></Button>{access.canEdit ? <Button variant="outline" className="h-10 rounded-2xl" title="Edit" aria-label="Edit JSA" onClick={() => void openExisting(row.id, 'edit')}><FileText className="size-4" /></Button> : null}{access.canDelete ? <Button variant="outline" className="h-10 rounded-2xl text-[#8a3d00]" title="Delete" aria-label="Delete JSA" onClick={() => void deleteJsa(row.id).then(() => router.refresh())}><Trash2 className="size-4" /></Button> : null}</div></article>)}</section></CardShell>
}

function ChoiceGroup({ title, options, values, disabled, onToggle }: { title: string; options: string[]; values: string[]; disabled: boolean; onToggle: (value: string) => void }) {
  return <div className="space-y-2"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">{title}</p><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} type="button" disabled={disabled} onClick={() => onToggle(option)} className={cn('rounded-full px-3 py-2 text-xs font-black', values.includes(option) ? 'bg-[#003f78] text-white' : 'bg-[#f6fbff] text-[#486275]')}>{option}</button>)}</div></div>
}

export function MobilePtwClient({ sources, access, permits }: { sources: HiradcEntry[]; access: Access; permits: PtwRecord[] }) {
  const router = useRouter()
  const [form, setForm] = React.useState({ projectName: '', permitType: 'Hot Work', location: '', area: '', riskLevel: 'High', description: '', controlSteps: '' })
  const save = async () => { if (!access.canEdit) return toast.error('Role tidak boleh buat PTW.'); await saveMobilePtwPermit(form); toast.success('PTW tersimpan ke database.'); setForm({ projectName: '', permitType: 'Hot Work', location: '', area: '', riskLevel: 'High', description: '', controlSteps: '' }); router.refresh() }
  return <CardShell title="PTW Mobile" subtitle="Buat Permit to Work dari HP, tersimpan ke database." icon={HardHat}>{access.canEdit ? <section className="space-y-3 rounded-[1.25rem] bg-white p-4"><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Nama pekerjaan" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} /><div className="grid grid-cols-2 gap-2"><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Lokasi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div><Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Deskripsi kerja" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Kontrol kerja / LOTO / gas test" value={form.controlSteps} onChange={(e) => setForm({ ...form, controlSteps: e.target.value })} /><Button className="h-12 w-full rounded-2xl bg-[#003f78] text-white" onClick={() => void save()}>Simpan PTW</Button></section> : null}<section className="grid gap-3">{permits.map((row) => <article key={row.id} className="rounded-[1.15rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"><div className="flex justify-between gap-3"><h2 className="text-sm font-black text-[#082033]">{row.projectName}</h2><StatusPill value={row.status} /></div><p className="mt-1 text-xs font-semibold text-[#486275]">{row.permitNumber} • {row.riskLevel}</p><p className="mt-2 text-xs font-semibold text-[#486275]">{row.location}</p>{access.canDelete ? <Button variant="outline" className="mt-3 h-10 rounded-2xl text-[#8a3d00]" onClick={() => void deleteMobilePtwPermit(row.id).then(() => router.refresh())}>Delete</Button> : null}</article>)}</section><p className="text-xs font-semibold text-[#486275]">HIRADC source tersedia: {sources.length} aktivitas.</p></CardShell>
}

export function MobileHiradcClient({ entries }: { entries: HiradcEntry[] }) {
  const [query, setQuery] = React.useState('')
  const [riskFilter, setRiskFilter] = React.useState('all')
  const [selected, setSelected] = React.useState<HiradcEntry | null>(null)
  const documentRef = React.useRef<HTMLDivElement>(null)
  const [busy, setBusy] = React.useState<'pdf' | 'print' | null>(null)

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
    clone.style.position = 'fixed'
    clone.style.left = '0'
    clone.style.top = '-10000px'
    clone.style.width = '794px'
    clone.style.maxWidth = '794px'
    clone.style.backgroundColor = '#ffffff'
    document.body.appendChild(clone)
    try {
      await document.fonts?.ready
      const { default: html2canvas } = await import('html2canvas-pro')
      return await html2canvas(clone, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 794 })
    } finally {
      clone.remove()
    }
  }

  async function downloadPdf() {
    if (!selected) return
    setBusy('pdf')
    try {
      const canvas = await renderCanvas()
      if (!canvas) return
      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const width = pdf.internal.pageSize.getWidth()
      const height = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * width) / canvas.width
      const imgData = canvas.toDataURL('image/png')
      let left = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, width, imgHeight)
      left -= height
      while (left > 0) {
        position -= height
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, width, imgHeight)
        left -= height
      }
      pdf.save(`HIRADC_${selected.id}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  async function printPdf() {
    if (!selected) return
    setBusy('print')
    try {
      const canvas = await renderCanvas()
      if (!canvas) return
      const imgData = canvas.toDataURL('image/png')
      const win = window.open('', '_blank', 'width=900,height=1200')
      if (!win) return alert('Popup diblokir. Izinkan popup untuk mencetak dokumen.')
      win.document.write(`<!doctype html><html><head><title>HIRADC_${selected.id}</title><style>@page{size:A4;margin:10mm}body{margin:0}img{display:block;width:100%;height:auto}</style></head><body><img src="${imgData}" /></body></html>`)
      win.document.close()
      setTimeout(() => { win.focus(); win.print(); win.close() }, 250)
    } finally {
      setBusy(null)
    }
  }

  return <CardShell title="HIRADC Viewer" subtitle="Cari bahaya, risiko, kontrol, lalu download PDF dari HP." icon={Flame}>
    <section className="space-y-3 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
      <div className="relative"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#486275]" /><Input className="h-12 rounded-2xl border-0 bg-[#f6fbff] pl-11" placeholder="Cari aktivitas / bahaya / kontrol..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setRiskFilter('all')} className={cn('h-9 shrink-0 rounded-full px-4 text-xs font-black uppercase', riskFilter === 'all' ? 'bg-[#003f78] text-white' : 'bg-[#f6fbff] text-[#486275]')}>All</button>
        {risks.map((risk) => <button key={risk} type="button" onClick={() => setRiskFilter(risk)} className={cn('h-9 shrink-0 rounded-full px-4 text-xs font-black uppercase', riskFilter === risk ? 'bg-[#003f78] text-white' : 'bg-[#f6fbff] text-[#486275]')}>{risk}</button>)}
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">{rows.length} of {entries.length} rows</p>
    </section>

    {selected ? <section className="space-y-3 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">Detail HIRADC</p><h2 className="mt-1 text-lg font-black text-[#082033]">{selected.activityName}</h2></div><button type="button" className="text-xs font-black text-[#486275]" onClick={() => setSelected(null)}>Tutup</button></div>
      <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12 rounded-2xl" disabled={Boolean(busy)} onClick={() => void downloadPdf()}>{busy === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}PDF</Button><Button className="h-12 rounded-2xl bg-[#003f78] text-white" disabled={Boolean(busy)} onClick={() => void printPdf()}>{busy === 'print' ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}Cetak</Button></div>
      <div ref={documentRef} className="rounded-[1rem] border border-[#d8e4ee] bg-white p-4">
        <div className="flex items-start justify-between gap-4 border-b border-[#d8e4ee] pb-4"><div><p className="text-sm font-black text-[#082033]">PT. CHITRA PARATAMA</p><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">HIRADC Mobile Report</p></div><div className="text-right"><p className="text-[10px] font-black uppercase text-[#486275]">ID</p><p className="text-lg font-black text-[#082033]">#{selected.id}</p></div></div>
        <div className="grid grid-cols-2 gap-3 bg-[#f6fbff] p-4 text-xs font-semibold text-[#486275]"><div><p className="text-[10px] font-black uppercase">Department</p><p className="mt-1 text-[#082033]">{selected.department || '-'}</p></div><div><p className="text-[10px] font-black uppercase">Location</p><p className="mt-1 text-[#082033]">{selected.location || '-'}</p></div><div><p className="text-[10px] font-black uppercase">Risk Before</p><p className="mt-1 text-[#8a3d00]">{selected.riskLevelBefore || '-'}</p></div><div><p className="text-[10px] font-black uppercase">Risk After</p><p className="mt-1 text-[#14532d]">{selected.riskLevelAfter || '-'}</p></div></div>
        <div className="space-y-3 p-4"><ReportBlock title="Activity" value={selected.activityName} /><ReportBlock title="Hazard Category" value={selected.hazardCategory} /><ReportBlock title="Hazard Details" value={selected.hazardDetails} /><ReportBlock title="Risk Consequence" value={selected.riskConsequence} /><ReportBlock title="Existing Control" value={selected.existingControl} /><ReportBlock title="Additional Control" value={selected.additionalControl} /></div>
        <div className="grid grid-cols-2 gap-8 border-t border-[#d8e4ee] p-4 text-center"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Prepared</p><div className="h-10" /><p className="border-t border-[#d8e4ee] pt-2 text-xs font-black text-[#082033]">Field User</p></div><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Verified</p><div className="h-10" /><p className="border-t border-[#d8e4ee] pt-2 text-xs font-black text-[#003f78]">HSE SYSTEM</p></div></div>
      </div>
    </section> : null}

    <section className="grid gap-3">{rows.map((row) => <article key={row.id} className="rounded-[1.15rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"><div className="flex justify-between gap-3"><h2 className="text-sm font-black text-[#082033]">{row.activityName}</h2><StatusPill value={row.riskLevelAfter || row.riskLevelBefore} /></div><p className="mt-1 text-xs font-semibold text-[#486275]">{row.department} • {row.location}</p><p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#8c5818]">Hazard: {row.hazardDetails || row.hazardCategory}</p><p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">Control: {row.existingControl || '-'}</p><Button variant="outline" className="mt-3 h-10 w-full rounded-2xl" onClick={() => setSelected(row)}><Eye className="size-4" />View Detail</Button></article>)}</section>
  </CardShell>
}

function ReportBlock({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl bg-[#f8fbff] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">{title}</p><p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-[#082033]">{value || '-'}</p></div>
}
