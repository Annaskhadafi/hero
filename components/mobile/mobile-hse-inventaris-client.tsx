'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, CheckCircle, CheckCircle2, Eye, FileSpreadsheet, HardHat, Loader2, Pencil, Plus, Search, Trash2, Upload, Wrench, X } from 'lucide-react'
import { toast } from 'sonner'
import { createHseInventory, deleteHseInventory, getHseUserEmails, updateHseInventory, updateHseInventoryStatus } from '@/app/actions/hse-inventaris'
import { uploadFile } from '@/app/actions/upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type HseInventory = { id: number; documentId: string; name: string; category: string; qty: number; location: string; condition: string; notes: string; picName: string; photoUrl: string; verifiedStatus: string; verifiedAt: Date | string; purchaseDate: Date | string | null; validityMonths: number | null; expirationDate: Date | string | null; reminderDaysBefore: number; reminderEmailRecipients: string; lastReminderSentAt: Date | string | null; createdAt: Date | string; updatedAt: Date | string }
type Access = { canView: boolean; canEdit: boolean; canDelete: boolean; canSelectAll?: boolean }

const CATEGORIES = ['Alat Pelindung Diri (APD)', 'Alat Ukur & Deteksi', 'Perlengkapkan Medis', 'Peralatan Pemadam Kebakaran', 'Perlengkapan Keselamatan']
const CONDITIONS = ['Baik', 'Perlu Perbaikan', 'Rusak']

function fd(v: Date | string | null) { if (!v) return '-'; return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }

