'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Layers,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  User,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  resubmitDailyActivityApprovalFormAction,
} from '@/app/dashboard/activity-hub/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type SessionItem = {
  id: number
  label: string
  group: string
  libraryActivityId?: number | null
  routeItemId?: number | null
  unitNumber: string
  remark: string
  materialUsed?: string
  duration: string
  points: number
  photoUrl: string | null
  startedAt?: Date | string | null
  endedAt?: Date | string | null
}

export type StepApproval = {
  id: number
  stepOrder: number
  stepLabel: string
  approverEmployeeId: number | null
  approverName: string | null
  approverEmail: string | null
  approverRole: string | null
  status: string
  signatureDataUrl: string | null
  remarks: string | null
  signedAt: Date | string | null
}

export type ApprovalData = {
  sessionId: number
  sessionCode: string
  workDate: Date | string
  shiftCode: string | null
  status: string
  submissionSource?: string | null
  summaryRemark?: string | null
  submittedAt: Date | string | null
  approvedAt: Date | string | null
  employee: {
    id: number
    name: string
    sn: string | null
    department: string | null
    section: string | null
    jobTitle: string | null
  }
  site: {
    id: number | null
    name: string | null
    customerName: string | null
  }
  totals: {
    itemCount: number
    totalPoints: number
  }
  sessionItems: SessionItem[]
  approvals: StepApproval[]
  permissions: {
    canApprove: boolean
    isCurrentEmployee: boolean
    currentEmployeeId: number
    currentEmployeeEmail: string
    currentEmployeeName: string
    accessRole: string
  }
}

