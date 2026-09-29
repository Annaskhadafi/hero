'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Headphones,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Upload,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { uploadFile } from '@/app/actions/upload'
import { createMaestroTicketAction } from '@/app/actions/helpdesk'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import type { TicketAttachment } from '@/db/schema/helpdesk'

interface TicketItem {
  id: number
  ticketNumber: string
  title: string
  priority: string
  status: string
  createdAt: Date | string
  updatedAt: Date | string
  claimedAt: Date | string | null
  aiSummary: string | null
  category: {
    id: number
    name: string
    color: string
    code: string
  }
  site: {
    id: number
    name: string
  }
  assignedEmployee: {
    id: number
    name: string
  } | null
}

interface Props {
  initialTickets: TicketItem[]
  categories: Array<{
    id: number
    code: string
    name: string
    color: string
    description: string
  }>
  sites: Array<{
    id: number
    name: string
    code: string | null
  }>
}

export function MaestroTicketsClient({ initialTickets, categories, sites }: Props) {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create Ticket Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ? String(sites[0].id) : '')
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ? String(categories[0].id) : '')
  const [priority, setPriority] = useState('medium')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNum = t.ticketNumber.toLowerCase().includes(q)
      const matchTitle = t.title.toLowerCase().includes(q)
      const matchCat = t.category.name.toLowerCase().includes(q)
      const matchSite = t.site.name.toLowerCase().includes(q)
      if (!matchNum && !matchTitle && !matchCat && !matchSite) return false
    }
    return true
  })

  // Statistics
  const totalCount = tickets.length
  const activeCount = tickets.filter((t) => ['bot_active', 'escalated', 'in_progress'].includes(t.status)).length
  const resolvedCount = tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadTarget', 'helpdesk')

        const res = await uploadFile(formData)
        if (res.success && res.url) {
          setAttachments((prev) => [
            ...prev,
            {
              url: res.url,
              name: file.name,
              size: file.size,
              type: file.type,
            },
          ])
        } else {
          toast.error(`Gagal mengunggah file ${file.name}: ${res.error || 'Terjadi kesalahan'}`)
        }
      }
    } catch (err) {
      toast.error('Gagal mengunggah berkas lampiran.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!siteId) {
      toast.error('Silakan pilih lokasi site operasional Anda.')
      return
    }
    if (!categoryId) {
      toast.error('Silakan pilih kategori tiket.')
      return
    }
    if (!title.trim()) {
      toast.error('Judul keluhan wajib diisi.')
      return
    }
    if (!message.trim()) {
      toast.error('Uraian masalah wajib diisi.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createMaestroTicketAction({
        siteId: Number(siteId),
        categoryId: Number(categoryId),
        title: title.trim(),
        message: message.trim(),
        priority,
        attachments,
      })

      if (result.success && result.ticketId) {
        toast.success(`Tiket ${result.ticketNumber} berhasil dibuat! AI Assistant siap melayani Anda.`)
        setIsDialogOpen(false)
        setTitle('')
        setMessage('')
        setAttachments([])
        // Redirect directly to the live thread
        router.push(`/tickets/${result.ticketId}`)
      } else {
        toast.error(result.error || 'Gagal membuat tiket.')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat membuat tiket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 text-slate-950">
      {/* Top Banner & Action */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Layanan Pengaduan &amp; Bantuan
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-700 font-semibold">
            Pusat tiket bantuan operasional, keluhan ban/unit, dan konsultasi teknis berbasis AI.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="h-11 gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-5 text-xs sm:text-sm font-bold text-white shadow-sm shrink-0 self-start sm:self-center transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Tiket Baru</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Total Tiket Masuk</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-950 font-display">{totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
          <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Sedang Ditangani</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-700 font-display">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-300 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
          <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">Selesai (Resolved)</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700 font-display">{resolvedCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-300 bg-white p-3.5 sm:p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor tiket, judul masalah, atau kategori..."
            className="h-11 pl-9 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-950 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-700" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-48 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl text-slate-950 shadow-sm">
              <SelectValue placeholder="Status Tiket" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-white border-2 border-slate-300 shadow-xl">
              <SelectItem value="all" className="font-bold text-xs sm:text-sm text-slate-950">Semua Status</SelectItem>
              <SelectItem value="bot_active" className="font-bold text-xs sm:text-sm text-slate-950">Dijawab AI</SelectItem>
              <SelectItem value="escalated" className="font-bold text-xs sm:text-sm text-slate-950">Dialihkan ke Staf</SelectItem>
              <SelectItem value="in_progress" className="font-bold text-xs sm:text-sm text-slate-950">Sedang Diproses</SelectItem>
              <SelectItem value="resolved" className="font-bold text-xs sm:text-sm text-slate-950">Selesai</SelectItem>
              <SelectItem value="closed" className="font-bold text-xs sm:text-sm text-slate-950">Ditutup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
        {filteredTickets.length === 0 ? (
          <div className="p-16 text-center">
            <Headphones className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-3 text-base font-black text-slate-950">Belum Ada Tiket</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-700 font-semibold max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'Tidak ada tiket yang sesuai dengan filter pencarian.'
                : 'Belum ada tiket pengaduan yang diajukan. Klik "Buat Tiket Baru" untuk memulai.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredTickets.map((ticket) => {
              const statusCfg = getStatusConfig(ticket.status)
              const priorityCfg = getPriorityBadge(ticket.priority)

              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="group flex flex-col justify-between gap-3.5 p-5 sm:p-6 transition hover:bg-blue-50/60 sm:flex-row sm:items-center"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-950 bg-slate-200 px-2.5 py-0.5 rounded-md border border-slate-300">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-black border"
                        style={{
                          backgroundColor: `${ticket.category.color}20`,
                          color: '#0f172a',
                          borderColor: ticket.category.color,
                        }}
                      >
                        {ticket.category.name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-black ${priorityCfg.badge}`}
                      >
                        {priorityCfg.label}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-slate-950 group-hover:text-blue-700 transition truncate">
                      {ticket.title}
                    </h4>

                    {ticket.aiSummary && (
                      <p className="text-xs sm:text-sm font-medium text-slate-700 line-clamp-1 italic">
                        &ldquo;{ticket.aiSummary}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold text-slate-700 pt-0.5">
                      <span className="flex items-center gap-1.5 font-bold text-slate-900">
                        <MapPin className="h-3.5 w-3.5 text-slate-600" />
                        {ticket.site.name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-600" />
                        {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {ticket.assignedEmployee ? (
                        <span className="flex items-center gap-1.5 text-slate-950 font-black">
                          <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                          PIC: {ticket.assignedEmployee.name}
                        </span>
                      ) : ticket.status === 'bot_active' ? (
                        <span className="flex items-center gap-1.5 text-blue-950 font-black bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-400">
                          <Bot className="h-3.5 w-3.5 text-blue-700" />
                          Chitra Smart AI
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border ${statusCfg.style}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    <span className="text-xs font-black text-blue-700 group-hover:text-blue-800 group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                      Buka &rarr;
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-slate-950 font-display">
              Buat Tiket Pengaduan &amp; Bantuan Baru
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-700 font-semibold mt-1">
              Jelaskan kendala Anda selengkap mungkin. Sistem AI kami akan memberikan respon awal
              dan jika diperlukan akan langsung diteruskan ke tim HERO terkait.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTicket} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-black text-slate-900">Site Operasional *</label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="mt-1.5 h-11 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl text-slate-950 shadow-sm">
                    <SelectValue placeholder="Pilih Site" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2 border-slate-300 bg-white shadow-xl">
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs sm:text-sm font-bold text-slate-950 rounded-lg">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-900">Kategori Keluhan *</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1.5 h-11 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl text-slate-950 shadow-sm">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2 border-slate-300 bg-white shadow-xl">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs sm:text-sm font-bold text-slate-950 rounded-lg">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-black text-slate-900">Judul Masalah / Kendala *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Kerusakan sidewall ban unit DT-014 di Pit B"
                  className="mt-1.5 h-11 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-900">Tingkat Urgensi</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1.5 h-11 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl text-slate-950 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2 border-slate-300 bg-white shadow-xl">
                    <SelectItem value="low" className="text-xs sm:text-sm font-bold text-slate-950 rounded-lg">Rendah (Low)</SelectItem>
                    <SelectItem value="medium" className="text-xs sm:text-sm font-bold text-slate-950 rounded-lg">Normal (Medium)</SelectItem>
                    <SelectItem value="high" className="text-xs sm:text-sm font-bold text-slate-950 rounded-lg">Tinggi (High)</SelectItem>
                    <SelectItem value="urgent" className="text-xs sm:text-sm font-black text-rose-700 rounded-lg">Kritis (Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-900">
                Uraian Lengkap Keluhan / Pertanyaan *
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan kronologi, nomor seri ban/unit, lokasi spesifik, atau informasi penting lainnya..."
                rows={4}
                className="mt-1.5 text-xs sm:text-sm font-bold bg-white border-2 border-slate-300 rounded-xl text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                required
              />
            </div>

            {/* Attachments Section */}
            <div>
              <label className="text-xs font-black text-slate-900 flex items-center justify-between">
                <span>Lampiran Foto / Dokumen Pendukung</span>
                <span className="text-xs text-slate-600 font-bold">Max 5MB (JPG/PNG/PDF)</span>
              </label>

              <div className="mt-1.5 space-y-2">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-lg border-2 border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-950"
                      >
                        {att.type.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4 text-blue-700" />
                        ) : (
                          <FileText className="h-4 w-4 text-indigo-700" />
                        )}
                        <span className="max-w-[150px] truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="ml-1 text-slate-500 hover:text-rose-700 transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-400 bg-slate-100/70 hover:bg-slate-200/70 hover:border-slate-500 transition group">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 group-hover:text-blue-800 transition">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                        <span>Mengunggah berkas...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-slate-600 group-hover:text-blue-800 transition" />
                        <span>Klik untuk unggah foto atau dokumen</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <DialogFooter className="pt-3 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-10 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold px-4 shadow-sm transition-colors cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="h-10 gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white px-5 shadow-sm transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses Tiket &amp; AI...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Kirim Tiket Keluhan</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'bot_active':
      return {
        label: 'Dijawab AI',
        style: 'bg-indigo-100 text-indigo-950 border border-indigo-400',
        icon: <Bot className="h-3.5 w-3.5 text-indigo-700" />,
      }
    case 'escalated':
      return {
        label: 'Menunggu Staf',
        style: 'bg-amber-100 text-amber-950 border border-amber-400',
        icon: <Clock className="h-3.5 w-3.5 text-amber-700" />,
      }
    case 'assigned':
    case 'in_progress':
      return {
        label: 'Sedang Ditangani',
        style: 'bg-sky-100 text-sky-950 border border-sky-400',
        icon: <UserCheck className="h-3.5 w-3.5 text-sky-700" />,
      }
    case 'resolved':
      return {
        label: 'Selesai',
        style: 'bg-emerald-100 text-emerald-950 border border-emerald-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />,
      }
    case 'closed':
      return {
        label: 'Ditutup',
        style: 'bg-slate-200 text-slate-950 border border-slate-400',
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-slate-700" />,
      }
    default:
      return {
        label: status,
        style: 'bg-slate-200 text-slate-950 border border-slate-400',
        icon: <AlertCircle className="h-3.5 w-3.5 text-slate-700" />,
      }
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return { label: 'URGENT', badge: 'bg-rose-100 text-rose-950 border border-rose-400 font-black' }
    case 'high':
      return { label: 'High', badge: 'bg-amber-100 text-amber-950 border border-amber-400 font-black' }
    case 'low':
      return { label: 'Low', badge: 'bg-slate-200 text-slate-950 border border-slate-400 font-black' }
    default:
      return { label: 'Medium', badge: 'bg-sky-100 text-sky-950 border border-sky-400 font-black' }
  }
}
