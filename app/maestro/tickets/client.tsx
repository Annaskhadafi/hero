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
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Layanan Pengaduan &amp; Bantuan
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sampaikan kendala, pertanyaan teknis, atau permintaan servis. AI Assistant kami akan
            merespons dengan cepat sebelum dialihkan ke spesialis HERO.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="h-10 gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Tiket Baru</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Tiket Masuk</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-600">Sedang Berjalan / Ditangani</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-600">Selesai (Resolved)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{resolvedCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor tiket, judul masalah, atau kategori..."
            className="h-9 pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="Status Tiket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="bot_active">Dijawab AI</SelectItem>
              <SelectItem value="escalated">Dialihkan ke Staf</SelectItem>
              <SelectItem value="in_progress">Sedang Diproses</SelectItem>
              <SelectItem value="resolved">Selesai</SelectItem>
              <SelectItem value="closed">Ditutup</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <Headphones className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Belum Ada Tiket</h3>
            <p className="mt-1 text-xs text-slate-500">
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
                  className="group flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {ticket.ticketNumber}
                      </span>
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${ticket.category.color}15`,
                          color: ticket.category.color,
                        }}
                      >
                        {ticket.category.name}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${priorityCfg.badge}`}
                      >
                        {priorityCfg.label}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">
                      {ticket.title}
                    </h4>

                    {ticket.aiSummary && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic">
                        &ldquo;{ticket.aiSummary}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ticket.site.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {ticket.assignedEmployee ? (
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <UserCheck className="h-3 w-3 text-emerald-600" />
                          PIC: {ticket.assignedEmployee.name}
                        </span>
                      ) : ticket.status === 'bot_active' ? (
                        <span className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Bot className="h-3 w-3" />
                          Chitra Smart Ticketing Aktif
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.style}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    <span className="text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition">
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Buat Tiket Pengaduan &amp; Bantuan Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Jelaskan kendala Anda selengkap mungkin. Sistem AI kami akan memberikan respon awal
              dan jika diperlukan akan langsung diteruskan ke tim HERO terkait.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTicket} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Site Operasional *</label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Pilih Site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Kategori Keluhan *</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
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
                <label className="text-xs font-semibold text-slate-700">Judul Masalah / Kendala *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Kerusakan sidewall ban unit DT-014 di Pit B"
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tingkat Urgensi</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Rendah (Low)</SelectItem>
                    <SelectItem value="medium">Normal (Medium)</SelectItem>
                    <SelectItem value="high">Tinggi (High)</SelectItem>
                    <SelectItem value="urgent">Kritis / Darurat (Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Uraian Lengkap Keluhan / Pertanyaan *
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan kronologi, nomor seri ban/unit, lokasi spesifik, atau informasi penting lainnya..."
                rows={4}
                className="mt-1 text-xs"
                required
              />
            </div>

            {/* Attachments Section */}
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Lampiran Foto / Dokumen Pendukung</span>
                <span className="text-[10px] text-slate-400 font-normal">Max 5MB (JPG/PNG/PDF)</span>
              </label>

              <div className="mt-2 space-y-2">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {att.type.startsWith('image/') ? (
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        <span className="max-w-[150px] truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="ml-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 transition">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span>Mengunggah berkas...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-slate-400" />
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="h-9 gap-1.5 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Memproses Tiket &amp; AI...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
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
        style: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
        icon: <Bot className="h-3 w-3" />,
      }
    case 'escalated':
      return {
        label: 'Menunggu Staf HERO',
        style: 'bg-amber-50 text-amber-700 border border-amber-200/60',
        icon: <Clock className="h-3 w-3" />,
      }
    case 'assigned':
    case 'in_progress':
      return {
        label: 'Sedang Ditangani',
        style: 'bg-sky-50 text-sky-700 border border-sky-200/60',
        icon: <UserCheck className="h-3 w-3" />,
      }
    case 'resolved':
      return {
        label: 'Selesai',
        style: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        icon: <CheckCircle2 className="h-3 w-3" />,
      }
    case 'closed':
      return {
        label: 'Ditutup',
        style: 'bg-slate-100 text-slate-600 border border-slate-200',
        icon: <CheckCircle2 className="h-3 w-3" />,
      }
    default:
      return {
        label: status,
        style: 'bg-slate-100 text-slate-700',
        icon: <AlertCircle className="h-3 w-3" />,
      }
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return { label: 'URGENT', badge: 'bg-red-50 text-red-700 border border-red-200 font-bold' }
    case 'high':
      return { label: 'High', badge: 'bg-orange-50 text-orange-700 border border-orange-200' }
    case 'low':
      return { label: 'Low', badge: 'bg-slate-50 text-slate-600 border border-slate-200' }
    default:
      return { label: 'Medium', badge: 'bg-blue-50 text-blue-700 border border-blue-200' }
  }
}