function formatDate(val: Date | string | null | undefined) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dateInputValue(val: Date | string | null | undefined) {
  if (!val) {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }
  const d = new Date(val)
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function formatTimeValue(val: Date | string | null | undefined, fallback = '08:00') {
  if (!val) return fallback
  const d = typeof val === 'string' && val.includes('T') ? new Date(val) : new Date(val)
  if (isNaN(d.getTime())) {
    if (typeof val === 'string' && val.match(/^\d{2}:\d{2}$/)) return val
    return fallback
  }
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
}

type EditableItem = {
  id?: number
  label: string
  group: string
  libraryActivityId?: number | null
  unitNumber: string
  startTime: string
  endTime: string
  points: number
  remark: string
  materialUsed: string
  photoUrl: string | null
}

type MobileDailyActivityApprovalClientProps = {
  data: ApprovalData
  employeeData?: any
  hierarchy?: any
  teamMembers?: any[]
  allEmployees?: any[]
  defaultStartTime?: string
  defaultEndTime?: string
}

export function MobileDailyActivityApprovalClient({
  data,
  employeeData,
  hierarchy,
}: MobileDailyActivityApprovalClientProps) {
  const router = useRouter()
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const revertedStep = data.approvals.find(
    (a) => (a.status || '').toLowerCase() === 'reverted' || (a.status || '').toLowerCase() === 'needs_revision'
  )
  const isReverted = (data.status || '').toLowerCase().includes('revert') || Boolean(revertedStep)

  // Form states prefilled with existing document data
  const [workDate, setWorkDate] = useState(dateInputValue(data.workDate))
  const [shiftCode, setShiftCode] = useState(data.shiftCode || 'ALL')
  const [summaryNotes, setSummaryNotes] = useState(data.summaryRemark || '')

  const initialEditableItems: EditableItem[] = (data.sessionItems && data.sessionItems.length > 0)
    ? data.sessionItems.map((item) => ({
        id: item.id,
        label: item.label,
        group: item.group || 'Technical',
        libraryActivityId: item.libraryActivityId || null,
        unitNumber: item.unitNumber || '',
        startTime: formatTimeValue(item.startedAt, '08:00'),
        endTime: formatTimeValue(item.endedAt, '17:00'),
        points: item.points || 5,
        remark: item.remark || '',
        materialUsed: item.materialUsed || '',
        photoUrl: item.photoUrl || null,
      }))
    : [
        {
          label: 'Aktivitas Operasional',
          group: 'Technical',
          unitNumber: '',
          startTime: '08:00',
          endTime: '17:00',
          points: 5,
          remark: '',
          materialUsed: '',
          photoUrl: null,
        },
      ]

  const [items, setItems] = useState<EditableItem[]>(initialEditableItems)

  const availableLibrary = employeeData?.availableLibrary || []
  const filteredLibrary = availableLibrary.filter((lib: any) =>
    (lib.activityName || '').toLowerCase().includes(librarySearch.toLowerCase()) ||
    (lib.activityCode || '').toLowerCase().includes(librarySearch.toLowerCase())
  )

  function handleAddItemFromLibrary(lib: any) {
    const newItem: EditableItem = {
      label: lib.activityName,
      group: lib.activityCode || 'Technical',
      libraryActivityId: lib.id,
      unitNumber: '',
      startTime: '08:00',
      endTime: '17:00',
      points: lib.basePoints || 5,
      remark: '',
      materialUsed: '',
      photoUrl: null,
    }
    setItems((prev) => [...prev, newItem])
    setIsLibraryDialogOpen(false)
    setLibrarySearch('')
    toast.success(`Aktivitas "${lib.activityName}" ditambahkan ke form revisi.`)
  }

  function handleAddCustomItem() {
    const newItem: EditableItem = {
      label: '',
      group: 'Custom',
      unitNumber: '',
      startTime: '08:00',
      endTime: '17:00',
      points: 5,
      remark: '',
      materialUsed: '',
      photoUrl: null,
    }
    setItems((prev) => [...prev, newItem])
  }

  function handleUpdateItem(index: number, field: keyof EditableItem, value: any) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) {
      toast.error('Minimal harus ada 1 aktivitas dalam dokumen.')
      return
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  async function handleResubmitRevision(e: React.FormEvent) {
    e.preventDefault()

    const validItems = items.filter((item) => Boolean(item.label.trim()))
    if (validItems.length === 0) {
      toast.error('Mohon isi minimal 1 nama aktivitas.')
      return
    }

    setIsSubmitting(true)
    try {
      const formattedItems = validItems.map((item) => {
        const startedAt = `${workDate}T${item.startTime}:00`
        const endedAt = `${workDate}T${item.endTime}:00`

        return {
          id: item.id && item.id > 0 ? item.id : undefined,
          label: item.label.trim(),
          group: item.group || 'Technical',
          libraryActivityId: item.libraryActivityId || null,
          unitNumber: item.unitNumber.trim(),
          points: Number(item.points) || 5,
          remark: item.remark.trim(),
          materialUsed: item.materialUsed.trim(),
          startedAt,
          endedAt,
          photoUrl: item.photoUrl,
        }
      })

      const res = await resubmitDailyActivityApprovalFormAction({
        sessionId: data.sessionId,
        employeeId: data.employee.id,
        workDate,
        shiftCode,
        notes: summaryNotes.trim(),
        summaryRemark: summaryNotes.trim(),
        items: formattedItems,
        leaderEmployeeId: hierarchy?.leader?.id || undefined,
        leaderName: hierarchy?.leader?.name || undefined,
        superiorEmployeeId: hierarchy?.superior?.id || undefined,
        superiorName: hierarchy?.superior?.name || undefined,
      })

      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan revisi dokumen.')
      }

      toast.success('Revisi Daily Activity berhasil disimpan dan diajukan ulang ke Approver!')
      window.setTimeout(() => {
        router.push('/mobile/activity?reloaded=1')
        router.refresh()
      }, 1200)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan revisi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalCalculatedPoints = items.reduce((sum, item) => sum + (Number(item.points) || 0), 0)

  return (
    <div className="space-y-4 pb-12 text-slate-900">
      {/* Top navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <Link
          href="/mobile/activity"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="size-4" /> Kembali ke Aktivitas Harian
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsPdfOpen(true)}
          className="h-8 rounded-lg border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 text-xs font-bold gap-1"
        >
          <FileText className="size-3.5 text-blue-600" /> Preview PDF
        </Button>
      </div>

      {/* Reversion Notice Banner if Reverted */}
      {isReverted && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
            <RotateCcw className="size-4 text-amber-600 shrink-0" />
            Catatan Revisi dari Approver
          </div>
          <p className="text-xs font-semibold text-amber-950 bg-white/95 p-3.5 rounded-xl border border-amber-200 leading-relaxed shadow-2xs">
            &quot;{revertedStep?.remarks || revertedStep?.stepLabel || 'Mohon periksa dan perbarui data aktivitas di bawah ini sebelum mengajukan kembali.'}&quot;
          </p>
          <p className="text-[11px] text-amber-800 font-medium">
            Perbaiki data tanggal, unit, atau rincian aktivitas lalu tekan tombol <strong>&quot;Simpan &amp; Ajukan Ulang Revisi&quot;</strong> di bawah.
          </p>
        </div>
      )}

      {/* Document Header Card */}
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {data.sessionCode}
            </span>
            <h1 className="text-base font-extrabold text-gray-900 mt-1.5">{data.employee?.name || 'Teknisi'}</h1>
            <p className="text-xs text-gray-500 font-medium">
              {data.employee?.jobTitle || 'Staff'} &bull; SN: {data.employee?.sn || '-'}
            </p>
          </div>
          <Badge
            className={
              isReverted
                ? 'bg-amber-500 text-white border-0 text-[10px] font-bold px-2.5 py-1'
                : (data.status || '').toLowerCase().includes('approved')
                  ? 'bg-emerald-600 text-white border-0 text-[10px] font-bold px-2.5 py-1'
                  : 'bg-blue-600 text-white border-0 text-[10px] font-bold px-2.5 py-1'
            }
          >
            {isReverted ? 'REVISI DOKUMEN' : (data.status || 'SUBMITTED').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
            <Calendar className="size-4 text-blue-600 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Departemen</p>
              <p className="font-semibold text-gray-800 truncate">{data.employee?.department || '-'}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
            <MapPin className="size-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Lokasi Site</p>
              <p className="font-semibold text-gray-800 truncate">{data.site?.name || 'Site Operasional'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Form: Full Editable CRUD for Revisions */}
      <form onSubmit={handleResubmitRevision} className="space-y-4">
        {/* Header Parameters */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="size-4 text-blue-600" /> Parameter Laporan Aktivitas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Tanggal Kerja</Label>
              <Input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
                className="h-9 text-xs rounded-xl border-gray-200"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Shift Kerja</Label>
              <select
                value={shiftCode}
                onChange={(e) => setShiftCode(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl border border-gray-200 bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">ALL (Semua Shift)</option>
                <option value="DS">DS (Day Shift / Siang)</option>
                <option value="NS">NS (Night Shift / Malam)</option>
                <option value="OFF">OFF / Roster</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <Label className="text-xs font-semibold text-gray-700">Catatan Tambahan / Ringkasan Pekerjaan</Label>
            <Textarea
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="Tambahkan catatan perbaikan atau klarifikasi revisi untuk approver..."
              className="min-h-[70px] text-xs rounded-xl border-gray-200"
            />
          </div>
        </section>

        {/* List of Activity Items (CRUD) */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-4 text-emerald-600" /> Daftar Aktivitas Pekerjaan ({items.length})
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Total Poin: <span className="font-bold text-emerald-600">{totalCalculatedPoints} pts</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {availableLibrary.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLibraryDialogOpen(true)}
                  className="h-8 text-xs font-bold rounded-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1"
                >
                  <Plus className="size-3.5" /> Pilih Kamus
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomItem}
                className="h-8 text-xs font-bold rounded-lg border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 gap-1"
              >
                <Plus className="size-3.5" /> Baris Baru
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {items.map((item, index) => (
              <div
                key={item.id || index}
                className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3 transition-all hover:border-blue-200 hover:bg-blue-50/20"
              >
                <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#003461] text-[10px] font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-[11px] font-bold text-gray-700 uppercase">
                      {item.group || 'Technical Item'}
                    </span>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-600">Nama Aktivitas / Pekerjaan</Label>
                    <Input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateItem(index, 'label', e.target.value)}
                      placeholder="Contoh: Tyre Inspection HD785..."
                      required
                      className="h-8 text-xs rounded-lg bg-white border-gray-200 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-gray-600">No. Unit / Alat</Label>
                      <Input
                        type="text"
                        value={item.unitNumber}
                        onChange={(e) => handleUpdateItem(index, 'unitNumber', e.target.value)}
                        placeholder="Contoh: HD-101"
                        className="h-8 text-xs rounded-lg bg-white border-gray-200 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-gray-600">Poin Aktivitas</Label>
                      <Input
                        type="number"
                        value={item.points}
                        onChange={(e) => handleUpdateItem(index, 'points', Number(e.target.value))}
                        min={0}
                        max={100}
                        className="h-8 text-xs rounded-lg bg-white border-gray-200 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-gray-600">Jam Mulai</Label>
                      <Input
                        type="time"
                        value={item.startTime}
                        onChange={(e) => handleUpdateItem(index, 'startTime', e.target.value)}
                        className="h-8 text-xs rounded-lg bg-white border-gray-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-gray-600">Jam Selesai</Label>
                      <Input
                        type="time"
                        value={item.endTime}
                        onChange={(e) => handleUpdateItem(index, 'endTime', e.target.value)}
                        className="h-8 text-xs rounded-lg bg-white border-gray-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-600">Catatan / Uraian Detail Item</Label>
                    <Input
                      type="text"
                      value={item.remark}
                      onChange={(e) => handleUpdateItem(index, 'remark', e.target.value)}
                      placeholder="Catatan pelaksanaan, kendala, atau hasil kerja..."
                      className="h-8 text-xs rounded-lg bg-white border-gray-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Approver Timeline Steps */}
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <User className="size-4 text-emerald-600" /> Alur Approval Dokumen
          </h3>
          <div className="space-y-2">
            {data.approvals.map((app, i) => (
              <div
                key={app.id || i}
                className="flex items-start justify-between gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs"
              >
                <div>
                  <span className="text-[10px] font-semibold text-gray-400">{app.stepLabel}</span>
                  <p className="font-bold text-gray-800">{app.approverName || 'Approver'}</p>
                  {app.remarks && <p className="text-[11px] italic text-gray-500 mt-0.5">&quot;{app.remarks}&quot;</p>}
                </div>
                <Badge
                  className={
                    (app.status || '').toLowerCase() === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 border-0 text-[10px] font-extrabold'
                      : (app.status || '').toLowerCase().includes('revert')
                        ? 'bg-amber-100 text-amber-800 border-0 text-[10px] font-extrabold'
                        : 'bg-gray-200 text-gray-700 border-0 text-[10px] font-extrabold'
                  }
                >
                  {(app.status || 'PENDING').toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Action Button: Resubmit Revision */}
        <div className="sticky bottom-4 z-20 bg-white/95 p-3 rounded-2xl border border-gray-200 shadow-xl backdrop-blur-md space-y-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-[#003461] hover:bg-[#00284d] text-white font-extrabold text-xs shadow-md gap-2"
          >
            {isSubmitting ? (
              <>Menyimpan &amp; Mengajukan Ulang...</>
            ) : (
              <>
                <Send className="size-4" /> Simpan &amp; Ajukan Ulang Revisi
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Library Picker Dialog */}
      <Dialog open={isLibraryDialogOpen} onOpenChange={setIsLibraryDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] p-4 rounded-2xl overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#003461] flex items-center gap-1.5">
              <Layers className="size-4 text-blue-600" /> Pilih dari Kamus Aktivitas
            </DialogTitle>
          </DialogHeader>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
            <Input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Cari nama aktivitas atau kode..."
              className="h-9 pl-9 text-xs rounded-xl border-gray-200"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 max-h-[50vh] pr-1">
            {filteredLibrary.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">Tidak ada aktivitas ditemukan.</p>
            ) : (
              filteredLibrary.map((lib: any) => (
                <button
                  key={lib.id}
                  type="button"
                  onClick={() => handleAddItemFromLibrary(lib)}
                  className="w-full text-left p-3 rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-blue-50/80 hover:border-blue-200 transition-all flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                      {lib.activityCode}
                    </span>
                    <p className="font-bold text-xs text-gray-800 mt-1">{lib.activityName}</p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold shrink-0">
                    {lib.basePoints || 5} pts
                  </Badge>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal Dialog */}
      <Dialog open={isPdfOpen} onOpenChange={setIsPdfOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[85vh] p-4 rounded-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#003461] flex items-center gap-1.5">
              <FileText className="size-4 text-blue-600" /> PDF Formal Preview - {data.sessionCode}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-[10px] space-y-1">
              <p><strong>DOKUMEN:</strong> {data.sessionCode}</p>
              <p><strong>TEKNISI:</strong> {data.employee?.name} ({data.employee?.sn})</p>
              <p><strong>TANGGAL:</strong> {formatDate(data.workDate)}</p>
              <p><strong>STATUS:</strong> {(data.status || '').toUpperCase()}</p>
            </div>
            {revertedStep?.remarks && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <strong>Catatan Revisi:</strong> &quot;{revertedStep.remarks}&quot;
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
              <strong className="text-[11px] text-gray-700">Daftar Pekerjaan ({items.length}):</strong>
              {items.map((it, i) => (
                <div key={i} className="text-[11px] border-b border-gray-200/50 pb-1">
                  <p className="font-semibold text-gray-800">{i + 1}. {it.label || '-'}</p>
                  <p className="text-gray-500 text-[10px]">
                    Unit: {it.unitNumber || '-'} &bull; Jam: {it.startTime} - {it.endTime} &bull; Poin: {it.points} pts
                  </p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

