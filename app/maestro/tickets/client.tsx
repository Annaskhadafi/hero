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
    <div className="space-y-8">
      {/* Top Banner & Action */}
      <div className="flex flex-col justify-between gap-6 rounded-3xl border border-white/80 bg-white/85 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Layanan Pengaduan &amp; Bantuan
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-slate-700 leading-relaxed max-w-2xl">
            Sampaikan kendala operasional, pertanyaan teknis, atau permintaan servis unit Anda. Chitra Smart Assistant &amp; tim HERO siap memberikan tanggapan cepat.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="h-11 sm:h-12 gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-md hover:bg-slate-900 shrink-0 self-start sm:self-center transition"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Tiket Baru</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider">Total Tiket Masuk</p>
          <p className="mt-3 text-3xl sm:text-4xl font-black text-slate-950 font-display">{totalCount}</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-extrabold text-amber-900 uppercase tracking-wider">Sedang Berjalan / Ditangani</p>
          <p className="mt-3 text-3xl sm:text-4xl font-black text-amber-600 font-display">{activeCount}</p>
        </div>
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-extrabold text-emerald-900 uppercase tracking-wider">Selesai (Resolved)</p>
          <p className="mt-3 text-3xl sm:text-4xl font-black text-emerald-600 font-display">{resolvedCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/90 p-4 sm:p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor tiket, judul masalah, atau kategori..."
            className="h-11 pl-11 text-sm font-semibold bg-white/80 border-slate-300/80 rounded-2xl placeholder:text-slate-400 focus-visible:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-52 text-sm font-bold bg-white/80 border-slate-300/80 rounded-2xl text-slate-900">
              <SelectValue placeholder="Status Tiket" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="font-semibold text-sm">Semua Status</SelectItem>
              <SelectItem value="bot_active" className="font-semibold text-sm">Dijawab AI</SelectItem>
              <SelectItem value="escalated" className="font-semibold text-sm">Dialihkan ke Staf</SelectItem>
              <SelectItem value="in_progress" className="font-semibold text-sm">Sedang Diproses</SelectItem>
              <SelectItem value="resolved" className="font-semibold text-sm">Selesai</SelectItem>
              <SelectItem value="closed" className="font-semibold text-sm">Ditutup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
        {filteredTickets.length === 0 ? (
          <div className="p-16 text-center">
            <Headphones className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-3 text-base font-extrabold text-slate-950">Belum Ada Tiket</h3>
            <p className="mt-1 text-sm font-medium text-slate-600 max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'Tidak ada tiket yang sesuai dengan filter pencarian.'
                : 'Belum ada tiket pengaduan yang diajukan. Klik "Buat Tiket Baru" untuk memulai.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => {
              const statusCfg = getStatusConfig(ticket.status)
              const priorityCfg = getPriorityBadge(ticket.priority)

              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="group flex flex-col justify-between gap-4 p-6 sm:p-7 transition hover:bg-amber-50/40 sm:flex-row sm:items-center"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-950 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-black border"
                        style={{
                          backgroundColor: `${ticket.category.color}15`,
                          color: ticket.category.color,
                          borderColor: `${ticket.category.color}40`,
                        }}
                      >
                        {ticket.category.name}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${priorityCfg.badge}`}
                      >
                        {priorityCfg.label}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-slate-950 group-hover:text-amber-600 transition truncate">
                      {ticket.title}
                    </h4>

                    {ticket.aiSummary && (
                      <p className="text-xs sm:text-sm font-medium text-slate-700 line-clamp-1 italic">
                        &ldquo;{ticket.aiSummary}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-medium text-slate-600 pt-1">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        {ticket.site.name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {ticket.assignedEmployee ? (
                        <span className="flex items-center gap-1.5 text-slate-950 font-bold">
                          <UserCheck className="h-4 w-4 text-emerald-700" />
                          PIC: {ticket.assignedEmployee.name}
                        </span>
                      ) : ticket.status === 'bot_active' ? (
                        <span className="flex items-center gap-1.5 text-indigo-900 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                          <Bot className="h-4 w-4 text-indigo-700" />
                          Chitra Smart Ticketing Aktif
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold border ${statusCfg.style}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    <span className="text-sm font-bold text-slate-950 group-hover:text-amber-600 group-hover:translate-x-0.5 transition">
                      Buka Chat &rarr;
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950 font-display">
              Buat Tiket Pengaduan &amp; Bantuan Baru
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
              Jelaskan kendala Anda selengkap mungkin. Sistem AI kami akan memberikan respon awal
              dan jika diperlukan akan langsung diteruskan ke tim HERO terkait.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTicket} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs sm:text-sm font-extrabold text-slate-900">Site Operasional *</label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="mt-1.5 h-11 text-xs sm:text-sm font-semibold rounded-2xl bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder="Pilih Site" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs sm:text-sm font-semibold">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-extrabold text-slate-900">Kategori Keluhan *</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1.5 h-11 text-xs sm:text-sm font-semibold rounded-2xl bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs sm:text-sm font-semibold">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs sm:text-sm font-extrabold text-slate-900">Judul Masalah / Kendala *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Kerusakan sidewall ban unit DT-014 di Pit B"
                  className="mt-1.5 h-11 text-xs sm:text-sm font-semibold rounded-2xl bg-white border-slate-300 focus-visible:bg-white text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-extrabold text-slate-900">Tingkat Urgensi</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1.5 h-11 text-xs sm:text-sm font-semibold rounded-2xl bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="low" className="text-xs sm:text-sm font-semibold">Rendah (Low)</SelectItem>
                    <SelectItem value="medium" className="text-xs sm:text-sm font-semibold">Normal (Medium)</SelectItem>
                    <SelectItem value="high" className="text-xs sm:text-sm font-semibold">Tinggi (High)</SelectItem>
                    <SelectItem value="urgent" className="text-xs sm:text-sm font-semibold text-rose-700">Kritis / Darurat (Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-extrabold text-slate-900">
                Uraian Lengkap Keluhan / Pertanyaan *
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan kronologi, nomor seri ban/unit, lokasi spesifik, atau informasi penting lainnya..."
                rows={4}
                className="mt-1.5 text-xs sm:text-sm font-medium rounded-2xl bg-white border-slate-300 focus-visible:bg-white text-slate-900"
                required
              />
            </div>

            {/* Attachments Section */}
            <div>
              <label className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center justify-between">
                <span>Lampiran Foto / Dokumen Pendukung</span>
                <span className="text-xs text-slate-500 font-semibold">Max 5MB (JPG/PNG/PDF)</span>
              </label>

              <div className="mt-2 space-y-2">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800"
                      >
                        {att.type.startsWith('image/') ? (
                          <ImageIcon className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-amber-600" />
                        )}
                        <span className="max-w-[150px] truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="ml-1 text-slate-500 hover:text-rose-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 hover:bg-slate-100 transition">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        <span>Mengunggah berkas...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-slate-500" />
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

            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-11 text-xs sm:text-sm font-bold rounded-2xl border-slate-300 px-5"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="h-11 gap-1.5 bg-slate-950 text-xs sm:text-sm font-bold text-white hover:bg-slate-900 rounded-2xl px-6 shadow-md"
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
        style: 'bg-indigo-100 text-indigo-950 border-indigo-300',
        icon: <Bot className="h-3.5 w-3.5" />,
      }
    case 'escalated':
      return {
        label: 'Menunggu Staf HERO',
        style: 'bg-amber-100 text-amber-950 border-amber-300',
        icon: <Clock className="h-3.5 w-3.5" />,
      }
    case 'assigned':
    case 'in_progress':
      return {
        label: 'Sedang Ditangani',
        style: 'bg-sky-100 text-sky-950 border-sky-300',
        icon: <UserCheck className="h-3.5 w-3.5" />,
      }
    case 'resolved':
      return {
        label: 'Selesai',
        style: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      }
    case 'closed':
      return {
        label: 'Ditutup',
        style: 'bg-slate-200 text-slate-900 border-slate-300',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      }
    default:
      return {
        label: status,
        style: 'bg-slate-100 text-slate-900 border-slate-300',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
      }
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return { label: 'URGENT', badge: 'bg-rose-100 text-rose-950 border border-rose-300 font-black' }
    case 'high':
      return { label: 'High', badge: 'bg-amber-100 text-amber-950 border border-amber-300 font-bold' }
    case 'low':
      return { label: 'Low', badge: 'bg-slate-100 text-slate-800 border border-slate-300 font-semibold' }
    default:
      return { label: 'Medium', badge: 'bg-sky-100 text-sky-950 border border-sky-300 font-semibold' }
  }
}