function CardShell({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof HardHat; children: React.ReactNode }) {
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

// Separate component for condition badge with its own local state
function CondBadge({ item, access, onStatusChange }: { item: HseInventory; access: Access; onStatusChange: (id: number, c: string) => void }) {
  const [open, setOpen] = React.useState(false)
  let s = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  let ico = <CheckCircle className="mr-1 size-3 text-emerald-600" />
  if (item.condition === 'Perlu Perbaikan') { s = 'bg-amber-50 text-amber-700 border-amber-200'; ico = <Wrench className="mr-1 size-3 text-amber-600" /> }
  else if (item.condition === 'Rusak') { s = 'bg-rose-50 text-rose-700 border-rose-200'; ico = <AlertTriangle className="mr-1 size-3 text-rose-600" /> }
  const badge = <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold', s)}>{ico}{item.condition}</span>
  if (!access.canEdit) return badge
  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(!open)} className="focus:outline-none">{badge}</button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-[#d8e4ee] bg-white p-1.5 shadow-xl">
          {CONDITIONS.map((c) => (
            <button key={c} type="button" disabled={item.condition === c} onClick={() => { setOpen(false); onStatusChange(item.id, c) }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#082033] hover:bg-[#e9f6fd] disabled:opacity-30">{c === item.condition && <CheckCircle2 className="size-3 text-emerald-600" />}{c}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const m: Record<string,string> = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }
  return <div className="rounded-[1.15rem] bg-white p-3.5 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">{label}</p><span className={cn('flex size-8 items-center justify-center rounded-xl', m[color] || m.blue)}><Icon className="size-4" /></span></div><p className="mt-1.5 text-2xl font-black text-[#082033]">{value}</p></div>
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn('h-9 shrink-0 rounded-full px-4 text-xs font-black uppercase whitespace-nowrap', active ? 'bg-[#003f78] text-white' : 'bg-[#f6fbff] text-[#486275]')}>{children}</button>
}

function ReportBlock({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl bg-[#f8fbff] p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">{title}</p><p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-[#082033]">{value || '-'}</p></div>
}

export function MobileHseInventarisClient({ data, access, userEmails: initialEmails }: { data: HseInventory[]; access: Access; userEmails: { id: number; name: string; email: string }[] }) {
  const router = useRouter()
  const [inventories, setInventories] = React.useState<HseInventory[]>(data)
  const now = React.useMemo(() => new Date(), [])

  const stats = React.useMemo(() => {
    let t = 0, b = 0, p = 0, r = 0, e = 0, w = 0
    inventories.forEach((i) => {
      t += i.qty
      if (i.condition === 'Baik') b++; else if (i.condition === 'Perlu Perbaikan') p++; else if (i.condition === 'Rusak') r++
      if (i.expirationDate) { const et = new Date(i.expirationDate).getTime(); if (now.getTime() > et) e++; else { const wm = (i.reminderDaysBefore || 30) * 86400000; if (now.getTime() >= et - wm) w++ } }
    })
    return { totalItems: inventories.length, totalQty: t, baikCount: b, perbaikanCount: p, rusakCount: r, expiredCount: e, warningCount: w }
  }, [inventories, now])

  const [query, setQuery] = React.useState('')
  const [catFilter, setCatFilter] = React.useState('all')
  const [condFilter, setCondFilter] = React.useState('all')
  const catOpts = React.useMemo(() => Array.from(new Set(inventories.map((r) => r.category))).sort(), [inventories])
  const filtered = React.useMemo(() => inventories.filter((i) => {
    const match = `${i.name} ${i.documentId} ${i.category} ${i.location} ${i.picName}`.toLowerCase().includes(query.toLowerCase())
    return match && (catFilter === 'all' || i.category === catFilter) && (condFilter === 'all' || i.condition === condFilter)
  }), [inventories, query, catFilter, condFilter])

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<HseInventory | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [fn, setFn] = React.useState(''); const [fcat, setFcat] = React.useState(CATEGORIES[0])
  const [fq, setFq] = React.useState(1); const [floc, setFloc] = React.useState(''); const [fcond, setFcond] = React.useState('Baik')
  const [fnotes, setFnotes] = React.useState(''); const [fpic, setFpic] = React.useState(''); const [fphoto, setFphoto] = React.useState('')
  const [fpdate, setFpdate] = React.useState(''); const [fvmonths, setFvmonths] = React.useState(12)
  const [frdays, setFrdays] = React.useState(30); const [fremails, setFremails] = React.useState('')

  const [detailOpen, setDetailOpen] = React.useState(false)
  const [detailItem, setDetailItem] = React.useState<HseInventory | null>(null)

  const [emails, setEmails] = React.useState(initialEmails)
  const [sq, setSq] = React.useState(''); const [epOpen, setEpOpen] = React.useState(false)

  const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  const selEmails = React.useMemo(() => fremails.split(',').map((e) => e.trim()).filter(Boolean), [fremails])
  const filtEmails = React.useMemo(() => { const q = sq.trim().toLowerCase(); return q ? emails.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : emails }, [emails, sq])
  const addCustom = React.useMemo(() => { const q = sq.trim(); return validEmail(q) && !selEmails.includes(q) }, [sq, selEmails])

  React.useEffect(() => { setInventories(data) }, [data])
  React.useEffect(() => { if (initialEmails.length > 0) setEmails(initialEmails); else if (formOpen) getHseUserEmails().then((r) => { if (r.success && r.data) setEmails(r.data) }) }, [initialEmails, formOpen])

  const toggleEmail = (email: string) => { const cur = fremails.split(',').map((e) => e.trim()).filter(Boolean); setFremails(cur.includes(email) ? cur.filter((e) => e !== email).join(', ') : [...cur, email].join(', ')) }

  const autoExp = React.useMemo(() => { if (!fpdate || !fvmonths) return '-'; const d = new Date(fpdate); if (isNaN(d.getTime())) return '-'; d.setMonth(d.getMonth() + Number(fvmonths)); return d.toLocaleDateString('id-ID', { dateStyle: 'long' }) }, [fpdate, fvmonths])

  const openCreate = React.useCallback(() => { setEditing(null); setFn(''); setFcat(CATEGORIES[0]); setFq(1); setFloc(''); setFcond('Baik'); setFnotes(''); setFpic(''); setFphoto(''); setFpdate(new Date().toISOString().split('T')[0]); setFvmonths(12); setFrdays(30); setFremails(''); setFormOpen(true) }, [])

  const openEdit = React.useCallback((item: HseInventory) => { setEditing(item); setFn(item.name); setFcat(item.category); setFq(item.qty); setFloc(item.location); setFcond(item.condition); setFnotes(item.notes); setFpic(item.picName); setFphoto(item.photoUrl); setFpdate(item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : ''); setFvmonths(item.validityMonths ?? 12); setFrdays(item.reminderDaysBefore ?? 30); setFremails(item.reminderEmailRecipients ?? ''); setFormOpen(true) }, [])

  const openDetail = React.useCallback((item: HseInventory) => { setDetailItem(item); setDetailOpen(true) }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setUploading(true); const fd = new FormData(); fd.append('file', file); fd.append('uploadTarget', 'safety'); try { const r = await uploadFile(fd); if (r.success && r.url) { setFphoto(r.readableUrl || r.url); toast.success('Foto unggah berhasil') } else toast.error(r.error || 'Gagal unggah foto') } catch { toast.error('Gagal unggah foto') } finally { setUploading(false) } }

  const handleSave = async () => { if (!fn || !fcat || !floc) return toast.error('Nama, kategori, dan lokasi wajib diisi'); setSaving(true); const payload = { name: fn, category: fcat, qty: Number(fq) || 1, location: floc, condition: fcond, notes: fnotes, picName: fpic || 'System', photoUrl: fphoto, purchaseDate: fpdate || undefined, validityMonths: Number(fvmonths) || undefined, reminderDaysBefore: Number(frdays) || undefined, reminderEmailRecipients: fremails }; try { const r = editing ? await updateHseInventory(editing.id, payload) : await createHseInventory(payload); if (r.success) { toast.success(editing ? 'Aset diperbarui' : 'Aset ditambahkan'); setFormOpen(false); router.refresh() } else toast.error(r.error || 'Gagal simpan') } catch { toast.error('Gagal simpan') } finally { setSaving(false) } }

  const handleDelete = async (id: number) => { if (!confirm('Hapus aset ini dari inventaris?')) return; try { const r = await deleteHseInventory(id); if (r.success) { toast.success('Aset dihapus'); router.refresh() } else toast.error(r.error || 'Gagal hapus') } catch { toast.error('Gagal hapus') } }

  const handleStatusChange = async (id: number, condition: string) => { if (!access.canEdit) return; try { const r = await updateHseInventoryStatus(id, condition); if (r.success) { toast.success('Kondisi jadi ' + condition); router.refresh() } else toast.error(r.error || 'Gagal update') } catch { toast.error('Gagal update') } }

  return (
    <CardShell title="Inventaris HSE" subtitle="Kelola aset keselamatan, pantau masa berlaku, dan kirim reminder expired." icon={HardHat}>
      <section className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total Aset" value={String(stats.totalItems)} icon={FileSpreadsheet} color="blue" />
        <StatCard label="Kondisi Baik" value={String(stats.baikCount)} icon={CheckCircle} color="emerald" />
        <StatCard label="Akan Expired" value={String(stats.warningCount)} icon={AlertCircle} color="amber" />
        <StatCard label="Expired / Rusak" value={String(stats.expiredCount + stats.rusakCount)} icon={AlertTriangle} color="rose" />
      </section>

      <section className="space-y-3 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#486275] pointer-events-none" />
          <Input className="h-12 rounded-2xl border-0 bg-[#f6fbff] pl-11" placeholder="Cari aset..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={catFilter === 'all'} onClick={() => setCatFilter('all')}>Semua</FilterChip>
          {catOpts.map((c) => <FilterChip key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>{c}</FilterChip>)}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', ...CONDITIONS].map((c) => <FilterChip key={c} active={condFilter === c} onClick={() => setCondFilter(c)}>{c === 'all' ? 'Semua Kondisi' : c}</FilterChip>)}
        </div>
        {access.canEdit && <Button type="button" className="h-12 w-full rounded-2xl bg-[#003f78] text-white" onClick={openCreate}><Plus className="mr-2 size-4" />Tambah Aset</Button>}
      </section>

      {filtered.length === 0 ? (
        <section className="rounded-[1.25rem] bg-white p-8 text-center shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
          <HardHat className="mx-auto size-10 text-[#486275]/40" />
          <p className="mt-3 text-sm font-bold text-[#486275]">Tidak ada aset ditemukan</p>
        </section>
      ) : (
        <section className="grid gap-3">
          {filtered.map((item) => {
            const et = item.expirationDate ? new Date(item.expirationDate).getTime() : null
            const isExpired = et && now.getTime() > et
            const isDue = et && !isExpired && (item.reminderDaysBefore || 30) * 86400000 >= (et - now.getTime())
            return (
              <article key={item.id} className="rounded-[1.15rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-black text-[#082033]">{item.name}</h2>
                      {isExpired && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-black text-red-800">EXPIRED</span>}
                      {isDue && <span className="shrink-0 animate-pulse rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">DUE SOON</span>}
                    </div>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#486275]">{item.documentId}</p>
                  </div>
                  <CondBadge item={item} access={access} onStatusChange={handleStatusChange} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-[#486275]">
                  <span>Kategori: <span className="text-[#082033]">{item.category}</span></span>
                  <span>Qty: <span className="text-[#082033]">{item.qty}</span></span>
                  <span>Lokasi: <span className="text-[#082033]">{item.location}</span></span>
                  <span>Exp: <span className="text-[#082033]">{fd(item.expirationDate)}</span></span>
                  {item.validityMonths && <span>Masa: <span className="text-[#082033]">{item.validityMonths} bln</span></span>}
                  <span>PIC: <span className="text-[#082033]">{item.picName || '-'}</span></span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button variant="outline" type="button" className="h-9 rounded-2xl text-[10px] font-black" onClick={() => openDetail(item)}><Eye className="mr-1 size-3" />Detail</Button>
                  {access.canEdit && <Button variant="outline" type="button" className="h-9 rounded-2xl text-[10px] font-black" onClick={() => openEdit(item)}><Pencil className="mr-1 size-3" />Edit</Button>}
                  {access.canDelete && <Button variant="outline" type="button" className="h-9 rounded-2xl text-[10px] font-black text-[#8a3d00]" onClick={() => handleDelete(item.id)}><Trash2 className="mr-1 size-3" />Hapus</Button>}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {formOpen && (
        <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">{editing ? 'Edit' : 'Tambah'} Aset</p>
              <h2 className="mt-1 text-lg font-black text-[#082033]">{editing ? editing.name : 'Inventaris Baru'}</h2>
            </div>
            <button type="button" className="text-xs font-black text-[#486275]" onClick={() => setFormOpen(false)}>Tutup</button>
          </div>
          <div className="space-y-3">
            <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Nama Barang</span><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Helm Safety" value={fn} onChange={(e) => setFn(e.target.value)} /></Label>
            <div className="grid grid-cols-2 gap-2">
              <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Kategori</span>
                <select value={fcat} onChange={(e) => setFcat(e.target.value)} className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033] outline-none">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </Label>
              <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Qty</span><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" type="number" min={1} value={fq} onChange={(e) => setFq(Number(e.target.value))} /></Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Kondisi</span>
                <select value={fcond} onChange={(e) => setFcond(e.target.value)} className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033] outline-none">{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </Label>
              <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Lokasi</span><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Gudang - Rak A2" value={floc} onChange={(e) => setFloc(e.target.value)} /></Label>
            </div>
            <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">PIC</span><Input className="h-12 rounded-2xl border-0 bg-[#e9f6fd]" placeholder="Nama petugas" value={fpic} onChange={(e) => setFpic(e.target.value)} /></Label>

            <div className="rounded-xl bg-[#f8fbff] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Masa Berlaku & Reminder</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Label className="space-y-1"><span className="text-[9px] font-bold text-[#486275]">Tgl Beli</span><Input className="h-11 rounded-2xl border-0 bg-white" type="date" value={fpdate} onChange={(e) => setFpdate(e.target.value)} /></Label>
                <Label className="space-y-1"><span className="text-[9px] font-bold text-[#486275]">Masa (Bulan)</span><Input className="h-11 rounded-2xl border-0 bg-white" type="number" min={1} value={fvmonths} onChange={(e) => setFvmonths(Number(e.target.value))} /></Label>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-white p-2.5 text-xs"><span className="font-bold text-[#486275]">Expired:</span><span className="font-black text-rose-600">{autoExp}</span></div>
              <div className="mt-2"><Label className="space-y-1"><span className="text-[9px] font-bold text-[#486275]">Reminder (hari)</span><Input className="h-11 rounded-2xl border-0 bg-white" type="number" min={1} value={frdays} onChange={(e) => setFrdays(Number(e.target.value))} /></Label></div>
              <div className="mt-2 space-y-1">
                <span className="text-[9px] font-bold text-[#486275]">Email Penerima Reminder</span>
                <div className="relative">
                  <button type="button" onClick={() => setEpOpen(!epOpen)} className="flex h-11 w-full items-center justify-between rounded-2xl border-0 bg-white px-4 text-xs font-semibold text-[#486275]">{selEmails.length > 0 ? selEmails.length + ' penerima' : 'Pilih penerima...'}</button>
                  {epOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-xl border border-[#d8e4ee] bg-white p-2 shadow-xl" onMouseLeave={() => setEpOpen(false)}>
                      <Input className="mb-2 h-9 rounded-xl border-0 bg-[#f6fbff] text-xs" placeholder="Cari email..." value={sq} onChange={(e) => setSq(e.target.value)} />
                      <div className="max-h-40 space-y-0.5 overflow-y-auto">
                        {filtEmails.length === 0 && !addCustom && <p className="p-3 text-center text-xs text-[#486275]">Tidak ada</p>}
                        {filtEmails.map((u) => { const sel = selEmails.includes(u.email); return <button key={u.id} type="button" onClick={() => toggleEmail(u.email)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-[#e9f6fd]"><span className={cn('grid size-4 place-items-center rounded border', sel ? 'border-[#003f78] bg-[#003f78] text-white' : 'border-[#d8e4ee]')}>{sel && <CheckCircle2 className="size-3" />}</span><span className="font-bold text-[#082033]">{u.name}</span><span className="text-[#486275]">{u.email}</span></button> })}
                        {addCustom && <button type="button" onClick={() => { toggleEmail(sq.trim()); setSq('') }} className="flex w-full items-center gap-2 rounded-lg bg-[#003f78]/5 px-2.5 py-2 text-left text-xs font-bold text-[#003f78]"><Plus className="size-3" />Tambah &quot;{sq.trim()}&quot;</button>}
                      </div>
                    </div>
                  )}
                </div>
                {selEmails.length > 0 && (
                  <div className="mt-1 flex max-h-20 flex-wrap gap-1 overflow-y-auto rounded-lg border border-[#d8e4ee] bg-white p-2">
                    {selEmails.map((email) => { const mu = emails.find((u) => u.email === email); return <span key={email} className="inline-flex items-center gap-1 rounded-md bg-[#f6fbff] px-2 py-0.5 text-[9px] font-bold text-[#082033]">{mu ? mu.name : email}<button type="button" onClick={() => toggleEmail(email)} className="text-[#486275] hover:text-rose-600"><X className="size-2.5" /></button></span> })}
                  </div>
                )}
              </div>
            </div>

            <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Catatan</span><Textarea className="rounded-2xl border-0 bg-[#e9f6fd]" rows={2} placeholder="Catatan..." value={fnotes} onChange={(e) => setFnotes(e.target.value)} /></Label>
            <Label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Foto Barang</span>
              <div className="flex items-center gap-3">
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-xs font-bold text-[#486275]">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{fphoto ? 'Ganti' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
                {fphoto && <div className="size-11 overflow-hidden rounded-xl border bg-white"><img src={fphoto} alt="" className="size-full object-cover" /></div>}
              </div>
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" type="button" className="h-12 rounded-2xl" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button type="button" className="h-12 rounded-2xl bg-[#003f78] text-white" disabled={saving || uploading} onClick={handleSave}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}{editing ? 'Perbarui' : 'Simpan'}</Button>
          </div>
        </section>
      )}

      {detailOpen && detailItem && (
        <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#486275]">Detail Aset</p><h2 className="mt-1 text-lg font-black text-[#082033]">{detailItem.name}</h2></div>
            <button type="button" className="text-xs font-black text-[#486275]" onClick={() => setDetailOpen(false)}>Tutup</button>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[#f8fbff] p-2 text-xs"><FileSpreadsheet className="size-4 text-[#003f78]" /><span className="font-bold text-[#082033]">{detailItem.documentId}</span><span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800">Verified</span></div>
          <div className="rounded-xl bg-[#f8fbff] p-3">
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-[#486275]">
              <div><p className="text-[9px] font-black uppercase">Kategori</p><p className="mt-0.5 text-[#082033]">{detailItem.category}</p></div>
              <div><p className="text-[9px] font-black uppercase">Qty</p><p className="mt-0.5 text-[#082033]">{detailItem.qty}</p></div>
              <div><p className="text-[9px] font-black uppercase">Lokasi</p><p className="mt-0.5 text-[#082033]">{detailItem.location}</p></div>
              <div><p className="text-[9px] font-black uppercase">Kondisi</p><p className="mt-0.5 font-black">{detailItem.condition}</p></div>
              <div><p className="text-[9px] font-black uppercase">PIC</p><p className="mt-0.5 text-[#082033]">{detailItem.picName || '-'}</p></div>
              <div><p className="text-[9px] font-black uppercase">Masa</p><p className="mt-0.5 text-[#082033]">{detailItem.validityMonths ? detailItem.validityMonths + ' bln' : '-'}</p></div>
              <div><p className="text-[9px] font-black uppercase">Tgl Beli</p><p className="mt-0.5 text-[#082033]">{fd(detailItem.purchaseDate)}</p></div>
              <div><p className="text-[9px] font-black uppercase">Expired</p><p className="mt-0.5 font-black">{fd(detailItem.expirationDate)}</p></div>
            </div>
          </div>
          {detailItem.notes && <ReportBlock title="Catatan" value={detailItem.notes} />}
          {detailItem.reminderEmailRecipients && <div className="rounded-xl bg-[#f8fbff] p-3"><p className="text-[9px] font-black uppercase text-[#486275]">Penerima Email</p><div className="mt-1 flex flex-wrap gap-1">{detailItem.reminderEmailRecipients.split(',').map((e) => <span key={e} className="rounded-md bg-white px-2 py-0.5 text-[9px] font-bold text-[#082033] shadow-sm">{e.trim()}</span>)}</div></div>}
          {detailItem.photoUrl && <div><p className="text-[9px] font-black uppercase text-[#486275]">Foto</p><a href={detailItem.photoUrl} target="_blank" rel="noreferrer"><img src={detailItem.photoUrl} alt={detailItem.name} className="mt-1 w-full max-h-64 rounded-xl border object-contain bg-white" /></a></div>}
          <div className="grid grid-cols-2 gap-2">{access.canEdit && <Button variant="outline" type="button" className="h-11 rounded-2xl" onClick={() => { setDetailOpen(false); openEdit(detailItem) }}><Pencil className="mr-2 size-4" />Edit</Button>}</div>
        </section>
      )}
    </CardShell>
  )
}
