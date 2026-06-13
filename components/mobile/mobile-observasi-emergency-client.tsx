'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  Flame,
  Info,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createIncidentRecord,
  deleteIncidentRecord,
  updateIncidentRecord,
} from '@/app/dashboard/hse/incident-report/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type IncidentRecord = {
  id: number
  title: string
  category: string
  severity: string
  description: string
  siteId: number | null
  investigationStatus: string
  incidentDate: Date | string
  picEmployeeId: number | null
  picName: string
  rootCauseAnalysis: string
  immediateCorrectiveAction: string
  documentationUrl: string
  createdAt: Date | string
  updatedAt: Date | string
}

type Access = { canView: boolean; canEdit: boolean; canDelete: boolean; canSelectAll?: boolean }

const CATEGORIES = ['Near Miss', 'Unsafe Action', 'Unsafe Condition', 'Property Damage', 'Medical', 'Fire', 'Environmental Spill', 'Environmental']
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES = ['Open', 'Investigating', 'Mitigating', 'Escalated', 'Closed']

function formatDate(value: Date | string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const severityColor: Record<string, string> = {
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  High: 'bg-rose-50 text-rose-700 border-rose-200',
  Critical: 'bg-red-100 text-red-800 border-red-300',
}

const statusColor: Record<string, string> = {
  Open: 'bg-sky-50 text-sky-700 border-sky-200',
  Investigating: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Mitigating: 'bg-amber-50 text-amber-700 border-amber-200',
  Escalated: 'bg-rose-50 text-rose-700 border-rose-200',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function CardShell({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof ShieldCheck; children: React.ReactNode }) {
  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-[1.35rem] bg-gradient-to-br from-[#5a2200] to-[#8a3d00] p-4 text-white shadow-[0_18px_38px_rgba(90,34,0,0.24)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd7b5]">HSE Mobile</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{title}</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#ffe6d1]">{subtitle}</p>
          </div>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12"><Icon className="size-5" /></span>
        </div>
      </section>
      {children}
    </div>
  )
}

export function MobileObservasiEmergencyClient({
  records,
  access,
}: {
  records: IncidentRecord[]
  access: Access
}) {
  const router = useRouter()

  // Search & filter
  const [query, setQuery] = React.useState('')
  const [catFilter, setCatFilter] = React.useState('all')
  const [sevFilter, setSevFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [showFilters, setShowFilters] = React.useState(false)

  const filtered = React.useMemo(() => {
    return records.filter((r) => {
      const textMatch = `${r.title} ${r.picName} ${r.description} ${r.category}`.toLowerCase().includes(query.toLowerCase())
      const catMatch = catFilter === 'all' || r.category === catFilter
      const sevMatch = sevFilter === 'all' || r.severity === sevFilter
      const statMatch = statusFilter === 'all' || r.investigationStatus === statusFilter
      return textMatch && catMatch && sevMatch && statMatch
    })
  }, [records, query, catFilter, sevFilter, statusFilter])

  // Stats
  const stats = React.useMemo(() => {
    let open = 0, closed = 0, critical = 0
    records.forEach((r) => {
      if (r.investigationStatus === 'Open') open++
      else if (r.investigationStatus === 'Closed') closed++
      if (r.severity === 'Critical' || r.severity === 'High') critical++
    })
    return { total: records.length, open, closed, critical }
  }, [records])

  // Form
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<IncidentRecord | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [activeFormTab, setActiveFormTab] = React.useState<'observasi' | 'emergency'>('observasi')

  const [fTitle, setFTitle] = React.useState('')
  const [fCategory, setFCategory] = React.useState('Near Miss')
  const [fSeverity, setFSeverity] = React.useState('Medium')
  const [fStatus, setFStatus] = React.useState('Open')
  const [fPicName, setFPicName] = React.useState('')
  const [fDesc, setFDesc] = React.useState('')
  const [fRca, setFRca] = React.useState('')
  const [fAction, setFAction] = React.useState('')
  const [fDocUrl, setFDocUrl] = React.useState('')
  const [fIncidentDate, setFIncidentDate] = React.useState(new Date().toISOString().split('T')[0])

  // Detail
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detailItem, setDetailItem] = React.useState<IncidentRecord | null>(null)

  const openCreate = (tab: 'observasi' | 'emergency') => {
    setEditing(null); setActiveFormTab(tab)
    setFTitle(''); setFCategory(tab === 'observasi' ? 'Unsafe Action' : 'Near Miss')
    setFSeverity('Medium'); setFStatus('Open'); setFPicName(''); setFDesc('')
    setFRca(''); setFAction(''); setFDocUrl(''); setFIncidentDate(new Date().toISOString().split('T')[0])
    setFormOpen(true)
  }

  const openEdit = (item: IncidentRecord) => {
    setEditing(item); setActiveFormTab('observasi')
    setFTitle(item.title); setFCategory(item.category); setFSeverity(item.severity)
    setFStatus(item.investigationStatus); setFPicName(item.picName); setFDesc(item.description)
    setFRca(item.rootCauseAnalysis); setFAction(item.immediateCorrectiveAction)
    setFDocUrl(item.documentationUrl)
    setFIncidentDate(new Date(item.incidentDate).toISOString().split('T')[0])
    setFormOpen(true)
  }

  const openDetail = (item: IncidentRecord) => {
    setDetailItem(item); setDetailOpen(true)
  }

  const handleSave = async () => {
    if (!fTitle.trim() || !fDesc.trim()) return toast.error('Judul dan deskripsi wajib diisi')
    setSaving(true)
    const payload = {
      title: fTitle.trim(),
      category: fCategory,
      severity: fSeverity,
      description: fDesc.trim(),
      investigationStatus: fStatus,
      incidentDate: new Date(fIncidentDate),
      picName: fPicName.trim() || 'System',
      rootCauseAnalysis: fRca,
      immediateCorrectiveAction: fAction,
      documentationUrl: fDocUrl,
    }
    try {
      const res = editing
        ? await updateIncidentRecord(editing.id, payload)
        : await createIncidentRecord(payload)
      if (res.success) {
        toast.success(editing ? 'Data observasi diperbarui' : 'Observasi/emergency baru ditambahkan')
        setFormOpen(false); router.refresh()
      } else toast.error(res.error || 'Gagal simpan')
    } catch { toast.error('Gagal simpan ke database') } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus record ini?')) return
    try {
      const res = await deleteIncidentRecord(id)
      if (res.success) { toast.success('Record dihapus'); router.refresh() }
      else toast.error(res.error || 'Gagal hapus')
    } catch { toast.error('Gagal hapus') }
  }

  const uniqueCategories = React.useMemo(() => Array.from(new Set(records.map((r) => r.category))).sort(), [records])

  return (
    <CardShell title="Observasi & Emergency" subtitle="Catat observasi K3, laporkan insiden, lacak investigasi dan tindak lanjut dari HP." icon={Siren}>
      {/* Stats */}
      <section className="grid grid-cols-4 gap-2">
        <div className="rounded-[1rem] bg-white p-3 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <p className="text-[9px] font-black uppercase text-[#486275]">Total</p>
          <p className="mt-1 text-xl font-black text-[#082033]">{stats.total}</p>
        </div>
        <div className="rounded-[1rem] bg-white p-3 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <p className="text-[9px] font-black uppercase text-[#486275]">Open</p>
          <p className="mt-1 text-xl font-black text-sky-700">{stats.open}</p>
        </div>
        <div className="rounded-[1rem] bg-white p-3 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <p className="text-[9px] font-black uppercase text-[#486275]">Closed</p>
          <p className="mt-1 text-xl font-black text-emerald-700">{stats.closed}</p>
        </div>
        <div className="rounded-[1rem] bg-white p-3 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <p className="text-[9px] font-black uppercase text-[#486275]">Kritis</p>
          <p className="mt-1 text-xl font-black text-rose-700">{stats.critical}</p>
        </div>
      </section>

      {/* Search & filter */}
      <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#486275]" />
          <Input className="h-12 rounded-2xl border-0 bg-[#f6fbff] pl-11" placeholder="Cari judul/PIC/deskripsi..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterChip active activeColor="bg-[#8a3d00]" onClick={() => openCreate('observasi')}>
              <Plus className="mr-1 size-3" />Observasi
            </FilterChip>
            <FilterChip active activeColor="bg-[#5a2200]" onClick={() => openCreate('emergency')}>
              <AlertTriangle className="mr-1 size-3" />Emergency
            </FilterChip>
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={cn('flex h-9 items-center gap-1.5 rounded-full px-3 text-[10px] font-black uppercase', showFilters ? 'bg-[#003f78] text-white' : 'bg-[#f6fbff] text-[#486275]')}>
            <SlidersHorizontal className="size-3" />Filter
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={catFilter === 'all'} onClick={() => setCatFilter('all')}>Semua</FilterChip>
              {uniqueCategories.map((c) => <FilterChip key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>{c}</FilterChip>)}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={sevFilter === 'all'} onClick={() => setSevFilter('all')}>Sev: All</FilterChip>
              {SEVERITIES.map((s) => <FilterChip key={s} active={sevFilter === s} onClick={() => setSevFilter(s)}>{s}</FilterChip>)}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All Status</FilterChip>
              {STATUSES.map((s) => <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</FilterChip>)}
            </div>
          </div>
        )}
      </section>

      {/* List */}
      {filtered.length === 0 ? (
        <section className="rounded-[1.25rem] bg-white p-8 text-center shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
          <ShieldCheck className="mx-auto size-10 text-[#486275]/40" />
          <p className="mt-3 text-sm font-bold text-[#486275]">Belum ada record</p>
          <p className="mt-1 text-xs text-[#486275]/70">Buat observasi atau laporan emergency baru</p>
        </section>
      ) : (
        <section className="grid gap-3">
          {filtered.map((item) => {
            const isEmergency = ['Near Miss', 'Property Damage', 'Medical', 'Fire', 'Environmental Spill'].includes(item.category)
            return (
              <article key={item.id} className="rounded-[1.15rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', isEmergency ? 'bg-[#fff1ea] text-[#8a3d00]' : 'bg-[#e6f6ff] text-[#003f78]')}>
                        {isEmergency ? <AlertTriangle className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                      </span>
                      <h2 className="truncate text-sm font-black text-[#082033]">{item.title}</h2>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">{item.description}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold', severityColor[item.severity] || 'bg-slate-50 text-slate-700')}>{item.severity}</span>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold', statusColor[item.investigationStatus] || 'bg-slate-50 text-slate-700')}>{item.investigationStatus}</span>
                  <span className="rounded-full bg-[#f6fbff] px-2 py-0.5 text-[9px] font-bold text-[#486275]">{item.category}</span>
                </div>

                <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-[#486275]">
                  {item.picName && <span className="flex items-center gap-1"><User className="size-3" />{item.picName}</span>}
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDate(item.incidentDate)}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button variant="outline" className="h-9 rounded-2xl text-[10px] font-black" onClick={() => openDetail(item)}>
                    <Eye className="mr-1 size-3" />Detail
                  </Button>
                  {access.canEdit && (
                    <Button variant="outline" className="h-9 rounded-2xl text-[10px] font-black" onClick={() => openEdit(item)}>
                      <Pencil className="mr-1 size-3" />Edit
                    </Button>
                  )}
                  {access.canDelete && (
                    <Button variant="outline" className="h-9 rounded-2xl text-[10px] font-black text-[#8a3d00]" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="mr-1 size-3" />Hapus
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      <p className="text-center text-[10px] font-black tracking-[0.14em] text-[#486275]">{filtered.length} dari {records.length} record</p>

      {/* ============ FORM DRAWER ============ */}
      {formOpen && (
        <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">
                {editing ? 'Edit' : activeFormTab === 'emergency' ? 'Emergency' : 'Observasi'} Baru
              </p>
              <h2 className="mt-1 text-lg font-black text-[#082033]">{editing ? editing.title : activeFormTab === 'emergency' ? 'Laporan Emergency' : 'Observasi K3'}</h2>
            </div>
            <button type="button" className="text-xs font-black text-[#486275]" onClick={() => setFormOpen(false)}>Tutup</button>
          </div>

          {/* Tab pilihan observasi/emergency (hanya saat create baru) */}
          {!editing && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setActiveFormTab('observasi')}
                className={cn('flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-wider transition', activeFormTab === 'observasi' ? 'bg-[#003f78] text-white' : 'bg-[#f6fbff] text-[#486275]')}>
                <ShieldCheck className="size-4" />Observasi
              </button>
              <button type="button" onClick={() => setActiveFormTab('emergency')}
                className={cn('flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-wider transition', activeFormTab === 'emergency' ? 'bg-[#8a3d00] text-white' : 'bg-[#f6fbff] text-[#486275]')}>
                <Siren className="size-4" />Emergency
              </button>
            </div>
          )}

          <div className="space-y-3">
            <Label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Judul Kejadian</span>
              <Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Jelaskan kejadian..." value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <Label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Kategori</span>
                <select value={fCategory} onChange={(e) => setFCategory(e.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033] focus:outline-none focus:ring-2 focus:ring-[#003f78]/30">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Label>
              <Label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Severity</span>
                <select value={fSeverity} onChange={(e) => setFSeverity(e.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033] focus:outline-none focus:ring-2 focus:ring-[#003f78]/30">
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Status</span>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033] focus:outline-none focus:ring-2 focus:ring-[#003f78]/30">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Label>
              <Label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal</span>
                <Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" type="date" value={fIncidentDate} onChange={(e) => setFIncidentDate(e.target.value)} />
              </Label>
            </div>

            <Label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">PIC / Petugas</span>
              <Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Nama penanggung jawab" value={fPicName} onChange={(e) => setFPicName(e.target.value)} />
            </Label>

            <Label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Deskripsi / Kronologi</span>
              <Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" rows={3} placeholder="Jelaskan kronologi kejadian..." value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
            </Label>

            <Label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Root Cause Analysis (RCA)</span>
              <Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" rows={2} placeholder="Analisis akar masalah..." value={fRca} onChange={(e) => setFRca(e.target.value)} />
            </Label>

            <Label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tindakan Perbaikan</span>
              <Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" rows={2} placeholder="Tindakan korektif yang dilakukan..." value={fAction} onChange={(e) => setFAction(e.target.value)} />
            </Label>

            <Label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Dokumentasi URL</span>
              <Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Link foto/dokumen pendukung" value={fDocUrl} onChange={(e) => setFDocUrl(e.target.value)} />
            </Label>

            {fDocUrl && (
              <div className="rounded-xl bg-[#f8fbff] p-3">
                <a href={fDocUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-[#003f78]">
                  <FileText className="size-4" />Buka dokumentasi
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12 rounded-2xl" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button className="h-12 rounded-2xl bg-[#003f78] text-white" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
              {editing ? 'Perbarui' : 'Simpan'}
            </Button>
          </div>
        </section>
      )}

      {/* ============ DETAIL VIEW ============ */}
      {detailOpen && detailItem && (
        <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">Detail Record</p>
              <h2 className="mt-1 text-lg font-black text-[#082033]">{detailItem.title}</h2>
            </div>
            <button type="button" className="text-xs font-black text-[#486275]" onClick={() => setDetailOpen(false)}>Tutup</button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold', severityColor[detailItem.severity] || 'bg-slate-50 text-slate-700')}>{detailItem.severity}</span>
            <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-bold', statusColor[detailItem.investigationStatus] || 'bg-slate-50 text-slate-700')}>{detailItem.investigationStatus}</span>
            <span className="rounded-full bg-[#f6fbff] px-2.5 py-1 text-[10px] font-bold text-[#486275]">{detailItem.category}</span>
          </div>

          <div className="rounded-xl bg-[#f8fbff] p-3">
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-[#486275]">
              {detailItem.picName && <div><p className="text-[9px] font-black uppercase">PIC</p><p className="mt-0.5 text-[#082033]">{detailItem.picName}</p></div>}
              <div><p className="text-[9px] font-black uppercase">Tanggal</p><p className="mt-0.5 text-[#082033]">{formatDate(detailItem.incidentDate)}</p></div>
              {detailItem.siteId && <div><p className="text-[9px] font-black uppercase">Site ID</p><p className="mt-0.5 text-[#082033]">{detailItem.siteId}</p></div>}
              <div><p className="text-[9px] font-black uppercase">Diupdate</p><p className="mt-0.5 text-[#082033]">{formatDate(detailItem.updatedAt)}</p></div>
            </div>
          </div>

          <ReportBlock title="Kronologi" value={detailItem.description} />
          {detailItem.rootCauseAnalysis && <ReportBlock title="Root Cause Analysis" value={detailItem.rootCauseAnalysis} />}
          {detailItem.immediateCorrectiveAction && <ReportBlock title="Tindakan Perbaikan" value={detailItem.immediateCorrectiveAction} />}

          {detailItem.documentationUrl && (
            <div className="rounded-xl bg-[#f8fbff] p-3">
              <p className="text-[9px] font-black uppercase text-[#486275]">Dokumentasi</p>
              <a href={detailItem.documentationUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 text-xs font-bold text-[#003f78]">
                <FileText className="size-4" />Buka dokumentasi
              </a>
              {detailItem.documentationUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) && (
                <img src={detailItem.documentationUrl} alt="" className="mt-2 w-full max-h-64 rounded-xl border object-contain bg-white" />
              )}
            </div>
          )}

          {access.canEdit && (
            <Button className="h-12 w-full rounded-2xl bg-[#003f78] text-white"
              onClick={() => { setDetailOpen(false); openEdit(detailItem) }}>
              <Pencil className="mr-2 size-4" />Edit Record
            </Button>
          )}
        </section>
      )}
    </CardShell>
  )
}

function FilterChip({ active, activeColor, onClick, children }: { active: boolean; activeColor?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('h-9 shrink-0 rounded-full px-4 text-xs font-black uppercase whitespace-nowrap', active ? (activeColor || 'bg-[#003f78]') + ' text-white' : 'bg-[#f6fbff] text-[#486275]')}>
      {children}
    </button>
  )
}

function ReportBlock({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl bg-[#f8fbff] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">{title}</p><p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-[#082033]">{value || '-'}</p></div>
}
