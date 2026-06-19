'use client'

import * as React from 'react'
import { BadgeCheck, Download, Eye, FileText, Loader2, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Access = { canView: boolean; canEdit: boolean; canDelete: boolean }
type CertificationStatus = 'Active' | 'Near Expiry' | 'Expired' | 'Pending Review' | 'Missing Attachment'
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'
type CertificationRecord = {
  id: string
  assetOrOperator: string
  certificationType: string
  category: string
  subcategory: string
  area: string
  assetTag: string
  permitNumber: string
  projectLocation: string
  pic: string
  examiner: string
  standard: string
  risk: RiskLevel
  expiryDate: string
  status: CertificationStatus
  attachmentName: string
  attachmentType: string
  attachmentPreview: string
  reminder: { enabled: boolean; recipients: string[]; escalationRecipients: string[]; daysBeforeExpiry: number[]; lastSent: string; nextReminder: string }
}

const initialRecords: CertificationRecord[] = [
  { id: 'CERT-FLT-001', assetOrOperator: 'Forklift Toyota 3 Ton / Operator Suryadi', certificationType: 'SIO (Personel) + Unit Permit', category: 'Mobile Equipment', subcategory: 'Forklift Workshop', area: 'Tire Repair Bay', assetTag: 'FLT-TRB-03', permitNumber: 'SIO-FLT/TRB/2026/001', projectLocation: 'Workshop Tire Mining - Main Bay', pic: 'Workshop Supervisor Tire Repair', examiner: 'Disnaker Vendor / HSE Superintendent', standard: 'Disnaker + Internal HSE Workshop Permit', risk: 'High', expiryDate: '2026-07-15', status: 'Near Expiry', attachmentName: 'SIO Forklift Suryadi - FLT-TRB-03.pdf', attachmentType: 'PDF Certificate', attachmentPreview: 'SIO forklift operator, unit permit, inspection checklist, and competency evidence.', reminder: { enabled: true, recipients: ['Workshop Supervisor Tire Repair', 'HSE Superintendent', 'Maintenance Admin'], escalationRecipients: ['Site Manager'], daysBeforeExpiry: [90, 60, 30, 14, 7, 1], lastSent: '2026-05-16', nextReminder: '2026-06-15' } },
  { id: 'CERT-HYD-002', assetOrOperator: 'Hydrant Line & Fire Pump - Tire Service Area', certificationType: 'Inspection Certificate', category: 'Fire & Emergency', subcategory: 'Hydrant & Fire Pump', area: 'Tire Service Bay', assetTag: 'HYD-TSB-01', permitNumber: 'HSE-FIRE/TSB/2026/014', projectLocation: 'Workshop Tire Mining - Tire Service Bay', pic: 'Emergency Response Team', examiner: 'HSE Fire Inspector', standard: 'Internal HSE Fire Protection + Vendor Flow Test', risk: 'Critical', expiryDate: '2026-06-20', status: 'Near Expiry', attachmentName: 'Hydrant Flow Test Tire Service Bay.jpg', attachmentType: 'Image Evidence', attachmentPreview: 'Hydrant flow test, fire pump pressure reading, APAR readiness, and emergency response sign-off.', reminder: { enabled: true, recipients: ['HSE Superintendent', 'Emergency Response Team'], escalationRecipients: ['Site Manager'], daysBeforeExpiry: [90, 60, 30, 14, 7, 3, 1], lastSent: '2026-05-21', nextReminder: '2026-06-06' } },
  { id: 'CERT-TOR-003', assetOrOperator: 'Torque Multiplier Norbar 3/4 Inch', certificationType: 'Calibration Certificate', category: 'Hydraulic Tools', subcategory: 'Torque Tool Calibration', area: 'Tire Service Bay', assetTag: 'TORQ-TS-09', permitNumber: 'CAL-TORQ/2026/044', projectLocation: 'Workshop Tire Mining - Tool Store', pic: 'Tire Service Lead Hand', examiner: 'External Calibration Vendor', standard: 'OEM Calibration + Internal Critical Tool Register', risk: 'High', expiryDate: '2026-10-30', status: 'Active', attachmentName: 'Calibration Torque Multiplier TORQ-TS-09.pdf', attachmentType: 'PDF Certificate', attachmentPreview: 'Calibration value, tolerance result, serial number, and next due date.', reminder: { enabled: true, recipients: ['Tire Service Lead Hand', 'Maintenance Admin'], escalationRecipients: ['Workshop Supervisor Tire Service'], daysBeforeExpiry: [60, 30, 14, 7], lastSent: '-', nextReminder: '2026-08-31' } },
  { id: 'CERT-COM-004', assetOrOperator: 'Air Receiver Compressor 500L', certificationType: 'Pressure Vessel Certificate', category: 'Pressure & Pneumatic', subcategory: 'Air Receiver / Compressor', area: 'Tire Repair Bay', assetTag: 'AIR-REC-02', permitNumber: '-', projectLocation: 'Workshop Tire Mining - Compressor Room', pic: 'Workshop Supervisor Tire Repair', examiner: 'Pending Vendor Inspection', standard: 'Pressure Vessel Inspection + Internal HSE Checklist', risk: 'Critical', expiryDate: '2026-05-26', status: 'Missing Attachment', attachmentName: 'Belum ada attachment', attachmentType: 'Missing', attachmentPreview: 'Certificate belum diunggah. Wajib attach pressure test certificate sebelum operasi penuh.', reminder: { enabled: true, recipients: ['Workshop Supervisor Tire Repair', 'HSE Superintendent'], escalationRecipients: ['Site Manager'], daysBeforeExpiry: [90, 60, 30, 14, 7, 1], lastSent: '2026-05-25', nextReminder: 'Follow up overdue' } },
]

function formatDate(value: string) { return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
function daysLeft(value: string) { return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000) }
function makeEmpty(): CertificationRecord { return { id: `CERT-${Date.now()}`, assetOrOperator: '', certificationType: 'SIO', category: 'Personnel License', subcategory: '', area: '', assetTag: '', permitNumber: '', projectLocation: '', pic: '', examiner: '', standard: '', risk: 'Medium', expiryDate: new Date().toISOString().slice(0, 10), status: 'Pending Review', attachmentName: '', attachmentType: 'PDF Certificate', attachmentPreview: '', reminder: { enabled: true, recipients: [], escalationRecipients: [], daysBeforeExpiry: [90, 60, 30, 14, 7], lastSent: '-', nextReminder: '-' } } }

export function MobileSiaSioToolsClient({ access }: { access: Access }) {
  const [records, setRecords] = React.useState<CertificationRecord[]>(() => typeof window === 'undefined' ? initialRecords : JSON.parse(window.localStorage.getItem('mobile-sia-sio-records') || 'null') ?? initialRecords)
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [detail, setDetail] = React.useState<CertificationRecord | null>(null)
  const [draft, setDraft] = React.useState<CertificationRecord | null>(null)
  const [busy, setBusy] = React.useState<'pdf' | null>(null)
  const docRef = React.useRef<HTMLDivElement>(null)

  const filtered = records.filter((row) => `${row.assetOrOperator} ${row.certificationType} ${row.assetTag} ${row.area} ${row.pic}`.toLowerCase().includes(query.toLowerCase()) && (status === 'all' || row.status === status))
  const expired = records.filter((row) => daysLeft(row.expiryDate) < 0).length
  const near = records.filter((row) => daysLeft(row.expiryDate) >= 0 && daysLeft(row.expiryDate) <= 60).length

  function persist(next: CertificationRecord[]) { setRecords(next); window.localStorage.setItem('mobile-sia-sio-records', JSON.stringify(next)) }
  function saveDraft() { if (!draft) return; const exists = records.some((row) => row.id === draft.id); persist(exists ? records.map((row) => row.id === draft.id ? draft : row) : [draft, ...records]); setDraft(null); toast.success('Sertifikasi tersimpan.') }
  function remove(id: string) { if (!access.canDelete) return; if (!confirm('Hapus sertifikasi ini?')) return; persist(records.filter((row) => row.id !== id)); toast.success('Sertifikasi dihapus.') }
  async function renderCanvas() { const element = docRef.current; if (!element) return null; const clone = element.cloneNode(true) as HTMLDivElement; clone.style.position = 'fixed'; clone.style.top = '-10000px'; clone.style.left = '0'; clone.style.width = '794px'; clone.style.background = '#fff'; document.body.appendChild(clone); try { await document.fonts?.ready; const { default: html2canvas } = await import('html2canvas-pro'); return await html2canvas(clone, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 794 }) } finally { clone.remove() } }
  async function downloadPdf() { if (!detail) return; setBusy('pdf'); try { const canvas = await renderCanvas(); if (!canvas) return; const { default: jsPDF } = await import('jspdf'); const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); const width = pdf.internal.pageSize.getWidth(); const height = pdf.internal.pageSize.getHeight(); const imgHeight = canvas.height * width / canvas.width; const img = canvas.toDataURL('image/png'); let left = imgHeight; let pos = 0; pdf.addImage(img, 'PNG', 0, pos, width, imgHeight); left -= height; while (left > 0) { pos -= height; pdf.addPage(); pdf.addImage(img, 'PNG', 0, pos, width, imgHeight); left -= height } pdf.save(`${detail.id}.pdf`) } finally { setBusy(null) } }


  return <div className="space-y-5 pb-6"><section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-4 text-white border border-gray-100"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100">HSE Mobile</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">SIA/SIO Tools</h1><p className="mt-2 text-sm font-semibold leading-6 text-blue-50">Kelola sertifikasi operator, equipment, reminder expiry, attachment, dan PDF.</p></div><span className="flex size-11 items-center justify-center rounded-xl bg-white/12"><BadgeCheck className="size-5" /></span></div><div className="mt-4 grid grid-cols-3 gap-2"><Stat label="Total" value={records.length} /><Stat label="Near" value={near} /><Stat label="Expired" value={expired} /></div></section>
    <section className="space-y-3 rounded-xl bg-white p-4 border border-gray-100"><div className="relative"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-500" /><Input className="h-12 rounded-xl border-0 bg-[#f6fbff] pl-11" placeholder="Cari operator / asset / tag..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="flex gap-2 overflow-x-auto pb-1">{['all', 'Active', 'Near Expiry', 'Expired', 'Pending Review', 'Missing Attachment'].map((item) => <button key={item} onClick={() => setStatus(item)} className={cn('h-9 shrink-0 rounded-md px-4 text-xs font-semibold uppercase', status === item ? 'bg-blue-600 text-white' : 'bg-[#f6fbff] text-gray-500')}>{item}</button>)}</div>{access.canEdit ? <Button className="h-12 w-full rounded-xl bg-blue-600 text-white" onClick={() => setDraft(makeEmpty())}><Plus className="size-4" />Tambah Sertifikasi</Button> : null}</section>
    {draft ? <section className="space-y-3 rounded-xl bg-white p-4 border border-gray-100"><div className="flex justify-between"><h2 className="text-lg font-semibold text-gray-900">Form Sertifikasi</h2><button className="text-xs font-semibold text-gray-500" onClick={() => setDraft(null)}>Tutup</button></div><Field label="Asset / Operator" value={draft.assetOrOperator} onChange={(v) => setDraft({ ...draft, assetOrOperator: v })} /><div className="grid grid-cols-2 gap-2"><Field label="Tipe" value={draft.certificationType} onChange={(v) => setDraft({ ...draft, certificationType: v })} /><Field label="Category" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} /></div><div className="grid grid-cols-2 gap-2"><Field label="Asset Tag" value={draft.assetTag} onChange={(v) => setDraft({ ...draft, assetTag: v })} /><Field label="Permit No" value={draft.permitNumber} onChange={(v) => setDraft({ ...draft, permitNumber: v })} /></div><div className="grid grid-cols-2 gap-2"><Field label="Area" value={draft.area} onChange={(v) => setDraft({ ...draft, area: v })} /><Field label="Expiry" type="date" value={draft.expiryDate} onChange={(v) => setDraft({ ...draft, expiryDate: v })} /></div><Field label="PIC" value={draft.pic} onChange={(v) => setDraft({ ...draft, pic: v })} /><Field label="Examiner" value={draft.examiner} onChange={(v) => setDraft({ ...draft, examiner: v })} /><Textarea className="rounded-xl border border-gray-200 bg-white" placeholder="Standard / regulasi" value={draft.standard} onChange={(e) => setDraft({ ...draft, standard: e.target.value })} /><Textarea className="rounded-xl border border-gray-200 bg-white" placeholder="Attachment preview" value={draft.attachmentPreview} onChange={(e) => setDraft({ ...draft, attachmentPreview: e.target.value })} /><Button className="h-12 w-full rounded-xl bg-blue-600 text-white" onClick={saveDraft}>Simpan</Button></section> : null}
    {detail ? <section className="space-y-3 rounded-xl bg-white p-4 border border-gray-100">
      <div className="flex justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">{detail.assetOrOperator}</h2>
        <button className="text-xs font-semibold text-gray-500" onClick={() => setDetail(null)}>Tutup</button>
      </div>
      <Button variant="outline" className="w-full h-12 rounded-xl" disabled={Boolean(busy)} onClick={() => void downloadPdf()}>
        {busy === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download PDF
      </Button>
      <div ref={docRef} className="bg-white rounded-2xl border border-slate-200 p-8 relative overflow-hidden" style={{ width: '794px' }}>
        <div className="absolute top-12 right-12 opacity-10 pointer-events-none"><ShieldCheck className="w-48 h-48" /></div>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 py-6 border-b border-slate-100">
          <div><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">Document ID</p><p className="font-bold text-slate-900 text-[11px]">{detail.id}</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">Classification</p><p className="font-bold text-slate-900 text-[11px]">{detail.category}</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">Location / Site</p><p className="font-bold text-slate-900 text-[11px]">{detail.area}</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">Date / Period</p><p className="font-bold text-slate-900 text-[11px]">{formatDate(detail.expiryDate)}</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">PIC / Auditor</p><p className="font-bold text-slate-900 text-[11px]">{detail.examiner}</p></div>
          <div><p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</p><span className="inline-block rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 uppercase">{detail.status}</span></div>
        </div>
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6 py-8">
          <div className="max-w-3xl">
            <p className="text-blue-600 font-bold text-sm tracking-widest uppercase mb-2">Workshop Tire Certification Control</p>
            <h2 className="text-3xl font-black text-slate-900 leading-tight uppercase mb-4">{detail.assetOrOperator}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="inline-block rounded-md bg-slate-900 text-white px-2 py-0.5 text-xs font-bold">ID: {detail.id}</span>
              <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">{detail.certificationType}</span>
              <span className="inline-block rounded-md border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-bold">{detail.projectLocation}</span>
            </div>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Risk & Expiry</p>
            <div className={cn("rounded-xl border-2 px-6 py-4 text-center shadow-sm", detail.risk === "Critical" ? "border-red-200 bg-red-50 text-red-700" : detail.risk === "High" ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "border-green-200 bg-green-50 text-green-700")}>
              <p className="text-2xl font-black leading-none">{detail.risk}</p>
              <p className="mt-1 text-xs font-bold opacity-80">RISK</p>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-[1fr_0.42fr] gap-4">
          <div className="rounded-2xl bg-slate-50 p-5">
            <h5 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 mb-4"><ShieldCheck className="size-4" /> Identitas & Validitas Sertifikasi</h5>
            <div className="grid md:grid-cols-2 gap-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              <div>Tipe Sertifikat<br /><span className="text-slate-900 normal-case font-semibold">{detail.certificationType}</span></div>
              <div>Kategori / Klasifikasi<br /><span className="text-slate-900 normal-case font-semibold">{detail.subcategory}</span></div>
              <div>Nomor Seri / Izin<br /><span className="text-blue-700 normal-case font-semibold">{detail.permitNumber}</span></div>
              <div>Proyek / Penempatan<br /><span className="text-slate-900 normal-case font-semibold">{detail.projectLocation}</span></div>
              <div>PIC / Owner<br /><span className="text-slate-900 normal-case font-semibold">{detail.pic}</span></div>
              <div>Standard<br /><span className="text-slate-900 normal-case font-semibold">{detail.standard}</span></div>
            </div>
          </div>
          <div>
            <div className="rounded-2xl bg-[#1a2332] p-5 text-white">
              <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4"><FileText className="size-4" /> Attachment</h5>
              <p className="text-sm font-semibold">{detail.attachmentName}</p>
              <p className="text-xs text-slate-400 mt-1">{detail.attachmentType}</p>
              {detail.attachmentPreview && <p className="text-xs text-slate-400 mt-3 italic">"{detail.attachmentPreview}"</p>}
            </div>
            <div className="rounded-2xl bg-slate-50 p-5 mt-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Reminder Schedule</h5>
              <div className="text-xs text-slate-600"><span className="font-semibold">Pengirim:</span> {detail.reminder.recipients.join(', ')}</div>
              <div className="text-xs text-slate-600 mt-1"><span className="font-semibold">H-</span>{detail.reminder.daysBeforeExpiry.join(', ')} hari</div>
              <div className="text-xs text-slate-600 mt-1"><span className="font-semibold">Next:</span> {detail.reminder.nextReminder}</div>
            </div>
          </div>
        </div>
      </div>
    </section> : null}
    <section className="grid gap-3">{filtered.map((row) => <article key={row.id} className="rounded-xl bg-white p-4 border border-gray-100"><div className="flex justify-between gap-3"><h2 className="text-sm font-semibold text-gray-900">{row.assetOrOperator}</h2><span className="rounded-md bg-[#f6fbff] px-2.5 py-1 text-[10px] font-semibold uppercase text-gray-500">{row.status}</span></div><p className="mt-1 text-xs font-semibold text-gray-500">{row.certificationType} • {row.assetTag}</p><p className="mt-2 text-xs font-semibold text-[#8c5818]">Expiry {formatDate(row.expiryDate)} • {daysLeft(row.expiryDate)} hari</p><div className="mt-3 grid grid-cols-3 gap-2"><Button variant="outline" className="h-10 rounded-xl" onClick={() => setDetail(row)}><Eye className="size-4" /></Button>{access.canEdit ? <Button variant="outline" className="h-10 rounded-xl" onClick={() => setDraft(row)}><Pencil className="size-4" /></Button> : null}{access.canDelete ? <Button variant="outline" className="h-10 rounded-xl text-[#8a3d00]" onClick={() => remove(row.id)}><Trash2 className="size-4" /></Button> : null}</div></article>)}</section>
  </div>
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-[1rem] bg-white/10 px-3 py-3"><p className="text-2xl font-semibold">{value}</p><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100">{label}</p></div> }
function Field({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) { return <Label className="block space-y-2"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</span><Input type={type} className="h-12 rounded-xl border border-gray-200 bg-white" value={value} onChange={(e) => onChange(e.target.value)} /></Label> }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase text-gray-500">{label}</p><p className="mt-1 text-gray-900">{value || '-'}</p></div> }
function InfoBlock({ title, value }: { title: string; value: string }) { return <div className="rounded-xl bg-[#f8fbff] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</p><p className="mt-1 whitespace-pre-wrap text-xs font-semibold leading-5 text-gray-900">{value || '-'}</p></div> }
