'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, Eye, FileText, Flame, HardHat, Loader2, Plus, Search, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createIncidentRecord, deleteIncidentRecord, updateIncidentRecord } from '@/app/dashboard/hse/incident-report/actions'
import { deleteJsa, getJsaById, saveJsa } from '@/app/dashboard/hse/jsa/actions'
import { deleteMobileCorrectiveAction, saveMobileCorrectiveAction } from '@/app/mobile/hse/corrective-action/actions'
import { deleteMobilePtwPermit, saveMobilePtwPermit } from '@/app/mobile/hse/ptw/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Access = { canView: boolean; canEdit: boolean; canDelete: boolean; canSelectAll?: boolean }
type Incident = { id: number; title: string; category: string; severity: string; description: string; investigationStatus: string; incidentDate: Date; picName: string; rootCauseAnalysis: string; immediateCorrectiveAction: string; documentationUrl: string }
type JsaRow = { id: string; jsaNumber: string; jobDescription: string; equipmentNumber: string; teamMembers: string; riskLevel: string; createdAt: Date }
type HiradcEntry = { id: number; activityName: string; department: string; location: string; hazardCategory: string; hazardDetails: string; riskConsequence: string; riskLevelBefore: string; riskLevelAfter: string; existingControl: string; additionalControl: string }
type PtwRecord = { id: number; permitNumber: string; projectName: string; permitType: string; location: string; area: string; status: string; riskLevel: string; description: string; controlSteps: string }
type CorrectiveAction = { id: number; sourceType: string; sourceId: string; title: string; description: string; actionPlan: string; assigneeName: string; priority: string; status: string; closeOutNote: string }

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function CardShell({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof ShieldCheck; children: React.ReactNode }) {
  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">HSE Mobile</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-200">{subtitle}</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/10"><Icon className="size-5 text-blue-200" /></span>
        </div>
      </section>
      {children}
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

export function MobilePtwClient({ sources, access, permits }: { sources: HiradcEntry[]; access: Access; permits: PtwRecord[] }) {
  const router = useRouter()
  const [form, setForm] = React.useState({ projectName: '', permitType: 'Hot Work', location: '', area: '', riskLevel: 'High', description: '', controlSteps: '' })
  const save = async () => { if (!access.canEdit) return toast.error('Role tidak boleh buat PTW.'); await saveMobilePtwPermit(form); toast.success('PTW tersimpan ke database.'); setForm({ projectName: '', permitType: 'Hot Work', location: '', area: '', riskLevel: 'High', description: '', controlSteps: '' }); router.refresh() }
  return (
    <CardShell title="PTW Mobile" subtitle="" icon={HardHat}>
      {access.canEdit ? (
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Nama pekerjaan" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Lokasi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input className="h-11 rounded-xl border border-gray-200 bg-white px-3" placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          </div>
          <Textarea className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" placeholder="Deskripsi kerja" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Textarea className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" placeholder="Kontrol kerja / LOTO / gas test" value={form.controlSteps} onChange={(e) => setForm({ ...form, controlSteps: e.target.value })} />
          <Button className="h-11 w-full rounded-xl bg-blue-600 text-white" onClick={() => void save()}>Simpan PTW</Button>
        </section>
      ) : null}
      <section className="grid gap-2">
        {permits.map((row) => (
          <article key={row.id} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">{row.projectName}</h2>
              <StatusPill value={row.status} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{row.permitNumber} &bull; {row.riskLevel}</p>
            <p className="mt-2 text-xs text-gray-500">{row.location}</p>
            {access.canDelete ? <Button variant="outline" className="mt-3 h-9 rounded-lg text-orange-600" onClick={() => void deleteMobilePtwPermit(row.id).then(() => router.refresh())}>Hapus</Button> : null}
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
