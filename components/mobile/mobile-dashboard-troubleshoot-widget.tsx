'use client'

import React, { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  Image as ImageIcon,
  Layers,
  MapPin,
  Maximize2,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createTroubleshootTicket,
  getMobileDashboardTroubleshootData,
  getTicketActivitiesAction,
  updateTicketStatusAction,
  addTicketNoteAction,
  type TroubleshootTicketItem,
  type TicketActivityItem,
  type MobileDashboardTroubleshootResult,
} from '@/app/actions/service-desk'
import { uploadFile } from '@/app/actions/upload'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface AttachmentItem {
  url: string
  name: string
  size: number
  type: string
}

export function MobileDashboardTroubleshootWidget({
  initialData,
}: {
  initialData: MobileDashboardTroubleshootResult
}) {
  const [data, setData] = useState<MobileDashboardTroubleshootResult>(initialData)
  const [scope, setScope] = useState<'personal' | 'department'>(initialData.scope || 'personal')
  const [isPending, startTransition] = useTransition()

  // Inspector & Lightbox states
  const [selectedTicket, setSelectedTicket] = useState<TroubleshootTicketItem | null>(null)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [activities, setActivities] = useState<TicketActivityItem[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null)

  // Create Ticket Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formUnitCode, setFormUnitCode] = useState('')
  const [formSiteId, setFormSiteId] = useState<string>(
    initialData.sites?.[0]?.id ? String(initialData.sites[0].id) : '1'
  )
  const [formCategory, setFormCategory] = useState<string>(
    initialData.categories?.[0]?.name || 'Timesheet & Roster Kerja'
  )
  const [formPriority, setFormPriority] = useState<'kritis' | 'tinggi' | 'sedang' | 'rendah'>('tinggi')
  const [formDescription, setFormDescription] = useState('')
  const [formAttachments, setFormAttachments] = useState<AttachmentItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Status & Note Dialog states
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>('investigasi')
  const [statusNotes, setStatusNotes] = useState('')
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [newNote, setNewNote] = useState('')

  // Switch Scope Handler
  const handleSwitchScope = (newScope: 'personal' | 'department') => {
    setScope(newScope)
    startTransition(async () => {
      try {
        const res = await getMobileDashboardTroubleshootData(newScope)
        if (res.success) {
          setData(res)
        }
      } catch (err) {
        console.error('Error switching scope:', err)
      }
    })
  }

  // Open Inspector
  const handleOpenTicket = (ticket: TroubleshootTicketItem) => {
    setSelectedTicket(ticket)
    setIsInspectorOpen(true)
    setLoadingActivities(true)
    getTicketActivitiesAction(ticket.id)
      .then(setActivities)
      .catch((e) => console.error(e))
      .finally(() => setLoadingActivities(false))
  }

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 15MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadTarget', 'troubleshooting-attachments')

      const res = await uploadFile(formData)
      if (res.success && res.url) {
        setFormAttachments((prev) => [
          ...prev,
          {
            url: res.url,
            name: file.name,
            size: file.size,
            type: file.type,
          },
        ])
        toast.success(`Foto ${file.name} berhasil diunggah!`)
      } else {
        toast.error(res.error || 'Gagal mengunggah file')
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error('Gagal mengunggah berkas')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Remove Attachment
  const handleRemoveAttachment = (idx: number) => {
    setFormAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  // Submit Ticket Handler
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Judul dan rincian kendala wajib diisi')
      return
    }

    startTransition(async () => {
      try {
        const res = await createTroubleshootTicket({
          title: formTitle.trim(),
          findingDescription: formDescription.trim(),
          unitCode: formUnitCode.trim() || undefined,
          siteId: parseInt(formSiteId, 10),
          categoryName: formCategory,
          priority: formPriority,
          attachments: formAttachments,
          sourceDetail: 'Mobile Dashboard Quick Report',
        })

        if (res.success) {
          toast.success(`Tiket ${res.ticketNumber} berhasil dibuat!`)
          setIsCreateOpen(false)
          // Reset form
          setFormTitle('')
          setFormDescription('')
          setFormUnitCode('')
          setFormAttachments([])
          // Refresh list
          const refreshed = await getMobileDashboardTroubleshootData(scope)
          if (refreshed.success) setData(refreshed)
        } else {
          toast.error(res.error || 'Gagal membuat tiket')
        }
      } catch (err) {
        console.error('Error submitting ticket:', err)
        toast.error('Terjadi kesalahan saat menyimpan tiket')
      }
    })
  }

  // Update Status Handler
  const handleUpdateStatusSubmit = async () => {
    if (!selectedTicket) return
    startTransition(async () => {
      try {
        const res = await updateTicketStatusAction(selectedTicket.id, newStatus as any, statusNotes.trim() || undefined)
        if (res.success) {
          toast.success(`Status tiket diubah ke ${newStatus.toUpperCase()}`)
          setIsStatusDialogOpen(false)
          setStatusNotes('')
          setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null))
          // Refresh list & activities
          const refreshed = await getMobileDashboardTroubleshootData(scope)
          if (refreshed.success) setData(refreshed)
          getTicketActivitiesAction(selectedTicket.id).then(setActivities)
        } else {
          toast.error(res.error || 'Gagal mengubah status')
        }
      } catch (err) {
        toast.error('Terjadi kesalahan saat update status')
      }
    })
  }

  // Add Note Handler
  const handleAddNoteSubmit = async () => {
    if (!selectedTicket || !newNote.trim()) return
    startTransition(async () => {
      try {
        const res = await addTicketNoteAction(selectedTicket.id, newNote.trim())
        if (res.success) {
          toast.success('Catatan berhasil ditambahkan')
          setIsNoteDialogOpen(false)
          setNewNote('')
          getTicketActivitiesAction(selectedTicket.id).then(setActivities)
        } else {
          toast.error(res.error || 'Gagal menambahkan catatan')
        }
      } catch (err) {
        toast.error('Terjadi kesalahan saat menambahkan catatan')
      }
    })
  }

  const priorityStyles = {
    kritis: { border: 'border-l-4 border-l-red-500', badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200' },
    tinggi: { border: 'border-l-4 border-l-amber-500', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200' },
    sedang: { border: 'border-l-4 border-l-blue-500', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200' },
    rendah: { border: 'border-l-4 border-l-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  }

  return (
    <section className="rounded-[1.3rem] bg-white dark:bg-slate-900 p-4 shadow-[0_14px_32px_rgba(8,32,51,0.07)] border border-slate-100/90 dark:border-slate-800 space-y-3.5">
      {/* 1. Header Widget */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8.5 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center">
            <Wrench className="size-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
              Troubleshoot & Tiket Kendala
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Service desk insiden &amp; pelaporan lintas departemen
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1 active:scale-95"
        >
          <Plus className="size-3.5" />
          <span>Buat Tiket</span>
        </Button>
      </div>

      {/* 2. Personal vs Departemen Scope Toggle */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleSwitchScope('personal')}
          className={cn(
            'flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 text-xs',
            scope === 'personal'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <User className="size-3.5" />
          <span>Personal ({data.personalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchScope('department')}
          className={cn(
            'flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 text-xs',
            scope === 'department'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Layers className="size-3.5" />
          <span>Departemen ({data.departmentCount})</span>
        </button>
      </div>

      {/* 3. Ticket Cards List */}
      <div className="space-y-2 pt-0.5">
        {data.tickets.length === 0 ? (
          <div className="py-7 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-3">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada tiket {scope === 'personal' ? 'personal aktif' : 'di departemen Anda'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tekan &ldquo;Buat Tiket&rdquo; untuk melaporkan kendala operasional atau bug sistem.
            </p>
          </div>
        ) : (
          data.tickets.slice(0, 3).map((ticket) => {
            const pStyle = priorityStyles[ticket.priority] || priorityStyles.rendah
            const hasAttachments = Array.isArray(ticket.attachments) && ticket.attachments.length > 0

            return (
              <div
                key={ticket.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenTicket(ticket)}
                className={cn(
                  'p-3 rounded-xl border border-border/80 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer space-y-1.5 shadow-2xs active:scale-[0.99]',
                  pStyle.border
                )}
              >
                {/* Top Info */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                    <span>{ticket.ticketNumber}</span>
                    {ticket.queuePosition && ['baru', 'assigned', 'investigasi', 'menunggu_part'].includes(ticket.status) && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300/60 font-sans">
                        Q#{ticket.queuePosition}
                      </span>
                    )}
                    {ticket.unitCode && (
                      <span className="text-muted-foreground font-sans font-normal">
                        · {ticket.unitCode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border', pStyle.badge)}>
                      {ticket.priority}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {ticket.status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 leading-snug">
                  {ticket.title}
                </p>

                {/* Bottom Meta */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-slate-600 dark:text-slate-400">{ticket.siteName}</span>
                    <span>•</span>
                    <span>{ticket.categoryName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasAttachments && (
                      <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">
                        <ImageIcon className="size-3" />
                        {ticket.attachments.length}
                      </span>
                    )}
                    <span className={cn('font-semibold', ticket.isOverdue ? 'text-rose-600' : 'text-slate-500')}>
                      {ticket.slaLabel}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 4. Footer Link */}
      <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-medium text-muted-foreground">
          {scope === 'personal' ? 'Menampilkan kendala Anda' : `Departemen: ${data.userDepartmentName}`}
        </span>
        <Link
          href="/mobile/helpdesk"
          className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
        >
          <span>Buka Workspace Helpdesk</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* ========================================================
          MODAL 1: FORM LAPOR KENDALA CEPAT (DENGAN UPLOAD FOTO)
          ======================================================== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md w-[92vw] p-4.5 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Plus className="size-4 text-rose-600" />
              Lapor Kendala / Buat Tiket
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sampaikan kendala sistem atau operasional lengkap dengan foto bukti lapangan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicketSubmit} className="space-y-3 text-xs pt-1">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Judul Temuan / Kendala <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Contoh: Gagal sinkronisasi data lembur otomatis"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Modul / Unit Terdampak
                </label>
                <Input
                  placeholder="Contoh: Timesheet V2"
                  value={formUnitCode}
                  onChange={(e) => setFormUnitCode(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Site Operasional
                </label>
                <select
                  value={formSiteId}
                  onChange={(e) => setFormSiteId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  {(data.sites || []).map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Kategori
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  {(data.categories || []).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  Prioritas
                </label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                >
                  <option value="kritis">Kritis (SLA 4 Jam)</option>
                  <option value="tinggi">Tinggi (SLA 8 Jam)</option>
                  <option value="sedang">Sedang (SLA 24 Jam)</option>
                  <option value="rendah">Rendah (SLA 48 Jam)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Rincian Temuan &amp; Dampak <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Jelaskan kondisi aktual temuan lapangan dan langkah awal yang telah dicoba..."
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs resize-none"
                required
              />
            </div>

            {/* Upload Attachment / Foto */}
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Foto Bukti / Dokumen Lampiran</span>
                <span className="text-[10px] text-muted-foreground font-normal">Maks 15MB</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-8 text-xs flex items-center gap-1.5 border-dashed border-rose-300 bg-rose-50/50 hover:bg-rose-100/60 text-rose-700"
                >
                  <Camera className="size-3.5" />
                  <span>{isUploading ? 'Mengunggah...' : 'Pilih Foto / Dokumen'}</span>
                </Button>
              </div>

              {/* Uploaded attachments preview list */}
              {formAttachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {formAttachments.map((att, idx) => {
                    const resolved = resolveUploadUrl(att.url)
                    const isImg = att.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)

                    return (
                      <div
                        key={idx}
                        className="relative p-1.5 rounded-lg border border-border/80 bg-slate-50 dark:bg-slate-950 flex items-center gap-2 group"
                      >
                        {isImg ? (
                          <img
                            src={resolved}
                            alt={att.name}
                            className="size-10 object-cover rounded border border-border/60 shrink-0"
                          />
                        ) : (
                          <div className="size-10 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <FileText className="size-5 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium truncate text-slate-800 dark:text-slate-200">
                            {att.name}
                          </p>
                          <span className="text-[9px] text-muted-foreground block">
                            {Math.round(att.size / 1024)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="size-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8.5 text-xs"
                onClick={() => setIsCreateOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || isUploading}
                className="h-8.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {isPending ? 'Menyimpan...' : 'Kirim Laporan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL 2: DETAIL TIKET & INSPECTOR DENGAN POPUP FOTO
          ======================================================== */}
      <Sheet open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col bg-white dark:bg-slate-900">
          {selectedTicket && (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <Wrench className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Tiket {selectedTicket.ticketNumber}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedTicket.siteName} · {selectedTicket.unitCode || 'General'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', priorityStyles[selectedTicket.priority]?.badge)}>
                    {selectedTicket.priority}
                  </span>
                  <button
                    onClick={() => setIsInspectorOpen(false)}
                    className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Status Antrian & Estimasi Penanganan (Mobile) */}
                {['baru', 'assigned', 'investigasi', 'menunggu_part'].includes(selectedTicket.status) && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300/80 dark:border-amber-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs">
                        <Clock className="size-3.5 text-amber-600" />
                        <span>Status Antrian Penanganan</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white font-extrabold text-[10px]">
                        Antrian #{selectedTicket.queuePosition || 1}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-950 dark:text-amber-100">
                      Berada di urutan ke-{selectedTicket.queuePosition || 1} pada teknisi <span className="font-bold">{selectedTicket.assignedEmployeeName || 'Admin'}</span>.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/60 text-[10px]">
                      <div>
                        <span className="text-amber-800/80 dark:text-amber-300 block font-semibold">Estimasi Mulai:</span>
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          {(selectedTicket.estimatedWaitHours || 0) === 0 ? 'Segera / Prioritas' : `~${selectedTicket.estimatedWaitHours} Jam lagi`}
                        </span>
                      </div>
                      <div>
                        <span className="text-amber-800/80 dark:text-amber-300 block font-semibold">Target Selesai:</span>
                        <span className="font-bold text-amber-950 dark:text-amber-100">
                          {new Date(selectedTicket.targetSlaAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })} WIB
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Judul & Temuan */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-border/80 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Judul Temuan
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {selectedTicket.title}
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed pt-1 border-t border-border/40">
                    {selectedTicket.findingDescription}
                  </p>
                </div>

                {/* Target SLA & Info */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl border border-border/70 bg-card">
                    <span className="text-muted-foreground block text-[10px]">Target SLA</span>
                    <span className={cn('font-semibold flex items-center gap-1 mt-0.5', selectedTicket.isOverdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200')}>
                      <Clock className="size-3" />
                      {selectedTicket.slaLabel}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/70 bg-card">
                    <span className="text-muted-foreground block text-[10px]">Teknisi PIC</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5 truncate">
                      {selectedTicket.assignedEmployeeName || 'Belum di-assign'}
                    </span>
                  </div>
                </div>

                {/* GALERI FOTO & DOKUMEN LAMPIRAN (DENGAN POPUP LIGHTBOX) */}
                {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-blue-500" />
                        Foto Bukti / Lampiran ({selectedTicket.attachments.length})
                      </h4>
                      <span className="text-[10px] text-muted-foreground">Klik foto untuk popup besar</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {selectedTicket.attachments.map((att: AttachmentItem, idx: number) => {
                        const resolvedUrl = resolveUploadUrl(att.url)
                        const isImg = att.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name)

                        return (
                          <div
                            key={idx}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (isImg) setLightboxImage({ url: resolvedUrl, name: att.name })
                              else window.open(resolvedUrl, '_blank')
                            }}
                            className="group relative rounded-xl border border-border/90 overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-2xs hover:shadow-xs transition-transform active:scale-95"
                          >
                            {isImg ? (
                              <div className="relative aspect-video w-full overflow-hidden bg-slate-950/5">
                                <img
                                  src={resolvedUrl}
                                  alt={att.name}
                                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="size-5" />
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video w-full flex flex-col items-center justify-center p-2 text-center">
                                <FileText className="size-6 text-slate-500 mb-1" />
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-full">
                                  {att.name}
                                </span>
                              </div>
                            )}
                            <div className="p-1.5 bg-white dark:bg-slate-900 border-t border-border/60 flex items-center justify-between text-[10px]">
                              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                                {att.name}
                              </span>
                              <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Riwayat Aktivitas Audit Trail */}
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Clock className="size-3.5 text-rose-500" />
                    Riwayat Aktivitas &amp; Log
                  </h4>

                  {loadingActivities ? (
                    <p className="text-[11px] text-muted-foreground italic py-2">Memuat riwayat...</p>
                  ) : (
                    <div className="space-y-2 border-l-2 border-rose-200 dark:border-rose-900 ml-2 pl-3">
                      {activities.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">Belum ada riwayat aktivitas.</p>
                      ) : (
                        activities.map((act) => (
                          <div key={act.id} className="relative pb-2 last:pb-0 text-[11px]">
                            <div className="size-2 rounded-full bg-rose-500 absolute -left-[17px] top-1" />
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {act.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(act.createdAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              • {act.actorName || 'Sistem'}
                            </div>
                            {act.description && (
                              <div className="mt-1 p-2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300">
                                {act.description}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-3 border-t border-border bg-white dark:bg-slate-900 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsStatusDialogOpen(true)}
                  className="h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
                >
                  Update Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNoteDialogOpen(true)}
                  className="h-9 text-xs font-semibold rounded-xl"
                >
                  Tambah Catatan
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================================
          MODAL 3: LIGHTBOX / IMAGE PREVIEW POPUP
          ======================================================== */}
      {lightboxImage && (
        <Dialog open={Boolean(lightboxImage)} onOpenChange={(open) => !open && setLightboxImage(null)}>
          <DialogContent className="max-w-xl w-[95vw] p-2 rounded-2xl bg-black/95 text-white border-slate-800">
            <div className="flex items-center justify-between p-2 border-b border-slate-800 text-xs">
              <span className="font-semibold truncate max-w-[70%]">{lightboxImage.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 text-[11px]"
                >
                  <Download className="size-3.5" />
                  <span>Unduh</span>
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="p-2 flex items-center justify-center min-h-[50vh] max-h-[75vh] overflow-hidden">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL 4: DIALOG UPDATE STATUS
          ======================================================== */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] p-4 rounded-2xl">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="text-sm font-bold">Update Status Tiket</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ubah tahapan penanganan untuk tiket #{selectedTicket?.ticketNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Status Baru</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="baru">Baru</option>
                <option value="assigned">Assigned (Ditugaskan)</option>
                <option value="investigasi">Investigasi / Pengerjaan</option>
                <option value="menunggu_part">Menunggu Part / Pihak Ketiga</option>
                <option value="selesai">Selesai (Resolved)</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Catatan Status</label>
              <Textarea
                placeholder="Alasan perubahan atau rincian tindakan..."
                rows={3}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8.5 text-xs"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleUpdateStatusSubmit}
              className="h-8.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL 5: DIALOG TAMBAH CATATAN
          ======================================================== */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-sm w-[90vw] p-4 rounded-2xl">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="text-sm font-bold">Tambah Catatan Investigasi</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Catatan akan tercatat secara permanen di riwayat aktivitas tiket.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs">
            <Textarea
              placeholder="Tuliskan catatan teknis terbaru..."
              rows={4}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8.5 text-xs"
              onClick={() => setIsNoteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || !newNote.trim()}
              onClick={handleAddNoteSubmit}
              className="h-8.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isPending ? 'Menyimpan...' : 'Kirim Catatan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
